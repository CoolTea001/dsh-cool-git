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
 * refused branch switch, a pull or push the remote turned down, a read the Host
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
  Fragment,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
} from 'react'
import { Button, Input, Modal, Tooltip } from '@deepseek-ai/dsh-client-ui-primitives'
import { checkoutBranch, fetchBranches, fetchCommit, fetchDiff, fetchLog, fetchStatus, pullBranch, pushBranch } from './api.js'
import { suppressComposerSeat } from './chrome.js'
import { displayPath, parsePatch, type DiffDoc, type DiffFile, type DiffLine } from './diff.js'
import { IconBranch, IconFolder, IconPublish, IconPull, IconPush, IconRefresh } from './icons.js'
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

/**
 * The busy glyph: an open ring, turned by the stylesheet.
 *
 * A control that can wait on the network for minutes cannot look the same as an
 * idle one, and a disabled button alone does not say which control is working.
 * It stands in for whichever glyph the wait belongs to, so it has to carry the
 * same weight as the artwork it replaces rather than a stroke of its own.
 *
 * The Workspace, branch, pull, push and refresh marks are assets now — see
 * `icons.tsx` — because those are the glyphs the toolbar shows at rest. This
 * ring, the copy pair and the spinner's own turning are local because they are
 * states rather than subjects.
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
 * returning focus to the control that opened it. This is the same composition
 * DSH's own destructive confirm uses (`client-ui-workspace`'s 删除工作区), down to
 * reporting the failure inside the card as one `role="alert"` block painted with
 * the error token.
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
 * The repository's toolbar, in the order the work happens: the Workspace this
 * session is in, the branch it is on, how far that branch has drifted from its
 * upstream, and then the two operations the page can perform — one remote control
 * and a re-read — plus the branch button, which opens the one dialog that
 * moves HEAD.
 *
 * The branch switch is stated as a decision rather than an accident: the dialog
 * lists what Git reported, tags the branch already on, and applies nothing until
 * the choice is confirmed with a button of its own — the Host then runs a real
 * checkout, and a refusal is the error dialog's. Every control is disabled while
 * any other operation is in flight, so a second click cannot queue a second
 * checkout or sync behind the first.
 *
 * The dialog is the platform's own Modal, which owns the parts that are easy to
 * get wrong — the body portal, the mask, the focus walk, Escape, and returning
 * focus to the control that opened it.
 *
 * Sync is the round trip taken in the one order that cannot rewind work: a
 * fast-forward pull, then a push of what is left. Both arrows and both counts
 * stay inside that single button — `↓` behind is what the pull brings, `↑` ahead
 * is what the push sends — so the control that states the divergence is the one
 * that resolves it, and each arrow turns while its own half is in flight. The
 * button draws those two arrows and nothing else: 同步变更 is the name the
 * tooltip and the accessible label carry, not a word in the row, which is what
 * keeps a named operation inside the width a 340px header has left for it.
 *
 * Publish takes Sync's place on a branch with no upstream, because that branch
 * has no divergence to state and no pull to take: what it needs is the push that
 * creates the remote branch and records it as the upstream. One cloud-and-arrow
 * glyph, the same tooltip-only naming, and the two are never offered together.
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
  /** Whether the branch dialog is showing. */
  const [open, setOpen] = useState(false)
  const [switching, setSwitching] = useState<string | null>(null)
  /** The remote operation in flight, if any. */
  const [syncing, setSyncing] = useState<'pull' | 'push' | null>(null)

  // What the toolbar's remote controls are allowed to do, read from the answer
  // the page already has. `reachable` is the repository's own word on whether
  // there is a branch to move at all; `hasUpstream` is what makes a pull possible,
  // what the two counts are counted against, and what decides which control the
  // row offers — a branch with no upstream has no remote to have diverged from,
  // so there is nothing to count and nothing to sync, and what it needs first is
  // the push that records an upstream (Publish).
  //
  // Both counts are always numbers, zeros included. A control whose numbers vanish
  // when nothing is pending reads as broken rather than as idle, and a digit that
  // came and went as commits moved would shift the toolbar under the cursor; `0`
  // is the honest answer for a branch in step with its upstream. The fallback
  // below is never drawn — the sync button needs an upstream to exist — it only
  // keeps the two counts plain numbers.
  const onBranch = status?.ok === true
  const detached = status?.detached === true
  const reachable = onBranch && !detached
  const hasUpstream = reachable && status?.upstream !== undefined
  const publishable = reachable && !hasUpstream
  const behind = hasUpstream ? status?.behind ?? 0 : 0
  const ahead = hasUpstream ? status?.ahead ?? 0 : 0
  const busy = switching !== null || syncing !== null

  /** Close the branch dialog without switching. */
  const closeDialog = useCallback((): void => {
    setOpen(false)
  }, [])

  /**
   * Check out the branch the dialog confirmed.
   *
   * The dialog closes first: a checkout replaces the working tree, and a picker
   * left on screen while that runs would be offering a list that is already
   * stale. A refusal is the error dialog's, like every other failure.
   *
   * @param branch - the branch the user picked and confirmed.
   */
  const choose = useCallback((branch: string): void => {
    setOpen(false)
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
  }, [sessionId, onSwitched, onError])

  /**
   * Send this branch to its upstream, and report the answer.
   *
   * Publish and the second half of Sync run this one call, because the Host
   * decides which of the two it is from the repository itself: a branch with no
   * upstream is pushed to the single configured remote and recorded as its
   * upstream. The only difference the page makes is what it calls a failure.
   *
   * @param title - the failure's heading, naming which of the two was asked.
   */
  const push = useCallback((title: string): void => {
    setSyncing('push')
    void pushBranch(sessionId).then(result => {
      setSyncing(null)
      if (result?.ok !== true) {
        onError({ title, lines: [reasonOf(result, title)] })
      }
      // A push moves nothing on disk, but a refusal moves the page's idea of the
      // divergence just as surely, so the two answers are re-read either way.
      onSynced()
    })
  }, [sessionId, onSynced, onError])

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
   * row offers Publish instead — so the pull has a target by construction.
   */
  const sync = useCallback((): void => {
    setSyncing('pull')
    void pullBranch(sessionId).then(result => {
      if (result?.ok !== true) {
        setSyncing(null)
        onError({ title: '拉取失败', lines: [reasonOf(result, '拉取失败')] })
        // A rejected pull still tells the user the remote has moved, so the
        // counts are re-read even though nothing was pulled.
        onSynced()
        return
      }
      // The pull rewrote the working tree, so the diff on screen is stale and is
      // dropped here — the push that follows moves nothing on disk.
      onSwitched()
      push('推送失败')
    })
  }, [sessionId, onSwitched, onSynced, onError, push])

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
  const publish = useCallback((): void => {
    push('发布分支失败')
  }, [push])

  const label = detached
    ? `HEAD ${status?.head?.short ?? ''}`.trim()
    : status?.branch === undefined || status.branch === ''
      ? '当前分支'
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
      <div className="dsh-cg-tools">
        <button
          type="button"
          className="dsh-cg-branch"
          // Disabled while any repository operation is in flight: a second
          // dialog opened then could queue a second checkout behind the first.
          disabled={!onBranch || busy}
          title={switching === null
            ? status?.upstream === undefined ? '切换分支' : `上游：${status.upstream}`
            : `正在切换到 ${switching}…`}
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
          {detached ? <span className="dsh-cg-divergence">游离</span> : null}
        </button>
        <BranchDialog
          open={open}
          sessionId={sessionId}
          onClose={closeDialog}
          onConfirm={choose}
          onError={onError}
        />
        {/* The tooltip's anchor is the span, not the button: a disabled button
            emits no pointer events, so anchoring on it would lose the hover
            exactly when the bubble has the most to explain. */}
        {/* Which remote control the row offers is the branch's own answer rather
            than a setting. An upstream means the two counts have something to be
            counted against and Sync is what resolves them; no upstream means
            there is nothing to count, and the branch needs a relationship before
            it needs a comparison — that is Publish. Neither control is ever asked
            to show a number it cannot stand behind. */}
        {publishable
          ? (
            <Tooltip label="发布分支" side="bottom" portal>
              <span className="dsh-cg-tip">
                <button
                  type="button"
                  className="dsh-cg-icon"
                  aria-label="发布分支"
                  data-busy={syncing === 'push'}
                  disabled={!reachable || busy || refreshing}
                  onClick={publish}
                >
                  {syncing === 'push' ? SPINNER_ICON : <IconPublish />}
                </button>
              </span>
            </Tooltip>
          )
          : (
            /* One control for both directions of the round trip. The two arrows
               and their counts stay inside it — each beside its own glyph, each
               turning while its own half is in flight — so the button that states
               the divergence is the button that resolves it. No word in the
               button itself: 同步变更 is this tooltip's label and the button's
               accessible name. */
            <Tooltip label="同步变更" side="bottom" portal>
              <span className="dsh-cg-tip">
                <button
                  type="button"
                  className="dsh-cg-icon dsh-cg-sync"
                  aria-label="同步变更"
                  // No `data-busy` on the button itself: each arrow marks its own
                  // half of the round trip, and one on the button would turn both.
                  disabled={!reachable || busy || refreshing}
                  onClick={sync}
                >
                  <span
                    className="dsh-cg-sync-arrow"
                    data-busy={syncing === 'pull'}
                    data-pending={behind > 0}
                    aria-hidden="true"
                  >
                    {syncing === 'pull' ? SPINNER_ICON : <IconPull />}
                    <span className="dsh-cg-sync-count">{behind}</span>
                  </span>
                  <span
                    className="dsh-cg-sync-arrow"
                    data-busy={syncing === 'push'}
                    data-pending={ahead > 0}
                    aria-hidden="true"
                  >
                    {syncing === 'push' ? SPINNER_ICON : <IconPush />}
                    <span className="dsh-cg-sync-count">{ahead}</span>
                  </span>
                </button>
              </span>
            </Tooltip>
          )}
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
              {refreshing ? SPINNER_ICON : <IconRefresh />}
            </button>
          </span>
        </Tooltip>
      </div>
    </div>
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

