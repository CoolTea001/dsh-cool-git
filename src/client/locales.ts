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

import type { FailureCode } from '../shared/contract.js'

/** The dictionary namespace this page owns. */
export const NS = 'coolGit'

/** The copy of the page's own controls, panes, and states. */
type UiKey =
  /** The tab's own name in the session's tab bar. */
  | 'view.git'
  /** One changed-path row's state, spelled out in its hover bubble. */
  | 'kind.added'
  | 'kind.modified'
  | 'kind.deleted'
  | 'kind.renamed'
  | 'kind.copied'
  | 'kind.typeChange'
  | 'kind.untracked'
  | 'kind.conflicted'
  | 'kind.unknown'
  /** A commit's age, in the three units a history row shows. */
  | 'time.now'
  | 'time.minutes'
  | 'time.hours'
  | 'time.days'
  /** One line of the error dialog: the request that failed, then its reason. */
  | 'error.line'
  /** The reason stated when an answer carried neither a code nor any text. */
  | 'fallback.unknown'
  /** The page's own refusal for a path the newest status no longer lists. */
  | 'fallback.fileGone'
  /** What each request is called, as the error dialog's line prefix. */
  | 'label.status'
  | 'label.log'
  | 'label.commit'
  | 'label.diff'
  | 'label.message'
  | 'label.settings'
  | 'label.settingsRead'
  /** What that line says when the answer gave no reason at all. */
  | 'fallback.status'
  | 'fallback.log'
  | 'fallback.diff'
  | 'fallback.branches'
  | 'fallback.message'
  | 'fallback.settings'
  | 'fallback.settingsRead'
  /** The heading over each failure the page can report. */
  | 'title.switchBranch'
  | 'title.refresh'
  | 'title.fetch'
  | 'title.mergeFrom'
  | 'title.pull'
  | 'title.push'
  | 'title.publish'
  | 'title.commit'
  | 'title.undoCommit'
  | 'title.stage'
  | 'title.unstage'
  | 'title.stageFolder'
  | 'title.unstageFolder'
  | 'title.stageAll'
  | 'title.unstageAll'
  | 'title.discardAll'
  | 'title.discard'
  | 'title.diff'
  | 'title.branches'
  | 'title.branchCreate'
  | 'title.branchDelete'
  | 'title.message'
  | 'title.settings'
  | 'title.settingsRead'
  | 'title.resolve'
  | 'title.resolveDone'
  | 'title.completeMerge'
  /** The error dialog's own two controls. */
  | 'dialog.close'
  | 'dialog.ok'
  /** The sidebar's first row. */
  | 'head.currentBranch'
  | 'head.detached'
  /** The row's overflow control: the menu it opens, not one of the rows inside it. */
  | 'head.more'
  /** The menu's Refresh row, which is the operation the row used to carry alone. */
  | 'head.refresh'
  /** The menu's Fetch row: the remotes re-read, with nothing chosen. */
  | 'head.fetch'
  /** The menu's Pull and Push rows, each one half of the round trip taken alone. */
  | 'head.pull'
  | 'head.push'
  /** The menu's merge row, and the dialog it opens. */
  | 'head.mergeFrom'
  /** The menu's two branch rows, each opening a dialog of its own. */
  | 'head.branchCreate'
  | 'head.branchDelete'
  /** The menu's undo row, which takes the commit at HEAD back off the branch. */
  | 'head.undoCommit'
  /** The menu's last row, and the dialog it opens. */
  | 'head.settings'
  /** The settings dialog: the model and prompt that write commit messages. */
  | 'settings.title'
  | 'settings.description'
  | 'settings.model'
  | 'settings.modelDefaultUnknown'
  | 'settings.modelEmpty'
  | 'settings.modelUnavailable'
  | 'settings.modelSearch'
  | 'settings.searchEmpty'
  | 'settings.effort'
  | 'settings.effortReadFailed'
  | 'settings.prompt'
  | 'settings.promptHint'
  | 'settings.promptReset'
  | 'settings.loading'
  | 'settings.cancel'
  | 'settings.save'
  | 'settings.saving'
  /** The remote control in the history pane's header. */
  | 'remote.publish'
  | 'remote.sync'
  /** The history pane's header, followed by its row count. */
  | 'pane.history'
  /** The branch dialog. */
  | 'branch.title'
  | 'branch.description'
  | 'branch.cancel'
  | 'branch.confirm'
  | 'branch.search'
  | 'branch.list'
  | 'branch.current'
  | 'branch.local'
  | 'branch.remote'
  | 'branch.notRepo'
  | 'branch.none'
  | 'branch.loading'
  | 'branch.noMatch'
  | 'branch.truncated'
  /** The merge dialog, which reuses the branch dialog's list and footer. */
  | 'merge.titleFrom'
  | 'merge.descriptionFrom'
  | 'merge.confirm'
  | 'merge.noneFrom'
  /** The create dialog, which reuses the branch dialog's list as a start point. */
  | 'create.title'
  | 'create.description'
  | 'create.name'
  | 'create.confirm'
  | 'create.none'
  /** The delete dialog, and the marks its rows carry. */
  | 'delete.title'
  | 'delete.description'
  | 'delete.list'
  | 'delete.confirm'
  | 'delete.confirmCount'
  | 'delete.busy'
  | 'delete.none'
  | 'safety.unmerged'
  | 'safety.unpushed'
  | 'safety.gone'
  /** The commit form. */
  | 'commit.placeholder'
  | 'commit.button'
  | 'commit.busy'
  /** The commit form's Generate control, and what the model asked be read first. */
  | 'commit.generate'
  | 'commit.generating'
  | 'commit.warning'
  /** The commit form's scope: the caret's own name and the two choices. */
  | 'commit.scopeStaged'
  | 'commit.scopeAll'
  /** The commit button's labels, each carrying the number of rows it records. */
  | 'commit.buttonStaged'
  | 'commit.buttonAll'
  /** The one-line fix stated under a refusal the user can undo by configuring Git. */
  | 'hint.commit-identity'
  /** The changed-path pane's empty and loading states. */
  | 'list.notRepo'
  | 'list.statusFailed'
  | 'list.loading'
  /** The changed-path lists: what each holds, and the actions that move one path
   *  between the first two or discard its worktree half. */
  | 'stage.staged'
  | 'stage.unstaged'
  | 'stage.conflict'
  | 'stage.stage'
  | 'stage.unstage'
  | 'stage.stageFile'
  | 'stage.unstageFile'
  /** The check on a conflicted row: `git add` it as resolved, i.e. stage it. */
  | 'stage.markResolved'
  | 'stage.markResolvedFile'
  /** The conflict group's own check: every path in it, as resolved. */
  | 'stage.markAllResolved'
  /** The unstaged action that throws the worktree half away, and the dialog it
   *  opens before doing so. */
  | 'stage.discard'
  | 'stage.discardFile'
  | 'stage.stageFolder'
  | 'stage.unstageFolder'
  | 'stage.discardFolder'
  | 'stage.stageAll'
  | 'stage.unstageAll'
  | 'stage.discardAll'
  | 'discard.title'
  | 'discard.description'
  | 'discard.tracked'
  | 'discard.untracked'
  | 'discard.folder'
  | 'discard.folderUntracked'
  | 'discard.all'
  | 'discard.allUntracked'
  | 'discard.confirm'
  | 'discard.delete'
  | 'discard.cancel'
  /** What a folder row in the changed-path tree is called. */
  | 'tree.folderLabel'
  /** The history pane's empty and loading states. */
  | 'history.failed'
  | 'history.loading'
  | 'history.empty'
  /** What one history row adds to the commit it names. */
  | 'commit.noMessage'
  | 'commit.merge'
  /** The diff pane. */
  | 'diff.pane'
  | 'diff.notRepo'
  | 'diff.repoFailed'
  | 'diff.emptyHint'
  | 'diff.loading'
  | 'diff.failed'
  | 'diff.noTextTitle'
  | 'diff.noTextUntracked'
  | 'diff.noTextOther'
  | 'diff.mergeNote'
  | 'diff.hiddenRows'
  | 'diff.truncated'
  | 'diff.copy'
  | 'diff.copied'
  | 'diff.expand'
  | 'diff.collapse'
  /** The operations this page cannot finish, and the merge the form can. */
  | 'operation.rebase'
  | 'operation.cherryPick'
  | 'commit.finishMerge'
  | 'commit.operationBlocked'
  /** The conflict pane: its header, its per-block choices, and its states. */
  | 'conflict.block'
  | 'conflict.current'
  | 'conflict.incoming'
  | 'conflict.base'
  | 'conflict.takeOurs'
  | 'conflict.takeTheirs'
  | 'conflict.takeBoth'
  | 'conflict.takeBase'
  | 'conflict.takeAllOurs'
  | 'conflict.takeAllTheirs'
  | 'conflict.noLines'
  | 'conflict.binaryTitle'
  | 'conflict.binaryText'
  | 'conflict.missingTitle'
  | 'conflict.missingText'
  | 'conflict.keepOurs'
  | 'conflict.keepTheirs'
  | 'conflict.keepOursGone'
  | 'conflict.keepTheirsGone'
  | 'conflict.cleanTitle'
  | 'conflict.cleanText'
  | 'conflict.showContext'
  | 'conflict.hideContext'
  /** The plugin page's update row: the published version, and installing it. */
  | 'update.published'
  | 'update.upgrade'
  | 'update.confirm'
  | 'update.confirmLink'
  | 'update.confirmYes'
  | 'update.cancel'
  | 'update.applying'
  | 'update.done'
  | 'update.restart'
  | 'update.failed'
  | 'update.unavailable'
  | 'update.retry'
  | 'update.npm'
  | 'update.github'

