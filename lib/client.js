window.__ModuleLoader__.load({
	id: "dsh-cool-git",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_dom = require("react-dom");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/client/locales.ts
		/** The dictionary namespace this page owns. */
		const NS = "coolGit";
		/** The English copy, which is also the fallback every lookup ends at. */
		const en = {
			"view.git": "Git",
			"kind.added": "Added",
			"kind.modified": "Modified",
			"kind.deleted": "Deleted",
			"kind.renamed": "Renamed",
			"kind.copied": "Copied",
			"kind.typeChange": "Type changed",
			"kind.untracked": "Untracked",
			"kind.conflicted": "Conflicted",
			"kind.unknown": "Unknown",
			"time.now": "just now",
			"time.minutes": "{count} min ago",
			"time.hours": "{count} h ago",
			"time.days": "{count} d ago",
			"error.line": "{label}: {reason}",
			"fallback.unknown": "Unknown error",
			"fallback.fileGone": "This file is no longer in the change list",
			"label.status": "Reading repository status",
			"label.log": "Reading commit history",
			"label.commit": "Reading the commit",
			"label.diff": "Reading the file diff",
			"label.message": "Generating the commit message",
			"label.settings": "Saving settings",
			"label.settingsRead": "Reading settings",
			"fallback.status": "Could not read the repository status",
			"fallback.log": "Could not read the commit history",
			"fallback.diff": "Could not read the diff",
			"fallback.branches": "Could not read the branch list",
			"fallback.message": "Could not generate a commit message",
			"fallback.settings": "Could not save the settings",
			"fallback.settingsRead": "Could not read the settings",
			"title.switchBranch": "Could not switch to {branch}",
			"title.refresh": "Refresh failed",
			"title.fetch": "Fetch failed",
			"title.mergeFrom": "Could not merge {branch} in",
			"title.pull": "Pull failed",
			"title.push": "Push failed",
			"title.publish": "Publish failed",
			"title.commit": "Commit failed",
			"title.undoCommit": "Undo commit failed",
			"title.stage": "Could not stage the file",
			"title.unstage": "Could not unstage the file",
			"title.stageFolder": "Could not stage the folder",
			"title.unstageFolder": "Could not unstage the folder",
			"title.stageAll": "Could not stage every change",
			"title.unstageAll": "Could not unstage every change",
			"title.discardAll": "Could not discard every change",
			"title.discard": "Could not discard the changes",
			"title.diff": "Could not read the diff",
			"title.branches": "Could not read the branch list",
			"title.branchCreate": "Could not create the branch",
			"title.branchDelete": "Could not delete every branch",
			"title.message": "Could not generate a commit message",
			"title.settings": "Could not save the settings",
			"title.settingsRead": "Could not read the settings",
			"title.resolve": "Could not resolve the conflict",
			"title.resolveDone": "Could not mark the file resolved",
			"title.completeMerge": "Could not finish the merge",
			"dialog.close": "Close",
			"dialog.ok": "Got it",
			"head.currentBranch": "Current branch",
			"head.detached": "detached",
			"head.more": "More",
			"head.refresh": "Refresh (local)",
			"head.fetch": "Fetch (remotes)",
			"head.pull": "Pull",
			"head.push": "Push",
			"head.mergeFrom": "Merge from",
			"head.branchCreate": "Branch create",
			"head.branchDelete": "Branch delete",
			"head.undoCommit": "Undo Last Commit",
			"head.settings": "Settings",
			"settings.title": "Settings",
			"settings.description": "Set the message generation model and prompt",
			"settings.model": "Message generation model",
			"settings.modelDefaultUnknown": "DSH default model",
			"settings.modelEmpty": "No models are available",
			"settings.modelUnavailable": "{model} (unavailable)",
			"settings.modelSearch": "Search models",
			"settings.searchEmpty": "No model matches the search",
			"settings.effort": "Reasoning effort",
			"settings.effortReadFailed": "Could not read the effort list",
			"settings.prompt": "Message generation prompt",
			"settings.promptHint": "Each Workspace has its own prompt. Leave the field empty to use the built-in prompt.",
			"settings.promptReset": "Restore default",
			"settings.loading": "Loading…",
			"settings.cancel": "Cancel",
			"settings.save": "Save",
			"settings.saving": "Saving…",
			"remote.publish": "Publish branch",
			"remote.sync": "Sync · {behind} to pull · {ahead} to push",
			"pane.history": "Commit history",
			"branch.title": "Switch branch",
			"branch.description": "Choose a branch to switch to",
			"branch.cancel": "Cancel",
			"branch.confirm": "Switch",
			"branch.search": "Search branches",
			"branch.list": "Branches",
			"branch.current": "Current branch",
			"branch.local": "Local branches",
			"branch.remote": "Remote branches",
			"branch.notRepo": "This session's directory is not a Git repository",
			"branch.none": "No branches to switch to",
			"branch.loading": "Reading branches…",
			"branch.noMatch": "No matching branches",
			"branch.truncated": "Too many branches; only the most recent are listed",
			"merge.titleFrom": "Merge branch",
			"merge.descriptionFrom": "Merge the selected branch into the current branch",
			"merge.confirm": "Merge",
			"merge.noneFrom": "No other branch to merge in",
			"create.title": "Create branch",
			"create.description": "Choose a starting point and enter a new branch name",
			"create.name": "New branch name",
			"create.confirm": "Create",
			"create.none": "No branch to start from",
			"delete.title": "Delete branches",
			"delete.description": "Choose the branches to delete",
			"delete.list": "Branches to delete",
			"delete.confirm": "Delete",
			"delete.confirmCount": "Delete {count}",
			"delete.busy": "Deleting…",
			"delete.none": "No branches to delete",
			"safety.unmerged": "It is not merged into the current branch and has no upstream, so Git will refuse to delete it",
			"safety.unpushed": "It has commits that have not been pushed, so Git will refuse to delete it",
			"safety.gone": "The remote branch it tracked is gone, so Git will refuse to delete it",
			"commit.placeholder": "Commit Message",
			"commit.button": "Commit",
			"commit.busy": "Commit…",
			"commit.generate": "Generate a commit message",
			"commit.generating": "Generating…",
			"commit.warning": "Before you commit: {text}",
			"commit.scopeStaged": "Commit Staged",
			"commit.scopeAll": "Commit All",
			"commit.buttonStaged": "Commit Staged",
			"commit.buttonAll": "Commit All",
			"hint.commit-identity": "Set it once with git config --global user.name \"Your Name\" and git config --global user.email \"you@example.com\"; drop --global to set it for this repository only",
			"list.notRepo": "This session's directory is not a Git repository",
			"list.statusFailed": "Could not read the repository status",
			"list.loading": "Reading the repository…",
			"stage.staged": "Staged changes",
			"stage.unstaged": "Changes",
			"stage.conflict": "Conflicts",
			"stage.stage": "Stage changes",
			"stage.unstage": "Unstage",
			"stage.stageFile": "Stage {path}",
			"stage.unstageFile": "Unstage {path}",
			"stage.markResolved": "Mark resolved",
			"stage.markResolvedFile": "Mark {path} resolved",
			"stage.markAllResolved": "Mark all resolved",
			"stage.discard": "Discard changes",
			"stage.discardFile": "Discard changes in {path}",
			"stage.stageFolder": "Stage changes under {path}",
			"stage.unstageFolder": "Unstage changes under {path}",
			"stage.discardFolder": "Discard changes under {path}",
			"stage.stageAll": "Stage all changes",
			"stage.unstageAll": "Unstage all changes",
			"stage.discardAll": "Discard all changes",
			"discard.title": "Discard changes",
			"discard.description": "This cannot be undone.",
			"discard.tracked": "Discard the unstaged changes in {path}?",
			"discard.untracked": "Delete the untracked file {path}?",
			"discard.folder": "Discard the unstaged changes under {path}? Files affected: {count}.",
			"discard.folderUntracked": "Discard the unstaged changes under {path}? Files affected: {count}. Untracked files will be deleted.",
			"discard.all": "Discard all unstaged changes? Files affected: {count}.",
			"discard.allUntracked": "Discard all unstaged changes? Files affected: {count}. Untracked files will be deleted.",
			"discard.confirm": "Discard changes",
			"discard.delete": "Delete file",
			"discard.cancel": "Cancel",
			"tree.folderLabel": "Changed files in {name}",
			"history.failed": "Could not read the commit history",
			"history.loading": "Reading the commit history…",
			"history.empty": "No commits yet",
			"commit.noMessage": "(no commit message)",
			"commit.merge": "Merge",
			"diff.pane": "Diff",
			"diff.notRepo": "This session's directory is not a Git repository",
			"diff.repoFailed": "Could not read the repository",
			"diff.emptyHint": "Select a file or a commit on the left to see its diff here",
			"diff.loading": "Reading the diff…",
			"diff.failed": "Could not read the diff",
			"diff.noTextTitle": "No textual diff to show",
			"diff.noTextUntracked": "This is a new untracked file, so its content is that of an empty file",
			"diff.noTextOther": "This file's changes have no textual diff (a binary file, or a mode-only change)",
			"diff.mergeNote": "Merge commit: the diff below compares against the first parent.",
			"diff.hiddenRows": "{count} more lines are not rendered (the diff is too large).",
			"diff.truncated": "The diff exceeded the read limit and was truncated.",
			"diff.copy": "Copy diff",
			"diff.copied": "Copied",
			"diff.expand": "Expand this file's diff",
			"diff.collapse": "Collapse this file's diff",
			"operation.rebase": "Rebase",
			"operation.cherryPick": "Cherry-pick",
			"commit.finishMerge": "Finish merge",
			"commit.operationBlocked": "{operation} in progress: finish or abort it in a terminal first",
			"conflict.block": "Conflict {index} / {total}",
			"conflict.current": "Current",
			"conflict.incoming": "Incoming",
			"conflict.base": "Base",
			"conflict.takeOurs": "Take current",
			"conflict.takeTheirs": "Take incoming",
			"conflict.takeBoth": "Keep both",
			"conflict.takeBase": "Take base",
			"conflict.takeAllOurs": "Take current everywhere",
			"conflict.takeAllTheirs": "Take incoming everywhere",
			"conflict.noLines": "no lines",
			"conflict.binaryTitle": "This conflict has no text to choose between",
			"conflict.binaryText": "The file is binary (or too large to read as text), so it has to be settled as a whole. Pick the version to keep.",
			"conflict.missingTitle": "One side of this file was deleted",
			"conflict.missingText": "There is nothing to choose between line by line: one side removed this file. Pick the side whose version — or absence — you want to keep.",
			"conflict.keepOurs": "Keep current version",
			"conflict.keepTheirs": "Keep incoming version",
			"conflict.keepOursGone": "Keep the deletion (current)",
			"conflict.keepTheirsGone": "Keep the deletion (incoming)",
			"conflict.cleanTitle": "No conflict markers left",
			"conflict.cleanText": "The file has no conflict blocks. When it reads the way you want, tick the check at the end of its row to mark it resolved.",
			"conflict.showContext": "Show {count} unchanged lines",
			"conflict.hideContext": "Hide {count} unchanged lines",
			"update.published": "New version {version} is available",
			"update.upgrade": "Update now",
			"update.confirm": "Install {version}?",
			"update.confirmLink": "Install {version} from npm instead of the local checkout?",
			"update.confirmYes": "Install",
			"update.cancel": "Cancel",
			"update.applying": "Updating…",
			"update.done": "Updated to {version}",
			"update.restart": "Installed {version}; restart DSH to use it",
			"update.failed": "Update failed",
			"update.unavailable": "Could not read the published version",
			"update.retry": "Retry",
			"update.npm": "npm package page",
			"update.github": "GitHub repository",
			"error.not-ready": "The session is not ready yet; try again in a moment",
			"error.no-workdir": "Could not determine the session's working directory",
			"error.no-subprocess": "The subprocess service is unavailable, so Git cannot run",
			"error.missing-path": "Missing file path",
			"error.bad-hash": "Invalid commit id",
			"error.missing-message": "Missing commit message",
			"error.missing-branch": "Missing branch name",
			"error.missing-name": "Missing branch name to create",
			"error.git-exit": "git exited with code {code}",
			"error.no-root": "git returned no repository root",
			"error.no-commits": "This repository has no commits yet",
			"error.unparsable-commit": "Could not parse that commit",
			"error.unknown-branch": "No such branch: {name}",
			"error.remote-local-name": "Could not derive a local branch name from the remote branch: {name}",
			"error.checkout-dirty": "Uncommitted changes would be overwritten; commit or stash them before switching",
			"error.checkout-dirty-paths": "Uncommitted changes to {paths} would be overwritten; commit or stash them before switching",
			"error.branch-exists": "The branch {branch} already exists",
			"error.branch-not-merged": "Branch {branch} is not fully merged, so Git refused to delete it; merge or push it first",
			"error.branch-in-use": "Branch {branch} is checked out in a worktree, so Git cannot delete it",
			"error.unknown-remote": "No such remote: {remote}",
			"error.merge-dirty": "Uncommitted changes are in the way; commit or stash them before merging",
			"error.merge-conflict": "Merging {branch} conflicts: the merge is left in the working tree, resolve it in the Conflicts list",
			"error.merge-same-branch": "Cannot merge {branch} into itself",
			"error.merge-detached": "HEAD is detached, so there is no branch to merge",
			"error.merge-no-commits": "This branch has no commits yet, so there is nothing to merge",
			"error.not-conflicted": "{path} is no longer conflicted: nothing to resolve",
			"error.stale-conflict": "{path} changed since it was read, so nothing was written; the pane was re-read",
			"error.resolve-unsafe": "{path} is not a file this plugin may write; resolve it in a terminal",
			"error.bad-choice": "That choice does not apply to this conflict",
			"error.no-operation": "No merge is in progress, so there is nothing to finish",
			"error.complete-conflict": "Some conflicts are still unresolved; resolve and stage every path first",
			"error.pull-no-commits": "This branch has no commits yet, so there is nothing to pull",
			"error.push-no-commits": "This branch has no commits yet, so there is nothing to push",
			"error.pull-detached": "HEAD is detached, so there is no branch to pull",
			"error.push-detached": "HEAD is detached, so there is no branch to push",
			"error.pull-no-upstream": "Branch {branch} has no upstream, so it cannot be pulled",
			"error.pull-dirty": "Uncommitted changes would be overwritten; commit or stash them before pulling",
			"error.push-dirty": "Uncommitted changes would be overwritten; commit or stash them before pushing",
			"error.auth": "Remote authentication failed: configure credentials for this repository first (this plugin never prompts for them)",
			"error.pull-diverged": "Git refused to merge the remote history automatically: this repository's configuration forbids non-fast-forward merges (check pull.ff and merge.ff)",
			"error.pull-conflict": "Pulling {branch} conflicts: the merge is left in the working tree, resolve it in the Conflicts list",
			"error.push-behind": "The remote gained new commits during the sync; sync once more",
			"error.push-no-remote": "This repository has no remote configured, so it cannot be pushed",
			"error.push-ambiguous-remote": "There is more than one remote ({remotes}), so the push target is ambiguous",
			"error.commit-clean": "There is nothing to commit",
			"error.commit-nothing-staged": "Nothing is staged to commit",
			"error.commit-conflict": "Unresolved conflicts remain; resolve them before committing",
			"error.commit-identity": "Git has no author identity configured, so it refused the commit",
			"error.commit-undo-root": "The commit at HEAD is this repository's first commit, so there is no earlier commit to step back to",
			"error.commit-undo-operation": "A merge, rebase, or cherry-pick is in progress; finish or abort it before undoing a commit",
			"error.no-llm": "The model service is unavailable, so no commit message can be written",
			"error.no-model": "No default model is configured, so no commit message can be written",
			"error.model-timeout": "The model did not answer in time",
			"error.model-truncated": "The model used its whole output budget on reasoning before writing the message; try again, or lower the default reasoning effort",
			"error.empty-message": "The model returned no commit message",
			"error.no-plugin-manager": "The plugin manager is unavailable, so this bundle cannot be installed from here",
			"error.bad-version": "That version cannot be installed"
		};
		/** The Chinese copy, key for key the same page. */
		const zh = {
			"view.git": "Git",
			"kind.added": "新增",
			"kind.modified": "修改",
			"kind.deleted": "删除",
			"kind.renamed": "重命名",
			"kind.copied": "复制",
			"kind.typeChange": "类型变更",
			"kind.untracked": "未跟踪",
			"kind.conflicted": "冲突",
			"kind.unknown": "未知状态",
			"time.now": "刚刚",
			"time.minutes": "{count} 分钟前",
			"time.hours": "{count} 小时前",
			"time.days": "{count} 天前",
			"error.line": "{label}：{reason}",
			"fallback.unknown": "未知错误",
			"fallback.fileGone": "该文件已不在变更列表中",
			"label.status": "读取仓库状态",
			"label.log": "读取提交历史",
			"label.commit": "读取提交",
			"label.diff": "读取文件差异",
			"label.message": "生成提交信息",
			"label.settings": "保存设置",
			"label.settingsRead": "读取设置",
			"fallback.status": "读取仓库状态失败",
			"fallback.log": "读取提交历史失败",
			"fallback.diff": "读取 Diff 失败",
			"fallback.branches": "读取分支列表失败",
			"fallback.message": "生成提交信息失败",
			"fallback.settings": "保存设置失败",
			"fallback.settingsRead": "读取设置失败",
			"title.switchBranch": "切换到 {branch} 失败",
			"title.refresh": "刷新仓库失败",
			"title.fetch": "获取远端更新失败",
			"title.mergeFrom": "合并 {branch} 失败",
			"title.pull": "拉取失败",
			"title.push": "推送失败",
			"title.publish": "发布分支失败",
			"title.commit": "提交失败",
			"title.undoCommit": "撤销提交失败",
			"title.stage": "暂存文件失败",
			"title.unstage": "取消暂存失败",
			"title.stageFolder": "暂存文件夹失败",
			"title.unstageFolder": "取消暂存文件夹失败",
			"title.stageAll": "暂存全部更改失败",
			"title.unstageAll": "取消暂存全部更改失败",
			"title.discardAll": "放弃全部更改失败",
			"title.discard": "放弃变更失败",
			"title.diff": "读取 Diff 失败",
			"title.branches": "读取分支列表失败",
			"title.branchCreate": "创建分支失败",
			"title.branchDelete": "删除分支失败",
			"title.message": "生成提交信息失败",
			"title.settings": "保存设置失败",
			"title.settingsRead": "读取设置失败",
			"title.resolve": "解决冲突失败",
			"title.resolveDone": "标记冲突已解决失败",
			"title.completeMerge": "完成合并失败",
			"dialog.close": "关闭",
			"dialog.ok": "知道了",
			"head.currentBranch": "当前分支",
			"head.detached": "游离",
			"head.more": "更多",
			"head.refresh": "刷新（本地）",
			"head.fetch": "获取（远端）",
			"head.pull": "拉取",
			"head.push": "推送",
			"head.mergeFrom": "合并分支",
			"head.branchCreate": "创建分支",
			"head.branchDelete": "删除分支",
			"head.undoCommit": "撤销最后一次提交",
			"head.settings": "设置",
			"settings.title": "设置",
			"settings.description": "设置生成模型和提示词",
			"settings.model": "Message 生成模型",
			"settings.modelDefaultUnknown": "DSH 默认模型",
			"settings.modelEmpty": "没有可用的模型",
			"settings.modelUnavailable": "{model}（不可用）",
			"settings.modelSearch": "搜索模型",
			"settings.searchEmpty": "没有匹配的模型",
			"settings.effort": "思考强度",
			"settings.effortReadFailed": "读取思考强度失败",
			"settings.prompt": "Message 生成提示词",
			"settings.promptHint": "每个工作区单独保存提示词，留空则使用内置提示词。",
			"settings.promptReset": "恢复默认",
			"settings.loading": "加载中…",
			"settings.cancel": "取消",
			"settings.save": "保存",
			"settings.saving": "保存中…",
			"remote.publish": "发布分支",
			"remote.sync": "同步变更 · 待拉取 {behind} · 待推送 {ahead}",
			"pane.history": "提交历史",
			"branch.title": "切换分支",
			"branch.description": "选择并切换至指定分支",
			"branch.cancel": "取消",
			"branch.confirm": "切换",
			"branch.search": "搜索分支",
			"branch.list": "分支",
			"branch.current": "当前分支",
			"branch.local": "本地分支",
			"branch.remote": "远程分支",
			"branch.notRepo": "当前会话目录不是 Git 仓库",
			"branch.none": "没有可切换的分支",
			"branch.loading": "正在读取分支…",
			"branch.noMatch": "没有匹配的分支",
			"branch.truncated": "分支过多，仅显示最近的部分分支",
			"merge.titleFrom": "合并分支",
			"merge.descriptionFrom": "将选中分支合并到当前分支",
			"merge.confirm": "合并",
			"merge.noneFrom": "没有可合并的其它分支",
			"create.title": "创建分支",
			"create.description": "选择分支起点，并输入新的分支名",
			"create.name": "新分支名",
			"create.confirm": "创建",
			"create.none": "没有可作为起点的分支",
			"delete.title": "删除分支",
			"delete.description": "选择要删除的分支",
			"delete.list": "待删除的分支",
			"delete.confirm": "删除",
			"delete.confirmCount": "删除 {count} 个",
			"delete.busy": "正在删除…",
			"delete.none": "没有可删除的分支",
			"safety.unmerged": "它未合并到当前分支，也没有上游分支，Git 会拒绝删除",
			"safety.unpushed": "它有尚未推送到远端的提交，Git 会拒绝删除",
			"safety.gone": "它跟踪的远程分支已消失，Git 会拒绝删除",
			"commit.placeholder": "Commit Message",
			"commit.button": "Commit",
			"commit.busy": "Commit…",
			"commit.generate": "自动生成提交信息",
			"commit.generating": "正在生成…",
			"commit.warning": "提交前请检查：{text}",
			"commit.scopeStaged": "提交暂存的更改",
			"commit.scopeAll": "提交全部更改",
			"commit.buttonStaged": "提交暂存的更改",
			"commit.buttonAll": "提交全部更改",
			"hint.commit-identity": "请先配置一次：git config --global user.name \"你的名字\"、git config --global user.email \"你的邮箱\"；去掉 --global 则只对当前仓库生效",
			"list.notRepo": "当前会话目录不是 Git 仓库",
			"list.statusFailed": "读取仓库状态失败",
			"list.loading": "正在读取仓库…",
			"stage.staged": "暂存的变更",
			"stage.unstaged": "变更",
			"stage.conflict": "冲突",
			"stage.stage": "暂存变更",
			"stage.unstage": "取消暂存",
			"stage.stageFile": "暂存 {path}",
			"stage.unstageFile": "取消暂存 {path}",
			"stage.markResolved": "标记为已解决",
			"stage.markResolvedFile": "标记 {path} 为已解决",
			"stage.markAllResolved": "全部标记为已解决",
			"stage.discard": "放弃变更",
			"stage.discardFile": "放弃 {path} 的变更",
			"stage.stageFolder": "暂存 {path} 下的变更",
			"stage.unstageFolder": "取消暂存 {path} 下的变更",
			"stage.discardFolder": "放弃 {path} 下的变更",
			"stage.stageAll": "暂存全部更改",
			"stage.unstageAll": "取消暂存全部更改",
			"stage.discardAll": "放弃全部更改",
			"discard.title": "放弃变更",
			"discard.description": "此操作无法撤销。",
			"discard.tracked": "放弃 {path} 的未暂存更改？",
			"discard.untracked": "删除未跟踪文件 {path}？",
			"discard.folder": "放弃 {path} 下的未暂存更改？涉及 {count} 个文件。",
			"discard.folderUntracked": "放弃 {path} 下的未暂存更改？涉及 {count} 个文件。未跟踪文件会被删除。",
			"discard.all": "放弃全部未暂存更改？涉及 {count} 个文件。",
			"discard.allUntracked": "放弃全部未暂存更改？涉及 {count} 个文件。未跟踪文件会被删除。",
			"discard.confirm": "放弃变更",
			"discard.delete": "删除文件",
			"discard.cancel": "取消",
			"tree.folderLabel": "{name} 中的变更文件",
			"history.failed": "读取提交历史失败",
			"history.loading": "正在读取提交历史…",
			"history.empty": "还没有任何提交",
			"commit.noMessage": "（无提交信息）",
			"commit.merge": "合并",
			"diff.pane": "Diff 查看区",
			"diff.notRepo": "当前会话目录不是 Git 仓库",
			"diff.repoFailed": "无法读取仓库",
			"diff.emptyHint": "点击左侧文件或提交，在此查看 Diff",
			"diff.loading": "正在读取 Diff…",
			"diff.failed": "无法读取 Diff",
			"diff.noTextTitle": "没有可显示的文本差异",
			"diff.noTextUntracked": "这是一个未跟踪的新文件，内容与空文件相同",
			"diff.noTextOther": "该文件当前的改动没有文本差异（可能是二进制文件或仅权限变更）",
			"diff.mergeNote": "合并提交：以下差异是与第一个父提交的比较结果。",
			"diff.hiddenRows": "还有 {count} 行未渲染（差异过大）。",
			"diff.truncated": "Diff 超出读取上限，内容已被截断。",
			"diff.copy": "复制 Diff",
			"diff.copied": "已复制",
			"diff.expand": "展开此文件的差异",
			"diff.collapse": "折叠此文件的差异",
			"operation.rebase": "变基",
			"operation.cherryPick": "拣选",
			"commit.finishMerge": "完成合并",
			"commit.operationBlocked": "{operation}进行中：请先在终端完成或中止",
			"conflict.block": "冲突 {index} / {total}",
			"conflict.current": "当前",
			"conflict.incoming": "传入",
			"conflict.base": "共同祖先",
			"conflict.takeOurs": "采用当前",
			"conflict.takeTheirs": "采用传入",
			"conflict.takeBoth": "保留两者",
			"conflict.takeBase": "采用共同祖先",
			"conflict.takeAllOurs": "全部采用当前",
			"conflict.takeAllTheirs": "全部采用传入",
			"conflict.noLines": "无内容",
			"conflict.binaryTitle": "该冲突没有可逐块选择的文本",
			"conflict.binaryText": "这是二进制文件（或过大无法按文本读取），只能整体取舍：请选择要保留的版本。",
			"conflict.missingTitle": "该文件在某一侧已被删除",
			"conflict.missingText": "这里没有可逐行选择的冲突块：某一侧删除该文件。请选择要保留哪一侧的版本（或保留删除）。",
			"conflict.keepOurs": "保留当前版本",
			"conflict.keepTheirs": "保留传入版本",
			"conflict.keepOursGone": "保留删除（当前侧已删除）",
			"conflict.keepTheirsGone": "保留删除（传入侧已删除）",
			"conflict.cleanTitle": "文件中已无冲突标记",
			"conflict.cleanText": "该文件已没有冲突块。确认内容无误后，点该文件行末的 ✓ 标记为已解决。",
			"conflict.showContext": "展开 {count} 行未修改内容",
			"conflict.hideContext": "收起 {count} 行未修改内容",
			"update.published": "新版本 {version} 已发布",
			"update.upgrade": "立即升级",
			"update.confirm": "安装 {version}？",
			"update.confirmLink": "改为从 npm 安装 {version}？",
			"update.confirmYes": "安装",
			"update.cancel": "取消",
			"update.applying": "正在升级…",
			"update.done": "已升级到 {version}",
			"update.restart": "已安装 {version}，重启 DSH 后生效",
			"update.failed": "升级失败",
			"update.unavailable": "无法获取已发布的版本",
			"update.retry": "重试",
			"update.npm": "npm 页面",
			"update.github": "GitHub 仓库",
			"error.not-ready": "会话尚未就绪，请稍后重试",
			"error.no-workdir": "无法确定该会话的工作目录",
			"error.no-subprocess": "subprocess 服务不可用，无法执行 Git 命令",
			"error.missing-path": "缺少文件路径",
			"error.bad-hash": "提交标识不合法",
			"error.missing-message": "缺少提交信息",
			"error.missing-branch": "缺少分支名",
			"error.missing-name": "缺少要创建的分支名",
			"error.git-exit": "git 退出码 {code}",
			"error.no-root": "git 未返回仓库根目录",
			"error.no-commits": "该仓库还没有任何提交",
			"error.unparsable-commit": "无法解析该提交",
			"error.unknown-branch": "分支不存在：{name}",
			"error.remote-local-name": "无法从远程分支推导本地分支名：{name}",
			"error.checkout-dirty": "有未提交的改动会被覆盖，请先提交或暂存后再切换",
			"error.checkout-dirty-paths": "有未提交的改动会被覆盖（{paths}），请先提交或暂存后再切换",
			"error.branch-exists": "分支 {branch} 已存在",
			"error.branch-not-merged": "分支 {branch} 尚未完全合并，Git 拒绝删除；请先合并或推送",
			"error.branch-in-use": "分支 {branch} 已在某个工作区中被检出，Git 无法删除",
			"error.unknown-remote": "不存在该远端：{remote}",
			"error.merge-dirty": "存在未提交的改动，请先提交或暂存后再合并",
			"error.merge-conflict": "与 {branch} 的合并存在冲突：合并已保留在工作区，请在「冲突」列表中解决",
			"error.merge-same-branch": "无法将 {branch} 合并到它自己",
			"error.merge-detached": "HEAD 处于游离状态，没有可合并的分支",
			"error.merge-no-commits": "当前分支还没有任何提交，无法合并",
			"error.not-conflicted": "{path} 已不再是冲突文件，无需解决",
			"error.stale-conflict": "{path} 在被读取后已被修改，因此没有写入；面板已重新读取",
			"error.resolve-unsafe": "{path} 不是本插件可以写入的文件，请在终端中解决",
			"error.bad-choice": "该选择不适用于这个冲突",
			"error.no-operation": "当前没有进行中的合并，没有可以完成的操作",
			"error.complete-conflict": "仍有未解决的冲突，请先解决并暂存所有冲突文件",
			"error.pull-no-commits": "当前分支还没有任何提交，无法 Pull",
			"error.push-no-commits": "当前分支还没有任何提交，无法 Push",
			"error.pull-detached": "HEAD 处于游离状态，没有可拉取的分支",
			"error.push-detached": "HEAD 处于游离状态，没有可推送的分支",
			"error.pull-no-upstream": "分支 {branch} 没有上游分支，无法 Pull",
			"error.pull-dirty": "有未提交的改动会被覆盖，请先提交或暂存后再 Pull",
			"error.push-dirty": "有未提交的改动会被覆盖，请先提交或暂存后再 Push",
			"error.auth": "远程认证失败：请先在该仓库配置好凭据（本插件不弹出任何凭据输入）",
			"error.pull-diverged": "Git 拒绝自动合并远程历史：该仓库的配置禁止非快进式合并（请检查 pull.ff 与 merge.ff）",
			"error.pull-conflict": "拉取 {branch} 时产生冲突：合并已保留在工作区，请在「冲突」列表中解决",
			"error.push-behind": "远程在同步过程中又有了新提交，请再同步一次",
			"error.push-no-remote": "该仓库没有配置远程仓库，无法 Push",
			"error.push-ambiguous-remote": "有多个远程仓库（{remotes}），无法确定推送目标",
			"error.commit-clean": "工作区没有需要提交的改动",
			"error.commit-nothing-staged": "暂存区没有需要提交的改动",
			"error.commit-conflict": "存在未解决的冲突文件，请先解决冲突再提交",
			"error.commit-identity": "Git 还没有配置提交身份，无法提交",
			"error.commit-undo-root": "当前提交是该仓库的首次提交，没有更早的提交可以回退",
			"error.commit-undo-operation": "当前有进行中的合并、变基或拣选操作，请先完成或中止后再撤销提交",
			"error.no-llm": "模型服务不可用，无法生成提交信息",
			"error.no-model": "未配置默认模型，无法生成提交信息",
			"error.model-timeout": "模型未在限定时间内返回结果",
			"error.model-truncated": "模型在写出提交信息前就把输出预算用在了思考上，请重试或降低默认推理强度",
			"error.empty-message": "模型未返回提交信息",
			"error.no-plugin-manager": "插件管理器不可用，无法从这里安装该插件",
			"error.bad-version": "该版本无法安装"
		};
		//#endregion
		//#region src/shared/contract.ts
		/**
		* Longest custom message prompt the Settings route accepts.
		*
		* The bound is the wire contract's rather than either half's: the page stops the
		* field at the same value so a paste cannot turn Save into a refusal, and the
		* Host refuses anything longer rather than writing an unbounded file.
		*/
		const MAX_PROMPT_LENGTH = 2e4;
		/**
		* Where this plugin is published and where its source lives.
		*
		* The plugin page's update row links to both: the package is what an update
		* installs, and the repository is what an issue or a changelog is read in. They
		* restate `package.json`'s `homepage` and `repository` because the browser half
		* never reads that file — the bundle carries its own constants.
		*/
		const PACKAGE_NPM_PAGE = "https://www.npmjs.com/package/dsh-cool-git";
		const PACKAGE_REPOSITORY = "https://github.com/CoolTea001/dsh-cool-git";
		/**
		* The routes both halves address, in one table.
		*
		* The browser half posts to these paths and the Host half registers them, so the
		* table lives in the shared contract rather than in either half's module: a
		* rename here reaches both halves at once instead of leaving one calling a route
		* the other no longer serves. The prefix is this package's own because an
		* out-of-tree bundle cannot claim a namespace on the shared origin any other way.
		*/
		const ROUTES = {
			status: "/dsh-cool-git/api/status",
			log: "/dsh-cool-git/api/log",
			diff: "/dsh-cool-git/api/diff",
			commit: "/dsh-cool-git/api/commit",
			commitAll: "/dsh-cool-git/api/commit-all",
			commitStaged: "/dsh-cool-git/api/commit-staged",
			undoCommit: "/dsh-cool-git/api/undo-commit",
			stage: "/dsh-cool-git/api/stage",
			unstage: "/dsh-cool-git/api/unstage",
			discard: "/dsh-cool-git/api/discard",
			stageFolder: "/dsh-cool-git/api/stage-folder",
			unstageFolder: "/dsh-cool-git/api/unstage-folder",
			discardFolder: "/dsh-cool-git/api/discard-folder",
			stageAll: "/dsh-cool-git/api/stage-all",
			unstageAll: "/dsh-cool-git/api/unstage-all",
			discardAll: "/dsh-cool-git/api/discard-all",
			message: "/dsh-cool-git/api/message",
			settings: "/dsh-cool-git/api/settings",
			settingsSave: "/dsh-cool-git/api/settings-save",
			modelEfforts: "/dsh-cool-git/api/model-efforts",
			branches: "/dsh-cool-git/api/branches",
			branchReport: "/dsh-cool-git/api/branch-report",
			branchCreate: "/dsh-cool-git/api/branch-create",
			branchDelete: "/dsh-cool-git/api/branch-delete",
			checkout: "/dsh-cool-git/api/checkout",
			merge: "/dsh-cool-git/api/merge",
			conflict: "/dsh-cool-git/api/conflict",
			resolve: "/dsh-cool-git/api/resolve",
			resolveDone: "/dsh-cool-git/api/resolve-done",
			mergeCommit: "/dsh-cool-git/api/merge-commit",
			fetch: "/dsh-cool-git/api/fetch",
			fetchUpstream: "/dsh-cool-git/api/fetch-upstream",
			pull: "/dsh-cool-git/api/pull",
			push: "/dsh-cool-git/api/push",
			update: "/dsh-cool-git/api/update",
			updateApply: "/dsh-cool-git/api/update-apply"
		};
		//#endregion
		//#region src/shared/error.ts
		/**
		* One caught value as the text a payload or a route reports.
		*
		* Both halves catch values they did not throw — a transport failure in the
		* browser, a seam, route, or adapter failure on the Host — and both state the
		* failure as text. A caught value is not necessarily an `Error`, so its message
		* is read when it has one and the value is stringified otherwise.
		*/
		/**
		* Read one caught value as text.
		*
		* @param error - the caught value.
		* @returns its message, or the value itself as a string.
		*/
		function errorMessage(error) {
			return error instanceof Error ? error.message : String(error);
		}
		//#endregion
		//#region src/client/api.ts
		/**
		* Client half of the package-private bridge to the Host routes.
		*
		* Every route answers JSON and never rejects: a transport failure becomes an
		* `{ ok: false }` result the caller reports in the error dialog, so the page has
		* exactly one failure shape to render no matter how the answer went wrong.
		*/
		/**
		* POST one JSON body and read a JSON answer.
		*
		* @param path - the route to post to, as {@link ROUTES} spells it.
		* @param body - the request body.
		* @returns the parsed payload, or an `{ ok: false }` result when the transport failed.
		*/
		async function postJson(path, body) {
			try {
				const response = await fetch(path, {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify(body),
					credentials: "same-origin"
				});
				const payload = await response.json().catch(() => null);
				if (payload === null || typeof payload !== "object") return {
					ok: false,
					error: `HTTP ${response.status}`
				};
				return payload;
			} catch (error) {
				return {
					ok: false,
					error: errorMessage(error)
				};
			}
		}
		/**
		* Ask the Host for the session's repository state and changed paths.
		*
		* @param sessionId - the session whose directory Git runs in, when known.
		* @returns the status payload.
		*/
		function fetchStatus(sessionId) {
			return postJson(ROUTES.status, { sessionId });
		}
		/**
		* Ask the Host for the newest commits.
		*
		* @param sessionId - the session whose directory Git runs in, when known.
		* @param limit - how many commits to ask for; the Host clamps it.
		* @returns the log payload.
		*/
		function fetchLog(sessionId, limit) {
			return postJson(ROUTES.log, {
				sessionId,
				limit
			});
		}
		/**
		* Ask the Host for one side of one changed path's patch.
		*
		* The side is the row's own: a staged row asks for the index against HEAD, and
		* an unstaged row asks for the worktree against the index. A file that is both
		* appears as two rows, and each must answer with the patch that row names rather
		* than the same combined one.
		*
		* @param sessionId - the session whose directory Git runs in, when known.
		* @param file - the path to diff.
		* @param side - the half of the path this row stands for.
		* @param untracked - whether the path is untracked, which has no HEAD side.
		* @returns the diff payload.
		*/
		function fetchDiff(sessionId, file, side, untracked) {
			return postJson(ROUTES.diff, {
				sessionId,
				path: file.path,
				side,
				untracked
			});
		}
		/**
		* Ask the Host for one commit's message and patch.
		*
		* @param sessionId - the session whose directory Git runs in, when known.
		* @param hash - the commit's hexadecimal object name.
		* @returns the commit payload.
		*/
		function fetchCommit(sessionId, hash) {
			return postJson(ROUTES.commit, {
				sessionId,
				hash
			});
		}
		/**
		* Ask the Host to commit every change the working tree has.
		*
		* One request, not a stage followed by a commit: the Host stages everything
		* `git status` reports — untracked files included, since those are rows the page
		* lists too — and commits it under this message. So the page never holds a
		* half-staged index it cannot name, and a refusal (a conflict left unresolved, a
		* message Git will not take) arrives as one answer.
		*
		* @param sessionId - the session whose directory Git runs in, when known.
		* @param message - the commit message, non-empty.
		* @returns the commit-all payload.
		*/
		function commitAll(sessionId, message) {
			return postJson(ROUTES.commitAll, {
				sessionId,
				message
			});
		}
		/**
		* Ask the Host to commit the index as it stands.
		*
		* Nothing is staged here: the page's own `+` and `−` actions decided what the
		* index holds, and the Host commits exactly that. A conflict, or an index with
		* nothing in it, is refused as one answer.
		*
		* @param sessionId - the session whose directory Git runs in, when known.
		* @param message - the commit message, non-empty.
		* @returns the commit payload, shaped like the commit-all answer.
		*/
		function commitStaged(sessionId, message) {
			return postJson(ROUTES.commitStaged, {
				sessionId,
				message
			});
		}
		/**
		* Ask the Host to take the commit at HEAD back off the branch.
		*
		* The move is a soft reset: the commit leaves the branch, and everything it
		* recorded stays in the index and the working tree, so the changes return as
		* staged work rather than disappearing. The page re-reads the repository after
		* it because both the history and the changed-path lists describe a branch that
		* has just moved.
		*
		* @param sessionId - the session whose directory Git runs in, when known.
		* @returns the undo payload, which names the commit that was moved.
		*/
		function undoLastCommit(sessionId) {
			return postJson(ROUTES.undoCommit, { sessionId });
		}
		/**
		* Move one path into the index.
		*
		* The answer carries the repository's fresh status, so the page repaints both
		* halves of the list from the state this write produced instead of asking for a
		* second read that another writer could race.
		*
		* @param sessionId - the session whose directory Git runs in, when known.
		* @param path - the repository-relative path to stage.
		* @returns the index payload.
		*/
		function stagePath(sessionId, path) {
			return postJson(ROUTES.stage, {
				sessionId,
				path
			});
		}
		/**
		* Move one path out of the index, keeping its worktree file.
		*
		* @param sessionId - the session whose directory Git runs in, when known.
		* @param path - the repository-relative path to unstage.
		* @param origPath - the rename source, when the row is a rename: both halves of
		*   a staged rename are restored together.
		* @returns the index payload.
		*/
		function unstagePath(sessionId, path, origPath) {
			return postJson(ROUTES.unstage, {
				sessionId,
				path,
				...origPath === void 0 ? {} : { origPath }
			});
		}
		/**
		* Discard one path's unstaged change.
		*
		* The Host restores a tracked path from the index, or deletes an untracked one;
		* either way the answer carries the fresh status, so the page repaints the lists
		* without a second read that another writer could race. This is destructive and
		* the page asks before calling it.
		*
		* @param sessionId - the session whose directory Git runs in, when known.
		* @param path - the repository-relative path to discard.
		* @param untracked - whether the path is untracked, which is deleted rather than restored.
		* @returns the index payload, carrying the repository state after the write.
		*/
		function discardPath(sessionId, path, untracked) {
			return postJson(ROUTES.discard, {
				sessionId,
				path,
				untracked
			});
		}
		/**
		* Stage every change under one folder.
		*
		* The request names the directory alone: the Host reads the status inside its
		* write queue and stages the paths under it that still sit in the worktree, so a
		* large folder never has to be enumerated across the request body or in a run of
		* one-file requests.
		*
		* @param sessionId - the session whose directory Git runs in, when known.
		* @param path - the repository-relative folder to stage.
		* @returns the index payload, carrying the repository state after the write.
		*/
		function stageFolder(sessionId, path) {
			return postJson(ROUTES.stageFolder, {
				sessionId,
				path
			});
		}
		/**
		* Move every staged change under one folder out of the index.
		*
		* @param sessionId - the session whose directory Git runs in, when known.
		* @param path - the repository-relative folder to unstage.
		* @returns the index payload, carrying the repository state after the write.
		*/
		function unstageFolder(sessionId, path) {
			return postJson(ROUTES.unstageFolder, {
				sessionId,
				path
			});
		}
		/**
		* Discard every unstaged change under one folder.
		*
		* @param sessionId - the session whose directory Git runs in, when known.
		* @param path - the repository-relative folder to discard.
		* @returns the index payload, carrying the repository state after the write.
		*/
		function discardFolder(sessionId, path) {
			return postJson(ROUTES.discardFolder, {
				sessionId,
				path
			});
		}
		/**
		* Stage every changed path in the repository.
		*
		* The header's whole-list action names no path: the Host resolves the worktree
		* side from the status it reads in its write queue, so the request stays one
		* call however large the tree is.
		*
		* @param sessionId - the session whose directory Git runs in, when known.
		* @returns the index payload, carrying the repository state after the write.
		*/
		function stageAll(sessionId) {
			return postJson(ROUTES.stageAll, { sessionId });
		}
		/**
		* Move every staged change in the repository out of the index.
		*
		* @param sessionId - the session whose directory Git runs in, when known.
		* @returns the index payload, carrying the repository state after the write.
		*/
		function unstageAll(sessionId) {
			return postJson(ROUTES.unstageAll, { sessionId });
		}
		/**
		* Discard every unstaged change in the repository.
		*
		* @param sessionId - the session whose directory Git runs in, when known.
		* @returns the index payload, carrying the repository state after the write.
		*/
		function discardAll(sessionId) {
			return postJson(ROUTES.discardAll, { sessionId });
		}
		/**
		* Ask the Host to write a commit message for the changes on disk.
		*
		* The request names no changes and no model: which paths the model is shown, and
		* which model writes the message, are the Host's own reads — the repository's
		* state and the deployment's current default selection. The answer is a draft for
		* the form, never a commit: this call leaves the index and the history alone.
		*
		* The scope is the one the form's commit button is set to: a staged-only commit
		* gets a message about the index alone, so it cannot describe a file it will
		* leave behind.
		*
		* @param sessionId - the session whose directory Git runs in, when known.
		* @param scope - whether the message describes the index or the whole tree.
		* @returns the message payload, with the model's own findings beside it.
		*/
		function generateMessage(sessionId, scope) {
			return postJson(ROUTES.message, {
				sessionId,
				scope
			});
		}
		/**
		* Ask the Host what this Workspace has chosen for generated messages.
		*
		* Read when the Settings dialog opens rather than cached: which models exist and
		* which one DSH currently defaults to change with the rest of the app, and a
		* dialog opened after a model switch must say what that switch now means. The
		* answer also carries the built-in prompt, so the field can open on the text the
		* default actually uses.
		*
		* @param sessionId - the session whose Workspace these choices belong to.
		* @returns the settings payload.
		*/
		function fetchSettings(sessionId) {
			return postJson(ROUTES.settings, { sessionId });
		}
		/**
		* Store this Workspace's choices for generated messages.
		*
		* Both fields are sent every time, because the dialog's Save is one answer to
		* both questions: a null model or a blank prompt is how it asks for the default
		* back. The Host keys the write by the session's own Workspace, never by
		* anything the caller names, so one Workspace cannot write another's choices.
		*
		* @param sessionId - the session whose Workspace these choices belong to.
		* @param model - the model to use, or null for DSH's current default.
		* @param prompt - the system prompt to use, or null for the built-in one.
		* @returns the save payload.
		*/
		function saveSettings(sessionId, model, prompt) {
			return postJson(ROUTES.settingsSave, {
				sessionId,
				model,
				prompt
			});
		}
		/**
		* Ask which reasoning efforts one model route may be saved with.
		*
		* Asked lazily, per model, when the picker opens that row's effort control:
		* effort metadata is resolved by the adapter that owns the route, and a dialog
		* that resolved every model up front would pay for lists nobody opened. The
		* answer is the adapter's own ids, which is what a saved route names.
		*
		* @param provider - the registered provider route.
		* @param model - the provider-owned model id.
		* @returns the efforts payload.
		*/
		function fetchModelEfforts(provider, model) {
			return postJson(ROUTES.modelEfforts, {
				provider,
				model
			});
		}
		/**
		* Ask the Host for the branches a switch may pick, local and remote-tracking.
		*
		* Read fresh on every open rather than cached: branches appear and disappear as
		* the agent works, and a stale menu would offer a branch that no longer exists.
		*
		* @param sessionId - the session whose directory Git runs in, when known.
		* @returns the branches payload.
		*/
		function fetchBranches(sessionId) {
			return postJson(ROUTES.branches, { sessionId });
		}
		/**
		* Ask the Host to check out one branch.
		*
		* This is one of the calls that change the repository, and it is the one that
		* moves HEAD: the Host runs a real checkout, so the working tree on disk is
		* different afterwards and every other answer on this page is stale.
		*
		* @param sessionId - the session whose directory Git runs in, when known.
		* @param branch - the local or remote-tracking branch to switch to.
		* @returns the checkout payload.
		*/
		function checkoutBranch(sessionId, branch) {
			return postJson(ROUTES.checkout, {
				sessionId,
				branch
			});
		}
		/**
		* Ask the Host for the branches the delete dialog may offer.
		*
		* A read of its own rather than the switch list, because these rows carry facts
		* the switch never needs: which upstream each branch tracks, how far ahead or
		* behind it is, and whether HEAD already reaches it. Those are what the row's
		* safety mark is drawn from, and they are read when the dialog opens.
		*
		* @param sessionId - the session whose directory Git runs in, when known.
		* @returns the branch report payload.
		*/
		function fetchBranchReport(sessionId) {
			return postJson(ROUTES.branchReport, { sessionId });
		}
		/**
		* Ask the Host to start a branch at one point and switch to it.
		*
		* The start point is a branch rather than a commit: the dialog offers the same
		* list a switch does, so the choice is between branches and the new one lands on
		* the point that was named. Branching off a remote-tracking ref is what sets the
		* new branch's upstream, which is Git's own answer to starting from `origin/main`.
		*
		* @param sessionId - the session whose directory Git runs in, when known.
		* @param name - the local branch to create.
		* @param start - the local or remote-tracking branch it starts at.
		* @returns the create payload.
		*/
		function createBranch(sessionId, name, start) {
			return postJson(ROUTES.branchCreate, {
				sessionId,
				name,
				start
			});
		}
		/**
		* Ask the Host to delete the branches the dialog selected.
		*
		* One request for the whole selection, because the choice was made once: the
		* Host deletes each branch on its own and answers with one result per branch, so
		* the page reports the refusals and keeps them next to the names they were about.
		* Each target is echoed back in the shape the report gave it — a local branch, or
		* a remote-tracking row with its remote and branch — rather than a name the Host
		* would have to split again.
		*
		* @param sessionId - the session whose directory Git runs in, when known.
		* @param targets - the branches to delete, in the order the dialog listed them.
		* @returns the delete payload.
		*/
		function deleteBranches(sessionId, targets) {
			return postJson(ROUTES.branchDelete, {
				sessionId,
				targets
			});
		}
		/**
		* Ask the Host to merge one branch into the one HEAD is on.
		*
		* The named branch is the source, because that is the only merge Git has: it
		* merges into the branch it is on, which is the branch the page is showing. What
		* the name may be is the Host's answer — a local branch or a remote-tracking ref
		* — and the merge leaves HEAD where it is, so the page re-reads the repository
		* afterwards rather than switching anything itself.
		*
		* @param sessionId - the session whose directory Git runs in, when known.
		* @param branch - the branch to merge in.
		* @returns the merge payload.
		*/
		function mergeBranch(sessionId, branch) {
			return postJson(ROUTES.merge, {
				sessionId,
				branch
			});
		}
		/**
		* Ask the Host for one unmerged path, as the resolver draws it.
		*
		* The answer is a parsed view of the working-tree file — its context, its
		* conflict blocks, and the label Git gave each side — rather than a patch,
		* because a patch of an unmerged path is a combined diff, which describes the
		* conflict instead of offering a choice within it.
		*
		* @param sessionId - the session whose directory Git runs in, when known.
		* @param path - the repository-relative path.
		* @returns the conflict payload.
		*/
		function fetchConflict(sessionId, path) {
			return postJson(ROUTES.conflict, {
				sessionId,
				path
			});
		}
		/**
		* Ask the Host to apply one choice to one path.
		*
		* Two shapes, as the route reads them: `keys` replaces exactly those blocks and
		* leaves the rest of the file alone, while a request naming none takes a whole
		* version and marks the path resolved. The answer carries the file after the
		* write, so the pane repaints from what is really on disk instead of assuming
		* the rewrite did what the click meant.
		*
		* @param sessionId - the session whose directory Git runs in, when known.
		* @param path - the repository-relative path.
		* @param choice - which version to keep.
		* @param keys - the blocks to replace, or undefined for a whole-file choice.
		* @returns the resolve payload.
		*/
		function resolveConflict(sessionId, path, choice, keys) {
			return postJson(ROUTES.resolve, {
				sessionId,
				path,
				choice,
				...keys === void 0 ? {} : { keys }
			});
		}
		/**
		* Ask the Host to mark one path resolved without writing it.
		*
		* The reader who edited the file themselves has nothing left to write; `git add`
		* is the whole of the decision, and on an unmerged path that is what "resolved"
		* means. The answer carries the fresh status, so the sidebar's conflict count
		* falls in the same paint.
		*
		* @param sessionId - the session whose directory Git runs in, when known.
		* @param path - the repository-relative path.
		* @returns the resolve-done payload.
		*/
		function markResolved(sessionId, path) {
			return postJson(ROUTES.resolveDone, {
				sessionId,
				path
			});
		}
		/**
		* Ask the Host to finish a merge.
		*
		* Every conflict must be resolved and staged first. The message is the one the
		* form held, or none at all — and none is the normal case, because the merge
		* already has Git's own `MERGE_MSG` — so an empty field records the merge with
		* the words Git wrote when it started.
		*
		* @param sessionId - the session whose directory Git runs in, when known.
		* @param message - the reader's message, or nothing to keep Git's.
		* @returns the operation payload, carrying the merge commit once it is made.
		*/
		function completeMerge(sessionId, message) {
			return postJson(ROUTES.mergeCommit, message === void 0 ? { sessionId } : {
				sessionId,
				message
			});
		}
		/**
		* Ask the Host to refresh every remote-tracking ref.
		*
		* Nothing crosses with the request and nothing comes back but the outcome: which
		* remotes exist is the repository's answer, and what a fetch moves lives inside
		* `.git`. The page re-reads the repository afterwards, because the two things a
		* fetch can change on screen — the divergence counts and the remote branch list
		* — are both read from those refs.
		*
		* @param sessionId - the session whose directory Git runs in, when known.
		* @returns the fetch payload.
		*/
		function fetchRemotes(sessionId) {
			return postJson(ROUTES.fetch, { sessionId });
		}
		/**
		* Ask the Host to refresh just the current branch's upstream ref.
		*
		* The branch switch's follow-up rather than a reader's request: the counts the
		* sync control draws compare the branch with its upstream, and only a fetch moves
		* that ref. A switch re-reads the working tree but leaves the remote-tracking ref
		* where the last fetch put it, so the page asks for this after a switch to find
		* out whether the remote has anything new for the branch it just landed on.
		*
		* Every answer is quiet. `skipped` means there was nothing to refresh — no
		* upstream, a detached HEAD — and an `ok: false` means the fetch could not reach
		* the remote (offline, no credentials, a session that may not write `.git`); the
		* caller keeps the counts it has and opens no dialog, because the switch itself
		* already succeeded and was reported.
		*
		* @param sessionId - the session whose directory Git runs in, when known.
		* @returns the fetch payload, with `skipped` when there was nothing to refresh.
		*/
		function fetchBranchUpstream(sessionId) {
			return postJson(ROUTES.fetchUpstream, { sessionId });
		}
		/**
		* Ask the Host to pull the current branch from its upstream.
		*
		* The Host reads which branch and which upstream from the repository itself, so
		* this call carries nothing to aim: it is a request to pull, not an instruction
		* about what to pull. The pull merges rather than rebases, so a divergent history
		* is joined with a merge commit whose message Git writes itself; when the two
		* sides conflict, the merge is left in the working tree and the answer says so —
		* `reason: 'conflict'` — which is what puts the paths in the conflict list.
		*
		* @param sessionId - the session whose directory Git runs in, when known.
		* @returns the sync payload.
		*/
		function pullBranch(sessionId) {
			return postJson(ROUTES.pull, { sessionId });
		}
		/**
		* Ask the Host to push the current branch to its upstream.
		*
		* As with the pull, the target comes from the repository. A branch with no
		* upstream is pushed to the single configured remote (which then becomes its
		* upstream); with no remote or several, the Host refuses rather than guess.
		*
		* @param sessionId - the session whose directory Git runs in, when known.
		* @returns the sync payload.
		*/
		function pushBranch(sessionId) {
			return postJson(ROUTES.push, { sessionId });
		}
		/**
		* Ask the Host which version of this plugin is published.
		*
		* The question belongs to the plugin's own page rather than to any session: the
		* registry and the profile are the Host's to read, and neither has anything to
		* do with the repository a Git tab is showing, so no session id travels with the
		* request. An answer that could not reach the registry is `ok: false` with text,
		* which the row states quietly under itself.
		*
		* @returns the version payload.
		*/
		function checkUpdate() {
			return postJson(ROUTES.update, {});
		}
		/**
		* Ask the Host to install one published version of this plugin.
		*
		* The version is the one the row was shown, never one the reader typed; the Host
		* refuses anything that is not a plain release version before the manager is
		* asked, and the manager itself performs the same install the Plugins panel
		* performs.
		*
		* @param version - the version to install.
		* @returns the install payload, carrying how the manager applied it.
		*/
		function applyUpdate(version) {
			return postJson(ROUTES.updateApply, { version });
		}
		//#endregion
		//#region src/client/cache.ts
		/**
		* The prefix every entry this plugin writes carries.
		*
		* Versioned because the shape is: a later revision that stores something else
		* under the same names must not read this revision's values as its own. The
		* version lives in the key rather than inside the value so an old entry is
		* simply never found, and the index below drops it on the next write.
		*/
		const PREFIX = "dsh-cool-git.cache.v1";
		/** The `localStorage` entry listing the repositories whose snapshots are saved. */
		const INDEX_KEY = `${PREFIX}.repositories`;
		/**
		* The prefix of the entries holding a Workspace's commit-scope choice.
		*
		* Deliberately outside {@link PREFIX}: the choice is a preference rather than a
		* snapshot, and the index's eviction sweeps snapshot entries only. Versioned on
		* its own so a later revision can change the stored shape without misreading
		* what this one wrote.
		*/
		const SCOPE_PREFIX = "dsh-cool-git.commit-scope.v1";
		/**
		* How old a saved snapshot may be before a mount re-reads it.
		*
		* A switch out of this tab and back within this window is one the reader is
		* still working in, and the answer they left is the one they want to see; a
		* longer absence is when the agent — or the reader, in another window — may
		* have moved the working tree. Five seconds is short enough that a return after
		* any real work re-reads, and long enough that flipping between tabs does not
		* start a `git status` per flip.
		*/
		const SNAPSHOT_FRESH_MS = 5e3;
		/**
		* How many repositories' snapshots are kept persisted; the oldest goes first.
		*
		* The bound is on disk, not on memory: the map above keeps every snapshot this
		* page has used, because dropping one from memory would turn a tab switch back
		* into a reload for no benefit — the entries are small next to the diff pane
		* they feed, and a page visits a bounded set of Workspaces.
		*/
		const MAX_SAVED_REPOSITORIES = 8;
		/**
		* Largest snapshot persisted, in JSON characters.
		*
		* `localStorage` is one shared quota of a few megabytes, and an oversized
		* repository answer — tens of thousands of changed paths, a very long history —
		* would spend much of it on one page. A snapshot over this bound stays in
		* memory, where the tab switch that needs it is served anyway; only a page
		* reload loses it, and that reload re-reads the repository.
		*/
		const MAX_SNAPSHOT_CHARS = 512 * 1024;
		/** The snapshots alive in this page, keyed by repository identity. */
		const snapshots = /* @__PURE__ */ new Map();
		/** Session identity to repository identity, as earlier mounts learned it. */
		const aliases = /* @__PURE__ */ new Map();
		/**
		* The identity one session's repository is cached under.
		*
		* A session id is the key the page knows before it knows anything else, but the
		* page cannot run without one — the Host falls back to the executor's own
		* directory — so the empty string stands for "the session the shell did not
		* name": one answer for that directory, which is the same answer every such
		* mount would read.
		*
		* @param sessionId - the session the page belongs to, when it named one.
		* @returns the alias key.
		*/
		function identityOf(sessionId) {
			return sessionId ?? "";
		}
		/**
		* One repository's `localStorage` entry name.
		*
		* @param repository - the repository's cache identity, an absolute path.
		* @returns the entry name.
		*/
		function repositoryKey(repository) {
			return `${PREFIX}.repository.${encodeURIComponent(repository)}`;
		}
		/**
		* One session's alias entry name.
		*
		* @param session - the session identity, as {@link identityOf} spelled it.
		* @returns the entry name.
		*/
		function aliasKey(session) {
			return `${PREFIX}.session.${encodeURIComponent(session)}`;
		}
		/**
		* The repository one answer is about, as the cache identifies it.
		*
		* The Workspace's canonical path first, because it is the path every session
		* attached to that Workspace resolves and the key the Settings routes store a
		* Workspace's choices under; the repository root second, because a deployment
		* whose registry cannot name a Workspace still has a directory to key by.
		*
		* The two identities can disagree across restarts or registry availability — the
		* status route attaches `workspace` only when the registry answers — so the same
		* repository may end up with two cold-start entries. That costs one re-read and
		* one of the saved slots; it can never show another repository's answer, because
		* each entry is keyed by the path the answer itself named.
		*
		* @param status - the answer to read the identity out of.
		* @returns the identity, or undefined when the answer names no repository.
		*/
		function repositoryOf(status) {
			const workspace = status?.workspace?.path;
			if (typeof workspace === "string" && workspace !== "") return workspace;
			const root = status?.root;
			if (typeof root === "string" && root !== "") return root;
		}
		/**
		* The repository identity a session was last seen reading, if any.
		*
		* @param session - the session identity, as {@link identityOf} spelled it.
		* @returns the repository identity, or undefined when no mount has recorded one.
		*/
		function readAlias(session) {
			const known = aliases.get(session);
			if (known !== void 0) return known;
			let stored;
			try {
				stored = localStorage.getItem(aliasKey(session));
			} catch {
				return;
			}
			if (stored === null || stored === "") return void 0;
			aliases.set(session, stored);
			return stored;
		}
		/**
		* Record the repository a session read.
		*
		* Written through to `localStorage` so the alias survives a page reload, which
		* is the reload where the mount has no answer of its own and must find the
		* saved one before it asks the Host.
		*
		* An alias is deliberately not swept when its repository's entry is evicted: it
		* is one short string per session the browser has seen this tab in, and removing
		* it would only cost that session a full read, while finding and rewriting every
		* alias on an eviction would turn a cache write into a storage scan.
		*
		* @param session - the session identity, as {@link identityOf} spelled it.
		* @param repository - the repository identity the session read.
		*/
		function writeAlias(session, repository) {
			if (aliases.get(session) === repository) return;
			aliases.set(session, repository);
			try {
				localStorage.setItem(aliasKey(session), repository);
			} catch {}
		}
		/**
		* One repository's commit-scope entry name.
		*
		* @param repository - the repository's identity, an absolute path.
		* @returns the entry name.
		*/
		function scopeKey(repository) {
			return `${SCOPE_PREFIX}.${encodeURIComponent(repository)}`;
		}
		/**
		* Read one repository's saved commit scope.
		*
		* A stored value is read as data rather than trusted: an entry written by
		* another revision of this plugin, or one damaged on disk, is the same answer
		* as no entry at all — the form opens on its default.
		*
		* @param repository - the identity to read.
		* @returns the saved scope, or undefined when none is stored.
		*/
		function readStoredScope(repository) {
			let raw;
			try {
				raw = localStorage.getItem(scopeKey(repository));
			} catch {
				return;
			}
			return raw === "staged" || raw === "all" ? raw : void 0;
		}
		/**
		* The commit scope the reader left a Workspace set to, if there is one.
		*
		* The answer is available before the Host's first read: a reload resolves the
		* repository through the session's alias, which earlier mounts wrote to
		* `localStorage`, so the commit form opens in the saved scope rather than the
		* default. A session opening this tab for the first time has no alias yet;
		* {@link readCommitScope} can then be called again with the `status` answer
		* that named the repository, and the page adopts what that Workspace saved.
		*
		* @param sessionId - the session the page belongs to, when it named one.
		* @param status - the answer that names the repository now being shown, when one
		*   has arrived; it takes precedence over the session's last-known repository.
		* @returns the saved scope, or undefined when this repository has none.
		*/
		function readCommitScope(sessionId, status = null) {
			const repository = repositoryOf(status) ?? readAlias(identityOf(sessionId));
			return repository === void 0 ? void 0 : readStoredScope(repository);
		}
		/**
		* Record the commit scope for the repository a session is showing.
		*
		* The repository is named by the answer on screen when it can be, and by the
		* session's alias otherwise, exactly as a snapshot write names it: a scope
		* change while the page still shows the cached answer must land on the same
		* Workspace key that read will use. A write that fails is not reported — the
		* page keeps the choice for as long as it is open, and persistence is a
		* convenience rather than a precondition.
		*
		* @param sessionId - the session the page belongs to, when it named one.
		* @param status - the answer the page is showing, or null before one arrives.
		* @param scope - the scope the reader picked.
		*/
		function writeCommitScope(sessionId, status, scope) {
			const session = identityOf(sessionId);
			const repository = repositoryOf(status) ?? readAlias(session);
			if (repository === void 0) return;
			writeAlias(session, repository);
			try {
				localStorage.setItem(scopeKey(repository), scope);
			} catch {}
		}
		/**
		* The repository order the index holds, most recently written first.
		*
		* @returns the identities the index lists; anything unreadable reads as empty.
		*/
		function readIndex() {
			let raw;
			try {
				raw = localStorage.getItem(INDEX_KEY);
			} catch {
				return [];
			}
			if (raw === null) return [];
			let parsed;
			try {
				parsed = JSON.parse(raw);
			} catch {
				return [];
			}
			if (!Array.isArray(parsed)) return [];
			return parsed.filter((entry) => typeof entry === "string" && entry !== "");
		}
		/**
		* Put one repository at the head of the index, and drop the entries past the
		* bound.
		*
		* Eviction is by write order rather than by read: a page that only ever reads is
		* the page that benefits from the entry, and re-writing the index on every read
		* would trade a read for a write on the common path. The bound is what keeps a
		* long-lived page from accumulating every repository it ever opened.
		*
		* @param repository - the identity just written.
		*/
		function touchIndex(repository) {
			const order = readIndex().filter((entry) => entry !== repository);
			order.unshift(repository);
			for (const dropped of order.slice(MAX_SAVED_REPOSITORIES)) try {
				localStorage.removeItem(repositoryKey(dropped));
			} catch {}
			try {
				localStorage.setItem(INDEX_KEY, JSON.stringify(order.slice(0, MAX_SAVED_REPOSITORIES)));
			} catch {}
		}
		/**
		* Read and check one stored snapshot.
		*
		* @param repository - the identity to read.
		* @returns the snapshot, or null when there is none or it cannot be trusted.
		*/
		function readStored(repository) {
			let raw;
			try {
				raw = localStorage.getItem(repositoryKey(repository));
			} catch {
				return null;
			}
			if (raw === null) return null;
			let parsed;
			try {
				parsed = JSON.parse(raw);
			} catch {
				return null;
			}
			return asSnapshot(parsed);
		}
		/**
		* Read one stored value as a snapshot, or null when any part of it is not one.
		*
		* The checks cover what a render walks: a `status` answer's changed-path rows,
		* a `log` answer's commit rows, and the Workspace the sidebar names. The scalar
		* facts beside them — the branch, its divergence, the head commit — are read
		* through optional access and draw as absent when an entry lacks one, so they
		* are not required here. A value from another revision of this plugin fails one
		* of these checks and is dropped, which is the same result as having no cache:
		* the mount re-reads.
		*
		* @param value - the parsed entry.
		* @returns the snapshot, or null when the value is not one.
		*/
		function asSnapshot(value) {
			if (!isRecord(value)) return null;
			const savedAt = value.savedAt;
			if (typeof savedAt !== "number" || !Number.isFinite(savedAt)) return null;
			const status = value.status;
			if (status !== null && !isStatus(status)) return null;
			const log = value.log;
			if (log !== null && !isLog(log)) return null;
			return {
				status,
				log,
				savedAt
			};
		}
		/**
		* Whether one value can be drawn by the page as a `status` answer.
		*
		* @param value - the value to check.
		* @returns true when the sidebar can render it.
		*/
		function isStatus(value) {
			if (!isRecord(value) || typeof value.ok !== "boolean") return false;
			if (value.workspace !== void 0 && !isWorkspace(value.workspace)) return false;
			if (value.ok !== true) return true;
			const files = value.files;
			return Array.isArray(files) && files.every(isChangedFile);
		}
		/**
		* Whether one value is a changed-path row the tree can group and draw.
		*
		* @param value - the value to check.
		* @returns true for a row the sidebar renders.
		*/
		function isChangedFile(value) {
			if (!isRecord(value)) return false;
			if (typeof value.path !== "string") return false;
			if (value.origPath !== void 0 && typeof value.origPath !== "string") return false;
			return typeof value.index === "string" && typeof value.worktree === "string" && typeof value.kind === "string" && typeof value.staged === "boolean" && typeof value.unstaged === "boolean" && typeof value.untracked === "boolean" && typeof value.conflicted === "boolean";
		}
		/**
		* Whether one value can be drawn by the page as a `log` answer.
		*
		* @param value - the value to check.
		* @returns true when the history pane can render it.
		*/
		function isLog(value) {
			if (!isRecord(value) || typeof value.ok !== "boolean") return false;
			if (value.ok !== true) return true;
			const commits = value.commits;
			return Array.isArray(commits) && commits.every(isCommit);
		}
		/**
		* Whether one value is a commit row the history pane can draw.
		*
		* @param value - the value to check.
		* @returns true for a row the pane renders.
		*/
		function isCommit(value) {
			if (!isRecord(value)) return false;
			const refs = value.refs;
			const parents = value.parents;
			return typeof value.hash === "string" && typeof value.short === "string" && typeof value.author === "string" && typeof value.email === "string" && typeof value.date === "string" && typeof value.subject === "string" && Array.isArray(refs) && refs.every((ref) => typeof ref === "string") && Array.isArray(parents) && parents.every((parent) => typeof parent === "string");
		}
		/**
		* Whether one value is the Workspace the sidebar names.
		*
		* @param value - the value to check.
		* @returns true for a Workspace the header can read.
		*/
		function isWorkspace(value) {
			return isRecord(value) && typeof value.title === "string" && typeof value.path === "string";
		}
		/**
		* Whether one value is a plain object worth reading fields from.
		*
		* @param value - the value to check.
		* @returns true for a non-null, non-array object.
		*/
		function isRecord(value) {
			return typeof value === "object" && value !== null && !Array.isArray(value);
		}
		/**
		* Persist one snapshot, if it is small enough to be worth the quota.
		*
		* A write that fails is not reported: the memory copy is what the next tab
		* switch reads, and only a page reload would notice the difference. An entry
		* over the size bound is removed rather than left stale, so a reload never
		* hydrates from an answer newer than the one on disk.
		*
		* @param repository - the identity the snapshot belongs to.
		* @param snapshot - the answer to save.
		*/
		function persist(repository, snapshot) {
			let raw;
			try {
				raw = JSON.stringify(snapshot);
			} catch {
				return;
			}
			try {
				if (raw.length > MAX_SNAPSHOT_CHARS) {
					localStorage.removeItem(repositoryKey(repository));
					return;
				}
				localStorage.setItem(repositoryKey(repository), raw);
			} catch {
				return;
			}
			touchIndex(repository);
		}
		/**
		* The saved snapshot for the repository this session last read, if there is one.
		*
		* The alias answers before the Host does: a session that has opened this tab
		* before names its repository from `localStorage`, so a reloading page finds the
		* saved answer during its first render rather than after a network round trip.
		* A session no mount has seen, or one whose Workspace was never a repository,
		* simply answers null and loads exactly as it did before the cache existed.
		*
		* @param sessionId - the session the page belongs to, when it named one.
		* @returns the snapshot, or null when there is none to draw.
		*/
		function readRepositorySnapshot(sessionId) {
			const repository = readAlias(identityOf(sessionId));
			if (repository === void 0) return null;
			const memory = snapshots.get(repository);
			if (memory !== void 0) return memory;
			const stored = readStored(repository);
			if (stored !== null) snapshots.set(repository, stored);
			return stored;
		}
		/**
		* Whether a saved snapshot is recent enough that a mount need not re-read.
		*
		* @param snapshot - the snapshot a mount would hydrate from.
		* @returns true when the answer is younger than {@link SNAPSHOT_FRESH_MS}.
		*/
		function isSnapshotFresh(snapshot) {
			return Date.now() - snapshot.savedAt < SNAPSHOT_FRESH_MS;
		}
		/**
		* Remember the answer a read just produced.
		*
		* Called by every path that re-reads the repository, so the snapshot on hand is
		* always the last thing the page saw — a manual Refresh, a checkout, a commit,
		* a pull, or the background re-read a mount starts. The repository is named by
		* the answer itself when it can be; a failure that names none (a transport
		* error, or a directory that is no longer a repository) is saved under the
		* session's last known repository, so the next mount shows the same failure
		* instead of a spinner.
		*
		* @param sessionId - the session the page belongs to, when it named one.
		* @param status - the `status` answer, or null when it never arrived.
		* @param log - the `log` answer, or null when it never arrived.
		*/
		function writeRepositorySnapshot(sessionId, status, log) {
			const session = identityOf(sessionId);
			const repository = repositoryOf(status) ?? readAlias(session);
			if (repository === void 0) return;
			writeAlias(session, repository);
			const snapshot = {
				status,
				log,
				savedAt: Date.now()
			};
			snapshots.set(repository, snapshot);
			persist(repository, snapshot);
		}
		//#endregion
		//#region src/client/chrome.ts
		/**
		* Composer-seat suppression for the Git tab.
		*
		* The Conversation shell mounts its composer seat — the input card plus the
		* `conversation.input.dock` rows above it — for every View. It also publishes
		* the hook a View uses to take the whole body for itself: the View root
		* declares `data-conversation-composer-overlay`, and the shell then drops the
		* transcript width handles and floats the seat over the page
		* (`.scrollBody:has([data-conversation-composer-overlay])`, see
		* `ConversationRoot.module.css`). That hook repositions the seat; it never
		* removes it, so a page with no input of its own — this one — has to take the
		* seat out itself.
		*
		* The removal is a DOM write on the seat element instead of only a stylesheet
		* rule. Both are presentation, but the write depends on nothing beyond the
		* rendered tree: not on this plugin's sheet being inserted, not on the shell
		* ranking our selector above its own, not on the attribute names this version
		* of the shell happens to use. The declarative twin in `styles.ts` states the
		* same fact for the frames the shell paints before this runs.
		*/
		/** The shell's marker on the Conversation body that owns one composer seat. */
		const CONVERSATION_BODY = "[data-conversation-content]";
		/** The shell's marker on the seat itself. */
		const COMPOSER_SEAT = "[data-composer-seat]";
		/**
		* Hide the composer seat of the Conversation hosting `view`.
		*
		* The seat is a sibling of the View inside the same body, rendered
		* unconditionally by the same component that renders the View: when that body
		* is replaced the View remounts with it, so one write per mount reaches every
		* seat this page can coexist with.
		*
		* @param view - the mounted View root, or null before React attaches it.
		* @returns disposer restoring exactly the inline display it replaced.
		*/
		function suppressComposerSeat(view) {
			if (view === null) return () => {};
			const scope = view.closest(CONVERSATION_BODY) ?? view.ownerDocument;
			const hidden = /* @__PURE__ */ new Map();
			for (const seat of scope.querySelectorAll(COMPOSER_SEAT)) {
				hidden.set(seat, seat.style.display);
				seat.style.display = "none";
			}
			return () => {
				for (const [seat, display] of hidden) if (display === "") seat.style.removeProperty("display");
				else seat.style.display = display;
				hidden.clear();
			};
		}
		//#endregion
		//#region src/client/diff.ts
		/** Hunk header, `@@ -oldStart,oldCount +newStart,newCount @@ optional section`. */
		const HUNK_HEADER = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/;
		/**
		* A file section with nothing parsed into it yet.
		*
		* @param header - the `diff --git` line that opened the section.
		* @returns the section, ready for its paths, metadata, hunks, and counts.
		*/
		function newFile(header) {
			return {
				header,
				oldPath: "",
				newPath: "",
				meta: [],
				hunks: [],
				additions: 0,
				deletions: 0,
				binary: false
			};
		}
		/**
		* Parse one unified diff into files, hunks, and line-numbered lines.
		*
		* @param patch - the raw patch text; an empty string is a legitimate no-change.
		* @returns the parsed document.
		*/
		function parsePatch(patch) {
			const files = [];
			let current = null;
			let hunk = null;
			let oldNo = 0;
			let newNo = 0;
			for (const line of patch.split("\n")) {
				if (line.startsWith("diff --git ")) {
					if (current !== null) files.push(current);
					current = newFile(line);
					hunk = null;
					continue;
				}
				if (current === null) continue;
				if (line.startsWith("@@")) {
					const match = HUNK_HEADER.exec(line);
					oldNo = match === null ? 0 : Number(match[1]);
					newNo = match === null ? 0 : Number(match[2]);
					hunk = {
						header: line,
						lines: []
					};
					current.hunks.push(hunk);
					continue;
				}
				if (line.startsWith("--- ")) {
					current.oldPath = stripPrefix(line.slice(4));
					continue;
				}
				if (line.startsWith("+++ ")) {
					current.newPath = stripPrefix(line.slice(4));
					continue;
				}
				if (line.startsWith("Binary files ") || line.startsWith("GIT binary patch")) {
					current.binary = true;
					continue;
				}
				if (hunk === null) {
					if (line !== "") current.meta.push(line);
					continue;
				}
				if (line.startsWith("\\")) {
					hunk.lines.push({
						kind: "meta",
						text: line,
						oldNo: null,
						newNo: null
					});
					continue;
				}
				const marker = line.charAt(0);
				if (marker === "+") {
					hunk.lines.push({
						kind: "add",
						text: line.slice(1),
						oldNo: null,
						newNo: newNo++
					});
					current.additions += 1;
				} else if (marker === "-") {
					hunk.lines.push({
						kind: "del",
						text: line.slice(1),
						oldNo: oldNo++,
						newNo: null
					});
					current.deletions += 1;
				} else if (marker === " ") hunk.lines.push({
					kind: "context",
					text: line.slice(1),
					oldNo: oldNo++,
					newNo: newNo++
				});
				else if (line !== "") hunk.lines.push({
					kind: "meta",
					text: line,
					oldNo: null,
					newNo: null
				});
			}
			if (current !== null) files.push(current);
			return {
				files,
				additions: files.reduce((total, file) => total + file.additions, 0),
				deletions: files.reduce((total, file) => total + file.deletions, 0),
				binary: files.some((file) => file.binary)
			};
		}
		/**
		* Drop the `a/` or `b/` prefix Git puts on diff paths.
		*
		* @param value - the path as it appeared after `--- ` or `+++ `.
		* @returns the repository-relative path, with `/dev/null` left alone.
		*/
		function stripPrefix(value) {
			const path = value.trim();
			if (path === "/dev/null") return path;
			if (path.startsWith("a/") || path.startsWith("b/")) return path.slice(2);
			return path;
		}
		/**
		* The path a file section should be titled with.
		*
		* @param file - one parsed file section.
		* @returns the post-image path, falling back to the pre-image for a deletion.
		*/
		function displayPath(file) {
			if (file.newPath !== "" && file.newPath !== "/dev/null") return file.newPath;
			if (file.oldPath !== "" && file.oldPath !== "/dev/null") return file.oldPath;
			return file.header.replace(/^diff --git /, "");
		}
		//#endregion
		//#region src/client/icons.tsx
		/**
		* The plugin's own icon set, rendered from the SVG artwork under
		* `src/client/assets/`.
		*
		* The client bundle is one JS file the platform's module loader evaluates, so
		* sibling asset files would never be fetched; tsdown.config.ts reads the artwork
		* at build time and exposes it as the `__DSH_CG_ICONS__` string map this module
		* consumes, keyed by asset filename stem.
		*
		* The artwork is 24-unit stroke markup riding `currentColor`, so every glyph
		* tints with the surrounding CSS, and none of it carries a size of its own: the
		* seat that wraps the glyph decides that, which is what lets the same refresh
		* mark sit at 13px in a toolbar button (see `.dsh-cg-icon svg` in `styles.ts`)
		* and at 12px beside the branch (`…-branch-icon svg`).
		*
		* Every component here takes no props: a caller places it inside the span whose
		* class owns the size, the color, and the spin.
		*/
		/**
		* Parse one asset's raw SVG into the artwork its component renders.
		*
		* The root element is dropped rather than copied: its `width`/`height` belong to
		* the asset, not to this seat, and the root's `xmlns` would be redundant once the
		* markup is part of a larger document.
		*
		* @param name - the asset filename stem, e.g. `pull` for `assets/pull.svg`.
		* @returns the viewBox and inner markup to render.
		*/
		function iconArtwork(name) {
			const raw = {
				"alert": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"1em\" height=\"1em\" viewBox=\"0 0 24 24\">\n	<path d=\"M0 0h24v24H0z\" fill=\"none\" />\n	<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\">\n		<circle cx=\"12\" cy=\"12\" r=\"10\" />\n		<path d=\"M12 8v4m0 4h.01\" />\n	</g>\n</svg>\n",
				"arrow-right": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"1em\" height=\"1em\" viewBox=\"0 0 24 24\">\n	<path d=\"M0 0h24v24H0z\" fill=\"none\" />\n	<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"m9 18l6-6l-6-6\" />\n</svg>\n",
				"branch": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"1em\" height=\"1em\" viewBox=\"0 0 24 24\">\n	<path d=\"M0 0h24v24H0z\" fill=\"none\" />\n	<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\">\n		<path d=\"M15 6a9 9 0 0 0-9 9V3\" />\n		<circle cx=\"18\" cy=\"6\" r=\"3\" />\n		<circle cx=\"6\" cy=\"18\" r=\"3\" />\n	</g>\n</svg>\n",
				"check": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"1em\" height=\"1em\" viewBox=\"0 0 24 24\">\n	<path d=\"M0 0h24v24H0z\" fill=\"none\" />\n	<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M20 6L9 17l-5-5\" />\n</svg>\n",
				"chevron-down": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"1em\" height=\"1em\" viewBox=\"0 0 24 24\">\n	<path d=\"M0 0h24v24H0z\" fill=\"none\" />\n	<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"m6 9l6 6l6-6\" />\n</svg>\n",
				"copy": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"1em\" height=\"1em\" viewBox=\"0 0 24 24\">\n	<path d=\"M0 0h24v24H0z\" fill=\"none\" />\n	<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\">\n		<rect width=\"14\" height=\"14\" x=\"8\" y=\"8\" rx=\"2\" ry=\"2\" />\n		<path d=\"M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2\" />\n	</g>\n</svg>\n",
				"discard": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"1em\" height=\"1em\" viewBox=\"0 0 24 24\">\n	<path d=\"M0 0h24v24H0z\" fill=\"none\" />\n	<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\">\n		<path d=\"M9 14L4 9l5-5\" />\n		<path d=\"M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11\" />\n	</g>\n</svg>\n",
				"folder": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"1em\" height=\"1em\" viewBox=\"0 0 24 24\">\n	<path d=\"M0 0h24v24H0z\" fill=\"none\" />\n	<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z\" />\n</svg>\n",
				"generate": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"1em\" height=\"1em\" viewBox=\"0 0 24 24\">\n	<path d=\"M0 0h24v24H0z\" fill=\"none\" />\n	<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\">\n		<path d=\"M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594zM20 2v4m2-2h-4\" />\n		<circle cx=\"4\" cy=\"20\" r=\"2\" />\n	</g>\n</svg>\n",
				"github": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"1em\" height=\"1em\" viewBox=\"0 0 24 24\">\n	<path d=\"M0 0h24v24H0z\" fill=\"none\" />\n	<g fill=\"none\">\n		<g clip-path=\"url(#SVGXv8lpc2Y)\">\n			<path fill=\"currentColor\" fill-rule=\"evenodd\" d=\"M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385c.6.105.825-.255.825-.57c0-.285-.015-1.23-.015-2.235c-3.015.555-3.795-.735-4.035-1.41c-.135-.345-.72-1.41-1.23-1.695c-.42-.225-1.02-.78-.015-.795c.945-.015 1.62.87 1.845 1.23c1.08 1.815 2.805 1.305 3.495.99c.105-.78.42-1.305.765-1.605c-2.67-.3-5.46-1.335-5.46-5.925c0-1.305.465-2.385 1.23-3.225c-.12-.3-.54-1.53.12-3.18c0 0 1.005-.315 3.3 1.23c.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23c.66 1.65.24 2.88.12 3.18c.765.84 1.23 1.905 1.23 3.225c0 4.605-2.805 5.625-5.475 5.925c.435.375.81 1.095.81 2.22c0 1.605-.015 2.895-.015 3.3c0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12\" clip-rule=\"evenodd\" />\n		</g>\n		<defs>\n			<clipPath id=\"SVGXv8lpc2Y\">\n				<path fill=\"#fff\" d=\"M0 0h24v24H0z\" />\n			</clipPath>\n		</defs>\n	</g>\n</svg>\n",
				"minus": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"1em\" height=\"1em\" viewBox=\"0 0 24 24\">\n	<path d=\"M0 0h24v24H0z\" fill=\"none\" />\n	<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M5 12h14\" />\n</svg>\n",
				"more": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"1em\" height=\"1em\" viewBox=\"0 0 24 24\">\n	<path d=\"M0 0h24v24H0z\" fill=\"none\" />\n	<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\">\n		<circle cx=\"12\" cy=\"12\" r=\"1\" />\n		<circle cx=\"19\" cy=\"12\" r=\"1\" />\n		<circle cx=\"5\" cy=\"12\" r=\"1\" />\n	</g>\n</svg>\n",
				"npm": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"1em\" height=\"1em\" viewBox=\"0 0 128 128\">\n	<path d=\"M0 0h128v128H0z\" fill=\"none\" />\n	<path fill=\"#cb3837\" d=\"M0 7.062C0 3.225 3.225 0 7.062 0h113.88c3.838 0 7.063 3.225 7.063 7.062v113.88c0 3.838-3.225 7.063-7.063 7.063H7.062c-3.837 0-7.062-3.225-7.062-7.063zm23.69 97.518h40.395l.05-58.532h19.494l-.05 58.581h19.543l.05-78.075l-78.075-.1l-.1 78.126z\" />\n	<path fill=\"#fff\" d=\"M25.105 65.52V26.512H40.96c8.72 0 26.274.034 39.008.075l23.153.075v77.866H83.645v-58.54H64.057v58.54H25.105z\" />\n</svg>\n",
				"plus": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"1em\" height=\"1em\" viewBox=\"0 0 24 24\">\n	<path d=\"M0 0h24v24H0z\" fill=\"none\" />\n	<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M5 12h14m-7-7v14\" />\n</svg>\n",
				"publish": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"1em\" height=\"1em\" viewBox=\"0 0 24 24\">\n	<path d=\"M0 0h24v24H0z\" fill=\"none\" />\n	<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\">\n		<path d=\"M12 13v8m-8-6.101A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242\" />\n		<path d=\"m8 17l4-4l4 4\" />\n	</g>\n</svg>\n",
				"pull": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"1em\" height=\"1em\" viewBox=\"0 0 24 24\">\n	<path d=\"M0 0h24v24H0z\" fill=\"none\" />\n	<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M12 5v14m7-7l-7 7l-7-7\" />\n</svg>\n",
				"push": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"1em\" height=\"1em\" viewBox=\"0 0 24 24\">\n	<path d=\"M0 0h24v24H0z\" fill=\"none\" />\n	<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"m5 12l7-7l7 7m-7 7V5\" />\n</svg>\n",
				"refresh": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"1em\" height=\"1em\" viewBox=\"0 0 24 24\">\n	<path d=\"M0 0h24v24H0z\" fill=\"none\" />\n	<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\">\n		<path d=\"M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8\" />\n		<path d=\"M21 3v5h-5\" />\n	</g>\n</svg>\n"
			}[name];
			if (raw === void 0) throw new Error(`dsh-cool-git: missing icon asset '${name}.svg'`);
			return {
				viewBox: /viewBox="([^"]+)"/.exec(raw)?.[1] ?? "0 0 24 24",
				inner: /<svg[^>]*>([\s\S]*)<\/svg>/.exec(raw)?.[1] ?? ""
			};
		}
		/**
		* Build one icon component from an asset's raw SVG markup.
		*
		* @param name - the asset filename stem.
		* @returns a component rendering exactly that artwork.
		*/
		function svgIcon(name) {
			const { viewBox, inner } = iconArtwork(name);
			return () => (0, react.createElement)("svg", {
				viewBox,
				"aria-hidden": "true",
				focusable: "false",
				dangerouslySetInnerHTML: { __html: inner }
			});
		}
		/** The Workspace glyph: the project directory the session's repository lives in (assets/folder.svg). */
		const IconFolder = svgIcon("folder");
		/** The branch glyph beside the branch name (assets/branch.svg). */
		const IconBranch = svgIcon("branch");
		/**
		* The Pull glyph: an arrow pointing at this working tree (assets/pull.svg).
		*
		* Pull and push are one picture with the arrow reversed, which is what makes the
		* pair readable at 13px beside their counts.
		*/
		const IconPull = svgIcon("pull");
		/** The Push glyph: the same arrow leaving this working tree (assets/push.svg). */
		const IconPush = svgIcon("push");
		/**
		* Publish this branch: send it to the remote and record the remote as its
		* upstream (assets/publish.svg).
		*
		* A cloud with an arrow into it rather than the push arrow, because this is not
		* the same act: Push sends what a branch and its upstream have between them,
		* Publish decides that the two are related at all.
		*/
		const IconPublish = svgIcon("publish");
		svgIcon("refresh");
		/**
		* The toolbar's overflow trigger: the mark that opens the More menu
		* (assets/more.svg).
		*
		* One control for the operations the sidebar's first row cannot afford a button
		* each — Refresh, Merge from — which is also why the glyph is a mark for a list
		* rather than for any one of them.
		*/
		const IconMore = svgIcon("more");
		/**
		* Copy the patch on screen: the Diff pane header's copy control
		* (assets/copy.svg).
		*/
		const IconCopy = svgIcon("copy");
		/**
		* The mark the copy control swaps to while it reports success (assets/check.svg).
		*
		* A state rather than a subject, and the one asset here that is: it is drawn from
		* the same 24-unit set as the mark it replaces, which is what keeps the swap from
		* changing the button's stroke weight.
		*/
		const IconCheck = svgIcon("check");
		/**
		* The disclosure mark on a file's title in a multi-file patch
		* (assets/arrow-right.svg).
		*
		* Drawn pointing right — at the code when the file is closed — and turned a
		* quarter by the stylesheet once the file is open, so one asset covers both
		* states and the glyph reads as the same control either way.
		*/
		const IconArrowRight = svgIcon("arrow-right");
		/**
		* The warning on a branch Git will refuse to delete (assets/alert.svg).
		*
		* A ring with an exclamation rather than a filled triangle: the mark says this
		* row cannot go through, not that the dialog has already failed, and the
		* platform's tooltip beside it carries the reason. Only the rows that have
		* something to refuse are drawn with one — a safe row is quiet.
		*/
		const IconAlert = svgIcon("alert");
		/**
		* The commit form's Generate control: the model writes the message that the
		* Commit button beside it would otherwise be handed (assets/generate.svg).
		*
		* A spark rather than a pen or a wand, because what it asks for is not an edit
		* of the text in the field but a reading of the changes behind it. It is the one
		* glyph on the page that stands for a model call, and it sits at the field's own
		* left edge so the pair reads as "write this, then commit it".
		*/
		const IconGenerate = svgIcon("generate");
		/**
		* Move a path into the index (assets/plus.svg).
		*
		* The changed-path row's trailing action, shown on the row's unstaged half. A
		* bare plus rather than a filled button: the row is 24px tall and the action is
		* about the row, not a control beside it, so the glyph is the whole of it.
		*/
		const IconPlus = svgIcon("plus");
		/** Move a path out of the index (assets/minus.svg). */
		const IconMinus = svgIcon("minus");
		/**
		* Discard a path's unstaged change (assets/discard.svg).
		*
		* The changed-path row's leading action on its unstaged half: the arrow turns
		* back on itself, which is what "undo this edit" looks like without borrowing
		* the trash can's promise of deletion — a tracked path is restored from the
		* index rather than removed.
		*/
		const IconDiscard = svgIcon("discard");
		svgIcon("chevron-down");
		/**
		* The GitHub mark (assets/github.svg).
		*
		* Drawn in the platform's own 24-unit set and riding `currentColor`, so it tints
		* with the link that carries it. It is the repository's own brand rather than a
		* generic "external link" arrow: on the plugin page the two marks beside it and
		* this one are the plugin's paper trail, and each names a place by its mark.
		*/
		const IconGithub = svgIcon("github");
		/**
		* The npm mark (assets/npm.svg).
		*
		* The one asset here that keeps its own color: npm's red is the recognisable
		* part of the mark, and a monochrome glyph at 16px would read as a generic box.
		*/
		const IconNpm = svgIcon("npm");
		//#endregion
		//#region src/client/layout.tsx
		/**
		* The Git page's two resizable boundaries, and the sizes they remember.
		*
		* The page is a fixed sidebar beside an absorbing Diff pane, and both of its
		* boundaries are the reader's to move: the sidebar's right edge sets its width,
		* and the divider between Changed files and Commit history sets how the column is
		* split. Each boundary is therefore one number — a width in CSS pixels, and the
		* share of the pane track that the changed-path list takes — and neither number is
		* repository state: they are a preference for a window, kept in localStorage under
		* this plugin's own key, the way the Terminal tab keeps its own.
		*
		* Every bound is stated once, here, and `styles.ts` interpolates these constants
		* into the rules that enforce them at rest. A drag and a stylesheet that disagreed
		* about the narrowest sidebar would be a divider that stops where the pointer does
		* not; two numbers in two files would drift.
		*
		* A drag never renders React. The pointer writes the boundary's own custom
		* property on the page root — `--dsh-cg-side-width`, `--dsh-cg-files-grow` and
		* `--dsh-cg-history-grow` — and only the release records one layout, into the
		* page's state and localStorage together. That keeps the frame rate of a drag
		* independent of how many thousand diff rows the page happens to be drawing; DSH's
		* own transcript width handle (client-ui-conversation's `ConversationWidthControls`)
		* makes the same trade for the same reason.
		*/
		/** The localStorage entry holding both boundaries, as one JSON object. */
		const LAYOUT_KEY = "dsh-cool-git.layout.v1";
		/** The layout of a page nobody has resized. */
		const DEFAULT_LAYOUT = {
			sideWidth: 340,
			filesShare: .5
		};
		/**
		* The saved layout, with every part that is missing or unusable replaced by its
		* default.
		*
		* A saved value is a preference written in another window size, by another version
		* of this page, in a browser that may not give the entry back at all, so it is read
		* as data rather than trusted: each field is checked on its own — a width has to be
		* a positive number, a share strictly between 0 and 1 — and anything else (an
		* unreadable entry, a JSON error, a field of the wrong shape) falls back to the
		* default for that field alone.
		*
		* @returns the layout to draw, always usable.
		*/
		function readLayout() {
			let raw;
			try {
				raw = localStorage.getItem(LAYOUT_KEY);
			} catch {
				return DEFAULT_LAYOUT;
			}
			if (raw === null) return DEFAULT_LAYOUT;
			let parsed;
			try {
				parsed = JSON.parse(raw);
			} catch {
				return DEFAULT_LAYOUT;
			}
			const { sideWidth, filesShare } = typeof parsed === "object" && parsed !== null ? parsed : {};
			return {
				sideWidth: typeof sideWidth === "number" && Number.isFinite(sideWidth) && sideWidth > 0 ? sideWidth : DEFAULT_LAYOUT.sideWidth,
				filesShare: typeof filesShare === "number" && Number.isFinite(filesShare) && filesShare > 0 && filesShare < 1 ? filesShare : DEFAULT_LAYOUT.filesShare
			};
		}
		/**
		* Record the layout.
		*
		* A storage that refuses the write (quota, or third-party storage blocked) is not
		* worth surfacing: no repository state is involved, and the drag holds for as long
		* as this page is open either way.
		*
		* @param layout - the layout to save.
		*/
		function writeLayout(layout) {
			try {
				localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout));
			} catch {}
		}
		/**
		* The widest the sidebar may be drawn in a page this wide.
		*
		* Two bounds at once: the width a sidebar stops being worth dragging past, and
		* what is left of the page once the Diff pane keeps its own floor. The sidebar's
		* floor wins when the window cannot hold both, so a narrow window still draws a
		* whole sidebar and leaves the Diff pane to suffer — a sidebar narrower than its
		* own toolbar would have no honest reading at all.
		*
		* @param available - the page's width, in CSS pixels.
		* @returns the widest sidebar to draw.
		*/
		function sideWidthCeiling(available) {
			return Math.max(260, Math.min(560, available - 320));
		}
		/**
		* Clamp a preferred sidebar width to what this page can draw.
		*
		* @param preferred - the width the pointer, or the saved layout, asks for.
		* @param available - the page's width, in CSS pixels.
		* @returns the width to draw.
		*/
		function clampSideWidth(preferred, available) {
			return Math.min(Math.max(preferred, 260), sideWidthCeiling(available));
		}
		/**
		* The tallest the Changed files pane may be drawn, inside the track it shares
		* with Commit history.
		*
		* A track too short to hold both floors leaves the one pane at its floor, which is
		* the same answer the stylesheet's own `min-height` gives.
		*
		* @param track - the height the two panes share, in CSS pixels.
		* @returns the tallest the upper pane may be.
		*/
		function splitCeiling(track) {
			return Math.max(96, track - 96);
		}
		/**
		* Clamp a preferred Changed files height to the track it shares with Commit history.
		*
		* @param preferred - the height the pointer asks for, in CSS pixels.
		* @param track - the height the two panes share, in CSS pixels.
		* @returns the height to draw.
		*/
		function clampFilesHeight(preferred, track) {
			return Math.min(Math.max(preferred, 96), splitCeiling(track));
		}
		/**
		* The share of one track a pane height means.
		*
		* The share rather than the height is what gets saved: the CSS grows the two panes
		* by their shares, so a split dragged in a short window is still the same split
		* when the window grows, and no window change can leave one pane at a height that
		* no longer fits. A track too short to measure keeps the default split, and the
		* floors keep the answer strictly inside 0–1 whatever the track is.
		*
		* @param height - the Changed files pane's height, in CSS pixels.
		* @param track - the height the two panes share, in CSS pixels.
		* @returns the share to draw and save.
		*/
		function shareOf(height, track) {
			if (!(track > 0)) return DEFAULT_LAYOUT.filesShare;
			const floor = Math.min(96 / track, .5);
			return Math.min(Math.max(height / track, floor), 1 - floor);
		}
		/**
		* The pointer's own coordinate on one axis, in viewport pixels.
		*
		* @param axis - the boundary being dragged.
		* @param event - the pointer event.
		* @returns X for the sidebar's width, Y for the panes' divider.
		*/
		function along(axis, event) {
			return axis === "col" ? event.clientX : event.clientY;
		}
		/**
		* One boundary, dragged with the pointer.
		*
		* The gesture is the platform's own width handle (client-ui-conversation's
		* `WidthHandle`), stated once for either axis and for a size rather than a width:
		* the press captures the pointer and records where it started and the size the page
		* was drawing, each move asks the caller to draw the size the pointer now implies —
		* at most once a frame, since a pointer reports more often than a page paints — and
		* the release records that one number. A press that never moved records nothing, so
		* a click on a boundary cannot overwrite a saved size with the window-clamped size
		* it happens to be drawn at.
		*
		* The two terminal paths mean different things. `onCommit` is a new size to record
		* and draw; `onEnd` is a gesture that produced no size — a click, or a pointer lost
		* mid-drag — and the caller draws the recorded layout again, which is what makes a
		* cancelled drag leave the page exactly as it found it.
		*
		* The element sits on the boundary itself, which is a 1px line a pointer cannot be
		* asked to hold, so the stylesheet puts an invisible 8px band around it and this
		* component owns the line in the middle.
		*/
		function ResizeHandle(props) {
			/** Whether a gesture this component started is still running. */
			const dragging = (0, react.useRef)(false);
			/** The pointer's coordinate where the gesture started. */
			const origin = (0, react.useRef)(0);
			/** The size the page was drawing where the gesture started. */
			const start = (0, react.useRef)(0);
			/** The pointer's latest coordinate on this axis. */
			const latest = (0, react.useRef)(0);
			/** The frame awaiting the pointer's latest coordinate, if one is. */
			const frame = (0, react.useRef)(null);
			const live = (0, react.useRef)(props);
			live.current = props;
			/** The size the pointer's latest coordinate implies. */
			const implied = () => start.current + (latest.current - origin.current);
			const cancelFrame = () => {
				if (frame.current !== null) {
					cancelAnimationFrame(frame.current);
					frame.current = null;
				}
			};
			/**
			* End the gesture, and either record a size or re-state the layout.
			*
			* @param element - the handle the gesture was captured on.
			* @param pointerId - the pointer to release.
			* @param moved - whether this release holds a size the pointer chose.
			*/
			const settle = (element, pointerId, moved) => {
				dragging.current = false;
				element.toggleAttribute("data-dragging", false);
				if (element.hasPointerCapture(pointerId)) element.releasePointerCapture(pointerId);
				cancelFrame();
				if (moved && latest.current !== origin.current) live.current.onCommit(implied());
				else live.current.onEnd();
			};
			const onPointerDown = (0, react.useCallback)((event) => {
				if (event.button !== 0) return;
				event.preventDefault();
				event.currentTarget.setPointerCapture(event.pointerId);
				event.currentTarget.toggleAttribute("data-dragging", true);
				origin.current = along(live.current.axis, event);
				latest.current = origin.current;
				start.current = live.current.onStart();
				dragging.current = true;
			}, []);
			const onPointerMove = (0, react.useCallback)((event) => {
				if (!dragging.current) return;
				if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
				latest.current = along(live.current.axis, event);
				if (frame.current !== null) return;
				frame.current = requestAnimationFrame(() => {
					frame.current = null;
					live.current.onDrag(implied());
				});
			}, []);
			const onPointerUp = (0, react.useCallback)((event) => {
				if (!dragging.current) return;
				if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
				latest.current = along(live.current.axis, event);
				settle(event.currentTarget, event.pointerId, true);
			}, []);
			const onPointerCancel = (0, react.useCallback)((event) => {
				if (!dragging.current) return;
				settle(event.currentTarget, event.pointerId, false);
			}, []);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: props.axis === "col" ? "dsh-cg-resize dsh-cg-col-resize" : "dsh-cg-resize dsh-cg-row-resize",
				onPointerDown,
				onPointerMove,
				onPointerUp,
				onPointerCancel,
				onLostPointerCapture: onPointerCancel
			});
		}
		//#endregion
		//#region src/client/styles.ts
		/**
		* Package-owned stylesheet for the Git tab.
		*
		* Two jobs live here.
		*
		* 1. The Conversation shell keeps its composer seat mounted for every View, so
		*    the Git page removes it. The handle the View root declares —
		*    `data-conversation-composer-overlay` — is the shell's own opt-in and drops
		*    the transcript width handles; the seat itself is hidden by this rule and by
		*    the mounted View (`chrome.ts`), so the seat is gone on every frame the
		*    shell paints, not only after the mount effect has run. The selector is
		*    scoped by this plugin's own root class, which exists only while the Git tab
		*    is mounted: Chat, Trajectory and Terminal keep their composer untouched, and
		*    the rule disappears with the View.
		*
		* 2. The page itself: a sidebar of two stacked panes (Changed files above
		*    Commit history) beside a scrollable Diff pane. Both of the sidebar's
		*    boundaries — its right edge and the divider between the panes — are dragged,
		*    and the bounds they move within are imported from `layout.tsx` rather than
		*    restated, so the width a drag may reach and the width a rule allows cannot
		*    drift apart.
		*
		* Every color is a `--dsw-*` theme token, so the tab follows the active light
		* or dark appearance — including third-party theme presets — instead of forcing
		* a palette of its own. The diff's own greens and reds are the platform's
		* dedicated diff tokens, which is what makes the diff read the same as the
		* diffs the tool cards already draw.
		*
		* One optional collaborator: while `dsh-cool-theme` has a wallpaper mounted it
		* adds `ct-bg-on` to the document, and section 4 below clears the page's own
		* canvas tokens so the image shows through this tab as it does through the rest
		* of the shell.
		*/
		/** Class the Git View renders on its root; the stylesheet's only anchor. */
		const GIT_ROOT_CLASS = "dsh-cg-root";
		/** CSS rules, one selector per line. */
		const GIT_CSS = [
			`[data-conversation-scroll]:has(.${GIT_ROOT_CLASS})>[data-composer-seat]{display:none}`,
			`.${GIT_ROOT_CLASS}{display:flex;flex:1 1 auto;flex-direction:row;box-sizing:border-box;width:100%;height:100%;min-height:0;overflow:hidden;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-family:var(--dsw-font-family,sans-serif);font-size:12.5px;line-height:1.5}`,
			`.${GIT_ROOT_CLASS} *{box-sizing:border-box}`,
			`.dsh-cg-side{position:relative;flex:none;display:flex;flex-direction:column;width:var(--dsh-cg-side-width,340px);min-width:260px;max-width:min(560px,calc(100% - 320px));min-height:0;border-right:.5px solid var(--dsw-alias-border-l3);background:transparent}`,
			`.dsh-cg-pane{display:flex;flex-direction:column;flex:1 1 0;min-height:96px}`,
			".dsh-cg-files{position:relative;flex-grow:var(--dsh-cg-files-grow,1)}",
			".dsh-cg-history{flex-grow:var(--dsh-cg-history-grow,1)}",
			".dsh-cg-pane+.dsh-cg-pane{border-top:.5px solid var(--dsw-alias-border-l3)}",
			".dsh-cg-resize{position:absolute;z-index:2;touch-action:none}",
			".dsh-cg-resize::before{content:\"\";position:absolute;opacity:0;transition:opacity .12s ease-out}",
			".dsh-cg-resize::after{content:\"\";position:absolute}",
			".dsh-cg-resize:hover::before,.dsh-cg-resize[data-dragging]::before{opacity:1}",
			".dsh-cg-col-resize{top:0;right:-1px;bottom:0;width:1px;cursor:col-resize}",
			".dsh-cg-col-resize::after{inset:0 -4px}",
			".dsh-cg-col-resize::before{inset:0;background:linear-gradient(to bottom,transparent,var(--dsw-alias-label-caption) 50%,transparent) center / 1px 100% no-repeat}",
			".dsh-cg-row-resize{right:0;bottom:-1px;left:0;height:1px;cursor:row-resize}",
			".dsh-cg-row-resize::after{inset:-4px 0}",
			".dsh-cg-row-resize::before{inset:0;background:linear-gradient(to right,transparent,var(--dsw-alias-label-caption) 50%,transparent) center / 100% 1px no-repeat}",
			`.${GIT_ROOT_CLASS}[data-resizing],.${GIT_ROOT_CLASS}[data-resizing] *{user-select:none}`,
			`.${GIT_ROOT_CLASS}[data-resizing=col],.${GIT_ROOT_CLASS}[data-resizing=col] *{cursor:col-resize}`,
			`.${GIT_ROOT_CLASS}[data-resizing=row],.${GIT_ROOT_CLASS}[data-resizing=row] *{cursor:row-resize}`,
			".dsh-cg-head{flex:none;display:flex;align-items:center;gap:8px;height:30px;padding:0 6px 0 12px}",
			".dsh-cg-head-title{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-secondary);font-size:11px;font-weight:600;letter-spacing:.02em}",
			".dsh-cg-list{flex:1 1 auto;min-height:0;overflow:auto;padding:0 8px 8px 8px}",
			".dsh-cg-list,.dsh-cg-branch-list,.dsh-cg-diff,.dsh-cg-file-body{--dsh-scrollbar-thumb:transparent;--dsh-scrollbar-thumb-hover:var(--dsw-alias-scrollbar-hover-l2)}",
			".dsh-cg-list:hover,.dsh-cg-branch-list:hover,.dsh-cg-diff:hover,.dsh-cg-file-body:hover{--dsh-scrollbar-thumb:var(--dsw-alias-scrollbar-bg-l2)}",
			".dsh-cg-icon{flex:none;display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;padding:0;border:0;border-radius:var(--dsw-radius-sm,6px);background:transparent;color:var(--dsw-alias-label-tertiary);font:inherit;cursor:pointer}",
			".dsh-cg-icon:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}",
			".dsh-cg-icon:disabled{opacity:.45;cursor:default}",
			".dsh-cg-icon:disabled:hover{background:transparent;color:var(--dsw-alias-label-tertiary)}",
			".dsh-cg-icon svg{width:13px;height:13px;display:block}",
			".dsh-cg-sync{width:auto;min-width:22px;gap:4px;padding:0 5px}",
			".dsh-cg-sync-arrow{flex:none;display:inline-flex;align-items:center;gap:2px;color:var(--dsw-alias-label-tertiary)}",
			".dsh-cg-sync-arrow[data-pending=true]{color:var(--dsw-alias-label-secondary)}",
			".dsh-cg-sync-count{flex:none;font-family:var(--ds-font-family-code,ui-monospace,monospace);font-size:10.5px;font-variant-numeric:tabular-nums}",
			".dsh-cg-tip{display:inline-flex}",
			".dsh-cg-tip:has(:disabled){cursor:default}",
			".dsh-cg-tip .dsh-cg-icon:disabled,.dsh-cg-tip .dsh-cg-branch:disabled{pointer-events:none}",
			"@keyframes dsh-cg-spin{to{transform:rotate(360deg)}}",
			".dsh-cg-icon[data-busy=true] svg,.dsh-cg-branch-icon[data-busy=true] svg,.dsh-cg-sync-arrow[data-busy=true] svg,.dsh-cg-commit-generate[data-busy=true] svg{animation:dsh-cg-spin .9s linear infinite}",
			".dsh-cg-side-head{flex:none;display:flex;align-items:center;height:34px;padding:0 6px 0 10px}",
			".dsh-cg-workspace{flex:1 1 auto;display:flex;align-items:center;gap:4px;min-width:0;margin-right:6px;font-size:12px;font-weight:600;color:var(--dsw-alias-label-primary)}",
			".dsh-cg-workspace-icon{flex:none;display:inline-flex;align-items:center;width:13px;height:13px;color:var(--dsw-alias-label-tertiary)}",
			".dsh-cg-workspace-icon svg{width:13px;height:13px;display:block}",
			".dsh-cg-workspace-name{min-width:calc(100% - 16px);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
			".dsh-cg-tools{flex:none;display:flex;align-items:center;margin-left:auto}",
			".dsh-cg-divergence{flex:none;margin-left:4px;color:var(--dsw-alias-label-tertiary);font-family:var(--ds-font-family-code,ui-monospace,monospace);font-size:11px}",
			".dsh-cg-branch{display:inline-flex;align-items:center;min-width:24px;max-width:130px;height:22px;padding:0 6px;border:0;border-radius:var(--dsw-radius-sm,6px);background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:11px;cursor:pointer}",
			".dsh-cg-branch:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}",
			".dsh-cg-branch:disabled{opacity:.45;cursor:default}",
			".dsh-cg-branch-icon{flex:none;display:inline-flex;align-items:center;width:12px;height:12px;margin-right:4px;color:var(--dsw-alias-label-tertiary)}",
			".dsh-cg-branch-icon svg{width:12px;height:12px;display:block}",
			".dsh-cg-branch-name{flex:0 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:left}",
			".dsh-cg-branch-tip{flex:0 1000 auto;min-width:24px}",
			".dsh-cg-branch-tip:has(.dsh-cg-divergence){min-width:54px}",
			".dsh-cg-branch-body{display:flex;flex-direction:column;min-width:0}",
			".dsh-cg-branch-filter,.dsh-cg-branch-list,.dsh-cg-branch-row,.dsh-cg-delete-row{box-sizing:border-box}",
			".dsh-cg-branch-filter{flex:none;width:100%}",
			".dsh-cg-branch-dialog{width:min(450px,100%)}",
			".dsh-cg-discard-dialog{width:min(420px,100%)}",
			".dsh-cg-discard-dialog .dsh-cg-discard-confirm{background:var(--dsw-alias-state-error-primary);color:var(--dsw-alias-label-primary-foreground)}",
			".dsh-cg-discard-dialog .dsh-cg-discard-confirm:hover:not(:disabled){background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 86%,#000)}",
			".dsh-cg-branch-dialog .dsh-cg-delete-confirm{background:var(--dsw-alias-state-error-primary);color:var(--dsw-alias-label-primary-foreground)}",
			".dsh-cg-branch-dialog .dsh-cg-delete-confirm:hover:not(:disabled){background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 86%,#000)}",
			".dsh-cg-delete-spinner{display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px}",
			".dsh-cg-delete-spinner svg{display:block;width:14px;height:14px;animation:dsh-cg-spin .9s linear infinite}",
			".dsh-cg-branch-dialog .dsh-cg-delete-confirm-busy:disabled{opacity:1;cursor:progress}",
			".dsh-cg-branch-list-wrap{position:relative;display:flex;flex-direction:column;min-height:0;margin-top:8px}",
			".dsh-cg-branch-list{flex:1;min-height:0;display:flex;flex-direction:column;gap:1px;max-height:min(360px,40vh);overflow-x:hidden;overflow-y:auto}",
			".dsh-cg-branch-fade{position:absolute;left:0;right:var(--dsh-cg-fade-right,0);height:28px;pointer-events:none;opacity:0;transition:opacity .15s ease;z-index:2}",
			".dsh-cg-branch-fade-top{top:0;background:linear-gradient(to bottom,var(--dsw-alias-bg-layer-2),rgba(0,0,0,0))}",
			".dsh-cg-branch-fade-bottom{bottom:0;background:linear-gradient(to top,var(--dsw-alias-bg-layer-2),rgba(0,0,0,0))}",
			".dsh-cg-branch-list-wrap[data-fade-top] .dsh-cg-branch-fade-top{opacity:1}",
			".dsh-cg-branch-list-wrap[data-fade-bottom] .dsh-cg-branch-fade-bottom{opacity:1}",
			".dsh-cg-branch-group{flex:none;margin-top:8px;padding:0 8px;color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:18px}",
			".dsh-cg-branch-group:first-child{margin-top:0}",
			".dsh-cg-branch-row{flex:none;display:flex;align-items:center;gap:8px;width:100%;height:28px;padding:0 8px;border:0;border-radius:var(--dsw-radius-sm,6px);background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;text-align:left;cursor:pointer}",
			".dsh-cg-branch-row:hover{background:var(--dsw-alias-interactive-bg-hover)}",
			".dsh-cg-branch-row[aria-selected=true]{background:var(--dsw-alias-interactive-bg-active)}",
			".dsh-cg-branch-row-name{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:var(--ds-font-family-code,ui-monospace,monospace)}",
			".dsh-cg-branch-create-name{flex:1 1 auto;min-width:0;height:36px;box-sizing:border-box}",
			".dsh-cg-delete-row{flex:none;display:flex;align-items:center;gap:8px;width:100%;height:28px;padding:0 8px;border-radius:var(--dsw-radius-sm,6px);color:var(--dsw-alias-label-primary);font-size:12px;cursor:pointer}",
			".dsh-cg-delete-row:hover{background:var(--dsw-alias-interactive-bg-hover)}",
			".dsh-cg-delete-row:has(.dsh-cg-delete-check:checked){background:var(--dsw-alias-interactive-bg-active)}",
			".dsh-cg-delete-row:has(.dsh-cg-delete-check:disabled){cursor:default}",
			".dsh-cg-delete-row:has(.dsh-cg-delete-check:disabled):hover{background:transparent}",
			".dsh-cg-delete-check{flex:none;margin:0;accent-color:var(--dsw-alias-state-error-primary)}",
			".dsh-cg-delete-name{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:var(--ds-font-family-code,ui-monospace,monospace)}",
			".dsh-cg-delete-trail{flex:none;display:flex;align-items:center;justify-content:flex-end;min-width:16px}",
			".dsh-cg-delete-alert{display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;color:var(--dsw-alias-state-warn-primary);cursor:help}",
			".dsh-cg-delete-alert svg{display:block;width:14px;height:14px}",
			".dsh-cg-dialog-hint{margin:0;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:1.7}",
			".dsh-cg-branch-filter+.dsh-cg-dialog-hint{margin-top:8px}",
			".dsh-cg-branch-list-wrap+.dsh-cg-dialog-hint{margin-top:8px}",
			".dsh-cg-dialog-body{display:flex;flex-direction:column;gap:8px}",
			".dsh-cg-dialog-text{margin:0;font-size:13px;line-height:20px;color:var(--dsw-alias-state-error-primary);white-space:pre-wrap;word-break:break-word}",
			".dsh-cg-settings-dialog{width:min(620px,100%)}",
			".dsh-cg-settings-body{display:flex;flex-direction:column;gap:16px;min-width:0}",
			".dsh-cg-settings-field{display:flex;flex-direction:column;gap:8px;min-width:0}",
			".dsh-cg-settings-label{color:var(--dsw-alias-label-primary);font-size:12px;font-weight:600;line-height:18px}",
			".dsh-cg-settings-picker{display:flex;flex-direction:column;min-width:0}",
			".dsh-cg-settings-picker-trigger{display:flex;align-items:center;justify-content:space-between;gap:8px;box-sizing:border-box;width:100%;height:36px;padding:0 10px;border:.5px solid var(--dsw-alias-border-l4);border-radius:var(--dsw-radius-sm,6px);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font:inherit;font-size:12.5px;line-height:34px;text-align:left;cursor:pointer}",
			".dsh-cg-settings-picker-trigger:hover:not(:disabled){border-color:var(--dsw-alias-border-l3)}",
			".dsh-cg-settings-picker-trigger:focus-visible{outline:none;border-color:var(--dsw-alias-state-business-primary)}",
			".dsh-cg-settings-picker-trigger:disabled{opacity:.6;cursor:default}",
			".dsh-cg-settings-picker-value{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
			".dsh-cg-settings-picker-chevron{flex:none;display:inline-flex;align-items:center;justify-content:center;color:var(--dsw-alias-label-tertiary)}",
			".dsh-cg-settings-picker-chevron svg{display:block;width:14px;height:14px;transform:rotate(90deg);transition:transform .12s ease}",
			".dsh-cg-settings-picker-chevron[data-open=true] svg{transform:rotate(-90deg)}",
			".dsh-cg-settings-popover{position:fixed;box-sizing:border-box;display:flex;flex-direction:column;border:.5px solid var(--dsw-alias-border-l4);border-radius:var(--dsw-radius-sm,6px);background:var(--dsw-alias-bg-module-platform);box-shadow:var(--dsw-shadow-lv3,0 12px 32px rgba(0,0,0,.18));overflow:hidden}",
			".dsh-cg-settings-picker-search{flex:none;display:flex;align-items:center;height:40px;padding:0 12px;border-bottom:.5px solid var(--dsw-alias-border-l4)}",
			".dsh-cg-settings-picker-input{box-sizing:border-box;width:100%;height:100%;padding:0;border:0;outline:none;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:12.5px}",
			".dsh-cg-settings-picker-input::placeholder{color:var(--dsw-alias-label-tertiary)}",
			".dsh-cg-settings-picker-listwrap{position:relative;flex:1 1 auto;min-height:0}",
			".dsh-cg-settings-picker-list{height:100%;overflow-y:auto;scrollbar-width:none}",
			".dsh-cg-settings-picker-list::-webkit-scrollbar{display:none}",
			".dsh-cg-settings-picker-thumb{position:absolute;right:2px;z-index:2;width:5px;border-radius:999px;background:var(--dsw-alias-scrollbar-bg-l2);pointer-events:none}",
			".dsh-cg-settings-row{display:flex;align-items:center;gap:2px;min-width:0;}",
			".dsh-cg-settings-row:hover{background:var(--dsw-alias-interactive-bg-hover)}",
			".dsh-cg-settings-row[data-selected=true]{background:var(--dsw-alias-interactive-bg-active)}",
			".dsh-cg-settings-row-name{display:flex;align-items:center;gap:6px;flex:1 1 auto;min-width:0;padding:7px 4px 7px 8px;border:0;border-radius:var(--dsw-radius-xs,4px);background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:12.5px;line-height:20px;text-align:left;cursor:pointer}",
			".dsh-cg-settings-row-text{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
			".dsh-cg-settings-row-check{flex:none;display:inline-flex;color:var(--dsw-alias-state-business-primary)}",
			".dsh-cg-settings-row-check svg{display:block;width:12px;height:12px}",
			".dsh-cg-settings-row-effort{align-self:stretch;flex:none;display:inline-flex;align-items:center;gap:4px;padding:0 10px 0 8px;border:0;background:transparent;color:var(--dsw-alias-label-tertiary);font:inherit;font-size:12px;cursor:pointer}",
			".dsh-cg-settings-row-effort[data-static=true]{cursor:default}",
			"button.dsh-cg-settings-row-effort:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover)}",
			".dsh-cg-settings-row-arrow{display:inline-flex;align-items:center;justify-content:center}",
			".dsh-cg-settings-row-arrow svg{display:block;width:12px;height:12px;transform:rotate(90deg)}",
			".dsh-cg-settings-picker-group-sticky{position:sticky;top:0;z-index:1}",
			".dsh-cg-settings-picker-group-head{display:flex;align-items:center;justify-content:space-between;gap:8px;width:100%;padding:7px 10px 7px 8px;border:0;background:var(--dsw-alias-bg-overlay);color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;font-weight:600;line-height:20px;text-align:left;cursor:pointer}",
			".dsh-cg-settings-picker-group-arrow{flex:none;display:inline-flex;align-items:center;justify-content:center;color:var(--dsw-alias-label-tertiary)}",
			".dsh-cg-settings-picker-group-arrow svg{display:block;width:12px;height:12px;transform:rotate(0);transition:transform .12s ease}",
			".dsh-cg-settings-picker-group-arrow[data-open=true] svg{transform:rotate(90deg)}",
			".dsh-cg-settings-picker-group-name{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
			".dsh-cg-settings-effort-control{align-self:stretch}",
			".dsh-cg-settings-row-name:focus-visible,.dsh-cg-settings-row-effort:focus-visible,.dsh-cg-settings-picker-group-head:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:-2px}",
			".dsh-cg-settings-picker-rule{margin:6px 4px;border-top:.5px solid var(--dsw-alias-border-l3)}",
			".dsh-cg-settings-picker-empty{margin:8px 8px 10px;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}",
			".dsh-cg-settings-prompt:disabled{opacity:.6;cursor:default}",
			".dsh-cg-settings-prompt-frame{display:block;box-sizing:border-box;width:100%;border:.5px solid var(--dsw-alias-border-l4);border-radius:var(--dsw-radius-sm,6px);background:var(--dsw-alias-bg-layer-2)}",
			".dsh-cg-settings-prompt-frame:focus-within{border-color:var(--dsw-alias-state-business-primary)}",
			".dsh-cg-settings-prompt{display:block;box-sizing:border-box;width:100%;height:250px;padding:8px 10px;border:0;outline:none;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;line-height:1.6;resize:none}",
			".dsh-cg-settings-prompt-foot{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}",
			".dsh-cg-settings-note{margin:0;flex:1 1 auto;color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:1.5}",
			".dsh-cg-settings-reset{flex:none;padding:0;border:0;background:transparent;color:var(--dsw-alias-state-business-primary);font:inherit;font-size:11px;line-height:1.5;cursor:pointer}",
			".dsh-cg-settings-reset:hover:not(:disabled){text-decoration:underline}",
			".dsh-cg-settings-reset:disabled{color:var(--dsw-alias-label-dimmed);cursor:default}",
			".dsh-cg-commit-bar{flex:none;display:flex;flex-direction:column;gap:8px;padding:0px 10px 8px}",
			".dsh-cg-commit-frame{position:relative;box-sizing:border-box;width:100%;border:0.5px solid var(--dsw-alias-border-l4);border-radius:var(--dsw-radius-sm);background:var(--dsw-alias-bg-layer-2)}",
			".dsh-cg-commit-frame:focus-within{border-color:var(--dsw-alias-state-business-primary)}",
			".dsh-cg-commit-frame:has(.dsh-cg-commit-input:disabled){opacity:.6}",
			".dsh-cg-commit-input{display:block;box-sizing:border-box;width:100%;min-height:26px;max-height:86px;padding:3px 32px 3px 8px;border:0;outline:none;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;line-height:20px;resize:none;overflow-y:auto}",
			".dsh-cg-commit-input::placeholder{color:var(--dsw-alias-label-dimmed)}",
			".dsh-cg-commit-input:disabled{cursor:not-allowed}",
			".dsh-cg-commit-generate{position:absolute;top:1px;right:calc(var(--dsh-scrollbar-width,5px));display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;padding:0;border:0;border-radius:var(--dsw-radius-sm);background:transparent;color:var(--dsw-alias-label-tertiary);font:inherit;cursor:pointer;transition:color .12s ease}",
			".dsh-cg-commit-generate:hover:not(:disabled){color:var(--dsw-alias-label-primary)}",
			".dsh-cg-commit-generate:disabled{color:var(--dsw-alias-label-tertiary);opacity:.45;cursor:default}",
			".dsh-cg-commit-generate svg{width:14px;height:14px;display:block}",
			".dsh-cg-commit-actions{display:flex;align-items:stretch;width:100%}",
			".dsh-cg-commit-send{flex:1 1 auto;min-width:0;display:flex;align-items:center;justify-content:center;height:28px;padding:0 10px;border:0;border-radius:var(--dsw-radius-sm);background:var(--dsw-alias-button-primary-fill);color:var(--dsw-alias-label-primary-foreground);font:inherit;font-size:12px;line-height:18px;cursor:pointer;transition:background-color .12s ease,opacity .12s ease}",
			".dsh-cg-commit-send:hover:not(:disabled){background:var(--dsw-alias-button-primary-hover)}",
			".dsh-cg-commit-send:disabled{opacity:.4;cursor:not-allowed}",
			".dsh-cg-commit-label{flex:0 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
			".dsh-cg-commit-note{margin:0;white-space:pre-line;color:var(--dsw-alias-state-warn-primary);font-size:12px;line-height:1.45}",
			".dsh-cg-group{display:flex;flex-direction:column}",
			".dsh-cg-group+.dsh-cg-group{margin-top:4px}",
			".dsh-cg-group-head{position:relative;display:flex;align-items:center;height:24px;border-radius:var(--dsw-radius-sm,6px)}",
			".dsh-cg-group-head:hover{background:var(--dsw-alias-interactive-bg-hover)}",
			".dsh-cg-group-toggle{display:flex;align-items:center;gap:2px;width:100%;height:24px;padding:0 6px;border:0;border-radius:var(--dsw-radius-sm,6px);background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer}",
			".dsh-cg-group-chevron{flex:none;display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;color:var(--dsw-alias-label-tertiary);transition:transform .12s ease}",
			".dsh-cg-group-toggle[aria-expanded=true] .dsh-cg-group-chevron{transform:rotate(90deg)}",
			".dsh-cg-group-chevron svg{width:14px;height:14px;display:block}",
			".dsh-cg-group-label{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:var(--ds-font-family-code,ui-monospace,monospace);font-size:12px;font-weight:600;color:var(--dsw-alias-label-secondary)}",
			".dsh-cg-group-head[data-actions=stage] .dsh-cg-group-toggle{padding-right:26px}",
			".dsh-cg-group-head[data-actions=both] .dsh-cg-group-toggle{padding-right:46px}",
			".dsh-cg-group-head .dsh-cg-row-action{height:24px}",
			".dsh-cg-group-head:hover .dsh-cg-row-action:not(:disabled),.dsh-cg-group-head .dsh-cg-row-action:focus-visible{opacity:1;pointer-events:auto}",
			".dsh-cg-row-wrap{position:relative;display:flex;align-items:center;height:26px;padding-right:4px;border-radius:var(--dsw-radius-sm,6px)}",
			".dsh-cg-row-wrap:hover{background:var(--dsw-alias-interactive-bg-hover)}",
			".dsh-cg-row-wrap[data-selected=true]{background:var(--dsw-alias-interactive-bg-active)}",
			".dsh-cg-row{display:flex;align-items:center;gap:6px;flex:1 1 auto;min-width:0;height:26px;padding:0 26px 0 0;border:0;border-radius:var(--dsw-radius-sm,6px);background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer}",
			".dsh-cg-row-actions{position:absolute;right:2px;top:50%;transform:translateY(-50%);display:flex;align-items:center}",
			".dsh-cg-row-wrap[data-actions=both] .dsh-cg-row{padding-right:46px}",
			".dsh-cg-row-action{display:inline-flex;align-items:center;justify-content:center;width:22px;height:26px;padding:0;border:0;border-radius:var(--dsw-radius-sm,6px);background:transparent;color:var(--dsw-alias-label-tertiary);opacity:0;pointer-events:none;cursor:pointer;transition:opacity .1s ease,color .12s ease}",
			".dsh-cg-row-wrap:hover .dsh-cg-row-action:not(:disabled),.dsh-cg-row-wrap[data-selected=true] .dsh-cg-row-action:not(:disabled),.dsh-cg-row-wrap .dsh-cg-row-action:focus-visible{opacity:1;pointer-events:auto}",
			"@media (hover:none){.dsh-cg-row-action:not(:disabled){opacity:1;pointer-events:auto}}",
			".dsh-cg-row-action:hover:not(:disabled){color:var(--dsw-alias-label-primary)}",
			".dsh-cg-row-action:disabled{cursor:default}",
			".dsh-cg-row-action[data-busy=true]{opacity:1;pointer-events:auto}",
			".dsh-cg-row-action svg{width:16px;height:16px;display:block}",
			".dsh-cg-row-action[data-busy=true] svg{animation:dsh-cg-spin .9s linear infinite}",
			".dsh-cg-badge{flex:none;width:13px;text-align:center;font-family:var(--ds-font-family-code,ui-monospace,monospace);font-size:12px;font-weight:500;color:var(--dsw-alias-label-tertiary)}",
			".dsh-cg-badge[data-kind=added]{color:var(--dsw-alias-state-success-primary)}",
			".dsh-cg-badge[data-kind=modified]{color:var(--dsw-alias-state-warn-primary)}",
			".dsh-cg-badge[data-kind=deleted]{color:var(--dsw-alias-state-error-primary)}",
			".dsh-cg-badge[data-kind=conflicted]{color:var(--dsw-alias-state-error-primary)}",
			".dsh-cg-badge[data-kind=renamed]{color:var(--dsw-alias-brand-primary)}",
			".dsh-cg-badge[data-kind=copied]{color:var(--dsw-alias-brand-primary)}",
			".dsh-cg-badge[data-kind=typechange]{color:var(--dsw-alias-state-warn-primary)}",
			".dsh-cg-badge[data-kind=untracked]{color:var(--dsw-alias-state-idle-primary)}",
			".dsh-cg-path{display:flex;align-items:baseline;gap:4px;flex:1 1 auto;min-width:0;font-size:12px}",
			".dsh-cg-name{flex:0 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-primary)}",
			".dsh-cg-dot{flex:none;color:var(--dsw-alias-label-tertiary)}",
			".dsh-cg-dir{color:var(--dsw-alias-label-tertiary)}",
			".dsh-cg-path .dsh-cg-dir{flex:0 100000 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
			".dsh-cg-folder-wrap{position:relative;display:flex;align-items:center;height:24px;border-radius:var(--dsw-radius-sm,6px)}",
			".dsh-cg-folder-wrap:hover{background:var(--dsw-alias-interactive-bg-hover)}",
			".dsh-cg-folder-wrap .dsh-cg-row-action{height:24px}",
			".dsh-cg-folder-wrap:hover .dsh-cg-row-action:not(:disabled),.dsh-cg-folder-wrap .dsh-cg-row-action:focus-visible{opacity:1;pointer-events:auto}",
			".dsh-cg-folder-wrap[data-actions=stage] .dsh-cg-folder{padding-right:26px}",
			".dsh-cg-folder-wrap[data-actions=both] .dsh-cg-folder{padding-right:46px}",
			".dsh-cg-folder{display:flex;align-items:center;gap:2px;width:100%;height:24px;padding:0 6px;border:0;border-radius:var(--dsw-radius-sm,6px);background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer}",
			".dsh-cg-folder-chevron{flex:none;display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;color:var(--dsw-alias-label-tertiary);transition:transform .12s ease}",
			".dsh-cg-folder[aria-expanded=true] .dsh-cg-folder-chevron{transform:rotate(90deg)}",
			".dsh-cg-folder-chevron svg{width:14px;height:14px;display:block}",
			".dsh-cg-folder-name{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;color:var(--dsw-alias-label-secondary)}",
			".dsh-cg-folder-sep{margin:0 2px}",
			".dsh-cg-folder{padding-left:calc(6px + var(--dsh-cg-depth,0) * 14px)}",
			".dsh-cg-row-wrap{padding-left:calc(6px + var(--dsh-cg-depth,0) * 14px)}",
			".dsh-cg-commit{display:flex;flex-direction:column;gap:2px;width:100%;padding:5px 6px;border:0;border-radius:var(--dsw-radius-sm,6px);background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer}",
			".dsh-cg-commit:hover{background:var(--dsw-alias-interactive-bg-hover)}",
			".dsh-cg-commit[aria-selected=true]{background:var(--dsw-alias-interactive-bg-active)}",
			".dsh-cg-subject{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;color:var(--dsw-alias-label-primary)}",
			".dsh-cg-meta{display:flex;align-items:center;gap:6px;overflow:hidden;white-space:nowrap;font-size:10.5px;color:var(--dsw-alias-label-tertiary)}",
			".dsh-cg-hash{font-family:var(--ds-font-family-code,ui-monospace,monospace)}",
			".dsh-cg-refs{display:flex;flex-wrap:nowrap;gap:4px;overflow-x:auto;overflow-y:hidden;scrollbar-width:none}",
			".dsh-cg-refs::-webkit-scrollbar{display:none}",
			".dsh-cg-ref{flex:none;white-space:nowrap;padding:0 4px;border-radius:var(--dsw-radius-xs,4px);background:var(--dsw-alias-state-business-primary);color:var(--dsw-alias-label-primary-foreground);font-size:10px;line-height:14px}",
			".dsh-cg-note{padding:8px 12px;color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:1.7}",
			".dsh-cg-main{flex:1 1 auto;display:flex;flex-direction:column;min-width:0;min-height:0}",
			".dsh-cg-main-head{flex:none;display:flex;align-items:center;gap:8px;min-height:30px;padding:4px 8px 4px 12px;border-bottom:.5px solid var(--dsw-alias-border-l3);background:var(--dsw-alias-bg-base)}",
			".dsh-cg-main-title{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:var(--ds-font-family-code,ui-monospace,monospace);font-size:12px;color:var(--dsw-alias-label-secondary)}",
			".dsh-cg-main-subtitle{flex:none;max-width:45%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-tertiary);font-size:11px}",
			".dsh-cg-stats{flex:none;display:flex;gap:6px;font-family:var(--ds-font-family-code,ui-monospace,monospace);font-size:11px}",
			".dsh-cg-added{color:var(--dsw-alias-state-success-primary)}",
			".dsh-cg-deleted{color:var(--dsw-alias-state-error-primary)}",
			".dsh-cg-diff{flex:1 1 auto;min-height:0;overflow-x:hidden;overflow-y:auto;background:var(--dsw-alias-bg-base)}",
			".dsh-cg-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;height:100%;padding:24px;text-align:center;color:var(--dsw-alias-label-tertiary);user-select:none}",
			".dsh-cg-empty-title{font-size:14px;font-weight:600;color:var(--dsw-alias-label-secondary)}",
			".dsh-cg-empty-text{font-size:12px;max-width:60ch;line-height:1.7}",
			".dsh-cg-file-head{display:flex;align-items:center;gap:8px;padding:6px 12px;background:var(--dsw-alias-bg-layer-1);font-family:var(--ds-font-family-code,ui-monospace,monospace);font-size:11px}",
			".dsh-cg-file-path{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-secondary)}",
			".dsh-cg-file-head:not(:first-child),.dsh-cg-file-body:not(:first-child){border-top:.5px solid var(--dsw-alias-border-l3)}",
			".dsh-cg-diff>:last-child{border-bottom:.5px solid var(--dsw-alias-border-l3)}",
			".dsh-cg-file-toggle{flex:none;display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;padding:0;border:0;border-radius:var(--dsw-radius-xs,4px);background:transparent;color:var(--dsw-alias-label-tertiary);font:inherit;cursor:pointer}",
			".dsh-cg-file-toggle:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}",
			".dsh-cg-file-toggle svg{width:12px;height:12px;display:block;transition:transform .12s ease}",
			".dsh-cg-file-toggle[aria-expanded=true] svg{transform:rotate(90deg)}",
			".dsh-cg-file-body{overflow-x:auto;overflow-y:hidden}",
			".dsh-cg-file-scroll{width:max-content;min-width:100%}",
			".dsh-cg-hunk-head{padding:2px 12px;background:var(--dsw-alias-markdown-code-block-banner,var(--dsw-alias-bg-layer-2));color:var(--dsw-alias-label-tertiary);font-family:var(--ds-font-family-code,ui-monospace,monospace);font-size:11px;white-space:pre;overflow:hidden;text-overflow:ellipsis}",
			".dsh-cg-line{display:grid;grid-template-columns:44px 44px 14px minmax(0,1fr);width:max-content;min-width:100%;font-family:var(--ds-font-family-code,ui-monospace,monospace);font-size:12px;line-height:18px}",
			".dsh-cg-line[data-kind=add]{background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 20%,transparent)}",
			".dsh-cg-line[data-kind=del]{background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 20%,transparent)}",
			".dsh-cg-line[data-kind=meta]{color:var(--dsw-alias-label-tertiary)}",
			".dsh-cg-no{padding-right:8px;text-align:right;color:var(--dsw-alias-label-tertiary);user-select:none}",
			".dsh-cg-sign{user-select:none;color:var(--dsw-alias-label-tertiary)}",
			".dsh-cg-line[data-kind=add] .dsh-cg-sign{color:var(--dsw-alias-state-success-primary)}",
			".dsh-cg-line[data-kind=del] .dsh-cg-sign{color:var(--dsw-alias-state-error-primary)}",
			".dsh-cg-text{white-space:pre;padding-right:16px}",
			".dsh-cg-line[data-kind=meta] .dsh-cg-text{grid-column:1 / -1;padding-left:12px}",
			".dsh-cg-main-actions{flex:none;display:flex;align-items:center;gap:6px}",
			".dsh-cg-conflict-btn{display:inline-flex;align-items:center;justify-content:center;gap:4px;height:22px;padding:0 8px;border:.5px solid var(--dsw-alias-border-l3);border-radius:var(--dsw-radius-sm,6px);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);font:inherit;font-size:11px;line-height:1;white-space:nowrap;cursor:pointer}",
			".dsh-cg-conflict-btn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}",
			".dsh-cg-conflict-btn:disabled{opacity:.45;cursor:default}",
			".dsh-cg-conflict-btn[data-variant=primary]{border-color:transparent;background:var(--dsw-alias-state-success-primary);color:var(--dsw-alias-label-primary-foreground)}",
			".dsh-cg-conflict-btn[data-variant=primary]:hover:not(:disabled){background:var(--dsw-alias-state-success-primary);color:var(--dsw-alias-label-primary-foreground);filter:brightness(1.08)}",
			".dsh-cg-conflict-btn[data-variant=ghost]{border-color:transparent;background:transparent;color:var(--dsw-alias-label-tertiary)}",
			".dsh-cg-conflict-btn[data-variant=ghost]:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}",
			".dsh-cg-conflict-btn svg{width:12px;height:12px;display:block}",
			".dsh-cg-conflict-stream{display:flex;flex-direction:column;padding:8px 10px 14px}",
			".dsh-cg-conflict-card{flex:none;display:flex;flex-direction:column;min-width:0;margin:6px 0;border:.5px solid var(--dsw-alias-border-l4);border-radius:var(--dsw-radius-md,10px);background:color-mix(in srgb,var(--dsw-alias-bg-layer-2,var(--dsw-alias-bg-layer-1)) 30%,transparent);box-shadow:var(--dsw-shadow-lv1,0 1px 2px rgba(0,0,0,.06));overflow:hidden}",
			".dsh-cg-conflict-card[data-busy]{opacity:.6}",
			".dsh-cg-conflict-bar{display:flex;align-items:center;gap:8px;padding:4px 8px 4px 10px;border-bottom:.5px solid var(--dsw-alias-border-l3);background:color-mix(in srgb,var(--dsw-alias-bg-layer-2,var(--dsw-alias-bg-layer-1)) 55%,transparent)}",
			".dsh-cg-conflict-index{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-secondary);font-size:11px;font-weight:600;line-height:16px}",
			".dsh-cg-conflict-actions{flex:none;display:flex;align-items:center;gap:2px}",
			".dsh-cg-conflict-row{display:grid;grid-template-columns:44px minmax(0,1fr);font-family:var(--ds-font-family-code,ui-monospace,monospace);font-size:12px;line-height:18px;color:var(--dsw-alias-label-primary)}",
			".dsh-cg-conflict-row[data-kind=add]{background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 20%,transparent)}",
			".dsh-cg-conflict-row[data-kind=del]{background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 20%,transparent)}",
			".dsh-cg-conflict-row[data-kind=base]{background:color-mix(in srgb,var(--dsw-alias-bg-layer-2,var(--dsw-alias-bg-layer-1)) 70%,transparent)}",
			".dsh-cg-conflict-row[data-kind=meta]{color:var(--dsw-alias-label-tertiary);background:color-mix(in srgb,var(--dsw-alias-bg-layer-2,var(--dsw-alias-bg-layer-1)) 45%,transparent)}",
			".dsh-cg-conflict-no{padding-right:8px;text-align:right;color:var(--dsw-alias-label-tertiary);user-select:none;font-variant-numeric:tabular-nums}",
			".dsh-cg-conflict-text{padding:0 12px 0 6px;white-space:pre-wrap;overflow-wrap:anywhere}",
			".dsh-cg-conflict-row[data-empty] .dsh-cg-conflict-text{color:var(--dsw-alias-label-tertiary);font-style:italic}",
			".dsh-cg-conflict-tag{color:var(--dsw-alias-label-secondary)}",
			".dsh-cg-conflict-ref{color:var(--dsw-alias-label-tertiary)}",
			".dsh-cg-conflict-fold{display:flex}",
			".dsh-cg-conflict-fold-btn{flex:1 1 auto;display:block;padding:2px 12px 2px 50px;border:0;background:transparent;color:var(--dsw-alias-label-tertiary);font-family:var(--ds-font-family-code,ui-monospace,monospace);font-size:11px;line-height:16px;text-align:left;cursor:pointer}",
			".dsh-cg-conflict-fold-btn:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}",
			".dsh-cg-conflict-choose{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px}",
			`html.ct-bg-on .${GIT_ROOT_CLASS}{--dsw-alias-bg-base:transparent;--dsw-alias-bg-layer-1:transparent}`,
			".dsh-cg-update-footer{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px 16px;margin-top:14px}",
			".dsh-cg-update-links{display:flex;align-items:center;gap:8px}",
			".dsh-cg-update-link{display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:var(--dsw-radius-sm);color:var(--dsw-alias-label-secondary);text-decoration:none}",
			".dsh-cg-update-link:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}",
			".dsh-cg-update-link svg{display:block;width:16px;height:16px}",
			".dsh-cg-update-pill{display:inline-flex;align-items:center;gap:8px;max-width:min(100%,560px);padding:4px 12px;border:.5px solid var(--dsw-alias-border-l3);border-radius:999px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font-size:12px;line-height:1.6}",
			".dsh-cg-update-pill[data-tone=\"accent\"]{color:var(--dsw-alias-label-primary)}",
			".dsh-cg-update-pill[data-tone=\"error\"]{color:var(--dsw-alias-state-error-primary)}",
			".dsh-cg-update-pill-text{overflow-wrap:anywhere}",
			".dsh-cg-update-action{flex:none;appearance:none;border:0;background:none;padding:0;font:inherit;color:var(--dsw-alias-brand-primary);cursor:pointer}",
			".dsh-cg-update-action:hover{text-decoration:underline}",
			".dsh-cg-update-quiet{display:inline-flex;align-items:center;gap:8px;color:var(--dsw-alias-label-tertiary);font-size:12px}"
		].join("\n");
		/**
		* Insert the stylesheet once for the plugin lifetime.
		*
		* The tag carries the platform's style-ownership record — `data-plugin` with this
		* package's id, which is what every DSH bundle writes on the tags it injects — and
		* it has to, because this sheet is appended from `apply()`, one step *after* this
		* module materialized. DSH's client module system books a `<style>` by that
		* attribute: a tag that appears while a module materializes is claimed for that
		* module, and a tag carrying no attribute at all is claimed by whichever module
		* materializes next, then deleted with it (`removeOwnedStyles`) when that module is
		* reloaded, disabled, or pruned from the graph. The kernel shipped in 0.2.0-rc.2
		* claims exactly `style:not([data-plugin])` at every materialization, so an unowned
		* sheet is booked under an unrelated plugin and dies with it — while this tab keeps
		* rendering, which is how the page came to draw a panel-wide folder glyph (the icon
		* seats in this stylesheet own the sizes that are lost with it). Naming the owner
		* here keeps the sheet this plugin's own: only a reload of `dsh-cool-git` retires
		* it, and this effect's disposer removes it then anyway.
		*
		* `data-dsh-cool-git` stays as the package's own name for its sheet, for readers of
		* the DOM and the probes under `.tmp/`.
		*
		* @returns disposer that removes exactly this element.
		*/
		function insertGitStyles() {
			const element = document.createElement("style");
			element.setAttribute("data-plugin", "dsh-cool-git");
			element.setAttribute("data-dsh-cool-git", "styles");
			element.textContent = GIT_CSS;
			document.head.appendChild(element);
			return () => {
				element.remove();
			};
		}
		//#endregion
		//#region src/client/git.tsx
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
		/** How many commits the history pane asks for. */
		const LOG_LIMIT = 60;
		/** Body lines the diff pane will draw before it stops and says how many are left. */
		const MAX_DIFF_ROWS = 6e3;
		/**
		* Unchanged lines a conflict pane keeps on each side of a folded run.
		*
		* Three is the amount Git itself puts around a hunk, and matching it is the
		* point: the conflict pane and the diff pane then leave the same amount of code
		* around the part that matters.
		*/
		const CONFLICT_CONTEXT_EDGE = 3;
		/** How long the copy button reports success before returning to its idle label. */
		const COPY_FEEDBACK_MS = 1200;
		/**
		* The commit scope a Workspace nobody has chosen one for opens on.
		*
		* All is the whole-tree commitment: the button records everything the changed
		* path list shows, which is what a single commit button did before the scope was
		* a choice, and the answer a reader expects to get without looking at a setting
		* first. Staged is the narrower one — the index alone, for a reader who moved
		* paths there on purpose — and a Workspace that chooses it keeps it (see
		* `cache.ts`).
		*/
		const DEFAULT_COMMIT_SCOPE = "all";
		/**
		* The width cap this plugin puts on every hover bubble.
		*
		* The primitive's own cap is half the viewport, which makes a bubble's shape a
		* function of the window rather than of its text: the same label reads as one
		* line on a laptop and as a slab across a wide screen. A fixed cap keeps the
		* bubble the same size wherever the page is open, and it only ever bites a
		* label long enough to need it — a short one still shrink-wraps its text.
		*/
		const TOOLTIP_MAX_WIDTH = 500;
		/**
		* How long every hover bubble on this page waits before it appears.
		*
		* Three quarters of a second keeps a pointer passing over a row or a toolbar
		* control from raising a bubble, while still reading as a direct answer to a
		* settled hover. The page keeps one constant so no control can drift to a
		* different pace.
		*/
		const TOOLTIP_DELAY_MS = 750;
		/**
		* How fast a hovered decoration row walks itself to the right, in pixels per
		* second.
		*
		* A speed rather than a duration: the distance belongs to the names in the row,
		* so a row with more of them should take longer to read rather than move faster.
		* Forty is a reading pace — a character in these chips' monospace face is about
		* 6px, so a row outrunning the sidebar is walked at roughly 0.15s per character
		* of the names it carries, and the longest of them are read in a few seconds
		* rather than blurred past.
		*/
		const REF_SCROLL_SPEED = 40;
		/** The single letter each changed-path row shows. */
		const KIND_LETTER = {
			added: "A",
			modified: "M",
			deleted: "D",
			renamed: "R",
			copied: "C",
			typechange: "T",
			untracked: "U",
			conflicted: "!",
			unknown: "?"
		};
		/** The dictionary entry each changed-path row names its state with. */
		const KIND_KEY = {
			added: "kind.added",
			modified: "kind.modified",
			deleted: "kind.deleted",
			renamed: "kind.renamed",
			copied: "kind.copied",
			typechange: "kind.typeChange",
			untracked: "kind.untracked",
			conflicted: "kind.conflicted",
			unknown: "kind.unknown"
		};
		/**
		* The halves of one path that the sidebar lists.
		*
		* A path can be in the index, in the worktree, or both, and the two are separate
		* rows: a partly staged file is one row under Staged and one under Changes. An
		* untracked path is in neither porcelain column but is a worktree change, so it
		* belongs to the unstaged list. A conflicted path is neither side: `git add`
		* would mark it resolved, and nothing but the reader can say that happened, so it
		* is classified as the conflict list alone.
		*
		* @param file - one changed path.
		* @returns the groups that list it, in sidebar order.
		*/
		function sidesOf(file) {
			if (file.conflicted) return ["conflict"];
			const sides = [];
			if (file.staged) sides.push("staged");
			if (file.unstaged || file.untracked) sides.push("unstaged");
			return sides;
		}
		/**
		* Whether one path belongs in one of the pane's lists.
		*
		* A path that holds both halves is in both lists: the index holds one version of
		* it and the worktree another, and each list states one of them.
		*
		* @param file - one changed path.
		* @param side - the list to test.
		* @returns true when the path has that half.
		*/
		function inList(file, side) {
			return sidesOf(file).includes(side);
		}
		/**
		* The identity one row's write is tracked under: its half, then its path.
		*
		* A path can be listed twice — staged and unstaged — so the write in flight is
		* keyed by the row rather than by the file. Both the handlers that set it and the
		* rows that read it must spell the key the same way, which is why it is built
		* here rather than by string concatenation at each site.
		*
		* @param side - the half of the change the row stands for.
		* @param path - the repository-relative path.
		* @returns the row's key.
		*/
		function rowKey(side, path) {
			return `${side}:${path}`;
		}
		/**
		* The identity one whole group's write is tracked under: a half and no path.
		*
		* A group header's action covers every row in that half, so it is keyed by the
		* half alone; the trailing separator is what keeps it from colliding with a path
		* that happens to be empty.
		*
		* @param side - the half the group stands for.
		* @returns the group's key.
		*/
		function groupKey(side) {
			return `${side}:`;
		}
		/**
		* The three changed-path lists the pane draws.
		*
		* All three are drawn together, each a disclosure of its own, so the reader can
		* fold one away while reading another. The conflict list comes first because it
		* is the one that blocks everything else: a commit cannot record a tree with
		* unmerged paths in it, so the list that has to be emptied before the others can
		* be acted on is the list that reads first.
		*
		* Every row in it opens the conflict pane, and that pane is what resolves it.
		* The two other lists never hold a conflicted path — `sidesOf` puts one in this
		* list alone — which is why no bulk action here can stage a file that still has
		* markers in it.
		*/
		const SIDES = [
			"conflict",
			"staged",
			"unstaged"
		];
		/**
		* The memory of a session whose page has not been open in this browser yet.
		*
		* Nothing is selected: both lists are drawn from the start, and the reader
		* starts from the changes rather than from a patch they did not pick.
		*/
		const EMPTY_PAGE_MEMORY = {
			selection: null,
			doc: null
		};
		/** How many sessions' reading positions the page keeps in memory. */
		const PAGE_MEMORY_LIMIT = 8;
		/**
		* The reading positions alive in this page, keyed by session.
		*
		* A tab switch is a remount, so a reader who leaves the tab mid-diff would
		* otherwise find the pane empty on return. Keyed by session because a selection
		* names rows of that session's repository answer, and bounded because a
		* long-lived page visits sessions without ever unmounting the plugin.
		*/
		const pageMemories = /* @__PURE__ */ new Map();
		/**
		* What one session's page last had selected, or the empty memory.
		*
		* @param sessionId - the session the page belongs to, when it named one.
		* @returns the selection and patch to draw before anything is fetched.
		*/
		function readPageMemory(sessionId) {
			return pageMemories.get(sessionId ?? "") ?? EMPTY_PAGE_MEMORY;
		}
		/**
		* Record what one session's page is showing.
		*
		* Written from an effect on every selection and patch change rather than on
		* unmount: a write here is one map assignment, and it must have happened by the
		* time the View goes away — which an unmount cleanup cannot know is coming.
		*
		* @param sessionId - the session the page belongs to, when it named one.
		* @param memory - the selection and patch to keep.
		*/
		function writePageMemory(sessionId, memory) {
			const key = sessionId ?? "";
			pageMemories.delete(key);
			pageMemories.set(key, memory);
			if (pageMemories.size <= PAGE_MEMORY_LIMIT) return;
			const oldest = pageMemories.keys().next().value;
			if (oldest !== void 0) pageMemories.delete(oldest);
		}
		/**
		* Stable identity for one selection, so a late answer can be discarded.
		*
		* @param selection - the current selection, or null.
		* @returns a string that changes exactly when the selection does.
		*/
		function selectionKey(selection) {
			if (selection === null) return "";
			return selection.kind === "file" ? `file:${selection.side}:${selection.file.path}` : `commit:${selection.commit.hash}`;
		}
		/**
		* Turn one route answer into the diff pane's state.
		*
		* `postJson` normalizes every transport failure into an object, so what arrives
		* here is a payload or nothing at all — never a bare value — and the guard only
		* has to ask whether the answer said `ok`.
		*
		* @param t - the page's translate seat, for the reason the answer did not give.
		* @param key - the selection identity this answer belongs to.
		* @param result - the payload the route returned.
		* @returns the pane state to render.
		*/
		function buildDoc(t, key, result) {
			if (result?.ok !== true) return {
				key,
				loading: false,
				error: reasonOf(t, result ?? {}, "fallback.unknown")
			};
			const base = {
				key,
				loading: false,
				doc: parsePatch(typeof result.patch === "string" ? result.patch : ""),
				truncated: result.truncated === true
			};
			if (result.commit !== void 0) return {
				...base,
				commit: result.commit,
				merge: result.merge === true
			};
			return base;
		}
		/**
		* Turn one conflict answer into the pane's state.
		*
		* The shape is deliberately the same `DocState` a patch uses, with `conflict`
		* where `doc` would be: the pane switches on the selection's side, not on which
		* kind of answer is in flight, so a conflict and a patch are two contents of one
		* slot rather than two slots.
		*
		* @param t - the page's translate seat, for the reason the answer did not give.
		* @param key - the selection identity this answer belongs to.
		* @param result - the payload the route returned.
		* @returns the pane state to render.
		*/
		function buildConflictDoc(t, key, result) {
			if (result?.ok !== true || result.conflict === void 0) return {
				key,
				loading: false,
				error: reasonOf(t, result ?? {}, "fallback.unknown")
			};
			return {
				key,
				loading: false,
				conflict: result.conflict
			};
		}
		/**
		* Whether one route answer says the session's directory is not a repository.
		*
		* That is a normal empty state rather than a failure — the panes say so in
		* place — so it is the one `ok: false` answer the error dialog must not repeat.
		*
		* @param payload - the route's answer.
		* @returns true for the `no-repo` reason alone.
		*/
		function isNoRepo(payload) {
			return payload.reason === "no-repo";
		}
		/**
		* The reason one route answer gave for not answering.
		*
		* Three sources, in the order the answer offers them. A coded refusal is the
		* page's to word, so it is read from the dictionary here — this is the one
		* place a refusal becomes a sentence. Text is another program's and is passed
		* through untouched. The fallback is the page's own line for an answer that
		* said nothing at all, and takes the params its sentence interpolates because
		* a heading such as `title.switchBranch` names what failed.
		*
		* @param t - the page's translate seat.
		* @param payload - the route's answer.
		* @param fallback - the entry to state when the answer carried no reason.
		* @param params - the values that entry's placeholders take.
		* @returns the sentence to show.
		*/
		function reasonOf(t, payload, fallback, params) {
			const { failure } = payload;
			if (failure !== void 0) return t(`error.${failure.code}`, failure.params);
			return typeof payload.error === "string" && payload.error !== "" ? payload.error : t(fallback, params);
		}
		/**
		* State one failed request as the error dialog's line for it.
		*
		* The separator between the two halves is the dictionary's rather than a
		* literal here, because the colon that reads correctly between Chinese words is
		* not the one English wants.
		*
		* @param t - the page's translate seat.
		* @param label - the entry naming the request that did not answer.
		* @param payload - the route's answer.
		* @param fallback - the entry to state when the answer carried no reason.
		* @returns one `label: reason` line.
		*/
		function failureLine(t, label, payload, fallback) {
			return t("error.line", {
				label: t(label),
				reason: reasonOf(t, payload, fallback)
			});
		}
		/**
		* One failed operation, as the error dialog states it.
		*
		* The heading names the action and the answer's own reason is the dialog's one
		* line. The reason falls back to the same entry as the heading when the answer
		* carried neither a code nor any text, so a request that failed silently still
		* says what it was trying to do.
		*
		* @param t - the page's translate seat.
		* @param title - the entry naming the action that failed.
		* @param payload - the route's answer.
		* @param params - the values that entry's placeholders take.
		* @returns the dialog's error.
		*/
		function failureOf(t, title, payload, params) {
			return {
				title: t(title, params),
				lines: [reasonOf(t, payload, title, params)]
			};
		}
		/**
		* Whether a refused merge or pull left the merge in the working tree.
		*
		* That is a state, not a refusal: the conflict list is the page's answer to it,
		* and a dialog saying so would be a second sentence about something the reader
		* can already see. Two facts say so, and both are in the answer. `reason` is the
		* one the Host sends today. The failure code is the older signal, kept because a
		* page can outlive the Host it talks to — a reload picks up a new bundle while
		* the process behind it still runs yesterday's — and reporting a state as an
		* error is exactly what that mismatch produces otherwise.
		*
		* @param payload - the route's answer.
		* @returns whether the merge the request asked for is in the tree.
		*/
		function leftMerge(payload) {
			if (payload === null || payload === void 0) return false;
			const code = payload.failure?.code;
			return payload.reason === "conflict" || code === "pull-conflict" || code === "merge-conflict";
		}
		/**
		* The lines one branch-delete answer amounts to.
		*
		* A delete is the one request whose answer is a list, so it is the one failure
		* the page states per subject rather than per request: each branch Git refused
		* gets a line that names it and says why, because a selection is deleted one
		* branch at a time and "could not delete" over five of them would not say which
		* four went through. A branch that was deleted contributes nothing — the re-read
		* branch list is where that is visible.
		*
		* An answer with no list at all is the request itself failing, which has one
		* reason rather than several and is stated the way every other refusal is.
		*
		* @param t - the page's translate seat.
		* @param payload - the route's answer.
		* @returns one line per branch that was refused; empty when all of them went.
		*/
		function deletionLines(t, payload) {
			const results = payload?.results;
			if (payload?.ok === true) return [];
			if (!Array.isArray(results) || results.length === 0) return [reasonOf(t, payload ?? {}, "title.branchDelete")];
			return results.filter((item) => item.ok !== true).map((item) => t("error.line", {
				label: item.name,
				reason: reasonOf(t, item, "title.branchDelete")
			}));
		}
		/**
		* Flatten a parsed patch into the rows the pane draws.
		*
		* A file header is emitted only for a patch that touches more than one file:
		* for a single changed path the pane's own header already names it, and a
		* second identical line above the first hunk would just be noise.
		*
		* @param doc - the parsed patch.
		* @returns one flat list, in render order.
		*/
		function flatten(doc) {
			const rows = [];
			const multiple = doc.files.length > 1;
			for (const file of doc.files) {
				if (multiple) rows.push({
					type: "file",
					file
				});
				for (const hunk of file.hunks) {
					rows.push({
						type: "hunk",
						header: hunk.header
					});
					for (const line of hunk.lines) rows.push({
						type: "line",
						line
					});
				}
			}
			return rows;
		}
		/**
		* Split the flattened rows into one group per file.
		*
		* The pane draws each file as a section of its own — a title that stays put, and
		* a code area that scrolls sideways under it — so the flat list the rows are
		* built as has to be folded back into files before it is rendered.
		*
		* @param rows - the rows to draw, in order.
		* @returns one group per file, each holding the rows under its title.
		*/
		function groupFiles(rows) {
			const groups = [];
			let current = null;
			rows.forEach((row, index) => {
				if (row.type === "file") {
					current = {
						id: `${displayPath(row.file)}#${index}`,
						file: row.file,
						body: []
					};
					groups.push(current);
					return;
				}
				if (current === null) {
					current = {
						id: `#${index}`,
						file: null,
						body: []
					};
					groups.push(current);
				}
				current.body.push(row);
			});
			return groups;
		}
		/**
		* Render a short relative age for one ISO-8601 timestamp.
		*
		* @param t - the page's translate seat.
		* @param iso - the timestamp Git printed.
		* @returns `just now`, a counted unit, or the calendar date once it is old enough.
		*/
		function relativeTime(t, iso) {
			const at = Date.parse(iso);
			if (!Number.isFinite(at)) return "";
			const delta = Date.now() - at;
			const minute = 6e4;
			const hour = 60 * minute;
			const day = 24 * hour;
			if (delta < minute) return t("time.now");
			if (delta < hour) return t("time.minutes", { count: Math.floor(delta / minute) });
			if (delta < day) return t("time.hours", { count: Math.floor(delta / hour) });
			if (delta < 30 * day) return t("time.days", { count: Math.floor(delta / day) });
			const date = new Date(at);
			const pad = (value) => String(value).padStart(2, "0");
			return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
		}
		/**
		* Split a path into its directory and file name for the sidebar row.
		*
		* @param path - a repository-relative path.
		* @returns the directory (with its trailing slash) and the name.
		*/
		function splitPath(path) {
			const cut = path.lastIndexOf("/");
			if (cut < 0) return {
				dir: "",
				name: path
			};
			return {
				dir: path.slice(0, cut + 1),
				name: path.slice(cut + 1)
			};
		}
		/**
		* Group the changed paths into the directory tree the sidebar draws.
		*
		* A path's parent folders are created as the path is read, so a folder row
		* exists for every directory holding a changed file whether or not Git reported
		* the directory itself. Folders sort before files, both by name ignoring case:
		* that is the order a file explorer uses, and it keeps a folder's files together
		* however `git status` happened to list its paths.
		*
		* A directory holding one directory and no files of its own is a step in a path
		* rather than a row of its own, so `finishFolder` folds it into its child: under
		* `lib`, the chain `types/client` draws as one `types / client` row. That is the
		* compact folder an editor's explorer shows, and it keeps a deep tree from
		* spending a row and an indent on every directory that has nothing to say.
		*
		* @param files - the changed paths, in any order.
		* @returns the repository root, whose own row the sidebar does not draw.
		*/
		function buildFileTree(files) {
			const root = {
				name: "",
				path: "",
				folders: /* @__PURE__ */ new Map(),
				files: []
			};
			for (const file of files) {
				const segments = file.path.split("/");
				let folder = root;
				let prefix = "";
				for (const name of segments.slice(0, -1)) {
					prefix = prefix === "" ? name : `${prefix}/${name}`;
					const child = folder.folders.get(name);
					if (child === void 0) {
						const created = {
							name,
							path: prefix,
							folders: /* @__PURE__ */ new Map(),
							files: []
						};
						folder.folders.set(name, created);
						folder = created;
					} else folder = child;
				}
				folder.files.push(file);
			}
			return finishFolder(root);
		}
		/**
		* Sort one built folder's children and fold chains that lead nowhere.
		*
		* A folder with one child folder and no files is not a place a reader can stop:
		* the two rows would only spell one path between them. It is therefore folded
		* into its child, outermost segment first, so the row carries the whole chain
		* (`types / client`) and the child's own children sit under it at the same
		* depth. The root is exempt because its row is never drawn, and a folded chain
		* keeps the deepest folder's path so the row's tooltip and its closed state name
		* a real directory rather than a label.
		*
		* @param folder - a folder built from the changed paths.
		* @returns the folder as the sidebar renders it.
		*/
		function finishFolder(folder) {
			const folders = [...folder.folders.values()].map(finishFolder).sort((left, right) => compareTreeNames(left.segments[0], right.segments[0]));
			const files = [...folder.files].sort((left, right) => compareTreeNames(splitPath(left.path).name, splitPath(right.path).name));
			if (folder.path === "" || files.length > 0 || folders.length !== 1) return {
				name: folder.name,
				segments: [folder.name],
				path: folder.path,
				folders,
				files
			};
			const only = folders[0];
			return {
				name: `${folder.name} / ${only.name}`,
				segments: [folder.name, ...only.segments],
				path: only.path,
				folders: only.folders,
				files: only.files
			};
		}
		/**
		* Order two names the way the tree lists them.
		*
		* Case is ignored first so `README.md` and `assets` read as one alphabetical
		* run rather than as two groups the way a byte comparison would order them; the
		* exact spelling then breaks a tie, so two names differing only in case still
		* have a stable order. A locale collation is deliberately not used here: it
		* would make the tree's order depend on the browser's language rather than on
		* the names, while these are Git paths and read as data.
		*
		* @param left - one folder or file name.
		* @param right - the other.
		* @returns a negative, zero, or positive number, as `Array#sort` expects.
		*/
		function compareTreeNames(left, right) {
			const a = left.toLowerCase();
			const b = right.toLowerCase();
			if (a !== b) return a < b ? -1 : 1;
			return left < right ? -1 : left > right ? 1 : 0;
		}
		/**
		* The indent a tree row sits at.
		*
		* The level travels to the stylesheet as one custom property rather than as a
		* padding computed here, so the row's spacing stays beside the rest of the
		* tree's rules in `styles.ts` and a change of step is one declaration.
		*
		* @param depth - the row's level in the tree; a group header is 0 and its
		*   children start at 1.
		* @returns the row's style.
		*/
		function treeDepth(depth) {
			return { "--dsh-cg-depth": depth };
		}
		/**
		* Shorten one `%D` decoration for the row's tag.
		*
		* @param ref - one decoration, e.g. `HEAD -> main`.
		* @returns the branch or tag name alone.
		*/
		function refLabel(ref) {
			return ref.replace(/^HEAD -> /, "").replace(/^tag: /, "");
		}
		/**
		* One header's text: its label, and how many rows it is showing.
		*
		* The count is part of the line rather than a badge of its own, so the header
		* reads as one sentence and stays one line however narrow the sidebar gets —
		* the whole thing truncates as a unit instead of the count leaving first. It is
		* written even at zero, because a pane or group that is empty and one the page
		* never filled are two different states and only the count tells them apart.
		*
		* @param label - the header's name, already worded by the page's dictionary.
		* @param count - the rows under it.
		* @returns the header's text.
		*/
		function headText(label, count) {
			return `${label} · ${count}`;
		}
		/**
		* The busy glyph: an open ring, turned by the stylesheet.
		*
		* A control that can wait on the network for minutes cannot look the same as an
		* idle one, and a disabled button alone does not say which control is working.
		* It stands in for whichever glyph the wait belongs to, so it has to carry the
		* same weight as the artwork it replaces rather than a stroke of its own.
		*
		* It is the last glyph drawn here rather than under `src/client/assets`: every
		* subject the page shows — the Workspace, branch, pull, push, publish, refresh,
		* copy and check marks — is an asset now, and this ring is alone in being a state
		* with no picture of its own to be named after. See `icons.tsx` for the rest.
		*/
		const SPINNER_ICON = /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
			viewBox: "0 0 16 16",
			"aria-hidden": "true",
			children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
				cx: "8",
				cy: "8",
				r: "5.6",
				fill: "none",
				stroke: "currentColor",
				strokeWidth: "1.5",
				strokeOpacity: "0.25"
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
				d: "M8 2.4A5.6 5.6 0 0 1 13.6 8",
				fill: "none",
				stroke: "currentColor",
				strokeWidth: "1.5",
				strokeLinecap: "round"
			})]
		});
		/** Root style: fill the body the shell hands this View. */
		const PAGE = {
			height: "100%",
			width: "100%"
		};
		/**
		* Render the Git tab's body.
		*
		* @param props - the standard conversation-View props; the session id is used,
		*   and `t` is the locale seat the framework hands every entry that declares a
		*   dictionary namespace.
		* @returns the Git page element.
		*/
		function GitView(props) {
			const { t } = props;
			const page = (0, react.useRef)(null);
			/** The sidebar itself, and the changed-path pane at the top of it. */
			const side = (0, react.useRef)(null);
			const filesPane = (0, react.useRef)(null);
			/**
			* Which repository read owns the page.
			*
			* Reads can overlap — a mount's background revalidation can be in flight when
			* a checkout, a pull, or the Refresh button starts another — and the older one
			* must not paint its answers over the newer one's, nor cache them: a snapshot
			* written by a read that started first but finished last would be served as
			* the newest answer on the next mount. Every read takes a number here and
			* checks it when the answers arrive.
			*/
			const readRun = (0, react.useRef)(0);
			const sessionId = typeof props?.sessionId === "string" ? props.sessionId : void 0;
			const cached = (0, react.useMemo)(() => readRepositorySnapshot(sessionId), [sessionId]);
			const remembered = (0, react.useMemo)(() => readPageMemory(sessionId), [sessionId]);
			const [status, setStatus] = (0, react.useState)(() => cached?.status ?? null);
			const [log, setLog] = (0, react.useState)(() => cached?.log ?? null);
			const [loaded, setLoaded] = (0, react.useState)(() => cached !== null);
			const [refreshing, setRefreshing] = (0, react.useState)(false);
			/** Whether a fetch of the remote-tracking refs is in flight. */
			const [fetching, setFetching] = (0, react.useState)(false);
			/** The branch a checkout is in flight for, or null at rest. */
			const [switching, setSwitching] = (0, react.useState)(null);
			/** The branch a merge is in flight for, or null at rest. */
			const [merging, setMerging] = (0, react.useState)(null);
			/** Whether a branch create is in flight. */
			const [creating, setCreating] = (0, react.useState)(false);
			/** Whether a branch delete is in flight, which may be several pushes. */
			const [deleting, setDeleting] = (0, react.useState)(false);
			/** The half of the remote round trip in flight, or null at rest. */
			const [syncing, setSyncing] = (0, react.useState)(null);
			/** Whether the changed-path pane's commit is in flight. */
			const [committing, setCommitting] = (0, react.useState)(false);
			/** Whether the menu's undo of the last commit is in flight. */
			const [undoing, setUndoing] = (0, react.useState)(false);
			/**
			* The scope the commit form's button is set to.
			*
			* Read before the first paint through this session's alias, because the scope
			* is the Workspace's choice rather than this mount's: a reload must open the
			* form the way the reader left it instead of asking them to switch again. A
			* session whose first-ever read has not landed yet has no alias, so it starts
			* on the default and adopts the Workspace's saved scope with `status` below.
			*/
			const [commitScope, setCommitScope] = (0, react.useState)(() => readCommitScope(sessionId) ?? DEFAULT_COMMIT_SCOPE);
			/**
			* Whether the reader has chosen a scope on this mount.
			*
			* Adoption from `status` must not overwrite that: a choice made on screen is a
			* newer statement than the one a background re-read found on disk.
			*/
			const scopeChosen = (0, react.useRef)(false);
			/**
			* The row whose index write is in flight, as `side:path`, or null at rest.
			*
			* One at a time, like every other write on this page: a second `git add`
			* started while the first still has the index lock is a failure the user did
			* not cause. The row's own button shows it, and every action in the list is
			* disabled for the wait.
			*/
			const [staging, setStaging] = (0, react.useState)(null);
			/** The row whose worktree discard is in flight, as `unstaged:path`, or null. */
			const [discarding, setDiscarding] = (0, react.useState)(null);
			/**
			* The conflict write in flight, or null at rest.
			*
			* A resolution rewrites one file, and two of them in flight at once would race
			* the second against the first's bytes — the Host serializes the writes, but the
			* second request carries region keys from before the first one landed, and the
			* answer it would get is "this file changed". So the page holds the answers to
			* one at a time and shows the wait on the block that was clicked.
			*/
			const [resolving, setResolving] = (0, react.useState)(null);
			/**
			* The path whose "mark resolved" write is in flight, or null at rest.
			*
			* The pane's header button and a conflict row's own mark both go through one
			* write, so one name is enough: a second click is refused while this holds a
			* path, and the control that asked shows the wait.
			*/
			const [markingPath, setMarkingPath] = (0, react.useState)(null);
			/** Whether the conflict group's "mark everything resolved" run is in flight. */
			const [markingAll, setMarkingAll] = (0, react.useState)(false);
			/** Whether the merge the commit form records is in flight. */
			const [ending, setEnding] = (0, react.useState)(false);
			/** The row or folder the discard dialog is asking about, or null while none is open. */
			const [discardTarget, setDiscardTarget] = (0, react.useState)(null);
			const [selection, setSelection] = (0, react.useState)(() => remembered.selection);
			const [doc, setDoc] = (0, react.useState)(() => remembered.doc);
			/** The failure the dialog is stating, or null while none is open. */
			const [error, setError] = (0, react.useState)(null);
			/** The two boundaries' sizes, read from storage before the first paint. */
			const [layout, setLayout] = (0, react.useState)(readLayout);
			/** The boundary a drag is holding, or null at rest. */
			const [resizing, setResizing] = (0, react.useState)(null);
			(0, react.useLayoutEffect)(() => suppressComposerSeat(page.current), []);
			/**
			* Draw one layout: the page's two boundaries, as custom properties on the root.
			*
			* The sizes live on the root rather than in each element's own inline style for
			* two reasons. A drag can then move them from the pointer without rendering
			* React — the Diff pane holds thousands of rows, and a render per pointer frame
			* would cost all of them — and one publish states both panes' shares together,
			* so the divider between them can never be drawn from two different layouts.
			*/
			const publish = (0, react.useCallback)((next) => {
				const root = page.current;
				if (root === null) return;
				root.style.setProperty("--dsh-cg-side-width", `${next.sideWidth}px`);
				root.style.setProperty("--dsh-cg-files-grow", `${next.filesShare}`);
				root.style.setProperty("--dsh-cg-history-grow", `${1 - next.filesShare}`);
			}, []);
			(0, react.useLayoutEffect)(() => {
				publish(layout);
			}, [layout, publish]);
			/**
			* Record one layout: what the page draws from, and what it saves.
			*
			* The two are written together on purpose. A size drawn but not saved is one the
			* next visit forgets; a size saved but not drawn is a drag that looks like it did
			* nothing until the tab is reopened.
			*/
			const record = (0, react.useCallback)((next) => {
				setLayout(next);
				writeLayout(next);
			}, []);
			/** The page's own width, which is the room the sidebar and the Diff pane share. */
			const available = (0, react.useCallback)(() => page.current?.getBoundingClientRect().width ?? 0, []);
			/** The vertical run the two sidebar panes share, below the toolbar row. */
			const trackHeight = (0, react.useCallback)(() => {
				const host = side.current;
				const first = filesPane.current;
				if (host === null || first === null) return 0;
				return host.getBoundingClientRect().bottom - first.getBoundingClientRect().top;
			}, []);
			/**
			* Where the sidebar's edge is, as a drag starts.
			*
			* Measured off the box rather than read from the layout: the stylesheet is what
			* clamps a saved width to the window it is drawn in, so the edge on screen — not
			* the preference behind it — is where the pointer has actually taken hold.
			*/
			const startSideResize = (0, react.useCallback)(() => {
				setResizing("col");
				return side.current?.getBoundingClientRect().width ?? layout.sideWidth;
			}, [layout.sideWidth]);
			/** Draw the sidebar width the pointer implies, for this frame. */
			const dragSideResize = (0, react.useCallback)((width) => {
				const root = page.current;
				const room = available();
				if (root === null || room <= 0) return;
				root.style.setProperty("--dsh-cg-side-width", `${clampSideWidth(width, room)}px`);
			}, [available]);
			/** Record the sidebar width the gesture settled on. */
			const commitSideResize = (0, react.useCallback)((width) => {
				setResizing(null);
				const room = available();
				if (room <= 0) return;
				record({
					...layout,
					sideWidth: clampSideWidth(width, room)
				});
			}, [
				available,
				layout,
				record
			]);
			/** Where the divider between the panes is, as a drag starts: the upper pane's height. */
			const startSplitResize = (0, react.useCallback)(() => {
				setResizing("row");
				return filesPane.current?.getBoundingClientRect().height ?? layout.filesShare * trackHeight();
			}, [layout.filesShare, trackHeight]);
			/** Draw the split the pointer implies, for this frame. */
			const dragSplitResize = (0, react.useCallback)((height) => {
				const root = page.current;
				const track = trackHeight();
				if (root === null || track <= 0) return;
				const share = shareOf(clampFilesHeight(height, track), track);
				root.style.setProperty("--dsh-cg-files-grow", `${share}`);
				root.style.setProperty("--dsh-cg-history-grow", `${1 - share}`);
			}, [trackHeight]);
			/** Record the split the gesture settled on. */
			const commitSplitResize = (0, react.useCallback)((height) => {
				setResizing(null);
				const track = trackHeight();
				if (track <= 0) return;
				record({
					...layout,
					filesShare: shareOf(clampFilesHeight(height, track), track)
				});
			}, [
				layout,
				record,
				trackHeight
			]);
			/**
			* A gesture that produced no size — a click on a boundary, or a pointer lost
			* mid-drag — draws the recorded layout again, so the preview a cancelled drag
			* left on screen cannot outlive the gesture.
			*/
			const endResize = (0, react.useCallback)(() => {
				setResizing(null);
				publish(layout);
			}, [layout, publish]);
			/** Open the error dialog on one failed action. */
			const reportError = (0, react.useCallback)((next) => {
				setError(next);
			}, []);
			/**
			* Keep a file selection on the newest status, or drop it.
			*
			* The selected row can leave the working tree while the tab is away — a
			* commit, a revert, or the agent cleaning up after itself — and a path the
			* repository no longer lists has no diff to show, so the selection goes with
			* it rather than leaving the pane over a patch for a row that is gone. A
			* commit selection is left alone: the history is bounded, and an older commit
			* falling off the list is no evidence that it disappeared.
			*
			* A path that is still listed may have moved between the halves — an external
			* `git add` or `git restore` turns one row into the other — so a selection
			* whose side no longer exists follows the path to the half that does, which is
			* the same patch for the same file rather than a pane over a row that is gone.
			*
			* @param status - the status answer to judge the selection against.
			*/
			const pruneSelection = (0, react.useCallback)((status) => {
				if (status?.ok !== true) return;
				setSelection((current) => {
					if (current?.kind !== "file") return current;
					const file = (status.files ?? []).find((candidate) => candidate.path === current.file.path);
					if (file === void 0) return null;
					const sides = sidesOf(file);
					if (sides.includes(current.side)) return {
						...current,
						file
					};
					const next = sides[0];
					return next === void 0 ? null : {
						kind: "file",
						file,
						side: next
					};
				});
			}, []);
			/** Re-read the repository state and the history, and cache both answers. */
			const refresh = (0, react.useCallback)(async () => {
				const run = ++readRun.current;
				setRefreshing(true);
				try {
					const [nextStatus, nextLog] = await Promise.all([fetchStatus(sessionId), fetchLog(sessionId, LOG_LIMIT)]);
					if (run !== readRun.current) return;
					setStatus(nextStatus);
					setLog(nextLog);
					writeRepositorySnapshot(sessionId, nextStatus, nextLog);
					pruneSelection(nextStatus);
					const lines = [];
					if (nextStatus?.ok !== true && !isNoRepo(nextStatus)) lines.push(failureLine(t, "label.status", nextStatus, "fallback.status"));
					if (nextLog?.ok !== true && !isNoRepo(nextLog)) lines.push(failureLine(t, "label.log", nextLog, "fallback.log"));
					if (lines.length > 0) reportError({
						title: t("title.refresh"),
						lines
					});
				} finally {
					if (run === readRun.current) {
						setRefreshing(false);
						setLoaded(true);
					}
				}
			}, [
				pruneSelection,
				sessionId,
				reportError,
				t
			]);
			(0, react.useEffect)(() => {
				if (cached !== null) pruneSelection(cached.status);
				if (cached !== null && isSnapshotFresh(cached)) return;
				refresh();
			}, [
				cached,
				pruneSelection,
				refresh
			]);
			(0, react.useEffect)(() => {
				scopeChosen.current = false;
			}, [sessionId]);
			(0, react.useEffect)(() => {
				if (scopeChosen.current) return;
				setCommitScope(readCommitScope(sessionId, status) ?? DEFAULT_COMMIT_SCOPE);
			}, [sessionId, status]);
			(0, react.useEffect)(() => {
				if (!scopeChosen.current) return;
				writeCommitScope(sessionId, status, commitScope);
			}, [
				commitScope,
				sessionId,
				status
			]);
			const handleSwitched = (0, react.useCallback)(() => {
				setSelection(null);
				refresh();
			}, [refresh]);
			/**
			* Refresh the upstream ref of the branch a switch just landed on.
			*
			* The re-read a switch starts paints the new branch at once, but its counts are
			* read from the local remote-tracking refs, and a checkout does not move those:
			* a branch the remote has moved past reads as level with it until someone
			* fetches. So the switch follows its own re-read with one background fetch of
			* that branch's upstream remote, and re-reads again once that fetch actually
			* refreshed something — the counts the sync control draws are then about the
			* remote as it is now, not as it was at the last manual Fetch.
			*
			* Every answer is quiet, refusals included: the switch itself already succeeded
			* and is on screen, and a fetch that could not reach the network — offline, a
			* credential the remote rejected, a session that may not write `.git` — is not
			* a failure of the action the reader took, so it must not replace the page with
			* a dialog. `skipped` means there was nothing to refresh at all.
			*/
			const refreshUpstream = (0, react.useCallback)(() => {
				fetchBranchUpstream(sessionId).then((result) => {
					if (result?.ok !== true || result.skipped === true) return;
					refresh();
				});
			}, [sessionId, refresh]);
			const handleSynced = (0, react.useCallback)(() => {
				refresh();
			}, [refresh]);
			/**
			* Refresh every remote-tracking ref, and re-read what they feed.
			*
			* The safest operation in the menu and the one with the least to say: a fetch
			* moves nothing outside `.git`, so the selection stays valid and a success is
			* reported the way a sync's is — by re-reading, which is where the divergence
			* counts and the remote branch list come from. A refusal is the error
			* dialog's, like every other failure.
			*/
			const handleFetch = (0, react.useCallback)(() => {
				setFetching(true);
				fetchRemotes(sessionId).then((result) => {
					setFetching(false);
					if (result?.ok !== true) {
						reportError(failureOf(t, "title.fetch", result));
						return;
					}
					handleSynced();
				});
			}, [
				sessionId,
				handleSynced,
				reportError,
				t
			]);
			/**
			* Check out the branch the dialog confirmed.
			*
			* A refusal is the error dialog's, like every other failure. A success takes
			* the switch's own path and then asks the Host to refresh that branch's
			* upstream, so the counts the page shows describe the remote rather than the
			* last time someone fetched it.
			*
			* @param branch - the branch the user picked and confirmed.
			*/
			const handleCheckout = (0, react.useCallback)((branch) => {
				setSwitching(branch);
				checkoutBranch(sessionId, branch).then((result) => {
					setSwitching(null);
					if (result?.ok !== true) {
						reportError(failureOf(t, "title.switchBranch", result, { branch }));
						return;
					}
					handleSwitched();
					refreshUpstream();
				});
			}, [
				sessionId,
				handleSwitched,
				refreshUpstream,
				reportError,
				t
			]);
			/**
			* Merge the branch the dialog confirmed into the branch HEAD is on.
			*
			* The page's part is one name: the Host decides what a name may be, and Git
			* merges into the branch it is on. The merge leaves HEAD where it is, but it
			* rewrites the history — and a fast-forward rewrites the working tree as well —
			* so a success takes the checkout's path and re-reads everything.
			*
			* A refusal is the error dialog's, worded around the branch the request named.
			* A conflicted merge is not one of them: it is a state rather than a dead end,
			* left in the tree for this page to resolve, so the repository is simply re-read
			* and the paths Git wrote markers into appear in the conflict list — which is
			* the word for it, and needs no dialog saying the same thing.
			*
			* @param branch - the branch the dialog confirmed, which is the merge's source.
			*/
			const handleMerge = (0, react.useCallback)((branch) => {
				setMerging(branch);
				mergeBranch(sessionId, branch).then((result) => {
					setMerging(null);
					if (result?.ok !== true) {
						if (leftMerge(result)) {
							handleSynced();
							return;
						}
						reportError(failureOf(t, "title.mergeFrom", result, { branch }));
						return;
					}
					handleSwitched();
				});
			}, [
				sessionId,
				handleSwitched,
				handleSynced,
				reportError,
				t
			]);
			/**
			* Start the branch the dialog confirmed, and switch to it.
			*
			* The same shape as a checkout on this side and the same shape on the other:
			* the Host creates the ref and checks it out in one call, so the page's whole
			* part is the two names the dialog collected. It takes the checkout's path
			* afterwards for the checkout's reason — HEAD moved, so every answer on screen
			* is stale — and then the same upstream refresh, because a branch started at a
			* remote-tracking ref made that ref its upstream. A branch started at a local
			* one has none, and the refresh then answers `skipped` without a network call.
			* A refusal is the error dialog's.
			*
			* @param name - the branch to create.
			* @param start - the branch it starts at.
			*/
			const handleCreate = (0, react.useCallback)((name, start) => {
				setCreating(true);
				createBranch(sessionId, name, start).then((result) => {
					setCreating(false);
					if (result?.ok !== true) {
						reportError(failureOf(t, "title.branchCreate", result));
						return;
					}
					handleSwitched();
					refreshUpstream();
				});
			}, [
				sessionId,
				handleSwitched,
				refreshUpstream,
				reportError,
				t
			]);
			/**
			* Delete the branches the dialog confirmed, and report what became of each.
			*
			* One request for the whole selection, so the page's part is one call whatever
			* was ticked. The answer is a list rather than a verdict, and that is what this
			* reports: every branch that was refused gets its own line, named, because
			* "could not delete" over a selection of five says nothing about which four
			* went. A run where everything was deleted says nothing at all — the re-read
			* state is the report, as it is for every other success on this page.
			*
			* The re-read happens either way: a refusal can still have deleted the others,
			* so the branch list on screen is stale after one just as it is after a clean
			* run.
			*
			* The returned promise is the dialog's to wait on: unlike the other decisions,
			* a delete keeps its dialog on screen while the request runs, so the button
			* that asked for it is the one that reports the wait.
			*
			* @param targets - the branches the dialog selected.
			* @returns a promise that resolves once the request has been answered.
			*/
			const handleDelete = (0, react.useCallback)(async (targets) => {
				setDeleting(true);
				try {
					const result = await deleteBranches(sessionId, targets);
					const lines = deletionLines(t, result);
					if (lines.length > 0) reportError({
						title: t("title.branchDelete"),
						lines
					});
					handleSynced();
				} finally {
					setDeleting(false);
				}
			}, [
				sessionId,
				handleSynced,
				reportError,
				t
			]);
			/**
			* Send this branch to its upstream, and report the answer.
			*
			* Three rows run this one call — Publish, Sync's second half, and the menu's
			* own Push — because the Host decides which of them it is from the repository
			* itself: a branch with no upstream is pushed to the single configured remote
			* and recorded as its upstream. The only difference the page makes is what it
			* calls a failure.
			*
			* @param title - the entry naming which of the three was asked.
			*/
			const pushRemote = (0, react.useCallback)((title) => {
				setSyncing("push");
				pushBranch(sessionId).then((result) => {
					setSyncing(null);
					if (result?.ok !== true) reportError(failureOf(t, title, result));
					handleSynced();
				});
			}, [
				sessionId,
				handleSynced,
				reportError,
				t
			]);
			/**
			* Pull this branch's upstream, and report the answer.
			*
			* Pull and Sync both start here: the menu's Pull row asks for this one half on
			* its own, and Sync takes it as the first half of its round trip. A refusal
			* still re-reads the counts — the remote has moved whether or not anything was
			* brought in — and a success rewrites the working tree, so the diff on screen
			* goes with the selection it described.
			*
			* The state is released before the promise resolves, so a caller that chains
			* its own request (Sync's push) takes the spinner over rather than leaving the
			* pull's half turning under it.
			*
			* @returns whether anything was pulled, which is what Sync waits for before it
			*   has a history to push.
			*/
			const pullRemote = (0, react.useCallback)(() => {
				setSyncing("pull");
				return pullBranch(sessionId).then((result) => {
					setSyncing(null);
					if (result?.ok !== true) {
						if (!leftMerge(result)) reportError(failureOf(t, "title.pull", result));
						handleSynced();
						return false;
					}
					handleSwitched();
					return true;
				});
			}, [
				sessionId,
				handleSwitched,
				handleSynced,
				reportError,
				t
			]);
			/**
			* Run the round trip: pull, then push.
			*
			* The order is what makes a single button safe. Pulling first means the push
			* that follows sends a history the remote already has, so the common
			* divergence — the remote moved on while this branch did — resolves without a
			* second click and without the non-fast-forward refusal. The pull merges when
			* the two sides have diverged, so what it brings in may be a merge commit of
			* its own; nothing here has to write a message for it.
			*
			* A pull that does not finish stops the round trip. A refused one has been
			* explained by the dialog; a conflicted one has left a merge in the tree the
			* push cannot act on — the conflict list is the page's next step, and pushing
			* into a half-merged history is exactly what must not happen. Neither one
			* raises the dialog here.
			*
			* This is only ever asked of a branch that has an upstream — without one the
			* header offers Publish instead — so the pull has a target by construction.
			*/
			const syncRemote = (0, react.useCallback)(() => {
				pullRemote().then((pulled) => {
					if (pulled) pushRemote("title.push");
				});
			}, [pullRemote, pushRemote]);
			/**
			* Publish this branch: push it to the single configured remote and let that
			* push record the upstream, which is what turns a local branch into one the
			* rest of the world can see.
			*
			* It is offered exactly when there is no upstream to sync with, and it is the
			* honest answer for that state rather than a Sync showing `0 0`: the two counts
			* have nothing to be counted against, and the thing the branch needs is not a
			* comparison but a relationship. No remote, or several, is Git's refusal to
			* guess, reported like every other failure.
			*/
			const publishRemote = (0, react.useCallback)(() => {
				pushRemote("title.publish");
			}, [pushRemote]);
			/**
			* Commit under the message the form holds, with the scope the form is set to.
			*
			* `all` is the old one-call decision: stage every change the list holds and
			* record it, because that is what the button offers in that mode. `staged`
			* commits the index as it stands — the page's own `+` and `−` actions already
			* decided what belongs there — and therefore can leave the worktree half of a
			* path behind, which is the point of the mode. What the answer decides is
			* whether the form keeps its message: a refusal leaves it where it is, because
			* the message is usually the thing to fix, and the repository is re-read either
			* way — even a refusal can have changed the index first.
			*
			* A staged commit keeps the reader's row where it can: the diff on screen may
			* be the other half of the same path, which is still in the worktree. The
			* re-read's pruning follows the selection to whichever half still exists, and
			* drops it only when the path left the list entirely.
			*
			* @param message - the commit message the form holds, already non-empty.
			* @returns whether the commit was made, which is what clears the form.
			*/
			const handleCommit = (0, react.useCallback)((message) => {
				setCommitting(true);
				return (commitScope === "staged" ? commitStaged(sessionId, message) : commitAll(sessionId, message)).then((result) => {
					setCommitting(false);
					if (result?.ok !== true) {
						const lines = [reasonOf(t, result, "title.commit")];
						if (result?.failure?.code === "commit-identity") lines.push(t("hint.commit-identity"));
						reportError({
							title: t("title.commit"),
							lines
						});
						handleSynced();
						return false;
					}
					if (commitScope === "all") handleSwitched();
					else handleSynced();
					return true;
				});
			}, [
				commitScope,
				sessionId,
				handleSynced,
				handleSwitched,
				reportError,
				t
			]);
			/**
			* Take the last commit off the branch and leave its changes staged.
			*
			* The menu row is the whole interaction: the Host moves HEAD back to the
			* commit's first parent with a soft reset, so the commit disappears from the
			* history while every byte it recorded stays in the index. That moves both
			* answers the page is drawing — the branch's history and the changed-path
			* lists — so a success takes the checkout's path and clears the selected diff:
			* a patch read against the old HEAD is no longer the one the new state means.
			*
			* A refusal is the error dialog's, like every other menu row's. The repository
			* is re-read either way, because the answer can only be trusted for what Git
			* actually did.
			*/
			const handleUndoCommit = (0, react.useCallback)(() => {
				setUndoing(true);
				undoLastCommit(sessionId).then((result) => {
					setUndoing(false);
					if (result?.ok !== true) {
						reportError(failureOf(t, "title.undoCommit", result));
						handleSynced();
						return;
					}
					handleSwitched();
				});
			}, [
				sessionId,
				handleSynced,
				handleSwitched,
				reportError,
				t
			]);
			/**
			* Switch the commit form's scope.
			*
			* Recorded for the Workspace by the persistence effect above rather than
			* written here: a click can land before the first `status` answer names a
			* repository, and that effect re-runs when one does, so the choice reaches the
			* key the next mount reads. The ref makes this choice final for the mount —
			* the adoption effect watches `status`, and a background re-read landing after
			* a click must not put the form back where it was.
			*
			* @param next - the scope the reader picked.
			*/
			const handleScopeChange = (0, react.useCallback)((next) => {
				scopeChosen.current = true;
				setCommitScope(next);
			}, []);
			/**
			* Adopt the answer one list write gave, or report its refusal.
			*
			* Every index and worktree write answers with the fresh status, and every one
			* of them paints and caches that answer the same way: the lists then describe
			* the state the write produced rather than a second read another writer could
			* race. A refusal is the error dialog's, followed by a re-read, because a
			* failed write can still have touched the index or the worktree and a stale
			* row is worse than a slow one.
			*
			* @param result - the answer the route gave.
			* @param title - the error dialog's heading when the write was refused.
			*/
			const adoptWrite = (0, react.useCallback)((result, title) => {
				if (result?.ok !== true) {
					reportError(failureOf(t, title, result ?? {}));
					refresh();
					return;
				}
				if (result.status === void 0) return;
				setStatus(result.status);
				writeRepositorySnapshot(sessionId, result.status, log);
			}, [
				sessionId,
				log,
				refresh,
				reportError,
				t
			]);
			/**
			* Move one row's path between the index and the worktree.
			*
			* The request answers with the fresh status, so the page paints the state the
			* write produced rather than asking for a second read another writer could
			* race. The row the reader had selected follows the path to its new half — the
			* patch is the same file, and a pane left over the half that just disappeared
			* would be a diff for a row that is no longer listed. A refusal is the error
			* dialog's, and the page re-reads anyway: a failed `git add` can still have
			* touched the index, and a stale row is worse than a slow one.
			*
			* @param file - the changed path the row names.
			* @param side - the half the row is listed under, which is what decides the
			*   direction: a staged row unstages, an unstaged row stages.
			*/
			const handleStageToggle = (0, react.useCallback)((file, side) => {
				if (side === "conflict" || staging !== null || discarding !== null) return;
				const key = rowKey(side, file.path);
				setStaging(key);
				(side === "staged" ? unstagePath(sessionId, file.path, file.origPath) : stagePath(sessionId, file.path)).then((result) => {
					setStaging(null);
					adoptWrite(result, side === "staged" ? "title.unstage" : "title.stage");
				});
			}, [
				sessionId,
				staging,
				discarding,
				adoptWrite
			]);
			/**
			* Move every changed path under one folder between the index and the worktree.
			*
			* The request names the directory alone; the Host reads the status inside its
			* write queue and applies the move to the paths under it, so a folder row can
			* stand for a tree the page never has to enumerate. The answer carries the
			* fresh status, exactly as the single-path actions do.
			*
			* @param path - the repository-relative folder the row names.
			* @param side - the list the folder is drawn in: staged unstages, unstaged stages.
			*/
			const handleStageFolder = (0, react.useCallback)((path, side) => {
				if (side === "conflict" || staging !== null || discarding !== null) return;
				setStaging(rowKey(side, path));
				(side === "staged" ? unstageFolder(sessionId, path) : stageFolder(sessionId, path)).then((result) => {
					setStaging(null);
					adoptWrite(result, side === "staged" ? "title.unstageFolder" : "title.stageFolder");
				});
			}, [
				sessionId,
				staging,
				discarding,
				adoptWrite
			]);
			/**
			* Move one whole half of the changed-path pane between the index and the
			* worktree.
			*
			* The request names no path: the Host resolves the side it acts on from the
			* status it reads inside its write queue, so the group header covers every row
			* that half holds without sending a tree of paths across the body. The half is
			* the whole side, so the Host's routes for it match the group exactly.
			*
			* @param side - the half the group names: staged unstages, unstaged stages.
			*/
			const handleStageAll = (0, react.useCallback)((side) => {
				if (staging !== null || discarding !== null) return;
				setStaging(groupKey(side));
				(side === "staged" ? unstageAll(sessionId) : stageAll(sessionId)).then((result) => {
					setStaging(null);
					adoptWrite(result, side === "staged" ? "title.unstageAll" : "title.stageAll");
				});
			}, [
				sessionId,
				staging,
				discarding,
				adoptWrite
			]);
			/**
			* Ask before discarding one row's worktree change.
			*
			* A discard cannot be undone — an edited file goes back to the index, and an
			* untracked one is deleted — so the row's button only names the path and opens
			* the dialog; the request itself waits for the dialog's own confirmation.
			*
			* @param file - the changed path the row names.
			*/
			const handleDiscard = (0, react.useCallback)((file) => {
				if (staging !== null || discarding !== null) return;
				setDiscardTarget({
					kind: "file",
					file
				});
			}, [staging, discarding]);
			/**
			* Ask before discarding every unstaged change under one folder.
			*
			* @param path - the repository-relative folder the row names.
			* @param count - how many changed files under it the row stood for.
			* @param untracked - whether any of them will be deleted rather than restored.
			*/
			const handleDiscardFolder = (0, react.useCallback)((path, count, untracked) => {
				if (staging !== null || discarding !== null) return;
				setDiscardTarget({
					kind: "folder",
					path,
					count,
					untracked
				});
			}, [staging, discarding]);
			/**
			* Ask before discarding every unstaged change in the repository.
			*
			* @param count - how many changed files the unstaged group held.
			* @param untracked - whether any of them will be deleted rather than restored.
			*/
			const handleDiscardAll = (0, react.useCallback)((count, untracked) => {
				if (staging !== null || discarding !== null) return;
				setDiscardTarget({
					kind: "all",
					count,
					untracked
				});
			}, [staging, discarding]);
			/**
			* Discard what the dialog confirmed, and repaint from the answer.
			*
			* The request answers with the fresh status, so the page paints the state the
			* write produced rather than asking for a second read another writer could
			* race. A refusal is the error dialog's, and the page re-reads anyway: a
			* failed discard can still have touched the worktree, and a stale row is worse
			* than a slow one.
			*/
			const confirmDiscard = (0, react.useCallback)(() => {
				const target = discardTarget;
				if (target === null || staging !== null || discarding !== null) return;
				setDiscardTarget(null);
				const path = target.kind === "file" ? target.file.path : target.kind === "folder" ? target.path : "";
				setDiscarding(rowKey("unstaged", path));
				(target.kind === "file" ? discardPath(sessionId, target.file.path, target.file.untracked) : target.kind === "folder" ? discardFolder(sessionId, target.path) : discardAll(sessionId)).then((result) => {
					setDiscarding(null);
					adoptWrite(result, target.kind === "all" ? "title.discardAll" : "title.discard");
				});
			}, [
				discardTarget,
				staging,
				discarding,
				sessionId,
				adoptWrite
			]);
			/**
			* Ask the Host for a commit message written for the changes on disk.
			*
			* The page owns this call because it owns the session and the error dialog: the
			* route resolves the repository from the session's own header and takes the
			* model from the deployment's current default selection, so the request names
			* neither — and a refusal, from a clean tree to a missing model, is reported the
			* way every other failed request is. The scope is the form's commitment: a
			* staged-only commit gets a message about the index alone.
			*
			* Nothing is re-read on success: writing a message changes no file and no
			* history, so the status, the commit list, and the patch on screen are all still
			* what they were, and a refresh here would only repaint the page under the
			* pointer — and drop the selection the reader was looking at.
			*
			* @returns the message and whatever the model asked be read first, or null when
			* the request failed and the dialog is already stating why.
			*/
			const handleGenerateMessage = (0, react.useCallback)(() => {
				return generateMessage(sessionId, commitScope).then((result) => {
					if (result?.ok !== true || typeof result.message !== "string" || result.message === "") {
						reportError({
							title: t("title.message"),
							lines: [failureLine(t, "label.message", result ?? {}, "fallback.message")]
						});
						return null;
					}
					const warnings = result.warnings ?? [];
					return {
						message: result.message,
						...warnings.length === 0 ? {} : { warning: warnings.join("\n") }
					};
				});
			}, [
				commitScope,
				sessionId,
				reportError,
				t
			]);
			const busy = switching !== null || merging !== null || syncing !== null || committing || undoing || fetching || creating || deleting || staging !== null || resolving !== null || markingPath !== null || markingAll || ending;
			const files = status?.ok === true ? status.files ?? [] : [];
			const commits = log?.ok === true ? log.commits ?? [] : [];
			const stagedCount = files.filter((file) => file.staged && !file.conflicted).length;
			/**
			* Apply one choice to the conflict on screen.
			*
			* `keys` names the blocks to replace, and is absent for a whole-file choice —
			* the one a binary path or a path deleted on one side can take. The answer
			* carries the file after the write, so the pane repaints from what is on disk
			* rather than from what the click assumed; a refused key or a path that is no
			* longer unmerged is answered by re-reading the repository, because both mean
			* the page was holding an older picture of the file than the disk had.
			*
			* @param choice - which version to keep.
			* @param keys - the blocks to replace, or undefined for the whole file.
			*/
			const handleResolve = (0, react.useCallback)((choice, keys) => {
				if (selection?.kind !== "file" || selection.side !== "conflict") return;
				if (busy) return;
				const path = selection.file.path;
				const key = selectionKey(selection);
				setResolving(keys === void 0 ? "whole" : keys.join(","));
				resolveConflict(sessionId, path, choice, keys).then((result) => {
					setResolving(null);
					if (result?.ok !== true) {
						reportError(failureOf(t, "title.resolve", result));
						if (result?.reason === "stale" || result?.reason === "not-conflicted") refresh();
						return;
					}
					if (result.conflict !== void 0) setDoc({
						key,
						loading: false,
						conflict: result.conflict
					});
					if (result.staged === true) refresh();
				});
			}, [
				selection,
				busy,
				sessionId,
				reportError,
				t,
				refresh
			]);
			/**
			* Tell Git one conflicted path is resolved, without writing it.
			*
			* The write behind a conflict row's check, which is the page's one place for
			* it: the reader who resolved the file in their own editor never opens the
			* pane, and the reader who resolved the blocks is looking at the same row in
			* the list. The answer carries the fresh status, and the selection follows the
			* path out of the conflict list and into the index on the repaint that follows.
			*
			* @param path - the repository-relative path to stage as resolved.
			*/
			const markResolvedPath = (0, react.useCallback)((path) => {
				if (busy) return;
				setMarkingPath(path);
				markResolved(sessionId, path).then((result) => {
					setMarkingPath(null);
					adoptWrite(result, "title.resolveDone");
				});
			}, [
				busy,
				sessionId,
				adoptWrite
			]);
			/** A conflict row's own check: the one place the page marks a path resolved. */
			const handleMarkResolvedRow = (0, react.useCallback)((file) => {
				markResolvedPath(file.path);
			}, [markResolvedPath]);
			/**
			* Stage every conflicted path as resolved, from the conflict group's check.
			*
			* Each path is its own request because that is what the route is — one file,
			* its own bytes — and they are sent one after another rather than at once, so a
			* refusal can name the path it happened on. The run stops at the first refusal:
			* the rest would fail for the same reason, and the answer that failed has
			* already said what it was. The last status is what the list repaints from, and
			* a run that got through none of its paths re-reads the repository instead.
			*/
			const markAllResolved = (0, react.useCallback)(() => {
				if (busy || status?.ok !== true) return;
				const paths = (status.files ?? []).filter((file) => file.conflicted).map((file) => file.path);
				if (paths.length === 0) return;
				setMarkingAll(true);
				(async () => {
					let latest;
					let refused = false;
					for (const path of paths) {
						const result = await markResolved(sessionId, path);
						if (result?.ok !== true) {
							reportError(failureOf(t, "title.resolveDone", result));
							refused = true;
							break;
						}
						if (result.status !== void 0) latest = result.status;
					}
					setMarkingAll(false);
					if (latest !== void 0) {
						setStatus(latest);
						writeRepositorySnapshot(sessionId, latest, log);
					}
					if (refused) refresh();
				})();
			}, [
				busy,
				status,
				sessionId,
				reportError,
				t,
				refresh,
				log
			]);
			/**
			* Record the merge the commit form is finishing.
			*
			* A merge in progress is a state, not a mode: the changed-path list already
			* shows the conflicted paths beside every other change, so the only thing left
			* to offer is the commit that ends it. The form's field holds the message — the
			* reader's own, or nothing to keep the one Git wrote into `MERGE_MSG` when the
			* merge started — which is why this takes the words rather than reading them.
			*
			* The history moved, so a success takes the switch's path: every diff on screen
			* was written against the index the merge has just replaced.
			*
			* @param message - the field's text, or nothing to keep Git's message.
			* @returns whether the merge commit was made, which is what clears the field.
			*/
			const handleFinishMerge = (0, react.useCallback)((message) => {
				if (busy) return Promise.resolve(false);
				setEnding(true);
				return completeMerge(sessionId, message.trim() === "" ? void 0 : message).then((result) => {
					setEnding(false);
					if (result?.ok !== true) {
						reportError(failureOf(t, "title.completeMerge", result));
						handleSynced();
						return false;
					}
					handleSwitched();
					return true;
				});
			}, [
				busy,
				sessionId,
				reportError,
				t,
				handleSynced,
				handleSwitched
			]);
			(0, react.useEffect)(() => {
				if (status?.ok !== true) return;
				setSelection((current) => {
					if (current?.kind !== "file") return current;
					const file = files.find((candidate) => candidate.path === current.file.path);
					if (file === void 0) return null;
					if (current.side !== "conflict" && inList(file, current.side)) return current;
					const side = SIDES.find((candidate) => inList(file, candidate));
					return side === void 0 ? null : {
						kind: "file",
						file,
						side
					};
				});
			}, [files, status]);
			const activeFile = (0, react.useMemo)(() => {
				if (selection?.kind !== "file") return null;
				return files.find((file) => file.path === selection.file.path) ?? selection.file;
			}, [selection, files]);
			(0, react.useEffect)(() => {
				if (selection === null) {
					setDoc(null);
					return;
				}
				const key = selectionKey(selection);
				const rememberedDoc = readPageMemory(sessionId).doc;
				let cancelled = false;
				setDoc(rememberedDoc !== null && rememberedDoc.key === key ? rememberedDoc : {
					key,
					loading: true
				});
				if (selection.kind === "file" && selection.side === "conflict") {
					fetchConflict(sessionId, selection.file.path).then((result) => {
						if (cancelled) return;
						setDoc(buildConflictDoc(t, key, result));
						if (result?.ok !== true && !isNoRepo(result)) reportError(failureOf(t, "title.diff", result));
					});
					return () => {
						cancelled = true;
					};
				}
				(selection.kind === "commit" ? fetchCommit(sessionId, selection.commit.hash) : activeFile === null ? Promise.resolve({
					ok: false,
					error: t("fallback.fileGone")
				}) : fetchDiff(sessionId, activeFile, selection.side, activeFile.untracked)).then((result) => {
					if (cancelled) return;
					setDoc(buildDoc(t, key, result));
					if (result?.ok !== true && !isNoRepo(result)) {
						const label = selection.kind === "commit" ? "label.commit" : "label.diff";
						reportError({
							title: t("title.diff"),
							lines: [failureLine(t, label, result, "fallback.diff")]
						});
					}
				});
				return () => {
					cancelled = true;
				};
			}, [
				selection,
				activeFile,
				sessionId,
				reportError,
				t
			]);
			(0, react.useEffect)(() => {
				writePageMemory(sessionId, {
					selection,
					doc
				});
			}, [
				sessionId,
				selection,
				doc
			]);
			const current = doc !== null && doc.key === selectionKey(selection) ? doc : null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				ref: page,
				className: GIT_ROOT_CLASS,
				"data-dsh-cool-git": "view",
				"data-conversation-composer-overlay": "",
				"data-resizing": resizing ?? void 0,
				style: PAGE,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("aside", {
						ref: side,
						className: "dsh-cg-side",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SideHead, {
								t,
								status,
								sessionId,
								refreshing,
								fetching,
								syncing,
								switching,
								merging: merging !== null,
								creating,
								deleting,
								busy,
								onRefresh: () => void refresh(),
								onFetch: handleFetch,
								onPull: () => void pullRemote(),
								onPush: () => pushRemote("title.push"),
								onCheckout: handleCheckout,
								onMerge: handleMerge,
								onCreate: handleCreate,
								onDelete: handleDelete,
								onError: reportError,
								commitScope,
								onCommitScope: handleScopeChange,
								undoing,
								onUndoCommit: handleUndoCommit
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(CommitBar, {
								t,
								disabled: status?.ok !== true || busy || refreshing,
								committing,
								scope: commitScope,
								stagedCount,
								allCount: files.length,
								operation: status?.ok === true ? status.operation ?? null : null,
								mergeMessage: status?.ok === true ? status.mergeMessage : void 0,
								ending,
								onCommit: handleCommit,
								onFinishMerge: handleFinishMerge,
								onGenerate: handleGenerateMessage
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
								ref: filesPane,
								className: "dsh-cg-pane dsh-cg-files",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: "dsh-cg-list",
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ChangeList, {
										t,
										status,
										loaded,
										files,
										selection,
										staging,
										discarding,
										marking: markingPath,
										markingAll,
										onSelect: (file, side) => setSelection({
											kind: "file",
											file,
											side
										}),
										onToggleStage: handleStageToggle,
										onDiscard: handleDiscard,
										onMarkResolved: handleMarkResolvedRow,
										onMarkAllResolved: markAllResolved,
										onToggleFolderStage: handleStageFolder,
										onDiscardFolder: handleDiscardFolder,
										onStageAll: handleStageAll,
										onDiscardAll: handleDiscardAll
									})
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ResizeHandle, {
									axis: "row",
									onStart: startSplitResize,
									onDrag: dragSplitResize,
									onCommit: commitSplitResize,
									onEnd: endResize
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
								className: "dsh-cg-pane dsh-cg-history",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
									className: "dsh-cg-head",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "dsh-cg-head-title",
										children: headText(t("pane.history"), commits.length)
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: "dsh-cg-tools",
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RemoteControl, {
											t,
											status,
											syncing,
											busy,
											refreshing,
											onSync: syncRemote,
											onPublish: publishRemote
										})
									})]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: "dsh-cg-list",
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CommitList, {
										t,
										log,
										loaded,
										commits,
										selection,
										onSelect: (commit) => setSelection({
											kind: "commit",
											commit
										})
									})
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ResizeHandle, {
								axis: "col",
								onStart: startSideResize,
								onDrag: dragSideResize,
								onCommit: commitSideResize,
								onEnd: endResize
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("main", {
						className: "dsh-cg-main",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DiffPane, {
							t,
							status,
							selection,
							current,
							resolving,
							busy,
							onResolve: handleResolve
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(DiscardDialog, {
						t,
						target: discardTarget,
						onCancel: () => setDiscardTarget(null),
						onConfirm: confirmDiscard
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ErrorDialog, {
						t,
						error,
						onClose: () => setError(null)
					})
				]
			});
		}
		/**
		* The page's only error report.
		*
		* A dialog rather than a line beside the panes: a refusal is the reason the page
		* still shows the old state, and it must not be mistaken for the content it is
		* explaining or scrolled away from. The platform's own Modal owns the parts that
		* are easy to get wrong — the body portal, the mask, the focus walk, Escape, and
		* returning focus to the control that opened it. This is the same composition
		* DSH's own destructive confirm uses (`client-ui-workspace`'s Delete workspace),
		* down to reporting the failure inside the card as one `role="alert"` block
		* painted with the error token.
		*
		* @param props.t - the page's translate seat.
		* @param props.error - the failure to state, or null while none is open.
		* @param props.onClose - called by the close button, Escape, or the mask.
		* @returns the dialog element.
		*/
		function ErrorDialog(props) {
			const { t, error, onClose } = props;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
				open: error !== null,
				onClose,
				title: error?.title ?? "",
				closeLabel: t("dialog.close"),
				footer: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					variant: "primary",
					onClick: onClose,
					children: t("dialog.ok")
				}),
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "dsh-cg-dialog-body",
					role: "alert",
					children: (error?.lines ?? []).map((line, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "dsh-cg-dialog-text",
						children: line
					}, index))
				})
			});
		}
		/**
		* The confirmation that stands between a row's discard button and the worktree.
		*
		* A discard cannot be undone: a tracked path goes back to its index entry, and
		* an untracked one is deleted. A file row names the path it would throw away; a
		* folder row names the directory and how many files it stood for. This card is
		* where that becomes a decision, and it words an untracked target as the
		* deletion it is, down to the confirm button's label.
		*
		* @param props.t - the page's translate seat.
		* @param props.target - the row or folder asking to discard, or null while none is open.
		* @param props.onCancel - called by Escape, the mask, or the cancel button.
		* @param props.onConfirm - called when the reader confirms the discard.
		* @returns the dialog element.
		*/
		function DiscardDialog(props) {
			const { t, target, onCancel, onConfirm } = props;
			const text = target === null ? "" : target.kind === "file" ? t(target.file.untracked ? "discard.untracked" : "discard.tracked", { path: target.file.path }) : target.kind === "folder" ? t(target.untracked ? "discard.folderUntracked" : "discard.folder", {
				path: target.path,
				count: target.count
			}) : t(target.untracked ? "discard.allUntracked" : "discard.all", { count: target.count });
			const deleting = target?.kind === "file" && target.file.untracked;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
				open: target !== null,
				onClose: onCancel,
				title: t("discard.title"),
				description: t("discard.description"),
				closeLabel: t("dialog.close"),
				className: "dsh-cg-discard-dialog",
				footer: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					variant: "outline",
					onClick: onCancel,
					children: t("discard.cancel")
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					variant: "primary",
					className: "dsh-cg-discard-confirm",
					onClick: onConfirm,
					children: t(deleting ? "discard.delete" : "discard.confirm")
				})] }),
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: "dsh-cg-dialog-text",
					children: text
				})
			});
		}
		/**
		* Stable key for one model route inside the Settings picker.
		*
		* The two identifiers are joined by NUL because neither a provider id nor a
		* model id can carry one, so the key splits back into exactly the two values the
		* Host stored. The effort is deliberately not part of it: a row names a model,
		* and the level is chosen inside that row — two rows for the same model would
		* make the search and the folded groups say the model exists twice.
		*
		* @param selection - the route to key.
		* @returns the picker value.
		*/
		function modelKey(selection) {
			return `${selection.provider}\u0000${selection.model}`;
		}
		/**
		* What a row's effort control says when the route pins no level.
		*
		* Deliberately not translated: the ids the control lists beside it come from the
		* adapter (`high`, `medium`, …), so the name for "no pinned level" belongs to
		* that same vocabulary rather than to either dictionary.
		*/
		const DEFAULT_EFFORT = "Default";
		/**
		* The effort menu's row id for `Default`.
		*
		* The adapter's own ids are short words (`high`, `medium`, …), so the id for "no
		* pinned level" is prefixed to stay clear of them: the menu hands its ids back
		* as-is, and this one must not be mistaken for a level.
		*/
		const EFFORT_DEFAULT_ID = "dsh-cg-effort-default";
		/**
		* How tall the Settings picker's panel is.
		*
		* A fixed height is what keeps the panel from jumping while a search narrows the
		* catalog to three rows: the list scrolls inside a surface whose edges stay put,
		* which is also how the design draws it — the rows fill the top of the panel and
		* leave the rest empty. Only the variable parts below follow the viewport; the
		* height itself does not.
		*/
		const PICKER_HEIGHT = 370;
		/**
		* The shortest the picker's overlay scrollbar thumb may get.
		*
		* The bar is a fixed 5px wide and its length follows how much of the list is in
		* view; a very long catalog would shrink it below a grabbable size, so it stops
		* at this length instead.
		*/
		const PICKER_THUMB_MIN = 28;
		/**
		* The gap and margin the picker is placed with, in CSS pixels.
		*
		* The platform's position hook and this dialog's own side decision both read
		* them: a disagreement would put the panel on the side the hook was not told
		* about, so the two numbers are stated once.
		*/
		const PICKER_GAP = 6;
		const PICKER_MARGIN = 12;
		/** The width the panel opens at, and the narrowest a narrow field may shrink it to. */
		const PICKER_WIDTH_INITIAL = 320;
		const PICKER_WIDTH_MIN = 280;
		/** The layer the panel sits on, and how far above the field's own layer it starts. */
		const PICKER_Z_BASE = 1e3;
		const PICKER_Z_STEP = 10;
		/**
		* The reasoning effort a route pins.
		*
		* @param route - the route to read.
		* @returns the effort id, or null when the route leaves the level to its adapter.
		*/
		function routeEffort(route) {
			const effort = route.reasoningEffort;
			return typeof effort === "string" && effort !== "" ? effort : null;
		}
		/**
		* The name a route reads as, in the picker and in the default row's caption.
		*
		* A route the current catalog does not list keeps its identifiers rather than
		* disappearing: a saved model can be temporarily unavailable — its provider is
		* signed out, its endpoint is down, its adapter has not loaded yet — and the
		* dialog must still show what the Workspace chose instead of silently pretending
		* the choice was never made.
		*
		* @param selection - the route to name.
		* @param groups - the catalog the dialog read.
		* @returns `provider / model`, using the catalog's display names when it has them.
		*/
		function modelLabel(selection, groups) {
			const group = groups.find((entry) => entry.provider === selection.provider);
			const model = group?.models.find((entry) => entry.id === selection.model);
			return `${group?.name ?? selection.provider} / ${model?.name ?? selection.model}`;
		}
		/**
		* The Settings dialog: the model and prompt that write this Workspace's commit
		* messages.
		*
		* The two settings are asked together because they describe one call: Generate
		* sends the changes to this model, told to answer in this prompt's terms, and a
		* Workspace that wants a different voice usually wants it from a different model
		* too. Save writes both; the page reads both on every Generate, so nothing has
		* to be refreshed or reloaded for the next generated message to use them.
		*
		* The model list is the deployment's catalog, read when the dialog opens rather
		* than at mount: models appear, disappear, and become available as providers are
		* configured, and a list cached before a sign-in would offer routes the Host
		* cannot call. It is drawn as the plugin's own picker rather than a native
		* `select`, because a route is three answers and a `select` can only hold one: a
		* row per model, a search field over the whole list, provider groups that fold
		* away, and a per-row effort control do not exist in the platform's select.
		*
		* The platform has no `Popover` component to hand, but it does expose the parts
		* its own menus are built from, and the panel uses them: `useAnchoredPosition`
		* keeps it against the field while the page scrolls or resizes, the platform's
		* outside-pointer rule closes it on a click elsewhere (restated below, because
		* the effort menu's portaled rows are the panel's own business), and
		* `useModalLayer` puts it on the same layer stack as the dialog — so Escape
		* closes the list before the dialog, Tab stays inside the open list, and focus
		* returns to the field when the list closes. The panel is portaled to
		* `document.body` because the dialog's body is a scrollport that would clip it.
		*
		* The panel is a sheet of its own height rather than a box that hugs its rows:
		* the search sits above a scrolling list, and narrowing the catalog to two
		* matches leaves the surface the same size as before instead of flickering
		* shorter under the pointer. The provider rows fold their models away and carry
		* that mark at the far right of the row, opposite the name; the row itself stays
		* at the top of the list while its own models scroll under it, so a model is
		* never read without the provider it belongs to.
		*
		* A row names a model, and its right-hand control names the reasoning effort the
		* route pins — `Default` when it pins none, so the adapter's own level applies.
		* That control opens the platform's `Menu` on the adapter's levels, read when the
		* control is first opened, one model at a time: it is adapter-owned metadata, and
		* resolving every model as the dialog opens would charge the reader for lists
		* they never look at. The ids are shown as the adapter spells them (`high`,
		* `medium`, …) because that is exactly what a saved route stores.
		*
		* The field speaks the effective route: the saved one, or — while this Workspace
		* has saved none — DSH's current default model, the one the user last chose in a
		* session. The list holds only routes that can be saved, so it has no row for
		* "the default" itself: choosing a model is what pins one, and until a reader does
		* that the Workspace goes on following DSH. A field that shows the default route
		* but no row claiming to be it is the honest shape of that state.
		*
		* The prompt field opens on the effective prompt: the Workspace's own text when
		* it has one, and the built-in text otherwise, so the default is readable before
		* it is changed. Whatever the field holds when Save is pressed is what the Host
		* stores and what every later Generate is told — the built-in text included,
		* which is the point of opening on it: the box is the answer, and a reader who
		* left it as it stood asked for those words. Only an empty box drops the override
		* and puts the Workspace back on the built-in prompt, so clearing it — not
		* retyping it — is how a later revision of the default reaches this Workspace.
		* "Restore default" fills the box back in with today's text.
		*
		* The dialog is the platform's Modal, which owns the portal, the mask, Escape,
		* focus return, and the two buttons' placement; the body is this plugin's own
		* because the picker and the multi-line prompt field have no primitive here.
		* Failures are the page's error dialog, not this card's body: the card is a
		* form, and a request that never arrived is not one of its fields.
		*
		* @param props.t - the page's translate seat.
		* @param props.open - whether the dialog is showing.
		* @param props.sessionId - the session whose Workspace these choices belong to.
		* @param props.onClose - called by Cancel, the close button, Escape, or the mask.
		* @param props.onError - called with the failure to state in the error dialog.
		* @returns the dialog element.
		*/
		function SettingsDialog(props) {
			const { t, open, sessionId, onClose, onError } = props;
			const [loading, setLoading] = (0, react.useState)(false);
			const [saving, setSaving] = (0, react.useState)(false);
			const [groups, setGroups] = (0, react.useState)([]);
			const [defaultModel, setDefaultModel] = (0, react.useState)(null);
			const [defaultPrompt, setDefaultPrompt] = (0, react.useState)("");
			const [prompt, setPrompt] = (0, react.useState)("");
			const [selection, setSelection] = (0, react.useState)(null);
			const [pickerOpen, setPickerOpen] = (0, react.useState)(false);
			const [query, setQuery] = (0, react.useState)("");
			/** Where the picker's overlay scrollbar sits, or null when the list fits. */
			const [thumb, setThumb] = (0, react.useState)(null);
			const [collapsed, setCollapsed] = (0, react.useState)([]);
			const [effortOpen, setEffortOpen] = (0, react.useState)(null);
			const [effortLists, setEffortLists] = (0, react.useState)({});
			const [effortFailures, setEffortFailures] = (0, react.useState)([]);
			const [effortLoading, setEffortLoading] = (0, react.useState)([]);
			const [pickerLayout, setPickerLayout] = (0, react.useState)({
				width: PICKER_WIDTH_INITIAL,
				zIndex: 1010,
				side: "bottom"
			});
			const id = (0, react.useId)();
			const modelId = `${id}-model`;
			const pickerId = `${id}-model-picker`;
			const promptId = `${id}-prompt`;
			const modelField = (0, react.useRef)(null);
			const panelRef = (0, react.useRef)(null);
			const listRef = (0, react.useRef)(null);
			/** Model keys whose effort list has been asked for, so one row asks once. */
			const effortsAsked = (0, react.useRef)(/* @__PURE__ */ new Set());
			(0, react.useEffect)(() => {
				if (!open) return;
				let cancelled = false;
				setLoading(true);
				setSaving(false);
				setPickerOpen(false);
				setQuery("");
				setEffortOpen(null);
				setEffortLists({});
				setEffortFailures([]);
				setEffortLoading([]);
				effortsAsked.current.clear();
				fetchSettings(sessionId).then((result) => {
					if (cancelled) return;
					setLoading(false);
					if (result?.ok !== true) {
						onClose();
						onError({
							title: t("title.settingsRead"),
							lines: [failureLine(t, "label.settingsRead", result ?? {}, "fallback.settingsRead")]
						});
						return;
					}
					const nextGroups = Array.isArray(result.groups) ? result.groups : [];
					const builtIn = typeof result.defaultPrompt === "string" ? result.defaultPrompt : "";
					setGroups(nextGroups);
					setDefaultModel(result.defaultModel ?? null);
					setDefaultPrompt(builtIn);
					setPrompt(typeof result.prompt === "string" ? result.prompt : builtIn);
					setSelection(result.model ?? null);
				});
				return () => {
					cancelled = true;
				};
			}, [
				open,
				sessionId,
				onClose,
				onError,
				t
			]);
			(0, react.useEffect)(() => {
				if (!open || loading) return;
				modelField.current?.focus();
			}, [open, loading]);
			/**
			* Close the list and forget what was typed into it.
			*
			* Stable because the platform's dismiss and layer hooks both take it in their
			* own effect dependencies: a fresh function per keystroke would re-register
			* the popover's layer on every render.
			*/
			const closePicker = (0, react.useCallback)(() => {
				setPickerOpen(false);
				setQuery("");
				setEffortOpen(null);
			}, []);
			/**
			* Place the list's scrollbar thumb over the rows.
			*
			* The list hides its native bar because the platform's scrollbars are 5px of
			* real width: those 5px came out of the rows' right edge, so a provider band and
			* the rows under it stopped short of the panel's edge with the thumb owning a
			* gutter of its own. The thumb drawn here is the same bar, overlaid on the rows'
			* own padding instead, so the layout is the same width whether the catalog
			* overflows or not. It is measured from the scrollport itself, which is why it
			* is re-read on every render that can change the rows (search, folding, a
			* loaded catalog) as well as on every scroll.
			*/
			const measureThumb = (0, react.useCallback)(() => {
				const list = listRef.current;
				if (list === null) return;
				const { scrollTop, scrollHeight, clientHeight } = list;
				if (scrollHeight <= clientHeight + 1) {
					setThumb((current) => current === null ? current : null);
					return;
				}
				const height = Math.max(PICKER_THUMB_MIN, Math.round(clientHeight / scrollHeight * clientHeight));
				const top = Math.round(scrollTop / (scrollHeight - clientHeight) * (clientHeight - height));
				setThumb((current) => current !== null && current.top === top && current.height === height ? current : {
					top,
					height
				});
			}, []);
			(0, react.useLayoutEffect)(() => {
				if (pickerOpen) measureThumb();
			});
			(0, react.useLayoutEffect)(() => {
				if (!open || !pickerOpen) return;
				const measure = () => {
					const trigger = modelField.current;
					if (trigger === null) return;
					const rect = trigger.getBoundingClientRect();
					const width = Math.max(PICKER_WIDTH_MIN, Math.min(rect.width, window.innerWidth - PICKER_MARGIN * 2));
					const below = window.innerHeight - rect.bottom - PICKER_GAP - PICKER_MARGIN;
					const above = rect.top - PICKER_GAP - PICKER_MARGIN;
					const openUp = below < PICKER_HEIGHT && above > below;
					let layer = 0;
					for (let node = trigger.parentElement; node !== null && node !== document.body; node = node.parentElement) {
						const value = Number(window.getComputedStyle(node).zIndex);
						if (Number.isFinite(value)) layer = Math.max(layer, value);
					}
					const next = {
						width,
						zIndex: Math.max(layer + PICKER_Z_STEP, PICKER_Z_BASE),
						side: openUp ? "top" : "bottom"
					};
					setPickerLayout((current) => current.width === next.width && current.zIndex === next.zIndex && current.side === next.side ? current : next);
				};
				measure();
				const followScroll = (event) => {
					if (event.target instanceof Node && panelRef.current?.contains(event.target) === true) return;
					measure();
				};
				window.addEventListener("resize", measure);
				window.addEventListener("scroll", followScroll, true);
				return () => {
					window.removeEventListener("resize", measure);
					window.removeEventListener("scroll", followScroll, true);
				};
			}, [open, pickerOpen]);
			const placement = (0, _deepseek_ai_dsh_client_ui_primitives.useAnchoredPosition)({
				open: pickerOpen,
				anchorRef: modelField,
				panelRef,
				side: pickerLayout.side,
				gap: PICKER_GAP,
				margin: PICKER_MARGIN
			});
			(0, _deepseek_ai_dsh_client_ui_primitives.useModalLayer)(panelRef, pickerOpen, closePicker);
			/**
			* Close the panel on a click anywhere but the field, the panel, or a menu row.
			*
			* The rule is the platform's `useDismissOnOutsidePointer`, restated because the
			* effort control's menu is portaled to `document.body` — a list inside the
			* panel's scrollport would be clipped — and that portaled list is outside both
			* the field and the panel by the platform's test. A level's click would then
			* close the panel before the row could record the level. Menu rows are the
			* panel's own business, so they count as inside.
			*/
			(0, react.useEffect)(() => {
				if (!pickerOpen) return;
				const dismiss = (event) => {
					const target = event.target;
					if (!(target instanceof Node)) return;
					if (modelField.current?.contains(target) === true) return;
					if (panelRef.current?.contains(target) === true) return;
					if (target instanceof Element && target.closest("[role=\"menu\"]") !== null) return;
					closePicker();
				};
				document.addEventListener("pointerdown", dismiss);
				return () => document.removeEventListener("pointerdown", dismiss);
			}, [closePicker, pickerOpen]);
			/** The effort one route pins, spelled as the row's control spells it. */
			const effortOf = (route) => {
				return (route === null ? null : routeEffort(route)) ?? DEFAULT_EFFORT;
			};
			const knownRoutes = new Set(groups.flatMap((group) => group.models.map((model) => modelKey({
				provider: group.provider,
				model: model.id
			}))));
			const staleRoute = selection !== null && !knownRoutes.has(modelKey(selection)) ? selection : null;
			const effective = selection ?? defaultModel;
			const triggerLabel = effective === null ? t("settings.modelDefaultUnknown") : `${modelLabel(effective, groups)} / ${effortOf(effective)}`;
			const needle = query.trim().toLowerCase();
			const matches = (text) => text.toLowerCase().includes(needle);
			const visibleGroups = needle === "" ? groups : groups.map((group) => {
				const models = matches(group.name) || matches(group.provider) ? group.models : group.models.filter((model) => matches(model.name) || matches(model.id));
				return {
					...group,
					models
				};
			}).filter((group) => group.models.length > 0);
			const staleVisible = staleRoute !== null && (needle === "" || matches(modelLabel(staleRoute, groups)));
			/**
			* Take one route and close the list.
			*
			* Choosing a route is what pins it for this Workspace. The list has no row for
			* "the default", so a Workspace that has saved nothing keeps following DSH
			* until a model is actually chosen. Focus is the platform's: the layer this
			* panel registered returns it to the field the list hung from when that layer
			* closes.
			*/
			const choose = (0, react.useCallback)((next) => {
				setSelection(next);
				closePicker();
			}, [closePicker]);
			/** Fold one provider's models away, or bring them back. */
			const toggleGroup = (provider) => {
				setCollapsed((current) => current.includes(provider) ? current.filter((entry) => entry !== provider) : [...current, provider]);
			};
			/**
			* Read one row's effort list, once per model per opening.
			*
			* The list is adapter metadata and has to be resolved per model, so it is read
			* when the row's control is opened rather than with the catalog. A failed read
			* is kept beside its row and shown there: it is not the dialog's failure, and
			* the row must not pretend the model offers no level.
			*/
			const loadEfforts = (route) => {
				const key = modelKey(route);
				if (effortsAsked.current.has(key)) return;
				effortsAsked.current.add(key);
				setEffortLoading((current) => [...current, key]);
				fetchModelEfforts(route.provider, route.model).then((result) => {
					setEffortLoading((current) => current.filter((entry) => entry !== key));
					if (result?.ok === true) {
						const efforts = Array.isArray(result.efforts) ? result.efforts.filter((effort) => typeof effort === "string" && effort !== "") : [];
						setEffortLists((current) => ({
							...current,
							[key]: efforts
						}));
						return;
					}
					setEffortLists((current) => ({
						...current,
						[key]: []
					}));
					setEffortFailures((current) => current.includes(key) ? current : [...current, key]);
				});
			};
			/** Open one row's effort control, or close it when it is already open. */
			const toggleEfforts = (route) => {
				const key = modelKey(route);
				if (effortOpen === key) {
					setEffortOpen(null);
					return;
				}
				setEffortOpen(key);
				loadEfforts(route);
			};
			/**
			* Close the dialog unless a save is in flight.
			*
			* The wrapper is stable because the platform's Modal takes `onClose` in its
			* own effects: an inline function would re-register its layer on every
			* keystroke and could pull focus back to the close button while the reader is
			* editing the prompt.
			*/
			const requestClose = (0, react.useCallback)(() => {
				if (!saving) onClose();
			}, [onClose, saving]);
			/**
			* Store both answers and close on success.
			*
			* A failed write leaves the dialog open: the reason is in the page's error
			* dialog, and the form still holds the choice that failed to save, so the
			* reader can retry without reconstructing it.
			*/
			const submit = (0, react.useCallback)(() => {
				if (loading || saving) return;
				setSaving(true);
				saveSettings(sessionId, selection, prompt).then((result) => {
					setSaving(false);
					if (result?.ok !== true) {
						onError({
							title: t("title.settings"),
							lines: [failureLine(t, "label.settings", result ?? {}, "fallback.settings")]
						});
						return;
					}
					onClose();
				});
			}, [
				loading,
				onClose,
				onError,
				prompt,
				saving,
				selection,
				sessionId,
				t
			]);
			/**
			* Draw one model row and the effort control that row owns.
			*
			* The two are separate controls rather than one: naming a model is not naming a
			* level, and a reader who wants `high` should not have to reopen the list after
			* choosing the model. The row shows the level its route currently pins, and the
			* control opens the adapter's own levels in the platform's `Menu` — a short list
			* of named levels is what a menu is, and its portal keeps the list from being
			* clipped by the panel's scrollport. It hangs off the control rather than
			* unfolding in the panel's flow, and the level in force is marked in the list.
			*/
			const renderRouteRow = (route, label, chosen) => {
				const key = modelKey(route);
				const pinned = chosen && selection !== null ? routeEffort(selection) : null;
				const open = effortOpen === key;
				const efforts = effortLists[key] ?? [];
				const orphan = pinned !== null && !efforts.includes(pinned) ? [pinned] : [];
				const items = [{
					id: EFFORT_DEFAULT_ID,
					label: DEFAULT_EFFORT
				}];
				if (effortLoading.includes(key)) items.push({
					type: "label",
					id: `${key}-loading`,
					text: t("settings.loading")
				});
				else if (effortFailures.includes(key)) items.push({
					type: "label",
					id: `${key}-failure`,
					text: t("settings.effortReadFailed")
				});
				for (const effort of [...efforts, ...orphan]) items.push({
					id: effort,
					label: effort
				});
				const closeEfforts = () => {
					setEffortOpen((current) => current === key ? null : current);
				};
				return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "dsh-cg-settings-row",
					"data-selected": chosen,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						className: "dsh-cg-settings-row-name",
						"aria-pressed": chosen,
						onClick: () => choose(route),
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dsh-cg-settings-row-text",
							children: label
						}), chosen ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dsh-cg-settings-row-check",
							"aria-hidden": "true",
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconCheck, {})
						}) : null]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Menu, {
						open,
						className: "dsh-cg-settings-effort-control",
						anchor: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
							type: "button",
							className: "dsh-cg-settings-row-effort",
							"aria-haspopup": "menu",
							"aria-expanded": open,
							"aria-label": `${t("settings.effort")}: ${pinned ?? DEFAULT_EFFORT}`,
							onClick: () => toggleEfforts(route),
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: pinned ?? DEFAULT_EFFORT }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dsh-cg-settings-row-arrow",
								"aria-hidden": "true",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconArrowRight, {})
							})]
						}),
						items,
						selectedId: pinned ?? EFFORT_DEFAULT_ID,
						onSelect: (id) => {
							closeEfforts();
							choose(id === EFFORT_DEFAULT_ID ? {
								provider: route.provider,
								model: route.model
							} : {
								provider: route.provider,
								model: route.model,
								reasoningEffort: id
							});
						},
						onClose: closeEfforts,
						align: "end",
						side: "bottom",
						portal: true
					})]
				}, key);
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
				open,
				onClose: requestClose,
				title: t("settings.title"),
				description: t("settings.description"),
				closeLabel: t("dialog.close"),
				className: "dsh-cg-settings-dialog",
				footer: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					variant: "outline",
					disabled: saving,
					onClick: requestClose,
					children: t("settings.cancel")
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					variant: "primary",
					disabled: loading || saving,
					onClick: submit,
					children: saving ? t("settings.saving") : t("settings.save")
				})] }),
				children: loading ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: "dsh-cg-dialog-hint",
					children: t("settings.loading")
				}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "dsh-cg-settings-body",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dsh-cg-settings-field",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
								className: "dsh-cg-settings-label",
								htmlFor: modelId,
								children: t("settings.model")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "dsh-cg-settings-picker",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
									ref: modelField,
									id: modelId,
									type: "button",
									className: "dsh-cg-settings-picker-trigger",
									"aria-expanded": pickerOpen,
									"aria-controls": pickerId,
									disabled: saving,
									onClick: () => {
										setPickerOpen((current) => !current);
										setQuery("");
										setEffortOpen(null);
									},
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "dsh-cg-settings-picker-value",
										children: triggerLabel
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "dsh-cg-settings-picker-chevron",
										"data-open": pickerOpen,
										"aria-hidden": "true",
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconArrowRight, {})
									})]
								})
							}),
							pickerOpen ? (0, react_dom.createPortal)(/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								id: pickerId,
								ref: panelRef,
								className: "dsh-cg-settings-popover",
								role: "group",
								"aria-label": t("settings.model"),
								style: {
									left: placement?.left ?? 0,
									top: placement?.top ?? 0,
									width: pickerLayout.width,
									height: PICKER_HEIGHT,
									zIndex: pickerLayout.zIndex
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: "dsh-cg-settings-picker-search",
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										type: "text",
										className: "dsh-cg-settings-picker-input",
										value: query,
										placeholder: t("settings.modelSearch"),
										"aria-label": t("settings.modelSearch"),
										spellCheck: false,
										onChange: (event) => setQuery(event.target.value)
									})
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "dsh-cg-settings-picker-listwrap",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: "dsh-cg-settings-picker-list",
										ref: listRef,
										onScroll: measureThumb,
										children: [
											staleVisible && staleRoute !== null ? renderRouteRow(staleRoute, t("settings.modelUnavailable", { model: modelLabel(staleRoute, groups) }), true) : null,
											staleVisible ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
												className: "dsh-cg-settings-picker-rule",
												role: "presentation"
											}) : null,
											visibleGroups.map((group) => {
												const expanded = needle !== "" || !collapsed.includes(group.provider);
												return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
													className: "dsh-cg-settings-picker-group",
													children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
														className: "dsh-cg-settings-picker-group-sticky",
														children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
															type: "button",
															className: "dsh-cg-settings-picker-group-head",
															"aria-expanded": expanded,
															onClick: () => toggleGroup(group.provider),
															children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																className: "dsh-cg-settings-picker-group-name",
																children: group.name
															}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																className: "dsh-cg-settings-picker-group-arrow",
																"data-open": expanded,
																"aria-hidden": "true",
																children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconArrowRight, {})
															})]
														})
													}), expanded ? group.models.map((option) => renderRouteRow({
														provider: group.provider,
														model: option.id
													}, option.name, selection !== null && modelKey(selection) === modelKey({
														provider: group.provider,
														model: option.id
													}))) : null]
												}, group.provider);
											}),
											!staleVisible && visibleGroups.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
												className: "dsh-cg-settings-picker-empty",
												children: t("settings.searchEmpty")
											}) : null
										]
									}), thumb === null ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "dsh-cg-settings-picker-thumb",
										style: {
											top: thumb.top,
											height: thumb.height
										},
										"aria-hidden": "true"
									})]
								})]
							}), document.body) : null,
							groups.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: "dsh-cg-settings-note",
								children: t("settings.modelEmpty")
							}) : null
						]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dsh-cg-settings-field",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
								className: "dsh-cg-settings-label",
								htmlFor: promptId,
								children: t("settings.prompt")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dsh-cg-settings-prompt-frame",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
									id: promptId,
									className: "dsh-cg-settings-prompt",
									value: prompt,
									disabled: saving,
									maxLength: MAX_PROMPT_LENGTH,
									spellCheck: false,
									onChange: (event) => setPrompt(event.target.value)
								})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dsh-cg-settings-prompt-foot",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dsh-cg-settings-note",
									children: t("settings.promptHint")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: "dsh-cg-settings-reset",
									disabled: saving || defaultPrompt === "" || prompt === defaultPrompt,
									onClick: () => setPrompt(defaultPrompt),
									children: t("settings.promptReset")
								})]
							})
						]
					})]
				})
			});
		}
		/**
		* The sidebar's first row: the Workspace this session is in, the branch it is
		* on, and the More control every other operation hangs from. It draws no rule of
		* its own: the toolbar, the commit form under it, and the changed-path groups
		* under that are one block, with no hairline drawn anywhere between them.
		*
		* More is one control rather than a button per operation because the row has to
		* fit the sidebar's own floor: Refresh used to be the row's single icon, and the
		* fetch and the merge would have been two more. A menu states them by name
		* instead — a dropdown can be as wide as its words, and a 22px square cannot.
		*
		* The menu is read top to bottom as one sentence about the repository: the two
		* rows that only re-read it (Refresh, Fetch) above the first rule, the two halves
		* of the remote round trip taken on their own (Pull, Push) above the second, the
		* branch rows (create, delete) above the third, and the merge under the last.
		* Fetch sits with Refresh rather than with Pull because that is what it is — a
		* read of the remotes, whose whole effect is that the numbers beside Sync and the
		* remote branches in the picker become true — while Pull and Push sit apart from
		* it, and from each other, because each moves the branch: Sync's order is the
		* one that cannot rewind work, but a reader who wants only one half of it can
		* now ask for exactly that.
		*
		* The branch switch and the merge are both stated as decisions rather than
		* accidents: the dialog lists what Git reported and applies nothing until the
		* choice is confirmed with a button of its own, and this row closes it before
		* handing the branch to the page. Which decision it is comes from the menu row
		* that opened it — Refresh, Fetch, Pull and Push run at once because they have
		* nothing to choose, while a merge names another branch and gets a dialog of its
		* own. The operations themselves are the page's (`GitView`), which owns every
		* operation in flight and disables the rest of the page's controls while one
		* runs.
		*
		* The dialog is the platform's own Modal, which owns the parts that are easy to
		* get wrong — the body portal, the mask, the focus walk, Escape, and returning
		* focus to the control that opened it.
		*
		* The row is also where the two names inside it are spent, and the branch's goes
		* first: a sidebar too narrow for both shortens the pill, whose own name gives way
		* to its icon alone, and only then does the Workspace's name begin to end in an
		* ellipsis. The pill's bubble therefore carries the branch's whole name, and
		* nothing but it — there is no other place the full name still reads once the row
		* has taken it, and an icon on its own is not an answer to which branch this is.
		*
		* @param props.t - the page's translate seat.
		* @param props.status - the current status answer, for the branch already on.
		* @param props.sessionId - the session whose repository is being switched.
		* @param props.refreshing - a re-read of the repository is in flight.
		* @param props.fetching - a fetch of the remote-tracking refs is in flight.
		* @param props.syncing - the half of the remote round trip in flight, if any.
		* @param props.switching - the branch a checkout is in flight for, if any.
		* @param props.merging - whether a merge is in flight.
		* @param props.busy - whether any repository operation is in flight.
		* @param props.onRefresh - called to re-read the repository state and history.
		* @param props.onFetch - called to refresh the remote-tracking refs.
		* @param props.onPull - called to pull the branch from its upstream.
		* @param props.onPush - called to send the branch to its upstream.
		* @param props.onCheckout - called with the branch the dialog confirmed.
		* @param props.onMerge - called with the branch the dialog confirmed.
		* @param props.onCreate - called with the name and starting point the dialog confirmed.
		* @param props.onDelete - called with the branches the delete dialog confirmed;
		*   resolves once the answer has arrived.
		* @param props.onError - called with the failure to state in the error dialog.
		* @param props.undoing - whether the last commit is being taken off the branch.
		* @param props.onUndoCommit - called to take the last commit off the branch.
		* @returns the header row.
		*/
		function SideHead(props) {
			const { t, status, sessionId, refreshing, fetching, syncing, switching, merging, creating, deleting, busy, onRefresh, onFetch, onPull, onPush, onCheckout, onMerge, onCreate, onDelete, onError, commitScope, onCommitScope, undoing, onUndoCommit } = props;
			/** Whether the More menu is showing. */
			const [menuOpen, setMenuOpen] = (0, react.useState)(false);
			/** Which decision the branch list is open for, or null while it is closed. */
			const [pick, setPick] = (0, react.useState)(null);
			/** Whether the delete dialog is showing. */
			const [deleteOpen, setDeleteOpen] = (0, react.useState)(false);
			/** Whether the Settings dialog is showing. */
			const [settingsOpen, setSettingsOpen] = (0, react.useState)(false);
			const onBranch = status?.ok === true;
			const detached = status?.detached === true;
			/**
			* Whether a row behind the More control is running right now.
			*
			* Every operation the menu itself can start, and none of the ones it cannot: a
			* commit or a branch switch belongs to another control, and a spinner on this
			* one would be claiming a wait that is not its own. The remote round trip is
			* one of the menu's now — Pull and Push are its own rows — so it turns this
			* spinner even when the same two calls were started from Sync in the history
			* pane's header. Undoing a commit is a menu row too, and the control has to
			* show that wait once the row has closed the list.
			*/
			const menuBusy = refreshing || fetching || syncing !== null || merging || creating || deleting || undoing;
			/** Close the branch list without applying anything. */
			const closeDialog = (0, react.useCallback)(() => {
				setPick(null);
			}, []);
			/** Close the delete dialog without deleting anything. */
			const closeDelete = (0, react.useCallback)(() => {
				setDeleteOpen(false);
			}, []);
			/** Close the Settings dialog without saving anything. */
			const closeSettings = (0, react.useCallback)(() => {
				setSettingsOpen(false);
			}, []);
			/**
			* Delete the branches the dialog confirmed, and close it when the answer is in.
			*
			* The dialog stays up for the wait — its own submit is the control showing it —
			* and is dismissed once the request has been answered, refusals included: the
			* page's error dialog states those, and the list this dialog was showing has
			* already been replaced by the re-read.
			*
			* @param targets - the branches the dialog selected.
			*/
			const confirmDelete = (0, react.useCallback)((targets) => {
				onDelete(targets).finally(closeDelete);
			}, [onDelete, closeDelete]);
			/**
			* Hand the branch the dialog confirmed to the page, with the decision it was
			* confirmed for.
			*
			* The dialog closes first: every one of these operations rewrites the working
			* tree, and a picker left on screen while one runs would be offering a list
			* that is already stale.
			*
			* @param value - the branch the user picked, or the name a create is for.
			* @param start - the point a create starts at; absent for the other two.
			*/
			const choose = (0, react.useCallback)((value, start) => {
				const mode = pick;
				setPick(null);
				if (mode === "create") {
					if (start !== void 0) onCreate(value, start);
				} else if (mode === "merge-from") onMerge(value);
				else onCheckout(value);
			}, [
				pick,
				onCheckout,
				onMerge,
				onCreate
			]);
			/**
			* Run one row of the More menu.
			*
			* The list closes on every row before the row runs, whichever it was: closing
			* is the owner's decision in the platform's Menu, and the row behind an open
			* list is one the next click would otherwise land on twice.
			*
			* @param id - the selected row's id.
			*/
			const runMenuRow = (0, react.useCallback)((id) => {
				setMenuOpen(false);
				if (id === "refresh") onRefresh();
				else if (id === "fetch") onFetch();
				else if (id === "pull") onPull();
				else if (id === "push") onPush();
				else if (id === "commit-scope-staged") onCommitScope("staged");
				else if (id === "commit-scope-all") onCommitScope("all");
				else if (id === "commit-undo") onUndoCommit();
				else if (id === "branch-create") setPick("create");
				else if (id === "branch-delete") setDeleteOpen(true);
				else if (id === "merge-from") setPick("merge-from");
				else if (id === "settings") setSettingsOpen(true);
			}, [
				onRefresh,
				onFetch,
				onPull,
				onPush,
				onCommitScope,
				onUndoCommit
			]);
			const menuItems = [
				{
					id: "refresh",
					label: t("head.refresh")
				},
				{
					id: "fetch",
					label: t("head.fetch")
				},
				{
					type: "separator",
					id: "remote"
				},
				{
					id: "pull",
					label: t("head.pull")
				},
				{
					id: "push",
					label: t("head.push")
				},
				{
					type: "separator",
					id: "commit"
				},
				{
					id: "commit-scope-staged",
					label: t("commit.scopeStaged")
				},
				{
					id: "commit-scope-all",
					label: t("commit.scopeAll")
				},
				{
					id: "commit-undo",
					label: t("head.undoCommit"),
					disabled: status?.hasHead !== true
				},
				{
					type: "separator",
					id: "branches"
				},
				{
					id: "branch-create",
					label: t("head.branchCreate")
				},
				{
					id: "branch-delete",
					label: t("head.branchDelete")
				},
				{
					type: "separator",
					id: "merge"
				},
				{
					id: "merge-from",
					label: t("head.mergeFrom")
				},
				{
					type: "separator",
					id: "settings-separator"
				},
				{
					id: "settings",
					label: t("head.settings"),
					disabled: !onBranch
				}
			];
			const label = detached ? `HEAD ${status?.head?.short ?? ""}`.trim() : status?.branch === void 0 || status.branch === "" ? t("head.currentBranch") : status.branch;
			const workspaceName = status?.workspace?.title ?? workspaceFallback(status);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-cg-side-head",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: "dsh-cg-workspace",
						title: status?.workspace?.path ?? status?.root ?? "",
						children: [workspaceName === "" ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dsh-cg-workspace-icon",
							"aria-hidden": "true",
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconFolder, {})
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dsh-cg-workspace-name",
							children: workspaceName
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
						label,
						side: "bottom",
						delayMs: TOOLTIP_DELAY_MS,
						portal: true,
						maxWidth: TOOLTIP_MAX_WIDTH,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dsh-cg-tip dsh-cg-branch-tip",
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								className: "dsh-cg-branch",
								disabled: !onBranch || busy,
								"aria-haspopup": "dialog",
								"aria-expanded": pick === "switch",
								onClick: () => setPick((value) => value === "switch" ? null : "switch"),
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "dsh-cg-branch-icon",
										"data-busy": switching !== null,
										"aria-hidden": "true",
										children: switching === null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconBranch, {}) : SPINNER_ICON
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "dsh-cg-branch-name",
										children: label
									}),
									detached ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "dsh-cg-divergence",
										children: t("head.detached")
									}) : null
								]
							})
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(BranchDialog, {
						t,
						mode: pick,
						sessionId,
						onClose: closeDialog,
						onConfirm: choose,
						onError
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(BranchDeleteDialog, {
						t,
						open: deleteOpen,
						sessionId,
						busy: deleting,
						onClose: closeDelete,
						onConfirm: confirmDelete,
						onError
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SettingsDialog, {
						t,
						open: settingsOpen,
						sessionId,
						onClose: closeSettings,
						onError
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dsh-cg-tools",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Menu, {
							open: menuOpen,
							anchor: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
								label: t("head.more"),
								side: "bottom",
								delayMs: TOOLTIP_DELAY_MS,
								portal: true,
								maxWidth: TOOLTIP_MAX_WIDTH,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dsh-cg-tip",
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: "dsh-cg-icon",
										"aria-label": t("head.more"),
										"aria-haspopup": "menu",
										"aria-expanded": menuOpen,
										"data-busy": menuBusy,
										disabled: refreshing || busy,
										onClick: () => setMenuOpen((value) => !value),
										children: menuBusy ? SPINNER_ICON : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconMore, {})
									})
								})
							}),
							items: menuItems,
							selectedId: commitScope === "staged" ? "commit-scope-staged" : "commit-scope-all",
							onSelect: runMenuRow,
							onClose: () => setMenuOpen(false),
							align: "start",
							side: "bottom"
						})
					})
				]
			});
		}
		/**
		* The remote control that lives in the history pane's header: Sync on a branch
		* with an upstream, Publish branch on one without.
		*
		* It stands where the commits it moves are listed rather than in the toolbar
		* above the panes, opposite the pane's own name and count: what the two counts
		* are counted against, and what the round trip brings and sends, is the history
		* under it. It stays an icon because that row is the sidebar's narrowest place —
		* the name and count share it with this button — and the bubble behind it is where
		* the names read: Sync with both counts spelled out as what is to be pulled and
		* what is to be pushed, or Publish branch alone on a branch that has nothing to
		* count yet. The bubble's text is the button's accessible name as well, so a
		* screen reader hears the same counts.
		*
		* Sync is the round trip taken in the one order that cannot rewind work: a pull
		* that merges when it has to, then a push of what is left. Both arrows and both counts
		* stay inside that single button — `↓` behind is what the pull brings, `↑` ahead
		* is what the push sends — so the control that states the divergence is the one
		* that resolves it, and each arrow turns while its own half is in flight. A glyph
		* and a digit are all the header has room for, so the words that say which
		* direction each number belongs to live in the bubble rather than on the button.
		*
		* Publish takes Sync's place on a branch with no upstream, because that branch
		* has no divergence to state and no pull to take: what it needs is the push that
		* creates the remote branch and records it as the upstream. One cloud-and-arrow
		* glyph, the same tooltip-only naming, and the two are never offered together.
		*
		* Which control that is, is the branch's own answer rather than a setting, read
		* from the answer the page already has. `reachable` is the repository's own word
		* on whether there is a branch to move at all; `hasUpstream` is what makes a pull
		* possible, what the two counts are counted against, and what decides which of
		* the two is drawn — a branch with no upstream has no remote to have diverged
		* from, so there is nothing to count and nothing to sync. Neither control is ever
		* asked to show a number it cannot stand behind.
		*
		* Both counts are always numbers, zeros included. A control whose numbers vanish
		* when nothing is pending reads as broken rather than as idle, and a digit that
		* came and went as commits moved would shift the header under the cursor; `0` is
		* the honest answer for a branch in step with its upstream. The fallback in the
		* two counts is never drawn — the sync control needs an upstream to exist — it
		* only keeps them plain numbers.
		*
		* This component makes only the choice; `SyncControl` and `PublishControl` below
		* draw the two answers, each owning the markup of exactly one control.
		*
		* @param props.t - the page's translate seat.
		* @param props.status - the current status answer, for the branch already on.
		* @param props.syncing - the half of the round trip in flight, if any.
		* @param props.busy - whether any repository operation is in flight.
		* @param props.refreshing - a re-read of the repository is in flight.
		* @param props.onSync - called to run the pull-then-push round trip.
		* @param props.onPublish - called to push a branch that has no upstream yet.
		* @returns the control the branch's own state calls for.
		*/
		function RemoteControl(props) {
			const { t, status, syncing, busy, refreshing, onSync, onPublish } = props;
			const reachable = status?.ok === true && status?.detached !== true;
			const hasUpstream = reachable && status?.upstream !== void 0;
			const behind = hasUpstream ? status?.behind ?? 0 : 0;
			const ahead = hasUpstream ? status?.ahead ?? 0 : 0;
			/** Both controls answer to the page's one rule: nothing while an operation runs. */
			const disabled = !reachable || busy || refreshing;
			if (reachable && !hasUpstream) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PublishControl, {
				t,
				running: syncing === "push",
				disabled,
				onPublish
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SyncControl, {
				t,
				behind,
				ahead,
				pulling: syncing === "pull",
				pushing: syncing === "push",
				disabled,
				onSync
			});
		}
		/**
		* Publish branch: one glyph, drawn while the branch has no upstream to sync with.
		*
		* @param props.t - the page's translate seat.
		* @param props.running - the push this control asked for is in flight.
		* @param props.disabled - an operation is in flight, or the branch cannot be published.
		* @param props.onPublish - called to push the branch and record the remote as its upstream.
		* @returns the control.
		*/
		function PublishControl(props) {
			const { t, running, disabled, onPublish } = props;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
				label: t("remote.publish"),
				side: "bottom",
				delayMs: TOOLTIP_DELAY_MS,
				portal: true,
				maxWidth: TOOLTIP_MAX_WIDTH,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: "dsh-cg-tip",
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: "dsh-cg-icon",
						"aria-label": t("remote.publish"),
						"data-busy": running,
						disabled,
						onClick: onPublish,
						children: running ? SPINNER_ICON : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconPublish, {})
					})
				})
			});
		}
		/**
		* Sync: one button carrying both halves of the remote round trip.
		*
		* The bubble's text is the button's accessible name as well, so a screen reader
		* hears the same two counts.
		*
		* @param props.t - the page's translate seat.
		* @param props.behind - commits the pull brings, always a number, zero included.
		* @param props.ahead - commits the push sends, always a number, zero included.
		* @param props.pulling - the pull half of the round trip is in flight.
		* @param props.pushing - the push half of the round trip is in flight.
		* @param props.disabled - an operation is in flight, or the branch cannot be synced.
		* @param props.onSync - called to run the pull-then-push round trip.
		* @returns the control.
		*/
		function SyncControl(props) {
			const { t, behind, ahead, pulling, pushing, disabled, onSync } = props;
			const label = t("remote.sync", {
				behind,
				ahead
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
				label,
				side: "bottom",
				delayMs: TOOLTIP_DELAY_MS,
				portal: true,
				maxWidth: TOOLTIP_MAX_WIDTH,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: "dsh-cg-tip",
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						className: "dsh-cg-icon dsh-cg-sync",
						"aria-label": label,
						disabled,
						onClick: onSync,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: "dsh-cg-sync-arrow",
							"data-busy": pulling,
							"data-pending": behind > 0,
							"aria-hidden": "true",
							children: [pulling ? SPINNER_ICON : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconPull, {}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dsh-cg-sync-count",
								children: behind
							})]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: "dsh-cg-sync-arrow",
							"data-busy": pushing,
							"data-pending": ahead > 0,
							"aria-hidden": "true",
							children: [pushing ? SPINNER_ICON : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconPush, {}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dsh-cg-sync-count",
								children: ahead
							})]
						})]
					})
				})
			});
		}
		/** The dictionary entry naming each run of rows. */
		const BRANCH_GROUP_KEY = {
			current: "branch.current",
			local: "branch.local",
			remote: "branch.remote"
		};
		/**
		* The words each decision reads.
		*
		* The three dialogs differ only in their copy, which is why they share one list;
		* this table is where that difference lives, so the dialog below states the
		* structure once. A closed dialog has no mode and reads the switch's row, which
		* nothing draws.
		*/
		const BRANCH_PICK_COPY = {
			switch: {
				title: "branch.title",
				description: "branch.description",
				none: "branch.none",
				confirm: "branch.confirm"
			},
			"merge-from": {
				title: "merge.titleFrom",
				description: "merge.descriptionFrom",
				none: "merge.noneFrom",
				confirm: "merge.confirm"
			},
			create: {
				title: "create.title",
				description: "create.description",
				none: "create.none",
				confirm: "create.confirm"
			}
		};
		/**
		* Drive one scrolling dialog list's two edge fades.
		*
		* A branch list can be two hundred rows long and the card cuts it at a fixed
		* height, so the two ends are where a dialog has to admit there is more: an edge
		* fades its rows into the card's own surface only while that edge really hides
		* some. The attributes are written straight to the wrapper (no re-render), a
		* scroll listener follows the offset, a ResizeObserver follows the box, and the
		* scrollbar gutter is recorded so the fade covers the content column and leaves
		* the bar alone. No dependency list: a filter keystroke and a fresh list both
		* land as commits, and re-running is what re-reads the new heights.
		*
		* A hook rather than an effect copied into each dialog, because both of them cut
		* a list at the same height for the same reason and a second copy would be a
		* second place for the two to drift.
		*
		* @param scroll - the scrolling element, or a ref that is not attached yet.
		* @param wrap - the wrapper the fades are pinned to.
		*/
		function useListFades(scroll, wrap) {
			(0, react.useEffect)(() => {
				const box = scroll.current;
				const outer = wrap.current;
				if (box === null || outer === null) return;
				const update = () => {
					const overflow = box.scrollHeight - box.clientHeight > 1;
					outer.toggleAttribute("data-fade-top", overflow && box.scrollTop > 1);
					outer.toggleAttribute("data-fade-bottom", overflow && box.scrollTop + box.clientHeight < box.scrollHeight - 1);
					const gutter = `${box.offsetWidth - box.clientWidth}px`;
					if (outer.style.getPropertyValue("--dsh-cg-fade-right") !== gutter) outer.style.setProperty("--dsh-cg-fade-right", gutter);
				};
				update();
				box.addEventListener("scroll", update, { passive: true });
				const observer = typeof ResizeObserver === "undefined" ? void 0 : new ResizeObserver(update);
				observer?.observe(box);
				return () => {
					box.removeEventListener("scroll", update);
					observer?.disconnect();
				};
			});
		}
		/**
		* The branches Git reports, as a dialog the choice is confirmed in.
		*
		* A dialog rather than a dropdown because the list here is the whole decision: a
		* repository can hold hundreds of branches, so the list scrolls inside a fixed
		* height and carries a filter of its own. The rows are the groups a branch can
		* come from — current, local, remote — each labelled where it starts, so a
		* remote name is never mistaken for a local one of the same shape and the branch
		* already checked out needs no mark of its own. Which groups are offered is the
		* decision's answer rather than a setting: a switch lists all three, while a
		* merge drops the branch HEAD is on, because Git refuses to merge a branch into
		* itself.
		*
		* The pointer is the whole of the selection: a click marks one row — a switch
		* opens on the branch it is already showing, while a merge opens on nothing,
		* because there is no branch it could sensibly default to — and that mark is what
		* the footer's button applies. The click itself applies nothing, because every
		* one of these operations rewrites the working tree and a stray click on a
		* scrolling list must not do that. The filter narrows the groups as it is typed,
		* dropping a selection it has just hidden, and Escape closes the dialog the way
		* the Modal's own layer does it.
		*
		* The list is read when the dialog opens, never before and never cached: this is
		* the only question the page asks that the tab's own mount does not already
		* answer, branches appear and disappear as the agent works, and a list read at
		* mount would be stale by the time anyone opened it.
		*
		* Whether the operation is allowed is Git's answer, not this half's: the dialog
		* asks the Host to switch or merge and nothing else, so a working tree Git would
		* refuse over comes back as the refusal it is — the paths in the way and all — in
		* the page's error dialog. The only choices made here are which branch, and
		* whether the footer's button is pressed at all.
		*
		* A read that fails closes the dialog and is stated by the page's one error
		* dialog, so the page keeps a single failure shape. The one exception is a
		* directory that is not a repository: that is not a failure, so the dialog says
		* so in place.
		*
		* @param props.t - the page's translate seat.
		* @param props.mode - the decision the list is open for, or null while it is closed.
		* @param props.sessionId - the session whose repository is being read.
		* @param props.onClose - called by Cancel, the close button, Escape, or the mask.
		* @param props.onConfirm - called when the footer is pressed: with the picked
		* branch for a switch or a merge, and with the typed name and the picked starting
		* point for a create.
		* @param props.onError - called with the failure to state in the error dialog.
		* @returns the dialog element.
		*/
		function BranchDialog(props) {
			const { t, mode, sessionId, onClose, onConfirm, onError } = props;
			/** Whether the dialog is showing at all; the mode then says what for. */
			const open = mode !== null;
			/** The local branches Git reported, or null while it has not answered yet. */
			const [branches, setBranches] = (0, react.useState)(null);
			/** The remote-tracking branches Git reported. */
			const [remoteBranches, setRemoteBranches] = (0, react.useState)([]);
			/**
			* The name a create is being asked for.
			*
			* The only state here that is not a branch the Host reported: a create is the
			* one decision whose answer is not already on the list, so it is the one the
			* reader has to write. It is kept across the read for the reason the filter is
			* — the field is mounted before the branches arrive, and a keystroke typed
			* while it loads is not one to throw away.
			*/
			const [name, setName] = (0, react.useState)("");
			const [current, setCurrent] = (0, react.useState)(null);
			const [truncated, setTruncated] = (0, react.useState)(false);
			/** A directory that is not a repository: the dialog's own empty state. */
			const [noRepo, setNoRepo] = (0, react.useState)(false);
			/** The row the dialog is on, which the footer's button then applies. */
			const [picked, setPicked] = (0, react.useState)(null);
			const [filter, setFilter] = (0, react.useState)("");
			/** The scrolling branch list, and the wrapper its edge fades are pinned to. */
			const listScroll = (0, react.useRef)(null);
			const listWrap = (0, react.useRef)(null);
			(0, react.useEffect)(() => {
				if (!open) return;
				let cancelled = false;
				fetchBranches(sessionId).then((result) => {
					if (cancelled) return;
					if (result?.ok !== true) {
						const missing = isNoRepo(result);
						setBranches([]);
						setNoRepo(missing);
						if (!missing) {
							onClose();
							onError({
								title: t("title.branches"),
								lines: [reasonOf(t, result, "fallback.branches")]
							});
						}
						return;
					}
					const on = typeof result.current === "string" ? result.current : null;
					setBranches(Array.isArray(result.branches) ? result.branches : []);
					setRemoteBranches(Array.isArray(result.remotes) ? result.remotes : []);
					setCurrent(on);
					setTruncated(result.truncated === true);
					setPicked(mode === "merge-from" ? null : on);
				});
				return () => {
					cancelled = true;
					setBranches(null);
					setRemoteBranches([]);
					setCurrent(null);
					setTruncated(false);
					setNoRepo(false);
					setPicked(null);
					setFilter("");
					setName("");
				};
			}, [
				open,
				mode,
				sessionId,
				onClose,
				onError,
				t
			]);
			useListFades(listScroll, listWrap);
			const copy = mode === null ? BRANCH_PICK_COPY.switch : BRANCH_PICK_COPY[mode];
			const title = t(copy.title);
			const description = t(copy.description);
			const emptyText = t(copy.none);
			const rows = [
				...mode !== "merge-from" && current !== null ? [{
					name: current,
					group: "current"
				}] : [],
				...(branches ?? []).filter((name) => name !== current).map((name) => ({
					name,
					group: "local"
				})),
				...remoteBranches.map((name) => ({
					name,
					group: "remote"
				}))
			];
			/**
			* The rows one filter value leaves.
			*
			* A function rather than a value because the filter's own change handler has to
			* know the list its new value produces — the active row is put back on the
			* first match as the list narrows, and that is the row the next Enter applies.
			*
			* @param value - the filter's text.
			* @returns the rows whose name contains it, case-insensitively.
			*/
			const shownFor = (value) => {
				const needle = value.trim().toLowerCase();
				return needle === "" ? rows : rows.filter((row) => row.name.toLowerCase().includes(needle));
			};
			const shown = shownFor(filter);
			/**
			* The name a create would be asked for, as the field holds it.
			*
			* Trimmed here rather than at the request, because the footer's gate is what
			* reads it and a field holding only spaces is an empty field: a name of spaces
			* is one Git refuses, and the button must be dark before that refusal rather
			* than after it. The name Git itself gets is this same string.
			*/
			const nameInput = name.trim();
			/**
			* Whether the footer's button may apply this branch.
			*
			* The one gate, consulted by the footer: that button is what asks for the
			* switch, the merge or the create, so a row the working tree is already on is
			* not a choice a switch or a merge may offer — Git would refuse to merge a
			* branch into itself, and a switch to where you already are is no switch. A
			* create is the exception in both halves: standing on the branch you are
			* branching from is the ordinary case, and the list is not the answer at all —
			* it is the point to start at — so that button waits on the typed name instead.
			* Two refusals only — nothing selected, and the branch already checked out —
			* because whether the operation would be accepted is Git's answer, given when
			* it is asked for and stated by the error dialog if it is a refusal.
			*
			* @param name - the branch to judge, or null when no row is selected.
			* @returns true when the footer may apply that branch.
			*/
			const applicable = (name) => mode === "create" ? name !== null && nameInput !== "" : name !== null && name !== current;
			let content;
			if (noRepo) content = /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
				className: "dsh-cg-dialog-hint",
				children: t("branch.notRepo")
			});
			else if (branches !== null && rows.length === 0) content = /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
				className: "dsh-cg-dialog-hint",
				children: emptyText
			});
			else content = /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
					className: "dsh-cg-branch-filter",
					type: "text",
					value: filter,
					placeholder: t("branch.search"),
					"aria-label": t("branch.search"),
					"data-modal-autofocus": mode === "create" ? void 0 : true,
					onChange: (event) => {
						const value = event.target.value;
						setFilter(value);
						setPicked(shownFor(value).some((row) => row.name === picked) ? picked : null);
					}
				}),
				branches === null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: "dsh-cg-dialog-hint",
					children: t("branch.loading")
				}) : shown.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: "dsh-cg-dialog-hint",
					children: t("branch.noMatch")
				}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "dsh-cg-branch-list-wrap",
					ref: listWrap,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "dsh-cg-branch-list",
							role: "listbox",
							"aria-label": t("branch.list"),
							ref: listScroll,
							children: shown.map((row, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react.Fragment, { children: [row.group === shown[index - 1]?.group ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								role: "presentation",
								className: "dsh-cg-branch-group",
								children: t(BRANCH_GROUP_KEY[row.group])
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								role: "option",
								"aria-selected": picked === row.name,
								tabIndex: -1,
								className: "dsh-cg-branch-row",
								onMouseDown: (event) => {
									event.preventDefault();
								},
								onClick: () => setPicked(row.name),
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dsh-cg-branch-row-name",
									children: row.name
								})
							})] }, row.name))
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dsh-cg-branch-fade dsh-cg-branch-fade-top",
							"aria-hidden": "true"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dsh-cg-branch-fade dsh-cg-branch-fade-bottom",
							"aria-hidden": "true"
						})
					]
				}),
				truncated ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: "dsh-cg-dialog-hint",
					children: t("branch.truncated")
				}) : null
			] });
			const canConfirm = applicable(picked);
			const confirmLabel = t(copy.confirm);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
				open,
				onClose,
				title,
				description,
				closeLabel: t("dialog.close"),
				className: "dsh-cg-branch-dialog",
				footer: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
					mode === "create" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
						className: "dsh-cg-branch-create-name",
						type: "text",
						value: name,
						placeholder: t("create.name"),
						"aria-label": t("create.name"),
						"data-modal-autofocus": true,
						onChange: (event) => setName(event.target.value)
					}) : null,
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
						variant: "outline",
						onClick: onClose,
						children: t("branch.cancel")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
						variant: "primary",
						disabled: !canConfirm,
						onClick: () => {
							if (picked !== null) onConfirm(mode === "create" ? nameInput : picked, picked);
						},
						children: confirmLabel
					})
				] }),
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "dsh-cg-branch-body",
					children: content
				})
			});
		}
		/** The tooltip each unsafe mark states. A safe row carries no mark and no words. */
		const SAFETY_TIP_KEY = {
			unmerged: "safety.unmerged",
			unpushed: "safety.unpushed",
			gone: "safety.gone"
		};
		/**
		* The branches Git reports, as a dialog they are picked out of for deletion.
		*
		* A dialog of its own rather than a fourth mode on the branch list, because the
		* decision is a different shape: that list answers with one branch and this one
		* with as many as are ticked, its rows carry a verdict — whether Git will take
		* the branch — that a switch has no use for, and one of its rows is disabled
		* rather than merely unhelpful. What the two do share is the scroll box, the
		* filter and the edge fades, which are read from the same refs by the same hook.
		*
		* A row Git would refuse to delete carries an alert at its right edge, and a row
		* it would take carries nothing: the mark is the one thing worth reading before a
		* tick, and spelling "safe to delete" on every other row only made the list
		* noisier. The alert states its reason in a tooltip, so the row itself stays a
		* name and nothing else. Every row is still selectable, the current branch aside:
		* the mark is what the page knows, and whether a branch may be deleted is Git's
		* answer, given when the delete is asked for. A branch whose commits are nowhere
		* else is refused by Git's own `-d`, and the page's job is to have said so on the
		* row rather than to have hidden the row. The one exception is the branch HEAD is
		* on, which Git will refuse in every case: it is the one row drawn disabled
		* rather than offered, and its group heading is what names it.
		*
		* The selection is held as the rows' own keys rather than as names, because the
		* two lists can hold the same name: a local branch may be called `origin/main`,
		* and a tick on one of them is not a tick on the other.
		*
		* The list is read when the dialog opens, never cached, for the branch list's
		* reason: branches appear and disappear as the agent works. A read that fails
		* closes the dialog and is stated by the page's one error dialog, except for a
		* directory that is not a repository, which is the dialog's own empty state.
		*
		* The delete is the one operation this dialog waits for: the footer's button
		* turns into the wait itself and the card stays up until the request is
		* answered, so the click that started it has somewhere to show for it. A
		* refusal takes the same path — the page's error dialog states what Git said
		* about each branch, and the list behind it has already been re-read.
		*
		* @param props.t - the page's translate seat.
		* @param props.open - whether the dialog is showing.
		* @param props.sessionId - the session whose repository is being read.
		* @param props.busy - whether the delete the dialog asked for is still in flight.
		* @param props.onClose - called by Cancel, the close button, Escape, or the mask;
		*   ignored while a delete is in flight.
		* @param props.onConfirm - called with the branches to delete when the footer is pressed.
		* @param props.onError - called with the failure to state in the error dialog.
		* @returns the dialog element.
		*/
		function BranchDeleteDialog(props) {
			const { t, open, sessionId, busy, onClose, onConfirm, onError } = props;
			/** The branches Git reported, or null while it has not answered yet. */
			const [report, setReport] = (0, react.useState)(null);
			/** A directory that is not a repository: the dialog's own empty state. */
			const [noRepo, setNoRepo] = (0, react.useState)(false);
			/** The keys of the rows that are ticked, in the order they were ticked. */
			const [selection, setSelection] = (0, react.useState)([]);
			const [filter, setFilter] = (0, react.useState)("");
			const listScroll = (0, react.useRef)(null);
			const listWrap = (0, react.useRef)(null);
			/**
			* The dismissal to draw while the delete runs.
			*
			* Escape, the mask and the close button all arrive through the Modal's one
			* `onClose`, so the dialog keeps its place until the answer is in: hiding it
			* mid-request would take the only control reporting the wait off screen, and
			* the page's own re-read is what tells the story afterwards.
			*/
			const hold = (0, react.useCallback)(() => {}, []);
			(0, react.useEffect)(() => {
				if (!open) return;
				let cancelled = false;
				fetchBranchReport(sessionId).then((result) => {
					if (cancelled) return;
					if (result?.ok !== true) {
						const missing = isNoRepo(result);
						setReport(null);
						setNoRepo(missing);
						if (!missing) {
							onClose();
							onError({
								title: t("title.branches"),
								lines: [reasonOf(t, result, "fallback.branches")]
							});
						}
						return;
					}
					setReport(result);
				});
				return () => {
					cancelled = true;
					setReport(null);
					setNoRepo(false);
					setSelection([]);
					setFilter("");
				};
			}, [
				open,
				sessionId,
				onClose,
				onError,
				t
			]);
			useListFades(listScroll, listWrap);
			/** One row's identity: its name within its own list, never across the two. */
			const keyOf = (entry) => `${entry.kind}:${entry.name}`;
			const locals = report?.locals ?? [];
			const rows = [
				...locals.filter((entry) => entry.current === true).map((entry) => ({
					entry,
					group: "current"
				})),
				...locals.filter((entry) => entry.current !== true).map((entry) => ({
					entry,
					group: "local"
				})),
				...(report?.remotes ?? []).map((entry) => ({
					entry,
					group: "remote"
				}))
			];
			/**
			* The rows one filter value leaves.
			*
			* @param value - the filter's text.
			* @returns the rows whose name contains it, case-insensitively.
			*/
			const shownFor = (value) => {
				const needle = value.trim().toLowerCase();
				return needle === "" ? rows : rows.filter((row) => row.entry.name.toLowerCase().includes(needle));
			};
			const shown = shownFor(filter);
			/**
			* The branches to delete, in the shape the Host asked to be given them back.
			*
			* A row that is missing the pair a remote-tracking row is deleted by is left
			* out rather than guessed at: the Host resolves the remote and the branch when
			* it reads the list, so a row without them is one this half cannot name, and
			* naming nothing is not a deletion to ask for.
			*/
			const targets = rows.filter((row) => selection.includes(keyOf(row.entry))).flatMap((row) => {
				const entry = row.entry;
				if (entry.kind !== "remote") return [{
					name: entry.name,
					kind: "local"
				}];
				if (entry.remote === void 0 || entry.branch === void 0) return [];
				return [{
					name: entry.name,
					kind: "remote",
					remote: entry.remote,
					branch: entry.branch
				}];
			});
			let content;
			if (noRepo) content = /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
				className: "dsh-cg-dialog-hint",
				children: t("branch.notRepo")
			});
			else if (report !== null && rows.length === 0) content = /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
				className: "dsh-cg-dialog-hint",
				children: t("delete.none")
			});
			else content = /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
					className: "dsh-cg-branch-filter",
					type: "text",
					value: filter,
					placeholder: t("branch.search"),
					"aria-label": t("branch.search"),
					"data-modal-autofocus": true,
					disabled: busy,
					onChange: (event) => {
						const value = event.target.value;
						setFilter(value);
						const visible = new Set(shownFor(value).map((row) => keyOf(row.entry)));
						setSelection((previous) => previous.filter((key) => visible.has(key)));
					}
				}),
				report === null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: "dsh-cg-dialog-hint",
					children: t("branch.loading")
				}) : shown.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: "dsh-cg-dialog-hint",
					children: t("branch.noMatch")
				}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "dsh-cg-branch-list-wrap",
					ref: listWrap,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "dsh-cg-branch-list",
							role: "group",
							"aria-label": t("delete.list"),
							ref: listScroll,
							children: shown.map((row, index) => {
								const entry = row.entry;
								const key = keyOf(entry);
								const tip = entry.current === true || entry.safety === "safe" ? null : t(SAFETY_TIP_KEY[entry.safety]);
								return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react.Fragment, { children: [row.group === shown[index - 1]?.group ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									role: "presentation",
									className: "dsh-cg-branch-group",
									children: t(BRANCH_GROUP_KEY[row.group])
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									className: "dsh-cg-delete-row",
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
											type: "checkbox",
											className: "dsh-cg-delete-check",
											checked: selection.includes(key),
											disabled: entry.current === true || busy,
											onChange: () => setSelection((previous) => previous.includes(key) ? previous.filter((one) => one !== key) : [...previous, key])
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "dsh-cg-delete-name",
											children: entry.name
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "dsh-cg-delete-trail",
											children: tip === null ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
												label: tip,
												side: "top",
												align: "end",
												delayMs: TOOLTIP_DELAY_MS,
												portal: true,
												maxWidth: TOOLTIP_MAX_WIDTH,
												children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: "dsh-cg-delete-alert",
													role: "img",
													"aria-label": tip,
													children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconAlert, {})
												})
											})
										})
									]
								})] }, key);
							})
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dsh-cg-branch-fade dsh-cg-branch-fade-top",
							"aria-hidden": "true"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dsh-cg-branch-fade dsh-cg-branch-fade-bottom",
							"aria-hidden": "true"
						})
					]
				}),
				report?.truncated === true ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: "dsh-cg-dialog-hint",
					children: t("branch.truncated")
				}) : null
			] });
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
				open,
				onClose: busy ? hold : onClose,
				title: t("delete.title"),
				description: t("delete.description"),
				closeLabel: t("dialog.close"),
				className: "dsh-cg-branch-dialog",
				footer: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					variant: "outline",
					disabled: busy,
					onClick: onClose,
					children: t("branch.cancel")
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					variant: "primary",
					className: busy ? "dsh-cg-delete-confirm dsh-cg-delete-confirm-busy" : "dsh-cg-delete-confirm",
					disabled: busy || selection.length === 0,
					icon: busy ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dsh-cg-delete-spinner",
						children: SPINNER_ICON
					}) : void 0,
					onClick: () => onConfirm(targets),
					children: busy ? t("delete.busy") : selection.length === 0 ? t("delete.confirm") : t("delete.confirmCount", { count: selection.length })
				})] }),
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "dsh-cg-branch-body",
					"aria-busy": busy || void 0,
					children: content
				})
			});
		}
		/**
		* The Workspace name to fall back to when the registry cannot name one.
		*
		* The repository's own directory is the honest answer: it is what the tab is
		* actually showing, and it needs no registry to be true.
		*
		* @param status - the current status answer.
		* @returns the directory's final segment, or an empty string.
		*/
		function workspaceFallback(status) {
			const root = status?.ok === true ? status.root : void 0;
			if (root === void 0 || root === "") return "";
			return splitPath(root.replace(/\/+$/, "")).name;
		}
		/**
		* The sidebar's commit form: a message field, the control that writes a message
		* for it, and the button that commits everything the changed-path list holds.
		*
		* It is the column's own row — under the toolbar and above both panes — rather
		* than a part of the pane whose list it commits. The field is a row of its own
		* and the two controls share the row under it: the sidebar is narrow, and a field
		* sharing one line with the buttons would leave none of them a readable width at
		* the pane's floor. The field opens at 28px and the controls are their own `sm`
		* height, so the pair costs the lists about one changed-path row each.
		*
		* Generate is the left-hand control of that row and the Commit button the right,
		* in the order the two acts belong in: the model writes a message from the
		* changes on disk, and the button beside it records those same changes under
		* whatever the field then holds. Both are the platform's own primary button, so
		* the pair reads as one row of actions; the Generate one is a square rather than
		* a word because the row has to keep the button's label at the sidebar's floor,
		* and its accessible name is what says what the glyph does. It carries no bubble:
		* one over a control that sits just under the field would cover the very text it
		* writes into.
		*
		* The field is a `textarea` of this plugin's own rather than the platform's
		* `Input`, because a commit message is not one line: a subject and the note under
		* it are one message, and a single-line control cannot show the break between
		* them. So Enter is a line break here, and the chord (⌘/Ctrl+Enter) is what
		* submits from the keyboard; the button is the plain path. The field grows with
		* what is typed and stops at four lines, past which it scrolls — a message
		* longer than that must not push the changed-path pane down the column. Its
		* corner is the controls' own, which is what makes the three read as one form (see
		* `styles.ts`).
		*
		* The form asks one question with two possible answers, and the reader says
		* which before they ask it: the commit takes the whole working tree, or the index
		* alone. `all` is the default because it is what the button means when nothing
		* else has been said — everything the list shows, recorded in one click, which is
		* what this form did before the scope was a choice. `staged` is the narrower
		* answer, for the reader who has moved paths into the index with the list's own
		* `+` and `−` and wants the commit to hold only those.
		*
		* The choice is the toolbar's: the More menu's commit rows set it, and the row in
		* force carries the menu's check. That is where the rest of the page's answers
		* about the repository live, and a caret beside the commit button spent the row's
		* width on a second control for one binary choice.
		*
		* The scope is the page's state rather than this form's, because the toolbar sets
		* it, both the Generate request and the commit request read it, and the button's
		* disabled state depends on the counts the page's status holds. The message stays
		* here for the reason below.
		*
		* The message is this component's own state rather than the page's, and that is
		* deliberate: the page renders thousands of diff rows, so a keystroke that
		* re-rendered it would repaint all of them. Nothing else needs the text — the
		* request carries it and the answer decides whether it is cleared — so it stays
		* here, one render per keystroke over one field.
		*
		* A commit empties the field and takes the findings with it, because both were
		* about the changes it just recorded; a refusal keeps the message, because a
		* message Git would not take is the one thing the answer is about. The field is
		* disabled for the length
		* of the request, so what is sent cannot be edited after it was read. Generation
		* is stated the same way and disables the same two controls for its own length: a
		* second Generate behind the first would only be a second model call, and a
		* Commit taken mid-generation would race the answer into a field it no longer
		* describes.
		*
		* @param props.t - the page's translate seat.
		* @param props.disabled - whether the repository can take a commit right now:
		* there is none to name, or the page is busy with something else.
		* @param props.committing - the commit this form asked for is in flight.
		* @param props.scope - the half the commit button is set to.
		* @param props.stagedCount - how many rows the index holds.
		* @param props.allCount - how many changed paths the whole list holds.
		* @param props.operation - the merge, rebase, or cherry-pick in progress, if any.
		* @param props.mergeMessage - the message the merge already carries, for the prefill.
		* @param props.ending - the merge this form is recording is in flight.
		* @param props.onCommit - runs the commit; resolves true when one was made.
		* @param props.onFinishMerge - records the merge the repository is holding.
		* @param props.onGenerate - asks the Host for a message; resolves null when the
		* request failed and the page has already reported it, in which case the field is
		* left exactly as it was.
		* @returns the form element.
		*/
		function CommitBar(props) {
			const { t, disabled, committing, scope, stagedCount, allCount, operation, mergeMessage, ending, onCommit, onFinishMerge, onGenerate } = props;
			const [message, setMessage] = (0, react.useState)("");
			const [generating, setGenerating] = (0, react.useState)(false);
			const [warning, setWarning] = (0, react.useState)("");
			const field = (0, react.useRef)(null);
			/** Whether this form is the one that records a merge in progress. */
			const merging = operation === "merge";
			/**
			* Whether the repository is in an operation this page can neither continue nor
			* record: a rebase or a cherry-pick. A merge is not one of those — its commit
			* is this form's own button, whether or not it is ready yet.
			*/
			const blocked = operation !== null && !merging;
			/**
			* The merge message this form was last prefilled with.
			*
			* The field is the reader's the moment they touch it, so the prefill lands
			* once per message: a status re-read that carries the same words must not put
			* them back over an edit, and a field the reader emptied must stay empty. A
			* different message — a second merge — is prefilled again.
			*/
			const prefilled = (0, react.useRef)(null);
			/** Whether the current scope has anything to commit, and so anything to describe. */
			const nothingToCommit = (scope === "staged" ? stagedCount : allCount) === 0;
			/**
			* Measure the field to what it holds.
			*
			* A textarea does not grow by itself, so every change is measured and written
			* back as an explicit height. The height is reset to `auto` first, because the
			* height this effect wrote is otherwise the only thing `scrollHeight` could be
			* measured against, which would leave the field unable to shrink when lines are
			* deleted; and it is `scrollHeight` itself that is written back, which is exact
			* only because the field carries no border of its own — the frame around it
			* draws that — so content plus padding is the whole of its border-box height.
			* The stylesheet's `max-height` is what stops it at four lines.
			*/
			(0, react.useLayoutEffect)(() => {
				const node = field.current;
				if (node === null) return;
				node.style.height = "auto";
				node.style.height = `${node.scrollHeight}px`;
			}, [message]);
			/**
			* Put the merge's own message in the field.
			*
			* Git wrote it when the merge started, so it is not a hint about the state:
			* it is what the commit will say, and it belongs where a commit's message
			* always lives. The field is prefilled only while it is empty, because a
			* reader who has typed has taken it over, and only once per message, because
			* a re-read that carries the same words must not undo an edit.
			*/
			(0, react.useEffect)(() => {
				if (operation !== "merge" || mergeMessage === void 0) {
					const previous = prefilled.current;
					if (previous !== null) {
						prefilled.current = null;
						setMessage((current) => current === previous ? "" : current);
					}
					return;
				}
				if (prefilled.current === mergeMessage) return;
				prefilled.current = mergeMessage;
				setMessage((current) => current === "" ? mergeMessage : current);
			}, [operation, mergeMessage]);
			/**
			* Ask for the commit the field currently describes.
			*
			* Bound to the button and to ⌘/Ctrl+Enter in the field: Enter alone is the line
			* break a message needs, so the chord is the keyboard's own way to submit.
			*/
			const submit = (0, react.useCallback)(() => {
				const trimmed = message.trim();
				if (disabled || committing || ending || generating || blocked) return;
				if (merging) {
					onFinishMerge(mergeMessage !== void 0 && trimmed === mergeMessage ? "" : trimmed).then((made) => {
						if (!made) return;
						setMessage("");
						setWarning("");
					});
					return;
				}
				if (trimmed === "" || nothingToCommit) return;
				onCommit(trimmed).then((made) => {
					if (!made) return;
					setMessage("");
					setWarning("");
				});
			}, [
				message,
				disabled,
				committing,
				ending,
				generating,
				blocked,
				merging,
				mergeMessage,
				nothingToCommit,
				onCommit,
				onFinishMerge
			]);
			(0, react.useEffect)(() => {
				setWarning("");
			}, [scope]);
			/**
			* Ask the Host for a message and put it in the field.
			*
			* The answer replaces whatever the field held, because the request is about the
			* changes on disk rather than about the text on screen; the model's findings
			* replace the last answer's for the same reason. A failed request leaves both
			* alone: the page has already opened its dialog on it, and clearing a message
			* the user typed would be this control taking a failure out on their work.
			*/
			const generate = (0, react.useCallback)(() => {
				if (disabled || committing || generating || nothingToCommit) return;
				setGenerating(true);
				setWarning("");
				onGenerate().then((result) => {
					setGenerating(false);
					if (result === null) return;
					setMessage(result.message);
					setWarning(result.warning ?? "");
				});
			}, [
				disabled,
				committing,
				generating,
				nothingToCommit,
				onGenerate
			]);
			/**
			* What the field says while it holds no text of the reader's.
			*
			* Only two states answer here: the ordinary commit's own prompt, and the one
			* operation this page cannot record — a rebase or a cherry-pick, which the
			* reader has to finish or abandon in a terminal. A merge's state is not among
			* them, because its message is in the field itself rather than in a sentence
			* about the merge.
			*/
			const pendingOperation = operation === null ? "" : t(operation === "rebase" ? "operation.rebase" : "operation.cherryPick");
			const placeholder = blocked ? t("commit.operationBlocked", { operation: pendingOperation }) : t("commit.placeholder");
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-cg-commit-bar",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: "dsh-cg-commit-frame",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
							ref: field,
							className: "dsh-cg-commit-input",
							value: message,
							placeholder,
							"aria-label": placeholder,
							rows: 1,
							disabled: committing || generating || ending || blocked,
							onChange: (event) => {
								setMessage(event.target.value);
								if (warning !== "") setWarning("");
							},
							onKeyDown: (event) => {
								if (event.key !== "Enter" || !(event.metaKey || event.ctrlKey)) return;
								event.preventDefault();
								submit();
							}
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: "dsh-cg-commit-generate",
							"aria-label": generating ? t("commit.generating") : t("commit.generate"),
							"data-busy": generating,
							disabled: disabled || committing || generating || nothingToCommit || operation !== null,
							onClick: generate,
							children: generating ? SPINNER_ICON : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconGenerate, {})
						})]
					}),
					warning === "" ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "dsh-cg-commit-note",
						role: "status",
						children: t("commit.warning", { text: warning })
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dsh-cg-commit-actions",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: "dsh-cg-commit-send",
							disabled: disabled || committing || ending || generating || blocked || !merging && (message.trim() === "" || nothingToCommit),
							onClick: submit,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dsh-cg-commit-label",
								children: ending || committing ? t("commit.busy") : merging ? t("commit.finishMerge") : t(scope === "staged" ? "commit.buttonStaged" : "commit.buttonAll")
							})
						})
					})
				]
			});
		}
		/**
		* The changed-path pane: both halves, stacked.
		*
		* The index's rows come first, under `Staged changes`, then the worktree's under
		* `Changes` — the order a commit reads in, and the order the old list switch
		* cycled through. Drawing both at once means a reader can see what is already
		* staged while staging the rest, and a path that is both staged and edited again
		* is one row under each header: the worktree's row offers `+`, the index's `−`.
		* A half with nothing in it is not drawn at all: its header is the tree's root
		* for the rows under it, so an empty one would be a heading for a list that is
		* not there, and a zero is nothing a reader can act on. A clean tree therefore
		* leaves the pane blank — the commit form is disabled at zero and the diff pane
		* is back at its empty hint, so there is nothing left to explain.
		*
		* Each half is a disclosure of its own (`ChangeGroup`): folding one away is how
		* the reader makes room for the other without the pane forgetting that it is
		* there. Within a half the paths are grouped by directory rather than listed
		* flat, so a run of files from one directory reads as one block and the
		* directory is named once above them instead of on every row. A directory that
		* only holds the next directory is folded into it (`buildFileTree` explains the
		* rule), so the tree spends its rows on the directories a reader can actually
		* stop at.
		*
		* Groups and folders open by default — the pane exists to show what changed,
		* and a reader who has just opened the tab should not have to unfold every
		* directory to find out. A group or folder the reader closes stays closed across
		* status refreshes, which is why the closed sets live here rather than being
		* derived from the answer; one that disappears simply stops being drawn, and a
		* new one arrives open.
		*
		* @param props.t - the page's translate seat.
		* @param props.status - the current status answer.
		* @param props.loaded - at least one answer has arrived.
		* @param props.files - every changed path; each half picks its own rows.
		* @param props.selection - the current selection, for the selected row's state.
		* @param props.staging - the row whose index write is in flight, as `side:path`.
		* @param props.discarding - the row whose discard is in flight, as `side:path`.
		* @param props.marking - the conflicted path whose resolution write is in flight.
		* @param props.markingAll - whether every conflicted path is being marked at once.
		* @param props.onSelect - called with the file and the half the reader picked.
		* @param props.onToggleStage - moves one row's path in or out of the index.
		* @param props.onDiscard - opens the confirmation for one row's worktree change.
		* @param props.onMarkResolved - stages one conflicted path as resolved.
		* @param props.onMarkAllResolved - stages every conflicted path as resolved.
		* @param props.onToggleFolderStage - moves every path under one folder in or out of the index.
		* @param props.onDiscardFolder - opens the confirmation for one folder's worktree changes.
		* @param props.onStageAll - moves one whole half in or out of the index.
		* @param props.onDiscardAll - opens the confirmation for every worktree change.
		* @returns the list body.
		*/
		function ChangeList(props) {
			const { t, status, loaded, files, selection, staging, discarding, marking, markingAll, onSelect, onToggleStage, onDiscard, onMarkResolved, onMarkAllResolved, onToggleFolderStage, onDiscardFolder, onStageAll, onDiscardAll } = props;
			/** The groups the reader closed. */
			const [closedSides, setClosedSides] = (0, react.useState)(() => /* @__PURE__ */ new Set());
			/**
			* The folders the reader closed, keyed by `side:path`.
			*
			* The side is part of the key because every list is on screen at once: the
			* same directory can hold an index row and a worktree row, and closing one
			* tree must not close the other.
			*/
			const [collapsed, setCollapsed] = (0, react.useState)(() => /* @__PURE__ */ new Set());
			const visible = (0, react.useMemo)(() => ({
				conflict: files.filter((file) => inList(file, "conflict")),
				staged: files.filter((file) => inList(file, "staged")),
				unstaged: files.filter((file) => inList(file, "unstaged"))
			}), [files]);
			const toggleSide = (0, react.useCallback)((side) => {
				setClosedSides((previous) => {
					const next = new Set(previous);
					if (next.has(side)) next.delete(side);
					else next.add(side);
					return next;
				});
			}, []);
			const toggleFolder = (0, react.useCallback)((key) => {
				setCollapsed((previous) => {
					const next = new Set(previous);
					if (next.has(key)) next.delete(key);
					else next.add(key);
					return next;
				});
			}, []);
			if (status !== null && status.ok !== true) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Note, { text: t(status.reason === "no-repo" ? "list.notRepo" : "list.statusFailed") });
			if (!loaded && status === null) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Note, { text: t("list.loading") });
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, { children: SIDES.filter((side) => visible[side].length > 0).map((side) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ChangeGroup, {
				t,
				side,
				files: visible[side],
				open: !closedSides.has(side),
				onToggle: () => toggleSide(side),
				collapsed,
				onToggleFolder: toggleFolder,
				selection,
				staging,
				discarding,
				marking,
				markingAll,
				onSelect,
				onToggleStage,
				onDiscard,
				onMarkResolved,
				onMarkAllResolved,
				onToggleFolderStage,
				onDiscardFolder,
				onStageAll: side === "conflict" ? void 0 : () => onStageAll(side),
				onDiscardAll
			}, side)) });
		}
		/**
		* The header is the tree's root, styled and behaving like a folder row: the same
		* height, type, chevron, hover fill and trailing actions. Its children — the root
		* folders and the files that sit at the repository root — start one indentation
		* step in (`depth` 1), so the two groups and the trees under them read as one
		* tree rather than as two headings above two separate trees.
		*
		* The header is a disclosure button across the whole width — the row is the
		* target, not a chevron beside it — and it carries the half's count, so the
		* header and the rows under it always describe the same thing. Its trailing
		* actions are the row actions' own glyphs, standing for the whole half: the
		* index's offers `−` (unstage), the worktree's offers discard and `+`, and the
		* conflict list offers its rows' own check. They share the rows' reveal and are
		* siblings of the disclosure button, never children of it: a button inside a
		* button is invalid markup, and its clicks would bubble as a fold.
		*
		* A group action covers paths the reader cannot see as well as the ones on
		* screen — a closed folder or a folded group is still part of what `+` and `−`
		* mean. The Host re-reads the status inside its write queue, so the request
		* names no paths at all and the counts here are context rather than a list. The
		* conflict list's check is the exception that proves the rule: `git add` names
		* the files it resolves, so that one is sent one path at a time.
		*
		* @param props.t - the page's translate seat.
		* @param props.side - the half this group draws.
		* @param props.files - the paths in that half.
		* @param props.open - whether the group is unfolded.
		* @param props.onToggle - asks the page to fold or unfold the group.
		* @param props.collapsed - the folders the reader closed, keyed by `side:path`.
		* @param props.onToggleFolder - asks the page to flip one folder.
		* @param props.selection - the current selection, for the selected row's state.
		* @param props.staging - the row whose index write is in flight, as `side:path`.
		* @param props.discarding - the row whose discard is in flight, as `side:path`.
		* @param props.marking - the conflicted path whose resolution write is in flight.
		* @param props.onSelect - called with the file and the half the reader picked.
		* @param props.onToggleStage - moves one row's path in or out of the index.
		* @param props.onDiscard - opens the confirmation for one row's worktree change.
		* @param props.onMarkResolved - stages one conflicted path as resolved.
		* @param props.onToggleFolderStage - moves every path under one folder in or out of the index.
		* @param props.onDiscardFolder - opens the confirmation for one folder's worktree changes.
		* @param props.onStageAll - moves the whole half in or out of the index.
		* @param props.onDiscardAll - opens the confirmation for the half's worktree changes.
		* @returns the group.
		*/
		/**
		* One trailing row action: a glyph button with this page's own bubble.
		*
		* Every row and group header ends in the controls that move its path, discard
		* its change, or mark its conflict resolved, and those controls differ only in
		* their glyph, their labels, and the write behind them. The bubble's pace and
		* cap, the accessible name that is not always the bubble's text, and the spinner
		* that stands in while the write is in flight are therefore stated once here
		* rather than at each site.
		*
		* @param props.label - the bubble's text.
		* @param props.ariaLabel - the control's accessible name, when it differs from the label.
		* @param props.busy - whether this control's own write is in flight.
		* @param props.disabled - whether any write on the page is in flight.
		* @param props.onClick - the write to run.
		* @param props.icon - the glyph to draw while idle.
		* @returns the action element.
		*/
		function RowAction(props) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
				label: props.label,
				side: "top",
				delayMs: TOOLTIP_DELAY_MS,
				portal: true,
				maxWidth: TOOLTIP_MAX_WIDTH,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					className: "dsh-cg-row-action",
					"aria-label": props.ariaLabel ?? props.label,
					"data-busy": props.busy,
					disabled: props.disabled,
					onClick: props.onClick,
					children: props.busy ? SPINNER_ICON : props.icon
				})
			});
		}
		function ChangeGroup(props) {
			const { t, side, files, open, onToggle, collapsed, onToggleFolder, selection, staging, discarding, onSelect, onToggleStage, onDiscard, marking, markingAll, onMarkResolved, onMarkAllResolved, onToggleFolderStage, onDiscardFolder, onStageAll, onDiscardAll } = props;
			const tree = (0, react.useMemo)(() => buildFileTree(files), [files]);
			const count = files.length;
			const untracked = files.some((file) => file.untracked);
			const actionsBusy = staging !== null || discarding !== null || marking !== null;
			const stageBusy = staging === groupKey(side);
			const discardBusy = discarding === groupKey("unstaged");
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: "dsh-cg-group",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "dsh-cg-group-head",
					"data-actions": side === "unstaged" ? "both" : "stage",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						className: "dsh-cg-group-toggle",
						"aria-expanded": open,
						onClick: onToggle,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dsh-cg-group-chevron",
							"aria-hidden": "true",
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconArrowRight, {})
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dsh-cg-group-label",
							children: headText(t(GROUP_KEY[side]), count)
						})]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: "dsh-cg-row-actions",
						children: [
							side === "conflict" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RowAction, {
								label: t("stage.markAllResolved"),
								busy: markingAll,
								disabled: count === 0 || actionsBusy,
								onClick: onMarkAllResolved,
								icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconCheck, {})
							}) : null,
							side === "unstaged" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RowAction, {
								label: t("stage.discardAll"),
								busy: discardBusy,
								disabled: count === 0 || actionsBusy,
								onClick: () => onDiscardAll(count, untracked),
								icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconDiscard, {})
							}) : null,
							onStageAll === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RowAction, {
								label: t(side === "staged" ? "stage.unstageAll" : "stage.stageAll"),
								busy: stageBusy,
								disabled: count === 0 || actionsBusy,
								onClick: onStageAll,
								icon: side === "staged" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconMinus, {}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconPlus, {})
							})
						]
					})]
				}), open ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [tree.folders.map((folder) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(FolderBranch, {
					t,
					folder,
					side,
					depth: 1,
					collapsed,
					onToggle: onToggleFolder,
					selection,
					staging,
					discarding,
					marking,
					onSelect,
					onToggleStage,
					onDiscard,
					onMarkResolved,
					onToggleFolderStage,
					onDiscardFolder
				}, folder.path)), tree.files.map((file) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ChangeRow, {
					t,
					file,
					side,
					depth: 1,
					selection,
					staging,
					discarding,
					marking,
					onSelect,
					onToggleStage,
					onDiscard,
					onMarkResolved
				}, file.path))] }) : null]
			});
		}
		/** The dictionary entry each list's heading is worded from. */
		const GROUP_KEY = {
			staged: "stage.staged",
			unstaged: "stage.unstaged",
			conflict: "stage.conflict"
		};
		/**
		* Every changed file under one folder row: its own files and every descendant's.
		*
		* The tree folds chains and collapses subtrees, but a folder action stands for
		* the folder itself, not for the rows currently visible: a closed folder's
		* files are still under it, and the confirmation's count has to say so.
		*
		* @param folder - the folder row whose subtree is collected.
		* @returns the changed files in that subtree, in tree order.
		*/
		function filesUnderFolder(folder) {
			const files = [...folder.files];
			for (const child of folder.folders) files.push(...filesUnderFolder(child));
			return files;
		}
		/**
		* One folder row and, while it is open, everything under it.
		*
		* The whole row is the disclosure control rather than a chevron the row merely
		* sits beside: the row is the target a reader aims at, and `aria-expanded` is
		* the state a screen reader announces either way. The row's own path is its
		* tooltip: the row folds a single-child chain into `types / client`, and the
		* tooltip is where the path Git knows is spelled in full. The row draws no
		* count, and its accessible name carries none either: the tree reads as paths,
		* not as a column of totals.
		*
		* The segments of a folded chain are drawn with the slashes between them, the
		* separators one step quieter than the names so the row still reads as one
		* directory rather than as a sentence about two.
		*
		* The tree is drawn as a flat run of rows indented by `depth` rather than as
		* nested lists: the pane is a scroller whose rows are full-width buttons, so a
		* level costs an indent and nothing needs a list's margins or markers, while a
		* collapsed folder simply draws no descendants.
		*
		* The folder row carries the same trailing actions as a file row, but they stand
		* for every changed path under it, closed children included. The page sends the
		* directory alone; the Host re-reads the status inside its write queue, so a
		* folder with thousands of files never has to be enumerated across a request.
		*
		* @param props.t - the page's translate seat.
		* @param props.folder - the folder to draw, with its children.
		* @param props.side - the list this folder is drawn under, which decides each
		*   file's side.
		* @param props.depth - the folder's level in the tree; a group's children start
		*   at 1.
		* @param props.collapsed - the folders the reader closed, keyed by `side:path`.
		* @param props.onToggle - asks the page to flip the folder named by that key.
		* @param props.selection - the current selection, for the selected row's state.
		* @param props.staging - the row whose index write is in flight, as `side:path`.
		* @param props.discarding - the row whose discard is in flight, as `side:path`.
		* @param props.marking - the conflicted path whose resolution write is in flight.
		* @param props.onSelect - called with the file and the half the reader picked.
		* @param props.onToggleStage - moves one row's path in or out of the index.
		* @param props.onDiscard - opens the confirmation for one row's worktree change.
		* @param props.onMarkResolved - stages one conflicted path as resolved.
		* @param props.onToggleFolderStage - moves every path under this folder in or out of the index.
		* @param props.onDiscardFolder - opens the confirmation for every worktree change under this folder.
		* @returns the folder row, and its open children.
		*/
		function FolderBranch(props) {
			const { t, folder, side, depth, collapsed, onToggle, selection, staging, discarding, marking, onSelect, onToggleStage, onDiscard, onMarkResolved, onToggleFolderStage, onDiscardFolder } = props;
			const key = rowKey(side, folder.path);
			const open = !collapsed.has(key);
			const files = filesUnderFolder(folder);
			const stageBusy = staging === rowKey(side, folder.path);
			const discardBusy = discarding === rowKey("unstaged", folder.path);
			const actionsBusy = staging !== null || discarding !== null || marking !== null;
			const untracked = files.some((file) => file.untracked);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-cg-folder-wrap",
				"data-actions": side === "conflict" ? "mark" : side === "unstaged" ? "both" : "stage",
				style: treeDepth(depth),
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
					label: folder.path,
					side: "right",
					delayMs: TOOLTIP_DELAY_MS,
					portal: true,
					maxWidth: TOOLTIP_MAX_WIDTH,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						className: "dsh-cg-folder",
						"aria-expanded": open,
						"aria-label": t("tree.folderLabel", { name: folder.name }),
						onClick: () => onToggle(key),
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dsh-cg-folder-chevron",
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconArrowRight, {})
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dsh-cg-folder-name",
							children: folder.segments.map((segment, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react.Fragment, { children: [index === 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dsh-cg-folder-sep",
								children: "/"
							}), segment] }, `${index}:${segment}`))
						})]
					})
				}), side === "conflict" ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
					className: "dsh-cg-row-actions",
					children: [side === "unstaged" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RowAction, {
						label: t("stage.discard"),
						ariaLabel: t("stage.discardFolder", { path: folder.path }),
						busy: discardBusy,
						disabled: actionsBusy,
						onClick: () => onDiscardFolder(folder.path, files.length, untracked),
						icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconDiscard, {})
					}) : null, /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RowAction, {
						label: t(side === "staged" ? "stage.unstage" : "stage.stage"),
						ariaLabel: t(side === "staged" ? "stage.unstageFolder" : "stage.stageFolder", { path: folder.path }),
						busy: stageBusy,
						disabled: actionsBusy,
						onClick: () => onToggleFolderStage(folder.path, side),
						icon: side === "staged" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconMinus, {}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconPlus, {})
					})]
				})]
			}), open ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [folder.folders.map((child) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(FolderBranch, {
				t,
				folder: child,
				side,
				depth: depth + 1,
				collapsed,
				onToggle,
				selection,
				staging,
				discarding,
				marking,
				onSelect,
				onToggleStage,
				onDiscard,
				onMarkResolved,
				onToggleFolderStage,
				onDiscardFolder
			}, child.path)), folder.files.map((file) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ChangeRow, {
				t,
				file,
				side,
				depth: depth + 1,
				selection,
				staging,
				discarding,
				marking,
				onSelect,
				onToggleStage,
				onDiscard,
				onMarkResolved
			}, file.path))] }) : null] });
		}
		/**
		* One changed file in the tree: its state letter, its own name, and the control
		* that moves it between the index and the worktree.
		*
		* The row names the file alone — the folders it sits under are the rows above
		* it — except for a rename, whose source path trails the name in the dimmed
		* column because it is the one part of the path the tree cannot place. The
		* tooltip still states the whole path and the state, since the row itself has
		* room for a letter and an elided name at most; the list it is drawn under is
		* already the pane's header, so repeating it there would say nothing new.
		*
		* The stage and discard controls are siblings of the selection button rather
		* than children: a button inside a button is invalid markup, its clicks bubble
		* as a selection, and a reader cannot tab to it. The row is therefore a wrapper
		* that owns the hover, the indent and the selected fill, with the selection
		* button taking the width and the actions sitting in their own trailing slot.
		* The actions are shown on hover, on the active row (the selected path keeps
		* them in reach once the pointer has moved on) and once one of them holds
		* keyboard focus, so the keyboard can reach them too; a disabled action is never
		* shown, because there is nothing it can do. Space on the selected row stages
		* without moving focus — the shortcut a list of paths invites. Their own bubbles
		* name the moves — `Stage changes`, `Discard changes` or `Unstage` — because a
		* glyph alone does not say which half it writes to.
		*
		* Only the opposite half's action is offered: a staged row shows `−` (unstage),
		* an unstaged row `+` (stage). The unstaged row also offers the discard action
		* to its left, which throws the worktree half away after a confirmation. A
		* conflicted row's one action is a check: it stages the path as resolved, which
		* is what `git add` on an unmerged path means. That is the same write the
		* conflict pane's header offers for the file on screen, and the row is where a
		* reader who resolved the file in their own editor needs it — without opening a
		* pane whose blocks are already gone. A path that holds both halves is one row
		* in each list: the worktree side's row offers `+` and the discard, the index
		* side's `−`.
		*
		* @param props.t - the page's translate seat.
		* @param props.file - the changed path this row names.
		* @param props.side - the list this row is drawn in, which is the side it stands for.
		* @param props.depth - the file's level in the tree; a group's children start at
		*   1.
		* @param props.selection - the current selection, for the selected row's state.
		* @param props.staging - the row whose index write is in flight, as `side:path`.
		* @param props.discarding - the row whose discard is in flight, as `side:path`.
		* @param props.marking - the conflicted path whose resolution write is in flight.
		* @param props.onSelect - called with the file and the half the reader picked.
		* @param props.onToggleStage - moves this row's path in or out of the index.
		* @param props.onDiscard - opens the confirmation for this row's worktree change.
		* @param props.onMarkResolved - stages this conflicted path as resolved.
		* @returns the row.
		*/
		function ChangeRow(props) {
			const { t, file, side, depth, selection, staging, discarding, marking, onSelect, onToggleStage, onDiscard, onMarkResolved } = props;
			const { name } = splitPath(file.path);
			const key = rowKey(side, file.path);
			const selected = selection?.kind === "file" && selection.file.path === file.path && selection.side === side;
			const busy = staging === key;
			const discardBusy = discarding === key;
			const markBusy = marking === file.path;
			const actionsBusy = staging !== null || discarding !== null || marking !== null;
			const actionLabel = t(side === "staged" ? "stage.unstageFile" : "stage.stageFile", { path: name });
			const actionTip = t(side === "staged" ? "stage.unstage" : "stage.stage");
			const discardLabel = t("stage.discardFile", { path: name });
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-cg-row-wrap",
				"data-selected": selected,
				"data-actions": side === "conflict" ? "none" : side === "unstaged" ? "both" : "stage",
				style: treeDepth(depth),
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
					label: rowLabel(t, file),
					side: "right",
					delayMs: TOOLTIP_DELAY_MS,
					portal: true,
					maxWidth: TOOLTIP_MAX_WIDTH,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						className: "dsh-cg-row",
						"aria-selected": selected,
						onClick: () => onSelect(file, side),
						onKeyDown: (event) => {
							if (event.key !== " " || side === "conflict") return;
							event.preventDefault();
							onToggleStage(file, side);
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dsh-cg-badge",
							"data-kind": file.kind,
							children: KIND_LETTER[file.kind]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: "dsh-cg-path",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dsh-cg-name",
								children: name
							}), file.origPath === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dsh-cg-dot",
								children: "←"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dsh-cg-dir",
								title: file.origPath,
								children: file.origPath
							})] })]
						})]
					})
				}), side === "conflict" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: "dsh-cg-row-actions",
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RowAction, {
						label: t("stage.markResolved"),
						ariaLabel: t("stage.markResolvedFile", { path: name }),
						busy: markBusy,
						disabled: actionsBusy,
						onClick: () => onMarkResolved(file),
						icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconCheck, {})
					})
				}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
					className: "dsh-cg-row-actions",
					children: [side === "unstaged" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RowAction, {
						label: t("stage.discard"),
						ariaLabel: discardLabel,
						busy: discardBusy,
						disabled: actionsBusy,
						onClick: () => onDiscard(file),
						icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconDiscard, {})
					}) : null, /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RowAction, {
						label: actionTip,
						ariaLabel: actionLabel,
						busy,
						disabled: actionsBusy,
						onClick: () => onToggleStage(file, side),
						icon: side === "staged" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconMinus, {}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconPlus, {})
					})]
				})]
			});
		}
		/**
		* What a changed-path row says about itself when hovered: its path first — a
		* rename's old path trailing it — then its state, spelled out rather than
		* lettered, the same `· ` separator the pane headers use.
		*
		* The half the row stands for is deliberately absent: the group header above it
		* already names the list, so repeating it in every bubble would only add a word
		* the row cannot be mistaken about.
		*
		* @param t - the page's translate seat.
		* @param file - the row's changed path.
		* @returns the tooltip's text.
		*/
		function rowLabel(t, file) {
			const renamed = file.origPath === void 0 ? "" : ` ← ${file.origPath}`;
			return `${file.path}${renamed} · ${t(KIND_KEY[file.kind])}`;
		}
		/**
		* The commit list, or the reason it is empty.
		*
		* @param props.t - the page's translate seat.
		* @param props.log - the current log answer.
		* @param props.loaded - at least one answer has arrived.
		* @param props.commits - the rows to render.
		* @param props.selection - the current selection, for the selected row's state.
		* @param props.onSelect - called with the row the user picked.
		* @returns the list body.
		*/
		function CommitList(props) {
			const { t, log, loaded, commits, selection, onSelect } = props;
			if (log !== null && log.ok !== true) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Note, { text: t("history.failed") });
			if (!loaded && log === null) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Note, { text: t("history.loading") });
			if (commits.length === 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Note, { text: t("history.empty") });
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, { children: commits.map((commit) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
				type: "button",
				className: "dsh-cg-commit",
				"aria-selected": selection?.kind === "commit" && selection.commit.hash === commit.hash,
				onClick: () => onSelect(commit),
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dsh-cg-subject",
						children: commit.subject === "" ? t("commit.noMessage") : commit.subject
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: "dsh-cg-meta",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dsh-cg-hash",
								children: commit.short
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: commit.author }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								title: commit.date,
								children: relativeTime(t, commit.date)
							}),
							commit.parents.length > 1 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("commit.merge") }) : null
						]
					}),
					commit.refs.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RefRow, { refs: commit.refs.slice(0, 3) }) : null
				]
			}, commit.hash)) });
		}
		/**
		* The branch and tag decorations a commit carries, as one row of chips: a single
		* line, and the whole of it reachable without leaving the row.
		*
		* A commit can carry three of these, and a name among them can be longer than
		* the room the sidebar has for all of them put together, so the row is where the
		* overflow goes. Two things used to happen instead, and both are wrong in the
		* same way — a name was shortened into its chip, so the rest of it was simply
		* gone, or it wrapped, so a chip stood two lines tall beside its one-line
		* neighbours. Neither is a way to read a branch name, and the row is the honest
		* one: the chips keep their names whole, the row stays one line, and what does
		* not fit sits to the right of the row rather than missing from it.
		*
		* The pointer is what asks the row to move. Entering walks it to its end;
		* leaving puts it back at its start at once, so the row always reads from its
		* first chip unless the pointer is on it. The walk is this component's own frame
		* loop rather than `behavior:'smooth'`, whose duration the browser picks and
		* which cannot be asked to hold a speed, and it starts from wherever the row is,
		* so a reader who scrolled it by hand is neither pulled back to the start nor
		* shown the same part of it twice. Nothing here is timed out or restored on a
		* delay: leaving is the whole of the rewind, and a walk that has reached the end
		* stops there for as long as the pointer stays.
		*
		* `styles.ts` states the scrolling itself — one line of chips, the sideways
		* overflow, and the hidden bar — so all this component owns is the walking.
		*
		* @param props.refs - the decorations to draw, already capped by the caller;
		* each name's `HEAD -> ` or `tag: ` prefix is stripped by `refLabel`.
		* @returns the row.
		*/
		function RefRow(props) {
			const { refs } = props;
			/** The scroller: the row that is walked. */
			const box = (0, react.useRef)(null);
			/** The frame the walk is on, or 0 at rest. */
			const frame = (0, react.useRef)(0);
			/** Drop a walk in flight, if there is one. */
			const halt = (0, react.useCallback)(() => {
				if (frame.current !== 0) cancelAnimationFrame(frame.current);
				frame.current = 0;
			}, []);
			(0, react.useEffect)(() => halt, [halt]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				ref: box,
				className: "dsh-cg-refs",
				onMouseEnter: (0, react.useCallback)(() => {
					const node = box.current;
					if (node === null) return;
					const from = node.scrollLeft;
					const rest = node.scrollWidth - node.clientWidth - from;
					if (rest <= 0) return;
					let started = 0;
					const step = (now) => {
						if (started === 0) started = now;
						const walked = (now - started) / 1e3 * REF_SCROLL_SPEED;
						const done = walked >= rest;
						node.scrollLeft = done ? from + rest : from + walked;
						frame.current = done ? 0 : requestAnimationFrame(step);
					};
					halt();
					frame.current = requestAnimationFrame(step);
				}, [halt]),
				onMouseLeave: (0, react.useCallback)(() => {
					halt();
					if (box.current !== null) box.current.scrollLeft = 0;
				}, [halt]),
				children: refs.map((ref) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: "dsh-cg-ref",
					children: refLabel(ref)
				}, ref))
			});
		}
		/**
		* A pane's empty state: what it is, and why there is nothing to draw.
		*
		* Five states answer with the same two lines — the pane has no answer, or the
		* answer it has is not a patch to draw — and one of them carries the whole-file
		* choice that is the only action such a path can take. The shape is stated once
		* here so those states cannot drift apart.
		*
		* @param props.title - the state's own heading.
		* @param props.text - the sentence under it.
		* @param props.children - the action the state offers, when it offers one.
		* @returns the empty state.
		*/
		function EmptyPane(props) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-cg-empty",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dsh-cg-empty-title",
						children: props.title
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dsh-cg-empty-text",
						children: props.text
					}),
					props.children
				]
			});
		}
		/**
		* The diff pane: its header, its body, and its empty and error states.
		*
		* One pane, two kinds of content. A changed path's patch and a conflicted path's
		* blocks are both "the answer to the row the reader picked", so they are drawn by
		* the same component into the same frame; only the body and the header's controls
		* differ. That is what keeps the pane's layout, its empty states and its scrolling
		* from having to exist twice.
		*
		* @param props.t - the page's translate seat.
		* @param props.status - the current status answer.
		* @param props.selection - what the user picked.
		* @param props.current - the answer that belongs to that selection, if it arrived.
		* @param props.resolving - the conflict write in flight, as its keys or `whole`.
		* @param props.busy - an operation is already in flight elsewhere on the page.
		* @param props.onResolve - applies a choice to the selected conflict.
		* @returns the pane.
		*/
		function DiffPane(props) {
			const { t, status, selection, current, resolving, busy, onResolve } = props;
			const answerKey = current?.key ?? "";
			const [collapsed, setCollapsed] = (0, react.useState)(() => /* @__PURE__ */ new Set());
			const [seenKey, setSeenKey] = (0, react.useState)(answerKey);
			if (seenKey !== answerKey) {
				setSeenKey(answerKey);
				setCollapsed(/* @__PURE__ */ new Set());
			}
			const toggleFile = (0, react.useCallback)((id) => {
				setCollapsed((previous) => {
					const next = new Set(previous);
					if (next.has(id)) next.delete(id);
					else next.add(id);
					return next;
				});
			}, []);
			if (status !== null && status.ok !== true) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EmptyPane, {
				title: t("diff.pane"),
				text: t(status.reason === "no-repo" ? "diff.notRepo" : "diff.repoFailed")
			});
			if (selection === null) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EmptyPane, {
				title: t("diff.pane"),
				text: t("diff.emptyHint")
			});
			const title = selection.kind === "file" ? selection.file.path : current?.commit?.subject ?? selection.commit.subject;
			const loading = current === null || current.loading;
			if (selection.kind === "file" && selection.side === "conflict") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ConflictPane, {
				t,
				file: selection.file,
				current,
				resolving,
				busy,
				onResolve
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
				className: "dsh-cg-main-head",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dsh-cg-main-title",
						title,
						children: title
					}),
					current?.commit === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: "dsh-cg-main-subtitle",
						children: [
							current.commit.short,
							" · ",
							current.commit.author,
							" · ",
							relativeTime(t, current.commit.date)
						]
					}),
					current?.doc === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DiffStats, {
						additions: current.doc.additions,
						deletions: current.doc.deletions
					}),
					current?.doc === void 0 || current.doc.files.length === 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CopyButton, {
						t,
						text: buildCopyText(current)
					})
				]
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "dsh-cg-diff",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DiffBody, {
					t,
					loading,
					current,
					kind: selection.kind === "file" ? selection.file.kind : void 0,
					collapsed,
					onToggleFile: toggleFile
				})
			})] });
		}
		/**
		* The conflict pane: one unmerged path and the blocks its reader decides.
		*
		* The pane exists because a conflicted path is not something to *read*. `git
		* diff` answers one with a combined diff — a report about the merge, not a file
		* to choose within — and a delete/modify conflict answers with no diff at all.
		* What the reader needs is the file Git left on disk, split into the runs it
		* agrees on and the blocks it does not, with a way to say which side each block
		* keeps. That is what this draws.
		*
		* The header is the whole file's decision — take one side everywhere — and each
		* block carries its own, because a file with five conflicts is five decisions far
		* more often than it is one. Marking the file done is not among them: that is the
		* conflict row's own check, in the list the reader already reads, so the pane
		* does not repeat it.
		*
		* @param props.t - the page's translate seat.
		* @param props.file - the changed path, for its state letter and its name.
		* @param props.current - the conflict answer, or the fact that it is loading.
		* @param props.resolving - the write in flight, as its keys or `whole`.
		* @param props.busy - an operation is already in flight elsewhere on the page.
		* @param props.onResolve - applies a choice to this path.
		* @returns the pane.
		*/
		function ConflictPane(props) {
			const { t, file, current, resolving, busy, onResolve } = props;
			const conflict = current?.conflict;
			const loading = current === null || current.loading;
			const keys = (0, react.useMemo)(() => (conflict?.blocks ?? []).flatMap((block) => block.kind === "region" ? [block.key] : []), [conflict]);
			const disabled = busy || keys.length === 0;
			const allBusy = resolving === keys.join(",");
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
				className: "dsh-cg-main-head",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: "dsh-cg-main-title",
					title: file.path,
					children: file.path
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
					className: "dsh-cg-main-actions",
					children: [allBusy ? SPINNER_ICON : null, keys.length === 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ConflictButton, {
						label: t("conflict.takeAllOurs"),
						ghost: true,
						disabled,
						onClick: () => onResolve("ours", keys)
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ConflictButton, {
						label: t("conflict.takeAllTheirs"),
						ghost: true,
						disabled,
						onClick: () => onResolve("theirs", keys)
					})] })]
				})]
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "dsh-cg-diff",
				children: loading ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Note, { text: t("diff.loading") }) : conflict === void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Note, { text: t("diff.failed") }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ConflictBody, {
					t,
					doc: conflict,
					resolving,
					busy,
					onResolve
				}, `${conflict.path}:${conflict.regions}`)
			})] });
		}
		/**
		* One conflict choice: the card's own button.
		*
		* The pane offers the same four choices twice — for the whole file and for one
		* block — and the two differ only in their labels and what they resolve, so the
		* element is stated once here. `ghost` is the lighter variant the pane header and
		* a block's bar use; a whole-file choice with a heading of its own is drawn solid.
		*
		* @param props.label - the button's text, and its accessible name.
		* @param props.ghost - whether to draw the lighter variant.
		* @param props.disabled - whether a write is already in flight.
		* @param props.onClick - the choice to apply.
		* @returns the button.
		*/
		function ConflictButton(props) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
				type: "button",
				className: "dsh-cg-conflict-btn",
				"data-variant": props.ghost === true ? "ghost" : void 0,
				disabled: props.disabled,
				onClick: props.onClick,
				children: props.label
			});
		}
		/**
		* How many lines of the file one block occupies.
		*
		* A context run is its own lines. A region is its opener, its two sides and its
		* closer, plus the base marker and the base section when Git wrote one — the
		* same rows the pane draws, which is what makes the numbers in the gutter line up
		* with the file an editor would show.
		*
		* @param block - the block to measure.
		* @returns its line count.
		*/
		function blockLineCount(block) {
			if (block.kind === "context") return block.lines.length;
			const base = block.base === void 0 ? 0 : block.base.length + 1;
			return 3 + block.ours.length + block.theirs.length + base;
		}
		/**
		* One conflicted file, drawn as the file itself.
		*
		* The pane is a diff-shaped view rather than a report about a diff: every line of
		* the working-tree file is drawn once, in order, with the number it has on disk,
		* so the markers Git left in it appear where they are. Each block is drawn as a
		* card: its choice lives in the header of that card — the same place the diff
		* pane puts a hunk's `@@` scope — and the sides inside it are tinted the way an
		* addition and a deletion are tinted, because that is what a reader of this page
		* already knows how to read. The frame is what keeps two conflicts in one file
		* from reading as one long tinted stretch.
		*
		* The unchanged runs between blocks are folded the way Git folds the code around
		* a hunk: three lines either side, the rest one click away. A whole unchanged
		* file would otherwise sit between two conflicts and bury them.
		*
		* Three states other than the ordinary one, each answered in place rather than
		* by a refusal: a binary or missing path can only take a whole version, and a
		* file whose markers are already gone only has to be staged — which is a much
		* better thing to be told than "there is no diff".
		*
		* @param props.t - the page's translate seat.
		* @param props.doc - the parsed conflict.
		* @param props.resolving - the write in flight, as its keys or `whole`.
		* @param props.busy - an operation is already in flight elsewhere on the page.
		* @param props.onResolve - applies a choice to this path.
		* @returns the file.
		*/
		function ConflictBody(props) {
			const { t, doc, resolving, busy, onResolve } = props;
			const [expanded, setExpanded] = (0, react.useState)(() => /* @__PURE__ */ new Set());
			const toggleContext = (0, react.useCallback)((index) => {
				setExpanded((previous) => {
					const next = new Set(previous);
					if (next.has(index)) next.delete(index);
					else next.add(index);
					return next;
				});
			}, []);
			const ordinals = (0, react.useMemo)(() => {
				const order = /* @__PURE__ */ new Map();
				let ordinal = 0;
				for (const block of doc.blocks) {
					if (block.kind !== "region") continue;
					ordinal += 1;
					order.set(block.key, ordinal);
				}
				return order;
			}, [doc]);
			const starts = (0, react.useMemo)(() => {
				const lines = [];
				let line = 1;
				for (const block of doc.blocks) {
					lines.push(line);
					line += blockLineCount(block);
				}
				return lines;
			}, [doc]);
			if (doc.state === "binary" || doc.state === "missing") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EmptyPane, {
				title: t(doc.state === "binary" ? "conflict.binaryTitle" : "conflict.missingTitle"),
				text: t(doc.state === "binary" ? "conflict.binaryText" : "conflict.missingText"),
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "dsh-cg-conflict-choose",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ConflictButton, {
						label: t(doc.stages.ours ? "conflict.keepOurs" : "conflict.keepOursGone"),
						disabled: busy,
						onClick: () => onResolve("ours", void 0)
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ConflictButton, {
						label: t(doc.stages.theirs ? "conflict.keepTheirs" : "conflict.keepTheirsGone"),
						disabled: busy,
						onClick: () => onResolve("theirs", void 0)
					})]
				})
			});
			if (doc.state === "clean") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EmptyPane, {
				title: t("conflict.cleanTitle"),
				text: t("conflict.cleanText")
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "dsh-cg-conflict-stream",
				children: doc.blocks.map((block, index) => block.kind === "context" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ConflictContext, {
					t,
					lines: block.lines,
					start: starts[index] ?? 1,
					index,
					expanded: expanded.has(index),
					onToggle: toggleContext
				}, `context:${index}`) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ConflictRegionView, {
					t,
					region: block,
					line: starts[index] ?? 1,
					ordinal: ordinals.get(block.key) ?? 0,
					total: doc.regions,
					resolving,
					busy,
					onResolve
				}, block.key))
			});
		}
		/**
		* One block of a conflicted file: its card, its markers, and its three versions.
		*
		* The sides are labelled with the words the reader chooses by — "current" and
		* "incoming" — beside the labels Git itself wrote after the markers (`HEAD` and
		* the branch that was merged in, or during a rebase the two commits involved).
		* Those labels are read from the file rather than assumed, because "ours" and
		* "theirs" swap roles across a rebase, and a tag that says "current" when the
		* file says otherwise is a tag that lies.
		*
		* "Keep both" is offered beside the two sides because it is the answer for the
		* most common conflict of all — both sides added something, and the reader wants
		* both — and because the only other way to express it is to edit the file by
		* hand.
		*
		* @param props.t - the page's translate seat.
		* @param props.region - the block to draw.
		* @param props.ordinal - its position among the file's conflicts, from 1.
		* @param props.total - how many conflicts the file holds.
		* @param props.resolving - the write in flight, as its keys or `whole`.
		* @param props.busy - an operation is already in flight elsewhere on the page.
		* @param props.onResolve - applies a choice to this block.
		* @returns the block's rows.
		*/
		function ConflictRegionView(props) {
			const { t, region, line, ordinal, total, resolving, busy, onResolve } = props;
			const mine = resolving === region.key;
			const choose = (choice) => () => onResolve(choice, [region.key]);
			const oursLine = line + 1;
			const baseLine = oursLine + region.ours.length;
			const separatorLine = baseLine + (region.base === void 0 ? 0 : region.base.length + 1);
			const theirsLine = separatorLine + 1;
			const closeLine = theirsLine + region.theirs.length;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-cg-conflict-card",
				"data-busy": mine || void 0,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dsh-cg-conflict-bar",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dsh-cg-conflict-index",
							children: t("conflict.block", {
								index: ordinal,
								total
							})
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: "dsh-cg-conflict-actions",
							children: [
								mine ? SPINNER_ICON : null,
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ConflictButton, {
									label: t("conflict.takeOurs"),
									ghost: true,
									disabled: busy,
									onClick: choose("ours")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ConflictButton, {
									label: t("conflict.takeTheirs"),
									ghost: true,
									disabled: busy,
									onClick: choose("theirs")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ConflictButton, {
									label: t("conflict.takeBoth"),
									ghost: true,
									disabled: busy,
									onClick: choose("both")
								}),
								region.base === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ConflictButton, {
									label: t("conflict.takeBase"),
									ghost: true,
									disabled: busy,
									onClick: choose("base")
								})
							]
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ConflictMarker, {
						line,
						mark: "<<<<<<<",
						tag: t("conflict.current"),
						gitLabel: region.oursLabel
					}),
					region.ours.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ConflictNoLines, {
						t,
						kind: "add"
					}) : region.ours.map((text, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ConflictRow, {
						line: oursLine + index,
						kind: "add",
						text
					}, `ours:${index}`)),
					region.base === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ConflictMarker, {
						line: baseLine,
						mark: "|||||||",
						tag: t("conflict.base"),
						gitLabel: region.baseLabel
					}), region.base.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ConflictNoLines, {
						t,
						kind: "base"
					}) : region.base.map((text, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ConflictRow, {
						line: baseLine + 1 + index,
						kind: "base",
						text
					}, `base:${index}`))] }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ConflictMarker, {
						line: separatorLine,
						mark: "=======",
						tag: t("conflict.incoming"),
						gitLabel: region.theirsLabel
					}),
					region.theirs.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ConflictNoLines, {
						t,
						kind: "del"
					}) : region.theirs.map((text, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ConflictRow, {
						line: theirsLine + index,
						kind: "del",
						text
					}, `theirs:${index}`)),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ConflictMarker, {
						line: closeLine,
						mark: ">>>>>>>"
					})
				]
			});
		}
		/**
		* One line of the file: its number, and the text Git left there.
		*
		* The number is the single one the file has. A patch's two columns are two
		* versions of it; a conflicted path has one version on disk, and printing the
		* same number twice would suggest otherwise.
		*
		* @param props.line - the line's number in the file, from 1.
		* @param props.kind - which side of the conflict the line belongs to, or that it
		* belongs to neither.
		* @param props.text - the line's text, its terminator already removed.
		* @returns the row.
		*/
		function ConflictRow(props) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-cg-conflict-row",
				"data-kind": props.kind,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: "dsh-cg-conflict-no",
					children: props.line
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: "dsh-cg-conflict-text",
					children: props.text
				})]
			});
		}
		/**
		* One marker line, with the side it opens named in words.
		*
		* The run of marker characters is drawn as the file has it — that is what the
		* reader will see in an editor — and the tag says which side begins there. The
		* closer carries no tag of its own: the block has already been named by the
		* separator, and a second "incoming" at the end would only say it again.
		*
		* @param props.line - the line's number in the file, from 1.
		* @param props.mark - the marker run itself, `<<<<<<<` and its kin.
		* @param props.tag - the side the marker opens, when it opens one.
		* @param props.gitLabel - the label Git wrote after the marker, when it wrote one.
		*   Named for the file's text rather than for React: a prop called `ref` is
		*   claimed by the runtime, and a string in it is an error, not a label.
		* @returns the row.
		*/
		function ConflictMarker(props) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-cg-conflict-row",
				"data-kind": "meta",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: "dsh-cg-conflict-no",
					children: props.line
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
					className: "dsh-cg-conflict-text",
					children: [
						props.mark,
						props.tag === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dsh-cg-conflict-tag",
							children: ` ${props.tag}`
						}),
						props.gitLabel === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dsh-cg-conflict-ref",
							children: ` · ${props.gitLabel}`
						})
					]
				})]
			});
		}
		/**
		* An empty side of a block, drawn as a word rather than as nothing.
		*
		* "This side deleted the lines" is a real answer to see, and a gap between two
		* markers reads as a rendering fault.
		*
		* @param props.t - the page's translate seat.
		* @param props.kind - which side is empty, so the row keeps that side's tint.
		* @returns the row.
		*/
		function ConflictNoLines(props) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-cg-conflict-row",
				"data-kind": props.kind,
				"data-empty": "true",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "dsh-cg-conflict-no" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: "dsh-cg-conflict-text",
					children: props.t("conflict.noLines")
				})]
			});
		}
		/**
		* One unchanged run of a conflicted file, folded the way Git folds a hunk.
		*
		* A conflict pane shows the whole file, so the lines between two blocks can be
		* hundreds; drawing all of them would bury the blocks the reader came for. Three
		* lines either side is the same amount of context a patch would have shown, and
		* the count in the fold is how much else is there.
		*
		* @param props.t - the page's translate seat.
		* @param props.lines - the run's text, terminators already removed.
		* @param props.start - the file line the run starts at, counting from 1.
		* @param props.index - its position among the file's blocks, which is what the
		* fold is keyed by.
		* @param props.expanded - whether the reader has opened this run.
		* @param props.onToggle - asks the file to flip it.
		* @returns the rows.
		*/
		function ConflictContext(props) {
			const { t, lines, start, index, expanded, onToggle } = props;
			if (lines.length <= 7) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, { children: lines.map((text, offset) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ConflictRow, {
				line: start + offset,
				kind: "context",
				text
			}, offset)) });
			const hidden = lines.length - CONFLICT_CONTEXT_EDGE * 2;
			const fold = /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "dsh-cg-conflict-fold",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					className: "dsh-cg-conflict-fold-btn",
					onClick: () => onToggle(index),
					children: `⋯ ${t(expanded ? "conflict.hideContext" : "conflict.showContext", { count: hidden })}`
				})
			}, "fold");
			if (expanded) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [fold, lines.map((text, offset) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ConflictRow, {
				line: start + offset,
				kind: "context",
				text
			}, offset))] });
			const head = lines.slice(0, CONFLICT_CONTEXT_EDGE);
			const tail = lines.slice(lines.length - CONFLICT_CONTEXT_EDGE);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
				head.map((text, offset) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ConflictRow, {
					line: start + offset,
					kind: "context",
					text
				}, `head:${offset}`)),
				fold,
				tail.map((text, offset) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ConflictRow, {
					line: start + lines.length - CONFLICT_CONTEXT_EDGE + offset,
					kind: "context",
					text
				}, `tail:${offset}`))
			] });
		}
		/**
		* The patch text the copy button puts on the clipboard.
		*
		* Rebuilt from the parsed document rather than kept alongside it, so what is
		* copied is exactly what is on screen — including for a commit, whose header
		* the pane adds itself.
		*
		* @param state - the current diff answer.
		* @returns the text to copy.
		*/
		function buildCopyText(state) {
			if (state.commit !== void 0) return [
				`commit ${state.commit.hash}`,
				`Author: ${state.commit.author} <${state.commit.email}>`,
				`Date:   ${state.commit.date}`,
				"",
				state.commit.subject,
				...state.commit.body === "" ? [] : ["", state.commit.body],
				""
			].join("\n") + renderPatch(state.doc);
			return renderPatch(state.doc);
		}
		/**
		* Re-serialize a parsed patch into unified diff text.
		*
		* @param doc - the parsed patch, when one arrived.
		* @returns the patch text, or an empty string.
		*/
		function renderPatch(doc) {
			if (doc === void 0) return "";
			const out = [];
			for (const file of doc.files) {
				out.push(file.header, ...file.meta);
				for (const hunk of file.hunks) {
					out.push(hunk.header);
					for (const line of hunk.lines) if (line.kind === "meta") out.push(line.text);
					else if (line.kind === "add") out.push(`+${line.text}`);
					else if (line.kind === "del") out.push(`-${line.text}`);
					else out.push(` ${line.text}`);
				}
			}
			return out.join("\n");
		}
		/**
		* The `+N −M` summary of a patch.
		*
		* @param props.additions - added line count.
		* @param props.deletions - deleted line count.
		* @returns the stats element.
		*/
		function DiffStats(props) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
				className: "dsh-cg-stats",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
					className: "dsh-cg-added",
					children: ["+", props.additions]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
					className: "dsh-cg-deleted",
					children: ["−", props.deletions]
				})]
			});
		}
		/**
		* A button that copies the current patch and reports success briefly.
		*
		* @param props.t - the page's translate seat.
		* @param props.text - the text to copy.
		* @returns the button element.
		*/
		function CopyButton({ t, text }) {
			const [copied, setCopied] = (0, react.useState)(false);
			const timer = (0, react.useRef)(void 0);
			(0, react.useEffect)(() => () => {
				if (timer.current !== void 0) window.clearTimeout(timer.current);
			}, []);
			const copy = (0, react.useCallback)(() => {
				writeText(text).then((ok) => {
					if (!ok) return;
					setCopied(true);
					if (timer.current !== void 0) window.clearTimeout(timer.current);
					timer.current = window.setTimeout(() => setCopied(false), COPY_FEEDBACK_MS);
				});
			}, [text]);
			const label = t(copied ? "diff.copied" : "diff.copy");
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
				type: "button",
				className: "dsh-cg-icon",
				title: label,
				"aria-label": label,
				onClick: copy,
				children: copied ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconCheck, {}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconCopy, {})
			});
		}
		/**
		* Put text on the clipboard, with a fallback for a context that refuses the
		* async clipboard API (an insecure origin, or a denied permission).
		*
		* @param text - the text to copy.
		* @returns whether the copy succeeded.
		*/
		async function writeText(text) {
			try {
				await navigator.clipboard.writeText(text);
				return true;
			} catch {
				try {
					const area = document.createElement("textarea");
					area.value = text;
					area.setAttribute("readonly", "");
					area.style.position = "fixed";
					area.style.opacity = "0";
					document.body.appendChild(area);
					area.select();
					const ok = document.execCommand("copy");
					area.remove();
					return ok;
				} catch {
					return false;
				}
			}
		}
		/**
		* The diff body: the parsed patch, a loading line, or the reason there is none.
		*
		* @param props.t - the page's translate seat.
		* @param props.loading - the answer for this selection has not arrived yet.
		* @param props.current - the answer, when it has.
		* @param props.kind - the selected path's change kind, for a friendlier empty line.
		* @param props.collapsed - the files the reader has closed, by section identity.
		* @param props.onToggleFile - asks the pane to flip one file's state.
		* @returns the body element.
		*/
		function DiffBody(props) {
			const { t, loading, current, kind, collapsed, onToggleFile } = props;
			if (loading) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Note, { text: t("diff.loading") });
			if (current?.error !== void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Note, { text: t("diff.failed") });
			const doc = current?.doc;
			if (current === null || doc === void 0 || doc.files.length === 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EmptyPane, {
				title: t("diff.noTextTitle"),
				text: t(kind === "untracked" ? "diff.noTextUntracked" : "diff.noTextOther")
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DiffFiles, {
				t,
				doc,
				merge: current.merge === true,
				truncated: current.truncated === true,
				collapsed,
				onToggleFile
			});
		}
		/**
		* The patch's file sections.
		*
		* @param props.t - the page's translate seat.
		* @param props.doc - the parsed patch.
		* @param props.merge - whether the patch compares against a first parent.
		* @param props.truncated - whether the Host cut the patch short.
		* @param props.collapsed - the files the reader has closed, by section identity.
		* @param props.onToggleFile - asks the pane to flip one file's state.
		* @returns the sections, and the notes that qualify them.
		*/
		function DiffFiles(props) {
			const { t, doc, merge, truncated, collapsed, onToggleFile } = props;
			const rows = flatten(doc);
			const shown = rows.length > MAX_DIFF_ROWS ? rows.slice(0, MAX_DIFF_ROWS) : rows;
			const hidden = rows.length - shown.length;
			const groups = groupFiles(shown);
			const collapsible = groups.length > 1;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
				merge ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "dsh-cg-note",
					children: t("diff.mergeNote")
				}) : null,
				groups.map((group) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(FileSection, {
					t,
					group,
					collapsible,
					collapsed: collapsed.has(group.id),
					onToggle: onToggleFile
				}, group.id)),
				hidden > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "dsh-cg-note",
					children: t("diff.hiddenRows", { count: hidden })
				}) : null,
				truncated ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "dsh-cg-note",
					children: t("diff.truncated")
				}) : null
			] });
		}
		/**
		* One file of the patch: its title, its disclosure control, and the scroller its
		* code lives in.
		*
		* The title sits outside that scroller on purpose — a long line moves the code
		* under a title that stays where it is — and each file's scroller is its own, so
		* dragging one file sideways leaves every other file where it was.
		*
		* @param props.t - the page's translate seat.
		* @param props.group - the file and the rows under its title.
		* @param props.collapsible - whether this patch has more than one file to tell apart.
		* @param props.collapsed - whether this file's code is closed.
		* @param props.onToggle - asks the owner to flip this file's state.
		* @returns the section.
		*/
		function FileSection(props) {
			const { t, group, collapsible, collapsed, onToggle } = props;
			const { file } = group;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [file === null ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(FileHead, {
				t,
				file,
				id: group.id,
				collapsible,
				collapsed,
				onToggle
			}), collapsed ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "dsh-cg-file-body",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "dsh-cg-file-scroll",
					children: group.body.map((row, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DiffRow, { row }, index))
				})
			})] });
		}
		/**
		* One file's title row, and the control that closes it.
		*
		* @param props.t - the page's translate seat.
		* @param props.file - the file the row names.
		* @param props.id - the section's identity, which is what the control flips.
		* @param props.collapsible - whether this patch has more than one file.
		* @param props.collapsed - whether the file's code is closed.
		* @param props.onToggle - asks the owner to flip this file's state.
		* @returns the title row.
		*/
		function FileHead(props) {
			const { t, file, id, collapsible, collapsed, onToggle } = props;
			const path = displayPath(file);
			const { dir, name } = splitPath(path);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-cg-file-head",
				children: [
					collapsible ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: "dsh-cg-file-toggle",
						"aria-expanded": !collapsed,
						title: t(collapsed ? "diff.expand" : "diff.collapse"),
						"aria-label": t(collapsed ? "diff.expand" : "diff.collapse"),
						onClick: () => onToggle(id),
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconArrowRight, {})
					}) : null,
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: "dsh-cg-file-path",
						title: path,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dsh-cg-dir",
							children: dir
						}), name]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(DiffStats, {
						additions: file.additions,
						deletions: file.deletions
					})
				]
			});
		}
		/**
		* One row under a file title.
		*
		* @param props.row - the row to draw.
		* @returns the row element.
		*/
		function DiffRow({ row }) {
			if (row.type === "hunk") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "dsh-cg-hunk-head",
				children: row.header
			});
			const line = row.line;
			if (line.kind === "meta") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "dsh-cg-line",
				"data-kind": "meta",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: "dsh-cg-text",
					children: line.text
				})
			});
			const marker = line.kind === "add" ? "+" : line.kind === "del" ? "-" : " ";
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-cg-line",
				"data-kind": line.kind,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dsh-cg-no",
						children: line.oldNo === null ? "" : line.oldNo
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dsh-cg-no",
						children: line.newNo === null ? "" : line.newNo
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dsh-cg-sign",
						children: marker
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dsh-cg-text",
						children: line.text
					})
				]
			});
		}
		/**
		* One line of explanatory text inside a pane.
		*
		* Failures never arrive here: they open the error dialog, so a pane holds only
		* the loading line and the empty state it belongs to.
		*
		* @param props.text - the sentence to show.
		* @returns the note element.
		*/
		function Note(props) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "dsh-cg-note",
				children: props.text
			});
		}
		//#endregion
		//#region src/client/update.tsx
		/**
		* The plugin page's update row.
		*
		* The native Plugins panel draws this bundle's page, and that page's own facts
		* list — the install source and the current version — is the page owner's to
		* render: no slot reaches inside it. What the page does offer is
		* `plugins.detail.section`, a list slot rendered under its own content, whose
		* entries are handed the page's `subject`. This module registers one entry there
		* and draws the two things the native page has no room for: the plugin's npm and
		* GitHub links, and — when the registry publishes something newer than the
		* installed version — a capsule saying so, with the text button that installs it.
		*
		* The capsule is the row's only announcement, and it appears only when there is
		* something to announce: a page that is up to date shows the two links and
		* nothing else, so the row never states "up to date" as if it were a result the
		* reader asked for.
		*
		* Nothing here is a second Plugins panel. The row appears only on this bundle's
		* own page (`subject.kind === 'bundle'` and the package's own name), and the two
		* questions it asks the Host are its own routes: which version is published, and
		* install that one. Every other page sees `null` from this entry.
		*/
		/**
		* Read the subject as this bundle's own page.
		*
		* A bundle page hands `{ kind: 'bundle', pkg }`, where `pkg` names the package
		* and its version; a row's page and an official plugin's page hand a different
		* shape, and another bundle's page names another package. All of those are "not
		* mine" and render nothing.
		*
		* @param subject - the page's subject, as the framework passed it.
		* @returns the installed version the page states, when the page is this bundle's.
		*/
		function ownVersion(subject) {
			if (subject === null || typeof subject !== "object") return void 0;
			const value = subject;
			if (value.kind !== "bundle" || value.pkg === null || typeof value.pkg !== "object") return void 0;
			const pkg = value.pkg;
			if (pkg.name !== "dsh-cool-git") return void 0;
			return { ...typeof pkg.version === "string" ? { version: pkg.version } : {} };
		}
		/**
		* One version as its numeric parts, prerelease suffix ignored.
		*
		* The comparison only has to answer "is the published one newer than the
		* installed one", and both sides are npm release versions; a prerelease suffix
		* compares as equal to the release it names, which is the conservative answer —
		* the row offers nothing for `0.6.0-rc.1` published beside `0.6.0`.
		*
		* @param version - a version string.
		* @returns its three numbers, or undefined when it is not a plain version.
		*/
		function versionParts(version) {
			const match = /^(\d+)\.(\d+)\.(\d+)/.exec(version);
			if (match === null) return void 0;
			return [
				Number(match[1]),
				Number(match[2]),
				Number(match[3])
			];
		}
		/**
		* Whether one published version is newer than another.
		*
		* @param latest - the version the registry named.
		* @param current - the installed version, when the page stated one.
		* @returns true when `latest` is strictly newer, or when no installed version is known.
		*/
		function isNewer(latest, current) {
			if (current === void 0) return true;
			const left = versionParts(latest);
			const right = versionParts(current);
			if (left === void 0 || right === void 0) return latest !== current;
			for (let index = 0; index < 3; index += 1) if (left[index] !== right[index]) return left[index] > right[index];
			return false;
		}
		/**
		* Whether the profile installs this bundle from a working copy rather than a
		* registry.
		*
		* `link:` and `file:` are the two specs pnpm keeps a development checkout under;
		* installing a published version replaces that record instead of updating the
		* checkout, which is the one consequence the confirm sentence has to say.
		*
		* @param source - the recorded spec, as the manager reports it.
		* @returns true when the install is a development one.
		*/
		function isDevelopmentInstall(source) {
			if (source === void 0) return false;
			return source.startsWith("link:") || source.startsWith("file:") || source.startsWith(".");
		}
		/**
		* Word one coded refusal with the page's dictionary.
		*
		* @param failure - the coded refusal an `ok: false` answer carried.
		* @param t - the page's translate seat.
		* @returns the sentence, or undefined when the answer named no code.
		*/
		function refusalText(failure, t) {
			if (failure === void 0) return void 0;
			return t(`error.${failure.code}`, failure.params);
		}
		/**
		* One link to a place this plugin lives, carrying its own mark.
		*
		* An anchor rather than a button: both destinations are pages in a browser, and a
		* new tab keeps the plugin page where the reader left it. The accessible name is
		* the destination's, because a 16px mark names nothing to a screen reader.
		*
		* @param props - the destination, its label, and the mark to draw.
		* @returns the link.
		*/
		function PluginLink({ href, label, children }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
				className: "dsh-cg-update-link",
				href,
				target: "_blank",
				rel: "noreferrer noopener",
				title: label,
				"aria-label": label,
				children
			});
		}
		/**
		* The capsule, for the phase that has one.
		*
		* A phase with nothing to say draws nothing rather than an empty pill: the page's
		* default state is "no news", and only a published version, a step in flight, or
		* a failure is news.
		*
		* @param state - the row's current state.
		* @param t - the page's translate seat.
		* @param newer - whether the published version is newer than the installed one.
		* @param actions - the controls the capsule's buttons run.
		* @returns the capsule, or null when the row has nothing to announce.
		*/
		function capsule(state, t, newer, actions) {
			if (state.phase === "checking") return null;
			if (state.phase === "failed" && state.failedAt === "check") return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-cg-update-quiet",
				title: state.reason,
				children: [t("update.unavailable"), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					className: "dsh-cg-update-action",
					onClick: actions.retry,
					children: t("update.retry")
				})]
			});
			if (state.phase === "ready" && !newer) return null;
			let text;
			let controls = null;
			let tone = "accent";
			switch (state.phase) {
				case "ready":
					text = t("update.published", { version: state.latest ?? "" });
					controls = /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: "dsh-cg-update-action",
						onClick: actions.confirm,
						children: t("update.upgrade")
					});
					break;
				case "confirm":
					text = t(isDevelopmentInstall(state.source) ? "update.confirmLink" : "update.confirm", { version: state.latest ?? "" });
					tone = "muted";
					controls = /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: "dsh-cg-update-action",
						onClick: actions.install,
						children: t("update.confirmYes")
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: "dsh-cg-update-action",
						onClick: actions.cancel,
						children: t("update.cancel")
					})] });
					break;
				case "applying":
					text = t("update.applying");
					tone = "muted";
					break;
				case "done":
					text = state.application === "restart-required" ? t("update.restart", { version: state.latest ?? "" }) : t("update.done", { version: state.latest ?? "" });
					tone = "muted";
					break;
				default:
					text = t("update.failed");
					tone = "error";
					controls = /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: "dsh-cg-update-action",
						onClick: actions.retry,
						children: t("update.retry")
					});
			}
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-cg-update-pill",
				"data-tone": tone,
				title: state.reason,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: "dsh-cg-update-pill-text",
					children: text
				}), controls]
			});
		}
		/**
		* The row itself, mounted only for this bundle's page.
		*
		* The check runs once on mount: it is a consequence of opening the page rather
		* than a control. A failed read shows the quiet "could not read" capsule rather
		* than opening the Git tab's error dialog, which belongs to a page that is not
		* even mounted here — and its retry is what recovers once the network, or a Host
		* that has not picked up its new half yet, is back.
		*
		* @param props - the installed version, and the page's translate seat.
		* @returns the links row and, when there is one, the update capsule.
		*/
		function UpdateFooter({ t, current }) {
			const [state, setState] = (0, react.useState)({ phase: "checking" });
			/**
			* Ask the Host which version is published.
			*
			* Also what the row's own retry runs: the route is served by this bundle's Host
			* half, so a page opened before the Host picked that half up answers with a
			* transport failure — and a retry after the restart recovers without the reader
			* closing the page.
			*/
			const check = (0, react.useCallback)(() => {
				setState({ phase: "checking" });
				checkUpdate().then((answer) => {
					if (answer.ok !== true || answer.latest === void 0) {
						setState({
							phase: "failed",
							failedAt: "check",
							...answer.error === void 0 ? {} : { reason: answer.error }
						});
						return;
					}
					setState({
						phase: "ready",
						latest: answer.latest,
						...answer.source === void 0 ? {} : { source: answer.source }
					});
				});
			}, []);
			(0, react.useEffect)(() => {
				check();
			}, [check]);
			const newer = state.latest !== void 0 && isNewer(state.latest, current);
			/**
			* Install the version the capsule is showing.
			*
			* The request names the version the Host itself named for this row, never one
			* the reader typed: there is no field here, and the Host refuses anything that
			* is not a plain version in any case.
			*/
			const install = () => {
				const version = state.latest;
				if (version === void 0) return;
				setState((previous) => ({
					...previous,
					phase: "applying",
					reason: void 0
				}));
				applyUpdate(version).then((answer) => {
					if (answer.ok !== true) {
						setState((previous) => ({
							...previous,
							phase: "failed",
							failedAt: "install",
							reason: answer.error ?? refusalText(answer.failure, t)
						}));
						return;
					}
					setState((previous) => ({
						...previous,
						phase: "done",
						...answer.application === void 0 ? {} : { application: answer.application }
					}));
				});
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-cg-update-footer",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "dsh-cg-update-links",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(PluginLink, {
						href: PACKAGE_REPOSITORY,
						label: t("update.github"),
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconGithub, {})
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PluginLink, {
						href: PACKAGE_NPM_PAGE,
						label: t("update.npm"),
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconNpm, {})
					})]
				}), capsule(state, t, newer, {
					confirm: () => setState({
						...state,
						phase: "confirm"
					}),
					cancel: () => setState({
						...state,
						phase: "ready"
					}),
					install,
					retry: check
				})]
			});
		}
		/**
		* The section entry itself: this bundle's page gets the row, every other page
		* gets nothing.
		*
		* @param props - the page's subject and its translate seat.
		* @returns the row, or null when the page is not this bundle's.
		*/
		function UpdateSection({ t, subject }) {
			const own = ownVersion(subject);
			if (own === void 0) return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(UpdateFooter, {
				t,
				current: own.version
			});
		}
		//#endregion
		//#region src/client/index.ts
		/**
		* Client entry for dsh-cool-git.
		*
		* Contributes the 'conversation.view' entry that becomes a tab in the session's
		* tab bar, and — on this bundle's own page in the native Plugins panel — the
		* update row that says which version is published. The page reads the session's repository over
		* this package's own same-origin routes (see the Host half), so there are no
		* optional collaborators here. The shell's composer seat and transcript width
		* handles step aside while this tab is mounted — the handles through the root's
		* composer-overlay hook, the seat through the View itself plus the stylesheet
		* below.
		*
		* The tab's copy enters through the locale service, which owns the active
		* language and re-renders this entry when it changes: the dictionaries are
		* registered here, the slot entry declares the namespace it reads, and the
		* framework hands the rendered View the `t` seat bound to it. Nothing here
		* reads a sentence the View will not draw afterwards, so the whole page follows
		* a language switch without a reload.
		*/
		const name = "dsh-cool-git/client";
		/**
		* The locale service is a required collaborator rather than an optional one.
		*
		* The tab is worded entirely from its dictionaries, so a composition without
		* the service could only draw the wrong language: declaring the dependency is
		* what makes the framework apply this plugin once the service is there, and
		* what makes `ctx.get('locale')` below answer. DSH mounts the service with the
		* web client tree itself (`@deepseek-ai/dsh-web-app`), so nothing a Git tab can
		* run in is without it.
		*/
		const inject = ["slots", "locale"];
		function apply(ctx) {
			const slots = ctx.get("slots");
			if (slots === void 0) return;
			const locale = ctx.get("locale");
			ctx.effect(() => insertGitStyles(), "dsh-cool-git: styles");
			ctx.effect(() => locale.register(NS, {
				zh,
				en
			}), "dsh-cool-git: dictionaries");
			const t = locale.bind(NS);
			slots.inject("conversation.view", () => slots.register({
				name: "conversation.view",
				id: "git",
				order: 12,
				locale: NS,
				label: () => t("view.git")
			}, GitView));
			slots.inject("plugins.detail.section", () => slots.register({
				name: "plugins.detail.section",
				id: "git-update",
				locale: NS
			}, UpdateSection));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		exports.name = name;
		return module.exports;
	}
});
