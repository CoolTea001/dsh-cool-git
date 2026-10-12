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
export const GIT_ROOT_CLASS = 'dsh-cg-root'

/** CSS rules, one selector per line. */
const GIT_CSS = [
  // 1. Shell integration.
  //
  // `[data-conversation-scroll]` is the resident scrollport and the seat is its
  // direct child. Hidden, not removed: the draft mirror and the input store keep
  // running for the Chat tab underneath.
  `[data-conversation-scroll]:has(.${GIT_ROOT_CLASS})>[data-composer-seat]{display:none}`,

  // 2. Page layout.
  //
  // The sidebar is a fixed column so the diff pane keeps every remaining pixel
  // and its own scroll position; `min-height:0` on all three levels is what
  // lets the inner lists scroll instead of stretching the page. `flex:1 1 auto`
  // in addition to the View's inline `height:100%` keeps the page full-height
  // whichever way the shell's own wrapper hands the body over.
  `.${GIT_ROOT_CLASS}{display:flex;flex:1 1 auto;flex-direction:row;box-sizing:border-box;width:100%;height:100%;min-height:0;overflow:hidden;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-family:var(--dsw-font-family,sans-serif);font-size:12.5px;line-height:1.5}`,
  `.${GIT_ROOT_CLASS} *{box-sizing:border-box}`,
  '.dsh-cg-side{flex:none;display:flex;flex-direction:column;width:340px;min-width:0;min-height:0;border-right:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1)}',
  // Equal halves, as the design's divider shows: `flex-basis:0` is what makes
  // the two panes share the column evenly instead of by content length.
  '.dsh-cg-pane{display:flex;flex-direction:column;flex:1 1 0;min-height:0}',
  '.dsh-cg-pane+.dsh-cg-pane{border-top:1px solid var(--dsw-alias-border-l1)}',
  '.dsh-cg-head{flex:none;display:flex;align-items:center;gap:8px;height:30px;padding:0 6px 0 12px;color:var(--dsw-alias-label-secondary);font-size:11px;font-weight:600;letter-spacing:.02em}',
  '.dsh-cg-head-title{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
  '.dsh-cg-count{flex:none;padding:0 5px;border-radius:999px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-tertiary);font-size:10px;font-weight:500;line-height:15px}',
  '.dsh-cg-list{flex:1 1 auto;min-height:0;overflow:auto;padding:0 6px 8px}',

  // Toolbar buttons are plain buttons rather than the shared primitive: the tab
  // needs a few of them, and the token-driven states below are the whole of what
  // it needs from that primitive. A button that is waiting on the network says so
  // by turning its glyph, which is why the spin rule lives here rather than in
  // each button's own markup.
  '.dsh-cg-icon{flex:none;display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;padding:0;border:0;border-radius:var(--dsw-radius-sm,6px);background:transparent;color:var(--dsw-alias-label-tertiary);font:inherit;cursor:pointer}',
  '.dsh-cg-icon:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}',
  '.dsh-cg-icon:disabled{opacity:.45;cursor:default}',
  '.dsh-cg-icon:disabled:hover{background:transparent;color:var(--dsw-alias-label-tertiary)}',
  '.dsh-cg-icon svg{width:13px;height:13px;display:block}',
  // Pull and Push carry the divergence as a number beside their own arrow: the
  // count and the button that resolves it are one control, so the toolbar holds
  // no second copy of the same fact. The button widens to take the digits, and
  // the arrow of a button with something to move is a shade stronger than an
  // idle one's.
  '.dsh-cg-sync{width:auto;min-width:22px;gap:3px;padding:0 5px}',
  '.dsh-cg-sync[data-pending=true]{color:var(--dsw-alias-label-secondary)}',
  '.dsh-cg-sync-count{flex:none;font-family:var(--ds-font-family-code,ui-monospace,monospace);font-size:10.5px;font-variant-numeric:tabular-nums}',
  // The tooltip's anchor is one of these spans, not the button: a disabled
  // button emits no pointer events of its own, so the span is what takes the
  // hover — which is how a busy or unreachable control can still explain itself.
  '.dsh-cg-tip{display:inline-flex}',
  '.dsh-cg-tip:has(.dsh-cg-icon:disabled){cursor:default}',
  '.dsh-cg-tip .dsh-cg-icon:disabled{pointer-events:none}',
  '@keyframes dsh-cg-spin{to{transform:rotate(360deg)}}',
  // One spin for every glyph that marks a wait: the branch pill and the three
  // toolbar controls.
  '.dsh-cg-icon[data-busy=true] svg,.dsh-cg-branch-icon[data-busy=true] svg{animation:dsh-cg-spin .9s linear infinite}',

  // The sidebar's first row: the Workspace's name on the left, and the toolbar
  // — branch, Pull, Push, refresh — on the right, one hairline under both. Each
  // name carries its own glyph (a directory for the Workspace, a forked commit
  // for the branch), so the row states which is which without either label
  // having to say it; the three operations are icons rather than words because
  // the branch pill and three buttons all have to fit a 340px row.
  '.dsh-cg-side-head{flex:none;display:flex;align-items:center;gap:6px;height:34px;padding:0 6px 0 10px;border-bottom:1px solid var(--dsw-alias-border-l1)}',
  // The Workspace's name is the only part that may give ground: every control to
  // its right has a fixed width, and a name that scrolls out of the row is worse
  // than one that ends in an ellipsis.
  '.dsh-cg-workspace{flex:1 1 auto;display:flex;align-items:center;gap:4px;min-width:0;font-size:12px;font-weight:600;color:var(--dsw-alias-label-primary)}',
  '.dsh-cg-workspace-icon{flex:none;display:inline-flex;align-items:center;width:13px;height:13px;color:var(--dsw-alias-label-tertiary)}',
  '.dsh-cg-workspace-icon svg{width:13px;height:13px;display:block}',
  '.dsh-cg-workspace-name{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
  // `margin-left:auto` is what keeps the group at the row's right edge however
  // long the Workspace's name is.
  '.dsh-cg-tools{flex:none;display:flex;align-items:center;gap:4px;margin-left:auto}',
  '.dsh-cg-divergence{flex:none;color:var(--dsw-alias-label-tertiary);font-family:var(--ds-font-family-code,ui-monospace,monospace);font-size:11px}',
  // The Menu primitive's wrapper span is the trigger's own box.
  '.dsh-cg-branch-menu{flex:none;display:inline-flex}',
  '.dsh-cg-branch{display:inline-flex;align-items:center;gap:4px;max-width:130px;height:22px;padding:0 4px 0 6px;border:1px solid var(--dsw-alias-border-l1);border-radius:var(--dsw-radius-sm,6px);background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:11px;cursor:pointer}',
  '.dsh-cg-branch:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}',
  '.dsh-cg-branch:disabled{opacity:.45;cursor:default}',
  '.dsh-cg-branch-icon{flex:none;display:inline-flex;align-items:center;width:12px;height:12px;color:var(--dsw-alias-label-tertiary)}',
  '.dsh-cg-branch-icon svg{width:12px;height:12px;display:block}',
  '.dsh-cg-branch-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:var(--ds-font-family-code,ui-monospace,monospace)}',
  '.dsh-cg-chevron{flex:none;display:inline-flex;width:12px;height:12px;color:var(--dsw-alias-label-tertiary)}',
  '.dsh-cg-chevron svg{width:12px;height:12px;display:block}',

  // The one line the error dialog states per failed request. The dialog itself
  // is the platform's Modal, so only its body text needs a rule here: a reason
  // Git printed can be a whole sentence with punctuation of its own, and it must
  // wrap rather than widen the card.
  '.dsh-cg-dialog-text{margin:0;font-size:13px;line-height:20px;color:var(--dsw-alias-label-primary);white-space:pre-wrap;word-break:break-word}',
  '.dsh-cg-dialog-text+.dsh-cg-dialog-text{margin-top:8px}',

  // Changed-path rows.
  '.dsh-cg-row{display:flex;align-items:center;gap:6px;width:100%;height:26px;padding:0 6px;border:0;border-radius:var(--dsw-radius-sm,6px);background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer}',
  '.dsh-cg-row:hover{background:var(--dsw-alias-interactive-bg-hover)}',
  '.dsh-cg-row[aria-selected=true]{background:var(--dsw-alias-interactive-bg-active)}',
  '.dsh-cg-badge{flex:none;width:13px;text-align:center;font-family:var(--ds-font-family-code,ui-monospace,monospace);font-size:11px;font-weight:700;color:var(--dsw-alias-label-tertiary)}',
  '.dsh-cg-badge[data-kind=added]{color:var(--dsw-alias-state-success-primary)}',
  '.dsh-cg-badge[data-kind=modified]{color:var(--dsw-alias-state-warn-primary)}',
  '.dsh-cg-badge[data-kind=deleted]{color:var(--dsw-alias-state-error-primary)}',
  '.dsh-cg-badge[data-kind=conflicted]{color:var(--dsw-alias-state-error-primary)}',
  '.dsh-cg-badge[data-kind=renamed]{color:var(--dsw-alias-brand-primary)}',
  '.dsh-cg-badge[data-kind=copied]{color:var(--dsw-alias-brand-primary)}',
  '.dsh-cg-badge[data-kind=typechange]{color:var(--dsw-alias-state-warn-primary)}',
  '.dsh-cg-badge[data-kind=untracked]{color:var(--dsw-alias-state-idle-primary)}',
  '.dsh-cg-path{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:var(--ds-font-family-code,ui-monospace,monospace);font-size:11.5px}',
  '.dsh-cg-dir{color:var(--dsw-alias-label-tertiary)}',
  // The stage dot marks a row whose index side has content, so a file that is
  // both staged and edited again is not mistaken for a plain modification.
  '.dsh-cg-stage{flex:none;width:5px;height:5px;border-radius:50%;background:var(--dsw-alias-brand-primary)}',
  '.dsh-cg-stage[data-staged=false]{background:transparent}',

  // Commit rows.
  '.dsh-cg-commit{display:flex;flex-direction:column;gap:2px;width:100%;padding:5px 6px;border:0;border-radius:var(--dsw-radius-sm,6px);background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer}',
  '.dsh-cg-commit:hover{background:var(--dsw-alias-interactive-bg-hover)}',
  '.dsh-cg-commit[aria-selected=true]{background:var(--dsw-alias-interactive-bg-active)}',
  '.dsh-cg-subject{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;color:var(--dsw-alias-label-primary)}',
  '.dsh-cg-meta{display:flex;align-items:center;gap:6px;overflow:hidden;white-space:nowrap;font-size:10.5px;color:var(--dsw-alias-label-tertiary)}',
  '.dsh-cg-hash{font-family:var(--ds-font-family-code,ui-monospace,monospace)}',
  '.dsh-cg-refs{display:flex;gap:4px;overflow:hidden}',
  '.dsh-cg-ref{flex:none;max-width:110px;overflow:hidden;text-overflow:ellipsis;padding:0 4px;border:1px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-xs,4px);color:var(--dsw-alias-brand-text,var(--dsw-alias-brand-primary));font-size:10px;line-height:14px}',

  // Notes: empty lists and loading rows. A failure is the error dialog's, so
  // nothing here paints one.
  '.dsh-cg-note{padding:8px 12px;color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:1.7}',

  // 3. Diff pane.
  '.dsh-cg-main{flex:1 1 auto;display:flex;flex-direction:column;min-width:0;min-height:0}',
  '.dsh-cg-main-head{flex:none;display:flex;align-items:center;gap:8px;min-height:30px;padding:4px 8px 4px 12px;border-bottom:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-base)}',
  '.dsh-cg-main-title{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:var(--ds-font-family-code,ui-monospace,monospace);font-size:11.5px;color:var(--dsw-alias-label-secondary)}',
  '.dsh-cg-main-subtitle{flex:none;max-width:45%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-tertiary);font-size:11px}',
  '.dsh-cg-stats{flex:none;display:flex;gap:6px;font-family:var(--ds-font-family-code,ui-monospace,monospace);font-size:11px}',
  '.dsh-cg-added{color:var(--dsw-alias-state-success-primary)}',
  '.dsh-cg-deleted{color:var(--dsw-alias-state-error-primary)}',
  '.dsh-cg-diff{flex:1 1 auto;min-height:0;overflow:auto;background:var(--dsw-alias-bg-base)}',

  // An empty pane centres its message. A failure never renders here: it opens
  // the error dialog, so the box holds only the state it belongs to.
  '.dsh-cg-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;height:100%;padding:24px;text-align:center;color:var(--dsw-alias-label-tertiary);user-select:none}',
  '.dsh-cg-empty-title{font-size:14px;font-weight:600;color:var(--dsw-alias-label-secondary)}',
  '.dsh-cg-empty-text{font-size:12px;max-width:60ch;line-height:1.7}',

  // Per-file section inside a multi-file patch (a commit's diff).
  '.dsh-cg-file-head{display:flex;align-items:center;gap:8px;padding:6px 12px;border-top:1px solid var(--dsw-alias-border-l1);border-bottom:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);font-family:var(--ds-font-family-code,ui-monospace,monospace);font-size:11px}',
  '.dsh-cg-file-path{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-secondary)}',

  // Hunk header sticks to the top of the scroller: the `@@` scope is the one
  // piece of context worth keeping while a long diff scrolls.
  '.dsh-cg-hunk-head{position:sticky;top:0;z-index:1;padding:2px 12px;background:var(--dsw-alias-markdown-code-block-banner,var(--dsw-alias-bg-layer-2));border-top:1px solid var(--dsw-alias-border-l1);border-bottom:1px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-tertiary);font-family:var(--ds-font-family-code,ui-monospace,monospace);font-size:11px;white-space:pre;overflow:hidden;text-overflow:ellipsis}',

  // One body line: old number, new number, marker, text. `width:max-content`
  // with `min-width:100%` is what gives every row the full width for its
  // background while still letting a long line scroll the pane sideways.
  '.dsh-cg-line{display:grid;grid-template-columns:44px 44px 14px minmax(0,1fr);width:max-content;min-width:100%;font-family:var(--ds-font-family-code,ui-monospace,monospace);font-size:12px;line-height:18px}',
  '.dsh-cg-line[data-kind=add]{background:var(--dsw-alias-file-diff-added-bg)}',
  '.dsh-cg-line[data-kind=del]{background:var(--dsw-alias-file-diff-deleted-bg)}',
  '.dsh-cg-line[data-kind=meta]{color:var(--dsw-alias-label-tertiary)}',
  '.dsh-cg-no{padding-right:8px;text-align:right;color:var(--dsw-alias-label-tertiary);user-select:none}',
  '.dsh-cg-line[data-kind=add] .dsh-cg-no{background:var(--dsw-alias-file-diff-added-gutter)}',
  '.dsh-cg-line[data-kind=del] .dsh-cg-no{background:var(--dsw-alias-file-diff-deleted-gutter)}',
  '.dsh-cg-sign{user-select:none;color:var(--dsw-alias-label-tertiary)}',
  '.dsh-cg-line[data-kind=add] .dsh-cg-sign{color:var(--dsw-alias-file-diff-added-marker,var(--dsw-alias-state-success-primary))}',
  '.dsh-cg-line[data-kind=del] .dsh-cg-sign{color:var(--dsw-alias-file-diff-deleted-marker,var(--dsw-alias-state-error-primary))}',
  // `white-space:pre` keeps indentation; a tab would otherwise collapse to one
  // space and every diff of indented code would read as if it were flat.
  '.dsh-cg-text{white-space:pre;padding-right:16px}',
  '.dsh-cg-line[data-kind=meta] .dsh-cg-text{grid-column:1 / -1;padding-left:12px}',
].join('\n')

/**
 * Insert the stylesheet once for the plugin lifetime.
 *
 * @returns disposer that removes exactly this element.
 */
export function insertGitStyles(): () => void {
  const element = document.createElement('style')
  element.setAttribute('data-dsh-cool-git', 'styles')
  element.textContent = GIT_CSS
  document.head.appendChild(element)
  return () => {
    element.remove()
  }
}