/** What each run of rows is called. */
const BRANCH_GROUP_LABEL: Readonly<Record<BranchGroup, string>> = {
  current: '当前分支',
  local: '本地分支',
  remote: '远程分支',
}

/**
 * The branches Git reports, as a dialog the choice is confirmed in.
 *
 * A dialog rather than a dropdown because the list here is the whole decision: a
 * repository can hold hundreds of branches, so the list scrolls inside a fixed
 * height and carries a filter of its own. The rows are the three groups a branch
 * can come from — 当前分支, 本地分支, 远程分支 — each labelled where it starts, so
 * a remote name is never mistaken for a local one of the same shape and the
 * branch already checked out needs no mark of its own. The click that picks a row
 * therefore selects it and nothing else — the footer's button is what applies the
 * choice, because a checkout rewrites the working tree and a stray click on a
 * scrolling list must not do that.
 *
 * One row is active at a time, and that index is the only thing the list paints
 * and the only thing a keystroke acts on: the keys walk it with a wrap-around
 * from the branch the dialog opened on, the pointer takes it over by moving onto
 * a row, and Enter applies whichever row it is. The filter keeps the keyboard
 * throughout — the arrows move the highlight rather than the focus — so typing
 * still narrows the list after the arrows have walked it, and a click selects
 * without switching: a checkout rewrites the working tree, so only the footer's
 * button or Enter applies the choice. Escape closes the dialog the way the
 * Modal's own layer does it.
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
 * @param props.open - whether the dialog is showing.
 * @param props.sessionId - the session whose repository is being read.
 * @param props.onClose - called by 取消, the close button, Escape, or the mask.
 * @param props.onConfirm - called with the picked branch when 切换 is pressed.
 * @param props.onError - called with the failure to state in the error dialog.
 * @returns the dialog element.
 */
