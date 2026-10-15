/**
 * The Git conversation view.
 *
 * The page is the whole of the tab: a sidebar carrying the changed-path list
 * above the commit history, and a diff pane taking every remaining pixel.
 * Changed paths come from `git status`, the history from `git log`, and the
 * diff pane shows either one path's patch against HEAD or one commit's whole
 * patch (see `api.ts` for the routes and `diff.ts` for the patch parser). The
 * sidebar's second row is the commit form — a message field and the button that
 * stages every change the changed-path list holds and records them as one commit
 * — and the two panes stack under it. Both of the sidebar's boundaries — its right
 * edge and the divider between the two lists — are the reader's to drag, and both
 * sizes are remembered between visits (see `layout.tsx`).
 *
 * The page owns no repository state of its own: every answer is a plain value
 * fetched from the Host, and the only local state is which row is selected, which
 * answer is current, which failure the dialog is stating, which operation is in
 * flight — a checkout, one half of a remote round trip, or the commit the
 * changed-path list asks for — each of which is what disables the other
 * controls, and where the two boundaries were left. That keeps a manual refresh
 * honest — it re-reads `status` and `log`, and the diff pane re-reads whatever
 * it is showing.
 *
 * Every failure the page can meet is reported in one place: the error dialog. A
 * refused branch switch, a pull or push the remote turned down, a read the Host
 * could not answer, and a transport that never reached the Host all open that
 * dialog, so there is one failure shape no matter how a request went wrong. The
 * one exception is `no-repo`: a directory that is not a repository is the panes'
 * own empty state, not a failure, and it never opens a dialog.
 *
 * The page is full-bleed, the same way the terminal tab is: the root class gives
 * the stylesheet a handle on this subtree, the root declares the shell's
 * composer-overlay hook (which drops the transcript width handles), and the
 * mounted View suppresses the composer seat the shell mounts for every View —
 * see `chrome.ts`.
 */

import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from 'react'
import { Button, Input, Modal, Tooltip } from '@deepseek-ai/dsh-client-ui-primitives'
import {
  checkoutBranch,
  commitAll,
  fetchBranches,
  fetchCommit,
  fetchDiff,
  fetchLog,
  fetchStatus,
  pullBranch,
  pushBranch,
} from './api.js'
import { suppressComposerSeat } from './chrome.js'
import { displayPath, parsePatch, type DiffDoc, type DiffFile, type DiffLine } from './diff.js'
import {
  IconArrowRight,
  IconBranch,
  IconCheck,
  IconCopy,
  IconFolder,
  IconPublish,
  IconPull,
  IconPush,
  IconRefresh,
} from './icons.js'
import {
  clampFilesHeight,
  clampSideWidth,
  readLayout,
  ResizeHandle,
  shareOf,
  writeLayout,
  type GitLayout,
  type ResizeAxis,
} from './layout.js'
import type { MessageKey, Translate } from './locales.js'
import { GIT_ROOT_CLASS } from './styles.js'
import type {
  ChangedFile,
  ChangeKind,
  CommitSummary,
  Failure,
  LogPayload,
  StatusPayload,
} from '../shared/contract.js'

/** How many commits the history pane asks for. */
const LOG_LIMIT = 60

/** Body lines the diff pane will draw before it stops and says how many are left. */
const MAX_DIFF_ROWS = 6000

/** How long the copy button reports success before returning to its idle label. */
const COPY_FEEDBACK_MS = 1200

/**
 * The width cap this plugin puts on every hover bubble.
 *
 * The primitive's own cap is half the viewport, which makes a bubble's shape a
 * function of the window rather than of its text: the same label reads as one
 * line on a laptop and as a slab across a wide screen. A fixed cap keeps the
 * bubble the same size wherever the page is open, and it only ever bites a
 * label long enough to need it — a short one still shrink-wraps its text.
 */
const TOOLTIP_MAX_WIDTH = 500

/** The single letter each changed-path row shows. */
const KIND_LETTER: Readonly<Record<ChangeKind, string>> = {
  added: 'A',
  modified: 'M',
  deleted: 'D',
  renamed: 'R',
  copied: 'C',
  typechange: 'T',
  untracked: 'U',
  conflicted: '!',
  unknown: '?',
}

/** The dictionary entry each changed-path row names its state with. */
const KIND_KEY: Readonly<Record<ChangeKind, MessageKey>> = {
  added: 'kind.added',
  modified: 'kind.modified',
  deleted: 'kind.deleted',
  renamed: 'kind.renamed',
  copied: 'kind.copied',
  typechange: 'kind.typeChange',
  untracked: 'kind.untracked',
  conflicted: 'kind.conflicted',
  unknown: 'kind.unknown',
}

/** The half of a remote round trip that is running, if any. */
type RemoteRun = 'pull' | 'push'

/** Which row the diff pane is showing, if any. */
type Selection =
  | { readonly kind: 'file'; readonly file: ChangedFile }
  | { readonly kind: 'commit'; readonly commit: CommitSummary }

/** The diff pane's current answer, or the fact that it is still loading. */
interface DocState {
  /** Identity of the selection this answer belongs to. */
  readonly key: string
  readonly loading: boolean
  readonly error?: string
  readonly doc?: DiffDoc
  readonly truncated?: boolean
  readonly binary?: boolean
  readonly commit?: CommitSummary & { readonly body: string }
  readonly merge?: boolean
}

/** One line of the flattened diff the pane renders. */
type FlatRow =
  | { readonly type: 'file'; readonly file: DiffFile }
  | { readonly type: 'hunk'; readonly header: string }
  | { readonly type: 'line'; readonly line: DiffLine }

/**
 * One row under a file's title: a hunk header or a body line.
 *
 * Spelled as the complement of the row above so the two cannot drift: a file row
 * belongs to the title, and nothing that draws a body row has to know it exists.
 */
type BodyRow = Exclude<FlatRow, { readonly type: 'file' }>

/** One file's share of the patch: its title, and the rows under it. */
interface DiffGroup {
  /** Stable identity for the group, within one patch. */
  readonly id: string
  /** The file, or null when the patch names one file and the pane header already did. */
  readonly file: DiffFile | null
  readonly body: readonly BodyRow[]
}

/**
 * The two facts every route answer carries, whatever else it holds.
 *
 * A route answers a payload of its own — status, log, diff, commit, commit-all,
 * branches, checkout, sync — but every one of them says `ok`, and says why when
 * it is false. The readers that only ask those two questions take this shape
 * rather than a union of every payload, so a new route's answer needs no change
 * here to be reportable, and `postJson` normalizes a transport failure into the
 * same shape, which is what keeps the page down to one failure report.
 */
interface RouteOutcome {
  readonly ok?: boolean
  /** Raw diagnostic text: Git's own words, or a transport or seam message. */
  readonly error?: string
  /** The coded refusal, which the page words in the active locale. */
  readonly failure?: Failure
  readonly reason?: string
}

/**
 * The widest shape of a route answer, as the diff pane reads one.
 *
 * The pane's own readers need more than the outcome above: the patch, the flags
 * that qualify it, and the commit it belongs to. A route whose answer the pane
 * renders therefore satisfies this shape as well.
 */
interface RouteAnswer extends RouteOutcome {
  readonly patch?: string
  readonly truncated?: boolean
  readonly binary?: boolean
  readonly commit?: CommitSummary & { readonly body: string }
  readonly merge?: boolean
  readonly branches?: readonly string[]
  readonly current?: string | null
}

/**
 * Everything the error dialog states about one failed action.
 *
 * The dialog is the page's only error report: a refused branch switch, a pull or
 * push the remote turned down, a read the Host could not answer, and a transport
 * that never reached the Host all arrive here, so the page has one failure shape
 * to render no matter how a request went wrong. A directory that is not a
 * repository never does — `no-repo` is the panes' own empty state, not a failure.
 */
interface GitError {
  /** The action that failed, as the dialog's heading. */
  readonly title: string
  /** One line per request that did not answer, each carrying its own reason. */
  readonly lines: readonly string[]
}

/**
 * Stable identity for one selection, so a late answer can be discarded.
 *
 * @param selection - the current selection, or null.
 * @returns a string that changes exactly when the selection does.
 */
function selectionKey(selection: Selection | null): string {
  if (selection === null) return ''
  return selection.kind === 'file' ? `file:${selection.file.path}` : `commit:${selection.commit.hash}`
}

/**
 * Turn one route answer into the diff pane's state.
 *
 * `postJson` normalizes every transport failure into an object, so what arrives
 * here is a payload or nothing at all — never a bare value — and the guard only
 * has to ask whether the answer said `ok`.
 *
 * @param t - the page's translate seat, for the reason the answer did not give.
 * @param key - the selection identity this answer belongs to.
 * @param result - the payload the route returned.
 * @returns the pane state to render.
 */
