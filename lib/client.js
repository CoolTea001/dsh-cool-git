window.__ModuleLoader__.load({
	id: "dsh-cool-git",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
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
			"fallback.status": "Could not read the repository status",
			"fallback.log": "Could not read the commit history",
			"fallback.diff": "Could not read the diff",
			"fallback.branches": "Could not read the branch list",
			"fallback.message": "Could not generate a commit message",
			"title.switchBranch": "Could not switch to {branch}",
			"title.refresh": "Refresh failed",
			"title.fetch": "Fetch failed",
			"title.mergeFrom": "Could not merge {branch} in",
			"title.pull": "Pull failed",
			"title.push": "Push failed",
			"title.publish": "Publish failed",
			"title.commit": "Commit failed",
			"title.diff": "Could not read the diff",
			"title.branches": "Could not read the branch list",
			"title.branchCreate": "Could not create the branch",
			"title.branchDelete": "Could not delete every branch",
			"title.message": "Could not generate a commit message",
			"dialog.close": "Close",
			"dialog.ok": "Got it",
			"head.currentBranch": "Current branch",
			"head.detached": "detached",
			"head.more": "More",
			"head.refresh": "Refresh",
			"head.fetch": "Fetch",
			"head.mergeFrom": "Merge from…",
			"head.branchCreate": "Branch create…",
			"head.branchDelete": "Branch delete…",
			"remote.publish": "Publish branch",
			"remote.sync": "Sync · {behind} to pull · {ahead} to push",
			"pane.files": "Changed files",
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
			"merge.titleFrom": "Merge another branch into this one",
			"merge.descriptionFrom": "Choose the branch to merge into this one",
			"merge.confirm": "Merge",
			"merge.noneFrom": "No other branch to merge in",
			"create.title": "Create branch",
			"create.description": "Name the new branch and choose where it starts",
			"create.name": "New branch name",
			"create.confirm": "Create",
			"create.none": "No branch to start from",
			"delete.title": "Delete branches",
			"delete.description": "Choose the branches to delete",
			"delete.list": "Branches to delete",
			"delete.confirm": "Delete",
			"delete.confirmCount": "Delete {count}",
			"delete.risky": "{count} of these are not merged or not pushed; Git will refuse those",
			"delete.none": "No branches to delete",
			"safety.safe": "Safe to delete",
			"safety.unmerged": "Not merged",
			"safety.unpushed": "Not pushed",
			"safety.gone": "Upstream gone",
			"safety.current": "Current",
			"commit.placeholder": "Commit Message",
			"commit.button": "Commit",
			"commit.busy": "Commit…",
			"commit.generate": "Generate a commit message",
			"commit.generating": "Generating…",
			"commit.warning": "Before you commit: {text}",
			"hint.commit-identity": "Set it once with git config --global user.name \"Your Name\" and git config --global user.email \"you@example.com\"; drop --global to set it for this repository only",
			"list.notRepo": "This session's directory is not a Git repository",
			"list.statusFailed": "Could not read the repository status",
			"list.loading": "Reading the repository…",
			"stage.staged": "Staged",
			"stage.unstaged": "Not staged",
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
			"error.not-ready": "The session is not ready yet; try again in a moment",
			"error.no-workdir": "Could not determine the session's working directory",
			"error.no-shell": "The shell service is unavailable, so Git cannot run",
			"error.missing-path": "Missing file path",
			"error.bad-hash": "Invalid commit id",
			"error.missing-message": "Missing commit message",
			"error.missing-branch": "Missing branch name",
			"error.missing-name": "Missing branch name to create",
			"error.git-denied": "The current permission mode does not allow running Git commands",
			"error.git-exit": "git exited with code {code}",
			"error.no-root": "git returned no repository root",
			"error.no-commits": "This repository has no commits yet",
			"error.unparsable-commit": "Could not parse that commit",
			"error.unknown-branch": "No such branch: {name}",
			"error.remote-local-name": "Could not derive a local branch name from the remote branch: {name}",
			"error.checkout-denied": "The current permission mode does not allow switching branches: it needs to write the workspace",
			"error.checkout-dirty": "Uncommitted changes would be overwritten; commit or stash them before switching",
			"error.checkout-dirty-paths": "Uncommitted changes to {paths} would be overwritten; commit or stash them before switching",
			"error.branch-exists": "The branch {branch} already exists",
			"error.create-denied": "The current permission mode does not allow creating a branch: it needs to write the workspace",
			"error.delete-denied": "The current permission mode does not allow deleting branches: it needs to write the workspace",
			"error.branch-not-merged": "Branch {branch} is not fully merged, so Git refused to delete it; merge or push it first",
			"error.branch-in-use": "Branch {branch} is checked out in a worktree, so Git cannot delete it",
			"error.unknown-remote": "No such remote: {remote}",
			"error.merge-denied": "The current permission mode does not allow merging: it needs to write the workspace",
			"error.merge-dirty": "Uncommitted changes are in the way; commit or stash them before merging",
			"error.merge-conflict": "The merge with {branch} conflicts, so it was aborted; merge it by hand to resolve the conflict",
			"error.merge-same-branch": "Cannot merge {branch} into itself",
			"error.merge-detached": "HEAD is detached, so there is no branch to merge",
			"error.merge-no-commits": "This branch has no commits yet, so there is nothing to merge",
			"error.pull-no-commits": "This branch has no commits yet, so there is nothing to pull",
			"error.push-no-commits": "This branch has no commits yet, so there is nothing to push",
			"error.pull-detached": "HEAD is detached, so there is no branch to pull",
			"error.push-detached": "HEAD is detached, so there is no branch to push",
			"error.pull-no-upstream": "Branch {branch} has no upstream, so it cannot be pulled",
			"error.pull-denied": "The current permission mode does not allow Pull: it needs to write the workspace",
			"error.push-denied": "The current permission mode does not allow Push: it needs to write the workspace",
			"error.fetch-denied": "The current permission mode does not allow Fetch: it needs to write the workspace",
			"error.pull-dirty": "Uncommitted changes would be overwritten; commit or stash them before pulling",
			"error.push-dirty": "Uncommitted changes would be overwritten; commit or stash them before pushing",
			"error.auth": "Remote authentication failed: configure credentials for this repository first (this plugin never prompts for them)",
			"error.auth-helper": "Remote authentication failed: Git could not start its credential helper inside the current permission sandbox, and no saved credential could be read (this plugin never prompts for one). Sign in once with Git Credential Manager, or use full-access mode / run Pull/Push outside this session",
			"error.pull-diverged": "The local and remote histories have diverged, and this plugin only fast-forwards: merge or rebase first",
			"error.push-behind": "The remote gained new commits during the sync; sync once more",
			"error.push-no-remote": "This repository has no remote configured, so it cannot be pushed",
			"error.push-ambiguous-remote": "There is more than one remote ({remotes}), so the push target is ambiguous",
			"error.commit-clean": "There is nothing to commit",
			"error.commit-conflict": "Unresolved conflicts remain; resolve them before committing",
			"error.commit-identity": "Git has no author identity configured, so it refused the commit",
			"error.commit-denied": "The current permission mode does not allow committing: it needs to write the workspace",
			"error.no-llm": "The model service is unavailable, so no commit message can be written",
			"error.no-model": "No default model is configured, so no commit message can be written",
			"error.model-timeout": "The model did not answer in time",
			"error.model-truncated": "The model used its whole output budget on reasoning before writing the message; try again, or lower the default reasoning effort",
			"error.empty-message": "The model returned no commit message"
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
			"fallback.status": "读取仓库状态失败",
			"fallback.log": "读取提交历史失败",
			"fallback.diff": "读取 Diff 失败",
			"fallback.branches": "读取分支列表失败",
			"fallback.message": "生成提交信息失败",
			"title.switchBranch": "切换到 {branch} 失败",
			"title.refresh": "刷新仓库失败",
			"title.fetch": "获取远端更新失败",
			"title.mergeFrom": "合并 {branch} 失败",
			"title.pull": "拉取失败",
			"title.push": "推送失败",
			"title.publish": "发布分支失败",
			"title.commit": "提交失败",
			"title.diff": "读取 Diff 失败",
			"title.branches": "读取分支列表失败",
			"title.branchCreate": "创建分支失败",
			"title.branchDelete": "删除分支失败",
			"title.message": "生成提交信息失败",
			"dialog.close": "关闭",
			"dialog.ok": "知道了",
			"head.currentBranch": "当前分支",
			"head.detached": "游离",
			"head.more": "更多",
			"head.refresh": "Refresh",
			"head.fetch": "Fetch",
			"head.mergeFrom": "Merge from…",
			"head.branchCreate": "Branch create…",
			"head.branchDelete": "Branch delete…",
			"remote.publish": "发布分支",
			"remote.sync": "同步变更 · 待拉取 {behind} · 待推送 {ahead}",
			"pane.files": "文件变更",
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
			"merge.titleFrom": "将指定分支合并到当前分支",
			"merge.descriptionFrom": "选择要合并进来的分支",
			"merge.confirm": "合并",
			"merge.noneFrom": "没有可合并的其它分支",
			"create.title": "创建分支",
			"create.description": "输入新分支名，并选择它的起点",
			"create.name": "新分支名",
			"create.confirm": "创建",
			"create.none": "没有可作为起点的分支",
			"delete.title": "删除分支",
			"delete.description": "选择要删除的分支",
			"delete.list": "待删除的分支",
			"delete.confirm": "删除",
			"delete.confirmCount": "删除 {count} 个",
			"delete.risky": "其中 {count} 个未合并或未推送，Git 会拒绝删除",
			"delete.none": "没有可删除的分支",
			"safety.safe": "可安全删除",
			"safety.unmerged": "未合并",
			"safety.unpushed": "未推送",
			"safety.gone": "上游已消失",
			"safety.current": "当前",
			"commit.placeholder": "Commit Message",
			"commit.button": "Commit",
			"commit.busy": "Commit…",
			"commit.generate": "自动生成提交信息",
			"commit.generating": "正在生成…",
			"commit.warning": "提交前请检查：{text}",
			"hint.commit-identity": "请先配置一次：git config --global user.name \"你的名字\"、git config --global user.email \"你的邮箱\"；去掉 --global 则只对当前仓库生效",
			"list.notRepo": "当前会话目录不是 Git 仓库",
			"list.statusFailed": "读取仓库状态失败",
			"list.loading": "正在读取仓库…",
			"stage.staged": "已暂存",
			"stage.unstaged": "未暂存",
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
			"error.not-ready": "会话尚未就绪，请稍后重试",
			"error.no-workdir": "无法确定该会话的工作目录",
			"error.no-shell": "shell 服务不可用，无法执行 Git 命令",
			"error.missing-path": "缺少文件路径",
			"error.bad-hash": "提交标识不合法",
			"error.missing-message": "缺少提交信息",
			"error.missing-branch": "缺少分支名",
			"error.missing-name": "缺少要创建的分支名",
			"error.git-denied": "当前权限模式不允许执行 Git 命令",
			"error.git-exit": "git 退出码 {code}",
			"error.no-root": "git 未返回仓库根目录",
			"error.no-commits": "该仓库还没有任何提交",
			"error.unparsable-commit": "无法解析该提交",
			"error.unknown-branch": "分支不存在：{name}",
			"error.remote-local-name": "无法从远程分支推导本地分支名：{name}",
			"error.checkout-denied": "当前权限模式不允许切换分支：该操作需要写入工作区",
			"error.checkout-dirty": "有未提交的改动会被覆盖，请先提交或暂存后再切换",
			"error.checkout-dirty-paths": "有未提交的改动会被覆盖（{paths}），请先提交或暂存后再切换",
			"error.branch-exists": "分支 {branch} 已存在",
			"error.create-denied": "当前权限模式不允许创建分支：该操作需要写入工作区",
			"error.delete-denied": "当前权限模式不允许删除分支：该操作需要写入工作区",
			"error.branch-not-merged": "分支 {branch} 尚未完全合并，Git 拒绝删除；请先合并或推送",
			"error.branch-in-use": "分支 {branch} 已在某个工作区中被检出，Git 无法删除",
			"error.unknown-remote": "不存在该远端：{remote}",
			"error.merge-denied": "当前权限模式不允许合并：该操作需要写入工作区",
			"error.merge-dirty": "存在未提交的改动，请先提交或暂存后再合并",
			"error.merge-conflict": "与 {branch} 的合并存在冲突，已中止；请手动合并以解决冲突",
			"error.merge-same-branch": "无法将 {branch} 合并到它自己",
			"error.merge-detached": "HEAD 处于游离状态，没有可合并的分支",
			"error.merge-no-commits": "当前分支还没有任何提交，无法合并",
			"error.pull-no-commits": "当前分支还没有任何提交，无法 Pull",
			"error.push-no-commits": "当前分支还没有任何提交，无法 Push",
			"error.pull-detached": "HEAD 处于游离状态，没有可拉取的分支",
			"error.push-detached": "HEAD 处于游离状态，没有可推送的分支",
			"error.pull-no-upstream": "分支 {branch} 没有上游分支，无法 Pull",
			"error.pull-denied": "当前权限模式不允许 Pull：该操作需要写入工作区",
			"error.push-denied": "当前权限模式不允许 Push：该操作需要写入工作区",
			"error.fetch-denied": "当前权限模式不允许 Fetch：该操作需要写入工作区",
			"error.pull-dirty": "有未提交的改动会被覆盖，请先提交或暂存后再 Pull",
			"error.push-dirty": "有未提交的改动会被覆盖，请先提交或暂存后再 Push",
			"error.auth": "远程认证失败：请先在该仓库配置好凭据（本插件不弹出任何凭据输入）",
			"error.auth-helper": "远程认证失败：Git 的凭据助手没能在当前权限沙箱内启动，也没有读到可用的已保存凭据（本插件不弹出凭据输入）。请先用 Git 凭据管理器登录一次，或改用完全访问模式、在该会话之外执行 Pull/Push",
			"error.pull-diverged": "本地与远程已经分叉，本插件只做快进式拉取：请先合并或变基",
			"error.push-behind": "远程在同步过程中又有了新提交，请再同步一次",
			"error.push-no-remote": "该仓库没有配置远程仓库，无法 Push",
			"error.push-ambiguous-remote": "有多个远程仓库（{remotes}），无法确定推送目标",
			"error.commit-clean": "工作区没有需要提交的改动",
			"error.commit-conflict": "存在未解决的冲突文件，请先解决冲突再提交",
			"error.commit-identity": "Git 还没有配置提交身份，无法提交",
			"error.commit-denied": "当前权限模式不允许提交：该操作需要写入工作区",
			"error.no-llm": "模型服务不可用，无法生成提交信息",
			"error.no-model": "未配置默认模型，无法生成提交信息",
			"error.model-timeout": "模型未在限定时间内返回结果",
			"error.model-truncated": "模型在写出提交信息前就把输出预算用在了思考上，请重试或降低默认推理强度",
			"error.empty-message": "模型未返回提交信息"
		};
		//#endregion
		//#region src/client/api.ts
		const BASE = "/dsh-cool-git/api";
		/**
		* POST one JSON body and read a JSON answer.
		*
		* @param path - route path below {@link BASE}.
		* @param body - the request body.
		* @returns the parsed payload, or an `{ ok: false }` result when the transport failed.
		*/
		async function postJson(path, body) {
			try {
				const response = await fetch(`${BASE}${path}`, {
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
					error: error instanceof Error ? error.message : String(error)
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
			return postJson("/status", { sessionId });
		}
		/**
		* Ask the Host for the newest commits.
		*
		* @param sessionId - the session whose directory Git runs in, when known.
		* @param limit - how many commits to ask for; the Host clamps it.
		* @returns the log payload.
		*/
		function fetchLog(sessionId, limit) {
			return postJson("/log", {
				sessionId,
				limit
			});
		}
		/**
		* Ask the Host for one changed path's patch against HEAD.
		*
		* @param sessionId - the session whose directory Git runs in, when known.
		* @param file - the path to diff, with the row's own stage/untracked facts.
		* @returns the diff payload.
		*/
		function fetchDiff(sessionId, file) {
			return postJson("/diff", {
				sessionId,
				path: file.path,
				staged: file.staged,
				untracked: file.untracked
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
			return postJson("/commit", {
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
			return postJson("/commit-all", {
				sessionId,
				message
			});
		}
		/**
		* Ask the Host to write a commit message for the changes on disk.
		*
		* The request names no changes and no model: which paths the model is shown, and
		* which model writes the message, are the Host's own reads — the repository's
		* state and the deployment's current default selection. The answer is a draft for
		* the form, never a commit: this call leaves the index and the history alone.
		*
		* @param sessionId - the session whose directory Git runs in, when known.
		* @returns the message payload, with the model's own findings beside it.
		*/
		function generateMessage(sessionId) {
			return postJson("/message", { sessionId });
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
			return postJson("/branches", { sessionId });
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
			return postJson("/checkout", {
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
			return postJson("/branch-report", { sessionId });
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
			return postJson("/branch-create", {
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
			return postJson("/branch-delete", {
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
			return postJson("/merge", {
				sessionId,
				branch
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
			return postJson("/fetch", { sessionId });
		}
		/**
		* Ask the Host to fast-forward the current branch from its upstream.
		*
		* The Host reads which branch and which upstream from the repository itself, so
		* this call carries nothing to aim: it is a request to pull, not an instruction
		* about what to pull. A divergent history is refused rather than merged.
		*
		* @param sessionId - the session whose directory Git runs in, when known.
		* @returns the sync payload.
		*/
		function pullBranch(sessionId) {
			return postJson("/pull", { sessionId });
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
			return postJson("/push", { sessionId });
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
				"arrow-right": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"1em\" height=\"1em\" viewBox=\"0 0 24 24\">\r\n	<path d=\"M0 0h24v24H0z\" fill=\"none\" />\r\n	<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"m9 18l6-6l-6-6\" />\r\n</svg>\r\n",
				"branch": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"1em\" height=\"1em\" viewBox=\"0 0 24 24\">\r\n	<path d=\"M0 0h24v24H0z\" fill=\"none\" />\r\n	<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\">\r\n		<path d=\"M15 6a9 9 0 0 0-9 9V3\" />\r\n		<circle cx=\"18\" cy=\"6\" r=\"3\" />\r\n		<circle cx=\"6\" cy=\"18\" r=\"3\" />\r\n	</g>\r\n</svg>\r\n",
				"check": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"1em\" height=\"1em\" viewBox=\"0 0 24 24\">\r\n	<path d=\"M0 0h24v24H0z\" fill=\"none\" />\r\n	<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M20 6L9 17l-5-5\" />\r\n</svg>\r\n",
				"copy": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"1em\" height=\"1em\" viewBox=\"0 0 24 24\">\r\n	<path d=\"M0 0h24v24H0z\" fill=\"none\" />\r\n	<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\">\r\n		<rect width=\"14\" height=\"14\" x=\"8\" y=\"8\" rx=\"2\" ry=\"2\" />\r\n		<path d=\"M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2\" />\r\n	</g>\r\n</svg>\r\n",
				"folder": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"1em\" height=\"1em\" viewBox=\"0 0 24 24\">\r\n	<path d=\"M0 0h24v24H0z\" fill=\"none\" />\r\n	<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z\" />\r\n</svg>\r\n",
				"generate": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"1em\" height=\"1em\" viewBox=\"0 0 24 24\">\r\n	<path d=\"M0 0h24v24H0z\" fill=\"none\" />\r\n	<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\">\r\n		<path d=\"M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594zM20 2v4m2-2h-4\" />\r\n		<circle cx=\"4\" cy=\"20\" r=\"2\" />\r\n	</g>\r\n</svg>\r\n",
				"more": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"1em\" height=\"1em\" viewBox=\"0 0 24 24\">\r\n	<path d=\"M0 0h24v24H0z\" fill=\"none\" />\r\n	<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\">\r\n		<circle cx=\"12\" cy=\"12\" r=\"1\" />\r\n		<circle cx=\"19\" cy=\"12\" r=\"1\" />\r\n		<circle cx=\"5\" cy=\"12\" r=\"1\" />\r\n	</g>\r\n</svg>\r\n",
				"publish": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"1em\" height=\"1em\" viewBox=\"0 0 24 24\">\r\n	<path d=\"M0 0h24v24H0z\" fill=\"none\" />\r\n	<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\">\r\n		<path d=\"M12 13v8m-8-6.101A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242\" />\r\n		<path d=\"m8 17l4-4l4 4\" />\r\n	</g>\r\n</svg>\r\n",
				"pull": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"1em\" height=\"1em\" viewBox=\"0 0 24 24\">\r\n	<path d=\"M0 0h24v24H0z\" fill=\"none\" />\r\n	<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M12 5v14m7-7l-7 7l-7-7\" />\r\n</svg>\r\n",
				"push": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"1em\" height=\"1em\" viewBox=\"0 0 24 24\">\r\n	<path d=\"M0 0h24v24H0z\" fill=\"none\" />\r\n	<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"m5 12l7-7l7 7m-7 7V5\" />\r\n</svg>\r\n",
				"refresh": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"1em\" height=\"1em\" viewBox=\"0 0 24 24\">\r\n	<path d=\"M0 0h24v24H0z\" fill=\"none\" />\r\n	<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\">\r\n		<path d=\"M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8\" />\r\n		<path d=\"M21 3v5h-5\" />\r\n	</g>\r\n</svg>\r\n"
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
		* The commit form's Generate control: the model writes the message that the
		* Commit button beside it would otherwise be handed (assets/generate.svg).
		*
		* A spark rather than a pen or a wand, because what it asks for is not an edit
		* of the text in the field but a reading of the changes behind it. It is the one
		* glyph on the page that stands for a model call, and it sits at the field's own
		* left edge so the pair reads as "write this, then commit it".
		*/
		const IconGenerate = svgIcon("generate");
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
			".dsh-cg-list{flex:1 1 auto;min-height:0;overflow:auto;padding:0 6px 8px}",
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
			".dsh-cg-branch-name{flex:0 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:left;font-family:var(--ds-font-family-code,ui-monospace,monospace)}",
			".dsh-cg-branch-tip{flex:0 1000 auto;min-width:24px}",
			".dsh-cg-branch-tip:has(.dsh-cg-divergence){min-width:54px}",
			".dsh-cg-branch-body{display:flex;flex-direction:column;min-width:0}",
			".dsh-cg-branch-filter,.dsh-cg-branch-list,.dsh-cg-branch-row,.dsh-cg-delete-row{box-sizing:border-box}",
			".dsh-cg-branch-filter{flex:none;width:100%}",
			".dsh-cg-branch-dialog{width:min(450px,100%)}",
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
			".dsh-cg-branch-row[aria-selected=true]{background:var(--dsw-alias-interactive-bg-hover)}",
			".dsh-cg-branch-row-name{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:var(--ds-font-family-code,ui-monospace,monospace)}",
			".dsh-cg-branch-create-name{flex:none;width:100%;box-sizing:border-box}",
			".dsh-cg-branch-create-name+.dsh-cg-branch-filter{margin-top:8px}",
			".dsh-cg-delete-row{flex:none;display:flex;align-items:center;gap:8px;width:100%;height:28px;padding:0 8px;border-radius:var(--dsw-radius-sm,6px);color:var(--dsw-alias-label-primary);font-size:12px;cursor:pointer}",
			".dsh-cg-delete-row:hover{background:var(--dsw-alias-interactive-bg-hover)}",
			".dsh-cg-delete-row:has(.dsh-cg-delete-check:checked){background:var(--dsw-alias-interactive-bg-hover)}",
			".dsh-cg-delete-row:has(.dsh-cg-delete-check:disabled){cursor:default}",
			".dsh-cg-delete-row:has(.dsh-cg-delete-check:disabled):hover{background:transparent}",
			".dsh-cg-delete-check{flex:none;margin:0;accent-color:var(--dsw-alias-state-error-primary)}",
			".dsh-cg-delete-name{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:var(--ds-font-family-code,ui-monospace,monospace)}",
			".dsh-cg-delete-meta{flex:0 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-tertiary);font-family:var(--ds-font-family-code,ui-monospace,monospace)}",
			".dsh-cg-safety{flex:none;padding:0 6px;border-radius:var(--dsw-radius-sm,6px);background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:18px}",
			".dsh-cg-safety[data-safety=unmerged],.dsh-cg-safety[data-safety=unpushed],.dsh-cg-safety[data-safety=gone]{color:var(--dsw-alias-state-warn-primary)}",
			".dsh-cg-safety[data-safety=current]{color:var(--dsw-alias-label-secondary)}",
			".dsh-cg-dialog-hint{margin:0;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:1.7}",
			".dsh-cg-branch-filter+.dsh-cg-dialog-hint{margin-top:8px}",
			".dsh-cg-branch-list-wrap+.dsh-cg-dialog-hint{margin-top:8px}",
			".dsh-cg-dialog-body{display:flex;flex-direction:column;gap:8px}",
			".dsh-cg-dialog-text{margin:0;font-size:13px;line-height:20px;color:var(--dsw-alias-state-error-primary);white-space:pre-wrap;word-break:break-word}",
			".dsh-cg-commit-bar{flex:none;display:flex;flex-direction:column;gap:6px;padding:0px 10px 8px;border-bottom:.5px solid var(--dsw-alias-border-l3)}",
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
			".dsh-cg-commit-send{width:100%}",
			".dsh-cg-commit-note{margin:0;white-space:pre-line;color:var(--dsw-alias-state-warn-primary);font-size:11.5px;line-height:1.45}",
			".dsh-cg-row{display:flex;align-items:center;gap:6px;width:100%;height:26px;padding:0 6px;border:0;border-radius:var(--dsw-radius-sm,6px);background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer}",
			".dsh-cg-row:hover,.dsh-cg-row[aria-selected=true]{background:var(--dsw-alias-interactive-bg-hover)}",
			".dsh-cg-badge{flex:none;width:13px;text-align:center;font-family:var(--ds-font-family-code,ui-monospace,monospace);font-size:11px;font-weight:700;color:var(--dsw-alias-label-tertiary)}",
			".dsh-cg-badge[data-kind=added]{color:var(--dsw-alias-state-success-primary)}",
			".dsh-cg-badge[data-kind=modified]{color:var(--dsw-alias-state-warn-primary)}",
			".dsh-cg-badge[data-kind=deleted]{color:var(--dsw-alias-state-error-primary)}",
			".dsh-cg-badge[data-kind=conflicted]{color:var(--dsw-alias-state-error-primary)}",
			".dsh-cg-badge[data-kind=renamed]{color:var(--dsw-alias-brand-primary)}",
			".dsh-cg-badge[data-kind=copied]{color:var(--dsw-alias-brand-primary)}",
			".dsh-cg-badge[data-kind=typechange]{color:var(--dsw-alias-state-warn-primary)}",
			".dsh-cg-badge[data-kind=untracked]{color:var(--dsw-alias-state-idle-primary)}",
			".dsh-cg-path{display:flex;align-items:baseline;gap:4px;flex:1 1 auto;min-width:0;font-family:var(--ds-font-family-code,ui-monospace,monospace);font-size:11.5px}",
			".dsh-cg-name{flex:0 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-primary)}",
			".dsh-cg-dot{flex:none;color:var(--dsw-alias-label-tertiary)}",
			".dsh-cg-dir{color:var(--dsw-alias-label-tertiary)}",
			".dsh-cg-path .dsh-cg-dir{flex:0 100000 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
			".dsh-cg-stage{flex:none;width:5px;height:5px;border-radius:50%;background:var(--dsw-alias-brand-primary)}",
			".dsh-cg-stage[data-staged=false]{background:transparent}",
			".dsh-cg-commit{display:flex;flex-direction:column;gap:2px;width:100%;padding:5px 6px;border:0;border-radius:var(--dsw-radius-sm,6px);background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer}",
			".dsh-cg-commit:hover,.dsh-cg-commit[aria-selected=true]{background:var(--dsw-alias-interactive-bg-hover)}",
			".dsh-cg-subject{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;color:var(--dsw-alias-label-primary)}",
			".dsh-cg-meta{display:flex;align-items:center;gap:6px;overflow:hidden;white-space:nowrap;font-size:10.5px;color:var(--dsw-alias-label-tertiary)}",
			".dsh-cg-hash{font-family:var(--ds-font-family-code,ui-monospace,monospace)}",
			".dsh-cg-refs{display:flex;flex-wrap:nowrap;gap:4px;overflow-x:auto;overflow-y:hidden;scrollbar-width:none}",
			".dsh-cg-refs::-webkit-scrollbar{display:none}",
			".dsh-cg-ref{flex:none;white-space:nowrap;padding:0 4px;border-radius:var(--dsw-radius-xs,4px);background:var(--dsw-alias-state-business-primary);color:var(--dsw-alias-label-primary-foreground);font-size:10px;line-height:14px}",
			".dsh-cg-note{padding:8px 12px;color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:1.7}",
			".dsh-cg-main{flex:1 1 auto;display:flex;flex-direction:column;min-width:0;min-height:0}",
			".dsh-cg-main-head{flex:none;display:flex;align-items:center;gap:8px;min-height:30px;padding:4px 8px 4px 12px;border-bottom:.5px solid var(--dsw-alias-border-l3);background:var(--dsw-alias-bg-base)}",
			".dsh-cg-main-title{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:var(--ds-font-family-code,ui-monospace,monospace);font-size:11.5px;color:var(--dsw-alias-label-secondary)}",
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
			`html.ct-bg-on .${GIT_ROOT_CLASS}{--dsw-alias-bg-base:transparent;--dsw-alias-bg-layer-1:transparent}`
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
		* diff pane shows either one path's patch against HEAD or one commit's whole
		* patch (see `api.ts` for the routes and `diff.ts` for the patch parser). The
		* sidebar's second row is the commit form — a message field and the button that
		* stages every change the changed-path list holds and records them as one commit
		* — and the two panes stack under it. Both of the sidebar's boundaries — its right
		* edge and the divider between the two lists — are the reader's to drag, and both
		* sizes are remembered between visits (see `layout.tsx`).
		*
		* The page owns no repository state of its own: every answer is a plain value
		* fetched from the Host, and the only local state is which row is selected, which
		* answer is current, which failure the dialog is stating, which operation is in
		* flight — a checkout, one half of a remote round trip, or the commit the
		* changed-path list asks for — each of which is what disables the other
		* controls, and where the two boundaries were left. That keeps a manual refresh
		* honest — it re-reads `status` and `log`, and the diff pane re-reads whatever
		* it is showing.
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
		/** How long the copy button reports success before returning to its idle label. */
		const COPY_FEEDBACK_MS = 1200;
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
		* Stable identity for one selection, so a late answer can be discarded.
		*
		* @param selection - the current selection, or null.
		* @returns a string that changes exactly when the selection does.
		*/
		function selectionKey(selection) {
			if (selection === null) return "";
			return selection.kind === "file" ? `file:${selection.file.path}` : `commit:${selection.commit.hash}`;
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
			return {
				...base,
				binary: result.binary === true
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
		* Shorten one `%D` decoration for the row's tag.
		*
		* @param ref - one decoration, e.g. `HEAD -> main`.
		* @returns the branch or tag name alone.
		*/
		function refLabel(ref) {
			return ref.replace(/^HEAD -> /, "").replace(/^tag: /, "");
		}
		/**
		* One pane header's text: its label, and how many rows it is showing.
		*
		* The count is part of the line rather than a badge of its own, so the header
		* reads as one sentence and stays one line however narrow the sidebar gets —
		* the whole thing truncates as a unit instead of the count leaving first. It is
		* written even at zero, because an empty pane and a pane the page never filled
		* are two different states and only the count tells them apart.
		*
		* @param label - the pane's name, already worded by the page's dictionary.
		* @param count - the rows the pane drew.
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
			const sessionId = typeof props?.sessionId === "string" ? props.sessionId : void 0;
			const [status, setStatus] = (0, react.useState)(null);
			const [log, setLog] = (0, react.useState)(null);
			const [loaded, setLoaded] = (0, react.useState)(false);
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
			const [selection, setSelection] = (0, react.useState)(null);
			const [doc, setDoc] = (0, react.useState)(null);
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
			/** Re-read the repository state and the history. */
			const refresh = (0, react.useCallback)(async () => {
				setRefreshing(true);
				try {
					const [nextStatus, nextLog] = await Promise.all([fetchStatus(sessionId), fetchLog(sessionId, LOG_LIMIT)]);
					setStatus(nextStatus);
					setLog(nextLog);
					const lines = [];
					if (nextStatus?.ok !== true && !isNoRepo(nextStatus)) lines.push(failureLine(t, "label.status", nextStatus, "fallback.status"));
					if (nextLog?.ok !== true && !isNoRepo(nextLog)) lines.push(failureLine(t, "label.log", nextLog, "fallback.log"));
					if (lines.length > 0) reportError({
						title: t("title.refresh"),
						lines
					});
				} finally {
					setRefreshing(false);
					setLoaded(true);
				}
			}, [
				sessionId,
				reportError,
				t
			]);
			(0, react.useEffect)(() => {
				refresh();
			}, [refresh]);
			const handleSwitched = (0, react.useCallback)(() => {
				setSelection(null);
				refresh();
			}, [refresh]);
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
						reportError({
							title: t("title.fetch"),
							lines: [reasonOf(t, result, "title.fetch")]
						});
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
			* A refusal is the error dialog's, like every other failure.
			*
			* @param branch - the branch the user picked and confirmed.
			*/
			const handleCheckout = (0, react.useCallback)((branch) => {
				setSwitching(branch);
				checkoutBranch(sessionId, branch).then((result) => {
					setSwitching(null);
					if (result?.ok !== true) {
						const title = t("title.switchBranch", { branch });
						reportError({
							title,
							lines: [reasonOf(t, result, "title.switchBranch", { branch })]
						});
						return;
					}
					handleSwitched();
				});
			}, [
				sessionId,
				handleSwitched,
				reportError,
				t
			]);
			/**
			* Merge the branch the dialog confirmed into the branch HEAD is on.
			*
			* The page's part is one name: the Host decides what a name may be, and Git
			* merges into the branch it is on. The merge leaves HEAD where it is, but it
			* rewrites the history — and a fast-forward rewrites the working tree as well —
			* so a success takes the checkout's path and re-reads everything. A refusal is
			* the error dialog's, worded around the branch the request named.
			*
			* @param branch - the branch the dialog confirmed, which is the merge's source.
			*/
			const handleMerge = (0, react.useCallback)((branch) => {
				setMerging(branch);
				mergeBranch(sessionId, branch).then((result) => {
					setMerging(null);
					if (result?.ok !== true) {
						reportError({
							title: t("title.mergeFrom", { branch }),
							lines: [reasonOf(t, result, "title.mergeFrom", { branch })]
						});
						return;
					}
					handleSwitched();
				});
			}, [
				sessionId,
				handleSwitched,
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
			* is stale. A refusal is the error dialog's.
			*
			* @param name - the branch to create.
			* @param start - the branch it starts at.
			*/
			const handleCreate = (0, react.useCallback)((name, start) => {
				setCreating(true);
				createBranch(sessionId, name, start).then((result) => {
					setCreating(false);
					if (result?.ok !== true) {
						reportError({
							title: t("title.branchCreate"),
							lines: [reasonOf(t, result, "title.branchCreate")]
						});
						return;
					}
					handleSwitched();
				});
			}, [
				sessionId,
				handleSwitched,
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
			* @param targets - the branches the dialog selected.
			*/
			const handleDelete = (0, react.useCallback)((targets) => {
				setDeleting(true);
				deleteBranches(sessionId, targets).then((result) => {
					setDeleting(false);
					const lines = deletionLines(t, result);
					if (lines.length > 0) reportError({
						title: t("title.branchDelete"),
						lines
					});
					handleSynced();
				});
			}, [
				sessionId,
				handleSynced,
				reportError,
				t
			]);
			/**
			* Send this branch to its upstream, and report the answer.
			*
			* Publish and the second half of Sync run this one call, because the Host
			* decides which of the two it is from the repository itself: a branch with no
			* upstream is pushed to the single configured remote and recorded as its
			* upstream. The only difference the page makes is what it calls a failure.
			*
			* @param title - the entry naming which of the two was asked.
			*/
			const pushRemote = (0, react.useCallback)((title) => {
				setSyncing("push");
				pushBranch(sessionId).then((result) => {
					setSyncing(null);
					if (result?.ok !== true) reportError({
						title: t(title),
						lines: [reasonOf(t, result, title)]
					});
					handleSynced();
				});
			}, [
				sessionId,
				handleSynced,
				reportError,
				t
			]);
			/**
			* Run the round trip: pull, then push.
			*
			* The order is what makes a single button safe. Fast-forwarding first means
			* the push that follows sends a history the remote already has, so the common
			* divergence — the remote moved on while this branch did — resolves without a
			* second click and without the non-fast-forward refusal. A refused pull stops
			* there instead: the two sides have diverged, and pushing into that is exactly
			* the refusal the pull has already explained.
			*
			* This is only ever asked of a branch that has an upstream — without one the
			* header offers Publish instead — so the pull has a target by construction.
			*/
			const syncRemote = (0, react.useCallback)(() => {
				setSyncing("pull");
				pullBranch(sessionId).then((result) => {
					if (result?.ok !== true) {
						setSyncing(null);
						reportError({
							title: t("title.pull"),
							lines: [reasonOf(t, result, "title.pull")]
						});
						handleSynced();
						return;
					}
					handleSwitched();
					pushRemote("title.push");
				});
			}, [
				sessionId,
				handleSwitched,
				handleSynced,
				reportError,
				pushRemote,
				t
			]);
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
			* Commit every change the changed-path list is showing, under the message the
			* form holds.
			*
			* The page asks for the whole thing — the stage and the commit — in one call,
			* because that is the one decision the form offers: there is no per-path
			* staging on this page, so a commit interrupted between two requests would
			* leave an index nothing here could finish. What the answer decides is whether
			* the form keeps its message: a refusal leaves it where it is, because the
			* message is usually the thing to fix, and the repository is re-read either way
			* — even a refusal can have staged something first.
			*
			* @param message - the commit message the form holds, already non-empty.
			* @returns whether the commit was made, which is what clears the form.
			*/
			const handleCommit = (0, react.useCallback)((message) => {
				setCommitting(true);
				return commitAll(sessionId, message).then((result) => {
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
					handleSwitched();
					return true;
				});
			}, [
				sessionId,
				handleSynced,
				handleSwitched,
				reportError,
				t
			]);
			/**
			* Ask the Host for a commit message written for the changes on disk.
			*
			* The page owns this call because it owns the session and the error dialog: the
			* route resolves the repository from the session's own header and takes the
			* model from the deployment's current default selection, so the request names
			* neither — and a refusal, from a clean tree to a missing model, is reported the
			* way every other failed request is.
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
				return generateMessage(sessionId).then((result) => {
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
				sessionId,
				reportError,
				t
			]);
			const busy = switching !== null || merging !== null || syncing !== null || committing || fetching || creating || deleting;
			const files = status?.ok === true ? status.files ?? [] : [];
			const commits = log?.ok === true ? log.commits ?? [] : [];
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
				let cancelled = false;
				setDoc({
					key,
					loading: true
				});
				(selection.kind === "commit" ? fetchCommit(sessionId, selection.commit.hash) : activeFile === null ? Promise.resolve({
					ok: false,
					error: t("fallback.fileGone")
				}) : fetchDiff(sessionId, activeFile)).then((result) => {
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
								switching,
								merging: merging !== null,
								creating,
								deleting,
								busy,
								onRefresh: () => void refresh(),
								onFetch: handleFetch,
								onCheckout: handleCheckout,
								onMerge: handleMerge,
								onCreate: handleCreate,
								onDelete: handleDelete,
								onError: reportError
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(CommitBar, {
								t,
								disabled: status?.ok !== true || files.length === 0 || busy || refreshing,
								committing,
								onCommit: handleCommit,
								onGenerate: handleGenerateMessage
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
								ref: filesPane,
								className: "dsh-cg-pane dsh-cg-files",
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("header", {
										className: "dsh-cg-head",
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "dsh-cg-head-title",
											children: headText(t("pane.files"), files.length)
										})
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: "dsh-cg-list",
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ChangeList, {
											t,
											status,
											loaded,
											files,
											selection,
											onSelect: (file) => setSelection({
												kind: "file",
												file
											})
										})
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ResizeHandle, {
										axis: "row",
										onStart: startSplitResize,
										onDrag: dragSplitResize,
										onCommit: commitSplitResize,
										onEnd: endResize
									})
								]
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
							current
						})
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
		* The sidebar's first row: the Workspace this session is in, the branch it is
		* on, and the More control every other operation hangs from. It draws no rule of
		* its own: the toolbar and the commit form under it are one block, closed
		* together by that form's own hairline.
		*
		* More is one control rather than a button per operation because the row has to
		* fit the sidebar's own floor: Refresh used to be the row's single icon, and the
		* fetch and the merge would have been two more. A menu states them by name
		* instead — a dropdown can be as wide as its words, and a 22px square cannot.
		*
		* The menu is read top to bottom as one sentence about the repository: the two
		* rows that only re-read it (Refresh, Fetch) above the rule, and the two that
		* change it below. Fetch sits with Refresh rather than with the remote round trip
		* because that is what it is — a read of the remotes, whose whole effect is that
		* the numbers beside Sync and the remote branches in the picker become true.
		*
		* The branch switch and the merge are both stated as decisions rather than
		* accidents: the dialog lists what Git reported and applies nothing until the
		* choice is confirmed with a button of its own, and this row closes it before
		* handing the branch to the page. Which decision it is comes from the menu row
		* that opened it — Refresh and Fetch run at once because they have nothing to
		* choose, while a merge names another branch and gets a dialog of its own. The
		* operations themselves are the page's (`GitView`), which owns every operation in
		* flight and disables the rest of the page's controls while one runs.
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
		* @param props.switching - the branch a checkout is in flight for, if any.
		* @param props.merging - whether a merge is in flight.
		* @param props.busy - whether any repository operation is in flight.
		* @param props.onRefresh - called to re-read the repository state and history.
		* @param props.onFetch - called to refresh the remote-tracking refs.
		* @param props.onCheckout - called with the branch the dialog confirmed.
		* @param props.onMerge - called with the branch the dialog confirmed.
		* @param props.onCreate - called with the name and starting point the dialog confirmed.
		* @param props.onDelete - called with the branches the delete dialog confirmed.
		* @param props.onError - called with the failure to state in the error dialog.
		* @returns the header row.
		*/
		function SideHead(props) {
			const { t, status, sessionId, refreshing, fetching, switching, merging, creating, deleting, busy, onRefresh, onFetch, onCheckout, onMerge, onCreate, onDelete, onError } = props;
			/** Whether the More menu is showing. */
			const [menuOpen, setMenuOpen] = (0, react.useState)(false);
			/** Which decision the branch list is open for, or null while it is closed. */
			const [pick, setPick] = (0, react.useState)(null);
			/** Whether the delete dialog is showing. */
			const [deleteOpen, setDeleteOpen] = (0, react.useState)(false);
			const onBranch = status?.ok === true;
			const detached = status?.detached === true;
			/**
			* Whether a row behind the More control is running right now.
			*
			* Every operation the menu itself can start, and none of the ones it cannot: a
			* commit or a sync belongs to another control, and a spinner on this one would
			* be claiming a wait that is not its own.
			*/
			const menuBusy = refreshing || fetching || merging || creating || deleting;
			/** Close the branch list without applying anything. */
			const closeDialog = (0, react.useCallback)(() => {
				setPick(null);
			}, []);
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
				else if (id === "branch-create") setPick("create");
				else if (id === "branch-delete") setDeleteOpen(true);
				else if (id === "merge-from") setPick("merge-from");
			}, [onRefresh, onFetch]);
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
						onClose: () => setDeleteOpen(false),
						onConfirm: (targets) => {
							setDeleteOpen(false);
							onDelete(targets);
						},
						onError
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dsh-cg-tools",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Menu, {
							open: menuOpen,
							anchor: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
								label: t("head.more"),
								side: "bottom",
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
		* Sync is the round trip taken in the one order that cannot rewind work: a
		* fast-forward pull, then a push of what is left. Both arrows and both counts
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
			const title = mode === "merge-from" ? t("merge.titleFrom") : mode === "create" ? t("create.title") : t("branch.title");
			const description = mode === "merge-from" ? t("merge.descriptionFrom") : mode === "create" ? t("create.description") : t("branch.description");
			const emptyText = mode === "merge-from" ? t("merge.noneFrom") : mode === "create" ? t("create.none") : t("branch.none");
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
				mode === "create" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
					className: "dsh-cg-branch-create-name",
					type: "text",
					value: name,
					placeholder: t("create.name"),
					"aria-label": t("create.name"),
					"data-modal-autofocus": true,
					onChange: (event) => setName(event.target.value)
				}) : null,
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
			/**
			* What the footer's button says, which is the operation and nothing else.
			*
			* The button carries the same word as the menu row that opened the dialog, so
			* the click that started this and the click that finishes it name the same
			* thing.
			*/
			const confirmLabel = mode === "create" ? t("create.confirm") : mode === "merge-from" ? t("merge.confirm") : t("branch.confirm");
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
				open,
				onClose,
				title,
				description,
				closeLabel: t("dialog.close"),
				className: "dsh-cg-branch-dialog",
				footer: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					variant: "outline",
					onClick: onClose,
					children: t("branch.cancel")
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					variant: "primary",
					disabled: !canConfirm,
					onClick: () => {
						if (picked !== null) onConfirm(mode === "create" ? nameInput : picked, picked);
					},
					children: confirmLabel
				})] }),
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "dsh-cg-branch-body",
					children: content
				})
			});
		}
		/** The badge each safety mark is drawn from. */
		const SAFETY_KEY = {
			safe: "safety.safe",
			unmerged: "safety.unmerged",
			unpushed: "safety.unpushed",
			gone: "safety.gone"
		};
		/**
		* The line under a branch's name, which is what its badge is not.
		*
		* The upstream and the two counts are the facts behind the mark rather than the
		* mark itself: `unpushed` says a branch has commits nothing else has, and `↑2`
		* says how many. They are read as-is — a ref name is a path, and a count is a
		* number — so nothing here is translated. The badge carries the words.
		*
		* @param entry - the branch the row is drawn from.
		* @returns the meta line, or an empty string when there is nothing to say.
		*/
		function entryMeta(entry) {
			const parts = [];
			if (entry.upstream !== void 0 && entry.upstream !== "") parts.push(entry.upstream);
			if (entry.ahead !== void 0 && entry.ahead > 0) parts.push(`↑${entry.ahead}`);
			if (entry.behind !== void 0 && entry.behind > 0) parts.push(`↓${entry.behind}`);
			return parts.join(" ");
		}
		/**
		* The branches Git reports, as a dialog they are picked out of for deletion.
		*
		* A dialog of its own rather than a fourth mode on the branch list, because the
		* decision is a different shape: that list answers with one branch and this one
		* with as many as are ticked, its rows carry facts — a merge state, an upstream,
		* two counts — that a switch has no use for, and one of its rows is disabled
		* rather than merely unhelpful. What the two do share is the scroll box, the
		* filter and the edge fades, which are read from the same refs by the same hook.
		*
		* Every row carries a safety mark and every row is still selectable, the current
		* branch aside: the mark is what the page knows, and whether a branch may be
		* deleted is Git's answer, given when the delete is asked for. A branch whose
		* commits are nowhere else is refused by Git's own `-d`, and the page's job is to
		* have said so on the row rather than to have hidden the row. The one exception
		* is the branch HEAD is on, which Git will refuse in every case and which is
		* therefore the one row the dialog does not offer at all.
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
		* @param props.t - the page's translate seat.
		* @param props.open - whether the dialog is showing.
		* @param props.sessionId - the session whose repository is being read.
		* @param props.onClose - called by Cancel, the close button, Escape, or the mask.
		* @param props.onConfirm - called with the branches to delete when the footer is pressed.
		* @param props.onError - called with the failure to state in the error dialog.
		* @returns the dialog element.
		*/
		function BranchDeleteDialog(props) {
			const { t, open, sessionId, onClose, onConfirm, onError } = props;
			/** The branches Git reported, or null while it has not answered yet. */
			const [report, setReport] = (0, react.useState)(null);
			/** A directory that is not a repository: the dialog's own empty state. */
			const [noRepo, setNoRepo] = (0, react.useState)(false);
			/** The keys of the rows that are ticked, in the order they were ticked. */
			const [selection, setSelection] = (0, react.useState)([]);
			const [filter, setFilter] = (0, react.useState)("");
			const listScroll = (0, react.useRef)(null);
			const listWrap = (0, react.useRef)(null);
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
			const chosen = rows.filter((row) => selection.includes(keyOf(row.entry)));
			const risky = chosen.filter((row) => row.entry.current !== true && row.entry.safety !== "safe").length;
			/**
			* The branches to delete, in the shape the Host asked to be given them back.
			*
			* A row that is missing the pair a remote-tracking row is deleted by is left
			* out rather than guessed at: the Host resolves the remote and the branch when
			* it reads the list, so a row without them is one this half cannot name, and
			* naming nothing is not a deletion to ask for.
			*/
			const targets = chosen.flatMap((row) => {
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
								const meta = entryMeta(entry);
								return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react.Fragment, { children: [row.group === shown[index - 1]?.group ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									role: "presentation",
									className: "dsh-cg-branch-group",
									children: t(BRANCH_GROUP_KEY[row.group])
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									className: "dsh-cg-delete-row",
									"data-safety": entry.current === true ? "current" : entry.safety,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
											type: "checkbox",
											className: "dsh-cg-delete-check",
											checked: selection.includes(key),
											disabled: entry.current === true,
											onChange: () => setSelection((previous) => previous.includes(key) ? previous.filter((one) => one !== key) : [...previous, key])
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "dsh-cg-delete-name",
											children: entry.name
										}),
										meta === "" ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "dsh-cg-delete-meta",
											children: meta
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "dsh-cg-safety",
											"data-safety": entry.current === true ? "current" : entry.safety,
											children: t(entry.current === true ? "safety.current" : SAFETY_KEY[entry.safety])
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
				selection.length === 0 || risky === 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: "dsh-cg-dialog-hint",
					children: t("delete.risky", { count: risky })
				}),
				report?.truncated === true ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: "dsh-cg-dialog-hint",
					children: t("branch.truncated")
				}) : null
			] });
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
				open,
				onClose,
				title: t("delete.title"),
				description: t("delete.description"),
				closeLabel: t("dialog.close"),
				className: "dsh-cg-branch-dialog",
				footer: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					variant: "outline",
					onClick: onClose,
					children: t("branch.cancel")
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					variant: "danger",
					disabled: selection.length === 0,
					onClick: () => onConfirm(targets),
					children: selection.length === 0 ? t("delete.confirm") : t("delete.confirmCount", { count: selection.length })
				})] }),
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "dsh-cg-branch-body",
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
			const trimmed = root.replace(/\/+$/, "");
			const cut = trimmed.lastIndexOf("/");
			return cut < 0 ? trimmed : trimmed.slice(cut + 1);
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
		* It is a form of one decision, and that decision is the plain one: everything
		* the changed-path list holds goes in — tracked edits, deletions, and untracked
		* files alike — because nothing on this page offers a per-path choice that could
		* make the set smaller.
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
		* there is none to name, nothing is changed, or the page is busy with something
		* else.
		* @param props.committing - the commit this form asked for is in flight.
		* @param props.onCommit - runs the commit; resolves true when one was made.
		* @param props.onGenerate - asks the Host for a message; resolves null when the
		* request failed and the page has already reported it, in which case the field is
		* left exactly as it was.
		* @returns the form element.
		*/
		function CommitBar(props) {
			const { t, disabled, committing, onCommit, onGenerate } = props;
			const [message, setMessage] = (0, react.useState)("");
			const [generating, setGenerating] = (0, react.useState)(false);
			const [warning, setWarning] = (0, react.useState)("");
			const field = (0, react.useRef)(null);
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
			* Ask for the commit the field currently describes.
			*
			* Bound to the button and to ⌘/Ctrl+Enter in the field: Enter alone is the line
			* break a message needs, so the chord is the keyboard's own way to submit.
			*/
			const submit = (0, react.useCallback)(() => {
				const trimmed = message.trim();
				if (trimmed === "" || disabled || committing || generating) return;
				onCommit(trimmed).then((made) => {
					if (!made) return;
					setMessage("");
					setWarning("");
				});
			}, [
				message,
				disabled,
				committing,
				generating,
				onCommit
			]);
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
				if (disabled || committing || generating) return;
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
				onGenerate
			]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-cg-commit-bar",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: "dsh-cg-commit-frame",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
							ref: field,
							className: "dsh-cg-commit-input",
							value: message,
							placeholder: t("commit.placeholder"),
							"aria-label": t("commit.placeholder"),
							rows: 1,
							disabled: committing || generating,
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
							disabled: disabled || committing || generating,
							onClick: generate,
							children: generating ? SPINNER_ICON : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconGenerate, {})
						})]
					}),
					warning === "" ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "dsh-cg-commit-note",
						role: "status",
						children: t("commit.warning", { text: warning })
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
						className: "dsh-cg-commit-send",
						variant: "primary",
						size: "sm",
						disabled: disabled || committing || generating || message.trim() === "",
						onClick: submit,
						children: committing ? t("commit.busy") : t("commit.button")
					})
				]
			});
		}
		/**
		* The changed-path list, or the reason there is none to draw.
		*
		* A clean working tree draws nothing at all: the header's own count already
		* says zero, so a line inside the pane would only say it a second time.
		*
		* @param props.t - the page's translate seat.
		* @param props.status - the current status answer.
		* @param props.loaded - at least one answer has arrived.
		* @param props.files - the rows to render.
		* @param props.selection - the current selection, for the selected row's state.
		* @param props.onSelect - called with the row the user picked.
		* @returns the list body.
		*/
		function ChangeList(props) {
			const { t, status, loaded, files, selection, onSelect } = props;
			if (status !== null && status.ok !== true) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Note, { text: t(status.reason === "no-repo" ? "list.notRepo" : "list.statusFailed") });
			if (!loaded && status === null) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Note, { text: t("list.loading") });
			if (files.length === 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, {});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, { children: files.map((file) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
				label: rowLabel(t, file),
				side: "right",
				portal: true,
				maxWidth: TOOLTIP_MAX_WIDTH,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					className: "dsh-cg-row",
					"aria-selected": selection?.kind === "file" && selection.file.path === file.path,
					onClick: () => onSelect(file),
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dsh-cg-badge",
							"data-kind": file.kind,
							children: KIND_LETTER[file.kind]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(PathLabel, { path: file.path }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dsh-cg-stage",
							"data-staged": file.staged,
							title: t(file.staged ? "stage.staged" : "stage.unstaged")
						})
					]
				})
			}, file.path)) });
		}
		/**
		* What a changed-path row says about itself when hovered: its path first — a
		* rename's old path trailing it — then its state, spelled out rather than
		* lettered, the same `· ` separator the pane headers use.
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
		* A changed path, named first and parented second: `name · parent/dir`, with the
		* parent dimmer than the name. A path at the repository root has no parent, so
		* it carries no separator.
		*
		* @param props.path - the repository-relative path.
		* @returns the path element.
		*/
		function PathLabel({ path }) {
			const { dir, name } = splitPath(path);
			const parent = dir.replace(/\/$/, "");
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
				className: "dsh-cg-path",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: "dsh-cg-name",
					children: name
				}), parent === "" ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: "dsh-cg-dot",
					children: "·"
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: "dsh-cg-dir",
					children: parent
				})] })]
			});
		}
		/**
		* The diff pane: its header, its body, and its empty and error states.
		*
		* @param props.t - the page's translate seat.
		* @param props.status - the current status answer.
		* @param props.selection - what the user picked.
		* @param props.current - the answer that belongs to that selection, if it arrived.
		* @returns the pane.
		*/
		function DiffPane(props) {
			const { t, status, selection, current } = props;
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
			if (status !== null && status.ok !== true) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-cg-empty",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: "dsh-cg-empty-title",
					children: t("diff.pane")
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: "dsh-cg-empty-text",
					children: t(status.reason === "no-repo" ? "diff.notRepo" : "diff.repoFailed")
				})]
			});
			if (selection === null) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-cg-empty",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: "dsh-cg-empty-title",
					children: t("diff.pane")
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: "dsh-cg-empty-text",
					children: t("diff.emptyHint")
				})]
			});
			const title = selection.kind === "file" ? selection.file.path : current?.commit?.subject ?? selection.commit.subject;
			const loading = current === null || current.loading;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
				className: "dsh-cg-main-head",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dsh-cg-main-title",
						title,
						children: title
					}),
					selection.kind === "file" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(KindTag, {
						t,
						kind: selection.file.kind
					}) : null,
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
		* The change-kind tag beside the diff title.
		*
		* @param props.t - the page's translate seat.
		* @param props.kind - the selected path's change kind.
		* @returns the tag element.
		*/
		function KindTag({ t, kind }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: "dsh-cg-main-subtitle",
				children: t(KIND_KEY[kind])
			});
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
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
				type: "button",
				className: "dsh-cg-icon",
				title: t(copied ? "diff.copied" : "diff.copy"),
				"aria-label": t(copied ? "diff.copied" : "diff.copy"),
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
			if (current === null || doc === void 0 || doc.files.length === 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-cg-empty",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: "dsh-cg-empty-title",
					children: t("diff.noTextTitle")
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: "dsh-cg-empty-text",
					children: t(kind === "untracked" ? "diff.noTextUntracked" : "diff.noTextOther")
				})]
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
		//#region src/client/index.ts
		/**
		* Client entry for dsh-cool-git.
		*
		* Contributes exactly one 'conversation.view' entry, which is what turns into
		* a tab in the session's tab bar. The page reads the session's repository over
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
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		exports.name = name;
		return module.exports;
	}
});
