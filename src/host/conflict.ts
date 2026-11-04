/**
 * Conflict markers, parsed out of a working-tree file.
 *
 * Git's own report about an unmerged path is not something to resolve *within*:
 * `git diff` answers with a combined diff (`diff --cc`, `@@@` headers, two-column
 * prefixes), and a path deleted on one side answers with the single line
 * `* Unmerged path x`. Both are descriptions of the state, not a list of
 * decisions. What a resolver can act on is the file Git left on disk, with the
 * `<<<<<<<` … `>>>>>>>` blocks in it — so that file is what this module reads.
 *
 * Everything here works on bytes, and that is the point. A file is not
 * necessarily UTF-8, and rewriting one through a string would replace every
 * undecodable byte in it with U+FFFD; a file may also use CRLF, and a line
 * splitter that dropped the `\r` would rewrite every line it touched. Only the
 * marker lines — which are ASCII by construction — are ever interpreted, and a
 * choice is applied by splicing the original byte ranges, so every byte this
 * module did not mean to change is the byte that was there.
 *
 * The module is pure: bytes in, blocks out. Reading the file and writing the
 * result back is `git.ts`'s business, which is what keeps this half testable
 * without a repository.
 */

import type {
  ConflictBlock,
  ConflictDoc,
  ConflictRegion,
  ConflictStages,
  ResolveChoice,
} from '../shared/contract.js'

/** One line's byte range in the source, terminator included. */
interface Span {
  readonly start: number
  /** One past the line's last byte, so the range holds its `\n` when it has one. */
  readonly end: number
}

/** What one marker line is, and the label Git wrote after it. */
interface Marker {
  readonly kind: 'open' | 'base' | 'sep' | 'close'
  readonly label: string
}

/**
 * One region's byte layout.
 *
 * `start`/`end` cover the whole block, marker lines included, which is what a
 * resolution replaces. The three side lists are the byte ranges of the lines
 * between the markers, and keeping them as ranges rather than as text is what
 * lets a choice be spliced back without re-encoding anything.
 */
export interface RegionSpans {
  readonly key: string
  readonly start: number
  readonly end: number
  readonly ours: readonly Span[]
  readonly theirs: readonly Span[]
  readonly base: readonly Span[]
}

/** A file's blocks, plus the byte layout each region's key stands for. */
export interface ParsedConflict {
  readonly blocks: readonly ConflictBlock[]
  readonly regions: readonly RegionSpans[]
  readonly style: 'merge' | 'diff3'
}

/**
 * Longest file this module will parse, in bytes.
 *
 * A conflicted file is a source file, and one larger than this is not something
 * a reader resolves block by block anyway. Past the bound the path is answered
 * as binary — no markers, so the whole-file choice is the only one offered —
 * which is honest and still leaves the reader a way through.
 */
const MAX_CONFLICT_BYTES = 4 * 1024 * 1024

/** How much of a file is sniffed for a NUL byte, which is what makes it binary. */
const BINARY_SNIFF_BYTES = 8_000

/** Shortest run of marker characters Git writes; a longer run is accepted too. */
const MARKER_LENGTH = 7

/** The four characters a marker line can begin with. */
const OPEN_BYTE = 0x3c // <
const BASE_BYTE = 0x7c // |
const SEP_BYTE = 0x3d // =
const CLOSE_BYTE = 0x3e // >

const NEWLINE = 0x0a
const CARRIAGE_RETURN = 0x0d

/** Decode bytes as UTF-8, which is only ever done for display and for labels. */
const DECODER = new TextDecoder('utf-8', { fatal: false })

/**
 * Split a buffer into lines, keeping each line's terminator in its range.
 *
 * A file whose last line has no terminator still gets a range for it: the block
 * a resolution splices is defined by bytes, and a trailing line is as much a
 * byte range as any other.
 *
 * @param bytes - the file's content.
 * @returns one range per line, in order.
 */
function splitLines(bytes: Uint8Array): readonly Span[] {
  const lines: Span[] = []
  let start = 0
  for (let index = 0; index < bytes.length; index += 1) {
    if (bytes[index] !== NEWLINE) continue
    lines.push({ start, end: index + 1 })
    start = index + 1
  }
  if (start < bytes.length) lines.push({ start, end: bytes.length })
  return lines
}

/**
 * Where one line's content ends, with its terminator and any `\r` removed.
 *
 * @param bytes - the file's content.
 * @param line - the line's range.
 * @returns the index one past the line's last content byte.
 */
