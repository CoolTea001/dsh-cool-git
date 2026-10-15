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
 */
/** Class the Git View renders on its root; the stylesheet's only anchor. */
export declare const GIT_ROOT_CLASS = "dsh-cg-root";
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
export declare function insertGitStyles(): () => void;
//# sourceMappingURL=styles.d.ts.map