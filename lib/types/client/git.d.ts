/**
 * The Git conversation view.
 *
 * The page is the whole of the tab: a sidebar carrying the changed-path list
 * above the commit history, and a diff pane taking every remaining pixel.
 * Changed paths come from `git status`, the history from `git log`, and the
 * diff pane shows one side of one path's change — the index against HEAD, or the
 * worktree against the index — or one commit's whole patch (see `api.ts` for the
 * routes and `diff.ts` for the patch parser). The pane stacks the conflicts
 * above the index's half and the worktree's, each a disclosure of its own; a
 * conflicted path opens the conflict pane instead of a patch, because that pane
 * is where it is resolved.
 * A row's trailing `+` or `−` moves its path between the two lists. The
 * sidebar's second row is the commit form — a message field and one button, whose
 * scope is the index or the whole tree, chosen in the toolbar's More menu — and
 * the two panes stack under it. Both of the sidebar's boundaries —
 * its right edge and the divider between the two lists — are the reader's to
 * drag, and both sizes are remembered between visits (see `layout.tsx`).
 *
 * The page owns no repository state of its own: every answer is a plain value
 * fetched from the Host, and the only local state is which row is selected, which
 * answer is current, which failure the dialog is stating, which operation is in
 * flight — a checkout, one half of a remote round trip, the commit the
 * changed-path list asks for, or the undo that takes it back — each of which is
 * what disables the other controls, the commit form's scope, and where the two
 * boundaries were left.
 * That keeps a manual refresh honest — it re-reads `status` and `log`, and the
 * diff pane re-reads whatever it is showing.
 *
 * One consequence of that ownership is `cache.ts`'s business: the shell renders
 * one View at a time, so switching tabs unmounts this page and its answers with
 * it. The last repository answer is therefore cached per Workspace, the commit
 * form's scope is kept there too — it is a Workspace preference rather than a
 * conversation's, so a reload and every session in that Workspace open the form
 * the way it was left — and the reading position the reader chose is kept per
 * session below, so a return to this tab paints what they left and re-reads the
 * repository behind it instead of starting again from its loading rows.
 *
 * Every failure the page can meet is reported in one place: the error dialog. A
 * refused branch switch, a pull or push the remote turned down, a read the Host
 * could not answer, and a transport that never reached the Host all open that
 * dialog, so there is one failure shape no matter how a request went wrong. The
 * one exception is `no-repo`: a directory that is not a repository is the panes'
 * own empty state, not a failure, and it never opens a dialog.
 *
 * The page is full-bleed, the same way the terminal tab is: the root class gives
 * the stylesheet a handle on this subtree, the root declares the shell's
 * composer-overlay hook (which drops the transcript width handles), and the
 * mounted View suppresses the composer seat the shell mounts for every View —
 * see `chrome.ts`.
 */
import { type ReactElement } from 'react';
import type { Translate } from './locales.js';
/**
 * Render the Git tab's body.
 *
 * @param props - the standard conversation-View props; the session id is used,
 *   and `t` is the locale seat the framework hands every entry that declares a
 *   dictionary namespace.
 * @returns the Git page element.
 */
export declare function GitView(props: {
    readonly sessionId?: unknown;
    readonly t: Translate;
}): ReactElement;
//# sourceMappingURL=git.d.ts.map