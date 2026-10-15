/**
 * The page's copy, in the two locales DSH ships.
 *
 * Every sentence the Git tab draws lives here rather than at the point it is
 * drawn, for two reasons. The page is what knows the language to read in — the
 * Host does not — so a refusal reaches it as a code (see `shared/contract.ts`)
 * and is worded from the `error.<code>` entry below; and the locale service
 * re-renders the tab when the language is switched, which only works if the
 * copy is looked up at render time through the `t` seat rather than captured in
 * a constant.
 *
 * Placeholders are `{name}` and are filled by the locale service, so a sentence
 * whose values are pluralized differently in another language has to be written
 * to read for every count (`1 min ago`, `5 min ago`) — there are no plural
 * rules behind this. The two dictionaries must carry exactly the same keys:
 * `zh` is typed as `typeof en`, so a key added to one and forgotten in the
 * other is a compile error rather than a page that falls back mid-sentence.
 */
import type { FailureCode } from '../shared/contract.js';
/** The dictionary namespace this page owns. */
export declare const NS = "coolGit";
/** The copy of the page's own controls, panes, and states. */
type UiKey = 
/** The tab's own name in the session's tab bar. */
'view.git'
/** One changed-path row's state, spelled out in its hover bubble. */
 | 'kind.added' | 'kind.modified' | 'kind.deleted' | 'kind.renamed' | 'kind.copied' | 'kind.typeChange' | 'kind.untracked' | 'kind.conflicted' | 'kind.unknown'
/** A commit's age, in the three units a history row shows. */
 | 'time.now' | 'time.minutes' | 'time.hours' | 'time.days'
/** One line of the error dialog: the request that failed, then its reason. */
 | 'error.line'
/** The reason stated when an answer carried neither a code nor any text. */
 | 'fallback.unknown'
/** The page's own refusal for a path the newest status no longer lists. */
 | 'fallback.fileGone'
/** What each request is called, as the error dialog's line prefix. */
 | 'label.status' | 'label.log' | 'label.commit' | 'label.diff' | 'label.message'
/** What that line says when the answer gave no reason at all. */
 | 'fallback.status' | 'fallback.log' | 'fallback.diff' | 'fallback.branches' | 'fallback.message'
/** The heading over each failure the page can report. */
 | 'title.switchBranch' | 'title.refresh' | 'title.pull' | 'title.push' | 'title.publish' | 'title.commit' | 'title.diff' | 'title.branches' | 'title.message'
/** The error dialog's own two controls. */
 | 'dialog.close' | 'dialog.ok'
/** The sidebar's first row. */
 | 'head.currentBranch' | 'head.detached' | 'head.refresh'
/** The remote control in the history pane's header. */
 | 'remote.publish' | 'remote.sync'
/** The two pane headers, each followed by its row count. */
 | 'pane.files' | 'pane.history'
/** The branch dialog. */
 | 'branch.title' | 'branch.description' | 'branch.cancel' | 'branch.confirm' | 'branch.search' | 'branch.list' | 'branch.current' | 'branch.local' | 'branch.remote' | 'branch.notRepo' | 'branch.none' | 'branch.loading' | 'branch.noMatch' | 'branch.truncated'
/** The commit form. */
 | 'commit.placeholder' | 'commit.button' | 'commit.busy'
/** The commit form's Generate control, and what the model asked be read first. */
 | 'commit.generate' | 'commit.generating' | 'commit.warning'
/** The changed-path pane's empty and loading states. */
 | 'list.notRepo' | 'list.statusFailed' | 'list.loading'
/** Whether a row's change is in the index. */
 | 'stage.staged' | 'stage.unstaged'
/** The history pane's empty and loading states. */
 | 'history.failed' | 'history.loading' | 'history.empty'
/** What one history row adds to the commit it names. */
 | 'commit.noMessage' | 'commit.merge'
/** The diff pane. */
 | 'diff.pane' | 'diff.notRepo' | 'diff.repoFailed' | 'diff.emptyHint' | 'diff.loading' | 'diff.failed' | 'diff.noTextTitle' | 'diff.noTextUntracked' | 'diff.noTextOther' | 'diff.mergeNote' | 'diff.hiddenRows' | 'diff.truncated' | 'diff.copy' | 'diff.copied' | 'diff.expand' | 'diff.collapse';