function contentEnd(bytes: Uint8Array, line: Span): number {
  let end = line.end
  if (end > line.start && bytes[end - 1] === NEWLINE) end -= 1
  if (end > line.start && bytes[end - 1] === CARRIAGE_RETURN) end -= 1
  return end
}

/**
 * Decode one byte range as text, for display only.
 *
 * @param bytes - the file's content.
 * @param start - the range's first byte.
 * @param end - one past the range's last byte.
 * @returns the decoded text.
 */
function textOf(bytes: Uint8Array, start: number, end: number): string {
  return DECODER.decode(bytes.subarray(start, end))
}

/**
 * Read one line as a conflict marker, when it is one.
 *
 * A marker is a run of at least seven identical characters at the start of the
 * line: `<` opens a block, `|` opens its merge base (diff3 style), `=` separates
 * the sides, and `>` closes it. The run must be exactly the marker's own
 * character, so a line of source that merely starts with `<<<<<<<` plus text is
 * still read as a marker — which is what Git writes, and what a reader who
 * pasted one in would expect.
 *
 * `=======` takes no label; the other three carry the name Git put there
 * (`HEAD`, a branch, a short hash with its subject).
 *
 * @param bytes - the file's content.
 * @param line - the line to read.
 * @returns the marker, or null for an ordinary line.
 */
function markerOf(bytes: Uint8Array, line: Span): Marker | null {
  const end = contentEnd(bytes, line)
  const first = bytes[line.start]
  if (first !== OPEN_BYTE && first !== BASE_BYTE && first !== SEP_BYTE && first !== CLOSE_BYTE) {
    return null
  }

  let cursor = line.start
  while (cursor < end && bytes[cursor] === first) cursor += 1
  if (cursor - line.start < MARKER_LENGTH) return null

  const label = textOf(bytes, cursor, end).trim()
  switch (first) {
    case OPEN_BYTE:
      return { kind: 'open', label }
    case BASE_BYTE:
      return { kind: 'base', label }
    case CLOSE_BYTE:
      return { kind: 'close', label }
    default:
      // A separator carries nothing after its run. Anything else is a line of
      // source that happens to start with `=`, not a marker.
      return label === '' ? { kind: 'sep', label: '' } : null
  }
}

/**
 * Hash one region's identity, position included.
 *
 * The page sends this key back with a choice, and the Host refuses a key the
 * file no longer holds — so a file an editor (or an agent) rewrote between the
 * read and the click cannot turn that click into a splice at the wrong offset.
 * The region's ordinal is part of the hash so that two byte-identical blocks in
 * one file are still two different keys.
 *
 * The hash is a plain FNV-1a pair rather than a cryptographic digest: it is
 * compared for equality within one file and never stored, and it must be the
 * same in the half that computes it and the half that echoes it, which is the
 * same half here.
 *
 * @param ordinal - the region's position among the file's regions.
 * @param bytes - the whole block's bytes, markers included.
 * @returns sixteen hexadecimal characters.
 */
function regionKey(ordinal: number, bytes: Uint8Array): string {
  let left = 0x811c9dc5
  let right = 0x01000193
  const mix = (value: number): void => {
    left = Math.imul(left ^ value, 0x01000193) >>> 0
    right = Math.imul(right + value, 0x85ebca6b) >>> 0
  }
  mix(ordinal & 0xff)
  mix((ordinal >>> 8) & 0xff)
  for (let index = 0; index < bytes.length; index += 1) mix(bytes[index] ?? 0)
  return `${left.toString(16).padStart(8, '0')}${right.toString(16).padStart(8, '0')}`
}

/**
 * Turn a run of lines into the display strings a block carries.
 *
 * @param bytes - the file's content.
 * @param lines - the lines to decode.
 * @returns one string per line, without its terminator.
 */
function linesOf(bytes: Uint8Array, lines: readonly Span[]): string[] {
  return lines.map(line => textOf(bytes, line.start, contentEnd(bytes, line)))
}

/**
 * Parse every conflict block a file holds.
 *
 * A malformed block — an opening marker with no separator or no closing marker
 * after it — is left as ordinary text rather than guessed at: the file is the
 * reader's, and half a block is not something to rewrite. A later, well-formed
 * block after it is still found, because the scan simply moves past the line it
 * could not use.
 *
 * @param bytes - the file's content.
 * @returns the blocks, the regions' byte layout, and the marker style.
 */
