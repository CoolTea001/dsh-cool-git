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

import {
  useCallback,
  useRef,
  type PointerEvent as ReactPointerEvent,
  type ReactElement,
} from 'react'

/** The localStorage entry holding both boundaries, as one JSON object. */
const LAYOUT_KEY = 'dsh-cool-git.layout.v1'

/**
 * The sidebar's width until it is dragged.
 *
 * The width this page was designed at (see the toolbar rules in `styles.ts`), and
 * the width the stylesheet falls back to for the frames before the saved layout is
 * published.
 */
export const SIDE_DEFAULT = 340

/**
 * The narrowest the sidebar may be drawn.
 *
 * The toolbar sets this floor rather than the lists do: two parts of that row may
 * give ground — the branch's name first, down to the icon alone, and then the
 * Workspace's name — while the remote control and 刷新 beside them are fixed.
 * Shorter than this and both names are gone and those controls would run over the
 * sidebar's own edge.
 */
export const SIDE_MIN = 260

/** The widest a drag may leave the sidebar, however wide the window is. */
export const SIDE_MAX = 560

/** The narrowest the Diff 查看区 may be drawn, whatever the sidebar asks for. */
export const DIFF_MIN = 320

/**
 * The shortest either sidebar pane may be drawn.
 *
 * A pane header is 30px and a changed-path row 26px, so this is a header and a
 * couple of rows: the point below which a pane stops being a list. Both the drag
 * and the panes' own `min-height` state it, so a window resized *after* a split was
 * dragged still keeps each pane on screen.
 */
export const PANE_MIN = 96

/** Which way a boundary moves, and so which pointer coordinate drives it. */
export type ResizeAxis = 'col' | 'row'

/** The two sizes the page remembers between visits. */
export interface GitLayout {
  /** The sidebar's width, in CSS pixels. */
  readonly sideWidth: number
  /** The share of the sidebar's pane track that 变更文件区 takes, from 0 to 1. */
  readonly filesShare: number
}

/** The layout of a page nobody has resized. */
export const DEFAULT_LAYOUT: GitLayout = { sideWidth: SIDE_DEFAULT, filesShare: 0.5 }

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
export function readLayout(): GitLayout {
  let raw: string | null
  try {
    raw = localStorage.getItem(LAYOUT_KEY)
  } catch {
    // Storage is not available to this page (a sandboxed frame, or storage off):
    // the page keeps the default layout for as long as it is open.
    return DEFAULT_LAYOUT
  }
  if (raw === null) return DEFAULT_LAYOUT

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return DEFAULT_LAYOUT
  }
  const saved = (typeof parsed === 'object' && parsed !== null ? parsed : {}) as Record<string, unknown>
  const { sideWidth, filesShare } = saved
  return {
    sideWidth: typeof sideWidth === 'number' && Number.isFinite(sideWidth) && sideWidth > 0
      ? sideWidth
      : DEFAULT_LAYOUT.sideWidth,
    filesShare: typeof filesShare === 'number' && Number.isFinite(filesShare) && filesShare > 0 && filesShare < 1
      ? filesShare
      : DEFAULT_LAYOUT.filesShare,
  }
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
export function writeLayout(layout: GitLayout): void {
  try {
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout))
  } catch {
    /* persistence is a convenience, never a precondition */
  }
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
export function sideWidthCeiling(available: number): number {
  return Math.max(SIDE_MIN, Math.min(SIDE_MAX, available - DIFF_MIN))
}

/**
 * Clamp a preferred sidebar width to what this page can draw.
 *
 * @param preferred - the width the pointer, or the saved layout, asks for.
 * @param available - the page's width, in CSS pixels.
 * @returns the width to draw.
 */
