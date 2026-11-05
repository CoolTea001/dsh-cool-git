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
 | 'label.status' | 'label.log' | 'label.commit' | 'label.diff' | 'label.message' | 'label.settings' | 'label.settingsRead'
/** What that line says when the answer gave no reason at all. */
 | 'fallback.status' | 'fallback.log' | 'fallback.diff' | 'fallback.branches' | 'fallback.message' | 'fallback.settings' | 'fallback.settingsRead'
/** The heading over each failure the page can report. */
 | 'title.switchBranch' | 'title.refresh' | 'title.fetch' | 'title.mergeFrom' | 'title.pull' | 'title.push' | 'title.publish' | 'title.commit' | 'title.undoCommit' | 'title.stage' | 'title.unstage' | 'title.stageFolder' | 'title.unstageFolder' | 'title.stageAll' | 'title.unstageAll' | 'title.discardAll' | 'title.discard' | 'title.diff' | 'title.branches' | 'title.branchCreate' | 'title.branchDelete' | 'title.message' | 'title.settings' | 'title.settingsRead' | 'title.resolve' | 'title.resolveDone' | 'title.completeMerge'
/** The error dialog's own two controls. */
 | 'dialog.close' | 'dialog.ok'
/** The sidebar's first row. */
 | 'head.currentBranch' | 'head.detached'
/** The row's overflow control: the menu it opens, not one of the rows inside it. */
 | 'head.more'
/** The menu's Refresh row, which is the operation the row used to carry alone. */
 | 'head.refresh'
/** The menu's Fetch row: the remotes re-read, with nothing chosen. */
 | 'head.fetch'
/** The menu's Pull and Push rows, each one half of the round trip taken alone. */
 | 'head.pull' | 'head.push'
/** The menu's merge row, and the dialog it opens. */
 | 'head.mergeFrom'
/** The menu's two branch rows, each opening a dialog of its own. */
 | 'head.branchCreate' | 'head.branchDelete'
/** The menu's undo row, which takes the commit at HEAD back off the branch. */
 | 'head.undoCommit'
/** The menu's last row, and the dialog it opens. */
 | 'head.settings'
/** The settings dialog: the model and prompt that write commit messages. */
 | 'settings.title' | 'settings.description' | 'settings.model' | 'settings.modelDefaultUnknown' | 'settings.modelEmpty' | 'settings.modelUnavailable' | 'settings.modelSearch' | 'settings.searchEmpty' | 'settings.effort' | 'settings.effortReadFailed' | 'settings.prompt' | 'settings.promptHint' | 'settings.promptReset' | 'settings.loading' | 'settings.cancel' | 'settings.save' | 'settings.saving'
/** The remote control in the history pane's header. */
 | 'remote.publish' | 'remote.sync'
/** The history pane's header, followed by its row count. */
 | 'pane.history'
/** The branch dialog. */
 | 'branch.title' | 'branch.description' | 'branch.cancel' | 'branch.confirm' | 'branch.search' | 'branch.list' | 'branch.current' | 'branch.local' | 'branch.remote' | 'branch.notRepo' | 'branch.none' | 'branch.loading' | 'branch.noMatch' | 'branch.truncated'
/** The merge dialog, which reuses the branch dialog's list and footer. */
 | 'merge.titleFrom' | 'merge.descriptionFrom' | 'merge.confirm' | 'merge.noneFrom'
/** The create dialog, which reuses the branch dialog's list as a start point. */
 | 'create.title' | 'create.description' | 'create.name' | 'create.confirm' | 'create.none'
/** The delete dialog, and the marks its rows carry. */
 | 'delete.title' | 'delete.description' | 'delete.list' | 'delete.confirm' | 'delete.confirmCount' | 'delete.busy' | 'delete.none' | 'safety.unmerged' | 'safety.unpushed' | 'safety.gone'
/** The commit form. */
 | 'commit.placeholder' | 'commit.button' | 'commit.busy'
/** The commit form's Generate control, and what the model asked be read first. */
 | 'commit.generate' | 'commit.generating' | 'commit.warning'
/** The commit form's scope: the caret's own name and the two choices. */
 | 'commit.scopeStaged' | 'commit.scopeAll'
/** The commit button's labels, each carrying the number of rows it records. */
 | 'commit.buttonStaged' | 'commit.buttonAll'
/** The one-line fix stated under a refusal the user can undo by configuring Git. */
 | 'hint.commit-identity'
/** The changed-path pane's empty and loading states. */
 | 'list.notRepo' | 'list.statusFailed' | 'list.loading'
/** The changed-path lists: what each holds, and the actions that move one path
 *  between the first two or discard its worktree half. */
 | 'stage.staged' | 'stage.unstaged' | 'stage.conflict' | 'stage.stage' | 'stage.unstage' | 'stage.stageFile' | 'stage.unstageFile'
/** The check on a conflicted row: `git add` it as resolved, i.e. stage it. */
 | 'stage.markResolved' | 'stage.markResolvedFile'
/** The conflict group's own check: every path in it, as resolved. */
 | 'stage.markAllResolved'