function buildDoc(t: Translate, key: string, result: RouteAnswer | null | undefined): DocState {
  if (result?.ok !== true) {
    return { key, loading: false, error: reasonOf(t, result ?? {}, 'fallback.unknown') }
  }

  const patch = typeof result.patch === 'string' ? result.patch : ''
  const base: DocState = {
    key,
    loading: false,
    doc: parsePatch(patch),
    truncated: result.truncated === true,
  }
  if (result.commit !== undefined) {
    return { ...base, commit: result.commit, merge: result.merge === true }
  }
  return { ...base, binary: result.binary === true }
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
function isNoRepo(payload: RouteOutcome): boolean {
  return payload.reason === 'no-repo'
}

/**
 * The reason one route answer gave for not answering.
 *
 * Three sources, in the order the answer offers them. A coded refusal is the
 * page's to word, so it is read from the dictionary here — this is the one
 * place a refusal becomes a sentence. Text is another program's and is passed
 * through untouched. The fallback is the page's own line for an answer that
 * said nothing at all, and takes the params its sentence interpolates because
 * a heading such as `title.switchBranch` names what failed.
 *
 * @param t - the page's translate seat.
 * @param payload - the route's answer.
 * @param fallback - the entry to state when the answer carried no reason.
 * @param params - the values that entry's placeholders take.
 * @returns the sentence to show.
 */
function reasonOf(
  t: Translate,
  payload: RouteOutcome,
  fallback: MessageKey,
  params?: Readonly<Record<string, string | number>>,
): string {
  const { failure } = payload
  if (failure !== undefined) return t(`error.${failure.code}`, failure.params)
  return typeof payload.error === 'string' && payload.error !== '' ? payload.error : t(fallback, params)
}

/**
 * State one failed request as the error dialog's line for it.
 *
 * The separator between the two halves is the dictionary's rather than a
 * literal here, because the colon that reads correctly between Chinese words is
 * not the one English wants.
 *
 * @param t - the page's translate seat.
 * @param label - the entry naming the request that did not answer.
 * @param payload - the route's answer.
 * @param fallback - the entry to state when the answer carried no reason.
 * @returns one `label: reason` line.
 */
function failureLine(
  t: Translate,
  label: MessageKey,
  payload: RouteOutcome,
  fallback: MessageKey,
): string {
  return t('error.line', { label: t(label), reason: reasonOf(t, payload, fallback) })
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
function flatten(doc: DiffDoc): FlatRow[] {
  const rows: FlatRow[] = []
  const multiple = doc.files.length > 1
  for (const file of doc.files) {
    if (multiple) rows.push({ type: 'file', file })
    for (const hunk of file.hunks) {
      rows.push({ type: 'hunk', header: hunk.header })
      for (const line of hunk.lines) rows.push({ type: 'line', line })
    }
  }
  return rows
}

/**
 * Split the flattened rows into one group per file.
 *
 * The pane draws each file as a section of its own — a title that stays put, and
 * a code area that scrolls sideways under it — so the flat list the rows are
 * built as has to be folded back into files before it is rendered.
 *
 * @param rows - the rows to draw, in order.
 * @returns one group per file, each holding the rows under its title.
 */
function groupFiles(rows: readonly FlatRow[]): DiffGroup[] {
  const groups: DiffGroup[] = []
  let current: { id: string; file: DiffFile | null; body: BodyRow[] } | null = null

  rows.forEach((row, index) => {
    if (row.type === 'file') {
      current = { id: `${displayPath(row.file)}#${index}`, file: row.file, body: [] }
      groups.push(current)
      return
    }
    // A single-file patch emits no file row at all: its rows are all body rows,
    // and the pane's own header already names the file they belong to.
    if (current === null) {
      current = { id: `#${index}`, file: null, body: [] }
      groups.push(current)
    }
    current.body.push(row)
  })

  return groups
}

/**
 * Render a short relative age for one ISO-8601 timestamp.
 *
 * @param t - the page's translate seat.
 * @param iso - the timestamp Git printed.
 * @returns `just now`, a counted unit, or the calendar date once it is old enough.
 */
function relativeTime(t: Translate, iso: string): string {
  const at = Date.parse(iso)
  if (!Number.isFinite(at)) return ''
  const delta = Date.now() - at
  const minute = 60_000
  const hour = 60 * minute
  const day = 24 * hour
  if (delta < minute) return t('time.now')
  if (delta < hour) return t('time.minutes', { count: Math.floor(delta / minute) })
  if (delta < day) return t('time.hours', { count: Math.floor(delta / hour) })
  if (delta < 30 * day) return t('time.days', { count: Math.floor(delta / day) })
  const date = new Date(at)
  const pad = (value: number): string => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/**
 * Split a path into its directory and file name for the sidebar row.
 *
 * @param path - a repository-relative path.
 * @returns the directory (with its trailing slash) and the name.
 */
function splitPath(path: string): { dir: string; name: string } {
  const cut = path.lastIndexOf('/')
  if (cut < 0) return { dir: '', name: path }
  return { dir: path.slice(0, cut + 1), name: path.slice(cut + 1) }
}

/**
 * Shorten one `%D` decoration for the row's tag.
 *
 * @param ref - one decoration, e.g. `HEAD -> main`.
 * @returns the branch or tag name alone.
 */
function refLabel(ref: string): string {
  return ref.replace(/^HEAD -> /, '').replace(/^tag: /, '')
}

/**
 * One pane header's text: its label, and how many rows it is showing.
 *
 * The count is part of the line rather than a badge of its own, so the header
 * reads as one sentence and stays one line however narrow the sidebar gets —
 * the whole thing truncates as a unit instead of the count leaving first. It is
 * written even at zero, because an empty pane and a pane the page never filled
 * are two different states and only the count tells them apart.
 *
 * @param label - the pane's name, already worded by the page's dictionary.
 * @param count - the rows the pane drew.
 * @returns the header's text.
 */
function headText(label: string, count: number): string {
  return `${label} · ${count}`
}

/**
 * The busy glyph: an open ring, turned by the stylesheet.
 *
 * A control that can wait on the network for minutes cannot look the same as an
 * idle one, and a disabled button alone does not say which control is working.
 * It stands in for whichever glyph the wait belongs to, so it has to carry the
 * same weight as the artwork it replaces rather than a stroke of its own.
 *
 * It is the last glyph drawn here rather than under `src/client/assets`: every
 * subject the page shows — the Workspace, branch, pull, push, publish, refresh,
 * copy and check marks — is an asset now, and this ring is alone in being a state
 * with no picture of its own to be named after. See `icons.tsx` for the rest.
 */
const SPINNER_ICON = (
  <svg viewBox="0 0 16 16" aria-hidden="true">
    <circle cx="8" cy="8" r="5.6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.25" />
    <path d="M8 2.4A5.6 5.6 0 0 1 13.6 8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
)

/** Root style: fill the body the shell hands this View. */
const PAGE: CSSProperties = {
  height: '100%',
  width: '100%',
}

/**
 * Render the Git tab's body.
 *
 * @param props - the standard conversation-View props; the session id is used,
 *   and `t` is the locale seat the framework hands every entry that declares a
 *   dictionary namespace.
 * @returns the Git page element.
 */
export function GitView(props: {
  readonly sessionId?: unknown
  readonly t: Translate
}): ReactElement {
  const { t } = props
  const page = useRef<HTMLDivElement | null>(null)
  /** The sidebar itself, and the changed-path pane at the top of it. */
  const side = useRef<HTMLElement | null>(null)
  const filesPane = useRef<HTMLElement | null>(null)
  const sessionId = typeof props?.sessionId === 'string' ? props.sessionId : undefined

  const [status, setStatus] = useState<StatusPayload | null>(null)
  const [log, setLog] = useState<LogPayload | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  /** The branch a checkout is in flight for, or null at rest. */
  const [switching, setSwitching] = useState<string | null>(null)
  /** The half of the remote round trip in flight, or null at rest. */
  const [syncing, setSyncing] = useState<RemoteRun | null>(null)
  /** Whether the changed-path pane's commit is in flight. */
  const [committing, setCommitting] = useState(false)
  const [selection, setSelection] = useState<Selection | null>(null)
  const [doc, setDoc] = useState<DocState | null>(null)
  /** The failure the dialog is stating, or null while none is open. */
  const [error, setError] = useState<GitError | null>(null)
  /** The two boundaries' sizes, read from storage before the first paint. */
  const [layout, setLayout] = useState<GitLayout>(readLayout)
  /** The boundary a drag is holding, or null at rest. */
  const [resizing, setResizing] = useState<ResizeAxis | null>(null)

  // Layout effect, not a passive one: the composer seat is already in the tree
  // when this View mounts, and a passive effect would paint one frame of an
  // input this page cannot use.
  useLayoutEffect(() => suppressComposerSeat(page.current), [])

  /**
   * Draw one layout: the page's two boundaries, as custom properties on the root.
   *
   * The sizes live on the root rather than in each element's own inline style for
   * two reasons. A drag can then move them from the pointer without rendering
   * React — the Diff pane holds thousands of rows, and a render per pointer frame
   * would cost all of them — and one publish states both panes' shares together,
   * so the divider between them can never be drawn from two different layouts.
   */
  const publish = useCallback((next: GitLayout): void => {
    const root = page.current
    if (root === null) return
    root.style.setProperty('--dsh-cg-side-width', `${next.sideWidth}px`)
    root.style.setProperty('--dsh-cg-files-grow', `${next.filesShare}`)
    root.style.setProperty('--dsh-cg-history-grow', `${1 - next.filesShare}`)
  }, [])

  // Before the first paint, not after: the stylesheet's own fallback is the
  // default layout, and a saved boundary must not be drawn at the default for one
  // frame and then jump to where it was left.
  useLayoutEffect(() => {
    publish(layout)
  }, [layout, publish])

  /**
   * Record one layout: what the page draws from, and what it saves.
   *
   * The two are written together on purpose. A size drawn but not saved is one the
   * next visit forgets; a size saved but not drawn is a drag that looks like it did
   * nothing until the tab is reopened.
   */
  const record = useCallback((next: GitLayout): void => {
    setLayout(next)
    writeLayout(next)
  }, [])

  /** The page's own width, which is the room the sidebar and the Diff pane share. */
  const available = useCallback((): number => page.current?.getBoundingClientRect().width ?? 0, [])

  /** The vertical run the two sidebar panes share, below the toolbar row. */
  const trackHeight = useCallback((): number => {
    const host = side.current
    const first = filesPane.current
    if (host === null || first === null) return 0
    return host.getBoundingClientRect().bottom - first.getBoundingClientRect().top
  }, [])

  /**
   * Where the sidebar's edge is, as a drag starts.
   *
   * Measured off the box rather than read from the layout: the stylesheet is what
   * clamps a saved width to the window it is drawn in, so the edge on screen — not
   * the preference behind it — is where the pointer has actually taken hold.
   */
  const startSideResize = useCallback((): number => {
    setResizing('col')
    return side.current?.getBoundingClientRect().width ?? layout.sideWidth
  }, [layout.sideWidth])

  /** Draw the sidebar width the pointer implies, for this frame. */
  const dragSideResize = useCallback((width: number): void => {
    const root = page.current
    const room = available()
    if (root === null || room <= 0) return
    root.style.setProperty('--dsh-cg-side-width', `${clampSideWidth(width, room)}px`)
  }, [available])

  /** Record the sidebar width the gesture settled on. */
  const commitSideResize = useCallback((width: number): void => {
    setResizing(null)
    const room = available()
    if (room <= 0) return
    record({ ...layout, sideWidth: clampSideWidth(width, room) })
  }, [available, layout, record])

  /** Where the divider between the panes is, as a drag starts: the upper pane's height. */
  const startSplitResize = useCallback((): number => {
    setResizing('row')
    return filesPane.current?.getBoundingClientRect().height ?? layout.filesShare * trackHeight()
  }, [layout.filesShare, trackHeight])

  /** Draw the split the pointer implies, for this frame. */
  const dragSplitResize = useCallback((height: number): void => {
    const root = page.current
    const track = trackHeight()
    if (root === null || track <= 0) return
    const share = shareOf(clampFilesHeight(height, track), track)
    root.style.setProperty('--dsh-cg-files-grow', `${share}`)
    root.style.setProperty('--dsh-cg-history-grow', `${1 - share}`)
  }, [trackHeight])

  /** Record the split the gesture settled on. */
  const commitSplitResize = useCallback((height: number): void => {
    setResizing(null)
    const track = trackHeight()
    if (track <= 0) return
    record({ ...layout, filesShare: shareOf(clampFilesHeight(height, track), track) })
  }, [layout, record, trackHeight])

  /**
   * A gesture that produced no size — a click on a boundary, or a pointer lost
   * mid-drag — draws the recorded layout again, so the preview a cancelled drag
   * left on screen cannot outlive the gesture.
   */
  const endResize = useCallback((): void => {
    setResizing(null)
    publish(layout)
  }, [layout, publish])

  /** Open the error dialog on one failed action. */
  const reportError = useCallback((next: GitError): void => {
    setError(next)
  }, [])

  /** Re-read the repository state and the history. */
  const refresh = useCallback(async (): Promise<void> => {
    setRefreshing(true)
    try {
      const [nextStatus, nextLog] = await Promise.all([
        fetchStatus(sessionId),
        fetchLog(sessionId, LOG_LIMIT),
      ])
      setStatus(nextStatus)
      setLog(nextLog)
      // Both reads can fail at once, and they usually fail for the same reason,
      // so the dialog states them together instead of one hiding the other.
      const lines: string[] = []
      if (nextStatus?.ok !== true && !isNoRepo(nextStatus)) {
        lines.push(failureLine(t, 'label.status', nextStatus, 'fallback.status'))
      }
      if (nextLog?.ok !== true && !isNoRepo(nextLog)) {
        lines.push(failureLine(t, 'label.log', nextLog, 'fallback.log'))
      }
      if (lines.length > 0) reportError({ title: t('title.refresh'), lines })
    } finally {
      setRefreshing(false)
      setLoaded(true)
    }
  }, [sessionId, reportError, t])

  // Mounting is the refresh trigger: the shell renders exactly one View at a
  // time, so switching to this tab is what re-reads the repository. A session
  // change (a new conversation) re-runs this through `refresh`'s identity.
  useEffect(() => {
    void refresh()
  }, [refresh])

  // A checkout replaces the working tree, so everything this page is showing is
  // stale at once: the branch, the changed paths, the history, and any patch the
  // diff pane had loaded — which may belong to a file that no longer exists.
  // Dropping the selection is the honest version of that; keeping it would leave
  // a title over a diff from a branch the user already left. A fast-forward pull
  // rewrites files the same way, and a commit empties the very diffs it recorded,
  // so all three take this path.
  const handleSwitched = useCallback((): void => {
    setSelection(null)
    void refresh()
  }, [refresh])

  // A push moves nothing on disk: the branch, the changed paths and the patch on
  // screen are all still true. Only the divergence changed, so the selection is
  // kept and just the two answers are re-read.
  const handleSynced = useCallback((): void => {
    void refresh()
  }, [refresh])

  /**
   * Check out the branch the dialog confirmed.
   *
   * A refusal is the error dialog's, like every other failure.
   *
   * @param branch - the branch the user picked and confirmed.
   */
  const handleCheckout = useCallback((branch: string): void => {
    setSwitching(branch)
    void checkoutBranch(sessionId, branch).then(result => {
      setSwitching(null)
      if (result?.ok !== true) {
        const title = t('title.switchBranch', { branch })
        reportError({ title, lines: [reasonOf(t, result, 'title.switchBranch', { branch })] })
        return
      }
      handleSwitched()
    })
  }, [sessionId, handleSwitched, reportError, t])

  /**
   * Send this branch to its upstream, and report the answer.
   *
   * Publish and the second half of Sync run this one call, because the Host
   * decides which of the two it is from the repository itself: a branch with no
   * upstream is pushed to the single configured remote and recorded as its
   * upstream. The only difference the page makes is what it calls a failure.
   *
   * @param title - the entry naming which of the two was asked.
   */
  const pushRemote = useCallback((title: MessageKey): void => {
    setSyncing('push')
    void pushBranch(sessionId).then(result => {
      setSyncing(null)
      if (result?.ok !== true) {
        reportError({ title: t(title), lines: [reasonOf(t, result, title)] })
      }
      // A push moves nothing on disk, but a refusal moves the page's idea of the
      // divergence just as surely, so the two answers are re-read either way.
      handleSynced()
    })
  }, [sessionId, handleSynced, reportError, t])

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
  const syncRemote = useCallback((): void => {
    setSyncing('pull')
    void pullBranch(sessionId).then(result => {
      if (result?.ok !== true) {
        setSyncing(null)
        reportError({ title: t('title.pull'), lines: [reasonOf(t, result, 'title.pull')] })
        // A rejected pull still tells the user the remote has moved, so the
        // counts are re-read even though nothing was pulled.
        handleSynced()
        return
      }
      // The pull rewrote the working tree, so the diff on screen is stale and is
      // dropped here — the push that follows moves nothing on disk.
      handleSwitched()
      pushRemote('title.push')
    })
  }, [sessionId, handleSwitched, handleSynced, reportError, pushRemote, t])

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
  const publishRemote = useCallback((): void => {
    pushRemote('title.publish')
  }, [pushRemote])

  /**
   * Commit every change the changed-path list is showing, under the message the
   * form holds.
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
  const handleCommit = useCallback((message: string): Promise<boolean> => {
    setCommitting(true)
    return commitAll(sessionId, message).then(result => {
      setCommitting(false)
      if (result?.ok !== true) {
        reportError({ title: t('title.commit'), lines: [reasonOf(t, result, 'title.commit')] })
        handleSynced()
        return false
      }
      // The commit emptied the diffs just recorded, so the selection goes with
      // them and the page re-reads the tree, the history, and the branch's
      // divergence in one pass.
      handleSwitched()
      return true
    })
  }, [sessionId, handleSynced, handleSwitched, reportError, t])

  // One operation at a time, wherever the control that asks for it lives: the
  // branch pill and Refresh in the toolbar, the remote control in the history
  // pane's header, and the commit in the changed-path pane's. Stating it once
  // here is what keeps a second click from queueing a second checkout, a second
  // round trip, or a second commit behind the first.
  const busy = switching !== null || syncing !== null || committing

  const files: readonly ChangedFile[] = status?.ok === true ? status.files ?? [] : []
  const commits: readonly CommitSummary[] = log?.ok === true ? log.commits ?? [] : []

  // Re-resolve a selected path against the newest `status`, so a refresh picks
  // up its stage flags while the selection itself survives the round trip.
  const activeFile = useMemo<ChangedFile | null>(() => {
    if (selection?.kind !== 'file') return null
    return files.find(file => file.path === selection.file.path) ?? selection.file
  }, [selection, files])

  // Load the patch for whatever the diff pane is showing. Answers are matched
  // against the selection they were asked for, so a click during a slow request
  // cannot paint the previous row's diff under the new row's title.
  useEffect(() => {
    if (selection === null) {
      setDoc(null)
      return
    }
    const key = selectionKey(selection)
    let cancelled = false
    setDoc({ key, loading: true })

    const request = selection.kind === 'commit'
      ? fetchCommit(sessionId, selection.commit.hash)
      : activeFile === null
        // The one refusal no route answers — the row was re-read out of the list
        // between the click and this request — so the page words it itself, as
        // the text a route would otherwise have carried.
        ? Promise.resolve({ ok: false, error: t('fallback.fileGone') })
        : fetchDiff(sessionId, activeFile)

    void request.then(result => {
      if (cancelled) return
      setDoc(buildDoc(t, key, result))
      // A `no-repo` answer is the empty state the pane already shows; every other
      // refusal is the dialog's, including the local "the file disappeared" case.
      if (result?.ok !== true && !isNoRepo(result)) {
        const label: MessageKey = selection.kind === 'commit' ? 'label.commit' : 'label.diff'
        reportError({ title: t('title.diff'), lines: [failureLine(t, label, result, 'fallback.diff')] })
      }
    })
    return () => {
      cancelled = true
    }
  }, [selection, activeFile, sessionId, reportError, t])

  const current = doc !== null && doc.key === selectionKey(selection) ? doc : null

  return (
    <div
      ref={page}
      className={GIT_ROOT_CLASS}
      data-dsh-cool-git="view"
      // The shell's full-bleed opt-in, the hook the trajectory and terminal views
      // declare: the shell then drops the transcript width handles and gives
      // this View the whole conversation body.
      data-conversation-composer-overlay=""
      // One attribute for "a boundary is being dragged", which is how the whole
      // page keeps the drag's cursor and stops selecting text under the pointer.
      // Absent at rest, so the rules it turns on cost nothing the rest of the time.
      data-resizing={resizing ?? undefined}
      style={PAGE}
    >
      <aside ref={side} className="dsh-cg-side">
        <SideHead
          t={t}
          status={status}
          sessionId={sessionId}
          refreshing={refreshing}
          switching={switching}
          busy={busy}
          onRefresh={() => void refresh()}
          onCheckout={handleCheckout}
          onError={reportError}
        />
        {/* The commit form is the sidebar's own third row, under the toolbar and
            above both panes: what it commits is the changed-path pane's list, but
            what it acts on is the whole working tree, so it belongs to the column
            rather than to either pane. The form is `flex:none` so it keeps its two
            rows whatever height the panes are dragged to, and its own bottom
            hairline is the one line above the Changed files header — nothing is
            drawn between it and the toolbar, so the two rows above that line read
            as one block. */}
        <CommitBar
          t={t}
          disabled={status?.ok !== true || files.length === 0 || busy || refreshing}
          committing={committing}
          onCommit={handleCommit}
        />
        {/* The upper pane owns the divider under it: the boundary is what its own
            height is measured to, and the handle is placed on that pane's bottom
            edge rather than between the panes, so the split takes no layout of its
            own and the panes stay the only flow children of the column. */}
        <section ref={filesPane} className="dsh-cg-pane dsh-cg-files">
          <header className="dsh-cg-head">
            <span className="dsh-cg-head-title">{headText(t('pane.files'), files.length)}</span>
          </header>
          <div className="dsh-cg-list">
            <ChangeList
              t={t}
              status={status}
              loaded={loaded}
              files={files}
              selection={selection}
              onSelect={file => setSelection({ kind: 'file', file })}
            />
          </div>
          <ResizeHandle
            axis="row"
            onStart={startSplitResize}
            onDrag={dragSplitResize}
            onCommit={commitSplitResize}
            onEnd={endResize}
          />
        </section>

        <section className="dsh-cg-pane dsh-cg-history">
          <header className="dsh-cg-head">
            <span className="dsh-cg-head-title">{headText(t('pane.history'), commits.length)}</span>
            {/* The header's own right-hand group, holding the one operation that
                moves what is listed under it. */}
            <div className="dsh-cg-tools">
              <RemoteControl
                t={t}
                status={status}
                syncing={syncing}
                busy={busy}
                refreshing={refreshing}
                onSync={syncRemote}
                onPublish={publishRemote}
              />
            </div>
          </header>
          <div className="dsh-cg-list">
            <CommitList
              t={t}
              log={log}
              loaded={loaded}
              commits={commits}
              selection={selection}
              onSelect={commit => setSelection({ kind: 'commit', commit })}
            />
          </div>
        </section>

        {/* The sidebar's own right edge, which is the boundary its width is
            measured to. */}
        <ResizeHandle
          axis="col"
          onStart={startSideResize}
          onDrag={dragSideResize}
          onCommit={commitSideResize}
          onEnd={endResize}
        />
      </aside>

      <main className="dsh-cg-main">
        <DiffPane t={t} status={status} selection={selection} current={current} />
      </main>

      <ErrorDialog t={t} error={error} onClose={() => setError(null)} />
    </div>
  )
}

/**
 * The page's only error report.
 *
 * A dialog rather than a line beside the panes: a refusal is the reason the page
 * still shows the old state, and it must not be mistaken for the content it is
 * explaining or scrolled away from. The platform's own Modal owns the parts that
 * are easy to get wrong — the body portal, the mask, the focus walk, Escape, and
 * returning focus to the control that opened it. This is the same composition
 * DSH's own destructive confirm uses (`client-ui-workspace`'s Delete workspace),
 * down to reporting the failure inside the card as one `role="alert"` block
 * painted with the error token.
 *
 * @param props.t - the page's translate seat.
 * @param props.error - the failure to state, or null while none is open.
 * @param props.onClose - called by the close button, Escape, or the mask.
 * @returns the dialog element.
 */
function ErrorDialog(props: {
  readonly t: Translate
  readonly error: GitError | null
  readonly onClose: () => void
}): ReactElement {
  const { t, error, onClose } = props
  return (
    <Modal
      open={error !== null}
      onClose={onClose}
      title={error?.title ?? ''}
      closeLabel={t('dialog.close')}
      footer={<Button variant="primary" onClick={onClose}>{t('dialog.ok')}</Button>}
    >
      {/* One alert for the whole failure, not one per line: a screen reader
          announces it once, and the dialog still lists each failed request. */}
      <div className="dsh-cg-dialog-body" role="alert">
        {(error?.lines ?? []).map((line, index) => (
          <p className="dsh-cg-dialog-text" key={index}>{line}</p>
        ))}
      </div>
    </Modal>
  )
}

/**
 * The sidebar's first row: the Workspace this session is in, the branch it is
 * on, and the one operation the row itself keeps — Refresh. It draws no rule of
 * its own: the toolbar and the commit form under it are one block, closed
 * together by that form's own hairline.
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
 * @param props.t - the page's translate seat.
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
function SideHead(props: {
  readonly t: Translate
  readonly status: StatusPayload | null
  readonly sessionId: string | undefined
  readonly refreshing: boolean
  readonly switching: string | null
  readonly busy: boolean
  readonly onRefresh: () => void
  readonly onCheckout: (branch: string) => void
  readonly onError: (error: GitError) => void
}): ReactElement {
  const { t, status, sessionId, refreshing, switching, busy, onRefresh, onCheckout, onError } = props
  /** Whether the branch dialog is showing. */
  const [open, setOpen] = useState(false)

  const onBranch = status?.ok === true
  const detached = status?.detached === true

  /** Close the branch dialog without switching. */
  const closeDialog = useCallback((): void => {
    setOpen(false)
  }, [])

  /**
   * Hand the branch the dialog confirmed to the page, which runs the checkout.
   *
   * The dialog closes first: a checkout replaces the working tree, and a picker
   * left on screen while that runs would be offering a list that is already
   * stale.
   *
   * @param branch - the branch the user picked and confirmed.
   */
  const choose = useCallback((branch: string): void => {
    setOpen(false)
    onCheckout(branch)
  }, [onCheckout])

  const label = detached
    ? `HEAD ${status?.head?.short ?? ''}`.trim()
    : status?.branch === undefined || status.branch === ''
      ? t('head.currentBranch')
      : status.branch
  // A name the page cannot resolve yet (the first answer has not arrived, or a
  // directory with no final segment) draws no glyph either: a lone folder beside
  // nothing would name nothing.
  const workspaceName = status?.workspace?.title ?? workspaceFallback(status)

  return (
    <div className="dsh-cg-side-head">
      <span
        className="dsh-cg-workspace"
        title={status?.workspace?.path ?? status?.root ?? ''}
      >
        {workspaceName === ''
          ? null
          : <span className="dsh-cg-workspace-icon" aria-hidden="true"><IconFolder /></span>}
        <span className="dsh-cg-workspace-name">{workspaceName}</span>
      </span>
      {/* The pill is the row's own item rather than a member of the group beside
          it, because the pill is what the row shortens first and a flex item's
          text is its container's floor: inside the group the pill could never have
          been narrower than its name, and the Workspace's name would have gone on
          being the only part that gave ground (see `styles.ts`). */}
      {/* The bubble carries the branch's own name and nothing else — the name is
          what the row is allowed to shorten, down to the icon alone, so the whole
          of it has to read somewhere, and this is the one place left that can hold
          it. The anchor is the span rather than the button for the reason the
          controls below state: a disabled button emits no pointer events, and a
          pill that has lost its name is exactly the one whose hover has the most to
          say. */}
      <Tooltip label={label} side="bottom" portal maxWidth={TOOLTIP_MAX_WIDTH}>
        <span className="dsh-cg-tip dsh-cg-branch-tip">
          <button
            type="button"
            className="dsh-cg-branch"
            // Disabled while any repository operation is in flight: a second
            // dialog opened then could queue a second checkout behind the first.
            disabled={!onBranch || busy}
            aria-haspopup="dialog"
            aria-expanded={open}
            onClick={() => setOpen(value => !value)}
          >
            <span
              className="dsh-cg-branch-icon"
              data-busy={switching !== null}
              aria-hidden="true"
            >
              {switching === null ? <IconBranch /> : SPINNER_ICON}
            </span>
            <span className="dsh-cg-branch-name">{label}</span>
            {detached ? <span className="dsh-cg-divergence">{t('head.detached')}</span> : null}
          </button>
        </span>
      </Tooltip>
      <BranchDialog
        t={t}
        open={open}
        sessionId={sessionId}
        onClose={closeDialog}
        onConfirm={choose}
        onError={onError}
      />
      <div className="dsh-cg-tools">
        {/* The tooltip's anchor is the span, not the button: a disabled button
            emits no pointer events, so anchoring on it would lose the hover
            exactly when the bubble has the most to explain. */}
        <Tooltip label={t('head.refresh')} side="bottom" portal maxWidth={TOOLTIP_MAX_WIDTH}>
          <span className="dsh-cg-tip">
            <button
              type="button"
              className="dsh-cg-icon"
              aria-label={t('head.refresh')}
              data-busy={refreshing}
              disabled={refreshing || busy}
              onClick={onRefresh}
            >
              {refreshing ? SPINNER_ICON : <IconRefresh />}
            </button>
          </span>
        </Tooltip>
      </div>
    </div>
  )
}

