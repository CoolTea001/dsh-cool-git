/**
 * Unified-diff parsing for the Diff 查看区.
 *
 * The Host sends Git's patch verbatim rather than a pre-chewed structure: text
 * is what `git diff` is authoritative for, and the page needs line numbers on
 * both sides for the gutter it draws. Parsing here also means the same parser
 * serves a single file's patch and a whole commit's multi-file patch.
 *
 * Nothing in this module touches the DOM or the network.
 */

/** One body line, already stripped of its leading marker. */
export interface DiffLine {
  readonly kind: 'add' | 'del' | 'context' | 'meta'
  /** The line's text, without the `+`/`-`/space marker. */
  readonly text: string
  /** Line number in the pre-image, when this line exists there. */
  readonly oldNo: number | null
  /** Line number in the post-image, when this line exists there. */
  readonly newNo: number | null
}

/** One `@@` hunk. */
export interface DiffHunk {
  /** The `@@ -a,b +c,d @@` header, kept verbatim for display. */
  readonly header: string
  readonly lines: readonly DiffLine[]
}

/** One file's change inside a patch. */
export interface DiffFile {
  /** The `diff --git a/x b/x` line, kept verbatim. */
  readonly header: string
  /** Pre-image path, without its `a/` prefix; `/dev/null` for a creation. */
  readonly oldPath: string
  /** Post-image path, without its `b/` prefix; `/dev/null` for a deletion. */
  readonly newPath: string
  /** Metadata lines above the first hunk: modes, index, rename, similarity. */
  readonly meta: readonly string[]
  readonly hunks: readonly DiffHunk[]
  readonly additions: number
  readonly deletions: number
  /** Git reported a binary difference, so there are no lines to render. */
  readonly binary: boolean
}

/** A whole patch: one entry per file it touches. */
export interface DiffDoc {
  readonly files: readonly DiffFile[]
  readonly additions: number
  readonly deletions: number
  /** At least one touched file is binary. */
  readonly binary: boolean
}

/** Hunk header, `@@ -oldStart,oldCount +newStart,newCount @@ optional section`. */
const HUNK_HEADER = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/

/**
 * Parse one unified diff into files, hunks, and line-numbered lines.
 *
 * @param patch - the raw patch text; an empty string is a legitimate no-change.
 * @returns the parsed document.
 */
export function parsePatch(patch: string): DiffDoc {
  const files: DiffFile[] = []
  let current: MutableFile | null = null
  let hunk: MutableHunk | null = null
  let oldNo = 0
  let newNo = 0

  for (const line of patch.split('\n')) {
    if (line.startsWith('diff --git ')) {
      if (current !== null) files.push(current)
      current = { header: line, oldPath: '', newPath: '', meta: [], hunks: [], additions: 0, deletions: 0, binary: false }
      hunk = null
      continue
    }

    // A patch whose first file header was lost is not ours to guess at; the
    // Host always sends `git diff` output, so this only skips a stray prefix.
    if (current === null) continue

    if (line.startsWith('@@')) {
      const match = HUNK_HEADER.exec(line)
      oldNo = match === null ? 0 : Number(match[1])
      newNo = match === null ? 0 : Number(match[2])
      hunk = { header: line, lines: [] }
      current.hunks.push(hunk)
      continue
    }

    if (line.startsWith('--- ')) {
      current.oldPath = stripPrefix(line.slice(4))
      continue
    }
    if (line.startsWith('+++ ')) {
      current.newPath = stripPrefix(line.slice(4))
      continue
    }

    if (line.startsWith('Binary files ') || line.startsWith('GIT binary patch')) {
      current.binary = true
      continue
    }

    if (hunk === null) {
      if (line !== '') current.meta.push(line)
      continue
    }

    // `\ No newline at end of file` belongs to the line before it and is
    // rendered as chrome rather than as content.
    if (line.startsWith('\\')) {
      hunk.lines.push({ kind: 'meta', text: line, oldNo: null, newNo: null })
      continue
    }

    const marker = line.charAt(0)
    if (marker === '+') {
      hunk.lines.push({ kind: 'add', text: line.slice(1), oldNo: null, newNo: newNo++ })
      current.additions += 1
    } else if (marker === '-') {
      hunk.lines.push({ kind: 'del', text: line.slice(1), oldNo: oldNo++, newNo: null })
      current.deletions += 1
    } else if (marker === ' ') {
      hunk.lines.push({ kind: 'context', text: line.slice(1), oldNo: oldNo++, newNo: newNo++ })
    } else if (line !== '') {
      // Anything else inside a hunk (a `\`-less note, a `---`/`+++` pair of a
      // nested diff) is chrome; keeping it visible beats silently dropping it.
      hunk.lines.push({ kind: 'meta', text: line, oldNo: null, newNo: null })
    }
  }

  if (current !== null) files.push(current)
  return {
    files,
    additions: files.reduce((total, file) => total + file.additions, 0),
    deletions: files.reduce((total, file) => total + file.deletions, 0),
    binary: files.some(file => file.binary),
  }
}

/** One file while it is still being built. */
interface MutableFile {
  header: string
  oldPath: string
  newPath: string
  meta: string[]
  hunks: MutableHunk[]
  additions: number
  deletions: number
  binary: boolean
}

/** One hunk while it is still being built. */
interface MutableHunk {
  header: string
  lines: DiffLine[]
}

/**
 * Drop the `a/` or `b/` prefix Git puts on diff paths.
 *
 * @param value - the path as it appeared after `--- ` or `+++ `.
 * @returns the repository-relative path, with `/dev/null` left alone.
 */
export function stripPrefix(value: string): string {
  const path = value.trim()
  if (path === '/dev/null') return path
  if (path.startsWith('a/') || path.startsWith('b/')) return path.slice(2)
  return path
}

/**
 * The path a file section should be titled with.
 *
 * @param file - one parsed file section.
 * @returns the post-image path, falling back to the pre-image for a deletion.
 */
export function displayPath(file: DiffFile): string {
  if (file.newPath !== '' && file.newPath !== '/dev/null') return file.newPath
  if (file.oldPath !== '' && file.oldPath !== '/dev/null') return file.oldPath
  return file.header.replace(/^diff --git /, '')
}