/** Every key in the namespace: the page's own, and one sentence per refusal. */
export type MessageKey = UiKey | `error.${FailureCode}`

/**
 * The translate seat the page draws through.
 *
 * A key and its placeholder values, read at call time: the function a locale
 * switch hands out is a new one, which is what re-renders the tab.
 */
export type Translate = (
  key: MessageKey,
  params?: Readonly<Record<string, string | number>>,
) => string

/** The English copy, which is also the fallback every lookup ends at. */
export const en = {
  'view.git': 'Git',

  'kind.added': 'Added',
  'kind.modified': 'Modified',
  'kind.deleted': 'Deleted',
  'kind.renamed': 'Renamed',
  'kind.copied': 'Copied',
  'kind.typeChange': 'Type changed',
  'kind.untracked': 'Untracked',
  'kind.conflicted': 'Conflicted',
  'kind.unknown': 'Unknown',

  'time.now': 'just now',
  'time.minutes': '{count} min ago',
  'time.hours': '{count} h ago',
  'time.days': '{count} d ago',

  'error.line': '{label}: {reason}',
  'fallback.unknown': 'Unknown error',
  'fallback.fileGone': 'This file is no longer in the change list',

  'label.status': 'Reading repository status',
  'label.log': 'Reading commit history',
  'label.commit': 'Reading the commit',
  'label.diff': 'Reading the file diff',
  'label.message': 'Generating the commit message',
  'label.settings': 'Saving settings',
  'label.settingsRead': 'Reading settings',

  'fallback.status': 'Could not read the repository status',
  'fallback.log': 'Could not read the commit history',
  'fallback.diff': 'Could not read the diff',
  'fallback.branches': 'Could not read the branch list',
  'fallback.message': 'Could not generate a commit message',
  'fallback.settings': 'Could not save the settings',
  'fallback.settingsRead': 'Could not read the settings',

  'title.switchBranch': 'Could not switch to {branch}',
  'title.refresh': 'Refresh failed',
  'title.fetch': 'Fetch failed',
  'title.mergeFrom': 'Could not merge {branch} in',
  'title.pull': 'Pull failed',
  'title.push': 'Push failed',
  'title.publish': 'Publish failed',
  'title.commit': 'Commit failed',
  'title.undoCommit': 'Undo commit failed',
  'title.stage': 'Could not stage the file',
  'title.unstage': 'Could not unstage the file',
  'title.stageFolder': 'Could not stage the folder',
  'title.unstageFolder': 'Could not unstage the folder',
  'title.stageAll': 'Could not stage every change',
  'title.unstageAll': 'Could not unstage every change',
  'title.discardAll': 'Could not discard every change',
  'title.discard': 'Could not discard the changes',
  'title.diff': 'Could not read the diff',
  'title.branches': 'Could not read the branch list',
  'title.branchCreate': 'Could not create the branch',
  'title.branchDelete': 'Could not delete every branch',
  'title.message': 'Could not generate a commit message',
  'title.settings': 'Could not save the settings',
  'title.settingsRead': 'Could not read the settings',
  'title.resolve': 'Could not resolve the conflict',
  'title.resolveDone': 'Could not mark the file resolved',
  'title.completeMerge': 'Could not finish the merge',

  'dialog.close': 'Close',
  'dialog.ok': 'Got it',

  'head.currentBranch': 'Current branch',
  'head.detached': 'detached',
  'head.more': 'More',
  // The two reads carry the side of the repository they touch, in parentheses,
  // because that is the whole of what tells them apart: Refresh re-reads what
  // the working tree already says, while Fetch goes to the network. `remotes`
  // and not `origin`: the row runs `git fetch --all`, so a repository with an
  // `upstream` beside its `origin` is the case the word has to cover.
  'head.refresh': 'Refresh (local)',
  'head.fetch': 'Fetch (remotes)',
  'head.pull': 'Pull',
  'head.push': 'Push',
  'head.mergeFrom': 'Merge from',
  'head.branchCreate': 'Branch create',
  'head.branchDelete': 'Branch delete',
  'head.undoCommit': 'Undo Last Commit',
  'head.settings': 'Settings',

  'settings.title': 'Settings',
  'settings.description': 'Set the message generation model and prompt',
  'settings.model': 'Message generation model',
  'settings.modelDefaultUnknown': 'DSH default model',
  'settings.modelEmpty': 'No models are available',
  'settings.modelUnavailable': '{model} (unavailable)',
  'settings.modelSearch': 'Search models',
  'settings.searchEmpty': 'No model matches the search',
  'settings.effort': 'Reasoning effort',
  'settings.effortReadFailed': 'Could not read the effort list',
  'settings.prompt': 'Message generation prompt',
  'settings.promptHint': 'Each Workspace has its own prompt. Leave the field empty to use the built-in prompt.',
  'settings.promptReset': 'Restore default',
  'settings.loading': 'Loading…',
  'settings.cancel': 'Cancel',
  'settings.save': 'Save',
  'settings.saving': 'Saving…',

  'remote.publish': 'Publish branch',
  'remote.sync': 'Sync · {behind} to pull · {ahead} to push',

  'pane.history': 'Commit history',

  'branch.title': 'Switch branch',
  'branch.description': 'Choose a branch to switch to',
  'branch.cancel': 'Cancel',
  'branch.confirm': 'Switch',
  'branch.search': 'Search branches',
  'branch.list': 'Branches',
  'branch.current': 'Current branch',
  'branch.local': 'Local branches',
  'branch.remote': 'Remote branches',
  'branch.notRepo': 'This session\'s directory is not a Git repository',
  'branch.none': 'No branches to switch to',
  'branch.loading': 'Reading branches…',
  'branch.noMatch': 'No matching branches',
  'branch.truncated': 'Too many branches; only the most recent are listed',

  'merge.titleFrom': 'Merge branch',
  'merge.descriptionFrom': 'Merge the selected branch into the current branch',
  'merge.confirm': 'Merge',
  'merge.noneFrom': 'No other branch to merge in',

  'create.title': 'Create branch',
  'create.description': 'Choose a starting point and enter a new branch name',
  'create.name': 'New branch name',
  'create.confirm': 'Create',
  'create.none': 'No branch to start from',

  'delete.title': 'Delete branches',
  'delete.description': 'Choose the branches to delete',
  'delete.list': 'Branches to delete',
  'delete.confirm': 'Delete',
  'delete.confirmCount': 'Delete {count}',
  'delete.busy': 'Deleting…',
  'delete.none': 'No branches to delete',

  'safety.unmerged': 'It is not merged into the current branch and has no upstream, so Git will refuse to delete it',
  'safety.unpushed': 'It has commits that have not been pushed, so Git will refuse to delete it',
  'safety.gone': 'The remote branch it tracked is gone, so Git will refuse to delete it',

  'commit.placeholder': 'Commit Message',
  'commit.button': 'Commit',
  'commit.busy': 'Commit…',
  'commit.generate': 'Generate a commit message',
  'commit.generating': 'Generating…',
  'commit.warning': 'Before you commit: {text}',
  'commit.scopeStaged': 'Commit Staged',
  'commit.scopeAll': 'Commit All',
  'commit.buttonStaged': 'Commit Staged',
  'commit.buttonAll': 'Commit All',
  'hint.commit-identity': 'Set it once with git config --global user.name "Your Name" and git config --global user.email "you@example.com"; drop --global to set it for this repository only',

  'list.notRepo': 'This session\'s directory is not a Git repository',
  'list.statusFailed': 'Could not read the repository status',
  'list.loading': 'Reading the repository…',

  'stage.staged': 'Staged changes',
  'stage.unstaged': 'Changes',
  'stage.conflict': 'Conflicts',
  'stage.stage': 'Stage changes',
  'stage.unstage': 'Unstage',
  'stage.stageFile': 'Stage {path}',
  'stage.unstageFile': 'Unstage {path}',
  'stage.markResolved': 'Mark resolved',
  'stage.markResolvedFile': 'Mark {path} resolved',
  'stage.markAllResolved': 'Mark all resolved',
  'stage.discard': 'Discard changes',
  'stage.discardFile': 'Discard changes in {path}',
  'stage.stageFolder': 'Stage changes under {path}',
  'stage.unstageFolder': 'Unstage changes under {path}',
  'stage.discardFolder': 'Discard changes under {path}',
  'stage.stageAll': 'Stage all changes',
  'stage.unstageAll': 'Unstage all changes',
  'stage.discardAll': 'Discard all changes',
  'discard.title': 'Discard changes',
  'discard.description': 'This cannot be undone.',
  'discard.tracked': 'Discard the unstaged changes in {path}?',
  'discard.untracked': 'Delete the untracked file {path}?',
  'discard.folder': 'Discard the unstaged changes under {path}? Files affected: {count}.',
  'discard.folderUntracked': 'Discard the unstaged changes under {path}? Files affected: {count}. Untracked files will be deleted.',
  'discard.all': 'Discard all unstaged changes? Files affected: {count}.',
  'discard.allUntracked': 'Discard all unstaged changes? Files affected: {count}. Untracked files will be deleted.',
  'discard.confirm': 'Discard changes',
  'discard.delete': 'Delete file',
  'discard.cancel': 'Cancel',
  'tree.folderLabel': 'Changed files in {name}',

  'history.failed': 'Could not read the commit history',
  'history.loading': 'Reading the commit history…',
  'history.empty': 'No commits yet',

  'commit.noMessage': '(no commit message)',
  'commit.merge': 'Merge',

  'diff.pane': 'Diff',
  'diff.notRepo': 'This session\'s directory is not a Git repository',
  'diff.repoFailed': 'Could not read the repository',
  'diff.emptyHint': 'Select a file or a commit on the left to see its diff here',
  'diff.loading': 'Reading the diff…',
  'diff.failed': 'Could not read the diff',
  'diff.noTextTitle': 'No textual diff to show',
  'diff.noTextUntracked': 'This is a new untracked file, so its content is that of an empty file',
  'diff.noTextOther': 'This file\'s changes have no textual diff (a binary file, or a mode-only change)',
  'diff.mergeNote': 'Merge commit: the diff below compares against the first parent.',
  'diff.hiddenRows': '{count} more lines are not rendered (the diff is too large).',
  'diff.truncated': 'The diff exceeded the read limit and was truncated.',
  'diff.copy': 'Copy diff',
  'diff.copied': 'Copied',
  'diff.expand': 'Expand this file\'s diff',
  'diff.collapse': 'Collapse this file\'s diff',

  'operation.rebase': 'Rebase',
  'operation.cherryPick': 'Cherry-pick',
  'commit.finishMerge': 'Finish merge',
  'commit.operationBlocked': '{operation} in progress: finish or abort it in a terminal first',

  'conflict.block': 'Conflict {index} / {total}',
  'conflict.current': 'Current',
  'conflict.incoming': 'Incoming',
  'conflict.base': 'Base',
  'conflict.takeOurs': 'Take current',
  'conflict.takeTheirs': 'Take incoming',
  'conflict.takeBoth': 'Keep both',
  'conflict.takeBase': 'Take base',
  'conflict.takeAllOurs': 'Take current everywhere',
  'conflict.takeAllTheirs': 'Take incoming everywhere',
  'conflict.noLines': 'no lines',
  'conflict.binaryTitle': 'This conflict has no text to choose between',
  'conflict.binaryText': 'The file is binary (or too large to read as text), so it has to be settled as a whole. Pick the version to keep.',
  'conflict.missingTitle': 'One side of this file was deleted',
  'conflict.missingText': 'There is nothing to choose between line by line: one side removed this file. Pick the side whose version — or absence — you want to keep.',
  'conflict.keepOurs': 'Keep current version',
  'conflict.keepTheirs': 'Keep incoming version',
  'conflict.keepOursGone': 'Keep the deletion (current)',
  'conflict.keepTheirsGone': 'Keep the deletion (incoming)',
  'conflict.cleanTitle': 'No conflict markers left',
  'conflict.cleanText': 'The file has no conflict blocks. When it reads the way you want, tick the check at the end of its row to mark it resolved.',
  'conflict.showContext': 'Show {count} unchanged lines',
  'conflict.hideContext': 'Hide {count} unchanged lines',

  // The update row on this bundle's own page in the Plugins panel. The value is
  // the registry's answer and never this plugin's own guess; `{version}` is what
  // the install will put in the profile, which is why the confirm sentence names
  // it and the result sentences repeat it.
  'update.published': 'New version {version} is available',
  'update.upgrade': 'Update now',
  'update.confirm': 'Install {version}?',
  'update.confirmLink': 'Install {version} from npm instead of the local checkout?',
  'update.confirmYes': 'Install',
  'update.cancel': 'Cancel',
  'update.applying': 'Updating…',
  'update.done': 'Updated to {version}',
  'update.restart': 'Installed {version}; restart DSH to use it',
  'update.failed': 'Update failed',
  'update.unavailable': 'Could not read the published version',
  'update.retry': 'Retry',
  'update.npm': 'npm package page',
  'update.github': 'GitHub repository',

  'error.not-ready': 'The session is not ready yet; try again in a moment',
  'error.no-workdir': 'Could not determine the session\'s working directory',
  'error.no-subprocess': 'The subprocess service is unavailable, so Git cannot run',
  'error.missing-path': 'Missing file path',
  'error.bad-hash': 'Invalid commit id',
  'error.missing-message': 'Missing commit message',
  'error.missing-branch': 'Missing branch name',
  'error.missing-name': 'Missing branch name to create',

  'error.git-exit': 'git exited with code {code}',
  'error.no-root': 'git returned no repository root',
  'error.no-commits': 'This repository has no commits yet',
  'error.unparsable-commit': 'Could not parse that commit',

  'error.unknown-branch': 'No such branch: {name}',
  'error.remote-local-name': 'Could not derive a local branch name from the remote branch: {name}',
  'error.checkout-dirty': 'Uncommitted changes would be overwritten; commit or stash them before switching',
  'error.checkout-dirty-paths': 'Uncommitted changes to {paths} would be overwritten; commit or stash them before switching',

  'error.branch-exists': 'The branch {branch} already exists',
  'error.branch-not-merged': 'Branch {branch} is not fully merged, so Git refused to delete it; merge or push it first',
  'error.branch-in-use': 'Branch {branch} is checked out in a worktree, so Git cannot delete it',
  'error.unknown-remote': 'No such remote: {remote}',

  'error.merge-dirty': 'Uncommitted changes are in the way; commit or stash them before merging',
  'error.merge-conflict': 'Merging {branch} conflicts: the merge is left in the working tree, resolve it in the Conflicts list',
  'error.merge-same-branch': 'Cannot merge {branch} into itself',
  'error.merge-detached': 'HEAD is detached, so there is no branch to merge',
  'error.merge-no-commits': 'This branch has no commits yet, so there is nothing to merge',

  'error.not-conflicted': '{path} is no longer conflicted: nothing to resolve',
  'error.stale-conflict': '{path} changed since it was read, so nothing was written; the pane was re-read',
  'error.resolve-unsafe': '{path} is not a file this plugin may write; resolve it in a terminal',
  'error.bad-choice': 'That choice does not apply to this conflict',
  'error.no-operation': 'No merge is in progress, so there is nothing to finish',
  'error.complete-conflict': 'Some conflicts are still unresolved; resolve and stage every path first',

  'error.pull-no-commits': 'This branch has no commits yet, so there is nothing to pull',
  'error.push-no-commits': 'This branch has no commits yet, so there is nothing to push',
  'error.pull-detached': 'HEAD is detached, so there is no branch to pull',
  'error.push-detached': 'HEAD is detached, so there is no branch to push',
  'error.pull-no-upstream': 'Branch {branch} has no upstream, so it cannot be pulled',
  'error.pull-dirty': 'Uncommitted changes would be overwritten; commit or stash them before pulling',
  'error.push-dirty': 'Uncommitted changes would be overwritten; commit or stash them before pushing',
  'error.auth': 'Remote authentication failed: configure credentials for this repository first (this plugin never prompts for them)',
  'error.pull-diverged': "Git refused to merge the remote history automatically: this repository's configuration forbids non-fast-forward merges (check pull.ff and merge.ff)",
  'error.pull-conflict': 'Pulling {branch} conflicts: the merge is left in the working tree, resolve it in the Conflicts list',
  'error.push-behind': 'The remote gained new commits during the sync; sync once more',
  'error.push-no-remote': 'This repository has no remote configured, so it cannot be pushed',
  'error.push-ambiguous-remote': 'There is more than one remote ({remotes}), so the push target is ambiguous',


  'error.commit-clean': 'There is nothing to commit',
  'error.commit-nothing-staged': 'Nothing is staged to commit',
  'error.commit-conflict': 'Unresolved conflicts remain; resolve them before committing',
  'error.commit-identity': 'Git has no author identity configured, so it refused the commit',

  'error.commit-undo-root': 'The commit at HEAD is this repository\'s first commit, so there is no earlier commit to step back to',
  'error.commit-undo-operation': 'A merge, rebase, or cherry-pick is in progress; finish or abort it before undoing a commit',

  'error.no-llm': 'The model service is unavailable, so no commit message can be written',
  'error.no-model': 'No default model is configured, so no commit message can be written',
  'error.model-timeout': 'The model did not answer in time',
  'error.model-truncated': 'The model used its whole output budget on reasoning before writing the message; try again, or lower the default reasoning effort',
  'error.empty-message': 'The model returned no commit message',

  'error.no-plugin-manager': 'The plugin manager is unavailable, so this bundle cannot be installed from here',
  'error.bad-version': 'That version cannot be installed',
} satisfies Record<MessageKey, string>

