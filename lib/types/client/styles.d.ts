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
export declare const GIT_ROOT_CLASS = "dsh-cg-root";
/**
 * Insert the stylesheet once for the plugin lifetime.
 *
 * @returns disposer that removes exactly this element.
 */
export declare function insertGitStyles(): () => void;
//# sourceMappingURL=styles.d.ts.map