export function parseConflict(bytes: Uint8Array): ParsedConflict {
  const lines = splitLines(bytes)
  const blocks: ConflictBlock[] = []
  const regions: RegionSpans[] = []
  let style: 'merge' | 'diff3' = 'merge'
  let contextStart = 0
  let index = 0

  while (index < lines.length) {
    const open = markerOf(bytes, lines[index])
    if (open === null || open.kind !== 'open') {
      index += 1
      continue
    }

    let baseLine = -1
    let separatorLine = -1
    let closeLine = -1
    let baseMarker: Marker | null = null
    let closeMarker: Marker | null = null
    for (let probe = index + 1; probe < lines.length; probe += 1) {
      const marker = markerOf(bytes, lines[probe])
      if (marker === null) continue
      // A second opening marker before this block was separated means the first
      // one was never a block: it is a line of source (or a paste) that happens
      // to look like one. Reading on would swallow the real block that follows
      // into this one's "ours" side, so the candidate is abandoned here and the
      // scan resumes at the next line.
      if (marker.kind === 'open' && separatorLine < 0) break
      if (marker.kind === 'base' && baseLine < 0 && separatorLine < 0) {
        baseLine = probe
        baseMarker = marker
      } else if (marker.kind === 'sep' && separatorLine < 0) {
        separatorLine = probe
      } else if (marker.kind === 'close' && separatorLine >= 0) {
        closeLine = probe
        closeMarker = marker
        break
      }
    }

    if (separatorLine < 0 || closeLine < 0) {
      // Not a block this module can act on; leave it as the text it is.
      index += 1
      continue
    }

    const context = lines.slice(contextStart, index)
    if (context.length > 0) {
      blocks.push({ kind: 'context', lines: linesOf(bytes, context) })
    }

    const oursLines = lines.slice(index + 1, baseLine >= 0 ? baseLine : separatorLine)
    const baseLines = baseLine >= 0 ? lines.slice(baseLine + 1, separatorLine) : []
    const theirsLines = lines.slice(separatorLine + 1, closeLine)

    const start = lines[index]?.start ?? 0
    const end = lines[closeLine]?.end ?? start
    const key = regionKey(regions.length, bytes.subarray(start, end))
    if (baseLines.length > 0) style = 'diff3'

    regions.push({
      key,
      start,
      end,
      ours: oursLines,
      theirs: theirsLines,
      base: baseLines,
    })

    const region: ConflictRegion = {
      key,
      ours: linesOf(bytes, oursLines),
      theirs: linesOf(bytes, theirsLines),
      ...(baseLines.length === 0 ? {} : { base: linesOf(bytes, baseLines) }),
      ...(open.label === '' ? {} : { oursLabel: open.label }),
      ...(baseMarker === null || baseMarker.label === '' ? {} : { baseLabel: baseMarker.label }),
      ...(closeMarker === null || closeMarker.label === '' ? {} : { theirsLabel: closeMarker.label }),
    }
    blocks.push({ kind: 'region', ...region })

    index = closeLine + 1
    contextStart = index
  }

  const trailing = lines.slice(contextStart)
  if (trailing.length > 0) {
    blocks.push({ kind: 'context', lines: linesOf(bytes, trailing) })
  }

  return { blocks, regions, style }
}

/**
 * Whether a file looks binary, which is what decides there are no markers to
 * read.
 *
 * The test is a NUL byte in the file's first few kilobytes — the same rule Git
 * applies — because a conflicted binary file has no textual content to choose
 * between and its whole version is the only choice available.
 *
 * @param bytes - the file's content.
 * @returns true when the content is not text.
 */
export function isBinary(bytes: Uint8Array): boolean {
  const limit = Math.min(bytes.length, BINARY_SNIFF_BYTES)
  for (let index = 0; index < limit; index += 1) {
    if (bytes[index] === 0) return true
  }
  return false
}

/**
 * Describe one conflicted path as the page renders it.
 *
 * Two facts decide that there is nothing to choose block by block, and both are
 * read here rather than left to the page. One is the content: binary data,
 * anything too large to parse, and a path that is not a regular file at all have
 * no markers to find. The other is the index: when one of the two sides has no
 * stage, the conflict is a delete/modify or an add/add across a missing side —
 * and Git may well have left a marker-free copy of the other side in the
 * working tree while doing it. That copy parses as "clean", which is exactly the
 * wrong thing to say: staging it would be a decision the reader never made, and
 * the side that deleted the path would be silently outvoted.
 *
 * @param path - the repository-relative path.
 * @param bytes - the working-tree file, or null when the path has none.
 * @param stages - which index stages the path still holds.
 * @param binary - whether the path is one with no text to resolve block by block.
 * @returns the document the pane draws.
 */
