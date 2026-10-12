/**
 * The Git conversation view.
 *
 * The page is the whole of the tab: a fixed sidebar carrying 变更文件区 above
 * 提交历史, and a Diff 查看区 taking every remaining pixel. Changed paths come
 * from `git status`, the history from `git log`, and the diff pane shows either
 * one path's patch against HEAD or one commit's whole patch (see `api.ts` for
 * the routes and `diff.ts` for the patch parser).
 *
 * The page owns no repository state of its own: every answer is a plain value
 * fetched from the Host, and the only local state is which row is selected, which
 * answer is current, and which failure the dialog is stating. That keeps a manual
 * refresh honest — it re-reads `status` and `log`, and the diff pane re-reads
 * whatever it is showing.
 *
 * Every failure the page can meet is reported in one place: the error dialog. A
 * refused branch switch, a Pull or Push the remote turned down, a read the Host
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

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
} from 'react'
import { Button, Menu, Modal, Tooltip, type MenuEntry } from '@deepseek-ai/dsh-client-ui-primitives'
import { checkoutBranch, fetchBranches, fetchCommit, fetchDiff, fetchLog, fetchStatus, pullBranch, pushBranch } from './api.js'
import { suppressComposerSeat } from './chrome.js'
import { displayPath, parsePatch, type DiffDoc, type DiffFile, type DiffLine } from './diff.js'
import { GIT_ROOT_CLASS } from './styles.js'
import type {
  ChangedFile,
  ChangeKind,
  CommitSummary,
  LogPayload,
  StatusPayload,
} from '../shared/contract.js'

/** How many commits the history pane asks for. */
const LOG_LIMIT = 60

/** Body lines the diff pane will draw before it stops and says how many are left. */
const MAX_DIFF_ROWS = 6000

/** How long the copy button reports success before returning to its idle label. */
const COPY_FEEDBACK_MS = 1200

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

/** The tooltip each changed-path row carries. */
const KIND_LABEL: Readonly<Record<ChangeKind, string>> = {
  added: '新增',
  modified: '修改',
  deleted: '删除',
  renamed: '重命名',
  copied: '复制',
  typechange: '类型变更',
  untracked: '未跟踪',
  conflicted: '冲突',
  unknown: '未知状态',
}

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
 * The widest shape of a route answer, as the page reads one.
 *
 * Every route answers a different payload type — status, log, diff, commit,
 * branches, checkout, sync — but the page reads them all the same way: `ok`, a
 * reason when it is false, and then whatever the pane needs. The shared readers
 * below therefore take this shape instead of a union of every payload, and
 * `postJson` normalizes a transport failure into it, which is what keeps the
 * page down to one failure shape.
 */