/**
 * The remote control that lives in the history pane's header: Sync on a branch
 * with an upstream, Publish branch on one without.
 *
 * It stands where the commits it moves are listed rather than in the toolbar
 * above the panes, opposite the pane's own name and count: what the two counts
 * are counted against, and what the round trip brings and sends, is the history
 * under it. It stays an icon because that row is the sidebar's narrowest place —
 * the name and count share it with this button — and the bubble behind it is where
 * the names read: Sync with both counts spelled out as what is to be pulled and
 * what is to be pushed, or Publish branch alone on a branch that has nothing to
 * count yet. The bubble's text is the button's accessible name as well, so a
 * screen reader hears the same counts.
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
 * the honest answer for a branch in step with its upstream. The fallback in the
 * two counts is never drawn — the sync control needs an upstream to exist — it
 * only keeps them plain numbers.
 *
 * This component makes only the choice; `SyncControl` and `PublishControl` below
 * draw the two answers, each owning the markup of exactly one control.
 *
 * @param props.t - the page's translate seat.
 * @param props.status - the current status answer, for the branch already on.
 * @param props.syncing - the half of the round trip in flight, if any.
 * @param props.busy - whether any repository operation is in flight.
 * @param props.refreshing - a re-read of the repository is in flight.
 * @param props.onSync - called to run the pull-then-push round trip.
 * @param props.onPublish - called to push a branch that has no upstream yet.
 * @returns the control the branch's own state calls for.
 */