/** Every key in the namespace: the page's own, and one sentence per refusal. */
export type MessageKey = UiKey | `error.${FailureCode}`;
/**
 * The translate seat the page draws through.
 *
 * A key and its placeholder values, read at call time: the function a locale
 * switch hands out is a new one, which is what re-renders the tab.
 */
export type Translate = (key: MessageKey, params?: Readonly<Record<string, string | number>>) => string;
/** The English copy, which is also the fallback every lookup ends at. */
export declare const en: {
    'view.git': string;
    'kind.added': string;
    'kind.modified': string;
    'kind.deleted': string;
    'kind.renamed': string;
    'kind.copied': string;
    'kind.typeChange': string;
    'kind.untracked': string;
    'kind.conflicted': string;
    'kind.unknown': string;
    'time.now': string;
    'time.minutes': string;
    'time.hours': string;
    'time.days': string;
    'error.line': string;
    'fallback.unknown': string;
    'fallback.fileGone': string;
    'label.status': string;
    'label.log': string;
    'label.commit': string;
    'label.diff': string;
    'label.message': string;
    'fallback.status': string;
    'fallback.log': string;
    'fallback.diff': string;
    'fallback.branches': string;
    'fallback.message': string;
    'title.switchBranch': string;
    'title.refresh': string;
    'title.pull': string;
    'title.push': string;
    'title.publish': string;
    'title.commit': string;
    'title.diff': string;
    'title.branches': string;
    'title.message': string;
    'dialog.close': string;
    'dialog.ok': string;
    'head.currentBranch': string;
    'head.detached': string;
    'head.refresh': string;
    'remote.publish': string;
    'remote.sync': string;
    'pane.files': string;
    'pane.history': string;
    'branch.title': string;
    'branch.description': string;
    'branch.cancel': string;
    'branch.confirm': string;
    'branch.search': string;
    'branch.list': string;
    'branch.current': string;
    'branch.local': string;
    'branch.remote': string;
    'branch.notRepo': string;
    'branch.none': string;
    'branch.loading': string;
    'branch.noMatch': string;
    'branch.truncated': string;
    'commit.placeholder': string;
    'commit.button': string;
    'commit.busy': string;
    'commit.generate': string;
    'commit.generating': string;
    'commit.warning': string;
    'list.notRepo': string;
    'list.statusFailed': string;
    'list.loading': string;
    'stage.staged': string;
    'stage.unstaged': string;
    'history.failed': string;
    'history.loading': string;
    'history.empty': string;
    'commit.noMessage': string;
    'commit.merge': string;
    'diff.pane': string;
    'diff.notRepo': string;
    'diff.repoFailed': string;
    'diff.emptyHint': string;
    'diff.loading': string;
    'diff.failed': string;
    'diff.noTextTitle': string;
    'diff.noTextUntracked': string;
    'diff.noTextOther': string;
    'diff.mergeNote': string;
    'diff.hiddenRows': string;
    'diff.truncated': string;
    'diff.copy': string;
    'diff.copied': string;
    'diff.expand': string;
    'diff.collapse': string;
    'error.not-ready': string;
    'error.no-workdir': string;
    'error.no-shell': string;
    'error.missing-path': string;
    'error.bad-hash': string;
    'error.missing-message': string;
    'error.missing-branch': string;
    'error.git-denied': string;
    'error.git-exit': string;
    'error.no-root': string;
    'error.no-commits': string;
    'error.unparsable-commit': string;
    'error.invalid-branch': string;
    'error.unknown-branch': string;
    'error.remote-local-name': string;
    'error.checkout-denied': string;
    'error.checkout-dirty': string;
    'error.checkout-dirty-paths': string;
    'error.pull-no-commits': string;
    'error.push-no-commits': string;
    'error.pull-detached': string;
    'error.push-detached': string;
    'error.pull-no-upstream': string;
    'error.pull-denied': string;
    'error.push-denied': string;
    'error.pull-dirty': string;
    'error.push-dirty': string;
    'error.auth': string;
    'error.pull-diverged': string;
    'error.push-behind': string;
    'error.push-no-remote': string;
    'error.push-ambiguous-remote': string;
    'error.commit-clean': string;
    'error.commit-conflict': string;
    'error.commit-denied': string;
    'error.no-llm': string;
    'error.no-model': string;
    'error.model-timeout': string;
    'error.empty-message': string;
};
/** The Chinese copy, key for key the same page. */
export declare const zh: typeof en;
export {};
//# sourceMappingURL=locales.d.ts.map