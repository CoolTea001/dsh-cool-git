window.__ModuleLoader__.load({
	id: "dsh-cool-git",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/client/git.tsx
		/** Container style: fill the conversation body and centre the placeholder. */
		const PAGE = {
			height: "100%",
			display: "flex",
			flexDirection: "column",
			alignItems: "center",
			justifyContent: "center",
			gap: 6,
			color: "currentColor",
			opacity: .55,
			userSelect: "none"
		};
		/** One placeholder line. */
		const LINE = {
			margin: 0,
			fontSize: 14,
			lineHeight: 1.5
		};
		/**
		* Render the Git tab's body.
		* @returns the placeholder page element.
		*/
		function GitView() {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				"data-dsh-cool-git": "view",
				style: PAGE,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					style: {
						...LINE,
						fontSize: 18,
						fontWeight: 600
					},
					children: "Git"
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					style: LINE,
					children: "页面建设中"
				})]
			});
		}
		//#endregion
		//#region src/client/styles.ts
		/**
		* Package-owned stylesheet for the Git tab.
		*
		* The Conversation shell keeps two pieces of chrome mounted for every View:
		* the composer seat (the input card plus the todo dock above it) and the two
		* transcript width handles. The Git View uses neither, so both are suppressed
		* here instead of being unmounted — a pure CSS opt-out.
		*
		* Every rule is scoped by `:has()` over this plugin's own view root, which
		* exists only while the Git tab is mounted: Chat, 轨迹 and 终端 keep their
		* composer and handles untouched, and the rules disappear with the View.
		*/
		/** CSS rules, one selector per line. */
		const GIT_CSS = ["[data-conversation-content]:has([data-dsh-cool-git=\"view\"]) [data-composer-seat]{display:none}", "[data-conversation-content]:has([data-dsh-cool-git=\"view\"]) [data-width-handle]{display:none}"].join("\n");
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
		//#region src/client/index.ts
		/**
		* Client entry for dsh-cool-git.
		*
		* Contributes exactly one 'conversation.view' entry, which is what turns into
		* a tab in the session's tab bar. No optional collaborators: the page renders
		* a placeholder until Git behaviour lands, and the stylesheet below takes the
		* shell's composer and width handles away while this tab is mounted.
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