function RemoteControl(props: {
  readonly t: Translate
  readonly status: StatusPayload | null
  readonly syncing: RemoteRun | null
  readonly busy: boolean
  readonly refreshing: boolean
  readonly onSync: () => void
  readonly onPublish: () => void
}): ReactElement {
  const { t, status, syncing, busy, refreshing, onSync, onPublish } = props
  const reachable = status?.ok === true && status?.detached !== true
  const hasUpstream = reachable && status?.upstream !== undefined
  const behind = hasUpstream ? status?.behind ?? 0 : 0
  const ahead = hasUpstream ? status?.ahead ?? 0 : 0
  /** Both controls answer to the page's one rule: nothing while an operation runs. */
  const disabled = !reachable || busy || refreshing

  // The branch's own state decides which control is drawn: an upstream is what
  // makes a pull possible, so a branch without one has nothing to count and
  // nothing to sync.
  if (reachable && !hasUpstream) {
    return (
      <PublishControl
        t={t}
        running={syncing === 'push'}
        disabled={disabled}
        onPublish={onPublish}
      />
    )
  }

  return (
    <SyncControl
      t={t}
      behind={behind}
      ahead={ahead}
      pulling={syncing === 'pull'}
      pushing={syncing === 'push'}
      disabled={disabled}
      onSync={onSync}
    />
  )
}