function BranchDialog(props: {
  readonly open: boolean
  readonly sessionId: string | undefined
  readonly onClose: () => void
  readonly onConfirm: (branch: string) => void
  readonly onError: (error: GitError) => void
}): ReactElement {
  const { open, sessionId, onClose, onConfirm, onError } = props
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

  // The cleanup discards a late answer and clears the one already in state, so a
  // reopen starts on 正在读取分支… instead of painting the previous list for the
  // frame between the reopen and the request.
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
          onError({ title: '读取分支列表失败', lines: [reasonOf(result, '读取分支列表失败')] })
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
  }, [open, sessionId, onClose, onError])

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
  // The one active row, as an index into `shown`: -1 while nothing is active,
  // which is also the state a filter with no matches leaves behind. It is the
  // only thing the list paints and the only thing a keystroke acts on, so the
  // pointer and the keys can never disagree about which row is lit.
  const active = picked === null ? -1 : shown.findIndex(row => row.name === picked)

  /** One ref per rendered row, so the active row can be scrolled into view. */
  const rowRefs = useRef<(HTMLButtonElement | null)[]>([])
  /** Prefixed onto each row's id, which the filter names as its active option. */
  const listId = useId()

  // The active row is no longer DOM focus — the filter keeps the keyboard — so
  // nothing scrolls it into view by itself. `nearest` moves the list as little as
  // it can: a row already on screen stays exactly where it is.
  useLayoutEffect(() => {
    if (active < 0) return
    rowRefs.current[active]?.scrollIntoView({ block: 'nearest' })
  }, [active, shown])

  /**
   * Whether this branch may be switched to.
   *
   * The one gate, consulted by the footer's button and by Enter alike: a keyboard
   * that could press past a disabled button would be a second, quieter way to
   * check out. Two refusals only — no row active, and the branch already checked
   * out — because whether a switch would be accepted is Git's answer, given when
   * the switch is asked for and stated by the error dialog if it is a refusal.
   *
   * @param name - the branch to judge, or null when no row is active.
   * @returns true when a checkout of that branch may be offered.
   */
  const switchable = (name: string | null): boolean => name !== null && name !== current

  /**
   * The keys the dialog offers.
   *
   * Bound on the whole dialog, and they move the highlight rather than the focus:
   * the filter keeps the keyboard for as long as the dialog is open, so the next
   * character still narrows the list after an arrow has walked it. That is the
   * whole of the interaction — one active row, which the keys walk with a
   * wrap-around and the pointer takes back by moving over a row — and it is what
   * the terminal tab's completion popup and the platform's own model picker do,
   * for the same reason. The walk starts from the active row, not from nothing,
   * so the branch the dialog opened on is where the first arrow moves away from;
   * Home and End jump to the ends.
   *
   * The dialog rather than the body is the binding site because the keyboard can
   * end up on the dialog element itself: clicking the card's own background moves
   * focus there, and those keys never reach the body. Enter is the exception — it
   * applies the active row only from the search field, so the footer's buttons and
   * the header's ✕ keep their own activation. Escape is not handled here at all:
   * the Modal owns it, along with the focus it hands back to the button that
   * opened the dialog. Tab is left alone as well — the list holds no tab stop of
   * its own, so the keyboard leaves the filter for the footer's buttons, which is
   * what keeps a two-hundred-branch list from becoming two hundred tab stops.
   *
   * @param event - the dialog's key event.
   */
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    // An IME owns these keys while it is composing: its arrows walk candidate
    // words and its Enter commits one, so neither may apply a branch. The
    // platform's own model picker guards the same way.
    if (event.nativeEvent.isComposing) return

    if (event.key === 'Enter') {
      if (!(event.target instanceof HTMLInputElement)) return
      if (event.repeat || picked === null || !switchable(picked)) return
      event.preventDefault()
      onConfirm(picked)
      return
    }

    const last = shown.length - 1
    const next = event.key === 'ArrowDown' ? (active < 0 ? 0 : (active + 1) % shown.length)
      : event.key === 'ArrowUp' ? (active < 0 ? last : (active - 1 + shown.length) % shown.length)
        : event.key === 'Home' ? 0
          : event.key === 'End' ? last
            : -1
    // A key the list does not act on, or a filter that matched nothing, is left
    // to whoever else wants it: the caret the arrows would have moved is still
    // the filter's own.
    if (next < 0 || next > last) return
    event.preventDefault()
    setPicked(shown[next]?.name ?? null)
  }

  // The dialog's states, with the filter first in the tree that carries one. That
  // order is not cosmetic: the Modal looks for `data-modal-autofocus` in the frame
  // the layer opens the dialog — one render *before* the branches arrive — so a
  // filter that waited for the list would leave the ✕ (the dialog's first
  // focusable control) holding the keyboard instead, and the arrows would have
  // nothing to walk. Keeping that one input mounted across the load is also what
  // lets it keep the focus it was given, and keeps whatever was typed while
  // reading in it.
  let content: ReactNode
  if (noRepo) {
    content = <p className="dsh-cg-dialog-hint">当前会话目录不是 Git 仓库</p>
  } else if (branches !== null && rows.length === 0) {
    content = <p className="dsh-cg-dialog-hint">没有可切换的分支</p>
  } else {
    content = (
      <>
        <Input
          className="dsh-cg-branch-filter"
          type="text"
          role="searchbox"
          // The keyboard never leaves the field, so the row it is walking is named
          // rather than focused — the same pair the platform's own model picker
          // puts on its search box, and the reason the arrows keep working after
          // a character has been typed.
          aria-controls={listId}
          aria-activedescendant={active < 0 ? undefined : `${listId}-${active}`}
          value={filter}
          placeholder="搜索分支"
          aria-label="搜索分支"
          // The Modal's own way of choosing the initial focus: React's
          // `autoFocus` runs before the layer can note the control to return to.
          // The primitive passes the marker through to the native field, which is
          // the element the layer actually focuses.
          data-modal-autofocus
          // Narrowing the list puts the active row back on the first match, so
          // Enter applies the row the list now leads with instead of nothing —
          // and a filter with no match leaves nothing active, which is honest.
          onChange={event => {
            const value = event.target.value
            setFilter(value)
            setPicked(shownFor(value)[0]?.name ?? null)
          }}
        />
        {branches === null
          ? <p className="dsh-cg-dialog-hint">正在读取分支…</p>
          : shown.length === 0
            ? <p className="dsh-cg-dialog-hint">没有匹配的分支</p>
            : (
              <div id={listId} className="dsh-cg-branch-list" role="listbox" aria-label="分支">
                {shown.map((row, index) => (
                  <Fragment key={row.name}>
                    {/* The heading opens each run of rows; the runs are in group
                        order already, so a kind that changed since the row above
                        is where the next one starts. */}
                    {row.group === shown[index - 1]?.group
                      ? null
                      : <span role="presentation" className="dsh-cg-branch-group">{BRANCH_GROUP_LABEL[row.group]}</span>}
                    <button
                      ref={element => { rowRefs.current[index] = element }}
                      type="button"
                      role="option"
                      id={`${listId}-${index}`}
                      aria-selected={picked === row.name}
                      // The list holds no tab stop: the filter is the keyboard's
                      // only seat in this dialog.
                      tabIndex={-1}
                      className="dsh-cg-branch-row"
                      // `move`, not `enter`: a pointer already resting inside a row
                      // has to take the highlight back the moment it moves after
                      // the arrows walked away from it, and `enter` has already
                      // fired by then.
                      onMouseMove={() => { if (picked !== row.name) setPicked(row.name) }}
                      // Keep the keyboard in the filter: letting the mousedown move
                      // focus into the row would end the typing that is narrowing
                      // the list (the terminal tab's completion popup prevents the
                      // same blur for its own keystroke stream).
                      onMouseDown={event => { event.preventDefault() }}
                      // The pointer selects, it does not switch: a checkout
                      // rewrites the working tree, so only the footer's button — or
                      // Enter — applies the choice.
                      onClick={() => setPicked(row.name)}
                    >
                      <span className="dsh-cg-branch-row-name">{row.name}</span>
                    </button>
                  </Fragment>
                ))}
              </div>
            )}
        {truncated
          ? <p className="dsh-cg-dialog-hint">分支过多，仅显示最近的部分分支</p>
          : null}
      </>
    )
  }

  const canConfirm = switchable(picked)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="切换分支"
      description={'选择并切换至指定分支'}
      closeLabel="关闭"
      // The dialog is wider than the platform's default card: a branch name is a
      // path, and `origin/feature/…` cut by an ellipsis is a name no one can
      // tell from its neighbour. The class is the platform's own way of sizing a
      // dialog (its RiskConfirmation does the same).
      className="dsh-cg-branch-dialog"
      // Bound on the dialog rather than on the body: the layer hands the keyboard
      // to the filter on open, but a click on the card's own background moves it to
      // the dialog element, and keys aimed there never reach the body.
      onKeyDownCapture={onKeyDown}
      footer={(
        <>
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button
            variant="primary"
            disabled={!canConfirm}
            onClick={() => { if (picked !== null) onConfirm(picked) }}
          >
            切换
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
