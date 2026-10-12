window.__ModuleLoader__.load({
	id: "dsh-cool-git",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let react_jsx_runtime = require("react/jsx-runtime");
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
		* Ask the Host for the local branches a switch may pick.
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
		* This is the only call that changes the repository: the Host runs a real
		* checkout, so the working tree on disk is different afterwards and every
		* other answer on this page is stale.
		*
		* @param sessionId - the session whose directory Git runs in, when known.
		* @param branch - the local branch to switch to.
		* @returns the checkout payload.
		*/
		function checkoutBranch(sessionId, branch) {
			return postJson("/checkout", {
				sessionId,
				branch
			});
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
					current = {
						header: line,
						oldPath: "",
						newPath: "",
						meta: [],
						hunks: [],
						additions: 0,
						deletions: 0,
						binary: false
					};
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
		*    is mounted: Chat, 轨迹 and 终端 keep their composer untouched, and the rule
		*    disappears with the View.
		*
		* 2. The page itself: a fixed sidebar of two stacked panes (变更文件区 above
		*    提交历史) beside a scrollable Diff 查看区.
		*
		* Every color is a `--dsw-*` theme token, so the tab follows the active light
		* or dark appearance — including third-party theme presets — instead of forcing
		* a palette of its own. The diff's own greens and reds are the platform's
		* dedicated diff tokens, which is what makes the diff read the same as the
		* diffs the tool cards already draw.
		*/
		/** Class the Git View renders on its root; the stylesheet's only anchor. */
		const GIT_ROOT_CLASS = "dsh-cg-root";
		/** CSS rules, one selector per line. */
		const GIT_CSS = [
			`[data-conversation-scroll]:has(.${GIT_ROOT_CLASS})>[data-composer-seat]{display:none}`,
			`.${GIT_ROOT_CLASS}{display:flex;flex:1 1 auto;flex-direction:row;box-sizing:border-box;width:100%;height:100%;min-height:0;overflow:hidden;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-family:var(--dsw-font-family,sans-serif);font-size:12.5px;line-height:1.5}`,
			`.${GIT_ROOT_CLASS} *{box-sizing:border-box}`,
			".dsh-cg-side{flex:none;display:flex;flex-direction:column;width:340px;min-width:0;min-height:0;border-right:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1)}",
			".dsh-cg-pane{display:flex;flex-direction:column;flex:1 1 0;min-height:0}",
			".dsh-cg-pane+.dsh-cg-pane{border-top:1px solid var(--dsw-alias-border-l1)}",
			".dsh-cg-head{flex:none;display:flex;align-items:center;gap:8px;height:30px;padding:0 6px 0 12px;color:var(--dsw-alias-label-secondary);font-size:11px;font-weight:600;letter-spacing:.02em}",
			".dsh-cg-head-title{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
			".dsh-cg-count{flex:none;padding:0 5px;border-radius:999px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-tertiary);font-size:10px;font-weight:500;line-height:15px}",
			".dsh-cg-list{flex:1 1 auto;min-height:0;overflow:auto;padding:0 6px 8px}",
			".dsh-cg-icon{flex:none;display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;padding:0;border:0;border-radius:var(--dsw-radius-sm,6px);background:transparent;color:var(--dsw-alias-label-tertiary);font:inherit;cursor:pointer}",
			".dsh-cg-icon:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}",
			".dsh-cg-icon:disabled{opacity:.45;cursor:default}",
			".dsh-cg-icon:disabled:hover{background:transparent;color:var(--dsw-alias-label-tertiary)}",
			".dsh-cg-icon svg{width:13px;height:13px;display:block}",
			".dsh-cg-sync{width:auto;min-width:22px;gap:3px;padding:0 5px}",
			".dsh-cg-sync[data-pending=true]{color:var(--dsw-alias-label-secondary)}",
			".dsh-cg-sync-count{flex:none;font-family:var(--ds-font-family-code,ui-monospace,monospace);font-size:10.5px;font-variant-numeric:tabular-nums}",
			".dsh-cg-tip{display:inline-flex}",
			".dsh-cg-tip:has(.dsh-cg-icon:disabled){cursor:default}",
			".dsh-cg-tip .dsh-cg-icon:disabled{pointer-events:none}",
			"@keyframes dsh-cg-spin{to{transform:rotate(360deg)}}",
			".dsh-cg-icon[data-busy=true] svg,.dsh-cg-branch-icon[data-busy=true] svg{animation:dsh-cg-spin .9s linear infinite}",
			".dsh-cg-side-head{flex:none;display:flex;align-items:center;gap:6px;height:34px;padding:0 6px 0 10px;border-bottom:1px solid var(--dsw-alias-border-l1)}",
			".dsh-cg-workspace{flex:1 1 auto;display:flex;align-items:center;gap:4px;min-width:0;font-size:12px;font-weight:600;color:var(--dsw-alias-label-primary)}",
			".dsh-cg-workspace-icon{flex:none;display:inline-flex;align-items:center;width:13px;height:13px;color:var(--dsw-alias-label-tertiary)}",
			".dsh-cg-workspace-icon svg{width:13px;height:13px;display:block}",
			".dsh-cg-workspace-name{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
			".dsh-cg-tools{flex:none;display:flex;align-items:center;gap:4px;margin-left:auto}",
			".dsh-cg-divergence{flex:none;color:var(--dsw-alias-label-tertiary);font-family:var(--ds-font-family-code,ui-monospace,monospace);font-size:11px}",
			".dsh-cg-branch-menu{flex:none;display:inline-flex}",
			".dsh-cg-branch{display:inline-flex;align-items:center;gap:4px;max-width:130px;height:22px;padding:0 4px 0 6px;border:1px solid var(--dsw-alias-border-l1);border-radius:var(--dsw-radius-sm,6px);background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:11px;cursor:pointer}",
			".dsh-cg-branch:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}",
			".dsh-cg-branch:disabled{opacity:.45;cursor:default}",
			".dsh-cg-branch-icon{flex:none;display:inline-flex;align-items:center;width:12px;height:12px;color:var(--dsw-alias-label-tertiary)}",
			".dsh-cg-branch-icon svg{width:12px;height:12px;display:block}",
			".dsh-cg-branch-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:var(--ds-font-family-code,ui-monospace,monospace)}",
			".dsh-cg-chevron{flex:none;display:inline-flex;width:12px;height:12px;color:var(--dsw-alias-label-tertiary)}",
			".dsh-cg-chevron svg{width:12px;height:12px;display:block}",
			".dsh-cg-dialog-text{margin:0;font-size:13px;line-height:20px;color:var(--dsw-alias-label-primary);white-space:pre-wrap;word-break:break-word}",
			".dsh-cg-dialog-text+.dsh-cg-dialog-text{margin-top:8px}",
			".dsh-cg-row{display:flex;align-items:center;gap:6px;width:100%;height:26px;padding:0 6px;border:0;border-radius:var(--dsw-radius-sm,6px);background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer}",
			".dsh-cg-row:hover{background:var(--dsw-alias-interactive-bg-hover)}",
			".dsh-cg-row[aria-selected=true]{background:var(--dsw-alias-interactive-bg-active)}",
			".dsh-cg-badge{flex:none;width:13px;text-align:center;font-family:var(--ds-font-family-code,ui-monospace,monospace);font-size:11px;font-weight:700;color:var(--dsw-alias-label-tertiary)}",
			".dsh-cg-badge[data-kind=added]{color:var(--dsw-alias-state-success-primary)}",
			".dsh-cg-badge[data-kind=modified]{color:var(--dsw-alias-state-warn-primary)}",
			".dsh-cg-badge[data-kind=deleted]{color:var(--dsw-alias-state-error-primary)}",
			".dsh-cg-badge[data-kind=conflicted]{color:var(--dsw-alias-state-error-primary)}",
			".dsh-cg-badge[data-kind=renamed]{color:var(--dsw-alias-brand-primary)}",
			".dsh-cg-badge[data-kind=copied]{color:var(--dsw-alias-brand-primary)}",
			".dsh-cg-badge[data-kind=typechange]{color:var(--dsw-alias-state-warn-primary)}",
			".dsh-cg-badge[data-kind=untracked]{color:var(--dsw-alias-state-idle-primary)}",
			".dsh-cg-path{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:var(--ds-font-family-code,ui-monospace,monospace);font-size:11.5px}",
			".dsh-cg-dir{color:var(--dsw-alias-label-tertiary)}",
			".dsh-cg-stage{flex:none;width:5px;height:5px;border-radius:50%;background:var(--dsw-alias-brand-primary)}",
			".dsh-cg-stage[data-staged=false]{background:transparent}",
			".dsh-cg-commit{display:flex;flex-direction:column;gap:2px;width:100%;padding:5px 6px;border:0;border-radius:var(--dsw-radius-sm,6px);background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer}",
			".dsh-cg-commit:hover{background:var(--dsw-alias-interactive-bg-hover)}",
			".dsh-cg-commit[aria-selected=true]{background:var(--dsw-alias-interactive-bg-active)}",
			".dsh-cg-subject{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;color:var(--dsw-alias-label-primary)}",
			".dsh-cg-meta{display:flex;align-items:center;gap:6px;overflow:hidden;white-space:nowrap;font-size:10.5px;color:var(--dsw-alias-label-tertiary)}",
			".dsh-cg-hash{font-family:var(--ds-font-family-code,ui-monospace,monospace)}",
			".dsh-cg-refs{display:flex;gap:4px;overflow:hidden}",
			".dsh-cg-ref{flex:none;max-width:110px;overflow:hidden;text-overflow:ellipsis;padding:0 4px;border:1px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-xs,4px);color:var(--dsw-alias-brand-text,var(--dsw-alias-brand-primary));font-size:10px;line-height:14px}",
			".dsh-cg-note{padding:8px 12px;color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:1.7}",
			".dsh-cg-main{flex:1 1 auto;display:flex;flex-direction:column;min-width:0;min-height:0}",
			".dsh-cg-main-head{flex:none;display:flex;align-items:center;gap:8px;min-height:30px;padding:4px 8px 4px 12px;border-bottom:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-base)}",
			".dsh-cg-main-title{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:var(--ds-font-family-code,ui-monospace,monospace);font-size:11.5px;color:var(--dsw-alias-label-secondary)}",
			".dsh-cg-main-subtitle{flex:none;max-width:45%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-tertiary);font-size:11px}",
			".dsh-cg-stats{flex:none;display:flex;gap:6px;font-family:var(--ds-font-family-code,ui-monospace,monospace);font-size:11px}",
			".dsh-cg-added{color:var(--dsw-alias-state-success-primary)}",
			".dsh-cg-deleted{color:var(--dsw-alias-state-error-primary)}",
			".dsh-cg-diff{flex:1 1 auto;min-height:0;overflow:auto;background:var(--dsw-alias-bg-base)}",
			".dsh-cg-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;height:100%;padding:24px;text-align:center;color:var(--dsw-alias-label-tertiary);user-select:none}",
			".dsh-cg-empty-title{font-size:14px;font-weight:600;color:var(--dsw-alias-label-secondary)}",
			".dsh-cg-empty-text{font-size:12px;max-width:60ch;line-height:1.7}",
			".dsh-cg-file-head{display:flex;align-items:center;gap:8px;padding:6px 12px;border-top:1px solid var(--dsw-alias-border-l1);border-bottom:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);font-family:var(--ds-font-family-code,ui-monospace,monospace);font-size:11px}",
			".dsh-cg-file-path{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-secondary)}",
			".dsh-cg-hunk-head{position:sticky;top:0;z-index:1;padding:2px 12px;background:var(--dsw-alias-markdown-code-block-banner,var(--dsw-alias-bg-layer-2));border-top:1px solid var(--dsw-alias-border-l1);border-bottom:1px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-tertiary);font-family:var(--ds-font-family-code,ui-monospace,monospace);font-size:11px;white-space:pre;overflow:hidden;text-overflow:ellipsis}",
			".dsh-cg-line{display:grid;grid-template-columns:44px 44px 14px minmax(0,1fr);width:max-content;min-width:100%;font-family:var(--ds-font-family-code,ui-monospace,monospace);font-size:12px;line-height:18px}",
			".dsh-cg-line[data-kind=add]{background:var(--dsw-alias-file-diff-added-bg)}",
			".dsh-cg-line[data-kind=del]{background:var(--dsw-alias-file-diff-deleted-bg)}",
			".dsh-cg-line[data-kind=meta]{color:var(--dsw-alias-label-tertiary)}",
			".dsh-cg-no{padding-right:8px;text-align:right;color:var(--dsw-alias-label-tertiary);user-select:none}",
			".dsh-cg-line[data-kind=add] .dsh-cg-no{background:var(--dsw-alias-file-diff-added-gutter)}",
			".dsh-cg-line[data-kind=del] .dsh-cg-no{background:var(--dsw-alias-file-diff-deleted-gutter)}",
			".dsh-cg-sign{user-select:none;color:var(--dsw-alias-label-tertiary)}",
			".dsh-cg-line[data-kind=add] .dsh-cg-sign{color:var(--dsw-alias-file-diff-added-marker,var(--dsw-alias-state-success-primary))}",
			".dsh-cg-line[data-kind=del] .dsh-cg-sign{color:var(--dsw-alias-file-diff-deleted-marker,var(--dsw-alias-state-error-primary))}",
			".dsh-cg-text{white-space:pre;padding-right:16px}",
			".dsh-cg-line[data-kind=meta] .dsh-cg-text{grid-column:1 / -1;padding-left:12px}"
		].join("\n");
		/**
		* Insert the stylesheet once for the plugin lifetime.
		*
		* @returns disposer that removes exactly this element.
		*/
		function insertGitStyles() {
			const element = document.createElement("style");
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
		* The page is the whole of the tab: a fixed sidebar carrying 变更文件区 above
		* 提交历史, and a Diff 查看区 taking every remaining pixel. Changed paths come
		* from `git status`, the history from `git log`, and the diff pane shows either
		* one path's patch against HEAD or one commit's whole patch (see `api.ts` for
		* the routes and `diff.ts` for the patch parser).
		*
		* The page owns no repository state of its own: every answer is a plain value
		* fetched from the Host, and the only local state is which row is selected, which
		* answer is current, and which failure the dialog is stating. That keeps a manual
		* refresh honest — it re-reads `status` and `log`, and the diff pane re-reads
		* whatever it is showing.
		*
		* Every failure the page can meet is reported in one place: the error dialog. A
		* refused branch switch, a Pull or Push the remote turned down, a read the Host
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
		/** How many commits the history pane asks for. */
		const LOG_LIMIT = 60;
		/** Body lines the diff pane will draw before it stops and says how many are left. */
		const MAX_DIFF_ROWS = 6e3;
		/** How long the copy button reports success before returning to its idle label. */
		const COPY_FEEDBACK_MS = 1200;
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
		/** The tooltip each changed-path row carries. */
		const KIND_LABEL = {
			added: "新增",
			modified: "修改",
			deleted: "删除",
			renamed: "重命名",
			copied: "复制",
			typechange: "类型变更",
			untracked: "未跟踪",
			conflicted: "冲突",
			unknown: "未知状态"
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
		* @param key - the selection identity this answer belongs to.
		* @param result - the payload the route returned.
		* @returns the pane state to render.
		*/
		function buildDoc(key, result) {
			if (result?.ok !== true) return {
				key,
				loading: false,
				error: typeof result?.error === "string" && result.error !== "" ? result.error : "未知错误"
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
		* @param payload - the route's answer.
		* @param fallback - the reason to state when the answer carried none.
		* @returns the Host's or the transport's own words.
		*/
		function reasonOf(payload, fallback) {
			return typeof payload.error === "string" && payload.error !== "" ? payload.error : fallback;
		}
		/**
		* State one failed request as the error dialog's line for it.
		*
		* @param label - the request that did not answer, e.g. `读取分支列表`.
		* @param payload - the route's answer.
		* @param fallback - the reason to state when the answer carried none.
		* @returns one `label：reason` line.
		*/
		function failureLine(label, payload, fallback) {
			return `${label}：${reasonOf(payload, fallback)}`;
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
		* Render a short relative age for one ISO-8601 timestamp.
		*
		* @param iso - the timestamp Git printed.
		* @returns `刚刚`, a counted unit, or the calendar date once it is old enough.
		*/
		function relativeTime(iso) {
			const at = Date.parse(iso);
			if (!Number.isFinite(at)) return "";
			const delta = Date.now() - at;
			const minute = 6e4;
			const hour = 60 * minute;
			const day = 24 * hour;
			if (delta < minute) return "刚刚";
			if (delta < hour) return `${Math.floor(delta / minute)} 分钟前`;
			if (delta < day) return `${Math.floor(delta / hour)} 小时前`;
			if (delta < 30 * day) return `${Math.floor(delta / day)} 天前`;
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
		/** The refresh glyph. */
		const REFRESH_ICON = /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
			viewBox: "0 0 16 16",
			"aria-hidden": "true",
			children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
				d: "M13.2 8a5.2 5.2 0 1 1-1.5-3.7",
				fill: "none",
				stroke: "currentColor",
				strokeWidth: "1.4",
				strokeLinecap: "round"
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
				d: "M13.4 2.4v3.4H10",
				fill: "none",
				stroke: "currentColor",
				strokeWidth: "1.4",
				strokeLinecap: "round",
				strokeLinejoin: "round"
			})]
		});
		/** The copy glyph. */
		const COPY_ICON = /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
			viewBox: "0 0 16 16",
			"aria-hidden": "true",
			children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
				x: "5.6",
				y: "5.6",
				width: "7.4",
				height: "7.4",
				rx: "1.4",
				fill: "none",
				stroke: "currentColor",
				strokeWidth: "1.3"
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
				d: "M10 5.6V4.4A1.4 1.4 0 0 0 8.6 3H4.4A1.4 1.4 0 0 0 3 4.4v4.2A1.4 1.4 0 0 0 4.4 10h1.2",
				fill: "none",
				stroke: "currentColor",
				strokeWidth: "1.3",
				strokeLinecap: "round"
			})]
		});
		/** The confirmation glyph, shown while the copy button reports success. */
		const CHECK_ICON = /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
			viewBox: "0 0 16 16",
			"aria-hidden": "true",
			children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
				d: "M3.4 8.6l3 3 6.2-7",
				fill: "none",
				stroke: "currentColor",
				strokeWidth: "1.6",
				strokeLinecap: "round",
				strokeLinejoin: "round"
			})
		});
		/** The chevron that marks the branch label as a menu trigger. */
		const CHEVRON_ICON = /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
			viewBox: "0 0 16 16",
			"aria-hidden": "true",
			children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
				d: "M4.2 6.2L8 10l3.8-3.8",
				fill: "none",
				stroke: "currentColor",
				strokeWidth: "1.5",
				strokeLinecap: "round",
				strokeLinejoin: "round"
			})
		});
		/** The Workspace glyph: the project directory the session's repository lives in. */
		const WORKSPACE_ICON = /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
			viewBox: "0 0 16 16",
			"aria-hidden": "true",
			children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
				d: "M2 4.4A1.4 1.4 0 0 1 3.4 3h2.5a1 1 0 0 1 .8.4l.9 1.2h5A1.4 1.4 0 0 1 14 6v5.6A1.4 1.4 0 0 1 12.6 13H3.4A1.4 1.4 0 0 1 2 11.6z",
				fill: "none",
				stroke: "currentColor",
				strokeWidth: "1.2",
				strokeLinejoin: "round"
			})
		});
		/** The branch glyph: the trunk node and the commit a branch forks off it. */
		const BRANCH_ICON = /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
			viewBox: "0 0 16 16",
			"aria-hidden": "true",
			children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					d: "M4 2v8",
					fill: "none",
					stroke: "currentColor",
					strokeWidth: "1.3",
					strokeLinecap: "round"
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
					cx: "12",
					cy: "4",
					r: "2",
					fill: "none",
					stroke: "currentColor",
					strokeWidth: "1.3"
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
					cx: "4",
					cy: "12",
					r: "2",
					fill: "none",
					stroke: "currentColor",
					strokeWidth: "1.3"
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					d: "M12 6a6 6 0 0 1-6 6",
					fill: "none",
					stroke: "currentColor",
					strokeWidth: "1.3",
					strokeLinecap: "round"
				})
			]
		});
		/**
		* The Pull glyph: an arrow pointing at this working tree.
		*
		* Pull and push are one picture with the arrow reversed, which is what makes the
		* pair readable at 13px beside their counts. No floor line under either of them:
		* the number next to the arrow already says how many commits are crossing, and a
		* second horizontal mark only competes with it.
		*/
		const PULL_ICON = /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
			viewBox: "0 0 16 16",
			"aria-hidden": "true",
			children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
				d: "M8 2.9v9.6",
				fill: "none",
				stroke: "currentColor",
				strokeWidth: "1.5",
				strokeLinecap: "round"
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
				d: "M4.4 9L8 12.6 11.6 9",
				fill: "none",
				stroke: "currentColor",
				strokeWidth: "1.5",
				strokeLinecap: "round",
				strokeLinejoin: "round"
			})]
		});
		/** The Push glyph: the same arrow leaving this working tree. */
		const PUSH_ICON = /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
			viewBox: "0 0 16 16",
			"aria-hidden": "true",
			children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
				d: "M8 13.1V3.5",
				fill: "none",
				stroke: "currentColor",
				strokeWidth: "1.5",
				strokeLinecap: "round"
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
				d: "M4.4 7L8 3.4 11.6 7",
				fill: "none",
				stroke: "currentColor",
				strokeWidth: "1.5",
				strokeLinecap: "round",
				strokeLinejoin: "round"
			})]
		});
		/**
		* The busy glyph: an open ring, turned by the stylesheet.
		*
		* A control that can wait on the network for minutes cannot look the same as an
		* idle one, and a disabled button alone does not say which control is working.
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
		* @param props - the standard conversation-View props; the session id is used.
		* @returns the Git page element.
		*/
		function GitView(props) {
			const page = (0, react.useRef)(null);
			const sessionId = typeof props?.sessionId === "string" ? props.sessionId : void 0;
			const [status, setStatus] = (0, react.useState)(null);
			const [log, setLog] = (0, react.useState)(null);
			const [loaded, setLoaded] = (0, react.useState)(false);
			const [refreshing, setRefreshing] = (0, react.useState)(false);
			const [selection, setSelection] = (0, react.useState)(null);
			const [doc, setDoc] = (0, react.useState)(null);
			/** The failure the dialog is stating, or null while none is open. */
			const [error, setError] = (0, react.useState)(null);
			(0, react.useLayoutEffect)(() => suppressComposerSeat(page.current), []);
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
					if (nextStatus?.ok !== true && !isNoRepo(nextStatus)) lines.push(failureLine("读取仓库状态", nextStatus, "读取仓库状态失败"));
					if (nextLog?.ok !== true && !isNoRepo(nextLog)) lines.push(failureLine("读取提交历史", nextLog, "读取提交历史失败"));
					if (lines.length > 0) reportError({
						title: "刷新仓库失败",
						lines
					});
				} finally {
					setRefreshing(false);
					setLoaded(true);
				}
			}, [sessionId, reportError]);
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
					error: "该文件已不在变更列表中"
				}) : fetchDiff(sessionId, activeFile)).then((result) => {
					if (cancelled) return;
					setDoc(buildDoc(key, result));
					if (result?.ok !== true && !isNoRepo(result)) {
						const label = selection.kind === "commit" ? "读取提交" : "读取文件差异";
						reportError({
							title: "读取 Diff 失败",
							lines: [failureLine(label, result, "读取 Diff 失败")]
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
				reportError
			]);
			const current = doc !== null && doc.key === selectionKey(selection) ? doc : null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				ref: page,
				className: GIT_ROOT_CLASS,
				"data-dsh-cool-git": "view",
				"data-conversation-composer-overlay": "",
				style: PAGE,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("aside", {
						className: "dsh-cg-side",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SideHead, {
								status,
								sessionId,
								refreshing,
								onRefresh: () => void refresh(),
								onSwitched: handleSwitched,
								onSynced: handleSynced,
								onError: reportError
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
								className: "dsh-cg-pane",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
									className: "dsh-cg-head",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "dsh-cg-head-title",
										children: "变更文件区"
									}), files.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "dsh-cg-count",
										children: files.length
									}) : null]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: "dsh-cg-list",
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ChangeList, {
										status,
										loaded,
										files,
										selection,
										onSelect: (file) => setSelection({
											kind: "file",
											file
										})
									})
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
								className: "dsh-cg-pane",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
									className: "dsh-cg-head",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "dsh-cg-head-title",
										children: "提交历史"
									}), commits.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "dsh-cg-count",
										children: commits.length
									}) : null]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: "dsh-cg-list",
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CommitList, {
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
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("main", {
						className: "dsh-cg-main",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DiffPane, {
							status,
							selection,
							current
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ErrorDialog, {
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
		* returning focus to the control that opened it.
		*
		* @param props.error - the failure to state, or null while none is open.
		* @param props.onClose - called by the close button, Escape, or the mask.
		* @returns the dialog element.
		*/
		function ErrorDialog(props) {
			const { error, onClose } = props;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
				open: error !== null,
				onClose,
				title: error?.title ?? "",
				closeLabel: "关闭",
				footer: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					variant: "primary",
					onClick: onClose,
					children: "知道了"
				}),
				children: error === null ? null : error.lines.map((line, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: "dsh-cg-dialog-text",
					children: line
				}, index))
			});
		}
		/**
		* The repository's toolbar, in the order the work happens: the Workspace this
		* session is in, the branch it is on, how far that branch has drifted from its
		* upstream, and then the four operations the page can perform — Pull, Push and
		* a re-read, plus the branch menu itself as the one control that moves HEAD.
		*
		* The branch switch is stated as a decision rather than an accident: the menu is
		* the list Git reports, the current branch carries the check, and the choice is
		* applied by the Host through a real checkout. Every control is disabled while
		* any other operation is in flight, so a second click cannot queue a second
		* checkout, pull or push behind the first.
		*
		* The menu is the platform's own dropdown, which owns the parts that are easy to
		* get wrong — anchoring, the focus walk, Escape, outside-click dismissal, and
		* rendering into a portal so a list longer than the sidebar is not clipped by
		* it.
		*
		* The divergence is the row's only read-only text, and it is placed between the
		* branch and the two arrows that resolve it: `↓` behind is what Pull brings,
		* `↑` ahead is what Push sends.
		*
		* @param props.status - the current status answer, for the branch already on.
		* @param props.sessionId - the session whose repository is being switched.
		* @param props.refreshing - a re-read of the repository is in flight.
		* @param props.onRefresh - called to re-read the repository state and history.
		* @param props.onSwitched - called after a checkout or a pull, which both rewrite
		*   the working tree, so the page drops the diff it was showing.
		* @param props.onSynced - called after a push, which moves nothing on disk.
		* @param props.onError - called with the failure to state in the error dialog.
		* @returns the header row.
		*/
		function SideHead(props) {
			const { status, sessionId, refreshing, onRefresh, onSwitched, onSynced, onError } = props;
			const [open, setOpen] = (0, react.useState)(false);
			const [branches, setBranches] = (0, react.useState)(null);
			const [current, setCurrent] = (0, react.useState)(null);
			const [truncated, setTruncated] = (0, react.useState)(false);
			const [loading, setLoading] = (0, react.useState)(false);
			/** A failed branch read, kept apart from an empty list: "none" is a fact, this is not. */
			const [readError, setReadError] = (0, react.useState)(false);
			const [switching, setSwitching] = (0, react.useState)(null);
			/** The remote operation in flight, if any. */
			const [syncing, setSyncing] = (0, react.useState)(null);
			(0, react.useEffect)(() => {
				if (!open) return;
				let cancelled = false;
				setLoading(true);
				setReadError(false);
				fetchBranches(sessionId).then((result) => {
					if (cancelled) return;
					setLoading(false);
					if (result?.ok !== true) {
						setBranches([]);
						setReadError(true);
						if (!isNoRepo(result)) onError({
							title: "读取分支列表失败",
							lines: [reasonOf(result, "读取分支列表失败")]
						});
						return;
					}
					setBranches(Array.isArray(result.branches) ? result.branches : []);
					setCurrent(typeof result.current === "string" ? result.current : null);
					setTruncated(result.truncated === true);
				});
				return () => {
					cancelled = true;
				};
			}, [
				open,
				sessionId,
				onError
			]);
			const choose = (0, react.useCallback)((branch) => {
				setOpen(false);
				if (branch === current) return;
				setSwitching(branch);
				checkoutBranch(sessionId, branch).then((result) => {
					setSwitching(null);
					if (result?.ok !== true) {
						onError({
							title: `切换到 ${branch} 失败`,
							lines: [reasonOf(result, `切换到 ${branch} 失败`)]
						});
						return;
					}
					onSwitched();
				});
			}, [
				current,
				sessionId,
				onSwitched,
				onError
			]);
			/**
			* Run one remote operation and report its answer.
			*
			* A pull and a push differ in exactly two places: which route answers, and
			* what the page must re-read afterwards. Everything else — the in-flight state
			* that blocks a second click, the failure dialog, the refresh — is the same
			* decision, so it is taken once here.
			*/
			const sync = (0, react.useCallback)((action) => {
				const call = action === "pull" ? pullBranch : pushBranch;
				const label = action === "pull" ? "Pull" : "Push";
				setSyncing(action);
				call(sessionId).then((result) => {
					setSyncing(null);
					if (result?.ok !== true) {
						onError({
							title: `${label} 失败`,
							lines: [reasonOf(result, `${label} 失败`)]
						});
						onSynced();
						return;
					}
					if (action === "pull") onSwitched();
					else onSynced();
				});
			}, [
				sessionId,
				onSwitched,
				onSynced,
				onError
			]);
			const items = [];
			if (loading) items.push({
				type: "label",
				id: "loading",
				text: "正在读取分支…"
			});
			else if (readError) items.push({
				type: "label",
				id: "failed",
				text: "读取分支失败"
			});
			else if (branches === null || branches.length === 0) items.push({
				type: "label",
				id: "empty",
				text: "没有本地分支"
			});
			else {
				for (const name of branches) items.push({
					id: name,
					label: name
				});
				if (truncated) {
					items.push({
						type: "separator",
						id: "cut"
					});
					items.push({
						type: "label",
						id: "cut-label",
						text: `仅显示最近的 ${branches.length} 个分支`
					});
				}
			}
			const detached = status?.detached === true;
			const label = detached ? `HEAD ${status?.head?.short ?? ""}`.trim() : status?.branch === void 0 || status.branch === "" ? "当前分支" : status.branch;
			const workspaceName = status?.workspace?.title ?? workspaceFallback(status);
			const onBranch = status?.ok === true;
			const reachable = onBranch && !detached;
			const hasUpstream = reachable && status?.upstream !== void 0;
			const behind = hasUpstream ? status?.behind ?? 0 : null;
			const ahead = hasUpstream ? status?.ahead ?? 0 : null;
			const busy = switching !== null || syncing !== null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-cg-side-head",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
					className: "dsh-cg-workspace",
					title: status?.workspace?.path ?? status?.root ?? "",
					children: [workspaceName === "" ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dsh-cg-workspace-icon",
						"aria-hidden": "true",
						children: WORKSPACE_ICON
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dsh-cg-workspace-name",
						children: workspaceName
					})]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "dsh-cg-tools",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Menu, {
							className: "dsh-cg-branch-menu",
							open,
							anchor: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								className: "dsh-cg-branch",
								disabled: !onBranch || busy,
								title: switching === null ? status?.upstream === void 0 ? "切换分支" : `上游：${status.upstream}` : `正在切换到 ${switching}…`,
								"aria-haspopup": "menu",
								"aria-expanded": open,
								onClick: () => setOpen((value) => !value),
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "dsh-cg-branch-icon",
										"data-busy": switching !== null,
										"aria-hidden": "true",
										children: switching === null ? BRANCH_ICON : SPINNER_ICON
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "dsh-cg-branch-name",
										children: label
									}),
									detached ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "dsh-cg-divergence",
										children: "游离"
									}) : null,
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "dsh-cg-chevron",
										"aria-hidden": "true",
										children: CHEVRON_ICON
									})
								]
							}),
							items,
							selectedId: current ?? void 0,
							align: "end",
							portal: true,
							onSelect: choose,
							onClose: () => setOpen(false)
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
							label: "Pull",
							side: "bottom",
							portal: true,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dsh-cg-tip",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
									type: "button",
									className: "dsh-cg-icon dsh-cg-sync",
									"aria-label": "Pull",
									"data-busy": syncing === "pull",
									"data-pending": behind !== null && behind > 0,
									disabled: !reachable || busy || refreshing,
									onClick: () => sync("pull"),
									children: [syncing === "pull" ? SPINNER_ICON : PULL_ICON, behind === null ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "dsh-cg-sync-count",
										children: behind
									})]
								})
							})
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
							label: "Push",
							side: "bottom",
							portal: true,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dsh-cg-tip",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
									type: "button",
									className: "dsh-cg-icon dsh-cg-sync",
									"aria-label": "Push",
									"data-busy": syncing === "push",
									"data-pending": ahead !== null && ahead > 0,
									disabled: !reachable || busy || refreshing,
									onClick: () => sync("push"),
									children: [syncing === "push" ? SPINNER_ICON : PUSH_ICON, ahead === null ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "dsh-cg-sync-count",
										children: ahead
									})]
								})
							})
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
							label: "刷新",
							side: "bottom",
							portal: true,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dsh-cg-tip",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: "dsh-cg-icon",
									"aria-label": "刷新",
									"data-busy": refreshing,
									disabled: refreshing || busy,
									onClick: onRefresh,
									children: refreshing ? SPINNER_ICON : REFRESH_ICON
								})
							})
						})
					]
				})]
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
		* The changed-path list, or the reason it is empty.
		* @param props.status - the current status answer.
		* @param props.loaded - at least one answer has arrived.
		* @param props.files - the rows to render.
		* @param props.selection - the current selection, for the selected row's state.
		* @param props.onSelect - called with the row the user picked.
		* @returns the list body.
		*/
		function ChangeList(props) {
			const { status, loaded, files, selection, onSelect } = props;
			if (status !== null && status.ok !== true) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Note, { text: status.reason === "no-repo" ? "当前会话目录不是 Git 仓库" : "读取仓库状态失败" });
			if (!loaded && status === null) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Note, { text: "正在读取仓库…" });
			if (files.length === 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Note, { text: "工作区没有未提交的改动" });
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, { children: files.map((file) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
				type: "button",
				className: "dsh-cg-row",
				"aria-selected": selection?.kind === "file" && selection.file.path === file.path,
				title: `${KIND_LABEL[file.kind]}${file.origPath === void 0 ? "" : ` ← ${file.origPath}`}`,
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
						title: file.staged ? "已暂存" : "未暂存"
					})
				]
			}, file.path)) });
		}
		/**
		* The commit list, or the reason it is empty.
		*
		* @param props.log - the current log answer.
		* @param props.loaded - at least one answer has arrived.
		* @param props.commits - the rows to render.
		* @param props.selection - the current selection, for the selected row's state.
		* @param props.onSelect - called with the row the user picked.
		* @returns the list body.
		*/
		function CommitList(props) {
			const { log, loaded, commits, selection, onSelect } = props;
			if (log !== null && log.ok !== true) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Note, { text: "读取提交历史失败" });
			if (!loaded && log === null) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Note, { text: "正在读取提交历史…" });
			if (commits.length === 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Note, { text: "还没有任何提交" });
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, { children: commits.map((commit) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
				type: "button",
				className: "dsh-cg-commit",
				"aria-selected": selection?.kind === "commit" && selection.commit.hash === commit.hash,
				onClick: () => onSelect(commit),
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dsh-cg-subject",
						children: commit.subject === "" ? "（无提交信息）" : commit.subject
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
								children: relativeTime(commit.date)
							}),
							commit.parents.length > 1 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "合并" }) : null
						]
					}),
					commit.refs.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dsh-cg-refs",
						children: commit.refs.slice(0, 3).map((ref) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dsh-cg-ref",
							children: refLabel(ref)
						}, ref))
					}) : null
				]
			}, commit.hash)) });
		}
		/**
		* A changed path, split so its directory reads dimmer than its name.
		*
		* @param props.path - the repository-relative path.
		* @returns the path element.
		*/
		function PathLabel({ path }) {
			const { dir, name } = splitPath(path);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
				className: "dsh-cg-path",
				children: [dir === "" ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: "dsh-cg-dir",
					children: dir
				}), name]
			});
		}
		/**
		* The diff pane: its header, its body, and its empty and error states.
		*
		* @param props.status - the current status answer.
		* @param props.selection - what the user picked.
		* @param props.current - the answer that belongs to that selection, if it arrived.
		* @returns the pane.
		*/
		function DiffPane(props) {
			const { status, selection, current } = props;
			if (status !== null && status.ok !== true) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-cg-empty",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: "dsh-cg-empty-title",
					children: "Diff 查看区"
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: "dsh-cg-empty-text",
					children: status.reason === "no-repo" ? "当前会话目录不是 Git 仓库" : "无法读取仓库"
				})]
			});
			if (selection === null) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-cg-empty",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: "dsh-cg-empty-title",
					children: "Diff 查看区"
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: "dsh-cg-empty-text",
					children: "点击左侧文件或提交，在此查看 Diff"
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
					selection.kind === "file" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(KindTag, { kind: selection.file.kind }) : null,
					current?.commit === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: "dsh-cg-main-subtitle",
						children: [
							current.commit.short,
							" · ",
							current.commit.author,
							" · ",
							relativeTime(current.commit.date)
						]
					}),
					current?.doc === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DiffStats, {
						additions: current.doc.additions,
						deletions: current.doc.deletions
					}),
					current?.doc === void 0 || current.doc.files.length === 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CopyButton, { text: buildCopyText(current) })
				]
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "dsh-cg-diff",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DiffBody, {
					loading,
					current,
					kind: selection.kind === "file" ? selection.file.kind : void 0
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
		/** The change-kind tag beside the diff title. */
		function KindTag({ kind }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: "dsh-cg-main-subtitle",
				children: KIND_LABEL[kind]
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
		* @param props.text - the text to copy.
		* @returns the button element.
		*/
		function CopyButton({ text }) {
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
				title: copied ? "已复制" : "复制 Diff",
				"aria-label": copied ? "已复制" : "复制 Diff",
				onClick: copy,
				children: copied ? CHECK_ICON : COPY_ICON
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
		* @param props.loading - the answer for this selection has not arrived yet.
		* @param props.current - the answer, when it has.
		* @param props.kind - the selected path's change kind, for a friendlier empty line.
		* @returns the body element.
		*/
		function DiffBody(props) {
			const { loading, current, kind } = props;
			if (loading) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Note, { text: "正在读取 Diff…" });
			if (current?.error !== void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Note, { text: "无法读取 Diff" });
			const doc = current?.doc;
			if (doc === void 0 || doc.files.length === 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-cg-empty",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: "dsh-cg-empty-title",
					children: "没有可显示的文本差异"
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: "dsh-cg-empty-text",
					children: kind === "untracked" ? "这是一个未跟踪的新文件，内容与空文件相同" : "该文件当前的改动没有文本差异（可能是二进制文件或仅权限变更）"
				})]
			});
			const rows = flatten(doc);
			const shown = rows.length > MAX_DIFF_ROWS ? rows.slice(0, MAX_DIFF_ROWS) : rows;
			const hidden = rows.length - shown.length;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
				current?.merge === true ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "dsh-cg-note",
					children: "合并提交：以下差异是与第一个父提交的比较结果。"
				}) : null,
				shown.map((row, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DiffRow, { row }, index)),
				hidden > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "dsh-cg-note",
					children: [
						"还有 ",
						hidden,
						" 行未渲染（差异过大）。"
					]
				}) : null,
				current?.truncated === true ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "dsh-cg-note",
					children: "Diff 超出读取上限，内容已被截断。"
				}) : null
			] });
		}
		/**
		* One flattened diff row.
		*
		* @param props.row - the row to draw.
		* @returns the row element.
		*/
		function DiffRow({ row }) {
			if (row.type === "file") {
				const { dir, name } = splitPath(displayPath(row.file));
				return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "dsh-cg-file-head",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: "dsh-cg-file-path",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dsh-cg-dir",
							children: dir
						}), name]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DiffStats, {
						additions: row.file.additions,
						deletions: row.file.deletions
					})]
				});
			}
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
		*/
		const name = "dsh-cool-git/client";
		const inject = ["slots"];
		function apply(ctx) {
			const slots = ctx.get("slots");
			if (slots === void 0) return;
			ctx.effect(() => insertGitStyles(), "dsh-cool-git: styles");
			slots.inject("conversation.view", () => slots.register({
				name: "conversation.view",
				id: "git",
				order: 12,
				label: "Git"
			}, GitView));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		exports.name = name;
		return module.exports;
	}
});
