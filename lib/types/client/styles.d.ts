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
/**
 * Insert the stylesheet once for the plugin lifetime.
 *
 * @returns disposer that removes exactly this element.
 */
export declare function insertGitStyles(): () => void;
//# sourceMappingURL=styles.d.ts.map