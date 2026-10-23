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

import { DIFF_MIN, PANE_MIN, SIDE_DEFAULT, SIDE_MAX, SIDE_MIN } from './layout.js'

/** Build-time define from tsdown.config.ts: the id the loader registers this bundle under. */
declare const __DSH_CG_PLUGIN_ID__: string

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
  // publishes on its root (see `layout.tsx`), with the default width as the rule's
  // own fallback, so the first frame — before a saved layout has been read — is
  // already a whole page. The floor and the cap restate the drag's bounds, and
  // they are what keeps a width saved in a wide window from squeezing the Diff
  // pane in a narrow one.
  `.dsh-cg-side{position:relative;flex:none;display:flex;flex-direction:column;width:var(--dsh-cg-side-width,${SIDE_DEFAULT}px);min-width:${SIDE_MIN}px;max-width:min(${SIDE_MAX}px,calc(100% - ${DIFF_MIN}px));min-height:0;border-right:.5px solid var(--dsw-alias-border-l3);background:transparent}`,
  // The two panes are shares of the column rather than fixed heights: the split is
  // saved as a share, so a window that grows makes both lists longer instead of
  // leaving one at a height that no longer fits. `flex-basis:0` is what makes the
  // two panes split by those shares instead of by their content, and `min-height`
  // is the floor the drag states too — a window too short for both floors overflows
  // the sidebar, which is the honest end of a column that cannot hold two lists.
  `.dsh-cg-pane{display:flex;flex-direction:column;flex:1 1 0;min-height:${PANE_MIN}px}`,
  '.dsh-cg-files{position:relative;flex-grow:var(--dsh-cg-files-grow,1)}',
  '.dsh-cg-history{flex-grow:var(--dsh-cg-history-grow,1)}',
  '.dsh-cg-pane+.dsh-cg-pane{border-top:.5px solid var(--dsw-alias-border-l3)}',
  // The two boundaries themselves. Each is the hairline the panes already draw
  // (`.5px`, a seam rather than a rule), with an invisible band around it as the
  // hit target: the handle element is 1px wide so that it covers that hairline,
  // and its `::after` reaches 4px either side, because half a pixel is not
  // something a pointer can be asked to hold. Neither handle takes any layout
  // space — one is positioned on the sidebar's own edge, the other on the upper
  // pane's bottom edge — so adding them moves nothing on the page.
  //
  // `::before` is the indicator: the line brightens towards its middle on hover and
  // stays lit for the length of a drag, which is what makes a boundary read as
  // draggable at rest. The geometry and the gradient are DSH's own pane divider's
  // (`client/ui-dockkit`), so a divider here looks like every other one in the app.
  '.dsh-cg-resize{position:absolute;z-index:2;touch-action:none}',
  '.dsh-cg-resize::before{content:"";position:absolute;opacity:0;transition:opacity .12s ease-out}',
  '.dsh-cg-resize::after{content:"";position:absolute}',
  '.dsh-cg-resize:hover::before,.dsh-cg-resize[data-dragging]::before{opacity:1}',
  // The sidebar's right edge: the handle is laid over the border itself
  // (`right:-1px` starts its 1px span at the padding box, which is where the
  // `.5px` border begins), so the line it lights up is the line that is already
  // drawn there.
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
  // Commit history carries the remote control there, and Changed files nothing. The
  // name is the one part that gives ground, so the count leaves with it as a unit;
  // the control is `flex:none` through `.dsh-cg-tools`, which is what keeps the two
  // ends from ever trading widths.
  //
  // The header states the layout and the title states the type: the small bold
  // caps the title is set in would otherwise be inherited by the control beside
  // it, which draws its own `font:inherit` — the digits inside Sync would come
  // out a weight and a tracking heavier than the same button draws in the sidebar.
  '.dsh-cg-head{flex:none;display:flex;align-items:center;gap:8px;height:30px;padding:0 6px 0 12px}',
  '.dsh-cg-head-title{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-secondary);font-size:11px;font-weight:600;letter-spacing:.02em}',
  '.dsh-cg-list{flex:1 1 auto;min-height:0;overflow:auto;padding:0 6px 8px}',
  // Every scrollport the tab owns — the sidebar's two panes here, the branch
  // dialog's list below, and the diff pane's own scrollers, which state the same
  // binding by sharing this selector — keeps the platform's bar out of the frame
  // until the pointer is inside it. The platform paints a bar for any scrollport
  // that overflows, and a stripe standing in a pane (or in a dialog this narrow)
  // is chrome no one asked to keep: the thumb is bound to `transparent` and
  // rebound to the platform's own colour while the pointer is inside, so the bar
  // arrives with the pointer and leaves with it. Only a colour is rebound — the
  // bar is the same width hidden or shown, so the rows do not shift as the pointer
  // crosses the edge, and the thumb is there to be grabbed the moment it is
  // painted.
  //
  // Nothing here draws a bar of its own. `scrollbar.css` — the platform's — sets
  // the width, the pill shape and the track for every scrollport in the app and
  // reads these two variables for the colour, so a scroller that rebinds them
  // looks like every other one; a scroller that styles `::-webkit-scrollbar`
  // itself does not, which is what made the diff pane's bar a different width,
  // shape and colour from the lists beside it.
  '.dsh-cg-list,.dsh-cg-branch-list,.dsh-cg-diff,.dsh-cg-file-body{--dsh-scrollbar-thumb:transparent;--dsh-scrollbar-thumb-hover:var(--dsw-alias-scrollbar-hover-l2)}',
  '.dsh-cg-list:hover,.dsh-cg-branch-list:hover,.dsh-cg-diff:hover,.dsh-cg-file-body:hover{--dsh-scrollbar-thumb:var(--dsw-alias-scrollbar-bg-l2)}',

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
  // Sync is the remote control in Commit history's header wherever the branch has
  // upstream, and inside it sit both halves of the round trip: each arrow with its
  // divergence count beside it, because the count and the control that resolves
  // it are one thing. The button widens to take the digits, and the arrow of a
  // direction with something to move is a shade stronger than an idle one's. The
  // name is the tooltip's and the accessible label's, not a word on the header:
  // two arrows and two counts already fill what the pane's own name and count
  // leave of that row.
  // Where there is no upstream this button is not drawn at all — Publish branch takes
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
  // of the sync button, the More control, and the commit form's Generate
  // square — which the rule names rather than the toolbar's `.dsh-cg-icon`
  // because that one is the platform's primary button and wears no class of the
  // toolbar's own. The sync button's arrows turn
  // one at a time, which is why the rule names the arrow span and not the
  // button: spinning the whole button would turn the arrow of the half that is
  // not running.
  '.dsh-cg-icon[data-busy=true] svg,.dsh-cg-branch-icon[data-busy=true] svg,.dsh-cg-sync-arrow[data-busy=true] svg,.dsh-cg-commit-generate[data-busy=true] svg{animation:dsh-cg-spin .9s linear infinite}',

  // The sidebar's first row: the Workspace's name on the left, the branch pill
  // beside it, and then the one control the row keeps — More. It draws no rule of
  // its own: the toolbar and the commit form below it are one block of the column,
  // closed together by the form's own hairline (see `.dsh-cg-commit-bar`). Each
  // name carries its own glyph (a directory for the Workspace, a forked commit for
  // the branch), so the row states which is which without either label having to
  // say it; the control is an icon rather than a word because it has to fit the row
  // at its narrowest, which is the sidebar's own floor — the operations behind it
  // are named in the menu, which can afford to be as wide as its words. The remote
  // control is not here: it lives in Commit history's header, beside the commits it
  // moves.
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
  '.dsh-cg-workspace{flex:1 1 auto;display:flex;align-items:center;gap:4px;min-width:0;margin-right:6px;font-size:12px;font-weight:600;color:var(--dsw-alias-label-primary)}',
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
  // The icon-button group both rows end with — More in the sidebar's first row
  // and the remote control in Commit history's header. `margin-left:auto` is what
  // keeps the group at its row's right edge however long the name on the left is,
  // and `flex:none` is what makes the group the fixed part of the row: the control
  // is never asked to give up a pixel of the width its own glyph and counts need.
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
  // A pill on a detached HEAD carries the `detached` badge as well, and that badge
  // is fixed: it is `flex:none`, so it never shrinks with the name. The floor below
  // is therefore the pill's own parts with the name's place empty — the icon and
  // its gap, the badge and its gap, the badge itself, and the pill's 12px of
  // padding (12 + 4 + 4 + 22 + 12, measured from the two-glyph Chinese badge the
  // floor was stated for) — or the marker would spill out of a pill shortened to
  // its icon and sit on the button beside it. The sum is written in pixels because
  // the tip span is not the pill: an `em` here would be measured against the
  // span's own type, not the badge's.
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
  // The two edge fades, the same rhythm as the Terminal tab's command dialog: a
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
  // The heading that opens each run of rows — Current branch, Local branches,
  // Remote branches. It sits in the list's own column so the three groups read as
  // one list, and the first one carries no gap above it.
  '.dsh-cg-branch-group{flex:none;margin-top:8px;padding:0 8px;color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:18px}',
  '.dsh-cg-branch-group:first-child{margin-top:0}',
  '.dsh-cg-branch-row{flex:none;display:flex;align-items:center;gap:8px;width:100%;height:28px;padding:0 8px;border:0;border-radius:var(--dsw-radius-sm,6px);background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;text-align:left;cursor:pointer}',
  // The row under the pointer and the row that is selected are painted the same
  // way, on purpose: the fill is the dialog's one "this is the row" colour, so the
  // selected row keeps reading as selected while the pointer is away on the
  // footer's buttons. The selection itself is the click's, not the pointer's, so
  // moving the mouse over a row can never change what Switch would apply.
  '.dsh-cg-branch-row:hover{background:var(--dsw-alias-interactive-bg-hover)}',
  '.dsh-cg-branch-row[aria-selected=true]{background:var(--dsw-alias-interactive-bg-hover)}',
  '.dsh-cg-branch-row-name{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:var(--ds-font-family-code,ui-monospace,monospace)}',

  // The create dialog's name field, which sits above the filter and is the one
  // control in that dialog the reader has to fill in. It is spaced like the
  // filter below it so the two read as one column of fields.
  '.dsh-cg-branch-name{flex:none;width:100%;box-sizing:border-box}',
  '.dsh-cg-branch-name+.dsh-cg-branch-filter{margin-top:8px}',

  // One row of the delete dialog. It is a `label` rather than a `button` because
  // the checkbox inside it is the control: a click anywhere on the row is a click
  // on that box, which is what makes a 28px row a 28px target, and the wrapper is
  // what carries the ticked/unticked state for the row's own painting.
  '.dsh-cg-delete-row{flex:none;display:flex;align-items:center;gap:8px;width:100%;height:28px;padding:0 8px;border-radius:var(--dsw-radius-sm,6px);color:var(--dsw-alias-label-primary);font-size:12px;cursor:pointer}',
  '.dsh-cg-delete-row:hover{background:var(--dsw-alias-interactive-bg-hover)}',
  '.dsh-cg-delete-row:has(.dsh-cg-delete-check:checked){background:var(--dsw-alias-interactive-bg-hover)}',
  // The branch HEAD is on: shown, marked, and not a choice.
  '.dsh-cg-delete-row:has(.dsh-cg-delete-check:disabled){cursor:default}',
  '.dsh-cg-delete-row:has(.dsh-cg-delete-check:disabled):hover{background:transparent}',
  '.dsh-cg-delete-check{flex:none;margin:0;accent-color:var(--dsw-alias-state-error-primary)}',
  '.dsh-cg-delete-name{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:var(--ds-font-family-code,ui-monospace,monospace)}',
  // The facts behind the mark — the upstream and the two counts. They give ground
  // before the name does: a name ending in `…` names nothing, while a lost count
  // is one the badge beside it has already spoken for.
  '.dsh-cg-delete-meta{flex:0 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-tertiary);font-family:var(--ds-font-family-code,ui-monospace,monospace)}',
  // The safety mark. Every row has one and only the ones worth reading are
  // coloured: a `safe` row's mark is the muted label colour and reads as the
  // absence of a warning, which is what it is.
  '.dsh-cg-safety{flex:none;padding:0 6px;border-radius:var(--dsw-radius-sm,6px);background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:18px}',
  '.dsh-cg-safety[data-safety=unmerged],.dsh-cg-safety[data-safety=unpushed],.dsh-cg-safety[data-safety=gone]{color:var(--dsw-alias-state-warn-primary)}',
  '.dsh-cg-safety[data-safety=current]{color:var(--dsw-alias-label-secondary)}',

  // One line of the dialog's own state: still reading, a directory that is not a
  // repository, no branch at all, a filter that matched nothing. A failure is the
  // error dialog's, so nothing here paints one.
  '.dsh-cg-dialog-hint{margin:0;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:1.7}',
  // The "too many branches" line follows the list's wrapper, not the scroller
  // inside it.
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
  // sidebar's rows start and end on the same two edges. The field owns the first
  // row — with the Generate square held inside its own frame, which is narrow
  // enough to share the row with the message — and Commit owns the second; what
  // the model's check found, when it found anything, is the line between them.
  //
  // The button is the platform's own primitive, so its fill, radius, type scale,
  // and focus colour are the platform's and follow the theme without a rule here.
  // The field is not: the platform's `Input` atom is single-line, and a commit
  // message is not, so this is a `textarea` styled here. What it borrows from that
  // atom is the appearance — the half-pixel border, the layer fill, the dimmed
  // placeholder, and the business token on focus — so the two still read as the
  // app's field; what it does not borrow is the radius, which is the `sm` button's
  // own corner below it, because these rows are one form.
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
  // 26px it keeps at its shortest is the 28px the button below it is once the
  // frame's border is counted — and it is also what the square inside the frame is
  // sized against, so neither the square nor the button can make the form taller
  // than the field it belongs to. Four of those lines is the 86px past which the
  // field scrolls instead of pushing the Changed files pane down the column.
  '.dsh-cg-commit-bar{flex:none;display:flex;flex-direction:column;gap:6px;padding:0px 10px 8px;border-bottom:.5px solid var(--dsw-alias-border-l3)}',
  // The frame draws the field and holds the Generate glyph, and the two are laid
  // out independently: the field is the frame's only box in flow and spans it
  // whole, and the glyph is positioned against the frame's own corner. That is
  // what keeps the field's own right edge — and therefore the scroll bar the
  // platform draws inside it when the message passes four lines — against the
  // frame's right border rather than a column short of it, where a bar floating
  // in the middle of the field would read as belonging to nothing. The glyph's
  // place is then reserved by the field's own right padding, so what the two
  // share is the box rather than the line: no character of the message can reach
  // the glyph's column at any width.
  // The frame's fill is the layer *above* the sidebar's own, not the sidebar's:
  // `bg-layer-1` is the page canvas, and the wallpaper rule below clears it so
  // the image shows through — a field that borrows that token loses its fill
  // with the canvas and takes the placeholder's surface with it. One step up is
  // a fill the wallpaper cannot reach: the same white in light, and a shade
  // lighter than the sidebar in dark, so the field reads as a control laid over
  // the image rather than a hole cut in it.
  '.dsh-cg-commit-frame{position:relative;box-sizing:border-box;width:100%;border:0.5px solid var(--dsw-alias-border-l4);border-radius:var(--dsw-radius-sm);background:var(--dsw-alias-bg-layer-2)}',
  '.dsh-cg-commit-frame:focus-within{border-color:var(--dsw-alias-state-business-primary)}',
  '.dsh-cg-commit-frame:has(.dsh-cg-commit-input:disabled){opacity:.6}',
  // The right padding is the glyph's column: its 24px, the 7px it is held off the
  // border by (see below), and a pixel of air. The field is a `textarea` whose
  // scroll bar the platform draws inside its own right edge, so the padding is
  // what keeps the message clear of the glyph while the bar still lands on the
  // border.
  '.dsh-cg-commit-input{display:block;box-sizing:border-box;width:100%;min-height:26px;max-height:86px;padding:3px 32px 3px 8px;border:0;outline:none;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;line-height:20px;resize:none;overflow-y:auto}',
  '.dsh-cg-commit-input::placeholder{color:var(--dsw-alias-label-dimmed)}',
  '.dsh-cg-commit-input:disabled{cursor:not-allowed}',
  // The Generate glyph: a bare button with no fill, no border, and no radius of
  // its own, because anything drawn around it would be a second box inside the
  // field's box — a button beside the message rather than something done to it.
  // It rides the frame's top-right corner rather than the field's, so it stays on
  // the message's first line while the field grows to four of them, and it is held
  // off the right border by the width of the scroll bar the platform draws there
  // plus a pixel of air: the bar is 5px of the field's own box, and a glyph drawn
  // over the strip it scrolls in would cover the message's own scroll thumb.
  //
  // Its 24px and its 1px offset are the field's own 26px at rest, which is what
  // keeps the frame from growing taller than the button below it. The only thing
  // the glyph says on hover is that it is live: its colour steps up from the
  // toolbar icons' own tertiary to the primary label, and nothing else moves or
  // appears.
  '.dsh-cg-commit-generate{position:absolute;top:1px;right:calc(var(--dsh-scrollbar-width,5px));display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;padding:0;border:0;border-radius:var(--dsw-radius-sm);background:transparent;color:var(--dsw-alias-label-tertiary);font:inherit;cursor:pointer;transition:color .12s ease}',
  '.dsh-cg-commit-generate:hover:not(:disabled){color:var(--dsw-alias-label-primary)}',
  '.dsh-cg-commit-generate:disabled{color:var(--dsw-alias-label-tertiary);opacity:.45;cursor:default}',
  // The glyph is drawn a shade smaller than the field's own type, so it reads as
  // a mark on the row rather than as a character of the message.
  '.dsh-cg-commit-generate svg{width:14px;height:14px;display:block}',
  // Commit is a row of its own across the whole width: what it records is every
  // change the pane lists, under whatever the field above holds.
  '.dsh-cg-commit-send{width:100%}',
  // What the model's own pre-commit check found: one line under the field, in
  // the warning colour, because it is about the commit rather than about the
  // message — the message above it is written either way. It wraps rather than
  // scrolling: the sidebar has no room for a second scroller, and the sentence is
  // short enough to read as two or three lines when it has to. `pre-line` is what
  // puts each finding the model reported on a line of its own, since the findings
  // travel as one sentence separated by newlines.
  '.dsh-cg-commit-note{margin:0;white-space:pre-line;color:var(--dsw-alias-state-warn-primary);font-size:11.5px;line-height:1.45}',

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
  // The decorations a commit carries: one line of chips, which is a scroller
  // because three names can be wider than the sidebar. The chip used to cap a
  // name at 110px with an ellipsis, which for a name that long only wrapped it —
  // a filled accent chip two lines tall beside its one-line neighbours, and the
  // end of the name nowhere at all. The row is the better place for that
  // overflow: the line stays one line (`flex-wrap:nowrap`, the default, stated
  // for the reader), the chips keep their names whole, and what does not fit sits
  // to the right of the row, where the pointer reaches it (`RefRow` in `git.tsx`
  // walks it there, and a trackpad can too).
  //
  // The bar is hidden outright rather than bound to the platform's `transparent`
  // thumb the panes around it use: those panes are tall, and this row is 14px, so
  // a bar that keeps its width even while invisible would take that width out of
  // the chips. Both spellings are needed — the standard property is what a
  // browser reading `scrollbar-width` obeys, and the pseudo-element rule is the
  // one Chromium honours once the platform has styled `::-webkit-scrollbar` at
  // all. The platform's own dockkit tab strip, the one other sideways scroller in
  // the app, hides its bar exactly this way.
  '.dsh-cg-refs{display:flex;flex-wrap:nowrap;gap:4px;overflow-x:auto;overflow-y:hidden;scrollbar-width:none}',
  '.dsh-cg-refs::-webkit-scrollbar{display:none}',
  // A branch or tag decoration is a filled chip in the theme's accent, not an
  // outlined one. The accent is `--dsw-alias-state-business-primary`, the alias
  // every accent-marked surface in the platform reads (focus rings, `Tag`'s info
  // tone), and it is the one a theme preset moves: `--dsw-alias-brand-primary`
  // would be wrong here, since the platform defines it as the foreground color
  // itself, which is what paints the monochrome primary Button.
  //
  // The chip takes the width of its name and stays on one line, which is what
  // makes the row beside it scrollable rather than the name unreadable.
  '.dsh-cg-ref{flex:none;white-space:nowrap;padding:0 4px;border-radius:var(--dsw-radius-xs,4px);background:var(--dsw-alias-state-business-primary);color:var(--dsw-alias-label-primary-foreground);font-size:10px;line-height:14px}',

  // Notes: empty lists and loading rows. A failure is the error dialog's, so
  // nothing here paints one.
  '.dsh-cg-note{padding:8px 12px;color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:1.7}',

  // 3. Diff pane.
  '.dsh-cg-main{flex:1 1 auto;display:flex;flex-direction:column;min-width:0;min-height:0}',
  '.dsh-cg-main-head{flex:none;display:flex;align-items:center;gap:8px;min-height:30px;padding:4px 8px 4px 12px;border-bottom:.5px solid var(--dsw-alias-border-l3);background:var(--dsw-alias-bg-base)}',
  '.dsh-cg-main-title{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:var(--ds-font-family-code,ui-monospace,monospace);font-size:11.5px;color:var(--dsw-alias-label-secondary)}',
  '.dsh-cg-main-subtitle{flex:none;max-width:45%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-tertiary);font-size:11px}',
  '.dsh-cg-stats{flex:none;display:flex;gap:6px;font-family:var(--ds-font-family-code,ui-monospace,monospace);font-size:11px}',
  '.dsh-cg-added{color:var(--dsw-alias-state-success-primary)}',
  '.dsh-cg-deleted{color:var(--dsw-alias-state-error-primary)}',
  // The pane's own scroller, vertical only. Sideways movement belongs to the
  // file it is about, so it is each file's code area that scrolls — see
  // `.dsh-cg-file-body` below — and the pane itself never does. That is also what
  // keeps a file's title from sliding out from under it: a title is outside the
  // scroller that moves.
  '.dsh-cg-diff{flex:1 1 auto;min-height:0;overflow-x:hidden;overflow-y:auto;background:var(--dsw-alias-bg-base)}',

  // An empty pane centres its message. A failure never renders here: it opens
  // the error dialog, so the box holds only the state it belongs to.
  '.dsh-cg-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;height:100%;padding:24px;text-align:center;color:var(--dsw-alias-label-tertiary);user-select:none}',
  '.dsh-cg-empty-title{font-size:14px;font-weight:600;color:var(--dsw-alias-label-secondary)}',
  '.dsh-cg-empty-text{font-size:12px;max-width:60ch;line-height:1.7}',

  // One file of a patch: its title, and the strips of code under it.
  //
  // The title is full-width and its path is the part that gives way, so a title
  // is one line whatever the pane's width and whatever the code under it does.
  '.dsh-cg-file-head{display:flex;align-items:center;gap:8px;padding:6px 12px;background:var(--dsw-alias-bg-layer-1);font-family:var(--ds-font-family-code,ui-monospace,monospace);font-size:11px}',
  '.dsh-cg-file-path{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-secondary)}',

  // One line per boundary, never two. A title or a strip of code draws a rule
  // along its top whenever something precedes it, and only the last thing in the
  // pane draws one along its bottom. A title that closed itself as well would stack
  // its own rule on the next one's, leaving a single boundary at twice the weight —
  // which is what a list of closed files used to look like, and why the header
  // above the list is the one rule that is not drawn here.
  '.dsh-cg-file-head:not(:first-child),.dsh-cg-file-body:not(:first-child){border-top:.5px solid var(--dsw-alias-border-l3)}',
  '.dsh-cg-diff>:last-child{border-bottom:.5px solid var(--dsw-alias-border-l3)}',

  // The disclosure control: one asset, turned by the stylesheet. The chevron
  // points right when the file is closed and down once it is open, so the state
  // `aria-expanded` already carries is the only thing the drawing depends on.
  '.dsh-cg-file-toggle{flex:none;display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;padding:0;border:0;border-radius:var(--dsw-radius-xs,4px);background:transparent;color:var(--dsw-alias-label-tertiary);font:inherit;cursor:pointer}',
  '.dsh-cg-file-toggle:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}',
  '.dsh-cg-file-toggle svg{width:12px;height:12px;display:block;transition:transform .12s ease}',
  '.dsh-cg-file-toggle[aria-expanded=true] svg{transform:rotate(90deg)}',

  // One file's code, and the only thing in the pane that scrolls sideways.
  // `overflow-y:hidden` is deliberate rather than incidental: left `visible`
  // beside a non-visible `overflow-x`, the used value would become `auto` and the
  // strip would grow a vertical scrollbar of its own around content that has
  // already been given all the height it needs.
  '.dsh-cg-file-body{overflow-x:auto;overflow-y:hidden}',

  // The rows are laid out in a strip that shrink-wraps the widest of them, and
  // is never narrower than the scroller itself. A scroller sizes its own
  // children to the scroller, so without this strip a full-width row — the `@@`
  // bar above all — would stop at the pane's edge while the code under it ran
  // on, which reads as a row that has been cut off. `min-width:100%` is what
  // keeps the code backgrounds reaching the right edge when every row is short.
  '.dsh-cg-file-scroll{width:max-content;min-width:100%}',

  // The `@@` scope line. It is drawn inside the file's scroller, so a wide scope
  // travels with the code it scopes instead of hanging over the title, and the
  // strip above is what gives the bar the width of that code rather than the
  // width of the pane: measured, a 47-character scope over code that runs to
  // 1245px in a 500px pane draws a 1245px bar.
  //
  // It is a band, not a box: the colour alone separates it from the code above and
  // below, with no rule of its own along either edge.
  //
  // A scope longer than every line under it is the one case that widens a file,
  // and it is taken deliberately: the alternative is the ellipsis, which is the
  // old behaviour and is what made a head look cut off. It is the last resort
  // here, not the first.
  '.dsh-cg-hunk-head{padding:2px 12px;background:var(--dsw-alias-markdown-code-block-banner,var(--dsw-alias-bg-layer-2));color:var(--dsw-alias-label-tertiary);font-family:var(--ds-font-family-code,ui-monospace,monospace);font-size:11px;white-space:pre;overflow:hidden;text-overflow:ellipsis}',

  // One body line: old number, new number, marker, text. `width:max-content`
  // with `min-width:100%` is what gives every row the full width for its
  // background while still letting a long line scroll the pane sideways.
  '.dsh-cg-line{display:grid;grid-template-columns:44px 44px 14px minmax(0,1fr);width:max-content;min-width:100%;font-family:var(--ds-font-family-code,ui-monospace,monospace);font-size:12px;line-height:18px}',
  // An added or deleted row is tinted with the state colour it carries rather
  // than with the theme's own `file-diff-*-bg`, at a fifth of its strength — which
  // is how the theme writes a colour at partial strength; a bare `/20` is not CSS.
  //
  // The tint is drawn once, on the row, and nothing else draws a background over
  // it. That is what keeps a row one colour from edge to edge: give the number
  // columns a tint of their own and it composites on top of the row's, so the
  // gutter reads as a deeper shade of the code beside it instead of the same one.
  '.dsh-cg-line[data-kind=add]{background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 20%,transparent)}',
  '.dsh-cg-line[data-kind=del]{background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 20%,transparent)}',
  '.dsh-cg-line[data-kind=meta]{color:var(--dsw-alias-label-tertiary)}',
  '.dsh-cg-no{padding-right:8px;text-align:right;color:var(--dsw-alias-label-tertiary);user-select:none}',
  // Only the marker carries the state colour. The code keeps the reading colour:
  // same-hue text on a same-hue row measured 1.5:1 in the built-in light theme
  // and 1.8:1 on a teal one, which is a row nobody can read.
  '.dsh-cg-sign{user-select:none;color:var(--dsw-alias-label-tertiary)}',
  '.dsh-cg-line[data-kind=add] .dsh-cg-sign{color:var(--dsw-alias-state-success-primary)}',
  '.dsh-cg-line[data-kind=del] .dsh-cg-sign{color:var(--dsw-alias-state-error-primary)}',
  // `white-space:pre` keeps indentation; a tab would otherwise collapse to one
  // space and every diff of indented code would read as if it were flat.
  '.dsh-cg-text{white-space:pre;padding-right:16px}',
  '.dsh-cg-line[data-kind=meta] .dsh-cg-text{grid-column:1 / -1;padding-left:12px}',

  // 4. Wallpaper.
  //
  // `dsh-cool-theme` paints a fixed wallpaper layer behind the shell and marks
  // the document with `ct-bg-on` for as long as that layer is mounted; without
  // the theme, or with its wallpaper switched off, the class is absent. The
  // theme clears the shell's own canvas surfaces by name — the conversation
  // root, the layout columns, the right sidebar — but a tab that paints its own
  // surfaces still covers the image with them. This page paints two: `bg-base`
  // on the page and its Diff pane, and `bg-layer-1` on the file titles — the
  // sidebar itself is transparent and so needs no token. Rebinding those two
  // tokens inside this root is what lets the image through, and it names nothing
  // about the page's parts.
  //
  // Everything raised above that canvas keeps its fill: the hover and selection
  // washes, the ref chips, the `@@` banner's layer-2 band, the commit field —
  // which is painted in `bg-layer-2` for exactly this reason (see the commit
  // form above) — and the branch dialog, which the platform portals outside this
  // root. The scoping is the whole contract — a profile without the theme never
  // matches the selector, so the tab draws its own opaque surfaces exactly as it
  // did before.
  `html.ct-bg-on .${GIT_ROOT_CLASS}{--dsw-alias-bg-base:transparent;--dsw-alias-bg-layer-1:transparent}`,
].join('\n')

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
export function insertGitStyles(): () => void {
  const element = document.createElement('style')
  element.setAttribute('data-plugin', __DSH_CG_PLUGIN_ID__)
  element.setAttribute('data-dsh-cool-git', 'styles')
  element.textContent = GIT_CSS
  document.head.appendChild(element)
  return () => {
    element.remove()
  }
}