export function clampSideWidth(preferred: number, available: number): number {
  return Math.min(Math.max(preferred, SIDE_MIN), sideWidthCeiling(available))
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
export function splitCeiling(track: number): number {
  return Math.max(PANE_MIN, track - PANE_MIN)
}

/**
 * Clamp a preferred 变更文件区 height to the track it shares with 提交历史.
 *
 * @param preferred - the height the pointer asks for, in CSS pixels.
 * @param track - the height the two panes share, in CSS pixels.
 * @returns the height to draw.
 */
export function clampFilesHeight(preferred: number, track: number): number {
  return Math.min(Math.max(preferred, PANE_MIN), splitCeiling(track))
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
export function shareOf(height: number, track: number): number {
  if (!(track > 0)) return DEFAULT_LAYOUT.filesShare
  const floor = Math.min(PANE_MIN / track, 0.5)
  return Math.min(Math.max(height / track, floor), 1 - floor)
}

/**
 * The pointer's own coordinate on one axis, in viewport pixels.
 *
 * @param axis - the boundary being dragged.
 * @param event - the pointer event.
 * @returns X for the sidebar's width, Y for the panes' divider.
 */
function along(axis: ResizeAxis, event: ReactPointerEvent<HTMLDivElement>): number {
  return axis === 'col' ? event.clientX : event.clientY
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
export function ResizeHandle(props: {
  /** Which axis the boundary moves along, and so which pointer coordinate drives it. */
  readonly axis: ResizeAxis
  /** The size the page is drawing as the gesture starts, in CSS pixels. */
  readonly onStart: () => number
  /** Draw the size the pointer now implies. Called at most once a frame. */
  readonly onDrag: (size: number) => void
  /** Record and draw the size the gesture settled on. */
  readonly onCommit: (size: number) => void
  /** The gesture is over without a size: draw the recorded layout again. */
  readonly onEnd: () => void
}): ReactElement {
  /** Whether a gesture this component started is still running. */
  const dragging = useRef(false)
  /** The pointer's coordinate where the gesture started. */
  const origin = useRef(0)
  /** The size the page was drawing where the gesture started. */
  const start = useRef(0)
  /** The pointer's latest coordinate on this axis. */
  const latest = useRef(0)
  /** The frame awaiting the pointer's latest coordinate, if one is. */
  const frame = useRef<number | null>(null)
  // The handlers are installed once per gesture and outlive the render that
  // started it, so what they call is read from here rather than closed over: a
  // re-render during a drag (a refresh answering, the page picking up a new
  // layout) must not leave the gesture calling a stale callback.
  const live = useRef(props)
  live.current = props

  /** The size the pointer's latest coordinate implies. */
  const implied = (): number => start.current + (latest.current - origin.current)

  const cancelFrame = (): void => {
    if (frame.current !== null) {
      cancelAnimationFrame(frame.current)
      frame.current = null
    }
  }

  /**
   * End the gesture, and either record a size or re-state the layout.
   *
   * @param element - the handle the gesture was captured on.
   * @param pointerId - the pointer to release.
   * @param moved - whether this release holds a size the pointer chose.
   */
  const settle = (element: HTMLDivElement, pointerId: number, moved: boolean): void => {
    dragging.current = false
    element.toggleAttribute('data-dragging', false)
    if (element.hasPointerCapture(pointerId)) element.releasePointerCapture(pointerId)
    cancelFrame()
    if (moved && latest.current !== origin.current) live.current.onCommit(implied())
    else live.current.onEnd()
  }

  const onPointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>): void => {
    // The primary button alone: a right-click on a boundary is a context menu, and
    // a middle-click is a paste or an autoscroll, neither of them a resize.
    if (event.button !== 0) return
    // Before the capture, so the press neither starts a text selection nor hands
    // the keyboard to whatever is under the pointer.
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    event.currentTarget.toggleAttribute('data-dragging', true)
    origin.current = along(live.current.axis, event)
    latest.current = origin.current
    start.current = live.current.onStart()
    dragging.current = true
  }, [])

  const onPointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>): void => {
    if (!dragging.current) return
    // Capture is what keeps the moves coming once the pointer leaves this 1px line
    // — the whole point of the gesture — so a move without it belongs to another
    // pointer, or to a capture that has already been lost.
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
    latest.current = along(live.current.axis, event)
    if (frame.current !== null) return
    frame.current = requestAnimationFrame(() => {
      frame.current = null
      live.current.onDrag(implied())
    })
  }, [])

  const onPointerUp = useCallback((event: ReactPointerEvent<HTMLDivElement>): void => {
    if (!dragging.current) return
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
    latest.current = along(live.current.axis, event)
    settle(event.currentTarget, event.pointerId, true)
  }, [])

  // The end that is not a release: the pointer was cancelled, or the capture was
  // taken away. Neither is a size the reader chose, so the page is put back.
  const onPointerCancel = useCallback((event: ReactPointerEvent<HTMLDivElement>): void => {
    if (!dragging.current) return
    settle(event.currentTarget, event.pointerId, false)
  }, [])

  return (
    <div
      className={props.axis === 'col' ? 'dsh-cg-resize dsh-cg-col-resize' : 'dsh-cg-resize dsh-cg-row-resize'}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onLostPointerCapture={onPointerCancel}
    />
  )
}