/**
 * Publish branch: one glyph, drawn while the branch has no upstream to sync with.
 *
 * @param props.t - the page's translate seat.
 * @param props.running - the push this control asked for is in flight.
 * @param props.disabled - an operation is in flight, or the branch cannot be published.
 * @param props.onPublish - called to push the branch and record the remote as its upstream.
 * @returns the control.
 */
function PublishControl(props: {
  readonly t: Translate
  readonly running: boolean
  readonly disabled: boolean
  readonly onPublish: () => void
}): ReactElement {
  const { t, running, disabled, onPublish } = props
  // The bubble hangs off the span rather than the button: a disabled button emits
  // no pointer events of its own.
  return (
    <Tooltip label={t('remote.publish')} side="bottom" portal maxWidth={TOOLTIP_MAX_WIDTH}>
      <span className="dsh-cg-tip">
        <button
          type="button"
          className="dsh-cg-icon"
          aria-label={t('remote.publish')}
          data-busy={running}
          disabled={disabled}
          onClick={onPublish}
        >
          {running ? SPINNER_ICON : <IconPublish />}
        </button>
      </span>
    </Tooltip>
  )
}

/**
 * Sync: one button carrying both halves of the remote round trip.
 *
 * The bubble's text is the button's accessible name as well, so a screen reader
 * hears the same two counts.
 *
 * @param props.t - the page's translate seat.
 * @param props.behind - commits the pull brings, always a number, zero included.
 * @param props.ahead - commits the push sends, always a number, zero included.
 * @param props.pulling - the pull half of the round trip is in flight.
 * @param props.pushing - the push half of the round trip is in flight.
 * @param props.disabled - an operation is in flight, or the branch cannot be synced.
 * @param props.onSync - called to run the pull-then-push round trip.
 * @returns the control.
 */
function SyncControl(props: {
  readonly t: Translate
  readonly behind: number
  readonly ahead: number
  readonly pulling: boolean
  readonly pushing: boolean
  readonly disabled: boolean
  readonly onSync: () => void
}): ReactElement {
  const { t, behind, ahead, pulling, pushing, disabled, onSync } = props
  // The two digits the button draws as arrows are spelled out here, in the
  // direction each one moves: the button has room for a glyph and a number and
  // nothing else, so the two halves of the sentence are what say which leg of
  // the round trip each count belongs to. Both numbers are stated either way,
  // zeros included, for the same reason the button draws them.
  const label = t('remote.sync', { behind, ahead })

  // The bubble hangs off the span rather than the button, and neither arrow is
  // spun by the button itself: a disabled button emits no pointer events, and one
  // `data-busy` on the button would turn both halves of the round trip.
  return (
    <Tooltip label={label} side="bottom" portal maxWidth={TOOLTIP_MAX_WIDTH}>
      <span className="dsh-cg-tip">
        <button
          type="button"
          className="dsh-cg-icon dsh-cg-sync"
          aria-label={label}
          disabled={disabled}
          onClick={onSync}
        >
          <span
            className="dsh-cg-sync-arrow"
            data-busy={pulling}
            data-pending={behind > 0}
            aria-hidden="true"
          >
            {pulling ? SPINNER_ICON : <IconPull />}
            <span className="dsh-cg-sync-count">{behind}</span>
          </span>
          <span
            className="dsh-cg-sync-arrow"
            data-busy={pushing}
            data-pending={ahead > 0}
            aria-hidden="true"
          >
            {pushing ? SPINNER_ICON : <IconPush />}
            <span className="dsh-cg-sync-count">{ahead}</span>
          </span>
        </button>
      </span>
    </Tooltip>
  )
}

/**
 * Which run of rows a branch belongs to, in the order the dialog draws them.
 *
 * The order is the dialog's own answer to where a branch sits: the branch HEAD
 * is on, then the other local branches, then the remote-tracking ones.
 */
type BranchGroup = 'current' | 'local' | 'remote'

/** One row of the branch dialog's list. */
interface BranchRow {
  /** The name the row shows, and the name the switch is asked for. */
  readonly name: string
  readonly group: BranchGroup
}

/** The dictionary entry naming each run of rows. */
const BRANCH_GROUP_KEY: Readonly<Record<BranchGroup, MessageKey>> = {
  current: 'branch.current',
  local: 'branch.local',
  remote: 'branch.remote',
}

/**
 * The branches Git reports, as a dialog the choice is confirmed in.
 *
 * A dialog rather than a dropdown because the list here is the whole decision: a
 * repository can hold hundreds of branches, so the list scrolls inside a fixed
 * height and carries a filter of its own. The rows are the three groups a branch
 * can come from — current, local, remote — each labelled where it starts, so a
 * remote name is never mistaken for a local one of the same shape and the
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
 * @param props.t - the page's translate seat.
 * @param props.open - whether the dialog is showing.
 * @param props.sessionId - the session whose repository is being read.
 * @param props.onClose - called by Cancel, the close button, Escape, or the mask.
 * @param props.onConfirm - called with the picked branch when Switch is pressed.
 * @param props.onError - called with the failure to state in the error dialog.
 * @returns the dialog element.
 */