interface RouteAnswer {
  readonly ok?: boolean
  readonly error?: string
  readonly reason?: string
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
 * The dialog is the page's only error report: a refused branch switch, a Pull or
 * Push the remote turned down, a read the Host could not answer, and a transport
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
 * @param key - the selection identity this answer belongs to.
 * @param result - the payload the route returned.
 * @returns the pane state to render.
 */
function buildDoc(key: string, result: RouteAnswer | null | undefined): DocState {
  if (result?.ok !== true) {
    const error = typeof result?.error === 'string' && result.error !== '' ? result.error : '未知错误'
    return { key, loading: false, error }
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
function isNoRepo(payload: RouteAnswer): boolean {
  return payload.reason === 'no-repo'
}

/**
 * The reason one route answer gave for not answering.
 *
 * @param payload - the route's answer.
 * @param fallback - the reason to state when the answer carried none.
 * @returns the Host's or the transport's own words.
 */
function reasonOf(payload: RouteAnswer, fallback: string): string {
  return typeof payload.error === 'string' && payload.error !== '' ? payload.error : fallback
}

/**
 * State one failed request as the error dialog's line for it.
 *
 * @param label - the request that did not answer, e.g. `读取分支列表`.
 * @param payload - the route's answer.
 * @param fallback - the reason to state when the answer carried none.
 * @returns one `label：reason` line.
 */
function failureLine(label: string, payload: RouteAnswer, fallback: string): string {
  return `${label}：${reasonOf(payload, fallback)}`
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
 * Render a short relative age for one ISO-8601 timestamp.
 *
 * @param iso - the timestamp Git printed.
 * @returns `刚刚`, a counted unit, or the calendar date once it is old enough.
 */
function relativeTime(iso: string): string {
  const at = Date.parse(iso)
  if (!Number.isFinite(at)) return ''
  const delta = Date.now() - at
  const minute = 60_000
  const hour = 60 * minute
  const day = 24 * hour
  if (delta < minute) return '刚刚'
  if (delta < hour) return `${Math.floor(delta / minute)} 分钟前`
  if (delta < day) return `${Math.floor(delta / hour)} 小时前`
  if (delta < 30 * day) return `${Math.floor(delta / day)} 天前`
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

/** The refresh glyph. */
const REFRESH_ICON = (
  <svg viewBox="0 0 16 16" aria-hidden="true">
    <path d="M13.2 8a5.2 5.2 0 1 1-1.5-3.7" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    <path d="M13.4 2.4v3.4H10" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

/** The copy glyph. */
const COPY_ICON = (
  <svg viewBox="0 0 16 16" aria-hidden="true">
    <rect x="5.6" y="5.6" width="7.4" height="7.4" rx="1.4" fill="none" stroke="currentColor" strokeWidth="1.3" />
    <path d="M10 5.6V4.4A1.4 1.4 0 0 0 8.6 3H4.4A1.4 1.4 0 0 0 3 4.4v4.2A1.4 1.4 0 0 0 4.4 10h1.2" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
)

/** The confirmation glyph, shown while the copy button reports success. */
const CHECK_ICON = (
  <svg viewBox="0 0 16 16" aria-hidden="true">
    <path d="M3.4 8.6l3 3 6.2-7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

/** The chevron that marks the branch label as a menu trigger. */
const CHEVRON_ICON = (
  <svg viewBox="0 0 16 16" aria-hidden="true">
    <path d="M4.2 6.2L8 10l3.8-3.8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

/** The Workspace glyph: the project directory the session's repository lives in. */
const WORKSPACE_ICON = (
  <svg viewBox="0 0 16 16" aria-hidden="true">
    <path d="M2 4.4A1.4 1.4 0 0 1 3.4 3h2.5a1 1 0 0 1 .8.4l.9 1.2h5A1.4 1.4 0 0 1 14 6v5.6A1.4 1.4 0 0 1 12.6 13H3.4A1.4 1.4 0 0 1 2 11.6z" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
  </svg>
)

/** The branch glyph: the trunk node and the commit a branch forks off it. */
const BRANCH_ICON = (
  <svg viewBox="0 0 16 16" aria-hidden="true">
    <path d="M4 2v8" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    <circle cx="12" cy="4" r="2" fill="none" stroke="currentColor" strokeWidth="1.3" />
    <circle cx="4" cy="12" r="2" fill="none" stroke="currentColor" strokeWidth="1.3" />
    <path d="M12 6a6 6 0 0 1-6 6" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
)

/**
 * The Pull glyph: an arrow pointing at this working tree.
 *
 * Pull and push are one picture with the arrow reversed, which is what makes the
 * pair readable at 13px beside their counts. No floor line under either of them:
 * the number next to the arrow already says how many commits are crossing, and a
 * second horizontal mark only competes with it.
 */
const PULL_ICON = (
  <svg viewBox="0 0 16 16" aria-hidden="true">
    <path d="M8 2.9v9.6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M4.4 9L8 12.6 11.6 9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

/** The Push glyph: the same arrow leaving this working tree. */
const PUSH_ICON = (
  <svg viewBox="0 0 16 16" aria-hidden="true">
    <path d="M8 13.1V3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M4.4 7L8 3.4 11.6 7" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

/**
 * The busy glyph: an open ring, turned by the stylesheet.
 *
 * A control that can wait on the network for minutes cannot look the same as an
 * idle one, and a disabled button alone does not say which control is working.
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
 * @param props - the standard conversation-View props; the session id is used.
 * @returns the Git page element.
 */
export function GitView(props: { readonly sessionId?: unknown }): ReactElement {
  const page = useRef<HTMLDivElement | null>(null)
  const sessionId = typeof props?.sessionId === 'string' ? props.sessionId : undefined

  const [status, setStatus] = useState<StatusPayload | null>(null)
  const [log, setLog] = useState<LogPayload | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [selection, setSelection] = useState<Selection | null>(null)
  const [doc, setDoc] = useState<DocState | null>(null)
  /** The failure the dialog is stating, or null while none is open. */
  const [error, setError] = useState<GitError | null>(null)

  // Layout effect, not a passive one: the composer seat is already in the tree
  // when this View mounts, and a passive effect would paint one frame of an
  // input this page cannot use.
  useLayoutEffect(() => suppressComposerSeat(page.current), [])

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
        lines.push(failureLine('读取仓库状态', nextStatus, '读取仓库状态失败'))
      }
      if (nextLog?.ok !== true && !isNoRepo(nextLog)) {
        lines.push(failureLine('读取提交历史', nextLog, '读取提交历史失败'))
      }
      if (lines.length > 0) reportError({ title: '刷新仓库失败', lines })
    } finally {
      setRefreshing(false)
      setLoaded(true)
    }
  }, [sessionId, reportError])

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
  // rewrites files the same way, so it takes the same path.
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
        ? Promise.resolve({ ok: false, error: '该文件已不在变更列表中' })
        : fetchDiff(sessionId, activeFile)

    void request.then(result => {
      if (cancelled) return
      setDoc(buildDoc(key, result))
      // A `no-repo` answer is the empty state the pane already shows; every other
      // refusal is the dialog's, including the local "the file disappeared" case.
      if (result?.ok !== true && !isNoRepo(result)) {
        const label = selection.kind === 'commit' ? '读取提交' : '读取文件差异'
        reportError({ title: '读取 Diff 失败', lines: [failureLine(label, result, '读取 Diff 失败')] })
      }
    })
    return () => {
      cancelled = true
    }
  }, [selection, activeFile, sessionId, reportError])

  const current = doc !== null && doc.key === selectionKey(selection) ? doc : null

  return (
    <div
      ref={page}
      className={GIT_ROOT_CLASS}
      data-dsh-cool-git="view"
      // The shell's full-bleed opt-in, the hook 轨迹 and the terminal view
      // declare: the shell then drops the transcript width handles and gives
      // this View the whole conversation body.
      data-conversation-composer-overlay=""
      style={PAGE}
    >
      <aside className="dsh-cg-side">
        <SideHead
          status={status}
          sessionId={sessionId}
          refreshing={refreshing}
          onRefresh={() => void refresh()}
          onSwitched={handleSwitched}
          onSynced={handleSynced}
          onError={reportError}
        />
        <section className="dsh-cg-pane">
          <header className="dsh-cg-head">
            <span className="dsh-cg-head-title">变更文件区</span>
            {files.length > 0 ? <span className="dsh-cg-count">{files.length}</span> : null}
          </header>
          <div className="dsh-cg-list">
            <ChangeList
              status={status}
              loaded={loaded}
              files={files}
              selection={selection}
              onSelect={file => setSelection({ kind: 'file', file })}
            />
          </div>
        </section>

        <section className="dsh-cg-pane">
          <header className="dsh-cg-head">
            <span className="dsh-cg-head-title">提交历史</span>
            {commits.length > 0 ? <span className="dsh-cg-count">{commits.length}</span> : null}
          </header>
          <div className="dsh-cg-list">
            <CommitList
              log={log}
              loaded={loaded}
              commits={commits}
              selection={selection}
              onSelect={commit => setSelection({ kind: 'commit', commit })}
            />
          </div>
        </section>
      </aside>

      <main className="dsh-cg-main">
        <DiffPane status={status} selection={selection} current={current} />
      </main>

      <ErrorDialog error={error} onClose={() => setError(null)} />
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
 * returning focus to the control that opened it.
 *
 * @param props.error - the failure to state, or null while none is open.
 * @param props.onClose - called by the close button, Escape, or the mask.
 * @returns the dialog element.
 */
function ErrorDialog(props: {
  readonly error: GitError | null
  readonly onClose: () => void
}): ReactElement {
  const { error, onClose } = props
  return (
    <Modal
      open={error !== null}
      onClose={onClose}
      title={error?.title ?? ''}
      closeLabel="关闭"
      footer={<Button variant="primary" onClick={onClose}>知道了</Button>}
    >
      {error === null ? null : error.lines.map((line, index) => (
        <p className="dsh-cg-dialog-text" key={index}>{line}</p>
      ))}
    </Modal>
  )
}

/**
 * The repository's toolbar, in the order the work happens: the Workspace this
 * session is in, the branch it is on, how far that branch has drifted from its
 * upstream, and then the four operations the page can perform — Pull, Push and
 * a re-read, plus the branch menu itself as the one control that moves HEAD.
 *
 * The branch switch is stated as a decision rather than an accident: the menu is
 * the list Git reports, the current branch carries the check, and the choice is
 * applied by the Host through a real checkout. Every control is disabled while
 * any other operation is in flight, so a second click cannot queue a second
 * checkout, pull or push behind the first.
 *
 * The menu is the platform's own dropdown, which owns the parts that are easy to
 * get wrong — anchoring, the focus walk, Escape, outside-click dismissal, and
 * rendering into a portal so a list longer than the sidebar is not clipped by
 * it.
 *
 * The divergence is the row's only read-only text, and it is placed between the
 * branch and the two arrows that resolve it: `↓` behind is what Pull brings,
 * `↑` ahead is what Push sends.
 *
 * @param props.status - the current status answer, for the branch already on.
 * @param props.sessionId - the session whose repository is being switched.
 * @param props.refreshing - a re-read of the repository is in flight.
 * @param props.onRefresh - called to re-read the repository state and history.
 * @param props.onSwitched - called after a checkout or a pull, which both rewrite
 *   the working tree, so the page drops the diff it was showing.
 * @param props.onSynced - called after a push, which moves nothing on disk.
 * @param props.onError - called with the failure to state in the error dialog.
 * @returns the header row.
 */
function SideHead(props: {
  readonly status: StatusPayload | null
  readonly sessionId: string | undefined
  readonly refreshing: boolean
  readonly onRefresh: () => void
  readonly onSwitched: () => void
  readonly onSynced: () => void
  readonly onError: (error: GitError) => void
}): ReactElement {
  const { status, sessionId, refreshing, onRefresh, onSwitched, onSynced, onError } = props
  const [open, setOpen] = useState(false)
  const [branches, setBranches] = useState<readonly string[] | null>(null)
  const [current, setCurrent] = useState<string | null>(null)
  const [truncated, setTruncated] = useState(false)
  const [loading, setLoading] = useState(false)
  /** A failed branch read, kept apart from an empty list: "none" is a fact, this is not. */
  const [readError, setReadError] = useState(false)
  const [switching, setSwitching] = useState<string | null>(null)
  /** The remote operation in flight, if any. */
  const [syncing, setSyncing] = useState<'pull' | 'push' | null>(null)

  // Read the branches when the menu opens, never before: this is the only
  // question the page asks that the tab's own mount does not already answer, and
  // a list read at mount would be stale by the time anyone opened it.
  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    setReadError(false)
    void fetchBranches(sessionId).then(result => {
      if (cancelled) return
      setLoading(false)
      if (result?.ok !== true) {
        setBranches([])
        setReadError(true)
        if (!isNoRepo(result)) {
          onError({ title: '读取分支列表失败', lines: [reasonOf(result, '读取分支列表失败')] })
        }
        return
      }
      setBranches(Array.isArray(result.branches) ? result.branches : [])
      setCurrent(typeof result.current === 'string' ? result.current : null)
      setTruncated(result.truncated === true)
    })
    return () => {
      cancelled = true
    }
  }, [open, sessionId, onError])

  const choose = useCallback((branch: string): void => {
    setOpen(false)
    if (branch === current) return
    setSwitching(branch)
    void checkoutBranch(sessionId, branch).then(result => {
      setSwitching(null)
      if (result?.ok !== true) {
        onError({
          title: `切换到 ${branch} 失败`,
          lines: [reasonOf(result, `切换到 ${branch} 失败`)],
        })
        return
      }
      onSwitched()
    })
  }, [current, sessionId, onSwitched, onError])

  /**
   * Run one remote operation and report its answer.
   *
   * A pull and a push differ in exactly two places: which route answers, and
   * what the page must re-read afterwards. Everything else — the in-flight state
   * that blocks a second click, the failure dialog, the refresh — is the same
   * decision, so it is taken once here.
   */
  const sync = useCallback((action: 'pull' | 'push'): void => {
    const call = action === 'pull' ? pullBranch : pushBranch
    const label = action === 'pull' ? 'Pull' : 'Push'
    setSyncing(action)
    void call(sessionId).then(result => {
      setSyncing(null)
      if (result?.ok !== true) {
        onError({ title: `${label} 失败`, lines: [reasonOf(result, `${label} 失败`)] })
        // Even a refusal can leave the answer stale — a rejected push still
        // tells the user the remote has moved — so the page re-reads either way.
        onSynced()
        return
      }
      if (action === 'pull') onSwitched()
      else onSynced()
    })
  }, [sessionId, onSwitched, onSynced, onError])

  const items: MenuEntry[] = []
  if (loading) {
    items.push({ type: 'label', id: 'loading', text: '正在读取分支…' })
  } else if (readError) {
    items.push({ type: 'label', id: 'failed', text: '读取分支失败' })
  } else if (branches === null || branches.length === 0) {
    items.push({ type: 'label', id: 'empty', text: '没有本地分支' })
  } else {
    // No `icon` of our own: the primitive draws the trailing check on the row
    // `selectedId` names, and a second marker would only repeat it.
    for (const name of branches) items.push({ id: name, label: name })
    if (truncated) {
      items.push({ type: 'separator', id: 'cut' })
      items.push({ type: 'label', id: 'cut-label', text: `仅显示最近的 ${branches.length} 个分支` })
    }
  }

  const detached = status?.detached === true
  const label = detached
    ? `HEAD ${status?.head?.short ?? ''}`.trim()
    : status?.branch === undefined || status.branch === ''
      ? '当前分支'
      : status.branch
  // A name the page cannot resolve yet (the first answer has not arrived, or a
  // directory with no final segment) draws no glyph either: a lone folder beside
  // nothing would name nothing.
  const workspaceName = status?.workspace?.title ?? workspaceFallback(status)

  // The two counts are shown on the two buttons that resolve them, zeros
  // included, and only when there is an upstream to count against: a branch with
  // none has no divergence to report, and a number that appeared and disappeared
  // as commits moved would make the toolbar jump under the cursor. `↓` is what
  // Pull brings, `↑` is what Push sends, so each number sits on its own arrow.
  const onBranch = status?.ok === true
  const reachable = onBranch && !detached
  const hasUpstream = reachable && status?.upstream !== undefined
  const behind = hasUpstream ? status?.behind ?? 0 : null
  const ahead = hasUpstream ? status?.ahead ?? 0 : null
  const busy = switching !== null || syncing !== null

  return (
    <div className="dsh-cg-side-head">
      <span
        className="dsh-cg-workspace"
        title={status?.workspace?.path ?? status?.root ?? ''}
      >
        {workspaceName === ''
          ? null
          : <span className="dsh-cg-workspace-icon" aria-hidden="true">{WORKSPACE_ICON}</span>}
        <span className="dsh-cg-workspace-name">{workspaceName}</span>
      </span>
      <div className="dsh-cg-tools">
        <Menu
          className="dsh-cg-branch-menu"
          open={open}
          anchor={(
            <button
              type="button"
              className="dsh-cg-branch"
              // Disabled while any repository operation is in flight: a second
              // menu opened then could queue a second checkout behind the first.
              disabled={!onBranch || busy}
              title={switching === null
                ? status?.upstream === undefined ? '切换分支' : `上游：${status.upstream}`
                : `正在切换到 ${switching}…`}
              aria-haspopup="menu"
              aria-expanded={open}
              onClick={() => setOpen(value => !value)}
            >
              <span
                className="dsh-cg-branch-icon"
                data-busy={switching !== null}
                aria-hidden="true"
              >
                {switching === null ? BRANCH_ICON : SPINNER_ICON}
              </span>
              <span className="dsh-cg-branch-name">{label}</span>
              {detached ? <span className="dsh-cg-divergence">游离</span> : null}
              <span className="dsh-cg-chevron" aria-hidden="true">{CHEVRON_ICON}</span>
            </button>
          )}
          items={items}
          selectedId={current ?? undefined}
          align="end"
          portal
          onSelect={choose}
          onClose={() => setOpen(false)}
        />
        {/* The tooltip's anchor is the span, not the button: a disabled button
            emits no pointer events, so anchoring on it would lose the hover
            exactly when the bubble has the most to explain. */}
        <Tooltip label="Pull" side="bottom" portal>
          <span className="dsh-cg-tip">
            <button
              type="button"
              className="dsh-cg-icon dsh-cg-sync"
              aria-label="Pull"
              data-busy={syncing === 'pull'}
              data-pending={behind !== null && behind > 0}
              disabled={!reachable || busy || refreshing}
              onClick={() => sync('pull')}
            >
              {syncing === 'pull' ? SPINNER_ICON : PULL_ICON}
              {behind === null ? null : <span className="dsh-cg-sync-count">{behind}</span>}
            </button>
          </span>
        </Tooltip>
        <Tooltip label="Push" side="bottom" portal>
          <span className="dsh-cg-tip">
            <button
              type="button"
              className="dsh-cg-icon dsh-cg-sync"
              aria-label="Push"
              data-busy={syncing === 'push'}
              data-pending={ahead !== null && ahead > 0}
              disabled={!reachable || busy || refreshing}
              onClick={() => sync('push')}
            >
              {syncing === 'push' ? SPINNER_ICON : PUSH_ICON}
              {ahead === null ? null : <span className="dsh-cg-sync-count">{ahead}</span>}
            </button>
          </span>
        </Tooltip>
        <Tooltip label="刷新" side="bottom" portal>
          <span className="dsh-cg-tip">
            <button
              type="button"
              className="dsh-cg-icon"
              aria-label="刷新"
              data-busy={refreshing}
              disabled={refreshing || busy}
              onClick={onRefresh}
            >
              {refreshing ? SPINNER_ICON : REFRESH_ICON}
            </button>
          </span>
        </Tooltip>
      </div>
    </div>
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
 * The changed-path list, or the reason it is empty.
 * @param props.status - the current status answer.
 * @param props.loaded - at least one answer has arrived.
 * @param props.files - the rows to render.
 * @param props.selection - the current selection, for the selected row's state.
 * @param props.onSelect - called with the row the user picked.
 * @returns the list body.
 */
function ChangeList(props: {
  readonly status: StatusPayload | null
  readonly loaded: boolean
  readonly files: readonly ChangedFile[]
  readonly selection: Selection | null
  readonly onSelect: (file: ChangedFile) => void
}): ReactElement {
  const { status, loaded, files, selection, onSelect } = props

  // A failed read is stated by the error dialog; the pane keeps only the fact
  // that there is nothing to list, so the two do not say the same thing twice.
  if (status !== null && status.ok !== true) {
    return <Note text={status.reason === 'no-repo' ? '当前会话目录不是 Git 仓库' : '读取仓库状态失败'} />
  }
  if (!loaded && status === null) return <Note text="正在读取仓库…" />
  if (files.length === 0) return <Note text="工作区没有未提交的改动" />

  return (
    <>
      {files.map(file => (
        <button
          key={file.path}
          type="button"
          className="dsh-cg-row"
          aria-selected={selection?.kind === 'file' && selection.file.path === file.path}
          title={`${KIND_LABEL[file.kind]}${file.origPath === undefined ? '' : ` ← ${file.origPath}`}`}
          onClick={() => onSelect(file)}
        >
          <span className="dsh-cg-badge" data-kind={file.kind}>{KIND_LETTER[file.kind]}</span>
          <PathLabel path={file.path} />
          <span className="dsh-cg-stage" data-staged={file.staged} title={file.staged ? '已暂存' : '未暂存'} />
        </button>
      ))}
    </>
  )
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
function CommitList(props: {
  readonly log: LogPayload | null
  readonly loaded: boolean
  readonly commits: readonly CommitSummary[]
  readonly selection: Selection | null
  readonly onSelect: (commit: CommitSummary) => void
}): ReactElement {
  const { log, loaded, commits, selection, onSelect } = props

  if (log !== null && log.ok !== true) return <Note text="读取提交历史失败" />
  if (!loaded && log === null) return <Note text="正在读取提交历史…" />
  if (commits.length === 0) return <Note text="还没有任何提交" />

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
          <span className="dsh-cg-subject">{commit.subject === '' ? '（无提交信息）' : commit.subject}</span>
          <span className="dsh-cg-meta">
            <span className="dsh-cg-hash">{commit.short}</span>
            <span>{commit.author}</span>
            <span title={commit.date}>{relativeTime(commit.date)}</span>
            {commit.parents.length > 1 ? <span>合并</span> : null}
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
 * A changed path, split so its directory reads dimmer than its name.
 *
 * @param props.path - the repository-relative path.
 * @returns the path element.
 */
function PathLabel({ path }: { readonly path: string }): ReactElement {
  const { dir, name } = splitPath(path)
  return (
    <span className="dsh-cg-path">
      {dir === '' ? null : <span className="dsh-cg-dir">{dir}</span>}
      {name}
    </span>
  )
}

/**
 * The diff pane: its header, its body, and its empty and error states.
 *
 * @param props.status - the current status answer.
 * @param props.selection - what the user picked.
 * @param props.current - the answer that belongs to that selection, if it arrived.
 * @returns the pane.
 */
function DiffPane(props: {
  readonly status: StatusPayload | null
  readonly selection: Selection | null
  readonly current: DocState | null
}): ReactElement {
  const { status, selection, current } = props

  if (status !== null && status.ok !== true) {
    return (
      <div className="dsh-cg-empty">
        <span className="dsh-cg-empty-title">Diff 查看区</span>
        <span className="dsh-cg-empty-text">
          {status.reason === 'no-repo' ? '当前会话目录不是 Git 仓库' : '无法读取仓库'}
        </span>
      </div>
    )
  }

  if (selection === null) {
    return (
      <div className="dsh-cg-empty">
        <span className="dsh-cg-empty-title">Diff 查看区</span>
        <span className="dsh-cg-empty-text">点击左侧文件或提交，在此查看 Diff</span>
      </div>
    )
  }

  const title = selection.kind === 'file' ? selection.file.path : current?.commit?.subject ?? selection.commit.subject
  const loading = current === null || current.loading

  return (
    <>
      <header className="dsh-cg-main-head">
        <span className="dsh-cg-main-title" title={title}>{title}</span>
        {selection.kind === 'file' ? <KindTag kind={selection.file.kind} /> : null}
        {current?.commit === undefined ? null : (
          <span className="dsh-cg-main-subtitle">
            {current.commit.short} · {current.commit.author} · {relativeTime(current.commit.date)}
          </span>
        )}
        {current?.doc === undefined ? null : <DiffStats additions={current.doc.additions} deletions={current.doc.deletions} />}
        {current?.doc === undefined || current.doc.files.length === 0 ? null : (
          <CopyButton text={buildCopyText(current)} />
        )}
      </header>
      <div className="dsh-cg-diff">
        <DiffBody loading={loading} current={current} kind={selection.kind === 'file' ? selection.file.kind : undefined} />
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

/** The change-kind tag beside the diff title. */
function KindTag({ kind }: { readonly kind: ChangeKind }): ReactElement {
  return <span className="dsh-cg-main-subtitle">{KIND_LABEL[kind]}</span>
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
 * @param props.text - the text to copy.
 * @returns the button element.
 */
function CopyButton({ text }: { readonly text: string }): ReactElement {
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
    <button type="button" className="dsh-cg-icon" title={copied ? '已复制' : '复制 Diff'} aria-label={copied ? '已复制' : '复制 Diff'} onClick={copy}>
      {copied ? CHECK_ICON : COPY_ICON}
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
 * @param props.loading - the answer for this selection has not arrived yet.
 * @param props.current - the answer, when it has.
 * @param props.kind - the selected path's change kind, for a friendlier empty line.
 * @returns the body element.
 */
function DiffBody(props: {
  readonly loading: boolean
  readonly current: DocState | null
  readonly kind: ChangeKind | undefined
}): ReactElement {
  const { loading, current, kind } = props

  if (loading) return <Note text="正在读取 Diff…" />
  if (current?.error !== undefined) return <Note text="无法读取 Diff" />

  const doc = current?.doc
  if (doc === undefined || doc.files.length === 0) {
    return (
      <div className="dsh-cg-empty">
        <span className="dsh-cg-empty-title">没有可显示的文本差异</span>
        <span className="dsh-cg-empty-text">
          {kind === 'untracked' ? '这是一个未跟踪的新文件，内容与空文件相同' : '该文件当前的改动没有文本差异（可能是二进制文件或仅权限变更）'}
        </span>
      </div>
    )
  }

  const rows = flatten(doc)
  const shown = rows.length > MAX_DIFF_ROWS ? rows.slice(0, MAX_DIFF_ROWS) : rows
  const hidden = rows.length - shown.length

  return (
    <>
      {current?.merge === true ? (
        <div className="dsh-cg-note">合并提交：以下差异是与第一个父提交的比较结果。</div>
      ) : null}
      {shown.map((row, index) => (
        <DiffRow key={index} row={row} />
      ))}
      {hidden > 0 ? <div className="dsh-cg-note">还有 {hidden} 行未渲染（差异过大）。</div> : null}
      {current?.truncated === true ? <div className="dsh-cg-note">Diff 超出读取上限，内容已被截断。</div> : null}
    </>
  )
}

/**
 * One flattened diff row.
 *
 * @param props.row - the row to draw.
 * @returns the row element.
 */
function DiffRow({ row }: { readonly row: FlatRow }): ReactElement {
  if (row.type === 'file') {
    const { dir, name } = splitPath(displayPath(row.file))
    return (
      <div className="dsh-cg-file-head">
        <span className="dsh-cg-file-path">
          <span className="dsh-cg-dir">{dir}</span>
          {name}
        </span>
        <DiffStats additions={row.file.additions} deletions={row.file.deletions} />
      </div>
    )
  }

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