export function describeConflict(
  path: string,
  bytes: Uint8Array | null,
  stages: ConflictStages,
  binary = false,
): ConflictDoc {
  // A side that has no stage was deleted (or never existed), and a whole-file
  // choice is the only kind that can express "keep that side's absence".
  const oneSided = !stages.ours || !stages.theirs

  if (binary || (bytes !== null && (bytes.length > MAX_CONFLICT_BYTES || isBinary(bytes)))) {
    return { path, blocks: [], regions: 0, style: 'merge', binary: true, stages, state: 'binary' }
  }
  if (bytes === null || oneSided) {
    return { path, blocks: [], regions: 0, style: 'merge', binary: false, stages, state: 'missing' }
  }
  const parsed = parseConflict(bytes)
  return {
    path,
    blocks: parsed.blocks,
    regions: parsed.regions.length,
    style: parsed.style,
    binary: false,
    stages,
    state: parsed.regions.length === 0 ? 'clean' : 'regions',
  }
}

/** One choice the page made, named by the region it applies to. */
export interface Resolution {
  readonly key: string
  readonly choice: ResolveChoice
}

/**
 * Apply a set of choices to a parsed file, and return its new bytes.
 *
 * Every key must still name a region the file holds, and no key may be used
 * twice; a request that fails either test is answered with null rather than
 * partially applied, because a half-applied resolution is a file the reader did
 * not ask for. The caller turns that into the "this file changed" answer.
 *
 * A choice replaces the block *including its marker lines*, which is why the
 * replacement is made of the side's original byte ranges: the text that lands in
 * the file is exactly the text that was in it, terminators and all.
 *
 * @param bytes - the file's current content.
 * @param parsed - the parse of those same bytes.
 * @param resolutions - the choices, in any order.
 * @returns the new content, or null when a key no longer matches.
 */
export function applyResolutions(
  bytes: Uint8Array,
  parsed: ParsedConflict,
  resolutions: readonly Resolution[],
): Uint8Array | null {
  const remaining = new Map(parsed.regions.map(region => [region.key, region]))
  const picked: { readonly region: RegionSpans; readonly choice: ResolveChoice }[] = []

  for (const resolution of resolutions) {
    const region = remaining.get(resolution.key)
    if (region === undefined) return null
    // Dropped so a key repeated in one request is refused: it would otherwise
    // replace the same block twice and silently drop the second choice.
    remaining.delete(resolution.key)
    picked.push({ region, choice: resolution.choice })
  }

  picked.sort((left, right) => left.region.start - right.region.start)

  const chunks: Uint8Array[] = []
  let cursor = 0
  for (const { region, choice } of picked) {
    if (region.start < cursor) return null
    chunks.push(bytes.subarray(cursor, region.start))
    chunks.push(...replacement(bytes, region, choice))
    cursor = region.end
  }
  chunks.push(bytes.subarray(cursor))

  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
  const output = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    output.set(chunk, offset)
    offset += chunk.length
  }
  return output
}

/**
 * The bytes one choice puts in place of a block.
 *
 * `base` on a file with no merge base (a `merge`-style conflict) falls back to
 * keeping both sides, which is the closest thing to "neither of the two edits
 * alone" that the file can express.
 *
 * @param bytes - the file's content, which the ranges point into.
 * @param region - the block being replaced.
 * @param choice - what to keep.
 * @returns the byte ranges to splice in, in order.
 */
function replacement(
  bytes: Uint8Array,
  region: RegionSpans,
  choice: ResolveChoice,
): readonly Uint8Array[] {
  const take = (spans: readonly Span[]): Uint8Array[] =>
    spans.map(span => bytes.subarray(span.start, span.end))

  switch (choice) {
    case 'ours':
      return take(region.ours)
    case 'theirs':
      return take(region.theirs)
    case 'base':
      return region.base.length > 0 ? take(region.base) : [...take(region.ours), ...take(region.theirs)]
    case 'both':
      return [...take(region.ours), ...take(region.theirs)]
  }
}