/** The unstaged action that throws the worktree half away, and the dialog it
 *  opens before doing so. */
 | 'stage.discard' | 'stage.discardFile' | 'stage.stageFolder' | 'stage.unstageFolder' | 'stage.discardFolder' | 'stage.stageAll' | 'stage.unstageAll' | 'stage.discardAll' | 'discard.title' | 'discard.description' | 'discard.tracked' | 'discard.untracked' | 'discard.folder' | 'discard.folderUntracked' | 'discard.all' | 'discard.allUntracked' | 'discard.confirm' | 'discard.delete' | 'discard.cancel'
/** What a folder row in the changed-path tree is called. */
 | 'tree.folderLabel'
/** The history pane's empty and loading states. */
 | 'history.failed' | 'history.loading' | 'history.empty'
/** What one history row adds to the commit it names. */
 | 'commit.noMessage' | 'commit.merge'
/** The diff pane. */
 | 'diff.pane' | 'diff.notRepo' | 'diff.repoFailed' | 'diff.emptyHint' | 'diff.loading' | 'diff.failed' | 'diff.noTextTitle' | 'diff.noTextUntracked' | 'diff.noTextOther' | 'diff.mergeNote' | 'diff.hiddenRows' | 'diff.truncated' | 'diff.copy' | 'diff.copied' | 'diff.expand' | 'diff.collapse'
/** The operations this page cannot finish, and the merge the form can. */
 | 'operation.rebase' | 'operation.cherryPick' | 'commit.finishMerge' | 'commit.operationBlocked'
/** The conflict pane: its header, its per-block choices, and its states. */
 | 'conflict.block' | 'conflict.current' | 'conflict.incoming' | 'conflict.base' | 'conflict.takeOurs' | 'conflict.takeTheirs' | 'conflict.takeBoth' | 'conflict.takeBase' | 'conflict.takeAllOurs' | 'conflict.takeAllTheirs' | 'conflict.noLines' | 'conflict.binaryTitle' | 'conflict.binaryText' | 'conflict.missingTitle' | 'conflict.missingText' | 'conflict.keepOurs' | 'conflict.keepTheirs' | 'conflict.keepOursGone' | 'conflict.keepTheirsGone' | 'conflict.cleanTitle' | 'conflict.cleanText' | 'conflict.showContext' | 'conflict.hideContext'
