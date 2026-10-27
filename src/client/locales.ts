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
  /** What that line says when the answer gave no reason at all. */
  | 'fallback.status'
  | 'fallback.log'
  | 'fallback.diff'
  | 'fallback.branches'
  | 'fallback.message'
  /** The heading over each failure the page can report. */
  | 'title.switchBranch'
  | 'title.refresh'
  | 'title.fetch'
  | 'title.mergeFrom'
  | 'title.pull'
  | 'title.push'
  | 'title.publish'
  | 'title.commit'
  | 'title.diff'
  | 'title.branches'
  | 'title.branchCreate'
  | 'title.branchDelete'
  | 'title.message'
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
  /** The menu's merge row, and the dialog it opens. */
  | 'head.mergeFrom'
  /** The menu's two branch rows, each opening a dialog of its own. */
  | 'head.branchCreate'
  | 'head.branchDelete'
  /** The remote control in the history pane's header. */
  | 'remote.publish'
  | 'remote.sync'
  /** The two pane headers, each followed by its row count. */
  | 'pane.files'
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
  /** The one-line fix stated under a refusal the user can undo by configuring Git. */
  | 'hint.commit-identity'
  /** The changed-path pane's empty and loading states. */
  | 'list.notRepo'
  | 'list.statusFailed'
  | 'list.loading'
  /** Whether a row's change is in the index. */
  | 'stage.staged'
  | 'stage.unstaged'
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

  'fallback.status': 'Could not read the repository status',
  'fallback.log': 'Could not read the commit history',
  'fallback.diff': 'Could not read the diff',
  'fallback.branches': 'Could not read the branch list',
  'fallback.message': 'Could not generate a commit message',

  'title.switchBranch': 'Could not switch to {branch}',
  'title.refresh': 'Refresh failed',
  'title.fetch': 'Fetch failed',
  'title.mergeFrom': 'Could not merge {branch} in',
  'title.pull': 'Pull failed',
  'title.push': 'Push failed',
  'title.publish': 'Publish failed',
  'title.commit': 'Commit failed',
  'title.diff': 'Could not read the diff',
  'title.branches': 'Could not read the branch list',
  'title.branchCreate': 'Could not create the branch',
  'title.branchDelete': 'Could not delete every branch',
  'title.message': 'Could not generate a commit message',

  'dialog.close': 'Close',
  'dialog.ok': 'Got it',

  'head.currentBranch': 'Current branch',
  'head.detached': 'detached',
  'head.more': 'More',
  'head.refresh': 'Refresh',
  'head.fetch': 'Fetch',
  'head.mergeFrom': 'Merge from…',
  'head.branchCreate': 'Branch create…',
  'head.branchDelete': 'Branch delete…',

  'remote.publish': 'Publish branch',
  'remote.sync': 'Sync · {behind} to pull · {ahead} to push',

  'pane.files': 'Changed files',
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
  'hint.commit-identity': 'Set it once with git config --global user.name "Your Name" and git config --global user.email "you@example.com"; drop --global to set it for this repository only',

  'list.notRepo': 'This session\'s directory is not a Git repository',
  'list.statusFailed': 'Could not read the repository status',
  'list.loading': 'Reading the repository…',

  'stage.staged': 'Staged',
  'stage.unstaged': 'Not staged',

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

  'error.not-ready': 'The session is not ready yet; try again in a moment',
  'error.no-workdir': 'Could not determine the session\'s working directory',
  'error.no-shell': 'The shell service is unavailable, so Git cannot run',
  'error.missing-path': 'Missing file path',
  'error.bad-hash': 'Invalid commit id',
  'error.missing-message': 'Missing commit message',
  'error.missing-branch': 'Missing branch name',
  'error.missing-name': 'Missing branch name to create',

  'error.git-denied': 'The current permission mode does not allow running Git commands',
  'error.git-exit': 'git exited with code {code}',
  'error.no-root': 'git returned no repository root',
  'error.no-commits': 'This repository has no commits yet',
  'error.unparsable-commit': 'Could not parse that commit',

  'error.unknown-branch': 'No such branch: {name}',
  'error.remote-local-name': 'Could not derive a local branch name from the remote branch: {name}',
  'error.checkout-denied': 'The current permission mode does not allow switching branches: it needs to write the workspace',
  'error.checkout-dirty': 'Uncommitted changes would be overwritten; commit or stash them before switching',
  'error.checkout-dirty-paths': 'Uncommitted changes to {paths} would be overwritten; commit or stash them before switching',

  'error.branch-exists': 'The branch {branch} already exists',
  'error.create-denied': 'The current permission mode does not allow creating a branch: it needs to write the workspace',
  'error.delete-denied': 'The current permission mode does not allow deleting branches: it needs to write the workspace',
  'error.branch-not-merged': 'Branch {branch} is not fully merged, so Git refused to delete it; merge or push it first',
  'error.branch-in-use': 'Branch {branch} is checked out in a worktree, so Git cannot delete it',
  'error.unknown-remote': 'No such remote: {remote}',

  'error.merge-denied': 'The current permission mode does not allow merging: it needs to write the workspace',
  'error.merge-dirty': 'Uncommitted changes are in the way; commit or stash them before merging',
  'error.merge-conflict': 'The merge with {branch} conflicts, so it was aborted; merge it by hand to resolve the conflict',
  'error.merge-same-branch': 'Cannot merge {branch} into itself',
  'error.merge-detached': 'HEAD is detached, so there is no branch to merge',
  'error.merge-no-commits': 'This branch has no commits yet, so there is nothing to merge',

  'error.pull-no-commits': 'This branch has no commits yet, so there is nothing to pull',
  'error.push-no-commits': 'This branch has no commits yet, so there is nothing to push',
  'error.pull-detached': 'HEAD is detached, so there is no branch to pull',
  'error.push-detached': 'HEAD is detached, so there is no branch to push',
  'error.pull-no-upstream': 'Branch {branch} has no upstream, so it cannot be pulled',
  'error.pull-denied': 'The current permission mode does not allow Pull: it needs to write the workspace',
  'error.push-denied': 'The current permission mode does not allow Push: it needs to write the workspace',
  'error.fetch-denied': 'The current permission mode does not allow Fetch: it needs to write the workspace',
  'error.pull-dirty': 'Uncommitted changes would be overwritten; commit or stash them before pulling',
  'error.push-dirty': 'Uncommitted changes would be overwritten; commit or stash them before pushing',
  'error.auth': 'Remote authentication failed: configure credentials for this repository first (this plugin never prompts for them)',
  'error.auth-helper': 'Remote authentication failed: Git could not start its credential helper inside the current permission sandbox, and no saved credential could be read (this plugin never prompts for one). Sign in once with Git Credential Manager, or use full-access mode / run Pull/Push outside this session',
  'error.pull-diverged': 'The local and remote histories have diverged, and this plugin only fast-forwards: merge or rebase first',
  'error.push-behind': 'The remote gained new commits during the sync; sync once more',
  'error.push-no-remote': 'This repository has no remote configured, so it cannot be pushed',
  'error.push-ambiguous-remote': 'There is more than one remote ({remotes}), so the push target is ambiguous',

  'error.commit-clean': 'There is nothing to commit',
  'error.commit-conflict': 'Unresolved conflicts remain; resolve them before committing',
  'error.commit-identity': 'Git has no author identity configured, so it refused the commit',
  'error.commit-denied': 'The current permission mode does not allow committing: it needs to write the workspace',

  'error.no-llm': 'The model service is unavailable, so no commit message can be written',
  'error.no-model': 'No default model is configured, so no commit message can be written',
  'error.model-timeout': 'The model did not answer in time',
  'error.model-truncated': 'The model used its whole output budget on reasoning before writing the message; try again, or lower the default reasoning effort',
  'error.empty-message': 'The model returned no commit message',
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

  'fallback.status': '读取仓库状态失败',
  'fallback.log': '读取提交历史失败',
  'fallback.diff': '读取 Diff 失败',
  'fallback.branches': '读取分支列表失败',
  'fallback.message': '生成提交信息失败',

  'title.switchBranch': '切换到 {branch} 失败',
  'title.refresh': '刷新仓库失败',
  'title.fetch': '获取远端更新失败',
  'title.mergeFrom': '合并 {branch} 失败',
  'title.pull': '拉取失败',
  'title.push': '推送失败',
  'title.publish': '发布分支失败',
  'title.commit': '提交失败',
  'title.diff': '读取 Diff 失败',
  'title.branches': '读取分支列表失败',
  'title.branchCreate': '创建分支失败',
  'title.branchDelete': '删除分支失败',
  'title.message': '生成提交信息失败',

  'dialog.close': '关闭',
  'dialog.ok': '知道了',

  'head.currentBranch': '当前分支',
  'head.detached': '游离',
  'head.more': '更多',
  // The menu's rows keep their English names in both locales: each one is what
  // its Git command is called, and a translated row would name something the
  // reader cannot match to `git fetch` or `git merge`. The control that opens
  // the menu is not one of them — it is a row of the page's own, so `head.more`
  // stays translated.
  'head.refresh': 'Refresh',
  'head.fetch': 'Fetch',
  'head.mergeFrom': 'Merge from…',
  'head.branchCreate': 'Branch create…',
  'head.branchDelete': 'Branch delete…',

  'remote.publish': '发布分支',
  'remote.sync': '同步变更 · 待拉取 {behind} · 待推送 {ahead}',

  'pane.files': '文件变更',
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
  'hint.commit-identity': '请先配置一次：git config --global user.name "你的名字"、git config --global user.email "你的邮箱"；去掉 --global 则只对当前仓库生效',

  'list.notRepo': '当前会话目录不是 Git 仓库',
  'list.statusFailed': '读取仓库状态失败',
  'list.loading': '正在读取仓库…',

  'stage.staged': '已暂存',
  'stage.unstaged': '未暂存',

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

  'error.not-ready': '会话尚未就绪，请稍后重试',
  'error.no-workdir': '无法确定该会话的工作目录',
  'error.no-shell': 'shell 服务不可用，无法执行 Git 命令',
  'error.missing-path': '缺少文件路径',
  'error.bad-hash': '提交标识不合法',
  'error.missing-message': '缺少提交信息',
  'error.missing-branch': '缺少分支名',
  'error.missing-name': '缺少要创建的分支名',

  'error.git-denied': '当前权限模式不允许执行 Git 命令',
  'error.git-exit': 'git 退出码 {code}',
  'error.no-root': 'git 未返回仓库根目录',
  'error.no-commits': '该仓库还没有任何提交',
  'error.unparsable-commit': '无法解析该提交',

  'error.unknown-branch': '分支不存在：{name}',
  'error.remote-local-name': '无法从远程分支推导本地分支名：{name}',
  'error.checkout-denied': '当前权限模式不允许切换分支：该操作需要写入工作区',
  'error.checkout-dirty': '有未提交的改动会被覆盖，请先提交或暂存后再切换',
  'error.checkout-dirty-paths': '有未提交的改动会被覆盖（{paths}），请先提交或暂存后再切换',

  'error.branch-exists': '分支 {branch} 已存在',
  'error.create-denied': '当前权限模式不允许创建分支：该操作需要写入工作区',
  'error.delete-denied': '当前权限模式不允许删除分支：该操作需要写入工作区',
  'error.branch-not-merged': '分支 {branch} 尚未完全合并，Git 拒绝删除；请先合并或推送',
  'error.branch-in-use': '分支 {branch} 已在某个工作区中被检出，Git 无法删除',
  'error.unknown-remote': '不存在该远端：{remote}',

  'error.merge-denied': '当前权限模式不允许合并：该操作需要写入工作区',
  'error.merge-dirty': '存在未提交的改动，请先提交或暂存后再合并',
  'error.merge-conflict': '与 {branch} 的合并存在冲突，已中止；请手动合并以解决冲突',
  'error.merge-same-branch': '无法将 {branch} 合并到它自己',
  'error.merge-detached': 'HEAD 处于游离状态，没有可合并的分支',
  'error.merge-no-commits': '当前分支还没有任何提交，无法合并',

  'error.pull-no-commits': '当前分支还没有任何提交，无法 Pull',
  'error.push-no-commits': '当前分支还没有任何提交，无法 Push',
  'error.pull-detached': 'HEAD 处于游离状态，没有可拉取的分支',
  'error.push-detached': 'HEAD 处于游离状态，没有可推送的分支',
  'error.pull-no-upstream': '分支 {branch} 没有上游分支，无法 Pull',
  'error.pull-denied': '当前权限模式不允许 Pull：该操作需要写入工作区',
  'error.push-denied': '当前权限模式不允许 Push：该操作需要写入工作区',
  'error.fetch-denied': '当前权限模式不允许 Fetch：该操作需要写入工作区',
  'error.pull-dirty': '有未提交的改动会被覆盖，请先提交或暂存后再 Pull',
  'error.push-dirty': '有未提交的改动会被覆盖，请先提交或暂存后再 Push',
  'error.auth': '远程认证失败：请先在该仓库配置好凭据（本插件不弹出任何凭据输入）',
  'error.auth-helper': '远程认证失败：Git 的凭据助手没能在当前权限沙箱内启动，也没有读到可用的已保存凭据（本插件不弹出凭据输入）。请先用 Git 凭据管理器登录一次，或改用完全访问模式、在该会话之外执行 Pull/Push',
  'error.pull-diverged': '本地与远程已经分叉，本插件只做快进式拉取：请先合并或变基',
  'error.push-behind': '远程在同步过程中又有了新提交，请再同步一次',
  'error.push-no-remote': '该仓库没有配置远程仓库，无法 Push',
  'error.push-ambiguous-remote': '有多个远程仓库（{remotes}），无法确定推送目标',

  'error.commit-clean': '工作区没有需要提交的改动',
  'error.commit-conflict': '存在未解决的冲突文件，请先解决冲突再提交',
  'error.commit-identity': 'Git 还没有配置提交身份，无法提交',
  'error.commit-denied': '当前权限模式不允许提交：该操作需要写入工作区',

  'error.no-llm': '模型服务不可用，无法生成提交信息',
  'error.no-model': '未配置默认模型，无法生成提交信息',
  'error.model-timeout': '模型未在限定时间内返回结果',
  'error.model-truncated': '模型在写出提交信息前就把输出预算用在了思考上，请重试或降低默认推理强度',
  'error.empty-message': '模型未返回提交信息',
}
