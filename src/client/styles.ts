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

import { DIFF_MIN, PANE_MIN, SIDE_DEFAULT, SIDE_MAX, SIDE_MIN } from './layout.js'

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
  // The sidebar is a column fixed to the width the reader dragged it to, so the
  // diff pane keeps every remaining pixel and its own scroll position; an explicit
  // `min-height` at every level — `0` where a box has to be free to shrink, 96px at
  // the two panes' own floor — is what lets the inner lists scroll instead of
  // stretching the page. `flex:1 1 auto` in addition to the View's inline
  // `height:100%` keeps the page full-height whichever way the shell's own wrapper
  // hands the body over.
  `.${GIT_ROOT_CLASS}{display:flex;flex:1 1 auto;flex-direction:row;box-sizing:border-box;width:100%;height:100%;min-height:0;overflow:hidden;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-family:var(--dsw-font-family,sans-serif);font-size:12.5px;line-height:1.5}`,
  `.${GIT_ROOT_CLASS} *{box-sizing:border-box}`,
  // The sidebar's width is the drag's to set: one custom property the page
  // publishes on its root (see `layout.ts`), with the default width as the rule's
  // own fallback, so the first frame — before a saved layout has been read — is
  // already a whole page. The floor and the cap restate the drag's bounds, and
  // they are what keeps a width saved in a wide window from squeezing the Diff
  // pane in a narrow one.
  `.dsh-cg-side{position:relative;flex:none;display:flex;flex-direction:column;width:var(--dsh-cg-side-width,${SIDE_DEFAULT}px);min-width:${SIDE_MIN}px;max-width:min(${SIDE_MAX}px,calc(100% - ${DIFF_MIN}px));min-height:0;border-right:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1)}`,
  // The two panes are shares of the column rather than fixed heights: the split is
  // saved as a share, so a window that grows makes both lists longer instead of
  // leaving one at a height that no longer fits. `flex-basis:0` is what makes the
  // two panes split by those shares instead of by their content, and `min-height`
  // is the floor the drag states too — a window too short for both floors overflows
  // the sidebar, which is the honest end of a column that cannot hold two lists.
  `.dsh-cg-pane{display:flex;flex-direction:column;flex:1 1 0;min-height:${PANE_MIN}px}`,
  '.dsh-cg-files{position:relative;flex-grow:var(--dsh-cg-files-grow,1)}',
  '.dsh-cg-history{flex-grow:var(--dsh-cg-history-grow,1)}',
  '.dsh-cg-pane+.dsh-cg-pane{border-top:1px solid var(--dsw-alias-border-l1)}',
  // The two boundaries themselves. Each is the 1px line the panes already draw,
  // with an invisible band around it as the hit target: the handle element is 1px
  // wide so that it can sit exactly on the border, and its `::after` reaches 4px
  // either side, because a 1px line is not something a pointer can be asked to
  // hold. Neither handle takes any layout space — one is positioned on the
  // sidebar's own edge, the other on the upper pane's bottom edge — so adding them
  // moves nothing on the page.
  //
  // `::before` is the indicator: the line brightens towards its middle on hover and
  // stays lit for the length of a drag, which is what makes a boundary read as
  // draggable at rest. The geometry and the gradient are DSH's own pane divider's
  // (`client/ui-dockkit`), so a divider here looks like every other one in the app.
  '.dsh-cg-resize{position:absolute;z-index:2;touch-action:none}',
  '.dsh-cg-resize::before{content:"";position:absolute;opacity:0;transition:opacity .12s ease-out}',
  '.dsh-cg-resize::after{content:"";position:absolute}',
  '.dsh-cg-resize:hover::before,.dsh-cg-resize[data-dragging]::before{opacity:1}',
  // The sidebar's right edge: the handle sits on the border itself (`right:-1px`
  // is the padding box plus its 1px border), so the line it lights up is the line
  // that is already drawn there.
  '.dsh-cg-col-resize{top:0;right:-1px;bottom:0;width:1px;cursor:col-resize}',
  '.dsh-cg-col-resize::after{inset:0 -4px}',
  '.dsh-cg-col-resize::before{inset:0;background:linear-gradient(to bottom,transparent,var(--dsw-alias-label-caption) 50%,transparent) center / 1px 100% no-repeat}',
  // The divider between the panes: the same line, reached from the upper pane and
  // covering the lower pane's own top border.
  '.dsh-cg-row-resize{right:0;bottom:-1px;left:0;height:1px;cursor:row-resize}',
  '.dsh-cg-row-resize::after{inset:-4px 0}',
  '.dsh-cg-row-resize::before{inset:0;background:linear-gradient(to right,transparent,var(--dsw-alias-label-caption) 50%,transparent) center / 100% 1px no-repeat}',
  // While a boundary is being dragged the whole page takes that axis's cursor and
  // stops selecting text: the pointer leaves a 1px line at the first frame of a
  // vertical drag, and a cursor that changed as it crossed a row would say the
  // gesture had ended. Both rules are stated on the page root rather than on the
  // handle because the pointer is usually over neither; a control that states a
  // cursor of its own more specifically (a disabled toolbar button) keeps it, which
  // is the same trade the platform's own dividers make.
  `.${GIT_ROOT_CLASS}[data-resizing],.${GIT_ROOT_CLASS}[data-resizing] *{user-select:none}`,
  `.${GIT_ROOT_CLASS}[data-resizing=col],.${GIT_ROOT_CLASS}[data-resizing=col] *{cursor:col-resize}`,
  `.${GIT_ROOT_CLASS}[data-resizing=row],.${GIT_ROOT_CLASS}[data-resizing=row] *{cursor:row-resize}`,
  // A pane's header: the pane's name and its row count, separated by a middle
  // dot, on the left, and whatever that pane's own control is on the right —
  // 提交历史 carries the remote control there, and 变更文件区 nothing. The name is
  // the one part that gives ground, so the count leaves with it as a unit; the
  // control is `flex:none` through `.dsh-cg-tools`, which is what keeps the two
  // ends from ever trading widths.
  //
  // The header states the layout and the title states the type: the small bold
  // caps the title is set in would otherwise be inherited by the control beside
  // it, which draws its own `font:inherit` — the digits inside 同步变更 would come
  // out a weight and a tracking heavier than the same button draws in the sidebar.
  '.dsh-cg-head{flex:none;display:flex;align-items:center;gap:8px;height:30px;padding:0 6px 0 12px}',
  '.dsh-cg-head-title{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-secondary);font-size:11px;font-weight:600;letter-spacing:.02em}',
  '.dsh-cg-list{flex:1 1 auto;min-height:0;overflow:auto;padding:0 6px 8px}',
  // Every list the tab scrolls — the sidebar's two panes here, and the branch
  // dialog's list below, which states the same binding by sharing this
  // selector — keeps the platform's bar out of the frame until the pointer is
  // inside it. The platform paints a bar for any scrollport that overflows, and
  // a stripe standing in a pane (or in a dialog this narrow) is chrome no one
  // asked to keep: the thumb is bound to `transparent` and rebound to the
  // platform's own dialog-level colour while the pointer is inside the list, so
  // the bar arrives with the pointer and leaves with it. Only a colour is
  // rebound — the bar is the same width hidden or shown, so the rows do not
  // shift as the pointer crosses the list's edge, and the thumb is there to be
  // grabbed the moment it is painted.
  '.dsh-cg-list,.dsh-cg-branch-list{--dsh-scrollbar-thumb:transparent;--dsh-scrollbar-thumb-hover:var(--dsw-alias-scrollbar-hover-l2)}',
  '.dsh-cg-list:hover,.dsh-cg-branch-list:hover{--dsh-scrollbar-thumb:var(--dsw-alias-scrollbar-bg-l2)}',

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
  // 同步变更 is the remote control in 提交历史's header wherever the branch has an
  // upstream, and inside it sit both halves of the round trip: each arrow with its
  // divergence count beside it, because the count and the control that resolves
  // it are one thing. The button widens to take the digits, and the arrow of a
  // direction with something to move is a shade stronger than an idle one's. The
  // name is the tooltip's and the accessible label's, not a word on the header:
  // two arrows and two counts already fill what the pane's own name and count
  // leave of that row.
  // Where there is no upstream this button is not drawn at all — 发布分支 takes
  // its place as an ordinary single-glyph control.
  '.dsh-cg-sync{width:auto;min-width:22px;gap:4px;padding:0 5px}',
  '.dsh-cg-sync-arrow{flex:none;display:inline-flex;align-items:center;gap:2px;color:var(--dsw-alias-label-tertiary)}',
  '.dsh-cg-sync-arrow[data-pending=true]{color:var(--dsw-alias-label-secondary)}',
  '.dsh-cg-sync-count{flex:none;font-family:var(--ds-font-family-code,ui-monospace,monospace);font-size:10.5px;font-variant-numeric:tabular-nums}',
  // The tooltip's anchor is one of these spans, not the button: a disabled
  // button emits no pointer events of its own, so the span is what takes the
  // hover — which is how a busy or unreachable control can still explain itself.
  // The branch pill, whose bubble the row makes necessary by shortening it, is
  // anchored the same way and shortened through the same span.
  '.dsh-cg-tip{display:inline-flex}',
  '.dsh-cg-tip:has(:disabled){cursor:default}',
  '.dsh-cg-tip .dsh-cg-icon:disabled,.dsh-cg-tip .dsh-cg-branch:disabled{pointer-events:none}',
  '@keyframes dsh-cg-spin{to{transform:rotate(360deg)}}',
  // One spin for every glyph that marks a wait: the branch pill, the two halves
  // of the sync button, and the refresh control. The sync button's arrows turn
  // one at a time, which is why the rule names the arrow span and not the
  // button: spinning the whole button would turn the arrow of the half that is
  // not running.
  '.dsh-cg-icon[data-busy=true] svg,.dsh-cg-branch-icon[data-busy=true] svg,.dsh-cg-sync-arrow[data-busy=true] svg{animation:dsh-cg-spin .9s linear infinite}',

  // The sidebar's first row: the Workspace's name on the left, the branch pill
  // beside it, and then the one control the row keeps — 刷新. It draws no rule of
  // its own: the toolbar and the commit form below it are one block of the column,
  // closed together by the form's own hairline (see `.dsh-cg-commit-bar`). Each
  // name carries its own glyph (a directory for the Workspace, a forked commit for
  // the branch), so the row states which is which without either label having to
  // say it; the operation is an icon rather than a word because the controls have
  // to fit the row at its narrowest, which is the sidebar's own floor. The remote
  // control is not here: it lives in 提交历史's header, beside the commits it moves.
  //
  // Two of the row's parts may give ground, and the branch's name goes first: the
  // pill is the row's own item rather than a member of the group beside it, because
  // a flex container is never narrower than its items' text — a pill inside the
  // group would have been the group's own floor, and the Workspace's name would
  // have gone on being the only part that shortened, with the branch keeping a name
  // the row could not afford.
  '.dsh-cg-side-head{flex:none;display:flex;align-items:center;height:34px;padding:0 6px 0 10px}',
  // The Workspace's name is the second of the two parts that give ground: every
  // control to its right is fixed, so once the pill has been shortened to its icon
  // this name is the only thing left that can end in an ellipsis rather than run
  // over the sidebar's own edge.
  '.dsh-cg-workspace{flex:1 1 auto;display:flex;align-items:center;gap:4px;min-width:0;font-size:12px;font-weight:600;color:var(--dsw-alias-label-primary)}',
  '.dsh-cg-workspace-icon{flex:none;display:inline-flex;align-items:center;width:13px;height:13px;color:var(--dsw-alias-label-tertiary)}',
  '.dsh-cg-workspace-icon svg{width:13px;height:13px;display:block}',
  // The name is the part of the Workspace that gives ground, and the ellipsis is
  // how it says so — but not one moment before the branch's name is spent.
  //
  // The row shares a deficit out in proportion to each item's `flex-shrink`, so
  // while the pill is being shortened the Workspace is still handed a fraction of a
  // pixel of it (see the pill's own rule below). A box a fraction of a pixel
  // narrower than its own text is enough to draw the ellipsis, which then drops
  // characters the row still had the branch's name to spend — the pill would go on
  // compressing beside a name that had already given up a whole word. The floor is
  // therefore one pixel wider than the room the icon and its gap leave (13 + 4):
  // that pixel swallows the fraction, and a real loss — the pill already down to
  // its icon — is still the ellipsis it should be.
  '.dsh-cg-workspace-name{min-width:calc(100% - 16px);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
  // The icon-button group both rows end with — 刷新 in the sidebar's first row and
  // the remote control in 提交历史's header. `margin-left:auto` is what keeps the
  // group at its row's right edge however long the name on the left is, and
  // `flex:none` is what makes the group the fixed part of the row: the control is
  // never asked to give up a pixel of the width its own glyph and counts need.
  '.dsh-cg-tools{flex:none;display:flex;align-items:center;margin-left:auto}',
  // The badge's gap is its own `margin` for the reason the icon's is: the pill's
  // spacing belongs to the things that stay.
  '.dsh-cg-divergence{flex:none;margin-left:4px;color:var(--dsw-alias-label-tertiary);font-family:var(--ds-font-family-code,ui-monospace,monospace);font-size:11px}',
  // The branch pill is the row's first thing to give ground, and its name is what
  // it gives: the row shrinks the pill, the name shortens to an ellipsis and then
  // to nothing at all, and `min-width` is where the shrinking stops — the pill's
  // own 6px of padding and the 12px icon. What is left at that floor is the icon
  // alone, centred, and the pill's bubble still names the branch it stands for.
  //
  // The pill has no `gap` of its own: a gap is a property of the container, so it
  // would still be paid out beside an icon the name had already left, and the pill
  // would end with a 4px hollow on the right of its icon. The two gaps the pill
  // draws are therefore the icon's `margin-right` and the badge's `margin-left` —
  // spacing that belongs to a thing which is still there, and that the name's own
  // shrinking takes with it.
  //
  // The pill's own `min-width` is what keeps the icon from being squeezed once the
  // span around it has been shortened; the floor the row reads, and the order it is
  // spent in, live on that span, below, because the row lays the span out.
  '.dsh-cg-branch{display:inline-flex;align-items:center;min-width:24px;max-width:130px;height:22px;padding:0 6px;border:0;border-radius:var(--dsw-radius-sm,6px);background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:11px;cursor:pointer}',
  '.dsh-cg-branch:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}',
  '.dsh-cg-branch:disabled{opacity:.45;cursor:default}',
  '.dsh-cg-branch-icon{flex:none;display:inline-flex;align-items:center;width:12px;height:12px;margin-right:4px;color:var(--dsw-alias-label-tertiary)}',
  '.dsh-cg-branch-icon svg{width:12px;height:12px;display:block}',
  // The name is the one part of the pill that shrinks: `min-width:0` is what lets
  // the flex line take it below its own text, and the ellipsis is what says so on
  // the way down. At zero the name is gone from the row entirely — the icon's gap
  // that the name was paying for goes with it, and what is left of that gap simply
  // runs into the pill's own padding, where nothing is drawn.
  '.dsh-cg-branch-name{flex:0 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:var(--ds-font-family-code,ui-monospace,monospace)}',
  // The pill's anchor is where the row is told what may be shortened, and in which
  // order. A deficit is shared in proportion to each item's `flex-shrink` times its
  // base size, so "first" and "second" are a ratio: the pill carries a thousand
  // times the Workspace's name, which is enough that the pill reaches its own
  // `min-width` — and stops there, because an item at its floor is frozen and the
  // rest of the deficit moves on to the next item — while the fraction of a pixel
  // the Workspace is still handed is swallowed by that name's own floor.
  //
  // A pill on a detached HEAD carries 游离 as well, and that word is fixed: two
  // full-width glyphs at the pill's own 11px type, so 22px, with the same 4px in
  // front of it. The floor takes the badge and both gaps with the name's place
  // empty — 12 + 12 + 4 + 4 + 22, plus the pill's 12px of padding — or the marker
  // would spill out of a pill shortened to its icon and sit on the button beside
  // it. The sum is written in pixels because the tip span is not the pill: an `em`
  // here would be measured against the span's own type, not the badge's.
  '.dsh-cg-branch-tip{flex:0 1000 auto;min-width:24px}',
  '.dsh-cg-branch-tip:has(.dsh-cg-divergence){min-width:54px}',

  // The branch dialog: a filter over a scrolling list of three labelled groups —
  // the branch checked out, the other local branches, and the remote-tracking
  // ones. The list is the decision, so it caps its own height instead of
  // stretching the card — in `min()` with a viewport share, because a short
  // window must not push the card's footer off the mask — and the filter is the
  // control the Modal focuses when it opens.
  //
  // The filter is the platform's own `Input` primitive, so its border, fill,
  // radius, type scale, and focus color are the platform's and follow the theme
  // without a rule here; this stylesheet only gives its frame the width of the
  // dialog's content column.
  //
  // That frame is portaled to `document.body` with the card, which is outside
  // the root the stylesheet's own box-sizing reset is scoped to, so it says
  // `border-box` itself: the primitive's frame carries padding and a hairline
  // border, and without it a `width:100%` frame grows past the content column by
  // both.
  //
  // The body is a column of its own so the filter is a block-level box rather
  // than an inline one with a line box of its own under it: the keys that walk
  // the list are bound here, and the height stays the sum of the parts.
  '.dsh-cg-branch-body{display:flex;flex-direction:column;min-width:0}',
  '.dsh-cg-branch-filter,.dsh-cg-branch-list,.dsh-cg-branch-row{box-sizing:border-box}',
  '.dsh-cg-branch-filter{flex:none;width:100%}',
  // A branch name is a path, and two remote branches cut at the same ellipsis are
  // one name to the eye, so the card is widened past the platform's default. The
  // card is not height-capped here: the list below is what gives ground on a
  // short window, in `min()` with a viewport share.
  '.dsh-cg-branch-dialog{width:min(450px,100%)}',
  // Scrolls like the sidebar's two lists, whose rule above states how the
  // platform's bar is kept out of the frame until the pointer is inside.
  // The scroller is wrapped rather than being the positioned element itself:
  // the edge fades below have to be siblings of the list — a child of the
  // scroller would slide away with the rows — so they are pinned to the
  // wrapper's box and painted after the list. The list keeps its own height
  // cap, so the wrapper is exactly the visible box.
  '.dsh-cg-branch-list-wrap{position:relative;display:flex;flex-direction:column;min-height:0;margin-top:8px}',
  '.dsh-cg-branch-list{flex:1;min-height:0;display:flex;flex-direction:column;gap:1px;max-height:min(360px,40vh);overflow:auto}',
  // The two edge fades, the same rhythm as the 终端 tab's command dialog: a
  // gradient that dissolves rows into the card's own surface (layer-2 is the
  // Modal card background), shown only while that edge really hides content,
  // so a list short enough to fit does not smudge its first row. The height
  // matches one row (see `.dsh-cg-branch-row`), so the dissolve reads as a
  // single row rather than a band. `--dsh-cg-fade-right` is the scrollbar
  // gutter set by the edge-fade effect, so a fade covers the content column
  // and never washes out the scrollbar; `pointer-events:none` keeps scrolling
  // and row clicks working where a fade covers a row.
  '.dsh-cg-branch-fade{position:absolute;left:0;right:var(--dsh-cg-fade-right,0);height:28px;pointer-events:none;opacity:0;transition:opacity .15s ease;z-index:2}',
  '.dsh-cg-branch-fade-top{top:0;background:linear-gradient(to bottom,var(--dsw-alias-bg-layer-2),rgba(0,0,0,0))}',
  '.dsh-cg-branch-fade-bottom{bottom:0;background:linear-gradient(to top,var(--dsw-alias-bg-layer-2),rgba(0,0,0,0))}',
  // The attribute is read on the wrapper, and the rule names that wrapper so a
  // `[data-fade-*]` another plugin writes on its own scroller cannot reach in.
  '.dsh-cg-branch-list-wrap[data-fade-top] .dsh-cg-branch-fade-top{opacity:1}',
  '.dsh-cg-branch-list-wrap[data-fade-bottom] .dsh-cg-branch-fade-bottom{opacity:1}',
  // The heading that opens each run of rows — 当前分支, 本地分支, 远程分支. It sits
  // in the list's own column so the three groups read as one list, and the first
  // one carries no gap above it.
  '.dsh-cg-branch-group{flex:none;margin-top:8px;padding:0 8px;color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:18px}',
  '.dsh-cg-branch-group:first-child{margin-top:0}',
  '.dsh-cg-branch-row{flex:none;display:flex;align-items:center;gap:8px;width:100%;height:28px;padding:0 8px;border:0;border-radius:var(--dsw-radius-sm,6px);background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;text-align:left;cursor:pointer}',
  // The row under the pointer and the row that is selected are painted the same
  // way, on purpose: the fill is the dialog's one "this is the row" colour, so the
  // selected row keeps reading as selected while the pointer is away on the
  // footer's buttons. The selection itself is the click's, not the pointer's, so
  // moving the mouse over a row can never change what 切换 would apply.
  '.dsh-cg-branch-row:hover{background:var(--dsw-alias-interactive-bg-hover)}',
  '.dsh-cg-branch-row[aria-selected=true]{background:var(--dsw-alias-interactive-bg-hover)}',
  '.dsh-cg-branch-row-name{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:var(--ds-font-family-code,ui-monospace,monospace)}',
  // One line of the dialog's own state: still reading, a directory that is not a
  // repository, no branch at all, a filter that matched nothing. A failure is the
  // error dialog's, so nothing here paints one.
  '.dsh-cg-dialog-hint{margin:0;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:1.7}',
  // The 分支过多 line follows the list's wrapper, not the scroller inside it.
  '.dsh-cg-branch-list-wrap+.dsh-cg-dialog-hint{margin-top:8px}',

  // The failure lines the error dialog states, one per request that did not
  // answer. The dialog itself is the platform's Modal, so this is only its body:
  // the card reports the failure the way DSH's own dialogs do — one `role="alert"`
  // block painted with the error token — and a reason Git printed can be a whole
  // sentence with punctuation of its own, so it must wrap rather than widen the
  // card.
  '.dsh-cg-dialog-body{display:flex;flex-direction:column;gap:8px}',
  '.dsh-cg-dialog-text{margin:0;font-size:13px;line-height:20px;color:var(--dsw-alias-state-error-primary);white-space:pre-wrap;word-break:break-word}',

  // The commit form: the sidebar's own row under the toolbar, closed by the one
  // hairline that separates the column's top block — toolbar and form together —
  // from the two panes below. Nothing is drawn between the toolbar and the field,
  // so the three of them read as one block.
  //
  // Two stacked full-width rows rather than one line, because the sidebar is
  // narrow: a field sharing a line with the button would be a field too small to
  // read a message in at the pane's floor, and the button's own label is the part
  // that must never be cut. Their gutters are the toolbar's, so all three of the
  // sidebar's rows start and end on the same two edges.
  //
  // The button is the platform's own primitive, so its fill, radius, type scale,
  // and focus colour are the platform's and follow the theme without a rule here.
  // The field is not: the platform's `Input` atom is single-line, and a commit
  // message is not, so this is a `textarea` styled here. What it borrows from that
  // atom is the appearance — the half-pixel border, the layer fill, the dimmed
  // placeholder, and the business token on focus — so the two still read as the
  // app's field; what it does not borrow is the radius, which is the `sm` button's
  // own corner above it, because these two rows are one form.
  //
  // The frame and the field are separate boxes for one reason: the component
  // measures the field's height to its own content, and a box that is measured has
  // to carry no border — a border on the measured box would have to be added back
  // by hand, and a half-pixel one is laid out as a whole device pixel, so the sum
  // would be a field that clips its last line or trails one. So the frame draws the
  // border, the fill, and the focus colour, and the field inside it is borderless.
  //
  // The height is one line's worth and is then measured to its content by the
  // component (see `CommitBar`), capped here at four lines. The arithmetic runs
  // through the frame: a line is 20px and the field's own padding is 6px, so the
  // 26px it keeps at its shortest is the 28px the button beside it is once the
  // frame's border is counted, and four of those lines is the 86px past which the
  // field scrolls instead of pushing 变更文件区 down the column.
  '.dsh-cg-commit-bar{flex:none;display:flex;flex-direction:column;gap:6px;padding:0px 10px 8px;border-bottom:1px solid var(--dsw-alias-border-l1)}',
  '.dsh-cg-commit-frame{display:block;box-sizing:border-box;width:100%;border:0.5px solid var(--dsw-alias-border-l4);border-radius:var(--dsw-radius-sm);background:var(--dsw-alias-bg-layer-1)}',
  '.dsh-cg-commit-frame:focus-within{border-color:var(--dsw-alias-state-business-primary)}',
  '.dsh-cg-commit-frame:has(.dsh-cg-commit-input:disabled){opacity:.6}',
  '.dsh-cg-commit-input{display:block;box-sizing:border-box;width:100%;min-height:26px;max-height:86px;padding:3px 8px;border:0;outline:none;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;line-height:20px;resize:none;overflow-y:auto}',
  '.dsh-cg-commit-input::placeholder{color:var(--dsw-alias-label-dimmed)}',
  '.dsh-cg-commit-input:disabled{cursor:not-allowed}',
  '.dsh-cg-commit-send{width:100%}',

  // Changed-path rows. The selected row reads exactly like a hovered one, the
  // way the branch dialog's rows already do: the fill says which row the page
  // or the pointer is on, and a second, stronger fill would read as a different
  // state rather than the same one.
  '.dsh-cg-row{display:flex;align-items:center;gap:6px;width:100%;height:26px;padding:0 6px;border:0;border-radius:var(--dsw-radius-sm,6px);background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer}',
  '.dsh-cg-row:hover,.dsh-cg-row[aria-selected=true]{background:var(--dsw-alias-interactive-bg-hover)}',
  '.dsh-cg-badge{flex:none;width:13px;text-align:center;font-family:var(--ds-font-family-code,ui-monospace,monospace);font-size:11px;font-weight:700;color:var(--dsw-alias-label-tertiary)}',
  '.dsh-cg-badge[data-kind=added]{color:var(--dsw-alias-state-success-primary)}',
  '.dsh-cg-badge[data-kind=modified]{color:var(--dsw-alias-state-warn-primary)}',
  '.dsh-cg-badge[data-kind=deleted]{color:var(--dsw-alias-state-error-primary)}',
  '.dsh-cg-badge[data-kind=conflicted]{color:var(--dsw-alias-state-error-primary)}',
  '.dsh-cg-badge[data-kind=renamed]{color:var(--dsw-alias-brand-primary)}',
  '.dsh-cg-badge[data-kind=copied]{color:var(--dsw-alias-brand-primary)}',
  '.dsh-cg-badge[data-kind=typechange]{color:var(--dsw-alias-state-warn-primary)}',
  '.dsh-cg-badge[data-kind=untracked]{color:var(--dsw-alias-state-idle-primary)}',
  // The row's path reads `name · parent`; the name keeps its width while the
  // parent gives way first, because the name is what the row is about.
  '.dsh-cg-path{display:flex;align-items:baseline;gap:4px;flex:1 1 auto;min-width:0;font-family:var(--ds-font-family-code,ui-monospace,monospace);font-size:11.5px}',
  '.dsh-cg-name{flex:0 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-primary)}',
  '.dsh-cg-dot{flex:none;color:var(--dsw-alias-label-tertiary)}',
  '.dsh-cg-dir{color:var(--dsw-alias-label-tertiary)}',
  '.dsh-cg-path .dsh-cg-dir{flex:0 100000 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
  // The stage dot marks a row whose index side has content, so a file that is
  // both staged and edited again is not mistaken for a plain modification.
  '.dsh-cg-stage{flex:none;width:5px;height:5px;border-radius:50%;background:var(--dsw-alias-brand-primary)}',
  '.dsh-cg-stage[data-staged=false]{background:transparent}',

  // Commit rows.
  '.dsh-cg-commit{display:flex;flex-direction:column;gap:2px;width:100%;padding:5px 6px;border:0;border-radius:var(--dsw-radius-sm,6px);background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer}',
  '.dsh-cg-commit:hover,.dsh-cg-commit[aria-selected=true]{background:var(--dsw-alias-interactive-bg-hover)}',
  '.dsh-cg-subject{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;color:var(--dsw-alias-label-primary)}',
  '.dsh-cg-meta{display:flex;align-items:center;gap:6px;overflow:hidden;white-space:nowrap;font-size:10.5px;color:var(--dsw-alias-label-tertiary)}',
  '.dsh-cg-hash{font-family:var(--ds-font-family-code,ui-monospace,monospace)}',
  '.dsh-cg-refs{display:flex;gap:4px;overflow:hidden}',
  // A branch or tag decoration is a filled chip in the theme's accent, not an
  // outlined one. The accent is `--dsw-alias-state-business-primary`, the alias
  // every accent-marked surface in the platform reads (focus rings, `Tag`'s info
  // tone), and it is the one a theme preset moves: `--dsw-alias-brand-primary`
  // would be wrong here, since the platform defines it as the foreground color
  // itself, which is what paints the monochrome primary Button.
  '.dsh-cg-ref{flex:none;max-width:110px;overflow:hidden;text-overflow:ellipsis;padding:0 4px;border-radius:var(--dsw-radius-xs,4px);background:var(--dsw-alias-state-business-primary);color:var(--dsw-alias-label-primary-foreground);font-size:10px;line-height:14px}',

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