/** The plugin page's update row: the published version, and installing it. */
 | 'update.published' | 'update.upgrade' | 'update.confirm' | 'update.confirmLink' | 'update.confirmYes' | 'update.cancel' | 'update.applying' | 'update.done' | 'update.restart' | 'update.failed' | 'update.unavailable' | 'update.retry' | 'update.npm' | 'update.github';
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
    'label.settings': string;
    'label.settingsRead': string;
    'fallback.status': string;
    'fallback.log': string;
    'fallback.diff': string;
    'fallback.branches': string;
    'fallback.message': string;
    'fallback.settings': string;
    'fallback.settingsRead': string;
    'title.switchBranch': string;
    'title.refresh': string;
    'title.fetch': string;
    'title.mergeFrom': string;
    'title.pull': string;
    'title.push': string;
    'title.publish': string;
    'title.commit': string;
    'title.undoCommit': string;
    'title.stage': string;
    'title.unstage': string;
    'title.stageFolder': string;
    'title.unstageFolder': string;
    'title.stageAll': string;
    'title.unstageAll': string;
    'title.discardAll': string;
    'title.discard': string;
    'title.diff': string;
    'title.branches': string;
    'title.branchCreate': string;
    'title.branchDelete': string;
    'title.message': string;
    'title.settings': string;
    'title.settingsRead': string;
    'title.resolve': string;
    'title.resolveDone': string;
    'title.completeMerge': string;
    'dialog.close': string;
    'dialog.ok': string;
    'head.currentBranch': string;
    'head.detached': string;
    'head.more': string;
    'head.refresh': string;
    'head.fetch': string;
    'head.pull': string;
    'head.push': string;
    'head.mergeFrom': string;
    'head.branchCreate': string;
    'head.branchDelete': string;
    'head.undoCommit': string;
    'head.settings': string;
    'settings.title': string;
    'settings.description': string;
    'settings.model': string;
    'settings.modelDefaultUnknown': string;
    'settings.modelEmpty': string;
    'settings.modelUnavailable': string;
    'settings.modelSearch': string;
    'settings.searchEmpty': string;
    'settings.effort': string;
    'settings.effortReadFailed': string;
    'settings.prompt': string;
    'settings.promptHint': string;
    'settings.promptReset': string;
    'settings.loading': string;
    'settings.cancel': string;
    'settings.save': string;
    'settings.saving': string;
    'remote.publish': string;
    'remote.sync': string;
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
    'merge.titleFrom': string;
    'merge.descriptionFrom': string;
    'merge.confirm': string;
    'merge.noneFrom': string;
    'create.title': string;
    'create.description': string;
    'create.name': string;
    'create.confirm': string;
    'create.none': string;
    'delete.title': string;
    'delete.description': string;
    'delete.list': string;
    'delete.confirm': string;
    'delete.confirmCount': string;
    'delete.busy': string;
    'delete.none': string;
    'safety.unmerged': string;
    'safety.unpushed': string;
    'safety.gone': string;
    'commit.placeholder': string;
    'commit.button': string;
    'commit.busy': string;
    'commit.generate': string;
    'commit.generating': string;
    'commit.warning': string;
    'commit.scopeStaged': string;
    'commit.scopeAll': string;
    'commit.buttonStaged': string;
    'commit.buttonAll': string;
    'hint.commit-identity': string;
    'list.notRepo': string;
    'list.statusFailed': string;
    'list.loading': string;
    'stage.staged': string;
    'stage.unstaged': string;
    'stage.conflict': string;
    'stage.stage': string;
    'stage.unstage': string;
    'stage.stageFile': string;
    'stage.unstageFile': string;
    'stage.markResolved': string;
    'stage.markResolvedFile': string;
    'stage.markAllResolved': string;
    'stage.discard': string;
    'stage.discardFile': string;
    'stage.stageFolder': string;
    'stage.unstageFolder': string;
    'stage.discardFolder': string;
    'stage.stageAll': string;
    'stage.unstageAll': string;
    'stage.discardAll': string;
    'discard.title': string;
    'discard.description': string;
    'discard.tracked': string;
    'discard.untracked': string;
    'discard.folder': string;
    'discard.folderUntracked': string;
    'discard.all': string;
    'discard.allUntracked': string;
    'discard.confirm': string;
    'discard.delete': string;
    'discard.cancel': string;
    'tree.folderLabel': string;
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
    'operation.rebase': string;
    'operation.cherryPick': string;
    'commit.finishMerge': string;
    'commit.operationBlocked': string;
    'conflict.block': string;
    'conflict.current': string;
    'conflict.incoming': string;
    'conflict.base': string;
    'conflict.takeOurs': string;
    'conflict.takeTheirs': string;
    'conflict.takeBoth': string;
    'conflict.takeBase': string;
    'conflict.takeAllOurs': string;
    'conflict.takeAllTheirs': string;
    'conflict.noLines': string;
    'conflict.binaryTitle': string;
    'conflict.binaryText': string;
    'conflict.missingTitle': string;
    'conflict.missingText': string;
    'conflict.keepOurs': string;
    'conflict.keepTheirs': string;
    'conflict.keepOursGone': string;
    'conflict.keepTheirsGone': string;
    'conflict.cleanTitle': string;
    'conflict.cleanText': string;
    'conflict.showContext': string;
    'conflict.hideContext': string;
    'update.published': string;
    'update.upgrade': string;
    'update.confirm': string;
    'update.confirmLink': string;
    'update.confirmYes': string;
    'update.cancel': string;
    'update.applying': string;
    'update.done': string;
    'update.restart': string;
    'update.failed': string;
    'update.unavailable': string;
    'update.retry': string;
    'update.npm': string;
    'update.github': string;
    'error.not-ready': string;
    'error.no-workdir': string;
    'error.no-subprocess': string;
    'error.missing-path': string;
    'error.bad-hash': string;
    'error.missing-message': string;
    'error.missing-branch': string;
    'error.missing-name': string;
    'error.git-exit': string;
    'error.no-root': string;
    'error.no-commits': string;
    'error.unparsable-commit': string;
    'error.unknown-branch': string;
    'error.remote-local-name': string;
    'error.checkout-dirty': string;
    'error.checkout-dirty-paths': string;
    'error.branch-exists': string;
    'error.branch-not-merged': string;
    'error.branch-in-use': string;
    'error.unknown-remote': string;
    'error.merge-dirty': string;
    'error.merge-conflict': string;
    'error.merge-same-branch': string;
    'error.merge-detached': string;
    'error.merge-no-commits': string;
    'error.not-conflicted': string;
    'error.stale-conflict': string;
    'error.resolve-unsafe': string;
    'error.bad-choice': string;
    'error.no-operation': string;
    'error.complete-conflict': string;
    'error.pull-no-commits': string;
    'error.push-no-commits': string;
    'error.pull-detached': string;
    'error.push-detached': string;
    'error.pull-no-upstream': string;
    'error.pull-dirty': string;
    'error.push-dirty': string;
    'error.auth': string;
    'error.pull-diverged': string;
    'error.pull-conflict': string;
    'error.push-behind': string;
    'error.push-no-remote': string;
    'error.push-ambiguous-remote': string;
    'error.commit-clean': string;
    'error.commit-nothing-staged': string;
    'error.commit-conflict': string;
    'error.commit-identity': string;
    'error.commit-undo-root': string;
    'error.commit-undo-operation': string;
    'error.no-llm': string;
    'error.no-model': string;
    'error.model-timeout': string;
    'error.model-truncated': string;
    'error.empty-message': string;
    'error.no-plugin-manager': string;
    'error.bad-version': string;
};
/** The Chinese copy, key for key the same page. */
export declare const zh: typeof en;
export {};
//# sourceMappingURL=locales.d.ts.map