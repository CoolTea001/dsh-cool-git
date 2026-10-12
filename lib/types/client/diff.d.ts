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
    readonly kind: 'add' | 'del' | 'context' | 'meta';
    /** The line's text, without the `+`/`-`/space marker. */
    readonly text: string;
    /** Line number in the pre-image, when this line exists there. */
    readonly oldNo: number | null;
    /** Line number in the post-image, when this line exists there. */
    readonly newNo: number | null;
}
/** One `@@` hunk. */
export interface DiffHunk {
    /** The `@@ -a,b +c,d @@` header, kept verbatim for display. */
    readonly header: string;
    readonly lines: readonly DiffLine[];
}
/** One file's change inside a patch. */
export interface DiffFile {
    /** The `diff --git a/x b/x` line, kept verbatim. */
    readonly header: string;
    /** Pre-image path, without its `a/` prefix; `/dev/null` for a creation. */
    readonly oldPath: string;
    /** Post-image path, without its `b/` prefix; `/dev/null` for a deletion. */
    readonly newPath: string;
    /** Metadata lines above the first hunk: modes, index, rename, similarity. */
    readonly meta: readonly string[];
    readonly hunks: readonly DiffHunk[];
    readonly additions: number;
    readonly deletions: number;
    /** Git reported a binary difference, so there are no lines to render. */
    readonly binary: boolean;
}
/** A whole patch: one entry per file it touches. */
export interface DiffDoc {
    readonly files: readonly DiffFile[];
    readonly additions: number;
    readonly deletions: number;
    /** At least one touched file is binary. */
    readonly binary: boolean;
}
/**
 * Parse one unified diff into files, hunks, and line-numbered lines.
 *
 * @param patch - the raw patch text; an empty string is a legitimate no-change.
 * @returns the parsed document.
 */
export declare function parsePatch(patch: string): DiffDoc;
/**
 * Drop the `a/` or `b/` prefix Git puts on diff paths.
 *
 * @param value - the path as it appeared after `--- ` or `+++ `.
 * @returns the repository-relative path, with `/dev/null` left alone.
 */
export declare function stripPrefix(value: string): string;
/**
 * The path a file section should be titled with.
 *
 * @param file - one parsed file section.
 * @returns the post-image path, falling back to the pre-image for a deletion.
 */
export declare function displayPath(file: DiffFile): string;
//# sourceMappingURL=diff.d.ts.map