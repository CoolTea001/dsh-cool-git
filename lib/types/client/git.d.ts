/**
 * The Git conversation view.
 *
 * The page is the whole of the tab: a sidebar carrying 变更文件区 above 提交历史,
 * and a Diff 查看区 taking every remaining pixel. Changed paths come from
 * `git status`, the history from `git log`, and the diff pane shows either one
 * path's patch against HEAD or one commit's whole patch (see `api.ts` for the
 * routes and `diff.ts` for the patch parser). Both of the sidebar's boundaries —
 * its right edge and the divider between the two lists — are the reader's to
 * drag, and both sizes are remembered between visits (see `layout.ts`).
 *
 * The page owns no repository state of its own: every answer is a plain value
 * fetched from the Host, and the only local state is which row is selected, which
 * answer is current, which failure the dialog is stating, and where the two
 * boundaries were left. That keeps a manual refresh honest — it re-reads `status`
 * and `log`, and the diff pane re-reads whatever it is showing.
 *
 * Every failure the page can meet is reported in one place: the error dialog. A
 * refused branch switch, a pull or push the remote turned down, a read the Host
 * could not answer, and a transport that never reached the Host all open that
 * dialog, so there is one failure shape no matter how a request went wrong. The
 * one exception is `no-repo`: a directory that is not a repository is the panes'
 * own empty state, not a failure, and it never opens a dialog.
 *
 * The page is full-bleed, the same way the 终端 tab is: the root class gives the
 * stylesheet a handle on this subtree, the root declares the shell's
 * composer-overlay hook (which drops the transcript width handles), and the
 * mounted View suppresses the composer seat the shell mounts for every View —
 * see `chrome.ts`.
 */
import { type ReactElement } from 'react';
/**
 * Render the Git tab's body.
 *
 * @param props - the standard conversation-View props; the session id is used.
 * @returns the Git page element.
 */
export declare function GitView(props: {
    readonly sessionId?: unknown;
}): ReactElement;
//# sourceMappingURL=git.d.ts.map