function BranchDialog(props: {
  readonly t: Translate
  readonly open: boolean
  readonly sessionId: string | undefined
  readonly onClose: () => void
  readonly onConfirm: (branch: string) => void
  readonly onError: (error: GitError) => void
}): ReactElement {
  const { t, open, sessionId, onClose, onConfirm, onError } = props
  /** The local branches Git reported, or null while it has not answered yet. */
  const [branches, setBranches] = useState<readonly string[] | null>(null)
  /** The remote-tracking branches Git reported. */
  const [remoteBranches, setRemoteBranches] = useState<readonly string[]>([])
  const [current, setCurrent] = useState<string | null>(null)
  const [truncated, setTruncated] = useState(false)
  /** A directory that is not a repository: the dialog's own empty state. */
  const [noRepo, setNoRepo] = useState(false)
  /** The row the dialog is on, which the footer's button then applies. */
  const [picked, setPicked] = useState<string | null>(null)
  const [filter, setFilter] = useState('')
  /** The scrolling branch list, and the wrapper its edge fades are pinned to. */
  const listScroll = useRef<HTMLDivElement | null>(null)
  const listWrap = useRef<HTMLDivElement | null>(null)

  // The cleanup discards a late answer and clears the one already in state, so a
  // reopen starts on the loading line instead of painting the previous list for
  // the frame between the reopen and the request.
  useEffect(() => {
    if (!open) return
    let cancelled = false
    void fetchBranches(sessionId).then(result => {
      if (cancelled) return
      if (result?.ok !== true) {
        const missing = isNoRepo(result)
        setBranches([])
        setNoRepo(missing)
        if (!missing) {
          onClose()
          onError({
            title: t('title.branches'),
            lines: [reasonOf(t, result, 'fallback.branches')],
          })
        }
        return
      }
      const on = typeof result.current === 'string' ? result.current : null
      setBranches(Array.isArray(result.branches) ? result.branches : [])
      setRemoteBranches(Array.isArray(result.remotes) ? result.remotes : [])
      setCurrent(on)
      setTruncated(result.truncated === true)
      // The dialog opens on the branch it is already showing: the row is active
      // before the keyboard touches it, so an arrow moves off it rather than
      // onto it, and Enter confirms what the dialog says is current.
      setPicked(on)
    })
    return () => {
      cancelled = true
      setBranches(null)
      setRemoteBranches([])
      setCurrent(null)
      setTruncated(false)
      setNoRepo(false)
      setPicked(null)
      setFilter('')
    }
  }, [open, sessionId, onClose, onError, t])

  /**
   * The list's edge fades, driven the way the terminal tab's lists drive theirs.
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
  useEffect(() => {
    const scroll = listScroll.current
    const wrap = listWrap.current
    if (scroll === null || wrap === null) return
    const update = (): void => {
      const overflow = scroll.scrollHeight - scroll.clientHeight > 1
      wrap.toggleAttribute('data-fade-top', overflow && scroll.scrollTop > 1)
      wrap.toggleAttribute(
        'data-fade-bottom',
        overflow && scroll.scrollTop + scroll.clientHeight < scroll.scrollHeight - 1,
      )
      const gutter = `${scroll.offsetWidth - scroll.clientWidth}px`
      if (wrap.style.getPropertyValue('--dsh-cg-fade-right') !== gutter) {
        wrap.style.setProperty('--dsh-cg-fade-right', gutter)
      }
    }
    update()
    scroll.addEventListener('scroll', update, { passive: true })
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(update)
    observer?.observe(scroll)
    return () => {
      scroll.removeEventListener('scroll', update)
      observer?.disconnect()
    }
  })

  // `null` is the one state that means "no answer yet": an answer that named no
  // branch is an empty list, which is a fact this dialog states rather than a
  // load it is still waiting on. The rows are the three groups in the order they
  // are read: the branch HEAD is on, then the other local branches, then the
  // remote-tracking ones — where you are, where you could be, and what a remote
  // has — and the group is carried on the row so a filtered list can still label
  // what each run of rows belongs to.
  const rows: readonly BranchRow[] = [
    ...(current === null ? [] : [{ name: current, group: 'current' as const }]),
    ...(branches ?? [])
      .filter(name => name !== current)
      .map(name => ({ name, group: 'local' as const })),
    ...remoteBranches.map(name => ({ name, group: 'remote' as const })),
  ]

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
  const shownFor = (value: string): readonly BranchRow[] => {
    const needle = value.trim().toLowerCase()
    return needle === '' ? rows : rows.filter(row => row.name.toLowerCase().includes(needle))
  }

  const shown = shownFor(filter)

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
  const switchable = (name: string | null): boolean => name !== null && name !== current

  // The dialog's states, with the filter first in the tree that carries one. That
  // order is not cosmetic: the Modal looks for `data-modal-autofocus` in the frame
  // the layer opens the dialog — one render *before* the branches arrive — so a
  // filter that waited for the list would leave the ✕ (the dialog's first
  // focusable control) holding the keyboard instead. Keeping that one input
  // mounted across the load is also what lets it keep the focus it was given, and
  // keeps whatever was typed while reading in it.
  let content: ReactNode
  if (noRepo) {
    content = <p className="dsh-cg-dialog-hint">{t('branch.notRepo')}</p>
  } else if (branches !== null && rows.length === 0) {
    content = <p className="dsh-cg-dialog-hint">{t('branch.none')}</p>
  } else {
    content = (
      <>
        <Input
          className="dsh-cg-branch-filter"
          type="text"
          value={filter}
          placeholder={t('branch.search')}
          aria-label={t('branch.search')}
          // The Modal's own way of choosing the initial focus: React's
          // `autoFocus` runs before the layer can note the control to return to.
          // The primitive passes the marker through to the native field, which is
          // the element the layer actually focuses.
          data-modal-autofocus
          // A selection the filter has just hidden is dropped with it: the footer's
          // button applies the row it can name, and a row the list no longer shows
          // is not one. A selection that survived the narrowing is kept, so a stray
          // character does not undo a click.
          onChange={event => {
            const value = event.target.value
            setFilter(value)
            setPicked(shownFor(value).some(row => row.name === picked) ? picked : null)
          }}
        />
        {branches === null
          ? <p className="dsh-cg-dialog-hint">{t('branch.loading')}</p>
          : shown.length === 0
            ? <p className="dsh-cg-dialog-hint">{t('branch.noMatch')}</p>
            : (
              <div className="dsh-cg-branch-list-wrap" ref={listWrap}>
                <div
                  className="dsh-cg-branch-list"
                  role="listbox"
                  aria-label={t('branch.list')}
                  ref={listScroll}
                >
                  {shown.map((row, index) => (
                    <Fragment key={row.name}>
                      {/* The heading opens each run of rows; the runs are in group
                          order already, so a kind that changed since the row above
                          is where the next one starts. */}
                      {row.group === shown[index - 1]?.group
                        ? null
                        : (
                          <span role="presentation" className="dsh-cg-branch-group">
                            {t(BRANCH_GROUP_KEY[row.group])}
                          </span>
                        )}
                      <button
                        type="button"
                        role="option"
                        aria-selected={picked === row.name}
                        // The list holds no tab stop of its own: the rows are picked
                        // with the pointer, and a two-hundred-branch list must not
                        // become two hundred tab stops between the filter and the
                        // footer's buttons.
                        tabIndex={-1}
                        className="dsh-cg-branch-row"
                        // Keep the keyboard in the filter: letting the mousedown move
                        // focus onto the row would end the typing that is narrowing
                        // the list (the terminal tab's completion popup prevents the
                        // same blur for its own keystroke stream).
                        onMouseDown={event => { event.preventDefault() }}
                        // The click selects, it does not switch: a checkout rewrites
                        // the working tree, so the footer's button is what applies the
                        // choice.
                        onClick={() => setPicked(row.name)}
                      >
                        <span className="dsh-cg-branch-row-name">{row.name}</span>
                      </button>
                    </Fragment>
                  ))}
                </div>
                {/* The fades are siblings of the scroller, never children of it:
                    pinned to the visible box so the rows slide under them, and
                    painted over the rows only while the wrapper carries the
                    matching data attribute (see the edge-fade effect above).
                    Empty spans — no layout. */}
                <span className="dsh-cg-branch-fade dsh-cg-branch-fade-top" aria-hidden="true" />
                <span className="dsh-cg-branch-fade dsh-cg-branch-fade-bottom" aria-hidden="true" />
              </div>
            )}
        {truncated
          ? <p className="dsh-cg-dialog-hint">{t('branch.truncated')}</p>
          : null}
      </>
    )
  }

  const canConfirm = switchable(picked)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('branch.title')}
      description={t('branch.description')}
      closeLabel={t('dialog.close')}
      // The dialog is wider than the platform's default card: a branch name is a
      // path, and `origin/feature/…` cut by an ellipsis is a name no one can
      // tell from its neighbour. The class is the platform's own way of sizing a
      // dialog (its RiskConfirmation does the same).
      className="dsh-cg-branch-dialog"
      footer={(
        <>
          <Button variant="outline" onClick={onClose}>{t('branch.cancel')}</Button>
          <Button
            variant="primary"
            disabled={!canConfirm}
            onClick={() => { if (picked !== null) onConfirm(picked) }}
          >
            {t('branch.confirm')}
          </Button>
        </>
      )}
    >
      <div className="dsh-cg-branch-body">{content}</div>
    </Modal>
  )
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
function workspaceFallback(status: StatusPayload | null): string {
  const root = status?.ok === true ? status.root : undefined
  if (root === undefined || root === '') return ''
  const trimmed = root.replace(/\/+$/, '')
  const cut = trimmed.lastIndexOf('/')
  return cut < 0 ? trimmed : trimmed.slice(cut + 1)
}

/**
 * The sidebar's commit form: a message field with the button that commits
 * everything the changed-path list holds.
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
 * what is typed and stops at four lines, past which it scrolls — a message
 * longer than that must not push the changed-path pane down the column. Its
 * corner is the button's own, which is what makes the two read as one form (see
 * `styles.ts`).
 *
 * It is a form of one decision, and that decision is the plain one: everything
 * the changed-path list holds goes in — tracked edits, deletions, and untracked
 * files alike — because nothing on this page offers a per-path choice that could
 * make the set smaller.
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
 * @param props.t - the page's translate seat.
 * @param props.disabled - whether the repository can take a commit right now:
 * there is none to name, nothing is changed, or the page is busy with something
 * else.
 * @param props.committing - the commit this form asked for is in flight.
 * @param props.onCommit - runs the commit; resolves true when one was made.
 * @returns the form element.
 */
function CommitBar(props: {
  readonly t: Translate
  readonly disabled: boolean
  readonly committing: boolean
  readonly onCommit: (message: string) => Promise<boolean>
}): ReactElement {
  const { t, disabled, committing, onCommit } = props
  const [message, setMessage] = useState('')
  const field = useRef<HTMLTextAreaElement | null>(null)

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
  useLayoutEffect(() => {
    const node = field.current
    if (node === null) return
    node.style.height = 'auto'
    node.style.height = `${node.scrollHeight}px`
  }, [message])

  /**
   * Ask for the commit the field currently describes.
   *
   * Bound to the button and to ⌘/Ctrl+Enter in the field: Enter alone is the line
   * break a message needs, so the chord is the keyboard's own way to submit.
   */
  const submit = useCallback((): void => {
    const trimmed = message.trim()
    if (trimmed === '' || disabled || committing) return
    void onCommit(trimmed).then(made => {
      if (made) setMessage('')
    })
  }, [message, disabled, committing, onCommit])

  return (
    <div className="dsh-cg-commit-bar">
      {/* The frame is the textarea's border and fill, the way the platform's own
          field draws them: the box that grows has to carry no border at all, or
          the height measured for it would be a pixel short of what it is drawn
          at. The frame is what carries the theme's focus colour as well, since
          the field inside it is borderless and has nothing to light up. */}
      <span className="dsh-cg-commit-frame">
        <textarea
          ref={field}
          className="dsh-cg-commit-input"
          value={message}
          placeholder={t('commit.placeholder')}
          aria-label={t('commit.placeholder')}
          rows={1}
          disabled={committing}
          onChange={event => setMessage(event.target.value)}
          onKeyDown={event => {
            if (event.key !== 'Enter' || !(event.metaKey || event.ctrlKey)) return
            event.preventDefault()
            submit()
          }}
        />
      </span>
      <Button
        className="dsh-cg-commit-send"
        variant="primary"
        size="sm"
        disabled={disabled || committing || message.trim() === ''}
        onClick={submit}
      >
        {committing ? t('commit.busy') : t('commit.button')}
      </Button>
    </div>
  )
}

/**
 * The changed-path list, or the reason there is none to draw.
 *
 * A clean working tree draws nothing at all: the header's own count already
 * says zero, so a line inside the pane would only say it a second time.
 *
 * @param props.t - the page's translate seat.
 * @param props.status - the current status answer.
 * @param props.loaded - at least one answer has arrived.
 * @param props.files - the rows to render.
 * @param props.selection - the current selection, for the selected row's state.
 * @param props.onSelect - called with the row the user picked.
 * @returns the list body.
 */