/** The Chinese copy, key for key the same page. */
export const zh: typeof en = {
  'view.git': 'Git',

  'kind.added': '新增',
  'kind.modified': '修改',
  'kind.deleted': '删除',
  'kind.renamed': '重命名',
  'kind.copied': '复制',
  'kind.typeChange': '类型变更',
  'kind.untracked': '未跟踪',
  'kind.conflicted': '冲突',
  'kind.unknown': '未知状态',

  'time.now': '刚刚',
  'time.minutes': '{count} 分钟前',
  'time.hours': '{count} 小时前',
  'time.days': '{count} 天前',

  'error.line': '{label}：{reason}',
  'fallback.unknown': '未知错误',
  'fallback.fileGone': '该文件已不在变更列表中',

  'label.status': '读取仓库状态',
  'label.log': '读取提交历史',
  'label.commit': '读取提交',
  'label.diff': '读取文件差异',
  'label.message': '生成提交信息',
  'label.settings': '保存设置',
  'label.settingsRead': '读取设置',

  'fallback.status': '读取仓库状态失败',
  'fallback.log': '读取提交历史失败',
  'fallback.diff': '读取 Diff 失败',
  'fallback.branches': '读取分支列表失败',
  'fallback.message': '生成提交信息失败',
  'fallback.settings': '保存设置失败',
  'fallback.settingsRead': '读取设置失败',

  'title.switchBranch': '切换到 {branch} 失败',
  'title.refresh': '刷新仓库失败',
  'title.fetch': '获取远端更新失败',
  'title.mergeFrom': '合并 {branch} 失败',
  'title.pull': '拉取失败',
  'title.push': '推送失败',
  'title.publish': '发布分支失败',
  'title.commit': '提交失败',
  'title.undoCommit': '撤销提交失败',
  'title.stage': '暂存文件失败',
  'title.unstage': '取消暂存失败',
  'title.stageFolder': '暂存文件夹失败',
  'title.unstageFolder': '取消暂存文件夹失败',
  'title.stageAll': '暂存全部更改失败',
  'title.unstageAll': '取消暂存全部更改失败',
  'title.discardAll': '放弃全部更改失败',
  'title.discard': '放弃变更失败',
  'title.diff': '读取 Diff 失败',
  'title.branches': '读取分支列表失败',
  'title.branchCreate': '创建分支失败',
  'title.branchDelete': '删除分支失败',
  'title.message': '生成提交信息失败',
  'title.settings': '保存设置失败',
  'title.settingsRead': '读取设置失败',
  'title.resolve': '解决冲突失败',
  'title.resolveDone': '标记冲突已解决失败',
  'title.completeMerge': '完成合并失败',

  'dialog.close': '关闭',
  'dialog.ok': '知道了',

  'head.currentBranch': '当前分支',
  'head.detached': '游离',
  'head.more': '更多',
  // The menu names each row with the word the rest of the page already uses for
  // that operation, so a row and the dialog it opens speak the same language:
  // `head.branchCreate` is `创建分支` for the same reason `create.title` is, and
  // `head.mergeFrom` is `合并分支` because `merge.titleFrom` says so. `Fetch` is
  // `获取` rather than `抓取` to keep it apart from `Pull` (`拉取`), which is the
  // distinction the menu is built on: the two rows differ only in whether the
  // working tree moves. The settings row is `设置`, as its dialog is.
  //
  // No row ends in an ellipsis, in either locale. Elsewhere on this page `…`
  // means work in flight (`settings.loading`, `delete.busy`, `commit.busy`), and
  // a still row carrying one would claim a wait that has not started. The rows
  // that open another screen say so by position — the rules already separate the
  // rows that only re-read the repository from the ones that decide something —
  // and one of those dialogs opens from a row with no mark in any case.
  //
  // Refresh and Fetch carry the side they touch in parentheses — `本地` and
  // `远端` — because that is the one thing their names alone do not say, and it
  // is the whole difference a reader needs. Pull and Push are left bare: their
  // verbs already name a direction, and a qualifier on every row would turn the
  // card into a table. `远端` stands for `git fetch --all` and not for `origin`,
  // which a repository with an `upstream` beside it would contradict.
  'head.refresh': '刷新（本地）',
  'head.fetch': '获取（远端）',
  'head.pull': '拉取',
  'head.push': '推送',
  'head.mergeFrom': '合并分支',
  'head.branchCreate': '创建分支',
  'head.branchDelete': '删除分支',
  'head.undoCommit': '撤销最后一次提交',
  'head.settings': '设置',

  'settings.title': '设置',
  'settings.description': '设置生成模型和提示词',
  'settings.model': 'Message 生成模型',
  'settings.modelDefaultUnknown': 'DSH 默认模型',
  'settings.modelEmpty': '没有可用的模型',
  'settings.modelUnavailable': '{model}（不可用）',
  'settings.modelSearch': '搜索模型',
  'settings.searchEmpty': '没有匹配的模型',
  'settings.effort': '思考强度',
  'settings.effortReadFailed': '读取思考强度失败',
  'settings.prompt': 'Message 生成提示词',
  'settings.promptHint': '每个工作区单独保存提示词，留空则使用内置提示词。',
  'settings.promptReset': '恢复默认',
  'settings.loading': '加载中…',
  'settings.cancel': '取消',
  'settings.save': '保存',
  'settings.saving': '保存中…',

  'remote.publish': '发布分支',
  'remote.sync': '同步变更 · 待拉取 {behind} · 待推送 {ahead}',

  'pane.history': '提交历史',

  'branch.title': '切换分支',
  'branch.description': '选择并切换至指定分支',
  'branch.cancel': '取消',
  'branch.confirm': '切换',
  'branch.search': '搜索分支',
  'branch.list': '分支',
  'branch.current': '当前分支',
  'branch.local': '本地分支',
  'branch.remote': '远程分支',
  'branch.notRepo': '当前会话目录不是 Git 仓库',
  'branch.none': '没有可切换的分支',
  'branch.loading': '正在读取分支…',
  'branch.noMatch': '没有匹配的分支',
  'branch.truncated': '分支过多，仅显示最近的部分分支',

  'merge.titleFrom': '合并分支',
  'merge.descriptionFrom': '将选中分支合并到当前分支',
  'merge.confirm': '合并',
  'merge.noneFrom': '没有可合并的其它分支',

  'create.title': '创建分支',
  'create.description': '选择分支起点，并输入新的分支名',
  'create.name': '新分支名',
  'create.confirm': '创建',
  'create.none': '没有可作为起点的分支',

  'delete.title': '删除分支',
  'delete.description': '选择要删除的分支',
  'delete.list': '待删除的分支',
  'delete.confirm': '删除',
  'delete.confirmCount': '删除 {count} 个',
  'delete.busy': '正在删除…',
  'delete.none': '没有可删除的分支',

  'safety.unmerged': '它未合并到当前分支，也没有上游分支，Git 会拒绝删除',
  'safety.unpushed': '它有尚未推送到远端的提交，Git 会拒绝删除',
  'safety.gone': '它跟踪的远程分支已消失，Git 会拒绝删除',

  'commit.placeholder': 'Commit Message',
  'commit.button': 'Commit',
  'commit.busy': 'Commit…',
  'commit.generate': '自动生成提交信息',
  'commit.generating': '正在生成…',
  'commit.warning': '提交前请检查：{text}',
  'commit.scopeStaged': '提交暂存的更改',
  'commit.scopeAll': '提交全部更改',
  'commit.buttonStaged': '提交暂存的更改',
  'commit.buttonAll': '提交全部更改',
  'hint.commit-identity': '请先配置一次：git config --global user.name "你的名字"、git config --global user.email "你的邮箱"；去掉 --global 则只对当前仓库生效',

  'list.notRepo': '当前会话目录不是 Git 仓库',
  'list.statusFailed': '读取仓库状态失败',
  'list.loading': '正在读取仓库…',

  'stage.staged': '暂存的变更',
  'stage.unstaged': '变更',
  'stage.conflict': '冲突',
  'stage.stage': '暂存变更',
  'stage.unstage': '取消暂存',
  'stage.stageFile': '暂存 {path}',
  'stage.unstageFile': '取消暂存 {path}',
  'stage.markResolved': '标记为已解决',
  'stage.markResolvedFile': '标记 {path} 为已解决',
  'stage.markAllResolved': '全部标记为已解决',
  'stage.discard': '放弃变更',
  'stage.discardFile': '放弃 {path} 的变更',
  'stage.stageFolder': '暂存 {path} 下的变更',
  'stage.unstageFolder': '取消暂存 {path} 下的变更',
  'stage.discardFolder': '放弃 {path} 下的变更',
  'stage.stageAll': '暂存全部更改',
  'stage.unstageAll': '取消暂存全部更改',
  'stage.discardAll': '放弃全部更改',
  'discard.title': '放弃变更',
  'discard.description': '此操作无法撤销。',
  'discard.tracked': '放弃 {path} 的未暂存更改？',
  'discard.untracked': '删除未跟踪文件 {path}？',
  'discard.folder': '放弃 {path} 下的未暂存更改？涉及 {count} 个文件。',
  'discard.folderUntracked': '放弃 {path} 下的未暂存更改？涉及 {count} 个文件。未跟踪文件会被删除。',
  'discard.all': '放弃全部未暂存更改？涉及 {count} 个文件。',
  'discard.allUntracked': '放弃全部未暂存更改？涉及 {count} 个文件。未跟踪文件会被删除。',
  'discard.confirm': '放弃变更',
  'discard.delete': '删除文件',
  'discard.cancel': '取消',
  'tree.folderLabel': '{name} 中的变更文件',

  'history.failed': '读取提交历史失败',
  'history.loading': '正在读取提交历史…',
  'history.empty': '还没有任何提交',

  'commit.noMessage': '（无提交信息）',
  'commit.merge': '合并',

  'diff.pane': 'Diff 查看区',
  'diff.notRepo': '当前会话目录不是 Git 仓库',
  'diff.repoFailed': '无法读取仓库',
  'diff.emptyHint': '点击左侧文件或提交，在此查看 Diff',
  'diff.loading': '正在读取 Diff…',
  'diff.failed': '无法读取 Diff',
  'diff.noTextTitle': '没有可显示的文本差异',
  'diff.noTextUntracked': '这是一个未跟踪的新文件，内容与空文件相同',
  'diff.noTextOther': '该文件当前的改动没有文本差异（可能是二进制文件或仅权限变更）',
  'diff.mergeNote': '合并提交：以下差异是与第一个父提交的比较结果。',
  'diff.hiddenRows': '还有 {count} 行未渲染（差异过大）。',
  'diff.truncated': 'Diff 超出读取上限，内容已被截断。',
  'diff.copy': '复制 Diff',
  'diff.copied': '已复制',
  'diff.expand': '展开此文件的差异',
  'diff.collapse': '折叠此文件的差异',

  'operation.rebase': '变基',
  'operation.cherryPick': '拣选',
  'commit.finishMerge': '完成合并',
  'commit.operationBlocked': '{operation}进行中：请先在终端完成或中止',

  'conflict.block': '冲突 {index} / {total}',
  'conflict.current': '当前',
  'conflict.incoming': '传入',
  'conflict.base': '共同祖先',
  'conflict.takeOurs': '采用当前',
  'conflict.takeTheirs': '采用传入',
  'conflict.takeBoth': '保留两者',
  'conflict.takeBase': '采用共同祖先',
  'conflict.takeAllOurs': '全部采用当前',
  'conflict.takeAllTheirs': '全部采用传入',
  'conflict.noLines': '无内容',
  'conflict.binaryTitle': '该冲突没有可逐块选择的文本',
  'conflict.binaryText': '这是二进制文件（或过大无法按文本读取），只能整体取舍：请选择要保留的版本。',
  'conflict.missingTitle': '该文件在某一侧已被删除',
  'conflict.missingText': '这里没有可逐行选择的冲突块：某一侧删除该文件。请选择要保留哪一侧的版本（或保留删除）。',
  'conflict.keepOurs': '保留当前版本',
  'conflict.keepTheirs': '保留传入版本',
  'conflict.keepOursGone': '保留删除（当前侧已删除）',
  'conflict.keepTheirsGone': '保留删除（传入侧已删除）',
  'conflict.cleanTitle': '文件中已无冲突标记',
  'conflict.cleanText': '该文件已没有冲突块。确认内容无误后，点该文件行末的 ✓ 标记为已解决。',
  'conflict.showContext': '展开 {count} 行未修改内容',
  'conflict.hideContext': '收起 {count} 行未修改内容',

  'update.published': '新版本 {version} 已发布',
  'update.upgrade': '立即升级',
  'update.confirm': '安装 {version}？',
  'update.confirmLink': '改为从 npm 安装 {version}？',
  'update.confirmYes': '安装',
  'update.cancel': '取消',
  'update.applying': '正在升级…',
  'update.done': '已升级到 {version}',
  'update.restart': '已安装 {version}，重启 DSH 后生效',
  'update.failed': '升级失败',
  'update.unavailable': '无法获取已发布的版本',
  'update.retry': '重试',
  'update.npm': 'npm 页面',
  'update.github': 'GitHub 仓库',

  'error.not-ready': '会话尚未就绪，请稍后重试',
  'error.no-workdir': '无法确定该会话的工作目录',
  'error.no-subprocess': 'subprocess 服务不可用，无法执行 Git 命令',
  'error.missing-path': '缺少文件路径',
  'error.bad-hash': '提交标识不合法',
  'error.missing-message': '缺少提交信息',
  'error.missing-branch': '缺少分支名',
  'error.missing-name': '缺少要创建的分支名',

  'error.git-exit': 'git 退出码 {code}',
  'error.no-root': 'git 未返回仓库根目录',
  'error.no-commits': '该仓库还没有任何提交',
  'error.unparsable-commit': '无法解析该提交',

  'error.unknown-branch': '分支不存在：{name}',
  'error.remote-local-name': '无法从远程分支推导本地分支名：{name}',
  'error.checkout-dirty': '有未提交的改动会被覆盖，请先提交或暂存后再切换',
  'error.checkout-dirty-paths': '有未提交的改动会被覆盖（{paths}），请先提交或暂存后再切换',

  'error.branch-exists': '分支 {branch} 已存在',
  'error.branch-not-merged': '分支 {branch} 尚未完全合并，Git 拒绝删除；请先合并或推送',
  'error.branch-in-use': '分支 {branch} 已在某个工作区中被检出，Git 无法删除',
  'error.unknown-remote': '不存在该远端：{remote}',

  'error.merge-dirty': '存在未提交的改动，请先提交或暂存后再合并',
  'error.merge-conflict': '与 {branch} 的合并存在冲突：合并已保留在工作区，请在「冲突」列表中解决',
  'error.merge-same-branch': '无法将 {branch} 合并到它自己',
  'error.merge-detached': 'HEAD 处于游离状态，没有可合并的分支',
  'error.merge-no-commits': '当前分支还没有任何提交，无法合并',

  'error.not-conflicted': '{path} 已不再是冲突文件，无需解决',
  'error.stale-conflict': '{path} 在被读取后已被修改，因此没有写入；面板已重新读取',
  'error.resolve-unsafe': '{path} 不是本插件可以写入的文件，请在终端中解决',
  'error.bad-choice': '该选择不适用于这个冲突',
  'error.no-operation': '当前没有进行中的合并，没有可以完成的操作',
  'error.complete-conflict': '仍有未解决的冲突，请先解决并暂存所有冲突文件',

  'error.pull-no-commits': '当前分支还没有任何提交，无法 Pull',
  'error.push-no-commits': '当前分支还没有任何提交，无法 Push',
  'error.pull-detached': 'HEAD 处于游离状态，没有可拉取的分支',
  'error.push-detached': 'HEAD 处于游离状态，没有可推送的分支',
  'error.pull-no-upstream': '分支 {branch} 没有上游分支，无法 Pull',
  'error.pull-dirty': '有未提交的改动会被覆盖，请先提交或暂存后再 Pull',
  'error.push-dirty': '有未提交的改动会被覆盖，请先提交或暂存后再 Push',
  'error.auth': '远程认证失败：请先在该仓库配置好凭据（本插件不弹出任何凭据输入）',
  'error.pull-diverged': 'Git 拒绝自动合并远程历史：该仓库的配置禁止非快进式合并（请检查 pull.ff 与 merge.ff）',
  'error.pull-conflict': '拉取 {branch} 时产生冲突：合并已保留在工作区，请在「冲突」列表中解决',
  'error.push-behind': '远程在同步过程中又有了新提交，请再同步一次',
  'error.push-no-remote': '该仓库没有配置远程仓库，无法 Push',
  'error.push-ambiguous-remote': '有多个远程仓库（{remotes}），无法确定推送目标',


  'error.commit-clean': '工作区没有需要提交的改动',
  'error.commit-nothing-staged': '暂存区没有需要提交的改动',
  'error.commit-conflict': '存在未解决的冲突文件，请先解决冲突再提交',
  'error.commit-identity': 'Git 还没有配置提交身份，无法提交',

  'error.commit-undo-root': '当前提交是该仓库的首次提交，没有更早的提交可以回退',
  'error.commit-undo-operation': '当前有进行中的合并、变基或拣选操作，请先完成或中止后再撤销提交',

  'error.no-llm': '模型服务不可用，无法生成提交信息',
  'error.no-model': '未配置默认模型，无法生成提交信息',
  'error.model-timeout': '模型未在限定时间内返回结果',
  'error.model-truncated': '模型在写出提交信息前就把输出预算用在了思考上，请重试或降低默认推理强度',
  'error.empty-message': '模型未返回提交信息',

  'error.no-plugin-manager': '插件管理器不可用，无法从这里安装该插件',
  'error.bad-version': '该版本无法安装',
}
