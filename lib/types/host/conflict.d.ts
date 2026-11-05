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
import type { ConflictBlock, ConflictDoc, ConflictStages, ResolveChoice } from '../shared/contract.js';
/** One line's byte range in the source, terminator included. */
interface Span {
    readonly start: number;
    /** One past the line's last byte, so the range holds its `\n` when it has one. */
    readonly end: number;
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
    readonly key: string;
    readonly start: number;
    readonly end: number;
    readonly ours: readonly Span[];
    readonly theirs: readonly Span[];
    readonly base: readonly Span[];
}
/** A file's blocks, plus the byte layout each region's key stands for. */
export interface ParsedConflict {
    readonly blocks: readonly ConflictBlock[];
    readonly regions: readonly RegionSpans[];
    readonly style: 'merge' | 'diff3';
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
export declare function parseConflict(bytes: Uint8Array): ParsedConflict;
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
export declare function isBinary(bytes: Uint8Array): boolean;
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
export declare function describeConflict(path: string, bytes: Uint8Array | null, stages: ConflictStages, binary?: boolean): ConflictDoc;
/** One choice the page made, named by the region it applies to. */
export interface Resolution {
    readonly key: string;
    readonly choice: ResolveChoice;
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
export declare function applyResolutions(bytes: Uint8Array, parsed: ParsedConflict, resolutions: readonly Resolution[]): Uint8Array | null;
export {};
//# sourceMappingURL=conflict.d.ts.map