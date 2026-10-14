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
		* This is the only call that changes the repository: the Host runs a real
		* checkout, so the working tree on disk is different afterwards and every
		* other answer on this page is stale.
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
				"branch": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"1em\" height=\"1em\" viewBox=\"0 0 24 24\">\n	<path d=\"M0 0h24v24H0z\" fill=\"none\" />\n	<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\">\n		<path d=\"M15 6a9 9 0 0 0-9 9V3\" />\n		<circle cx=\"18\" cy=\"6\" r=\"3\" />\n		<circle cx=\"6\" cy=\"18\" r=\"3\" />\n	</g>\n</svg>\n",
				"folder": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"1em\" height=\"1em\" viewBox=\"0 0 24 24\">\n	<path d=\"M0 0h24v24H0z\" fill=\"none\" />\n	<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z\" />\n</svg>\n",
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
		/** Re-read the repository (assets/refresh.svg). */
		const IconRefresh = svgIcon("refresh");
		//#endregion
		//#region src/client/layout.tsx
		/**
		* The Git page's two resizable boundaries, and the sizes they remember.
		*
		* The page is a fixed sidebar beside an absorbing Diff pane, and both of its
		* boundaries are the reader's to move: the sidebar's right edge sets its width,
		* and the divider between 变更文件区 and 提交历史 sets how the column is split.
		* Each boundary is therefore one number — a width in CSS pixels, and the share of
		* the pane track that the changed-path list takes — and neither number is
		* repository state: they are a preference for a window, kept in localStorage under
		* this plugin's own key, the way the 终端 tab keeps its own.
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
		* The tallest the 变更文件区 may be drawn, inside the track it shares with 提交历史.
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
		* Clamp a preferred 变更文件区 height to the track it shares with 提交历史.
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
		* @param height - the 变更文件区 height, in CSS pixels.
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
		*    is mounted: Chat, 轨迹 and 终端 keep their composer untouched, and the rule
		*    disappears with the View.
		*
		* 2. The page itself: a sidebar of two stacked panes (变更文件区 above
		*    提交历史) beside a scrollable Diff 查看区. Both of the sidebar's boundaries —
		*    its right edge and the divider between the panes — are dragged, and the
		*    bounds they move within are imported from `layout.ts` rather than restated,
		*    so the width a drag may reach and the width a rule allows cannot drift apart.
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
			`.dsh-cg-side{position:relative;flex:none;display:flex;flex-direction:column;width:var(--dsh-cg-side-width,340px);min-width:260px;max-width:min(560px,calc(100% - 320px));min-height:0;border-right:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1)}`,
			`.dsh-cg-pane{display:flex;flex-direction:column;flex:1 1 0;min-height:96px}`,
			".dsh-cg-files{position:relative;flex-grow:var(--dsh-cg-files-grow,1)}",
			".dsh-cg-history{flex-grow:var(--dsh-cg-history-grow,1)}",
			".dsh-cg-pane+.dsh-cg-pane{border-top:1px solid var(--dsw-alias-border-l1)}",
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
			".dsh-cg-list,.dsh-cg-branch-list{--dsh-scrollbar-thumb:transparent;--dsh-scrollbar-thumb-hover:var(--dsw-alias-scrollbar-hover-l2)}",
			".dsh-cg-list:hover,.dsh-cg-branch-list:hover{--dsh-scrollbar-thumb:var(--dsw-alias-scrollbar-bg-l2)}",
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
			".dsh-cg-icon[data-busy=true] svg,.dsh-cg-branch-icon[data-busy=true] svg,.dsh-cg-sync-arrow[data-busy=true] svg{animation:dsh-cg-spin .9s linear infinite}",
			".dsh-cg-side-head{flex:none;display:flex;align-items:center;height:34px;padding:0 6px 0 10px}",
			".dsh-cg-workspace{flex:1 1 auto;display:flex;align-items:center;gap:4px;min-width:0;font-size:12px;font-weight:600;color:var(--dsw-alias-label-primary)}",
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
			".dsh-cg-branch-name{flex:0 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:var(--ds-font-family-code,ui-monospace,monospace)}",
			".dsh-cg-branch-tip{flex:0 1000 auto;min-width:24px}",
			".dsh-cg-branch-tip:has(.dsh-cg-divergence){min-width:54px}",
			".dsh-cg-branch-body{display:flex;flex-direction:column;min-width:0}",
			".dsh-cg-branch-filter,.dsh-cg-branch-list,.dsh-cg-branch-row{box-sizing:border-box}",
			".dsh-cg-branch-filter{flex:none;width:100%}",
			".dsh-cg-branch-dialog{width:min(450px,100%)}",
			".dsh-cg-branch-list-wrap{position:relative;display:flex;flex-direction:column;min-height:0;margin-top:8px}",
			".dsh-cg-branch-list{flex:1;min-height:0;display:flex;flex-direction:column;gap:1px;max-height:min(360px,40vh);overflow:auto}",
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
			".dsh-cg-dialog-hint{margin:0;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:1.7}",
			".dsh-cg-branch-list-wrap+.dsh-cg-dialog-hint{margin-top:8px}",
			".dsh-cg-dialog-body{display:flex;flex-direction:column;gap:8px}",
			".dsh-cg-dialog-text{margin:0;font-size:13px;line-height:20px;color:var(--dsw-alias-state-error-primary);white-space:pre-wrap;word-break:break-word}",
			".dsh-cg-commit-bar{flex:none;display:flex;flex-direction:column;gap:6px;padding:0px 10px 8px;border-bottom:1px solid var(--dsw-alias-border-l1)}",
			".dsh-cg-commit-frame{display:block;box-sizing:border-box;width:100%;border:0.5px solid var(--dsw-alias-border-l4);border-radius:var(--dsw-radius-sm);background:var(--dsw-alias-bg-layer-1)}",
			".dsh-cg-commit-frame:focus-within{border-color:var(--dsw-alias-state-business-primary)}",
			".dsh-cg-commit-frame:has(.dsh-cg-commit-input:disabled){opacity:.6}",
			".dsh-cg-commit-input{display:block;box-sizing:border-box;width:100%;min-height:26px;max-height:86px;padding:3px 8px;border:0;outline:none;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;line-height:20px;resize:none;overflow-y:auto}",
			".dsh-cg-commit-input::placeholder{color:var(--dsw-alias-label-dimmed)}",
			".dsh-cg-commit-input:disabled{cursor:not-allowed}",
			".dsh-cg-commit-send{width:100%}",
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
		* The page is the whole of the tab: a sidebar carrying 变更文件区 above 提交历史,
		* and a Diff 查看区 taking every remaining pixel. Changed paths come from
		* `git status`, the history from `git log`, and the diff pane shows either one
		* path's patch against HEAD or one commit's whole patch (see `api.ts` for the
		* routes and `diff.ts` for the patch parser). The sidebar's second row is the
		* commit form — a message field and the button that stages every change
		* 变更文件区 lists and records them as one commit — and 变更文件区 and 提交历史
		* stack under it. Both of the sidebar's boundaries — its right edge and the
		* divider between the two lists — are the reader's to drag, and both sizes are
		* remembered between visits (see `layout.ts`).
		*
		* The page owns no repository state of its own: every answer is a plain value
		* fetched from the Host, and the only local state is which row is selected, which
		* answer is current, which failure the dialog is stating, which operation is in
		* flight — a checkout, one half of a remote round trip, or the commit 变更文件区
		* asks for — each of which is what disables the other controls, and where the two
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
		/**
		* One pane header's text: its label, and how many rows it is showing.
		*
		* The count is part of the line rather than a badge of its own, so the header
		* reads as one sentence and stays one line however narrow the sidebar gets —
		* the whole thing truncates as a unit instead of the count leaving first.
		*
		* @param label - the pane's name, e.g. `提交历史`.
		* @param count - the rows the pane drew; nothing is added while there are none.
		* @returns the header's text.
		*/
		function headText(label, count) {
			return count > 0 ? `${label} · ${count}` : label;
		}
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
		/**
		* The busy glyph: an open ring, turned by the stylesheet.
		*
		* A control that can wait on the network for minutes cannot look the same as an
		* idle one, and a disabled button alone does not say which control is working.
		* It stands in for whichever glyph the wait belongs to, so it has to carry the
		* same weight as the artwork it replaces rather than a stroke of its own.
		*
		* The Workspace, branch, pull, push, publish and refresh marks are assets now —
		* see `icons.tsx` — because those are the glyphs the page shows at rest. This
		* ring, the copy pair and the spinner's own turning are local because they are
		* states rather than subjects.
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
			/** The sidebar itself, and the 变更文件区 pane at the top of it. */
			const side = (0, react.useRef)(null);
			const filesPane = (0, react.useRef)(null);
			const sessionId = typeof props?.sessionId === "string" ? props.sessionId : void 0;
			const [status, setStatus] = (0, react.useState)(null);
			const [log, setLog] = (0, react.useState)(null);
			const [loaded, setLoaded] = (0, react.useState)(false);
			const [refreshing, setRefreshing] = (0, react.useState)(false);
			/** The branch a checkout is in flight for, or null at rest. */
			const [switching, setSwitching] = (0, react.useState)(null);
			/** The half of the remote round trip in flight, or null at rest. */
			const [syncing, setSyncing] = (0, react.useState)(null);
			/** Whether 变更文件区's commit is in flight. */
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
						reportError({
							title: `切换到 ${branch} 失败`,
							lines: [reasonOf(result, `切换到 ${branch} 失败`)]
						});
						return;
					}
					handleSwitched();
				});
			}, [
				sessionId,
				handleSwitched,
				reportError
			]);
			/**
			* Send this branch to its upstream, and report the answer.
			*
			* Publish and the second half of Sync run this one call, because the Host
			* decides which of the two it is from the repository itself: a branch with no
			* upstream is pushed to the single configured remote and recorded as its
			* upstream. The only difference the page makes is what it calls a failure.
			*
			* @param title - the failure's heading, naming which of the two was asked.
			*/
			const pushRemote = (0, react.useCallback)((title) => {
				setSyncing("push");
				pushBranch(sessionId).then((result) => {
					setSyncing(null);
					if (result?.ok !== true) reportError({
						title,
						lines: [reasonOf(result, title)]
					});
					handleSynced();
				});
			}, [
				sessionId,
				handleSynced,
				reportError
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
							title: "拉取失败",
							lines: [reasonOf(result, "拉取失败")]
						});
						handleSynced();
						return;
					}
					handleSwitched();
					pushRemote("推送失败");
				});
			}, [
				sessionId,
				handleSwitched,
				handleSynced,
				reportError,
				pushRemote
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
				pushRemote("发布分支失败");
			}, [pushRemote]);
			/**
			* Commit every change 变更文件区 is listing, under the message the form holds.
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
						reportError({
							title: "提交失败",
							lines: [reasonOf(result, "提交失败")]
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
				reportError
			]);
			const busy = switching !== null || syncing !== null || committing;
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
				"data-resizing": resizing ?? void 0,
				style: PAGE,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("aside", {
						ref: side,
						className: "dsh-cg-side",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SideHead, {
								status,
								sessionId,
								refreshing,
								switching,
								busy,
								onRefresh: () => void refresh(),
								onCheckout: handleCheckout,
								onError: reportError
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(CommitBar, {
								disabled: status?.ok !== true || files.length === 0 || busy || refreshing,
								committing,
								onCommit: handleCommit
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
								ref: filesPane,
								className: "dsh-cg-pane dsh-cg-files",
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("header", {
										className: "dsh-cg-head",
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "dsh-cg-head-title",
											children: headText("文件变更", files.length)
										})
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
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
										children: headText("提交历史", commits.length)
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: "dsh-cg-tools",
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RemoteControl, {
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
		* returning focus to the control that opened it. This is the same composition
		* DSH's own destructive confirm uses (`client-ui-workspace`'s 删除工作区), down to
		* reporting the failure inside the card as one `role="alert"` block painted with
		* the error token.
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
		* The sidebar's first row: the Workspace this session is in, the branch it is on,
		* and the one operation the row itself keeps — 刷新. It draws no rule of its own:
		* the toolbar and the commit form under it are one block, closed together by that
		* form's own hairline.
		*
		* The branch switch is stated as a decision rather than an accident: the dialog
		* lists what Git reported, tags the branch already on, and applies nothing until
		* the choice is confirmed with a button of its own — the Host then runs a real
		* checkout, and a refusal is the error dialog's. The checkout itself is the
		* page's (`GitView`), which owns every operation in flight and disables the rest
		* of the page's controls while one runs, so this row closes the dialog and hands
		* the branch over rather than running anything itself.
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
		* @param props.status - the current status answer, for the branch already on.
		* @param props.sessionId - the session whose repository is being switched.
		* @param props.refreshing - a re-read of the repository is in flight.
		* @param props.switching - the branch a checkout is in flight for, if any.
		* @param props.busy - whether any repository operation is in flight.
		* @param props.onRefresh - called to re-read the repository state and history.
		* @param props.onCheckout - called with the branch the dialog confirmed.
		* @param props.onError - called with the failure to state in the error dialog.
		* @returns the header row.
		*/
		function SideHead(props) {
			const { status, sessionId, refreshing, switching, busy, onRefresh, onCheckout, onError } = props;
			/** Whether the branch dialog is showing. */
			const [open, setOpen] = (0, react.useState)(false);
			const onBranch = status?.ok === true;
			const detached = status?.detached === true;
			/** Close the branch dialog without switching. */
			const closeDialog = (0, react.useCallback)(() => {
				setOpen(false);
			}, []);
			/**
			* Hand the branch the dialog confirmed to the page, which runs the checkout.
			*
			* The dialog closes first: a checkout replaces the working tree, and a picker
			* left on screen while that runs would be offering a list that is already
			* stale.
			*
			* @param branch - the branch the user picked and confirmed.
			*/
			const choose = (0, react.useCallback)((branch) => {
				setOpen(false);
				onCheckout(branch);
			}, [onCheckout]);
			const label = detached ? `HEAD ${status?.head?.short ?? ""}`.trim() : status?.branch === void 0 || status.branch === "" ? "当前分支" : status.branch;
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
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dsh-cg-tip dsh-cg-branch-tip",
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								className: "dsh-cg-branch",
								disabled: !onBranch || busy,
								"aria-haspopup": "dialog",
								"aria-expanded": open,
								onClick: () => setOpen((value) => !value),
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
										children: "游离"
									}) : null
								]
							})
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(BranchDialog, {
						open,
						sessionId,
						onClose: closeDialog,
						onConfirm: choose,
						onError
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dsh-cg-tools",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
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
									children: refreshing ? SPINNER_ICON : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconRefresh, {})
								})
							})
						})
					})
				]
			});
		}
		/**
		* The remote control that lives in 提交历史's header: 同步变更 on a branch with an
		* upstream, 发布分支 on one without.
		*
		* It stands where the commits it moves are listed rather than in the toolbar
		* above the panes, opposite the pane's own name and count: what the two counts
		* are counted against, and what the round trip brings and sends, is the history
		* under it. It stays an icon because that row is the sidebar's narrowest place —
		* the name and count share it with this button — and the bubble behind it is where
		* the names read: 同步变更 with both counts spelled out as 待拉取 and 待推送, or
		* 发布分支 alone on a branch that has nothing to count yet. The bubble's text is
		* the button's accessible name as well, so a screen reader hears the same counts.
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
		* the honest answer for a branch in step with its upstream. The fallback below is
		* never drawn — the sync button needs an upstream to exist — it only keeps the two
		* counts plain numbers.
		*
		* @param props.status - the current status answer, for the branch already on.
		* @param props.syncing - the half of the round trip in flight, if any.
		* @param props.busy - whether any repository operation is in flight.
		* @param props.refreshing - a re-read of the repository is in flight.
		* @param props.onSync - called to run the pull-then-push round trip.
		* @param props.onPublish - called to push a branch that has no upstream yet.
		* @returns the control the branch's own state calls for.
		*/
		function RemoteControl(props) {
			const { status, syncing, busy, refreshing, onSync, onPublish } = props;
			const reachable = status?.ok === true && status?.detached !== true;
			const hasUpstream = reachable && status?.upstream !== void 0;
			const publishable = reachable && !hasUpstream;
			const behind = hasUpstream ? status?.behind ?? 0 : 0;
			const ahead = hasUpstream ? status?.ahead ?? 0 : 0;
			const syncLabel = `同步变更 · 待拉取 ${behind} · 待推送 ${ahead}`;
			return publishable ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
				label: "发布分支",
				side: "bottom",
				portal: true,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: "dsh-cg-tip",
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: "dsh-cg-icon",
						"aria-label": "发布分支",
						"data-busy": syncing === "push",
						disabled: !reachable || busy || refreshing,
						onClick: onPublish,
						children: syncing === "push" ? SPINNER_ICON : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconPublish, {})
					})
				})
			}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
				label: syncLabel,
				side: "bottom",
				portal: true,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: "dsh-cg-tip",
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						className: "dsh-cg-icon dsh-cg-sync",
						"aria-label": syncLabel,
						disabled: !reachable || busy || refreshing,
						onClick: onSync,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: "dsh-cg-sync-arrow",
							"data-busy": syncing === "pull",
							"data-pending": behind > 0,
							"aria-hidden": "true",
							children: [syncing === "pull" ? SPINNER_ICON : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconPull, {}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dsh-cg-sync-count",
								children: behind
							})]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: "dsh-cg-sync-arrow",
							"data-busy": syncing === "push",
							"data-pending": ahead > 0,
							"aria-hidden": "true",
							children: [syncing === "push" ? SPINNER_ICON : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconPush, {}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dsh-cg-sync-count",
								children: ahead
							})]
						})]
					})
				})
			});
		}
		/** What each run of rows is called. */
		const BRANCH_GROUP_LABEL = {
			current: "当前分支",
			local: "本地分支",
			remote: "远程分支"
		};
		/**
		* The branches Git reports, as a dialog the choice is confirmed in.
		*
		* A dialog rather than a dropdown because the list here is the whole decision: a
		* repository can hold hundreds of branches, so the list scrolls inside a fixed
		* height and carries a filter of its own. The rows are the three groups a branch
		* can come from — 当前分支, 本地分支, 远程分支 — each labelled where it starts, so
		* a remote name is never mistaken for a local one of the same shape and the
		* branch already checked out needs no mark of its own.
		*
		* The pointer is the whole of the selection: a click marks one row — the branch
		* the dialog opened on is marked before anything is clicked — and that mark is
		* what the footer's button applies. The click itself switches nothing, because a
		* checkout rewrites the working tree and a stray click on a scrolling list must
		* not do that. The filter narrows the three groups as it is typed, dropping a
		* selection it has just hidden, and Escape closes the dialog the way the Modal's
		* own layer does it.
		*
		* The list is read when the dialog opens, never before and never cached: this is
		* the only question the page asks that the tab's own mount does not already
		* answer, branches appear and disappear as the agent works, and a list read at
		* mount would be stale by the time anyone opened it.
		*
		* Whether the switch is allowed is Git's answer, not this half's: the dialog asks
		* the Host to check out the branch and nothing else, so a working tree Git would
		* refuse over comes back as the refusal it is — the paths in the way and all — in
		* the page's error dialog. The only choices made here are which branch, and
		* whether the footer's button is pressed at all.
		*
		* A read that fails closes the dialog and is stated by the page's one error
		* dialog, so the page keeps a single failure shape. The one exception is a
		* directory that is not a repository: that is not a failure, so the dialog says
		* so in place.
		*
		* @param props.open - whether the dialog is showing.
		* @param props.sessionId - the session whose repository is being read.
		* @param props.onClose - called by 取消, the close button, Escape, or the mask.
		* @param props.onConfirm - called with the picked branch when 切换 is pressed.
		* @param props.onError - called with the failure to state in the error dialog.
		* @returns the dialog element.
		*/
		function BranchDialog(props) {
			const { open, sessionId, onClose, onConfirm, onError } = props;
			/** The local branches Git reported, or null while it has not answered yet. */
			const [branches, setBranches] = (0, react.useState)(null);
			/** The remote-tracking branches Git reported. */
			const [remoteBranches, setRemoteBranches] = (0, react.useState)([]);
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
								title: "读取分支列表失败",
								lines: [reasonOf(result, "读取分支列表失败")]
							});
						}
						return;
					}
					const on = typeof result.current === "string" ? result.current : null;
					setBranches(Array.isArray(result.branches) ? result.branches : []);
					setRemoteBranches(Array.isArray(result.remotes) ? result.remotes : []);
					setCurrent(on);
					setTruncated(result.truncated === true);
					setPicked(on);
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
				};
			}, [
				open,
				sessionId,
				onClose,
				onError
			]);
			/**
			* The list's edge fades, driven the way the 终端 tab's lists drive theirs.
			*
			* A branch list can be two hundred rows long and the card cuts it at a fixed
			* height, so the two ends are where the dialog has to admit there is more: an
			* edge fades its rows into the card's own surface only while that edge really
			* hides some. The attributes are written straight to the wrapper (no
			* re-render), a scroll listener follows the offset, a ResizeObserver follows
			* the box, and the scrollbar gutter is recorded so the fade covers the
			* content column and leaves the bar alone. No dependency list: a filter
			* keystroke and a fresh branch list both land as commits, and re-running is
			* what re-reads the new heights.
			*/
			(0, react.useEffect)(() => {
				const scroll = listScroll.current;
				const wrap = listWrap.current;
				if (scroll === null || wrap === null) return;
				const update = () => {
					const overflow = scroll.scrollHeight - scroll.clientHeight > 1;
					wrap.toggleAttribute("data-fade-top", overflow && scroll.scrollTop > 1);
					wrap.toggleAttribute("data-fade-bottom", overflow && scroll.scrollTop + scroll.clientHeight < scroll.scrollHeight - 1);
					const gutter = `${scroll.offsetWidth - scroll.clientWidth}px`;
					if (wrap.style.getPropertyValue("--dsh-cg-fade-right") !== gutter) wrap.style.setProperty("--dsh-cg-fade-right", gutter);
				};
				update();
				scroll.addEventListener("scroll", update, { passive: true });
				const observer = typeof ResizeObserver === "undefined" ? void 0 : new ResizeObserver(update);
				observer?.observe(scroll);
				return () => {
					scroll.removeEventListener("scroll", update);
					observer?.disconnect();
				};
			});
			const rows = [
				...current === null ? [] : [{
					name: current,
					group: "current"
				}],
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
			* Whether this branch may be switched to.
			*
			* The one gate, consulted by the footer's button: that button is what applies
			* the choice, so a row the working tree is already on is not a switch it may
			* offer. Two refusals only — nothing selected, and the branch already checked
			* out — because whether a switch would be accepted is Git's answer, given when
			* the switch is asked for and stated by the error dialog if it is a refusal.
			*
			* @param name - the branch to judge, or null when no row is selected.
			* @returns true when a checkout of that branch may be offered.
			*/
			const switchable = (name) => name !== null && name !== current;
			let content;
			if (noRepo) content = /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
				className: "dsh-cg-dialog-hint",
				children: "当前会话目录不是 Git 仓库"
			});
			else if (branches !== null && rows.length === 0) content = /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
				className: "dsh-cg-dialog-hint",
				children: "没有可切换的分支"
			});
			else content = /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
					className: "dsh-cg-branch-filter",
					type: "text",
					value: filter,
					placeholder: "搜索分支",
					"aria-label": "搜索分支",
					"data-modal-autofocus": true,
					onChange: (event) => {
						const value = event.target.value;
						setFilter(value);
						setPicked(shownFor(value).some((row) => row.name === picked) ? picked : null);
					}
				}),
				branches === null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: "dsh-cg-dialog-hint",
					children: "正在读取分支…"
				}) : shown.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: "dsh-cg-dialog-hint",
					children: "没有匹配的分支"
				}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "dsh-cg-branch-list-wrap",
					ref: listWrap,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "dsh-cg-branch-list",
							role: "listbox",
							"aria-label": "分支",
							ref: listScroll,
							children: shown.map((row, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react.Fragment, { children: [row.group === shown[index - 1]?.group ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								role: "presentation",
								className: "dsh-cg-branch-group",
								children: BRANCH_GROUP_LABEL[row.group]
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
					children: "分支过多，仅显示最近的部分分支"
				}) : null
			] });
			const canConfirm = switchable(picked);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
				open,
				onClose,
				title: "切换分支",
				description: "选择并切换至指定分支",
				closeLabel: "关闭",
				className: "dsh-cg-branch-dialog",
				footer: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					variant: "outline",
					onClick: onClose,
					children: "取消"
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					variant: "primary",
					disabled: !canConfirm,
					onClick: () => {
						if (picked !== null) onConfirm(picked);
					},
					children: "切换"
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
		* The sidebar's commit form: a message field with the button that commits
		* everything 变更文件区 lists under it.
		*
		* It is the column's own row — under the toolbar and above both panes — rather
		* than a part of the pane whose list it commits. Both rows are full width and the
		* button is a row of its own under the field: the sidebar is narrow, and a field
		* sharing one line with the button would leave neither of them a readable width at
		* the pane's floor. The two are small — the field opens at 28px, the button's own
		* `sm` — so the pair costs the lists about one changed-path row each.
		*
		* The field is a `textarea` of this plugin's own rather than the platform's
		* `Input`, because a commit message is not one line: a subject and the note under
		* it are one message, and a single-line control cannot show the break between
		* them. So Enter is a line break here, and the chord (⌘/Ctrl+Enter) is what
		* submits from the keyboard; the button is the plain path. The field grows with
		* what is typed and stops at four lines, past which it scrolls — a message longer
		* than that must not push 变更文件区 down the column. Its corner is the button's
		* own, which is what makes the two read as one form (see `styles.ts`).
		*
		* It is a form of one decision, and that decision is the plain one: everything
		* 变更文件区 is listing goes in — tracked edits, deletions, and untracked files
		* alike — because nothing on this page offers a per-path choice that could make
		* the set smaller.
		*
		* The message is this component's own state rather than the page's, and that is
		* deliberate: the page renders thousands of diff rows, so a keystroke that
		* re-rendered it would repaint all of them. Nothing else needs the text — the
		* request carries it and the answer decides whether it is cleared — so it stays
		* here, one render per keystroke over one field.
		*
		* A commit empties the field; a refusal keeps it, because a message Git would not
		* take is the one thing the answer is about. The field is disabled for the length
		* of the request, so what is sent cannot be edited after it was read.
		*
		* @param props.disabled - whether the repository can take a commit right now:
		* there is none to name, nothing is changed, or the page is busy with something
		* else.
		* @param props.committing - the commit this form asked for is in flight.
		* @param props.onCommit - runs the commit; resolves true when one was made.
		* @returns the form element.
		*/
		function CommitBar(props) {
			const { disabled, committing, onCommit } = props;
			const [message, setMessage] = (0, react.useState)("");
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
				if (trimmed === "" || disabled || committing) return;
				onCommit(trimmed).then((made) => {
					if (made) setMessage("");
				});
			}, [
				message,
				disabled,
				committing,
				onCommit
			]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-cg-commit-bar",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: "dsh-cg-commit-frame",
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
						ref: field,
						className: "dsh-cg-commit-input",
						value: message,
						placeholder: "Commit Message",
						"aria-label": "Commit Message",
						rows: 1,
						disabled: committing,
						onChange: (event) => setMessage(event.target.value),
						onKeyDown: (event) => {
							if (event.key !== "Enter" || !(event.metaKey || event.ctrlKey)) return;
							event.preventDefault();
							submit();
						}
					})
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					className: "dsh-cg-commit-send",
					variant: "primary",
					size: "sm",
					disabled: disabled || committing || message.trim() === "",
					onClick: submit,
					children: committing ? "Commit…" : "Commit"
				})]
			});
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