function ChangeList(props: {
  readonly t: Translate
  readonly status: StatusPayload | null
  readonly loaded: boolean
  readonly files: readonly ChangedFile[]
  readonly selection: Selection | null
  readonly onSelect: (file: ChangedFile) => void
}): ReactElement {
  const { t, status, loaded, files, selection, onSelect } = props

  // A failed read is stated by the error dialog; the pane keeps only the fact
  // that there is nothing to list, so the two do not say the same thing twice.
  if (status !== null && status.ok !== true) {
    return <Note text={t(status.reason === 'no-repo' ? 'list.notRepo' : 'list.statusFailed')} />
  }
  if (!loaded && status === null) return <Note text={t('list.loading')} />
  if (files.length === 0) return <></>

  return (
    <>
      {files.map(file => (
        // The bubble is the row's own statement about itself — the whole path
        // with a rename's old path trailing it, then the state in words — because
        // the row itself has room for a letter and an elided tail at most. It is
        // portaled so it can sit beside the sidebar instead of inside the list's
        // own scroll box, which would clip it; a path too long for the cap wraps
        // inside the bubble.
        <Tooltip
          key={file.path}
          label={rowLabel(t, file)}
          side="right"
          portal
          maxWidth={TOOLTIP_MAX_WIDTH}
        >
          <button
            type="button"
            className="dsh-cg-row"
            aria-selected={selection?.kind === 'file' && selection.file.path === file.path}
            onClick={() => onSelect(file)}
          >
            <span className="dsh-cg-badge" data-kind={file.kind}>{KIND_LETTER[file.kind]}</span>
            <PathLabel path={file.path} />
            <span
              className="dsh-cg-stage"
              data-staged={file.staged}
              title={t(file.staged ? 'stage.staged' : 'stage.unstaged')}
            />
          </button>
        </Tooltip>
      ))}
    </>
  )
}

/**
 * What a changed-path row says about itself when hovered: its path first — a
 * rename's old path trailing it — then its state, spelled out rather than
 * lettered, the same `· ` separator the pane headers use.
 *
 * @param t - the page's translate seat.
 * @param file - the row's changed path.
 * @returns the tooltip's text.
 */
function rowLabel(t: Translate, file: ChangedFile): string {
  const renamed = file.origPath === undefined ? '' : ` ← ${file.origPath}`
  return `${file.path}${renamed} · ${t(KIND_KEY[file.kind])}`
}

/**
 * The commit list, or the reason it is empty.
 *
 * @param props.t - the page's translate seat.
 * @param props.log - the current log answer.
 * @param props.loaded - at least one answer has arrived.
 * @param props.commits - the rows to render.
 * @param props.selection - the current selection, for the selected row's state.
 * @param props.onSelect - called with the row the user picked.
 * @returns the list body.
 */
function CommitList(props: {
  readonly t: Translate
  readonly log: LogPayload | null
  readonly loaded: boolean
  readonly commits: readonly CommitSummary[]
  readonly selection: Selection | null
  readonly onSelect: (commit: CommitSummary) => void
}): ReactElement {
  const { t, log, loaded, commits, selection, onSelect } = props

  if (log !== null && log.ok !== true) return <Note text={t('history.failed')} />
  if (!loaded && log === null) return <Note text={t('history.loading')} />
  if (commits.length === 0) return <Note text={t('history.empty')} />

  return (
    <>
      {commits.map(commit => (
        <button
          key={commit.hash}
          type="button"
          className="dsh-cg-commit"
          aria-selected={selection?.kind === 'commit' && selection.commit.hash === commit.hash}
          onClick={() => onSelect(commit)}
        >
          <span className="dsh-cg-subject">{commit.subject === '' ? t('commit.noMessage') : commit.subject}</span>
          <span className="dsh-cg-meta">
            <span className="dsh-cg-hash">{commit.short}</span>
            <span>{commit.author}</span>
            <span title={commit.date}>{relativeTime(t, commit.date)}</span>
            {commit.parents.length > 1 ? <span>{t('commit.merge')}</span> : null}
          </span>
          {commit.refs.length > 0 ? (
            <span className="dsh-cg-refs">
              {commit.refs.slice(0, 3).map(ref => (
                <span key={ref} className="dsh-cg-ref">{refLabel(ref)}</span>
              ))}
            </span>
          ) : null}
        </button>
      ))}
    </>
  )
}

/**
 * A changed path, named first and parented second: `name · parent/dir`, with the
 * parent dimmer than the name. A path at the repository root has no parent, so
 * it carries no separator.
 *
 * @param props.path - the repository-relative path.
 * @returns the path element.
 */
function PathLabel({ path }: { readonly path: string }): ReactElement {
  const { dir, name } = splitPath(path)
  const parent = dir.replace(/\/$/, '')
  return (
    <span className="dsh-cg-path">
      <span className="dsh-cg-name">{name}</span>
      {parent === '' ? null : (
        <>
          <span className="dsh-cg-dot">·</span>
          <span className="dsh-cg-dir">{parent}</span>
        </>
      )}
    </span>
  )
}

/**
 * The diff pane: its header, its body, and its empty and error states.
 *
 * @param props.t - the page's translate seat.
 * @param props.status - the current status answer.
 * @param props.selection - what the user picked.
 * @param props.current - the answer that belongs to that selection, if it arrived.
 * @returns the pane.
 */
function DiffPane(props: {
  readonly t: Translate
  readonly status: StatusPayload | null
  readonly selection: Selection | null
  readonly current: DocState | null
}): ReactElement {
  const { t, status, selection, current } = props

  // Which files are closed lives here, above the body's loading line, rather than
  // in the sections themselves. A re-read of the answer on screen — the refresh
  // control, or the re-read an operation is followed by — puts the body back
  // through its loading state, and state kept below that would be thrown away with
  // it: the reader would close four files, refresh, and find all four open again.
  //
  // It is still reset per answer, so nothing carries between two commits. The
  // reset happens while rendering rather than in an effect, which is React's own
  // advice for state that has to follow a prop: the new answer then never paints
  // for a frame wearing the previous answer's collapse state.
  const answerKey = current?.key ?? ''
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(() => new Set())
  const [seenKey, setSeenKey] = useState(answerKey)
  if (seenKey !== answerKey) {
    setSeenKey(answerKey)
    setCollapsed(new Set())
  }

  const toggleFile = useCallback((id: string): void => {
    setCollapsed(previous => {
      const next = new Set(previous)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  if (status !== null && status.ok !== true) {
    return (
      <div className="dsh-cg-empty">
        <span className="dsh-cg-empty-title">{t('diff.pane')}</span>
        <span className="dsh-cg-empty-text">
          {t(status.reason === 'no-repo' ? 'diff.notRepo' : 'diff.repoFailed')}
        </span>
      </div>
    )
  }

  if (selection === null) {
    return (
      <div className="dsh-cg-empty">
        <span className="dsh-cg-empty-title">{t('diff.pane')}</span>
        <span className="dsh-cg-empty-text">{t('diff.emptyHint')}</span>
      </div>
    )
  }

  const title = selection.kind === 'file' ? selection.file.path : current?.commit?.subject ?? selection.commit.subject
  const loading = current === null || current.loading

  return (
    <>
      <header className="dsh-cg-main-head">
        <span className="dsh-cg-main-title" title={title}>{title}</span>
        {selection.kind === 'file' ? <KindTag t={t} kind={selection.file.kind} /> : null}
        {current?.commit === undefined ? null : (
          <span className="dsh-cg-main-subtitle">
            {current.commit.short} · {current.commit.author} · {relativeTime(t, current.commit.date)}
          </span>
        )}
        {current?.doc === undefined ? null : (
          <DiffStats additions={current.doc.additions} deletions={current.doc.deletions} />
        )}
        {current?.doc === undefined || current.doc.files.length === 0 ? null : (
          <CopyButton t={t} text={buildCopyText(current)} />
        )}
      </header>
      <div className="dsh-cg-diff">
        <DiffBody
          t={t}
          loading={loading}
          current={current}
          kind={selection.kind === 'file' ? selection.file.kind : undefined}
          collapsed={collapsed}
          onToggleFile={toggleFile}
        />
      </div>
    </>
  )
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
function buildCopyText(state: DocState): string {
  if (state.commit !== undefined) {
    const header = [
      `commit ${state.commit.hash}`,
      `Author: ${state.commit.author} <${state.commit.email}>`,
      `Date:   ${state.commit.date}`,
      '',
      state.commit.subject,
      ...(state.commit.body === '' ? [] : ['', state.commit.body]),
      '',
    ].join('\n')
    return header + renderPatch(state.doc)
  }
  return renderPatch(state.doc)
}

/**
 * Re-serialize a parsed patch into unified diff text.
 *
 * @param doc - the parsed patch, when one arrived.
 * @returns the patch text, or an empty string.
 */
function renderPatch(doc: DiffDoc | undefined): string {
  if (doc === undefined) return ''
  const out: string[] = []
  for (const file of doc.files) {
    out.push(file.header, ...file.meta)
    for (const hunk of file.hunks) {
      out.push(hunk.header)
      for (const line of hunk.lines) {
        if (line.kind === 'meta') out.push(line.text)
        else if (line.kind === 'add') out.push(`+${line.text}`)
        else if (line.kind === 'del') out.push(`-${line.text}`)
        else out.push(` ${line.text}`)
      }
    }
  }
  return out.join('\n')
}

/**
 * The change-kind tag beside the diff title.
 *
 * @param props.t - the page's translate seat.
 * @param props.kind - the selected path's change kind.
 * @returns the tag element.
 */
function KindTag({ t, kind }: { readonly t: Translate; readonly kind: ChangeKind }): ReactElement {
  return <span className="dsh-cg-main-subtitle">{t(KIND_KEY[kind])}</span>
}

/**
 * The `+N −M` summary of a patch.
 *
 * @param props.additions - added line count.
 * @param props.deletions - deleted line count.
 * @returns the stats element.
 */
function DiffStats(props: { readonly additions: number; readonly deletions: number }): ReactElement {
  return (
    <span className="dsh-cg-stats">
      <span className="dsh-cg-added">+{props.additions}</span>
      <span className="dsh-cg-deleted">−{props.deletions}</span>
    </span>
  )
}

/**
 * A button that copies the current patch and reports success briefly.
 *
 * @param props.t - the page's translate seat.
 * @param props.text - the text to copy.
 * @returns the button element.
 */
function CopyButton({ t, text }: { readonly t: Translate; readonly text: string }): ReactElement {
  const [copied, setCopied] = useState(false)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => {
    if (timer.current !== undefined) window.clearTimeout(timer.current)
  }, [])

  const copy = useCallback((): void => {
    void writeText(text).then(ok => {
      if (!ok) return
      setCopied(true)
      if (timer.current !== undefined) window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setCopied(false), COPY_FEEDBACK_MS)
    })
  }, [text])

  return (
    <button
      type="button"
      className="dsh-cg-icon"
      title={t(copied ? 'diff.copied' : 'diff.copy')}
      aria-label={t(copied ? 'diff.copied' : 'diff.copy')}
      onClick={copy}
    >
      {copied ? <IconCheck /> : <IconCopy />}
    </button>
  )
}

/**
 * Put text on the clipboard, with a fallback for a context that refuses the
 * async clipboard API (an insecure origin, or a denied permission).
 *
 * @param text - the text to copy.
 * @returns whether the copy succeeded.
 */
async function writeText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    try {
      const area = document.createElement('textarea')
      area.value = text
      area.setAttribute('readonly', '')
      area.style.position = 'fixed'
      area.style.opacity = '0'
      document.body.appendChild(area)
      area.select()
      const ok = document.execCommand('copy')
      area.remove()
      return ok
    } catch {
      return false
    }
  }
}

/**
 * The diff body: the parsed patch, a loading line, or the reason there is none.
 *
 * @param props.t - the page's translate seat.
 * @param props.loading - the answer for this selection has not arrived yet.
 * @param props.current - the answer, when it has.
 * @param props.kind - the selected path's change kind, for a friendlier empty line.
 * @param props.collapsed - the files the reader has closed, by section identity.
 * @param props.onToggleFile - asks the pane to flip one file's state.
 * @returns the body element.
 */
function DiffBody(props: {
  readonly t: Translate
  readonly loading: boolean
  readonly current: DocState | null
  readonly kind: ChangeKind | undefined
  readonly collapsed: ReadonlySet<string>
  readonly onToggleFile: (id: string) => void
}): ReactElement {
  const { t, loading, current, kind, collapsed, onToggleFile } = props

  if (loading) return <Note text={t('diff.loading')} />
  if (current?.error !== undefined) return <Note text={t('diff.failed')} />

  const doc = current?.doc
  if (current === null || doc === undefined || doc.files.length === 0) {
    return (
      <div className="dsh-cg-empty">
        <span className="dsh-cg-empty-title">{t('diff.noTextTitle')}</span>
        <span className="dsh-cg-empty-text">
          {t(kind === 'untracked' ? 'diff.noTextUntracked' : 'diff.noTextOther')}
        </span>
      </div>
    )
  }

  return (
    <DiffFiles
      t={t}
      doc={doc}
      merge={current.merge === true}
      truncated={current.truncated === true}
      collapsed={collapsed}
      onToggleFile={onToggleFile}
    />
  )
}

/**
 * The patch's file sections.
 *
 * @param props.t - the page's translate seat.
 * @param props.doc - the parsed patch.
 * @param props.merge - whether the patch compares against a first parent.
 * @param props.truncated - whether the Host cut the patch short.
 * @param props.collapsed - the files the reader has closed, by section identity.
 * @param props.onToggleFile - asks the pane to flip one file's state.
 * @returns the sections, and the notes that qualify them.
 */
function DiffFiles(props: {
  readonly t: Translate
  readonly doc: DiffDoc
  readonly merge: boolean
  readonly truncated: boolean
  readonly collapsed: ReadonlySet<string>
  readonly onToggleFile: (id: string) => void
}): ReactElement {
  const { t, doc, merge, truncated, collapsed, onToggleFile } = props

  const rows = flatten(doc)
  const shown = rows.length > MAX_DIFF_ROWS ? rows.slice(0, MAX_DIFF_ROWS) : rows
  const hidden = rows.length - shown.length
  const groups = groupFiles(shown)
  // A file title is drawn only for a patch that touches more than one file: for a
  // single changed path the pane's own header already names it, and a second
  // identical line above the first hunk would just be noise. The same count is
  // what decides whether there is anything to tell apart, and so to collapse.
  const collapsible = groups.length > 1

  return (
    <>
      {merge ? (
        <div className="dsh-cg-note">{t('diff.mergeNote')}</div>
      ) : null}
      {groups.map(group => (
        <FileSection
          t={t}
          key={group.id}
          group={group}
          collapsible={collapsible}
          collapsed={collapsed.has(group.id)}
          onToggle={onToggleFile}
        />
      ))}
      {hidden > 0 ? <div className="dsh-cg-note">{t('diff.hiddenRows', { count: hidden })}</div> : null}
      {truncated ? <div className="dsh-cg-note">{t('diff.truncated')}</div> : null}
    </>
  )
}

/**
 * One file of the patch: its title, its disclosure control, and the scroller its
 * code lives in.
 *
 * The title sits outside that scroller on purpose — a long line moves the code
 * under a title that stays where it is — and each file's scroller is its own, so
 * dragging one file sideways leaves every other file where it was.
 *
 * @param props.t - the page's translate seat.
 * @param props.group - the file and the rows under its title.
 * @param props.collapsible - whether this patch has more than one file to tell apart.
 * @param props.collapsed - whether this file's code is closed.
 * @param props.onToggle - asks the owner to flip this file's state.
 * @returns the section.
 */
function FileSection(props: {
  readonly t: Translate
  readonly group: DiffGroup
  readonly collapsible: boolean
  readonly collapsed: boolean
  readonly onToggle: (id: string) => void
}): ReactElement {
  const { t, group, collapsible, collapsed, onToggle } = props
  const { file } = group

  return (
    <>
      {/* The title is only drawn when a patch names more than one file; a lone
          file's name is already in the pane header, and repeating it would be a
          second identical line above the first hunk. */}
      {file === null ? null : (
        <FileHead
          t={t}
          file={file}
          id={group.id}
          collapsible={collapsible}
          collapsed={collapsed}
          onToggle={onToggle}
        />
      )}
      {/* The rows sit in a shrink-to-fit strip rather than directly in the
          scroller. A scroller sizes its own children to itself, so a hunk's
          `@@` bar would stop at the pane's edge and read as if the code beside
          it had been cut off; inside the strip every full-width row is as wide
          as the widest row instead. */}
      {collapsed ? null : (
        <div className="dsh-cg-file-body">
          <div className="dsh-cg-file-scroll">
            {group.body.map((row, index) => (
              <DiffRow key={index} row={row} />
            ))}
          </div>
        </div>
      )}
    </>
  )
}

/**
 * One file's title row, and the control that closes it.
 *
 * @param props.t - the page's translate seat.
 * @param props.file - the file the row names.
 * @param props.id - the section's identity, which is what the control flips.
 * @param props.collapsible - whether this patch has more than one file.
 * @param props.collapsed - whether the file's code is closed.
 * @param props.onToggle - asks the owner to flip this file's state.
 * @returns the title row.
 */
function FileHead(props: {
  readonly t: Translate
  readonly file: DiffFile
  readonly id: string
  readonly collapsible: boolean
  readonly collapsed: boolean
  readonly onToggle: (id: string) => void
}): ReactElement {
  const { t, file, id, collapsible, collapsed, onToggle } = props
  const path = displayPath(file)
  const { dir, name } = splitPath(path)

  return (
    <div className="dsh-cg-file-head">
      {collapsible ? (
        <button
          type="button"
          className="dsh-cg-file-toggle"
          // The state the stylesheet turns the chevron by, and the one a screen
          // reader announces: `aria-expanded` is the fact, the quarter turn is
          // only how it is drawn.
          aria-expanded={!collapsed}
          title={t(collapsed ? 'diff.expand' : 'diff.collapse')}
          aria-label={t(collapsed ? 'diff.expand' : 'diff.collapse')}
          onClick={() => onToggle(id)}
        >
          <IconArrowRight />
        </button>
      ) : null}
      {/* The path is one line whatever the pane's width, so the whole of it is
          kept reachable through the row's own tooltip. */}
      <span className="dsh-cg-file-path" title={path}>
        <span className="dsh-cg-dir">{dir}</span>
        {name}
      </span>
      <DiffStats additions={file.additions} deletions={file.deletions} />
    </div>
  )
}

/**
 * One row under a file title.
 *
 * @param props.row - the row to draw.
 * @returns the row element.
 */
function DiffRow({ row }: { readonly row: BodyRow }): ReactElement {
  if (row.type === 'hunk') return <div className="dsh-cg-hunk-head">{row.header}</div>

  const line = row.line
  if (line.kind === 'meta') {
    return (
      <div className="dsh-cg-line" data-kind="meta">
        <span className="dsh-cg-text">{line.text}</span>
      </div>
    )
  }
  const marker = line.kind === 'add' ? '+' : line.kind === 'del' ? '-' : ' '
  return (
    <div className="dsh-cg-line" data-kind={line.kind}>
      <span className="dsh-cg-no">{line.oldNo === null ? '' : line.oldNo}</span>
      <span className="dsh-cg-no">{line.newNo === null ? '' : line.newNo}</span>
      <span className="dsh-cg-sign">{marker}</span>
      <span className="dsh-cg-text">{line.text}</span>
    </div>
  )
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
function Note(props: { readonly text: string }): ReactElement {
  return <div className="dsh-cg-note">{props.text}</div>
}
