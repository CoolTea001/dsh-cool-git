/**
 * The Git conversation view.
 *
 * The page is the whole of the tab: a sidebar carrying the changed-path list
 * above the commit history, and a diff pane taking every remaining pixel.
 * Changed paths come from `git status`, the history from `git log`, and the
 * diff pane shows one side of one path's change — the index against HEAD, or the
 * worktree against the index — or one commit's whole patch (see `api.ts` for the
 * routes and `diff.ts` for the patch parser). The pane stacks the conflicts
 * above the index's half and the worktree's, each a disclosure of its own; a
 * conflicted path opens the conflict pane instead of a patch, because that pane
 * is where it is resolved.
 * A row's trailing `+` or `−` moves its path between the two lists. The
 * sidebar's second row is the commit form — a message field and one button, whose
 * scope is the index or the whole tree, chosen in the toolbar's More menu — and
 * the two panes stack under it. Both of the sidebar's boundaries —
 * its right edge and the divider between the two lists — are the reader's to
 * drag, and both sizes are remembered between visits (see `layout.tsx`).
 *
 * The page owns no repository state of its own: every answer is a plain value
 * fetched from the Host, and the only local state is which row is selected, which
 * answer is current, which failure the dialog is stating, which operation is in
 * flight — a checkout, one half of a remote round trip, the commit the
 * changed-path list asks for, or the undo that takes it back — each of which is
 * what disables the other controls, the commit form's scope, and where the two
 * boundaries were left.
 * That keeps a manual refresh honest — it re-reads `status` and `log`, and the
 * diff pane re-reads whatever it is showing.
 *
 * One consequence of that ownership is `cache.ts`'s business: the shell renders
 * one View at a time, so switching tabs unmounts this page and its answers with
 * it. The last repository answer is therefore cached per Workspace, the commit
 * form's scope is kept there too — it is a Workspace preference rather than a
 * conversation's, so a reload and every session in that Workspace open the form
 * the way it was left — and the reading position the reader chose is kept per
 * session below, so a return to this tab paints what they left and re-reads the
 * repository behind it instead of starting again from its loading rows.
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
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
  type RefObject,
} from 'react'
import { createPortal } from 'react-dom'
import {
  Button,
  Input,
  Menu,
  Modal,
  Tooltip,
  useAnchoredPosition,
  useModalLayer,
  type MenuEntry,
} from '@deepseek-ai/dsh-client-ui-primitives'
import {
  checkoutBranch,
  commitAll,
  commitStaged,
  completeMerge,
  createBranch,
  deleteBranches,
  discardAll,
  discardFolder,
  discardPath,
  fetchBranches,
  fetchBranchReport,
  fetchBranchUpstream,
  fetchCommit,
  fetchConflict,
  fetchDiff,
  fetchLog,
  fetchModelEfforts,
  fetchRemotes,
  fetchSettings,
  fetchStatus,
  generateMessage,
  markResolved,
  mergeBranch,
  pullBranch,
  pushBranch,
  resolveConflict,
  saveSettings,
  stageAll,
  stageFolder,
  stagePath,
  undoLastCommit,
  unstageAll,
  unstageFolder,
  unstagePath,
} from './api.js'
import {
  isSnapshotFresh,
  readCommitScope,
  readRepositorySnapshot,
  writeCommitScope,
  writeRepositorySnapshot,
} from './cache.js'
import { suppressComposerSeat } from './chrome.js'
import { displayPath, parsePatch, type DiffDoc, type DiffFile, type DiffLine } from './diff.js'
import {
  IconAlert,
  IconArrowRight,
  IconBranch,
  IconCheck,
  IconCopy,
  IconDiscard,
  IconFolder,
  IconGenerate,
  IconMinus,
  IconMore,
  IconPlus,
  IconPublish,
  IconPull,
  IconPush,
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
import {
  MAX_PROMPT_LENGTH,
  type BranchDeleteTarget,
  type BranchEntry,
  type BranchReportPayload,
  type BranchSafety,
  type ChangedFile,
  type ChangeKind,
  type CommitScope,
  type CommitSummary,
  type ConflictBlock,
  type ConflictDoc,
  type ConflictOperation,
  type ConflictRegion,
  type DeleteBranchesPayload,
  type DiffSide,
  type Failure,
  type LogPayload,
  type MessageModel,
  type MessageModelGroup,
  type ResolveChoice,
  type StatusPayload,
} from '../shared/contract.js'

/** How many commits the history pane asks for. */
const LOG_LIMIT = 60

/** Body lines the diff pane will draw before it stops and says how many are left. */
const MAX_DIFF_ROWS = 6000

/**
 * Unchanged lines a conflict pane keeps on each side of a folded run.
 *
 * Three is the amount Git itself puts around a hunk, and matching it is the
 * point: the conflict pane and the diff pane then leave the same amount of code
 * around the part that matters.
 */
const CONFLICT_CONTEXT_EDGE = 3

/** How long the copy button reports success before returning to its idle label. */
const COPY_FEEDBACK_MS = 1200

/**
 * The commit scope a Workspace nobody has chosen one for opens on.
 *
 * All is the whole-tree commitment: the button records everything the changed
 * path list shows, which is what a single commit button did before the scope was
 * a choice, and the answer a reader expects to get without looking at a setting
 * first. Staged is the narrower one — the index alone, for a reader who moved
 * paths there on purpose — and a Workspace that chooses it keeps it (see
 * `cache.ts`).
 */
const DEFAULT_COMMIT_SCOPE: CommitScope = 'all'

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

/**
 * How long every hover bubble on this page waits before it appears.
 *
 * Three quarters of a second keeps a pointer passing over a row or a toolbar
 * control from raising a bubble, while still reading as a direct answer to a
 * settled hover. The page keeps one constant so no control can drift to a
 * different pace.
 */
const TOOLTIP_DELAY_MS = 750

/**
 * How fast a hovered decoration row walks itself to the right, in pixels per
 * second.
 *
 * A speed rather than a duration: the distance belongs to the names in the row,
 * so a row with more of them should take longer to read rather than move faster.
 * Forty is a reading pace — a character in these chips' monospace face is about
 * 6px, so a row outrunning the sidebar is walked at roughly 0.15s per character
 * of the names it carries, and the longest of them are read in a few seconds
 * rather than blurred past.
 */
const REF_SCROLL_SPEED = 40

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

/**
 * Which row the diff pane is showing, if any.
 *
 * A changed path is named with the half of its change the row stands for: a file
 * that is staged and then edited again appears once per half, and the two rows
 * must select, highlight and diff independently. A commit needs no side.
 */
type Selection =
  | { readonly kind: 'file'; readonly file: ChangedFile; readonly side: DiffSide }
  | { readonly kind: 'commit'; readonly commit: CommitSummary }

/**
 * What one discard confirmation is about.
 *
 * A folder target names the directory and the number of files the row stood for
 * when the dialog opened. The count is the reader's context rather than a list
 * the Host trusts: the folder route re-reads the status inside the write queue,
 * so a folder that changed while the dialog was up still acts on what is there
 * now.
 */
type DiscardRequest =
  | { readonly kind: 'file'; readonly file: ChangedFile }
  | {
    readonly kind: 'folder'
    readonly path: string
    readonly count: number
    readonly untracked: boolean
  }
  | { readonly kind: 'all'; readonly count: number; readonly untracked: boolean }

/**
 * The halves of one path that the sidebar lists.
 *
 * A path can be in the index, in the worktree, or both, and the two are separate
 * rows: a partly staged file is one row under Staged and one under Changes. An
 * untracked path is in neither porcelain column but is a worktree change, so it
 * belongs to the unstaged list. A conflicted path is neither side: `git add`
 * would mark it resolved, and nothing but the reader can say that happened, so it
 * is classified as the conflict list alone.
 *
 * @param file - one changed path.
 * @returns the groups that list it, in sidebar order.
 */
function sidesOf(file: ChangedFile): readonly DiffSide[] {
  if (file.conflicted) return ['conflict']
  const sides: DiffSide[] = []
  if (file.staged) sides.push('staged')
  if (file.unstaged || file.untracked) sides.push('unstaged')
  return sides
}

/**
 * Whether one path belongs in one of the pane's lists.
 *
 * A path that holds both halves is in both lists: the index holds one version of
 * it and the worktree another, and each list states one of them.
 *
 * @param file - one changed path.
 * @param side - the list to test.
 * @returns true when the path has that half.
 */
function inList(file: ChangedFile, side: DiffSide): boolean {
  return sidesOf(file).includes(side)
}

/**
 * The identity one row's write is tracked under: its half, then its path.
 *
 * A path can be listed twice — staged and unstaged — so the write in flight is
 * keyed by the row rather than by the file. Both the handlers that set it and the
 * rows that read it must spell the key the same way, which is why it is built
 * here rather than by string concatenation at each site.
 *
 * @param side - the half of the change the row stands for.
 * @param path - the repository-relative path.
 * @returns the row's key.
 */
function rowKey(side: DiffSide, path: string): string {
  return `${side}:${path}`
}

/**
 * The identity one whole group's write is tracked under: a half and no path.
 *
 * A group header's action covers every row in that half, so it is keyed by the
 * half alone; the trailing separator is what keeps it from colliding with a path
 * that happens to be empty.
 *
 * @param side - the half the group stands for.
 * @returns the group's key.
 */
function groupKey(side: DiffSide): string {
  return `${side}:`
}

/** The diff pane's current answer, or the fact that it is still loading. */
interface DocState {
  /** Identity of the selection this answer belongs to. */
  readonly key: string
  readonly loading: boolean
  readonly error?: string
  readonly doc?: DiffDoc
  readonly truncated?: boolean
  readonly commit?: CommitSummary & { readonly body: string }
  readonly merge?: boolean
  /**
   * The parsed conflict of the selected unmerged path, when it has one.
   *
   * A conflict answer is not a patch and does not go through `diff.ts`: the pane
   * draws it from the file's marker blocks, which is what the reader chooses
   * within. So the two live in the same state rather than in two, and the pane
   * reads whichever the selection asked for.
   */
  readonly conflict?: ConflictDoc
}

/**
 * The three changed-path lists the pane draws.
 *
 * All three are drawn together, each a disclosure of its own, so the reader can
 * fold one away while reading another. The conflict list comes first because it
 * is the one that blocks everything else: a commit cannot record a tree with
 * unmerged paths in it, so the list that has to be emptied before the others can
 * be acted on is the list that reads first.
 *
 * Every row in it opens the conflict pane, and that pane is what resolves it.
 * The two other lists never hold a conflicted path — `sidesOf` puts one in this
 * list alone — which is why no bulk action here can stage a file that still has
 * markers in it.
 */
const SIDES: readonly DiffSide[] = ['conflict', 'staged', 'unstaged']

/**
 * The halves a bulk action moves between the index and the worktree.
 *
 * Conflicts are not one of them: `git add` on an unmerged path means "resolved",
 * which is a per-path decision no group header can make.
 */
type StageableSide = Exclude<DiffSide, 'conflict'>

/**
 * What one session's page remembers between mounts.
 *
 * Only the page's own reading position: the row it had selected and the patch
 * that row had loaded. The repository answers are `cache.ts`'s business; this is
 * what makes a return to the tab feel like a return rather than a reload — the
 * reader lands on the diff they were reading, drawn from the parsed patch they
 * already had, while the page re-reads the repository around it.
 */
interface PageMemory {
  readonly selection: Selection | null
  readonly doc: DocState | null
}

/**
 * The memory of a session whose page has not been open in this browser yet.
 *
 * Nothing is selected: both lists are drawn from the start, and the reader
 * starts from the changes rather than from a patch they did not pick.
 */
const EMPTY_PAGE_MEMORY: PageMemory = { selection: null, doc: null }

/** How many sessions' reading positions the page keeps in memory. */
const PAGE_MEMORY_LIMIT = 8

/**
 * The reading positions alive in this page, keyed by session.
 *
 * A tab switch is a remount, so a reader who leaves the tab mid-diff would
 * otherwise find the pane empty on return. Keyed by session because a selection
 * names rows of that session's repository answer, and bounded because a
 * long-lived page visits sessions without ever unmounting the plugin.
 */
const pageMemories = new Map<string, PageMemory>()

/**
 * What one session's page last had selected, or the empty memory.
 *
 * @param sessionId - the session the page belongs to, when it named one.
 * @returns the selection and patch to draw before anything is fetched.
 */
function readPageMemory(sessionId: string | undefined): PageMemory {
  return pageMemories.get(sessionId ?? '') ?? EMPTY_PAGE_MEMORY
}

/**
 * Record what one session's page is showing.
 *
 * Written from an effect on every selection and patch change rather than on
 * unmount: a write here is one map assignment, and it must have happened by the
 * time the View goes away — which an unmount cleanup cannot know is coming.
 *
 * @param sessionId - the session the page belongs to, when it named one.
 * @param memory - the selection and patch to keep.
 */
function writePageMemory(sessionId: string | undefined, memory: PageMemory): void {
  const key = sessionId ?? ''
  // Re-inserted so the map's own order is least-recently-written first, which is
  // what the bound below drops from.
  pageMemories.delete(key)
  pageMemories.set(key, memory)
  if (pageMemories.size <= PAGE_MEMORY_LIMIT) return
  const oldest = pageMemories.keys().next().value
  if (oldest !== undefined) pageMemories.delete(oldest)
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
  readonly commit?: CommitSummary & { readonly body: string }
  readonly merge?: boolean
  /** The parsed conflict, on the route that answers one instead of a patch. */
  readonly conflict?: ConflictDoc
  /** The write staged the path as resolved, on a whole-file resolution. */
  readonly staged?: boolean
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
  return selection.kind === 'file'
    ? `file:${selection.side}:${selection.file.path}`
    : `commit:${selection.commit.hash}`
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
  return base
}

/**
 * Turn one conflict answer into the pane's state.
 *
 * The shape is deliberately the same `DocState` a patch uses, with `conflict`
 * where `doc` would be: the pane switches on the selection's side, not on which
 * kind of answer is in flight, so a conflict and a patch are two contents of one
 * slot rather than two slots.
 *
 * @param t - the page's translate seat, for the reason the answer did not give.
 * @param key - the selection identity this answer belongs to.
 * @param result - the payload the route returned.
 * @returns the pane state to render.
 */
function buildConflictDoc(
  t: Translate,
  key: string,
  result: RouteAnswer | null | undefined,
): DocState {
  if (result?.ok !== true || result.conflict === undefined) {
    return { key, loading: false, error: reasonOf(t, result ?? {}, 'fallback.unknown') }
  }
  return { key, loading: false, conflict: result.conflict }
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
 * One failed operation, as the error dialog states it.
 *
 * The heading names the action and the answer's own reason is the dialog's one
 * line. The reason falls back to the same entry as the heading when the answer
 * carried neither a code nor any text, so a request that failed silently still
 * says what it was trying to do.
 *
 * @param t - the page's translate seat.
 * @param title - the entry naming the action that failed.
 * @param payload - the route's answer.
 * @param params - the values that entry's placeholders take.
 * @returns the dialog's error.
 */
function failureOf(
  t: Translate,
  title: MessageKey,
  payload: RouteOutcome,
  params?: Readonly<Record<string, string | number>>,
): GitError {
  return { title: t(title, params), lines: [reasonOf(t, payload, title, params)] }
}

/**
 * Whether a refused merge or pull left the merge in the working tree.
 *
 * That is a state, not a refusal: the conflict list is the page's answer to it,
 * and a dialog saying so would be a second sentence about something the reader
 * can already see. Two facts say so, and both are in the answer. `reason` is the
 * one the Host sends today. The failure code is the older signal, kept because a
 * page can outlive the Host it talks to — a reload picks up a new bundle while
 * the process behind it still runs yesterday's — and reporting a state as an
 * error is exactly what that mismatch produces otherwise.
 *
 * @param payload - the route's answer.
 * @returns whether the merge the request asked for is in the tree.
 */
function leftMerge(payload: RouteOutcome | null | undefined): boolean {
  if (payload === null || payload === undefined) return false
  const code = payload.failure?.code
  return payload.reason === 'conflict' || code === 'pull-conflict' || code === 'merge-conflict'
}

/**
 * The lines one branch-delete answer amounts to.
 *
 * A delete is the one request whose answer is a list, so it is the one failure
 * the page states per subject rather than per request: each branch Git refused
 * gets a line that names it and says why, because a selection is deleted one
 * branch at a time and "could not delete" over five of them would not say which
 * four went through. A branch that was deleted contributes nothing — the re-read
 * branch list is where that is visible.
 *
 * An answer with no list at all is the request itself failing, which has one
 * reason rather than several and is stated the way every other refusal is.
 *
 * @param t - the page's translate seat.
 * @param payload - the route's answer.
 * @returns one line per branch that was refused; empty when all of them went.
 */
function deletionLines(t: Translate, payload: DeleteBranchesPayload | undefined): string[] {
  const results = payload?.results
  if (payload?.ok === true) return []
  if (!Array.isArray(results) || results.length === 0) {
    return [reasonOf(t, payload ?? {}, 'title.branchDelete')]
  }
  return results
    .filter(item => item.ok !== true)
    .map(item => t('error.line', { label: item.name, reason: reasonOf(t, item, 'title.branchDelete') }))
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
 * One folder in the changed-path tree, with everything it holds.
 *
 * The folder is structure, not a total: it carries the rows below it and
 * nothing about how many that is.
 */
interface FileTreeFolder {
  /**
   * The folder as its row names it: its own segment, and any single-child
   * folders folded into it, joined with ` / `.
   */
  readonly name: string
  /** The segments `name` is built from, outermost first. */
  readonly segments: readonly string[]
  /**
   * The folder's repository-relative path, which is also its identity. A folded
   * chain carries the deepest folder's path, which is the one its children and
   * its closed state hang from.
   */
  readonly path: string
  readonly folders: readonly FileTreeFolder[]
  readonly files: readonly ChangedFile[]
}

/** A folder while the tree is being built: its children are still keyed by name. */
interface MutableFolder {
  readonly name: string
  readonly path: string
  readonly folders: Map<string, MutableFolder>
  readonly files: ChangedFile[]
}

/**
 * Group the changed paths into the directory tree the sidebar draws.
 *
 * A path's parent folders are created as the path is read, so a folder row
 * exists for every directory holding a changed file whether or not Git reported
 * the directory itself. Folders sort before files, both by name ignoring case:
 * that is the order a file explorer uses, and it keeps a folder's files together
 * however `git status` happened to list its paths.
 *
 * A directory holding one directory and no files of its own is a step in a path
 * rather than a row of its own, so `finishFolder` folds it into its child: under
 * `lib`, the chain `types/client` draws as one `types / client` row. That is the
 * compact folder an editor's explorer shows, and it keeps a deep tree from
 * spending a row and an indent on every directory that has nothing to say.
 *
 * @param files - the changed paths, in any order.
 * @returns the repository root, whose own row the sidebar does not draw.
 */
function buildFileTree(files: readonly ChangedFile[]): FileTreeFolder {
  const root: MutableFolder = { name: '', path: '', folders: new Map(), files: [] }

  for (const file of files) {
    const segments = file.path.split('/')
    let folder = root
    let prefix = ''
    for (const name of segments.slice(0, -1)) {
      prefix = prefix === '' ? name : `${prefix}/${name}`
      const child = folder.folders.get(name)
      if (child === undefined) {
        const created: MutableFolder = { name, path: prefix, folders: new Map(), files: [] }
        folder.folders.set(name, created)
        folder = created
      } else {
        folder = child
      }
    }
    // The last segment is the file's own name, and the folder it was placed in
    // is where the row belongs; a path with no folder at all is a root file.
    folder.files.push(file)
  }

  return finishFolder(root)
}

/**
 * Sort one built folder's children and fold chains that lead nowhere.
 *
 * A folder with one child folder and no files is not a place a reader can stop:
 * the two rows would only spell one path between them. It is therefore folded
 * into its child, outermost segment first, so the row carries the whole chain
 * (`types / client`) and the child's own children sit under it at the same
 * depth. The root is exempt because its row is never drawn, and a folded chain
 * keeps the deepest folder's path so the row's tooltip and its closed state name
 * a real directory rather than a label.
 *
 * @param folder - a folder built from the changed paths.
 * @returns the folder as the sidebar renders it.
 */
function finishFolder(folder: MutableFolder): FileTreeFolder {
  const folders = [...folder.folders.values()]
    .map(finishFolder)
    .sort((left, right) => compareTreeNames(left.segments[0], right.segments[0]))
  const files = [...folder.files].sort(
    (left, right) => compareTreeNames(splitPath(left.path).name, splitPath(right.path).name),
  )
  if (folder.path === '' || files.length > 0 || folders.length !== 1) {
    return { name: folder.name, segments: [folder.name], path: folder.path, folders, files }
  }
  const only = folders[0]
  return {
    name: `${folder.name} / ${only.name}`,
    segments: [folder.name, ...only.segments],
    path: only.path,
    folders: only.folders,
    files: only.files,
  }
}

/**
 * Order two names the way the tree lists them.
 *
 * Case is ignored first so `README.md` and `assets` read as one alphabetical
 * run rather than as two groups the way a byte comparison would order them; the
 * exact spelling then breaks a tie, so two names differing only in case still
 * have a stable order. A locale collation is deliberately not used here: it
 * would make the tree's order depend on the browser's language rather than on
 * the names, while these are Git paths and read as data.
 *
 * @param left - one folder or file name.
 * @param right - the other.
 * @returns a negative, zero, or positive number, as `Array#sort` expects.
 */
function compareTreeNames(left: string, right: string): number {
  const a = left.toLowerCase()
  const b = right.toLowerCase()
  if (a !== b) return a < b ? -1 : 1
  return left < right ? -1 : left > right ? 1 : 0
}

/**
 * The indent a tree row sits at.
 *
 * The level travels to the stylesheet as one custom property rather than as a
 * padding computed here, so the row's spacing stays beside the rest of the
 * tree's rules in `styles.ts` and a change of step is one declaration.
 *
 * @param depth - the row's level in the tree; a group header is 0 and its
 *   children start at 1.
 * @returns the row's style.
 */
function treeDepth(depth: number): CSSProperties {
  return { '--dsh-cg-depth': depth } as CSSProperties
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
 * One header's text: its label, and how many rows it is showing.
 *
 * The count is part of the line rather than a badge of its own, so the header
 * reads as one sentence and stays one line however narrow the sidebar gets —
 * the whole thing truncates as a unit instead of the count leaving first. It is
 * written even at zero, because a pane or group that is empty and one the page
 * never filled are two different states and only the count tells them apart.
 *
 * @param label - the header's name, already worded by the page's dictionary.
 * @param count - the rows under it.
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
  /**
   * Which repository read owns the page.
   *
   * Reads can overlap — a mount's background revalidation can be in flight when
   * a checkout, a pull, or the Refresh button starts another — and the older one
   * must not paint its answers over the newer one's, nor cache them: a snapshot
   * written by a read that started first but finished last would be served as
   * the newest answer on the next mount. Every read takes a number here and
   * checks it when the answers arrive.
   */
  const readRun = useRef(0)
  const sessionId = typeof props?.sessionId === 'string' ? props.sessionId : undefined

  // Read during the first render, not from an effect: this is what lets a return
  // to this tab draw its answer before anything runs. The snapshot is the
  // repository state `cache.ts` saved for this session's Workspace the last time
  // the page read it — from an earlier mount in this page, or from before a
  // reload. The memory is the row and patch this session's page was showing.
  //
  // Reading storage here is the same trade `layout.tsx` makes for its saved
  // boundaries: the alternative is one frame of the default, which for a diff
  // pane is a flash of an empty page the reader did not ask for.
  const cached = useMemo(() => readRepositorySnapshot(sessionId), [sessionId])
  const remembered = useMemo(() => readPageMemory(sessionId), [sessionId])

  const [status, setStatus] = useState<StatusPayload | null>(() => cached?.status ?? null)
  const [log, setLog] = useState<LogPayload | null>(() => cached?.log ?? null)
  const [loaded, setLoaded] = useState(() => cached !== null)
  const [refreshing, setRefreshing] = useState(false)
  /** Whether a fetch of the remote-tracking refs is in flight. */
  const [fetching, setFetching] = useState(false)
  /** The branch a checkout is in flight for, or null at rest. */
  const [switching, setSwitching] = useState<string | null>(null)
  /** The branch a merge is in flight for, or null at rest. */
  const [merging, setMerging] = useState<string | null>(null)
  /** Whether a branch create is in flight. */
  const [creating, setCreating] = useState(false)
  /** Whether a branch delete is in flight, which may be several pushes. */
  const [deleting, setDeleting] = useState(false)
  /** The half of the remote round trip in flight, or null at rest. */
  const [syncing, setSyncing] = useState<RemoteRun | null>(null)
  /** Whether the changed-path pane's commit is in flight. */
  const [committing, setCommitting] = useState(false)
  /** Whether the menu's undo of the last commit is in flight. */
  const [undoing, setUndoing] = useState(false)
  /**
   * The scope the commit form's button is set to.
   *
   * Read before the first paint through this session's alias, because the scope
   * is the Workspace's choice rather than this mount's: a reload must open the
   * form the way the reader left it instead of asking them to switch again. A
   * session whose first-ever read has not landed yet has no alias, so it starts
   * on the default and adopts the Workspace's saved scope with `status` below.
   */
  const [commitScope, setCommitScope] = useState<CommitScope>(
    () => readCommitScope(sessionId) ?? DEFAULT_COMMIT_SCOPE,
  )
  /**
   * Whether the reader has chosen a scope on this mount.
   *
   * Adoption from `status` must not overwrite that: a choice made on screen is a
   * newer statement than the one a background re-read found on disk.
   */
  const scopeChosen = useRef(false)
  /**
   * The row whose index write is in flight, as `side:path`, or null at rest.
   *
   * One at a time, like every other write on this page: a second `git add`
   * started while the first still has the index lock is a failure the user did
   * not cause. The row's own button shows it, and every action in the list is
   * disabled for the wait.
   */
  const [staging, setStaging] = useState<string | null>(null)
  /** The row whose worktree discard is in flight, as `unstaged:path`, or null. */
  const [discarding, setDiscarding] = useState<string | null>(null)
  /**
   * The conflict write in flight, or null at rest.
   *
   * A resolution rewrites one file, and two of them in flight at once would race
   * the second against the first's bytes — the Host serializes the writes, but the
   * second request carries region keys from before the first one landed, and the
   * answer it would get is "this file changed". So the page holds the answers to
   * one at a time and shows the wait on the block that was clicked.
   */
  const [resolving, setResolving] = useState<string | null>(null)
  /**
   * The path whose "mark resolved" write is in flight, or null at rest.
   *
   * The pane's header button and a conflict row's own mark both go through one
   * write, so one name is enough: a second click is refused while this holds a
   * path, and the control that asked shows the wait.
   */
  const [markingPath, setMarkingPath] = useState<string | null>(null)
  /** Whether the conflict group's "mark everything resolved" run is in flight. */
  const [markingAll, setMarkingAll] = useState(false)
  /** Whether the merge the commit form records is in flight. */
  const [ending, setEnding] = useState(false)
  /** The row or folder the discard dialog is asking about, or null while none is open. */
  const [discardTarget, setDiscardTarget] = useState<DiscardRequest | null>(null)
  const [selection, setSelection] = useState<Selection | null>(() => remembered.selection)
  const [doc, setDoc] = useState<DocState | null>(() => remembered.doc)
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

  /**
   * Keep a file selection on the newest status, or drop it.
   *
   * The selected row can leave the working tree while the tab is away — a
   * commit, a revert, or the agent cleaning up after itself — and a path the
   * repository no longer lists has no diff to show, so the selection goes with
   * it rather than leaving the pane over a patch for a row that is gone. A
   * commit selection is left alone: the history is bounded, and an older commit
   * falling off the list is no evidence that it disappeared.
   *
   * A path that is still listed may have moved between the halves — an external
   * `git add` or `git restore` turns one row into the other — so a selection
   * whose side no longer exists follows the path to the half that does, which is
   * the same patch for the same file rather than a pane over a row that is gone.
   *
   * @param status - the status answer to judge the selection against.
   */
  const pruneSelection = useCallback((status: StatusPayload | null): void => {
    if (status?.ok !== true) return
    setSelection(current => {
      if (current?.kind !== 'file') return current
      const file = (status.files ?? []).find(candidate => candidate.path === current.file.path)
      if (file === undefined) return null
      const sides = sidesOf(file)
      if (sides.includes(current.side)) return { ...current, file }
      const next = sides[0]
      return next === undefined ? null : { kind: 'file', file, side: next }
    })
  }, [])

  /** Re-read the repository state and the history, and cache both answers. */
  const refresh = useCallback(async (): Promise<void> => {
    const run = ++readRun.current
    setRefreshing(true)
    try {
      const [nextStatus, nextLog] = await Promise.all([
        fetchStatus(sessionId),
        fetchLog(sessionId, LOG_LIMIT),
      ])
      // A newer read took the page over while these answers were in flight, so
      // this one paints and caches nothing: its answers describe a moment the
      // page has already left.
      if (run !== readRun.current) return
      setStatus(nextStatus)
      setLog(nextLog)
      // The next mount of this tab — or a reload — reads these back instead of
      // paying for the two calls again (see `cache.ts`). Written here, after the
      // answers arrive, so what is saved is always an answer this page drew.
      writeRepositorySnapshot(sessionId, nextStatus, nextLog)
      pruneSelection(nextStatus)
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
      // Only the read that still owns the page clears the wait: an overtaken
      // read finishing later must not release a spinner the newer one is using.
      if (run === readRun.current) {
        setRefreshing(false)
        setLoaded(true)
      }
    }
  }, [pruneSelection, sessionId, reportError, t])

  // Mounting is the refresh trigger: the shell renders exactly one View at a
  // time, so switching to this tab is what re-reads the repository. A cached
  // answer from a moment ago is the state the reader just left, so it serves the
  // mount exactly as it was; anything older — or nothing at all — is re-read,
  // which for a cached mount happens behind the answer already on screen rather
  // than over the loading rows. A session change (a new conversation) re-runs
  // this through `refresh`'s identity.
  useEffect(() => {
    // A selection restored from memory belongs to an answer someone wrote for
    // this Workspace — possibly another reader of the same repository — so it is
    // judged against that answer before the diff effect asks the Host about a
    // row this session's list may no longer hold.
    if (cached !== null) pruneSelection(cached.status)
    if (cached !== null && isSnapshotFresh(cached)) return
    void refresh()
  }, [cached, pruneSelection, refresh])

  // The scope state belongs to the Workspace this View is showing. A different
  // session names a different Workspace, so a choice made here must not carry
  // over: the effect below then opens the new Workspace's saved scope. Declared
  // first so the reset has landed before that adoption reads the new answer.
  useEffect(() => {
    scopeChosen.current = false
  }, [sessionId])

  // Adopt the scope this Workspace was left at once an answer names it. A reload
  // has it already — the initial state read it through the session's alias — but
  // a session opening this tab for the first time has no alias until its first
  // read lands, and only then can the form join the scope its Workspace shares.
  // A choice the reader made on this mount wins: it is newer than the one on
  // disk, and a background re-read must not put the form back.
  useEffect(() => {
    if (scopeChosen.current) return
    setCommitScope(readCommitScope(sessionId, status) ?? DEFAULT_COMMIT_SCOPE)
  }, [sessionId, status])

  // Record a choice the reader made on this mount — and only that kind: a scope
  // adopted from storage is already saved. An effect rather than a write in the
  // click handler because the click can land before the first `status` answer
  // names the repository, and this runs again when one arrives.
  useEffect(() => {
    if (!scopeChosen.current) return
    writeCommitScope(sessionId, status, commitScope)
  }, [commitScope, sessionId, status])

  // A checkout replaces the working tree, so everything this page is showing is
  // stale at once: the branch, the changed paths, the history, and any patch the
  // diff pane had loaded — which may belong to a file that no longer exists.
  // Dropping the selection is the honest version of that; keeping it would leave
  // a title over a diff from a branch the user already left. A merge rewrites the
  // history the same way (and, when it is a fast-forward, the files), a
  // fast-forward pull does too, and a commit empties the very diffs it recorded,
  // so all of them take this path.
  const handleSwitched = useCallback((): void => {
    setSelection(null)
    void refresh()
  }, [refresh])

  /**
   * Refresh the upstream ref of the branch a switch just landed on.
   *
   * The re-read a switch starts paints the new branch at once, but its counts are
   * read from the local remote-tracking refs, and a checkout does not move those:
   * a branch the remote has moved past reads as level with it until someone
   * fetches. So the switch follows its own re-read with one background fetch of
   * that branch's upstream remote, and re-reads again once that fetch actually
   * refreshed something — the counts the sync control draws are then about the
   * remote as it is now, not as it was at the last manual Fetch.
   *
   * Every answer is quiet, refusals included: the switch itself already succeeded
   * and is on screen, and a fetch that could not reach the network — offline, a
   * credential the remote rejected, a session that may not write `.git` — is not
   * a failure of the action the reader took, so it must not replace the page with
   * a dialog. `skipped` means there was nothing to refresh at all.
   */
  const refreshUpstream = useCallback((): void => {
    void fetchBranchUpstream(sessionId).then(result => {
      if (result?.ok !== true || result.skipped === true) return
      void refresh()
    })
  }, [sessionId, refresh])

  // A push moves nothing on disk: the branch, the changed paths and the patch on
  // screen are all still true. Only the divergence changed, so the selection is
  // kept and just the two answers are re-read.
  const handleSynced = useCallback((): void => {
    void refresh()
  }, [refresh])

  /**
   * Refresh every remote-tracking ref, and re-read what they feed.
   *
   * The safest operation in the menu and the one with the least to say: a fetch
   * moves nothing outside `.git`, so the selection stays valid and a success is
   * reported the way a sync's is — by re-reading, which is where the divergence
   * counts and the remote branch list come from. A refusal is the error
   * dialog's, like every other failure.
   */
  const handleFetch = useCallback((): void => {
    setFetching(true)
    void fetchRemotes(sessionId).then(result => {
      setFetching(false)
      if (result?.ok !== true) {
        reportError(failureOf(t, 'title.fetch', result))
        return
      }
      handleSynced()
    })
  }, [sessionId, handleSynced, reportError, t])

  /**
   * Check out the branch the dialog confirmed.
   *
   * A refusal is the error dialog's, like every other failure. A success takes
   * the switch's own path and then asks the Host to refresh that branch's
   * upstream, so the counts the page shows describe the remote rather than the
   * last time someone fetched it.
   *
   * @param branch - the branch the user picked and confirmed.
   */
  const handleCheckout = useCallback((branch: string): void => {
    setSwitching(branch)
    void checkoutBranch(sessionId, branch).then(result => {
      setSwitching(null)
      if (result?.ok !== true) {
        reportError(failureOf(t, 'title.switchBranch', result, { branch }))
        return
      }
      handleSwitched()
      refreshUpstream()
    })
  }, [sessionId, handleSwitched, refreshUpstream, reportError, t])

  /**
   * Merge the branch the dialog confirmed into the branch HEAD is on.
   *
   * The page's part is one name: the Host decides what a name may be, and Git
   * merges into the branch it is on. The merge leaves HEAD where it is, but it
   * rewrites the history — and a fast-forward rewrites the working tree as well —
   * so a success takes the checkout's path and re-reads everything.
   *
   * A refusal is the error dialog's, worded around the branch the request named.
   * A conflicted merge is not one of them: it is a state rather than a dead end,
   * left in the tree for this page to resolve, so the repository is simply re-read
   * and the paths Git wrote markers into appear in the conflict list — which is
   * the word for it, and needs no dialog saying the same thing.
   *
   * @param branch - the branch the dialog confirmed, which is the merge's source.
   */
  const handleMerge = useCallback((branch: string): void => {
    setMerging(branch)
    void mergeBranch(sessionId, branch).then(result => {
      setMerging(null)
      if (result?.ok !== true) {
        // A conflicted merge is left in the tree for this page to resolve, so it
        // is re-read rather than reported: the conflict list states it, and the
        // dialog is for the refusals that leave nothing to work on.
        if (leftMerge(result)) {
          handleSynced()
          return
        }
        reportError(failureOf(t, 'title.mergeFrom', result, { branch }))
        return
      }
      handleSwitched()
    })
  }, [sessionId, handleSwitched, handleSynced, reportError, t])

  /**
   * Start the branch the dialog confirmed, and switch to it.
   *
   * The same shape as a checkout on this side and the same shape on the other:
   * the Host creates the ref and checks it out in one call, so the page's whole
   * part is the two names the dialog collected. It takes the checkout's path
   * afterwards for the checkout's reason — HEAD moved, so every answer on screen
   * is stale — and then the same upstream refresh, because a branch started at a
   * remote-tracking ref made that ref its upstream. A branch started at a local
   * one has none, and the refresh then answers `skipped` without a network call.
   * A refusal is the error dialog's.
   *
   * @param name - the branch to create.
   * @param start - the branch it starts at.
   */
  const handleCreate = useCallback((name: string, start: string): void => {
    setCreating(true)
    void createBranch(sessionId, name, start).then(result => {
      setCreating(false)
      if (result?.ok !== true) {
        reportError(failureOf(t, 'title.branchCreate', result))
        return
      }
      handleSwitched()
      refreshUpstream()
    })
  }, [sessionId, handleSwitched, refreshUpstream, reportError, t])

  /**
   * Delete the branches the dialog confirmed, and report what became of each.
   *
   * One request for the whole selection, so the page's part is one call whatever
   * was ticked. The answer is a list rather than a verdict, and that is what this
   * reports: every branch that was refused gets its own line, named, because
   * "could not delete" over a selection of five says nothing about which four
   * went. A run where everything was deleted says nothing at all — the re-read
   * state is the report, as it is for every other success on this page.
   *
   * The re-read happens either way: a refusal can still have deleted the others,
   * so the branch list on screen is stale after one just as it is after a clean
   * run.
   *
   * The returned promise is the dialog's to wait on: unlike the other decisions,
   * a delete keeps its dialog on screen while the request runs, so the button
   * that asked for it is the one that reports the wait.
   *
   * @param targets - the branches the dialog selected.
   * @returns a promise that resolves once the request has been answered.
   */
  const handleDelete = useCallback(async (targets: readonly BranchDeleteTarget[]): Promise<void> => {
    setDeleting(true)
    try {
      const result = await deleteBranches(sessionId, targets)
      const lines = deletionLines(t, result)
      if (lines.length > 0) reportError({ title: t('title.branchDelete'), lines })
      handleSynced()
    } finally {
      setDeleting(false)
    }
  }, [sessionId, handleSynced, reportError, t])

  /**
   * Send this branch to its upstream, and report the answer.
   *
   * Three rows run this one call — Publish, Sync's second half, and the menu's
   * own Push — because the Host decides which of them it is from the repository
   * itself: a branch with no upstream is pushed to the single configured remote
   * and recorded as its upstream. The only difference the page makes is what it
   * calls a failure.
   *
   * @param title - the entry naming which of the three was asked.
   */
  const pushRemote = useCallback((title: MessageKey): void => {
    setSyncing('push')
    void pushBranch(sessionId).then(result => {
      setSyncing(null)
      if (result?.ok !== true) {
        reportError(failureOf(t, title, result))
      }
      // A push moves nothing on disk, but a refusal moves the page's idea of the
      // divergence just as surely, so the two answers are re-read either way.
      handleSynced()
    })
  }, [sessionId, handleSynced, reportError, t])

  /**
   * Pull this branch's upstream, and report the answer.
   *
   * Pull and Sync both start here: the menu's Pull row asks for this one half on
   * its own, and Sync takes it as the first half of its round trip. A refusal
   * still re-reads the counts — the remote has moved whether or not anything was
   * brought in — and a success rewrites the working tree, so the diff on screen
   * goes with the selection it described.
   *
   * The state is released before the promise resolves, so a caller that chains
   * its own request (Sync's push) takes the spinner over rather than leaving the
   * pull's half turning under it.
   *
   * @returns whether anything was pulled, which is what Sync waits for before it
   *   has a history to push.
   */
  const pullRemote = useCallback((): Promise<boolean> => {
    setSyncing('pull')
    return pullBranch(sessionId).then(result => {
      setSyncing(null)
      if (result?.ok !== true) {
        // A pull that conflicts is not a refusal: the merge is in the tree and the
        // conflict list is the page's answer to it. Every other failure is the
        // dialog's.
        if (!leftMerge(result)) reportError(failureOf(t, 'title.pull', result))
        handleSynced()
        return false
      }
      handleSwitched()
      return true
    })
  }, [sessionId, handleSwitched, handleSynced, reportError, t])

  /**
   * Run the round trip: pull, then push.
   *
   * The order is what makes a single button safe. Pulling first means the push
   * that follows sends a history the remote already has, so the common
   * divergence — the remote moved on while this branch did — resolves without a
   * second click and without the non-fast-forward refusal. The pull merges when
   * the two sides have diverged, so what it brings in may be a merge commit of
   * its own; nothing here has to write a message for it.
   *
   * A pull that does not finish stops the round trip. A refused one has been
   * explained by the dialog; a conflicted one has left a merge in the tree the
   * push cannot act on — the conflict list is the page's next step, and pushing
   * into a half-merged history is exactly what must not happen. Neither one
   * raises the dialog here.
   *
   * This is only ever asked of a branch that has an upstream — without one the
   * header offers Publish instead — so the pull has a target by construction.
   */
  const syncRemote = useCallback((): void => {
    void pullRemote().then(pulled => {
      if (pulled) pushRemote('title.push')
    })
  }, [pullRemote, pushRemote])

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
   * Commit under the message the form holds, with the scope the form is set to.
   *
   * `all` is the old one-call decision: stage every change the list holds and
   * record it, because that is what the button offers in that mode. `staged`
   * commits the index as it stands — the page's own `+` and `−` actions already
   * decided what belongs there — and therefore can leave the worktree half of a
   * path behind, which is the point of the mode. What the answer decides is
   * whether the form keeps its message: a refusal leaves it where it is, because
   * the message is usually the thing to fix, and the repository is re-read either
   * way — even a refusal can have changed the index first.
   *
   * A staged commit keeps the reader's row where it can: the diff on screen may
   * be the other half of the same path, which is still in the worktree. The
   * re-read's pruning follows the selection to whichever half still exists, and
   * drops it only when the path left the list entirely.
   *
   * @param message - the commit message the form holds, already non-empty.
   * @returns whether the commit was made, which is what clears the form.
   */
  const handleCommit = useCallback((message: string): Promise<boolean> => {
    setCommitting(true)
    const request = commitScope === 'staged'
      ? commitStaged(sessionId, message)
      : commitAll(sessionId, message)
    return request.then(result => {
      setCommitting(false)
      if (result?.ok !== true) {
        const lines = [reasonOf(t, result, 'title.commit')]
        // This refusal is the machine's setup rather than the repository's
        // state, and the fix is a command the page will not run for the user:
        // state it under the refusal as a line of its own.
        if (result?.failure?.code === 'commit-identity') lines.push(t('hint.commit-identity'))
        reportError({ title: t('title.commit'), lines })
        handleSynced()
        return false
      }
      // A commit-all emptied every diff it recorded, so the selection goes with
      // them. A staged commit may have left the worktree half of the selected
      // path, and the re-read's pruning is what keeps that row readable.
      if (commitScope === 'all') handleSwitched()
      else handleSynced()
      return true
    })
  }, [commitScope, sessionId, handleSynced, handleSwitched, reportError, t])

  /**
   * Take the last commit off the branch and leave its changes staged.
   *
   * The menu row is the whole interaction: the Host moves HEAD back to the
   * commit's first parent with a soft reset, so the commit disappears from the
   * history while every byte it recorded stays in the index. That moves both
   * answers the page is drawing — the branch's history and the changed-path
   * lists — so a success takes the checkout's path and clears the selected diff:
   * a patch read against the old HEAD is no longer the one the new state means.
   *
   * A refusal is the error dialog's, like every other menu row's. The repository
   * is re-read either way, because the answer can only be trusted for what Git
   * actually did.
   */
  const handleUndoCommit = useCallback((): void => {
    setUndoing(true)
    void undoLastCommit(sessionId).then(result => {
      setUndoing(false)
      if (result?.ok !== true) {
        reportError(failureOf(t, 'title.undoCommit', result))
        handleSynced()
        return
      }
      handleSwitched()
    })
  }, [sessionId, handleSynced, handleSwitched, reportError, t])

  /**
   * Switch the commit form's scope.
   *
   * Recorded for the Workspace by the persistence effect above rather than
   * written here: a click can land before the first `status` answer names a
   * repository, and that effect re-runs when one does, so the choice reaches the
   * key the next mount reads. The ref makes this choice final for the mount —
   * the adoption effect watches `status`, and a background re-read landing after
   * a click must not put the form back where it was.
   *
   * @param next - the scope the reader picked.
   */
  const handleScopeChange = useCallback((next: CommitScope): void => {
    scopeChosen.current = true
    setCommitScope(next)
  }, [])

  /**
   * Adopt the answer one list write gave, or report its refusal.
   *
   * Every index and worktree write answers with the fresh status, and every one
   * of them paints and caches that answer the same way: the lists then describe
   * the state the write produced rather than a second read another writer could
   * race. A refusal is the error dialog's, followed by a re-read, because a
   * failed write can still have touched the index or the worktree and a stale
   * row is worse than a slow one.
   *
   * @param result - the answer the route gave.
   * @param title - the error dialog's heading when the write was refused.
   */
  const adoptWrite = useCallback((
    result: (RouteOutcome & { readonly status?: StatusPayload }) | null | undefined,
    title: MessageKey,
  ): void => {
    if (result?.ok !== true) {
      reportError(failureOf(t, title, result ?? {}))
      void refresh()
      return
    }
    if (result.status === undefined) return
    setStatus(result.status)
    writeRepositorySnapshot(sessionId, result.status, log)
  }, [sessionId, log, refresh, reportError, t])

  /**
   * Move one row's path between the index and the worktree.
   *
   * The request answers with the fresh status, so the page paints the state the
   * write produced rather than asking for a second read another writer could
   * race. The row the reader had selected follows the path to its new half — the
   * patch is the same file, and a pane left over the half that just disappeared
   * would be a diff for a row that is no longer listed. A refusal is the error
   * dialog's, and the page re-reads anyway: a failed `git add` can still have
   * touched the index, and a stale row is worse than a slow one.
   *
   * @param file - the changed path the row names.
   * @param side - the half the row is listed under, which is what decides the
   *   direction: a staged row unstages, an unstaged row stages.
   */
  const handleStageToggle = useCallback((file: ChangedFile, side: DiffSide): void => {
    if (side === 'conflict' || staging !== null || discarding !== null) return
    const key = rowKey(side, file.path)
    setStaging(key)
    const request = side === 'staged'
      ? unstagePath(sessionId, file.path, file.origPath)
      : stagePath(sessionId, file.path)
    void request.then(result => {
      setStaging(null)
      adoptWrite(result, side === 'staged' ? 'title.unstage' : 'title.stage')
      // The selection is not moved here: both halves are drawn, and the effect
      // above follows the path to the half it still has — or closes the pane
      // when it is no longer in either list.
    })
  }, [sessionId, staging, discarding, adoptWrite])

  /**
   * Move every changed path under one folder between the index and the worktree.
   *
   * The request names the directory alone; the Host reads the status inside its
   * write queue and applies the move to the paths under it, so a folder row can
   * stand for a tree the page never has to enumerate. The answer carries the
   * fresh status, exactly as the single-path actions do.
   *
   * @param path - the repository-relative folder the row names.
   * @param side - the list the folder is drawn in: staged unstages, unstaged stages.
   */
  const handleStageFolder = useCallback((path: string, side: DiffSide): void => {
    if (side === 'conflict' || staging !== null || discarding !== null) return
    setStaging(rowKey(side, path))
    const request = side === 'staged' ? unstageFolder(sessionId, path) : stageFolder(sessionId, path)
    void request.then(result => {
      setStaging(null)
      adoptWrite(result, side === 'staged' ? 'title.unstageFolder' : 'title.stageFolder')
    })
  }, [sessionId, staging, discarding, adoptWrite])

  /**
   * Move one whole half of the changed-path pane between the index and the
   * worktree.
   *
   * The request names no path: the Host resolves the side it acts on from the
   * status it reads inside its write queue, so the group header covers every row
   * that half holds without sending a tree of paths across the body. The half is
   * the whole side, so the Host's routes for it match the group exactly.
   *
   * @param side - the half the group names: staged unstages, unstaged stages.
   */
  const handleStageAll = useCallback((side: StageableSide): void => {
    if (staging !== null || discarding !== null) return
    setStaging(groupKey(side))
    const request = side === 'staged' ? unstageAll(sessionId) : stageAll(sessionId)
    void request.then(result => {
      setStaging(null)
      adoptWrite(result, side === 'staged' ? 'title.unstageAll' : 'title.stageAll')
    })
  }, [sessionId, staging, discarding, adoptWrite])

  /**
   * Ask before discarding one row's worktree change.
   *
   * A discard cannot be undone — an edited file goes back to the index, and an
   * untracked one is deleted — so the row's button only names the path and opens
   * the dialog; the request itself waits for the dialog's own confirmation.
   *
   * @param file - the changed path the row names.
   */
  const handleDiscard = useCallback((file: ChangedFile): void => {
    if (staging !== null || discarding !== null) return
    setDiscardTarget({ kind: 'file', file })
  }, [staging, discarding])

  /**
   * Ask before discarding every unstaged change under one folder.
   *
   * @param path - the repository-relative folder the row names.
   * @param count - how many changed files under it the row stood for.
   * @param untracked - whether any of them will be deleted rather than restored.
   */
  const handleDiscardFolder = useCallback((
    path: string,
    count: number,
    untracked: boolean,
  ): void => {
    if (staging !== null || discarding !== null) return
    setDiscardTarget({ kind: 'folder', path, count, untracked })
  }, [staging, discarding])

  /**
   * Ask before discarding every unstaged change in the repository.
   *
   * @param count - how many changed files the unstaged group held.
   * @param untracked - whether any of them will be deleted rather than restored.
   */
  const handleDiscardAll = useCallback((count: number, untracked: boolean): void => {
    if (staging !== null || discarding !== null) return
    setDiscardTarget({ kind: 'all', count, untracked })
  }, [staging, discarding])

  /**
   * Discard what the dialog confirmed, and repaint from the answer.
   *
   * The request answers with the fresh status, so the page paints the state the
   * write produced rather than asking for a second read another writer could
   * race. A refusal is the error dialog's, and the page re-reads anyway: a
   * failed discard can still have touched the worktree, and a stale row is worse
   * than a slow one.
   */
  const confirmDiscard = useCallback((): void => {
    const target = discardTarget
    if (target === null || staging !== null || discarding !== null) return
    setDiscardTarget(null)
    const path = target.kind === 'file'
      ? target.file.path
      : target.kind === 'folder' ? target.path : ''
    setDiscarding(rowKey('unstaged', path))
    const request = target.kind === 'file'
      ? discardPath(sessionId, target.file.path, target.file.untracked)
      : target.kind === 'folder'
        ? discardFolder(sessionId, target.path)
        : discardAll(sessionId)
    void request.then(result => {
      setDiscarding(null)
      adoptWrite(result, target.kind === 'all' ? 'title.discardAll' : 'title.discard')
    })
  }, [discardTarget, staging, discarding, sessionId, adoptWrite])

  /**
   * Ask the Host for a commit message written for the changes on disk.
   *
   * The page owns this call because it owns the session and the error dialog: the
   * route resolves the repository from the session's own header and takes the
   * model from the deployment's current default selection, so the request names
   * neither — and a refusal, from a clean tree to a missing model, is reported the
   * way every other failed request is. The scope is the form's commitment: a
   * staged-only commit gets a message about the index alone.
   *
   * Nothing is re-read on success: writing a message changes no file and no
   * history, so the status, the commit list, and the patch on screen are all still
   * what they were, and a refresh here would only repaint the page under the
   * pointer — and drop the selection the reader was looking at.
   *
   * @returns the message and whatever the model asked be read first, or null when
   * the request failed and the dialog is already stating why.
   */
  const handleGenerateMessage = useCallback((): Promise<GeneratedMessage | null> => {
    return generateMessage(sessionId, commitScope).then(result => {
      if (result?.ok !== true || typeof result.message !== 'string' || result.message === '') {
        reportError({
          title: t('title.message'),
          lines: [failureLine(t, 'label.message', result ?? {}, 'fallback.message')],
        })
        return null
      }
      // One sentence with the findings on lines of their own: the stylesheet's
      // `pre-line` is what breaks them, so no word has to be spent between them.
      const warnings = result.warnings ?? []
      return { message: result.message, ...(warnings.length === 0 ? {} : { warning: warnings.join('\n') }) }
    })
  }, [commitScope, sessionId, reportError, t])

  // One operation at a time, wherever the control that asks for it lives: the
  // branch pill and the More menu in the toolbar, the remote control in the
  // history pane's header, the commit in the changed-path pane's, the conflict
  // write behind one block's button, and the index write behind one row's stage
  // control. Stating it once here is what keeps a second click from queueing a
  // second checkout, a second merge, a second create or delete, a second round
  // trip, a second commit or undo, a second fetch, a second resolution, or a
  // second stage behind the first. Generation is not one of these: it writes
  // nothing, so it is the form's own state rather than the page's, and a slow
  // model call must not lock the branch pill or More.
  const busy = switching !== null || merging !== null || syncing !== null || committing
    || undoing || fetching || creating || deleting || staging !== null || resolving !== null
    || markingPath !== null || markingAll
    || ending

  const files: readonly ChangedFile[] = status?.ok === true ? status.files ?? [] : []
  const commits: readonly CommitSummary[] = log?.ok === true ? log.commits ?? [] : []
  // The commit form counts the index's rows: they are what a staged-scope commit
  // would record, and what Generate has to describe in that scope. A half-staged
  // path counts once, because the index holds one version of it; a conflicted
  // path is never staged, so it is not counted here.
  const stagedCount = files.filter(file => file.staged && !file.conflicted).length

  /**
   * Apply one choice to the conflict on screen.
   *
   * `keys` names the blocks to replace, and is absent for a whole-file choice —
   * the one a binary path or a path deleted on one side can take. The answer
   * carries the file after the write, so the pane repaints from what is on disk
   * rather than from what the click assumed; a refused key or a path that is no
   * longer unmerged is answered by re-reading the repository, because both mean
   * the page was holding an older picture of the file than the disk had.
   *
   * @param choice - which version to keep.
   * @param keys - the blocks to replace, or undefined for the whole file.
   */
  const handleResolve = useCallback((
    choice: ResolveChoice,
    keys: readonly string[] | undefined,
  ): void => {
    if (selection?.kind !== 'file' || selection.side !== 'conflict') return
    if (busy) return
    const path = selection.file.path
    const key = selectionKey(selection)
    setResolving(keys === undefined ? 'whole' : keys.join(','))
    void resolveConflict(sessionId, path, choice, keys).then(result => {
      setResolving(null)
      if (result?.ok !== true) {
        reportError(failureOf(t, 'title.resolve', result))
        // Both refusals that can happen here mean "the file is not what the page
        // read", so the answer is a re-read: it either repaints the conflict as
        // it really is, or drops the row because it was resolved elsewhere.
        if (result?.reason === 'stale' || result?.reason === 'not-conflicted') void refresh()
        return
      }
      if (result.conflict !== undefined) {
        setDoc({ key, loading: false, conflict: result.conflict })
      }
      // A whole-file choice *is* the resolution, so the path is staged and left
      // the conflict list; a block choice may have left markers behind, and the
      // list is re-read only once the index moved.
      if (result.staged === true) void refresh()
    })
  }, [selection, busy, sessionId, reportError, t, refresh])

  /**
   * Tell Git one conflicted path is resolved, without writing it.
   *
   * The write behind a conflict row's check, which is the page's one place for
   * it: the reader who resolved the file in their own editor never opens the
   * pane, and the reader who resolved the blocks is looking at the same row in
   * the list. The answer carries the fresh status, and the selection follows the
   * path out of the conflict list and into the index on the repaint that follows.
   *
   * @param path - the repository-relative path to stage as resolved.
   */
  const markResolvedPath = useCallback((path: string): void => {
    if (busy) return
    setMarkingPath(path)
    void markResolved(sessionId, path).then(result => {
      setMarkingPath(null)
      adoptWrite(result, 'title.resolveDone')
    })
  }, [busy, sessionId, adoptWrite])

  /** A conflict row's own check: the one place the page marks a path resolved. */
  const handleMarkResolvedRow = useCallback((file: ChangedFile): void => {
    markResolvedPath(file.path)
  }, [markResolvedPath])

  /**
   * Stage every conflicted path as resolved, from the conflict group's check.
   *
   * Each path is its own request because that is what the route is — one file,
   * its own bytes — and they are sent one after another rather than at once, so a
   * refusal can name the path it happened on. The run stops at the first refusal:
   * the rest would fail for the same reason, and the answer that failed has
   * already said what it was. The last status is what the list repaints from, and
   * a run that got through none of its paths re-reads the repository instead.
   */
  const markAllResolved = useCallback((): void => {
    if (busy || status?.ok !== true) return
    const paths = (status.files ?? []).filter(file => file.conflicted).map(file => file.path)
    if (paths.length === 0) return
    setMarkingAll(true)
    void (async (): Promise<void> => {
      let latest: StatusPayload | undefined
      let refused = false
      for (const path of paths) {
        const result = await markResolved(sessionId, path)
        if (result?.ok !== true) {
          reportError(failureOf(t, 'title.resolveDone', result))
          refused = true
          break
        }
        if (result.status !== undefined) latest = result.status
      }
      setMarkingAll(false)
      if (latest !== undefined) {
        setStatus(latest)
        writeRepositorySnapshot(sessionId, latest, log)
      }
      if (refused) void refresh()
    })()
  }, [busy, status, sessionId, reportError, t, refresh, log])

  /**
   * Record the merge the commit form is finishing.
   *
   * A merge in progress is a state, not a mode: the changed-path list already
   * shows the conflicted paths beside every other change, so the only thing left
   * to offer is the commit that ends it. The form's field holds the message — the
   * reader's own, or nothing to keep the one Git wrote into `MERGE_MSG` when the
   * merge started — which is why this takes the words rather than reading them.
   *
   * The history moved, so a success takes the switch's path: every diff on screen
   * was written against the index the merge has just replaced.
   *
   * @param message - the field's text, or nothing to keep Git's message.
   * @returns whether the merge commit was made, which is what clears the field.
   */
  const handleFinishMerge = useCallback((message: string): Promise<boolean> => {
    if (busy) return Promise.resolve(false)
    setEnding(true)
    return completeMerge(sessionId, message.trim() === '' ? undefined : message).then(result => {
      setEnding(false)
      if (result?.ok !== true) {
        reportError(failureOf(t, 'title.completeMerge', result))
        handleSynced()
        return false
      }
      handleSwitched()
      return true
    })
  }, [busy, sessionId, reportError, t, handleSynced, handleSwitched])

  // Keep the selected row meaningful while both lists are drawn. A stage or
  // unstage moves the path from one half to the other rather than out of the
  // pane, so the selection follows it to the half that still holds it; a path
  // that left every list — discarded, committed, or now conflicted — closes the
  // diff, which is not a failure: the pane simply goes back to its empty state.
  useEffect(() => {
    if (status?.ok !== true) return
    setSelection(current => {
      if (current?.kind !== 'file') return current
      const file = files.find(candidate => candidate.path === current.file.path)
      if (file === undefined) return null
      // A refresh that leaves the half the same must not restate the selection,
      // or every re-read would reload the patch under a reader who did not ask
      // for it.
      if (current.side !== 'conflict' && inList(file, current.side)) return current
      const side = SIDES.find(candidate => inList(file, candidate))
      return side === undefined ? null : { kind: 'file', file, side }
    })
  }, [files, status])

  // Re-resolve a selected path against the newest `status`, so a refresh picks
  // up its stage flags while the selection itself survives the round trip.
  const activeFile = useMemo<ChangedFile | null>(() => {
    if (selection?.kind !== 'file') return null
    return files.find(file => file.path === selection.file.path) ?? selection.file
  }, [selection, files])

  // Load the patch — or the conflict — for whatever the diff pane is showing.
  // Answers are matched against the selection they were asked for, so a click
  // during a slow request cannot paint the previous row's answer under the new
  // row's title.
  useEffect(() => {
    if (selection === null) {
      setDoc(null)
      return
    }
    const key = selectionKey(selection)
    const rememberedDoc = readPageMemory(sessionId).doc
    let cancelled = false
    // A patch this session already had for this row stays on screen while it is
    // re-read: the reader left the tab looking at it, and replacing it with a
    // spinner would be this page forgetting something it still knows. Any other
    // row starts loading, exactly as a click on it always has.
    setDoc(rememberedDoc !== null && rememberedDoc.key === key ? rememberedDoc : { key, loading: true })

    // A conflicted path is read by its own route, which answers the file's
    // marker blocks rather than a patch: `git diff` on an unmerged path is a
    // combined diff, and a delete/modify conflict has no diff at all.
    if (selection.kind === 'file' && selection.side === 'conflict') {
      void fetchConflict(sessionId, selection.file.path).then(result => {
        if (cancelled) return
        setDoc(buildConflictDoc(t, key, result))
        if (result?.ok !== true && !isNoRepo(result)) {
          reportError(failureOf(t, 'title.diff', result))
        }
      })
      return () => {
        cancelled = true
      }
    }

    const request = selection.kind === 'commit'
      ? fetchCommit(sessionId, selection.commit.hash)
      : activeFile === null
        // The one refusal no route answers — the row was re-read out of the list
        // between the click and this request — so the page words it itself, as
        // the text a route would otherwise have carried.
        ? Promise.resolve({ ok: false, error: t('fallback.fileGone') })
        : fetchDiff(sessionId, activeFile, selection.side, activeFile.untracked)

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

  // Keep this session's reading position for the next mount. Written after the
  // patch effect, so what is remembered is the patch that effect last left —
  // including the cached one it restored rather than a spinner.
  useEffect(() => {
    writePageMemory(sessionId, { selection, doc })
  }, [sessionId, selection, doc])

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
          fetching={fetching}
          syncing={syncing}
          switching={switching}
          merging={merging !== null}
          creating={creating}
          deleting={deleting}
          busy={busy}
          onRefresh={() => void refresh()}
          onFetch={handleFetch}
          onPull={() => void pullRemote()}
          onPush={() => pushRemote('title.push')}
          onCheckout={handleCheckout}
          onMerge={handleMerge}
          onCreate={handleCreate}
          onDelete={handleDelete}
          onError={reportError}
          commitScope={commitScope}
          onCommitScope={handleScopeChange}
          undoing={undoing}
          onUndoCommit={handleUndoCommit}
        />
        {/* The commit form is the sidebar's own third row, under the toolbar and
            above both panes: what it commits is the changed-path pane's list, but
            its scope belongs to the form as a whole, so it belongs to the column
            rather than to either pane. The form is `flex:none` so it keeps its
            rows whatever height the panes are dragged to, and it draws no rule
            under itself: the toolbar, the form, and the changed-path rows beneath
            it read as one block, with nothing cutting the column between them.

            A merge in progress is told by the form rather than by a banner of its
            own: the conflicted paths are already the first group of the list
            below, and the commit that ends the merge is the form's own button —
            the same two facts VSCode's source-control view shows, in the same
            place. */}
        <CommitBar
          t={t}
          disabled={status?.ok !== true || busy || refreshing}
          committing={committing}
          scope={commitScope}
          stagedCount={stagedCount}
          allCount={files.length}
          operation={status?.ok === true ? status.operation ?? null : null}
          mergeMessage={status?.ok === true ? status.mergeMessage : undefined}
          ending={ending}
          onCommit={handleCommit}
          onFinishMerge={handleFinishMerge}
          onGenerate={handleGenerateMessage}
        />
        {/* The upper pane owns the divider under it: the boundary is what its own
            height is measured to, and the handle is placed on that pane's bottom
            edge rather than between the panes, so the split takes no layout of its
            own and the panes stay the only flow children of the column. */}
        <section ref={filesPane} className="dsh-cg-pane dsh-cg-files">
          {/* The pane draws both halves at once, each under its own disclosure
              (see `ChangeList`): the index's rows above the worktree's, so a
              reader can stage from the same screen they commit from. There is no
              pane-level title and no switch; the two group headers are the
              pane's structure, and each carries its own count and bulk actions. */}
          <div className="dsh-cg-list">
            <ChangeList
              t={t}
              status={status}
              loaded={loaded}
              files={files}
              selection={selection}
              staging={staging}
              discarding={discarding}
              marking={markingPath}
              markingAll={markingAll}
              onSelect={(file, side) => setSelection({ kind: 'file', file, side })}
              onToggleStage={handleStageToggle}
              onDiscard={handleDiscard}
              onMarkResolved={handleMarkResolvedRow}
              onMarkAllResolved={markAllResolved}
              onToggleFolderStage={handleStageFolder}
              onDiscardFolder={handleDiscardFolder}
              onStageAll={handleStageAll}
              onDiscardAll={handleDiscardAll}
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
        <DiffPane
          t={t}
          status={status}
          selection={selection}
          current={current}
          resolving={resolving}
          busy={busy}
          onResolve={handleResolve}
        />
      </main>

      <DiscardDialog
        t={t}
        target={discardTarget}
        onCancel={() => setDiscardTarget(null)}
        onConfirm={confirmDiscard}
      />
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
 * The confirmation that stands between a row's discard button and the worktree.
 *
 * A discard cannot be undone: a tracked path goes back to its index entry, and
 * an untracked one is deleted. A file row names the path it would throw away; a
 * folder row names the directory and how many files it stood for. This card is
 * where that becomes a decision, and it words an untracked target as the
 * deletion it is, down to the confirm button's label.
 *
 * @param props.t - the page's translate seat.
 * @param props.target - the row or folder asking to discard, or null while none is open.
 * @param props.onCancel - called by Escape, the mask, or the cancel button.
 * @param props.onConfirm - called when the reader confirms the discard.
 * @returns the dialog element.
 */
function DiscardDialog(props: {
  readonly t: Translate
  readonly target: DiscardRequest | null
  readonly onCancel: () => void
  readonly onConfirm: () => void
}): ReactElement {
  const { t, target, onCancel, onConfirm } = props
  const text = target === null
    ? ''
    : target.kind === 'file'
      ? t(target.file.untracked ? 'discard.untracked' : 'discard.tracked', { path: target.file.path })
      : target.kind === 'folder'
        ? t(
          target.untracked ? 'discard.folderUntracked' : 'discard.folder',
          { path: target.path, count: target.count },
        )
        : t(
          target.untracked ? 'discard.allUntracked' : 'discard.all',
          { count: target.count },
        )
  const deleting = target?.kind === 'file' && target.file.untracked
  return (
    <Modal
      open={target !== null}
      onClose={onCancel}
      title={t('discard.title')}
      description={t('discard.description')}
      closeLabel={t('dialog.close')}
      className="dsh-cg-discard-dialog"
      footer={(
        <>
          <Button variant="outline" onClick={onCancel}>{t('discard.cancel')}</Button>
          <Button variant="primary" className="dsh-cg-discard-confirm" onClick={onConfirm}>
            {t(deleting ? 'discard.delete' : 'discard.confirm')}
          </Button>
        </>
      )}
    >
      <p className="dsh-cg-dialog-text">{text}</p>
    </Modal>
  )
}

/**
 * Stable key for one model route inside the Settings picker.
 *
 * The two identifiers are joined by NUL because neither a provider id nor a
 * model id can carry one, so the key splits back into exactly the two values the
 * Host stored. The effort is deliberately not part of it: a row names a model,
 * and the level is chosen inside that row — two rows for the same model would
 * make the search and the folded groups say the model exists twice.
 *
 * @param selection - the route to key.
 * @returns the picker value.
 */
function modelKey(selection: MessageModel): string {
  return `${selection.provider}\u0000${selection.model}`
}

/**
 * What a row's effort control says when the route pins no level.
 *
 * Deliberately not translated: the ids the control lists beside it come from the
 * adapter (`high`, `medium`, …), so the name for "no pinned level" belongs to
 * that same vocabulary rather than to either dictionary.
 */
const DEFAULT_EFFORT = 'Default'

/**
 * The effort menu's row id for `Default`.
 *
 * The adapter's own ids are short words (`high`, `medium`, …), so the id for "no
 * pinned level" is prefixed to stay clear of them: the menu hands its ids back
 * as-is, and this one must not be mistaken for a level.
 */
const EFFORT_DEFAULT_ID = 'dsh-cg-effort-default'

/**
 * How tall the Settings picker's panel is.
 *
 * A fixed height is what keeps the panel from jumping while a search narrows the
 * catalog to three rows: the list scrolls inside a surface whose edges stay put,
 * which is also how the design draws it — the rows fill the top of the panel and
 * leave the rest empty. Only the variable parts below follow the viewport; the
 * height itself does not.
 */
const PICKER_HEIGHT = 370

/**
 * The shortest the picker's overlay scrollbar thumb may get.
 *
 * The bar is a fixed 5px wide and its length follows how much of the list is in
 * view; a very long catalog would shrink it below a grabbable size, so it stops
 * at this length instead.
 */
const PICKER_THUMB_MIN = 28

/**
 * The gap and margin the picker is placed with, in CSS pixels.
 *
 * The platform's position hook and this dialog's own side decision both read
 * them: a disagreement would put the panel on the side the hook was not told
 * about, so the two numbers are stated once.
 */
const PICKER_GAP = 6
const PICKER_MARGIN = 12

/** The width the panel opens at, and the narrowest a narrow field may shrink it to. */
const PICKER_WIDTH_INITIAL = 320
const PICKER_WIDTH_MIN = 280

/** The layer the panel sits on, and how far above the field's own layer it starts. */
const PICKER_Z_BASE = 1000
const PICKER_Z_STEP = 10

/**
 * The parts of the Settings picker's placement this plugin owns.
 *
 * The position itself is the platform's (`useAnchoredPosition`); this is the
 * rest of the panel's geometry: how wide the trigger made it, which side of the
 * field it opens on, and the layer that keeps it above the modal's mask and card.
 */
interface PickerLayout {
  readonly width: number
  /** Above every layer the modal put over the page (mask and card). */
  readonly zIndex: number
  /** Below the field when there is room, above it when there is not. */
  readonly side: 'bottom' | 'top'
}

/**
 * The reasoning effort a route pins.
 *
 * @param route - the route to read.
 * @returns the effort id, or null when the route leaves the level to its adapter.
 */
function routeEffort(route: MessageModel): string | null {
  const effort = route.reasoningEffort
  return typeof effort === 'string' && effort !== '' ? effort : null
}

/**
 * The name a route reads as, in the picker and in the default row's caption.
 *
 * A route the current catalog does not list keeps its identifiers rather than
 * disappearing: a saved model can be temporarily unavailable — its provider is
 * signed out, its endpoint is down, its adapter has not loaded yet — and the
 * dialog must still show what the Workspace chose instead of silently pretending
 * the choice was never made.
 *
 * @param selection - the route to name.
 * @param groups - the catalog the dialog read.
 * @returns `provider / model`, using the catalog's display names when it has them.
 */
function modelLabel(selection: MessageModel, groups: readonly MessageModelGroup[]): string {
  const group = groups.find(entry => entry.provider === selection.provider)
  const model = group?.models.find(entry => entry.id === selection.model)
  return `${group?.name ?? selection.provider} / ${model?.name ?? selection.model}`
}

/**
 * The Settings dialog: the model and prompt that write this Workspace's commit
 * messages.
 *
 * The two settings are asked together because they describe one call: Generate
 * sends the changes to this model, told to answer in this prompt's terms, and a
 * Workspace that wants a different voice usually wants it from a different model
 * too. Save writes both; the page reads both on every Generate, so nothing has
 * to be refreshed or reloaded for the next generated message to use them.
 *
 * The model list is the deployment's catalog, read when the dialog opens rather
 * than at mount: models appear, disappear, and become available as providers are
 * configured, and a list cached before a sign-in would offer routes the Host
 * cannot call. It is drawn as the plugin's own picker rather than a native
 * `select`, because a route is three answers and a `select` can only hold one: a
 * row per model, a search field over the whole list, provider groups that fold
 * away, and a per-row effort control do not exist in the platform's select.
 *
 * The platform has no `Popover` component to hand, but it does expose the parts
 * its own menus are built from, and the panel uses them: `useAnchoredPosition`
 * keeps it against the field while the page scrolls or resizes, the platform's
 * outside-pointer rule closes it on a click elsewhere (restated below, because
 * the effort menu's portaled rows are the panel's own business), and
 * `useModalLayer` puts it on the same layer stack as the dialog — so Escape
 * closes the list before the dialog, Tab stays inside the open list, and focus
 * returns to the field when the list closes. The panel is portaled to
 * `document.body` because the dialog's body is a scrollport that would clip it.
 *
 * The panel is a sheet of its own height rather than a box that hugs its rows:
 * the search sits above a scrolling list, and narrowing the catalog to two
 * matches leaves the surface the same size as before instead of flickering
 * shorter under the pointer. The provider rows fold their models away and carry
 * that mark at the far right of the row, opposite the name; the row itself stays
 * at the top of the list while its own models scroll under it, so a model is
 * never read without the provider it belongs to.
 *
 * A row names a model, and its right-hand control names the reasoning effort the
 * route pins — `Default` when it pins none, so the adapter's own level applies.
 * That control opens the platform's `Menu` on the adapter's levels, read when the
 * control is first opened, one model at a time: it is adapter-owned metadata, and
 * resolving every model as the dialog opens would charge the reader for lists
 * they never look at. The ids are shown as the adapter spells them (`high`,
 * `medium`, …) because that is exactly what a saved route stores.
 *
 * The field speaks the effective route: the saved one, or — while this Workspace
 * has saved none — DSH's current default model, the one the user last chose in a
 * session. The list holds only routes that can be saved, so it has no row for
 * "the default" itself: choosing a model is what pins one, and until a reader does
 * that the Workspace goes on following DSH. A field that shows the default route
 * but no row claiming to be it is the honest shape of that state.
 *
 * The prompt field opens on the effective prompt: the Workspace's own text when
 * it has one, and the built-in text otherwise, so the default is readable before
 * it is changed. Whatever the field holds when Save is pressed is what the Host
 * stores and what every later Generate is told — the built-in text included,
 * which is the point of opening on it: the box is the answer, and a reader who
 * left it as it stood asked for those words. Only an empty box drops the override
 * and puts the Workspace back on the built-in prompt, so clearing it — not
 * retyping it — is how a later revision of the default reaches this Workspace.
 * "Restore default" fills the box back in with today's text.
 *
 * The dialog is the platform's Modal, which owns the portal, the mask, Escape,
 * focus return, and the two buttons' placement; the body is this plugin's own
 * because the picker and the multi-line prompt field have no primitive here.
 * Failures are the page's error dialog, not this card's body: the card is a
 * form, and a request that never arrived is not one of its fields.
 *
 * @param props.t - the page's translate seat.
 * @param props.open - whether the dialog is showing.
 * @param props.sessionId - the session whose Workspace these choices belong to.
 * @param props.onClose - called by Cancel, the close button, Escape, or the mask.
 * @param props.onError - called with the failure to state in the error dialog.
 * @returns the dialog element.
 */
function SettingsDialog(props: {
  readonly t: Translate
  readonly open: boolean
  readonly sessionId: string | undefined
  readonly onClose: () => void
  readonly onError: (error: GitError) => void
}): ReactElement {
  const { t, open, sessionId, onClose, onError } = props
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [groups, setGroups] = useState<readonly MessageModelGroup[]>([])
  const [defaultModel, setDefaultModel] = useState<MessageModel | null>(null)
  const [defaultPrompt, setDefaultPrompt] = useState('')
  const [prompt, setPrompt] = useState('')
  const [selection, setSelection] = useState<MessageModel | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [query, setQuery] = useState('')
  /** Where the picker's overlay scrollbar sits, or null when the list fits. */
  const [thumb, setThumb] = useState<{ readonly top: number; readonly height: number } | null>(null)
  const [collapsed, setCollapsed] = useState<readonly string[]>([])
  const [effortOpen, setEffortOpen] = useState<string | null>(null)
  const [effortLists, setEffortLists] = useState<Readonly<Record<string, readonly string[]>>>({})
  const [effortFailures, setEffortFailures] = useState<readonly string[]>([])
  const [effortLoading, setEffortLoading] = useState<readonly string[]>([])
  const [pickerLayout, setPickerLayout] = useState<PickerLayout>({
    width: PICKER_WIDTH_INITIAL,
    zIndex: PICKER_Z_BASE + PICKER_Z_STEP,
    side: 'bottom',
  })
  const id = useId()
  const modelId = `${id}-model`
  const pickerId = `${id}-model-picker`
  const promptId = `${id}-prompt`
  const modelField = useRef<HTMLButtonElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)
  /** Model keys whose effort list has been asked for, so one row asks once. */
  const effortsAsked = useRef<Set<string>>(new Set())

  // A fresh read on every open. The cleanup discards a late answer and a save in
  // flight, so reopening the dialog after closing it mid-request starts from the
  // Host's state rather than from a response the previous opening asked for. The
  // picker's transient state — what is open, what was searched for, which effort
  // lists were already read — starts over with it, because the catalog the next
  // opening reads need not have the same rows.
  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    setSaving(false)
    setPickerOpen(false)
    setQuery('')
    setEffortOpen(null)
    setEffortLists({})
    setEffortFailures([])
    setEffortLoading([])
    effortsAsked.current.clear()
    void fetchSettings(sessionId).then(result => {
      if (cancelled) return
      setLoading(false)
      if (result?.ok !== true) {
        onClose()
        onError({
          title: t('title.settingsRead'),
          lines: [failureLine(t, 'label.settingsRead', result ?? {}, 'fallback.settingsRead')],
        })
        return
      }
      const nextGroups = Array.isArray(result.groups) ? result.groups : []
      const builtIn = typeof result.defaultPrompt === 'string' ? result.defaultPrompt : ''
      setGroups(nextGroups)
      setDefaultModel(result.defaultModel ?? null)
      setDefaultPrompt(builtIn)
      setPrompt(typeof result.prompt === 'string' ? result.prompt : builtIn)
      setSelection(result.model ?? null)
    })
    return () => {
      cancelled = true
    }
  }, [open, sessionId, onClose, onError, t])

  // The model field is the dialog's first answer and the one the reader is most
  // likely to change, so the keyboard lands there once the read has filled it.
  // The Modal's own autofocus runs before that answer arrives, which is why this
  // effect exists rather than a marker on the field.
  useEffect(() => {
    if (!open || loading) return
    modelField.current?.focus()
  }, [open, loading])

  /**
   * Close the list and forget what was typed into it.
   *
   * Stable because the platform's dismiss and layer hooks both take it in their
   * own effect dependencies: a fresh function per keystroke would re-register
   * the popover's layer on every render.
   */
  const closePicker = useCallback((): void => {
    setPickerOpen(false)
    setQuery('')
    setEffortOpen(null)
  }, [])

  /**
   * Place the list's scrollbar thumb over the rows.
   *
   * The list hides its native bar because the platform's scrollbars are 5px of
   * real width: those 5px came out of the rows' right edge, so a provider band and
   * the rows under it stopped short of the panel's edge with the thumb owning a
   * gutter of its own. The thumb drawn here is the same bar, overlaid on the rows'
   * own padding instead, so the layout is the same width whether the catalog
   * overflows or not. It is measured from the scrollport itself, which is why it
   * is re-read on every render that can change the rows (search, folding, a
   * loaded catalog) as well as on every scroll.
   */
  const measureThumb = useCallback((): void => {
    const list = listRef.current
    if (list === null) return
    const { scrollTop, scrollHeight, clientHeight } = list
    if (scrollHeight <= clientHeight + 1) {
      setThumb(current => (current === null ? current : null))
      return
    }
    const height = Math.max(PICKER_THUMB_MIN, Math.round((clientHeight / scrollHeight) * clientHeight))
    const top = Math.round((scrollTop / (scrollHeight - clientHeight)) * (clientHeight - height))
    setThumb(current => (current !== null && current.top === top && current.height === height
      ? current
      : { top, height }))
  }, [])

  // The rows move without the list firing a scroll event — a fold, a search, a
  // catalog that just arrived — so the thumb is re-placed after those renders too.
  // It sets state only when the answer changed, which ends the loop.
  useLayoutEffect(() => {
    if (pickerOpen) measureThumb()
  })

  // What the platform's position hook cannot know: how wide the field made the
  // panel, how much room its list may take, which side of the field has room,
  // and how high the page stacks its layers. The panel is portaled to
  // `document.body` because the dialog body is a scrollport — an element inside
  // it would be clipped by that scrollport — so its layer is read off the
  // trigger's own ancestors rather than guessed at.
  useLayoutEffect(() => {
    if (!open || !pickerOpen) return
    const measure = (): void => {
      const trigger = modelField.current
      if (trigger === null) return
      const rect = trigger.getBoundingClientRect()
      const width = Math.max(PICKER_WIDTH_MIN, Math.min(rect.width, window.innerWidth - PICKER_MARGIN * 2))
      const below = window.innerHeight - rect.bottom - PICKER_GAP - PICKER_MARGIN
      const above = rect.top - PICKER_GAP - PICKER_MARGIN
      // The panel's height is fixed, so the only question the viewport answers
      // is which side of the field can hold it. Below is the reader's first
      // guess, so it is preferred unless it cannot fit the panel at all.
      const openUp = below < PICKER_HEIGHT && above > below
      let layer = 0
      for (let node = trigger.parentElement; node !== null && node !== document.body; node = node.parentElement) {
        const value = Number(window.getComputedStyle(node).zIndex)
        if (Number.isFinite(value)) layer = Math.max(layer, value)
      }
      const next: PickerLayout = {
        width,
        zIndex: Math.max(layer + PICKER_Z_STEP, PICKER_Z_BASE),
        side: openUp ? 'top' : 'bottom',
      }
      setPickerLayout(current => (
        current.width === next.width
        && current.zIndex === next.zIndex
        && current.side === next.side
          ? current
          : next
      ))
    }
    measure()
    // A scroll of the panel's own list must not change the field's side or room.
    const followScroll = (event: Event): void => {
      if (event.target instanceof Node && panelRef.current?.contains(event.target) === true) return
      measure()
    }
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', followScroll, true)
    return () => {
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', followScroll, true)
    }
  }, [open, pickerOpen])

  // The platform's own popover plumbing. Its position hook follows scrolling,
  // resizing, and the panel's own size changes; its layer hook answers
  // Escape, keeps Tab inside the open panel, and returns focus when it closes —
  // the same layer stack the dialog under it registered in, which is why Escape
  // closes the list first instead of the dialog. Its outside-pointer rule is
  // kept below, with one addition for the menu the list opens.
  const placement = useAnchoredPosition({
    open: pickerOpen,
    anchorRef: modelField,
    panelRef,
    side: pickerLayout.side,
    gap: PICKER_GAP,
    margin: PICKER_MARGIN,
  })
  useModalLayer(panelRef, pickerOpen, closePicker)

  /**
   * Close the panel on a click anywhere but the field, the panel, or a menu row.
   *
   * The rule is the platform's `useDismissOnOutsidePointer`, restated because the
   * effort control's menu is portaled to `document.body` — a list inside the
   * panel's scrollport would be clipped — and that portaled list is outside both
   * the field and the panel by the platform's test. A level's click would then
   * close the panel before the row could record the level. Menu rows are the
   * panel's own business, so they count as inside.
   */
  useEffect(() => {
    if (!pickerOpen) return
    const dismiss = (event: PointerEvent): void => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (modelField.current?.contains(target) === true) return
      if (panelRef.current?.contains(target) === true) return
      if (target instanceof Element && target.closest('[role="menu"]') !== null) return
      closePicker()
    }
    document.addEventListener('pointerdown', dismiss)
    return () => document.removeEventListener('pointerdown', dismiss)
  }, [closePicker, pickerOpen])

  /** The effort one route pins, spelled as the row's control spells it. */
  const effortOf = (route: MessageModel | null): string => {
    const effort = route === null ? null : routeEffort(route)
    return effort ?? DEFAULT_EFFORT
  }

  const knownRoutes = new Set(groups.flatMap(group =>
    group.models.map(model => modelKey({ provider: group.provider, model: model.id }))))
  // A saved route the current catalog does not know is kept as a row of its own:
  // it is still what this Workspace stores, and hiding it would make Save
  // silently replace it. The Host reports the failure if the route cannot be
  // called when the next message is generated.
  const staleRoute = selection !== null && !knownRoutes.has(modelKey(selection))
    ? selection
    : null
  // The field speaks the effective route — the saved one, or DSH's default while
  // nothing is saved — in the same `provider / model / effort` terms a row uses.
  const effective = selection ?? defaultModel
  const triggerLabel = effective === null
    ? t('settings.modelDefaultUnknown')
    : `${modelLabel(effective, groups)} / ${effortOf(effective)}`

  const needle = query.trim().toLowerCase()
  const matches = (text: string): boolean => text.toLowerCase().includes(needle)
  // A provider whose own name matches keeps every model: the reader naming the
  // provider is looking for the group, not for one row inside it.
  const visibleGroups = needle === ''
    ? groups
    : groups
      .map(group => {
        const providerHit = matches(group.name) || matches(group.provider)
        const models = providerHit
          ? group.models
          : group.models.filter(model => matches(model.name) || matches(model.id))
        return { ...group, models }
      })
      .filter(group => group.models.length > 0)
  const staleVisible = staleRoute !== null && (needle === '' || matches(modelLabel(staleRoute, groups)))

  /**
   * Take one route and close the list.
   *
   * Choosing a route is what pins it for this Workspace. The list has no row for
   * "the default", so a Workspace that has saved nothing keeps following DSH
   * until a model is actually chosen. Focus is the platform's: the layer this
   * panel registered returns it to the field the list hung from when that layer
   * closes.
   */
  const choose = useCallback((next: MessageModel): void => {
    setSelection(next)
    closePicker()
  }, [closePicker])

  /** Fold one provider's models away, or bring them back. */
  const toggleGroup = (provider: string): void => {
    setCollapsed(current => current.includes(provider)
      ? current.filter(entry => entry !== provider)
      : [...current, provider])
  }

  /**
   * Read one row's effort list, once per model per opening.
   *
   * The list is adapter metadata and has to be resolved per model, so it is read
   * when the row's control is opened rather than with the catalog. A failed read
   * is kept beside its row and shown there: it is not the dialog's failure, and
   * the row must not pretend the model offers no level.
   */
  const loadEfforts = (route: MessageModel): void => {
    const key = modelKey(route)
    if (effortsAsked.current.has(key)) return
    effortsAsked.current.add(key)
    setEffortLoading(current => [...current, key])
    void fetchModelEfforts(route.provider, route.model).then(result => {
      setEffortLoading(current => current.filter(entry => entry !== key))
      if (result?.ok === true) {
        const efforts = Array.isArray(result.efforts)
          ? result.efforts.filter((effort): effort is string => typeof effort === 'string' && effort !== '')
          : []
        setEffortLists(current => ({ ...current, [key]: efforts }))
        return
      }
      setEffortLists(current => ({ ...current, [key]: [] }))
      setEffortFailures(current => (current.includes(key) ? current : [...current, key]))
    })
  }

  /** Open one row's effort control, or close it when it is already open. */
  const toggleEfforts = (route: MessageModel): void => {
    const key = modelKey(route)
    if (effortOpen === key) {
      setEffortOpen(null)
      return
    }
    setEffortOpen(key)
    loadEfforts(route)
  }

  /**
   * Close the dialog unless a save is in flight.
   *
   * The wrapper is stable because the platform's Modal takes `onClose` in its
   * own effects: an inline function would re-register its layer on every
   * keystroke and could pull focus back to the close button while the reader is
   * editing the prompt.
   */
  const requestClose = useCallback((): void => {
    if (!saving) onClose()
  }, [onClose, saving])

  /**
   * Store both answers and close on success.
   *
   * A failed write leaves the dialog open: the reason is in the page's error
   * dialog, and the form still holds the choice that failed to save, so the
   * reader can retry without reconstructing it.
   */
  const submit = useCallback((): void => {
    if (loading || saving) return
    setSaving(true)
    void saveSettings(sessionId, selection, prompt).then(result => {
      setSaving(false)
      if (result?.ok !== true) {
        onError({
          title: t('title.settings'),
          lines: [failureLine(t, 'label.settings', result ?? {}, 'fallback.settings')],
        })
        return
      }
      onClose()
    })
  }, [loading, onClose, onError, prompt, saving, selection, sessionId, t])

  /**
   * Draw one model row and the effort control that row owns.
   *
   * The two are separate controls rather than one: naming a model is not naming a
   * level, and a reader who wants `high` should not have to reopen the list after
   * choosing the model. The row shows the level its route currently pins, and the
   * control opens the adapter's own levels in the platform's `Menu` — a short list
   * of named levels is what a menu is, and its portal keeps the list from being
   * clipped by the panel's scrollport. It hangs off the control rather than
   * unfolding in the panel's flow, and the level in force is marked in the list.
   */
  const renderRouteRow = (route: MessageModel, label: string, chosen: boolean): ReactElement => {
    const key = modelKey(route)
    const pinned = chosen && selection !== null ? routeEffort(selection) : null
    const open = effortOpen === key
    const efforts = effortLists[key] ?? []
    // A saved level the adapter no longer lists is still what this route stores,
    // so it is kept beside the current ones instead of quietly disappearing.
    const orphan = pinned !== null && !efforts.includes(pinned) ? [pinned] : []

    // `Default` first, then the adapter's levels: the order the Host resolves a
    // route in, and the order the row's own control states its answer.
    const items: MenuEntry[] = [{ id: EFFORT_DEFAULT_ID, label: DEFAULT_EFFORT }]
    if (effortLoading.includes(key)) {
      items.push({ type: 'label', id: `${key}-loading`, text: t('settings.loading') })
    } else if (effortFailures.includes(key)) {
      // The read is per model, so its failure is that row's alone: the list says
      // so where the levels would be, rather than passing the model off as one
      // that offers nothing to choose.
      items.push({ type: 'label', id: `${key}-failure`, text: t('settings.effortReadFailed') })
    }
    for (const effort of [...efforts, ...orphan]) {
      items.push({ id: effort, label: effort })
    }

    const closeEfforts = (): void => {
      setEffortOpen(current => (current === key ? null : current))
    }

    return (
      <div key={key} className="dsh-cg-settings-row" data-selected={chosen}>
        <button
          type="button"
          className="dsh-cg-settings-row-name"
          aria-pressed={chosen}
          onClick={() => choose(route)}
        >
          <span className="dsh-cg-settings-row-text">{label}</span>
          {chosen
            ? <span className="dsh-cg-settings-row-check" aria-hidden="true"><IconCheck /></span>
            : null}
        </button>
        <Menu
          open={open}
          className="dsh-cg-settings-effort-control"
          anchor={(
            <button
              type="button"
              className="dsh-cg-settings-row-effort"
              aria-haspopup="menu"
              aria-expanded={open}
              aria-label={`${t('settings.effort')}: ${pinned ?? DEFAULT_EFFORT}`}
              onClick={() => toggleEfforts(route)}
            >
              <span>{pinned ?? DEFAULT_EFFORT}</span>
              <span className="dsh-cg-settings-row-arrow" aria-hidden="true">
                <IconArrowRight />
              </span>
            </button>
          )}
          items={items}
          selectedId={pinned ?? EFFORT_DEFAULT_ID}
          onSelect={(id) => {
            closeEfforts()
            choose(id === EFFORT_DEFAULT_ID
              ? { provider: route.provider, model: route.model }
              : { provider: route.provider, model: route.model, reasoningEffort: id })
          }}
          onClose={closeEfforts}
          // The control is the row's right end, so the list opens back across the
          // model names instead of off the panel's own edge.
          align="end"
          side="bottom"
          portal
        />
      </div>
    )
  }

  return (
    <Modal
      open={open}
      onClose={requestClose}
      title={t('settings.title')}
      description={t('settings.description')}
      closeLabel={t('dialog.close')}
      className="dsh-cg-settings-dialog"
      footer={(
        <>
          <Button variant="outline" disabled={saving} onClick={requestClose}>{t('settings.cancel')}</Button>
          <Button variant="primary" disabled={loading || saving} onClick={submit}>
            {saving ? t('settings.saving') : t('settings.save')}
          </Button>
        </>
      )}
    >
      {loading
        ? <p className="dsh-cg-dialog-hint">{t('settings.loading')}</p>
        : (
          <div className="dsh-cg-settings-body">
            <div className="dsh-cg-settings-field">
              <label className="dsh-cg-settings-label" htmlFor={modelId}>{t('settings.model')}</label>
              <div className="dsh-cg-settings-picker">
                <button
                  ref={modelField}
                  id={modelId}
                  type="button"
                  className="dsh-cg-settings-picker-trigger"
                  aria-expanded={pickerOpen}
                  aria-controls={pickerId}
                  disabled={saving}
                  onClick={() => {
                    setPickerOpen(current => !current)
                    setQuery('')
                    setEffortOpen(null)
                  }}
                >
                  <span className="dsh-cg-settings-picker-value">{triggerLabel}</span>
                  <span className="dsh-cg-settings-picker-chevron" data-open={pickerOpen} aria-hidden="true">
                    <IconArrowRight />
                  </span>
                </button>
              </div>
              {pickerOpen
                ? createPortal(
                    <div
                      id={pickerId}
                      ref={panelRef}
                      className="dsh-cg-settings-popover"
                      role="group"
                      aria-label={t('settings.model')}
                      style={{
                        left: placement?.left ?? 0,
                        top: placement?.top ?? 0,
                        width: pickerLayout.width,
                        height: PICKER_HEIGHT,
                        zIndex: pickerLayout.zIndex,
                      }}
                    >
                      <div className="dsh-cg-settings-picker-search">
                        <input
                          type="text"
                          className="dsh-cg-settings-picker-input"
                          value={query}
                          placeholder={t('settings.modelSearch')}
                          aria-label={t('settings.modelSearch')}
                          spellCheck={false}
                          onChange={event => setQuery(event.target.value)}
                        />
                      </div>
                      <div className="dsh-cg-settings-picker-listwrap">
                        <div className="dsh-cg-settings-picker-list" ref={listRef} onScroll={measureThumb}>
                          {staleVisible && staleRoute !== null
                            ? renderRouteRow(
                              staleRoute,
                              t('settings.modelUnavailable', { model: modelLabel(staleRoute, groups) }),
                              true,
                            )
                            : null}
                        {staleVisible
                          ? <div className="dsh-cg-settings-picker-rule" role="presentation" />
                          : null}
                        {visibleGroups.map(group => {
                          // A search expands every group it matched: a folded
                          // provider would hide the very rows the query found.
                          const expanded = needle !== '' || !collapsed.includes(group.provider)
                          return (
                            <div key={group.provider} className="dsh-cg-settings-picker-group">
                              {/* The provider's name stays at the top of the list
                                  while its models scroll under it, so a row is
                                  never left without the group it belongs to. The
                                  button carries its own fill for that reason: the
                                  rows passing under it must not show through. */}
                              <div className="dsh-cg-settings-picker-group-sticky">
                                <button
                                  type="button"
                                  className="dsh-cg-settings-picker-group-head"
                                  aria-expanded={expanded}
                                  onClick={() => toggleGroup(group.provider)}
                                >
                                  <span className="dsh-cg-settings-picker-group-name">{group.name}</span>
                                  <span className="dsh-cg-settings-picker-group-arrow" data-open={expanded} aria-hidden="true">
                                    <IconArrowRight />
                                  </span>
                                </button>
                              </div>
                              {expanded
                                ? group.models.map(option => renderRouteRow(
                                  { provider: group.provider, model: option.id },
                                  option.name,
                                  selection !== null
                                    && modelKey(selection) === modelKey({ provider: group.provider, model: option.id }),
                                ))
                                : null}
                            </div>
                          )
                        })}
                        {!staleVisible && visibleGroups.length === 0
                          ? <p className="dsh-cg-settings-picker-empty">{t('settings.searchEmpty')}</p>
                          : null}
                        </div>
                        {thumb === null
                          ? null
                          : (
                            <span
                              className="dsh-cg-settings-picker-thumb"
                              style={{ top: thumb.top, height: thumb.height }}
                              aria-hidden="true"
                            />
                          )}
                      </div>
                    </div>,
                    document.body,
                  )
                : null}
              {groups.length === 0
                ? <p className="dsh-cg-settings-note">{t('settings.modelEmpty')}</p>
                : null}
            </div>

            <div className="dsh-cg-settings-field">
              <label className="dsh-cg-settings-label" htmlFor={promptId}>{t('settings.prompt')}</label>
              <span className="dsh-cg-settings-prompt-frame">
                <textarea
                  id={promptId}
                  className="dsh-cg-settings-prompt"
                  value={prompt}
                  disabled={saving}
                  // The Host refuses a prompt beyond this bound rather than
                  // storing a file; the field stops the typing at the same place
                  // so a long paste cannot turn Save into a refusal.
                  maxLength={MAX_PROMPT_LENGTH}
                  spellCheck={false}
                  onChange={event => setPrompt(event.target.value)}
                />
              </span>
              <div className="dsh-cg-settings-prompt-foot">
                <span className="dsh-cg-settings-note">{t('settings.promptHint')}</span>
                <button
                  type="button"
                  className="dsh-cg-settings-reset"
                  disabled={saving || defaultPrompt === '' || prompt === defaultPrompt}
                  onClick={() => setPrompt(defaultPrompt)}
                >
                  {t('settings.promptReset')}
                </button>
              </div>
            </div>
          </div>
        )}
    </Modal>
  )
}

/**
 * The sidebar's first row: the Workspace this session is in, the branch it is
 * on, and the More control every other operation hangs from. It draws no rule of
 * its own: the toolbar, the commit form under it, and the changed-path groups
 * under that are one block, with no hairline drawn anywhere between them.
 *
 * More is one control rather than a button per operation because the row has to
 * fit the sidebar's own floor: Refresh used to be the row's single icon, and the
 * fetch and the merge would have been two more. A menu states them by name
 * instead — a dropdown can be as wide as its words, and a 22px square cannot.
 *
 * The menu is read top to bottom as one sentence about the repository: the two
 * rows that only re-read it (Refresh, Fetch) above the first rule, the two halves
 * of the remote round trip taken on their own (Pull, Push) above the second, the
 * branch rows (create, delete) above the third, and the merge under the last.
 * Fetch sits with Refresh rather than with Pull because that is what it is — a
 * read of the remotes, whose whole effect is that the numbers beside Sync and the
 * remote branches in the picker become true — while Pull and Push sit apart from
 * it, and from each other, because each moves the branch: Sync's order is the
 * one that cannot rewind work, but a reader who wants only one half of it can
 * now ask for exactly that.
 *
 * The branch switch and the merge are both stated as decisions rather than
 * accidents: the dialog lists what Git reported and applies nothing until the
 * choice is confirmed with a button of its own, and this row closes it before
 * handing the branch to the page. Which decision it is comes from the menu row
 * that opened it — Refresh, Fetch, Pull and Push run at once because they have
 * nothing to choose, while a merge names another branch and gets a dialog of its
 * own. The operations themselves are the page's (`GitView`), which owns every
 * operation in flight and disables the rest of the page's controls while one
 * runs.
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
 * @param props.fetching - a fetch of the remote-tracking refs is in flight.
 * @param props.syncing - the half of the remote round trip in flight, if any.
 * @param props.switching - the branch a checkout is in flight for, if any.
 * @param props.merging - whether a merge is in flight.
 * @param props.busy - whether any repository operation is in flight.
 * @param props.onRefresh - called to re-read the repository state and history.
 * @param props.onFetch - called to refresh the remote-tracking refs.
 * @param props.onPull - called to pull the branch from its upstream.
 * @param props.onPush - called to send the branch to its upstream.
 * @param props.onCheckout - called with the branch the dialog confirmed.
 * @param props.onMerge - called with the branch the dialog confirmed.
 * @param props.onCreate - called with the name and starting point the dialog confirmed.
 * @param props.onDelete - called with the branches the delete dialog confirmed;
 *   resolves once the answer has arrived.
 * @param props.onError - called with the failure to state in the error dialog.
 * @param props.undoing - whether the last commit is being taken off the branch.
 * @param props.onUndoCommit - called to take the last commit off the branch.
 * @returns the header row.
 */
function SideHead(props: {
  readonly t: Translate
  readonly status: StatusPayload | null
  readonly sessionId: string | undefined
  readonly refreshing: boolean
  readonly fetching: boolean
  readonly syncing: RemoteRun | null
  readonly switching: string | null
  readonly merging: boolean
  readonly creating: boolean
  readonly deleting: boolean
  readonly busy: boolean
  readonly onRefresh: () => void
  readonly onFetch: () => void
  readonly onPull: () => void
  readonly onPush: () => void
  readonly onCheckout: (branch: string) => void
  readonly onMerge: (branch: string) => void
  readonly onCreate: (name: string, start: string) => void
  readonly onDelete: (targets: readonly BranchDeleteTarget[]) => Promise<void>
  readonly onError: (error: GitError) => void
  /** The half the commit button is set to, which the menu's commit rows mark. */
  readonly commitScope: CommitScope
  readonly onCommitScope: (scope: CommitScope) => void
  /** Whether the menu's undo of the last commit is in flight. */
  readonly undoing: boolean
  readonly onUndoCommit: () => void
}): ReactElement {
  const {
    t, status, sessionId, refreshing, fetching, syncing, switching, merging, creating, deleting,
    busy, onRefresh, onFetch, onPull, onPush, onCheckout, onMerge, onCreate, onDelete, onError,
    commitScope, onCommitScope, undoing, onUndoCommit,
  } = props
  /** Whether the More menu is showing. */
  const [menuOpen, setMenuOpen] = useState(false)
  /** Which decision the branch list is open for, or null while it is closed. */
  const [pick, setPick] = useState<BranchPick | null>(null)
  /** Whether the delete dialog is showing. */
  const [deleteOpen, setDeleteOpen] = useState(false)
  /** Whether the Settings dialog is showing. */
  const [settingsOpen, setSettingsOpen] = useState(false)

  const onBranch = status?.ok === true
  const detached = status?.detached === true
  /**
   * Whether a row behind the More control is running right now.
   *
   * Every operation the menu itself can start, and none of the ones it cannot: a
   * commit or a branch switch belongs to another control, and a spinner on this
   * one would be claiming a wait that is not its own. The remote round trip is
   * one of the menu's now — Pull and Push are its own rows — so it turns this
   * spinner even when the same two calls were started from Sync in the history
   * pane's header. Undoing a commit is a menu row too, and the control has to
   * show that wait once the row has closed the list.
   */
  const menuBusy = refreshing || fetching || syncing !== null || merging || creating || deleting
    || undoing

  /** Close the branch list without applying anything. */
  const closeDialog = useCallback((): void => {
    setPick(null)
  }, [])

  /** Close the delete dialog without deleting anything. */
  const closeDelete = useCallback((): void => {
    setDeleteOpen(false)
  }, [])

  /** Close the Settings dialog without saving anything. */
  const closeSettings = useCallback((): void => {
    setSettingsOpen(false)
  }, [])

  /**
   * Delete the branches the dialog confirmed, and close it when the answer is in.
   *
   * The dialog stays up for the wait — its own submit is the control showing it —
   * and is dismissed once the request has been answered, refusals included: the
   * page's error dialog states those, and the list this dialog was showing has
   * already been replaced by the re-read.
   *
   * @param targets - the branches the dialog selected.
   */
  const confirmDelete = useCallback((targets: readonly BranchDeleteTarget[]): void => {
    void onDelete(targets).finally(closeDelete)
  }, [onDelete, closeDelete])

  /**
   * Hand the branch the dialog confirmed to the page, with the decision it was
   * confirmed for.
   *
   * The dialog closes first: every one of these operations rewrites the working
   * tree, and a picker left on screen while one runs would be offering a list
   * that is already stale.
   *
   * @param value - the branch the user picked, or the name a create is for.
   * @param start - the point a create starts at; absent for the other two.
   */
  const choose = useCallback((value: string, start?: string): void => {
    const mode = pick
    setPick(null)
    if (mode === 'create') {
      if (start !== undefined) onCreate(value, start)
    } else if (mode === 'merge-from') onMerge(value)
    else onCheckout(value)
  }, [pick, onCheckout, onMerge, onCreate])

  /**
   * Run one row of the More menu.
   *
   * The list closes on every row before the row runs, whichever it was: closing
   * is the owner's decision in the platform's Menu, and the row behind an open
   * list is one the next click would otherwise land on twice.
   *
   * @param id - the selected row's id.
   */
  const runMenuRow = useCallback((id: string): void => {
    setMenuOpen(false)
    if (id === 'refresh') onRefresh()
    else if (id === 'fetch') onFetch()
    else if (id === 'pull') onPull()
    else if (id === 'push') onPush()
    else if (id === 'commit-scope-staged') onCommitScope('staged')
    else if (id === 'commit-scope-all') onCommitScope('all')
    else if (id === 'commit-undo') onUndoCommit()
    else if (id === 'branch-create') setPick('create')
    else if (id === 'branch-delete') setDeleteOpen(true)
    else if (id === 'merge-from') setPick('merge-from')
    else if (id === 'settings') setSettingsOpen(true)
  }, [onRefresh, onFetch, onPull, onPush, onCommitScope, onUndoCommit])

  // The rows, in the order a reader meets them: the two that only re-read the
  // repository and then run at once, the two halves of the remote round trip,
  // the two that set what the commit button commits and the one that takes the
  // last commit back off the branch, the two that move branches, then the one
  // that merges them. Each rule says which of the five groups the rows under it
  // belong to, so the grouping is argued in the order alone. No row carries a
  // glyph: the words are the whole of what each row does, and icons in a 144px
  // card would only take width from them. No row carries a trailing ellipsis
  // either: the mark means work in flight elsewhere on the page, and the rules
  // already tell the rows that run at once from the ones that ask a second
  // question.
  //
  // The first two commit rows are choices rather than commands: they set what the
  // form's button below commits, and the one in force carries the platform's
  // check. The third takes the commit at HEAD back off the branch, and a soft
  // reset is what makes it safe to sit in the same group: the changes the commit
  // held come back staged, so the row undoes the commit without undoing the work.
  // It follows the choices because it answers a commit that should not have been
  // made rather than setting the scope of the next one.
  //
  // The group sits next to the remote rows rather than at the bottom because
  // committing is the sidebar's own main action, and the menu is where its other
  // answers were already living.
  //
  // The two reads say which side of the repository they touch — `(local)` and
  // `(remotes)` — because that is the one thing their names do not: Refresh
  // re-reads what the working tree already answers, and Fetch is the only row
  // here that leaves the machine. The other rows are bare, since Pull and Push
  // already name a direction and a qualifier on each of them would make the card
  // read as a table rather than a menu.
  //
  // Settings is set apart under the last rule rather than filed with the
  // repository rows above it: every other row acts on the repository, while this
  // one only decides how a message about it is written.
  const menuItems = [
    { id: 'refresh', label: t('head.refresh') },
    { id: 'fetch', label: t('head.fetch') },
    { type: 'separator' as const, id: 'remote' },
    { id: 'pull', label: t('head.pull') },
    { id: 'push', label: t('head.push') },
    { type: 'separator' as const, id: 'commit' },
    { id: 'commit-scope-staged', label: t('commit.scopeStaged') },
    { id: 'commit-scope-all', label: t('commit.scopeAll') },
    // Nothing to undo until the repository has a commit. A disabled row is
    // quieter than a row that opens a dialog only to say so.
    { id: 'commit-undo', label: t('head.undoCommit'), disabled: status?.hasHead !== true },
    { type: 'separator' as const, id: 'branches' },
    { id: 'branch-create', label: t('head.branchCreate') },
    { id: 'branch-delete', label: t('head.branchDelete') },
    { type: 'separator' as const, id: 'merge' },
    { id: 'merge-from', label: t('head.mergeFrom') },
    { type: 'separator' as const, id: 'settings-separator' },
    // Settings is about the message this page generates for a repository, so
    // there is nothing to configure until a repository has answered. A disabled
    // row is quieter than a dialog that opens only to report that the directory
    // is not one.
    { id: 'settings', label: t('head.settings'), disabled: !onBranch },
  ]

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
      <Tooltip label={label} side="bottom" delayMs={TOOLTIP_DELAY_MS} portal maxWidth={TOOLTIP_MAX_WIDTH}>
        <span className="dsh-cg-tip dsh-cg-branch-tip">
          <button
            type="button"
            className="dsh-cg-branch"
            // Disabled while any repository operation is in flight: a second
            // dialog opened then could queue a second checkout or merge behind
            // the first.
            disabled={!onBranch || busy}
            aria-haspopup="dialog"
            aria-expanded={pick === 'switch'}
            // The pill opens the one decision it names: a switch. The list is
            // shared with the merge, so what the pill toggles is the mode, and a
            // picker opened from the menu is left alone.
            onClick={() => setPick(value => (value === 'switch' ? null : 'switch'))}
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
        mode={pick}
        sessionId={sessionId}
        onClose={closeDialog}
        onConfirm={choose}
        onError={onError}
      />
      <BranchDeleteDialog
        t={t}
        open={deleteOpen}
        sessionId={sessionId}
        busy={deleting}
        onClose={closeDelete}
        onConfirm={confirmDelete}
        onError={onError}
      />
      <SettingsDialog
        t={t}
        open={settingsOpen}
        sessionId={sessionId}
        onClose={closeSettings}
        onError={onError}
      />
      <div className="dsh-cg-tools">
        {/* The menu's anchor is the tooltip's span rather than the button: the
            platform's Menu renders whatever it is handed inside a wrapper of its
            own, and the tooltip needs the span for the reason the branch pill
            states — a disabled button emits no pointer events, so anchoring the
            bubble on it would lose the hover exactly when it has the most to
            explain. */}
        <Menu
          open={menuOpen}
          anchor={(
            <Tooltip label={t('head.more')} side="bottom" delayMs={TOOLTIP_DELAY_MS} portal maxWidth={TOOLTIP_MAX_WIDTH}>
              <span className="dsh-cg-tip">
                <button
                  type="button"
                  className="dsh-cg-icon"
                  aria-label={t('head.more')}
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  // Every wait a row behind this control can start: the re-read
                  // and the fetch that belong to the menu itself, the merge, the
                  // create and the delete that are the page's own state. The
                  // spinner turns for all of them, so a click that has begun
                  // always has somewhere to show for it — and a delete, which
                  // can be several pushes, is the one that most needs to.
                  data-busy={menuBusy}
                  disabled={refreshing || busy}
                  onClick={() => setMenuOpen(value => !value)}
                >
                  {menuBusy ? SPINNER_ICON : <IconMore />}
                </button>
              </span>
            </Tooltip>
          )}
          items={menuItems}
          // The commit rows are a choice rather than two commands, so the one in
          // force carries the platform's check: the mark says which scope the
          // form's button will commit, and the button's own label says it again.
          selectedId={commitScope === 'staged' ? 'commit-scope-staged' : 'commit-scope-all'}
          onSelect={runMenuRow}
          onClose={() => setMenuOpen(false)}
          // Below the control and growing to its right, not to its left: the
          // control sits at the sidebar's right edge, so a card aligned to that
          // same edge opens back across the branch pill and the Workspace's
          // name, while this one opens over the Diff pane beside them.
          align="start"
          side="bottom"
        />
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
 * Sync is the round trip taken in the one order that cannot rewind work: a pull
 * that merges when it has to, then a push of what is left. Both arrows and both counts
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
    <Tooltip label={t('remote.publish')} side="bottom" delayMs={TOOLTIP_DELAY_MS} portal maxWidth={TOOLTIP_MAX_WIDTH}>
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
    <Tooltip label={label} side="bottom" delayMs={TOOLTIP_DELAY_MS} portal maxWidth={TOOLTIP_MAX_WIDTH}>
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

/**
 * One row of the delete dialog's list.
 *
 * The entry rather than its name, because this list's rows carry facts the other
 * list has no use for — a safety mark, an upstream, two counts — and because the
 * two lists can hold the same name: a local branch may be called `origin/main`,
 * and what is ticked is one row or the other rather than the string they share.
 */
interface DeleteRow {
  readonly entry: BranchEntry
  readonly group: BranchGroup
}

/** The dictionary entry naming each run of rows. */
const BRANCH_GROUP_KEY: Readonly<Record<BranchGroup, MessageKey>> = {
  current: 'branch.current',
  local: 'branch.local',
  remote: 'branch.remote',
}

/**
 * What the branch list was opened for.
 *
 * One dialog for the three decisions because the decision and the list are the
 * same shape: which branch. Only the words change, which branches may be picked,
 * and — for a create — what the list is a list *of*. A switch may land on any
 * branch, a merge may name another one, local or remote-tracking, but never the
 * branch HEAD is already on, and a create stands at any of them, the one HEAD is
 * on included, because branching off where you are is the ordinary case.
 */
type BranchPick = 'switch' | 'merge-from' | 'create'

/** The copy one branch decision puts around the shared list. */
interface BranchPickCopy {
  readonly title: MessageKey
  readonly description: MessageKey
  readonly none: MessageKey
  readonly confirm: MessageKey
}

/**
 * The words each decision reads.
 *
 * The three dialogs differ only in their copy, which is why they share one list;
 * this table is where that difference lives, so the dialog below states the
 * structure once. A closed dialog has no mode and reads the switch's row, which
 * nothing draws.
 */
const BRANCH_PICK_COPY: Readonly<Record<BranchPick, BranchPickCopy>> = {
  switch: {
    title: 'branch.title',
    description: 'branch.description',
    none: 'branch.none',
    confirm: 'branch.confirm',
  },
  'merge-from': {
    title: 'merge.titleFrom',
    description: 'merge.descriptionFrom',
    none: 'merge.noneFrom',
    confirm: 'merge.confirm',
  },
  create: {
    title: 'create.title',
    description: 'create.description',
    none: 'create.none',
    confirm: 'create.confirm',
  },
}

/**
 * Drive one scrolling dialog list's two edge fades.
 *
 * A branch list can be two hundred rows long and the card cuts it at a fixed
 * height, so the two ends are where a dialog has to admit there is more: an edge
 * fades its rows into the card's own surface only while that edge really hides
 * some. The attributes are written straight to the wrapper (no re-render), a
 * scroll listener follows the offset, a ResizeObserver follows the box, and the
 * scrollbar gutter is recorded so the fade covers the content column and leaves
 * the bar alone. No dependency list: a filter keystroke and a fresh list both
 * land as commits, and re-running is what re-reads the new heights.
 *
 * A hook rather than an effect copied into each dialog, because both of them cut
 * a list at the same height for the same reason and a second copy would be a
 * second place for the two to drift.
 *
 * @param scroll - the scrolling element, or a ref that is not attached yet.
 * @param wrap - the wrapper the fades are pinned to.
 */
function useListFades(
  scroll: RefObject<HTMLDivElement | null>,
  wrap: RefObject<HTMLDivElement | null>,
): void {
  useEffect(() => {
    const box = scroll.current
    const outer = wrap.current
    if (box === null || outer === null) return
    const update = (): void => {
      const overflow = box.scrollHeight - box.clientHeight > 1
      outer.toggleAttribute('data-fade-top', overflow && box.scrollTop > 1)
      outer.toggleAttribute(
        'data-fade-bottom',
        overflow && box.scrollTop + box.clientHeight < box.scrollHeight - 1,
      )
      const gutter = `${box.offsetWidth - box.clientWidth}px`
      if (outer.style.getPropertyValue('--dsh-cg-fade-right') !== gutter) {
        outer.style.setProperty('--dsh-cg-fade-right', gutter)
      }
    }
    update()
    box.addEventListener('scroll', update, { passive: true })
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(update)
    observer?.observe(box)
    return () => {
      box.removeEventListener('scroll', update)
      observer?.disconnect()
    }
  })
}

/**
 * The branches Git reports, as a dialog the choice is confirmed in.
 *
 * A dialog rather than a dropdown because the list here is the whole decision: a
 * repository can hold hundreds of branches, so the list scrolls inside a fixed
 * height and carries a filter of its own. The rows are the groups a branch can
 * come from — current, local, remote — each labelled where it starts, so a
 * remote name is never mistaken for a local one of the same shape and the branch
 * already checked out needs no mark of its own. Which groups are offered is the
 * decision's answer rather than a setting: a switch lists all three, while a
 * merge drops the branch HEAD is on, because Git refuses to merge a branch into
 * itself.
 *
 * The pointer is the whole of the selection: a click marks one row — a switch
 * opens on the branch it is already showing, while a merge opens on nothing,
 * because there is no branch it could sensibly default to — and that mark is what
 * the footer's button applies. The click itself applies nothing, because every
 * one of these operations rewrites the working tree and a stray click on a
 * scrolling list must not do that. The filter narrows the groups as it is typed,
 * dropping a selection it has just hidden, and Escape closes the dialog the way
 * the Modal's own layer does it.
 *
 * The list is read when the dialog opens, never before and never cached: this is
 * the only question the page asks that the tab's own mount does not already
 * answer, branches appear and disappear as the agent works, and a list read at
 * mount would be stale by the time anyone opened it.
 *
 * Whether the operation is allowed is Git's answer, not this half's: the dialog
 * asks the Host to switch or merge and nothing else, so a working tree Git would
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
 * @param props.mode - the decision the list is open for, or null while it is closed.
 * @param props.sessionId - the session whose repository is being read.
 * @param props.onClose - called by Cancel, the close button, Escape, or the mask.
 * @param props.onConfirm - called when the footer is pressed: with the picked
 * branch for a switch or a merge, and with the typed name and the picked starting
 * point for a create.
 * @param props.onError - called with the failure to state in the error dialog.
 * @returns the dialog element.
 */
function BranchDialog(props: {
  readonly t: Translate
  readonly mode: BranchPick | null
  readonly sessionId: string | undefined
  readonly onClose: () => void
  readonly onConfirm: (value: string, start?: string) => void
  readonly onError: (error: GitError) => void
}): ReactElement {
  const { t, mode, sessionId, onClose, onConfirm, onError } = props
  /** Whether the dialog is showing at all; the mode then says what for. */
  const open = mode !== null
  /** The local branches Git reported, or null while it has not answered yet. */
  const [branches, setBranches] = useState<readonly string[] | null>(null)
  /** The remote-tracking branches Git reported. */
  const [remoteBranches, setRemoteBranches] = useState<readonly string[]>([])
  /**
   * The name a create is being asked for.
   *
   * The only state here that is not a branch the Host reported: a create is the
   * one decision whose answer is not already on the list, so it is the one the
   * reader has to write. It is kept across the read for the reason the filter is
   * — the field is mounted before the branches arrive, and a keystroke typed
   * while it loads is not one to throw away.
   */
  const [name, setName] = useState('')
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
      // A switch opens on the branch it is already showing: the row is active
      // before the keyboard touches it, so an arrow moves off it rather than
      // onto it, and Enter confirms what the dialog says is current. A create
      // opens on it too, because branching off where you are is the ordinary
      // case and the field, not the list, is where the answer is typed. A merge
      // opens on nothing, because the branch HEAD is on is the one row it does
      // not offer and there is no other branch it could sensibly default to.
      setPicked(mode === 'merge-from' ? null : on)
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
      setName('')
    }
  }, [open, mode, sessionId, onClose, onError, t])

  useListFades(listScroll, listWrap)

  // The three decisions differ only in their words, and in which rows they may
  // offer. A switch is the dialog's original reading: every group, with the branch
  // HEAD is on among them. A merge may not name that branch — Git refuses to merge
  // a branch into itself — so its row goes. A create keeps it, the one time that
  // branch is a valid answer, because the list there is the point the new branch
  // starts at rather than the branch to act on.
  const copy = mode === null ? BRANCH_PICK_COPY.switch : BRANCH_PICK_COPY[mode]
  const title = t(copy.title)
  const description = t(copy.description)
  const emptyText = t(copy.none)

  // `null` is the one state that means "no answer yet": an answer that named no
  // branch is an empty list, which is a fact this dialog states rather than a
  // load it is still waiting on. The rows are the groups in the order they are
  // read: the branch HEAD is on, then the other local branches, then the
  // remote-tracking ones — where you are, where you could be, and what a remote
  // has — and the group is carried on the row so a filtered list can still label
  // what each run of rows belongs to.
  const rows: readonly BranchRow[] = [
    ...(mode !== 'merge-from' && current !== null
      ? [{ name: current, group: 'current' as const }]
      : []),
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
   * The name a create would be asked for, as the field holds it.
   *
   * Trimmed here rather than at the request, because the footer's gate is what
   * reads it and a field holding only spaces is an empty field: a name of spaces
   * is one Git refuses, and the button must be dark before that refusal rather
   * than after it. The name Git itself gets is this same string.
   */
  const nameInput = name.trim()

  /**
   * Whether the footer's button may apply this branch.
   *
   * The one gate, consulted by the footer: that button is what asks for the
   * switch, the merge or the create, so a row the working tree is already on is
   * not a choice a switch or a merge may offer — Git would refuse to merge a
   * branch into itself, and a switch to where you already are is no switch. A
   * create is the exception in both halves: standing on the branch you are
   * branching from is the ordinary case, and the list is not the answer at all —
   * it is the point to start at — so that button waits on the typed name instead.
   * Two refusals only — nothing selected, and the branch already checked out —
   * because whether the operation would be accepted is Git's answer, given when
   * it is asked for and stated by the error dialog if it is a refusal.
   *
   * @param name - the branch to judge, or null when no row is selected.
   * @returns true when the footer may apply that branch.
   */
  const applicable = (name: string | null): boolean => (mode === 'create'
    ? name !== null && nameInput !== ''
    : name !== null && name !== current)

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
    content = <p className="dsh-cg-dialog-hint">{emptyText}</p>
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
          // the element the layer actually focuses. A create hands the marker to
          // the name field in the footer instead, so the attribute is dropped here
          // in that mode rather than two controls claiming the same focus.
          data-modal-autofocus={mode === 'create' ? undefined : true}
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

  const canConfirm = applicable(picked)

  // What the footer's button says is the operation and nothing else: the button
  // carries the same word as the menu row that opened the dialog, so the click
  // that started this and the click that finishes it name the same thing.
  const confirmLabel = t(copy.confirm)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      closeLabel={t('dialog.close')}
      // The dialog is wider than the platform's default card: a branch name is a
      // path, and `origin/feature/…` cut by an ellipsis is a name no one can
      // tell from its neighbour. The class is the platform's own way of sizing a
      // dialog (its RiskConfirmation does the same).
      className="dsh-cg-branch-dialog"
      footer={(
        <>
          {/* A create asks for the name in the footer, left of the buttons that
              apply it: the typed name is the dialog's answer, and the buttons are
              what submit that answer, so the two read as one row. It takes the
              initial focus in this mode for the same reason the filter takes it
              in the others — the reader has something to write — and it keeps
              the marker in the footer because the Modal searches the whole card
              for it. The field is flexed, so it fills the room the two buttons
              leave and the buttons stay at the card's right edge. */}
          {mode === 'create'
            ? (
              <Input
                className="dsh-cg-branch-create-name"
                type="text"
                value={name}
                placeholder={t('create.name')}
                aria-label={t('create.name')}
                data-modal-autofocus
                onChange={event => setName(event.target.value)}
              />
            )
            : null}
          <Button variant="outline" onClick={onClose}>{t('branch.cancel')}</Button>
          <Button
            variant="primary"
            disabled={!canConfirm}
            // A create answers with two values — the name the reader typed and
            // the point the list is on — while the other two answer with the one
            // row that was picked. The second argument is what tells them apart.
            onClick={() => { if (picked !== null) onConfirm(mode === 'create' ? nameInput : picked, picked) }}
          >
            {confirmLabel}
          </Button>
        </>
      )}
    >
      <div className="dsh-cg-branch-body">{content}</div>
    </Modal>
  )
}

/** The tooltip each unsafe mark states. A safe row carries no mark and no words. */
const SAFETY_TIP_KEY: Readonly<Record<Exclude<BranchSafety, 'safe'>, MessageKey>> = {
  unmerged: 'safety.unmerged',
  unpushed: 'safety.unpushed',
  gone: 'safety.gone',
}

/**
 * The branches Git reports, as a dialog they are picked out of for deletion.
 *
 * A dialog of its own rather than a fourth mode on the branch list, because the
 * decision is a different shape: that list answers with one branch and this one
 * with as many as are ticked, its rows carry a verdict — whether Git will take
 * the branch — that a switch has no use for, and one of its rows is disabled
 * rather than merely unhelpful. What the two do share is the scroll box, the
 * filter and the edge fades, which are read from the same refs by the same hook.
 *
 * A row Git would refuse to delete carries an alert at its right edge, and a row
 * it would take carries nothing: the mark is the one thing worth reading before a
 * tick, and spelling "safe to delete" on every other row only made the list
 * noisier. The alert states its reason in a tooltip, so the row itself stays a
 * name and nothing else. Every row is still selectable, the current branch aside:
 * the mark is what the page knows, and whether a branch may be deleted is Git's
 * answer, given when the delete is asked for. A branch whose commits are nowhere
 * else is refused by Git's own `-d`, and the page's job is to have said so on the
 * row rather than to have hidden the row. The one exception is the branch HEAD is
 * on, which Git will refuse in every case: it is the one row drawn disabled
 * rather than offered, and its group heading is what names it.
 *
 * The selection is held as the rows' own keys rather than as names, because the
 * two lists can hold the same name: a local branch may be called `origin/main`,
 * and a tick on one of them is not a tick on the other.
 *
 * The list is read when the dialog opens, never cached, for the branch list's
 * reason: branches appear and disappear as the agent works. A read that fails
 * closes the dialog and is stated by the page's one error dialog, except for a
 * directory that is not a repository, which is the dialog's own empty state.
 *
 * The delete is the one operation this dialog waits for: the footer's button
 * turns into the wait itself and the card stays up until the request is
 * answered, so the click that started it has somewhere to show for it. A
 * refusal takes the same path — the page's error dialog states what Git said
 * about each branch, and the list behind it has already been re-read.
 *
 * @param props.t - the page's translate seat.
 * @param props.open - whether the dialog is showing.
 * @param props.sessionId - the session whose repository is being read.
 * @param props.busy - whether the delete the dialog asked for is still in flight.
 * @param props.onClose - called by Cancel, the close button, Escape, or the mask;
 *   ignored while a delete is in flight.
 * @param props.onConfirm - called with the branches to delete when the footer is pressed.
 * @param props.onError - called with the failure to state in the error dialog.
 * @returns the dialog element.
 */
function BranchDeleteDialog(props: {
  readonly t: Translate
  readonly open: boolean
  readonly sessionId: string | undefined
  readonly busy: boolean
  readonly onClose: () => void
  readonly onConfirm: (targets: readonly BranchDeleteTarget[]) => void
  readonly onError: (error: GitError) => void
}): ReactElement {
  const { t, open, sessionId, busy, onClose, onConfirm, onError } = props
  /** The branches Git reported, or null while it has not answered yet. */
  const [report, setReport] = useState<BranchReportPayload | null>(null)
  /** A directory that is not a repository: the dialog's own empty state. */
  const [noRepo, setNoRepo] = useState(false)
  /** The keys of the rows that are ticked, in the order they were ticked. */
  const [selection, setSelection] = useState<readonly string[]>([])
  const [filter, setFilter] = useState('')
  const listScroll = useRef<HTMLDivElement | null>(null)
  const listWrap = useRef<HTMLDivElement | null>(null)

  /**
   * The dismissal to draw while the delete runs.
   *
   * Escape, the mask and the close button all arrive through the Modal's one
   * `onClose`, so the dialog keeps its place until the answer is in: hiding it
   * mid-request would take the only control reporting the wait off screen, and
   * the page's own re-read is what tells the story afterwards.
   */
  const hold = useCallback((): void => {}, [])

  // The cleanup discards a late answer and forgets the ticks with it, so a
  // reopen starts on the loading line with nothing selected rather than on the
  // previous list with a selection nobody made twice.
  useEffect(() => {
    if (!open) return
    let cancelled = false
    void fetchBranchReport(sessionId).then(result => {
      if (cancelled) return
      if (result?.ok !== true) {
        const missing = isNoRepo(result)
        setReport(null)
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
      setReport(result)
    })
    return () => {
      cancelled = true
      setReport(null)
      setNoRepo(false)
      setSelection([])
      setFilter('')
    }
  }, [open, sessionId, onClose, onError, t])

  useListFades(listScroll, listWrap)

  /** One row's identity: its name within its own list, never across the two. */
  const keyOf = (entry: BranchEntry): string => `${entry.kind}:${entry.name}`

  // The rows are the groups in the order the branch dialog reads them — the
  // branch HEAD is on, then the other local ones, then the remote-tracking ones —
  // and the group is carried on the row so a filtered list can still label what
  // each run of rows belongs to.
  const locals = report?.locals ?? []
  const rows: readonly DeleteRow[] = [
    ...locals
      .filter(entry => entry.current === true)
      .map(entry => ({ entry, group: 'current' as const })),
    ...locals
      .filter(entry => entry.current !== true)
      .map(entry => ({ entry, group: 'local' as const })),
    ...(report?.remotes ?? []).map(entry => ({ entry, group: 'remote' as const })),
  ]

  /**
   * The rows one filter value leaves.
   *
   * @param value - the filter's text.
   * @returns the rows whose name contains it, case-insensitively.
   */
  const shownFor = (value: string): readonly DeleteRow[] => {
    const needle = value.trim().toLowerCase()
    return needle === ''
      ? rows
      : rows.filter(row => row.entry.name.toLowerCase().includes(needle))
  }

  const shown = shownFor(filter)

  // The ticked rows, read back from the selection so the order is the list's
  // rather than the clicks': a delete request that named its branches in click
  // order would report its refusals in an order the dialog is not showing.
  const chosen = rows.filter(row => selection.includes(keyOf(row.entry)))

  /**
   * The branches to delete, in the shape the Host asked to be given them back.
   *
   * A row that is missing the pair a remote-tracking row is deleted by is left
   * out rather than guessed at: the Host resolves the remote and the branch when
   * it reads the list, so a row without them is one this half cannot name, and
   * naming nothing is not a deletion to ask for.
   */
  const targets: readonly BranchDeleteTarget[] = chosen.flatMap(
    (row): readonly BranchDeleteTarget[] => {
      const entry = row.entry
      if (entry.kind !== 'remote') return [{ name: entry.name, kind: 'local' }]
      if (entry.remote === undefined || entry.branch === undefined) return []
      return [{ name: entry.name, kind: 'remote', remote: entry.remote, branch: entry.branch }]
    },
  )

  let content: ReactNode
  if (noRepo) {
    content = <p className="dsh-cg-dialog-hint">{t('branch.notRepo')}</p>
  } else if (report !== null && rows.length === 0) {
    content = <p className="dsh-cg-dialog-hint">{t('delete.none')}</p>
  } else {
    content = (
      <>
        <Input
          className="dsh-cg-branch-filter"
          type="text"
          value={filter}
          placeholder={t('branch.search')}
          aria-label={t('branch.search')}
          data-modal-autofocus
          // The list is what the request was made from, so nothing in it moves
          // while the answer is outstanding: the ticks are the request's own
          // record, and a second tick or a filter that hid one would describe a
          // delete nobody asked for.
          disabled={busy}
          // A tick the filter has just hidden is dropped with it, which matters
          // more here than it does for a single pick: the footer deletes what it
          // can see the ticks for, and a branch deleted from behind a filter
          // would be one nobody could have read off the screen before pressing.
          onChange={event => {
            const value = event.target.value
            setFilter(value)
            const visible = new Set(shownFor(value).map(row => keyOf(row.entry)))
            setSelection(previous => previous.filter(key => visible.has(key)))
          }}
        />
        {report === null
          ? <p className="dsh-cg-dialog-hint">{t('branch.loading')}</p>
          : shown.length === 0
            ? <p className="dsh-cg-dialog-hint">{t('branch.noMatch')}</p>
            : (
              <div className="dsh-cg-branch-list-wrap" ref={listWrap}>
                <div
                  className="dsh-cg-branch-list"
                  role="group"
                  aria-label={t('delete.list')}
                  ref={listScroll}
                >
                  {shown.map((row, index) => {
                    const entry = row.entry
                    const key = keyOf(entry)
                    // The one sentence a marked row has to say, or null when the
                    // row has nothing to warn about. The current branch is not
                    // an unsafe delete — it is not a delete at all — so it
                    // carries no mark either; the group heading already says
                    // which row it is.
                    const tip = entry.current === true || entry.safety === 'safe'
                      ? null
                      : t(SAFETY_TIP_KEY[entry.safety])
                    return (
                      <Fragment key={key}>
                        {row.group === shown[index - 1]?.group
                          ? null
                          : (
                            <span role="presentation" className="dsh-cg-branch-group">
                              {t(BRANCH_GROUP_KEY[row.group])}
                            </span>
                          )}
                        <label className="dsh-cg-delete-row">
                          <input
                            type="checkbox"
                            className="dsh-cg-delete-check"
                            checked={selection.includes(key)}
                            // The branch HEAD is on is the one row Git will never
                            // delete, so it is the one row offered as a fact
                            // rather than as a choice. Every row freezes while the
                            // request runs, for the filter's reason.
                            disabled={entry.current === true || busy}
                            onChange={() => setSelection(previous => (
                              previous.includes(key)
                                ? previous.filter(one => one !== key)
                                : [...previous, key]
                            ))}
                          />
                          <span className="dsh-cg-delete-name">{entry.name}</span>
                          {/* One slot at the right edge of every row, so the
                              marks line up and a row without one still gives its
                              name the same width as its neighbours. The alert is
                              the anchor of the platform's tooltip: its text
                              states why Git will refuse the branch, and it is
                              also the image's accessible name, so a reader
                              without a pointer still hears the reason. */}
                          <span className="dsh-cg-delete-trail">
                            {tip === null
                              ? null
                              : (
                                <Tooltip
                                  label={tip}
                                  side="top"
                                  align="end"
                                  delayMs={TOOLTIP_DELAY_MS}
                                  portal
                                  maxWidth={TOOLTIP_MAX_WIDTH}
                                >
                                  <span
                                    className="dsh-cg-delete-alert"
                                    role="img"
                                    aria-label={tip}
                                  >
                                    <IconAlert />
                                  </span>
                                </Tooltip>
                              )}
                          </span>
                        </label>
                      </Fragment>
                    )
                  })}
                </div>
                <span className="dsh-cg-branch-fade dsh-cg-branch-fade-top" aria-hidden="true" />
                <span className="dsh-cg-branch-fade dsh-cg-branch-fade-bottom" aria-hidden="true" />
              </div>
            )}
        {report?.truncated === true
          ? <p className="dsh-cg-dialog-hint">{t('branch.truncated')}</p>
          : null}
      </>
    )
  }

  return (
    <Modal
      open={open}
      onClose={busy ? hold : onClose}
      title={t('delete.title')}
      description={t('delete.description')}
      closeLabel={t('dialog.close')}
      className="dsh-cg-branch-dialog"
      footer={(
        <>
          <Button variant="outline" disabled={busy} onClick={onClose}>
            {t('branch.cancel')}
          </Button>
          <Button
            variant="primary"
            className={busy
              ? 'dsh-cg-delete-confirm dsh-cg-delete-confirm-busy'
              : 'dsh-cg-delete-confirm'}
            disabled={busy || selection.length === 0}
            // The ring stands in for the label's leading edge while the answer is
            // outstanding: the button that asked for the delete is the one place
            // the wait can be read off, because the dialog is staying up for it.
            icon={busy ? <span className="dsh-cg-delete-spinner">{SPINNER_ICON}</span> : undefined}
            onClick={() => onConfirm(targets)}
          >
            {busy
              ? t('delete.busy')
              : selection.length === 0
                ? t('delete.confirm')
                : t('delete.confirmCount', { count: selection.length })}
          </Button>
        </>
      )}
    >
      {/* The dialog's whole answer is the request that is running, so the body
          reports the wait as one state rather than looking interactive. */}
      <div className="dsh-cg-branch-body" aria-busy={busy || undefined}>{content}</div>
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
  return splitPath(root.replace(/\/+$/, '')).name
}

/**
 * One generated message, as the form takes it: the text to fill the field with,
 * and whatever the model asked be read before the commit is made.
 */
interface GeneratedMessage {
  /** The message the model wrote. */
  readonly message: string
  /** The model's findings, already joined into one sentence, when it had any. */
  readonly warning?: string
}

/**
 * The sidebar's commit form: a message field, the control that writes a message
 * for it, and the button that commits everything the changed-path list holds.
 *
 * It is the column's own row — under the toolbar and above both panes — rather
 * than a part of the pane whose list it commits. The field is a row of its own
 * and the two controls share the row under it: the sidebar is narrow, and a field
 * sharing one line with the buttons would leave none of them a readable width at
 * the pane's floor. The field opens at 28px and the controls are their own `sm`
 * height, so the pair costs the lists about one changed-path row each.
 *
 * Generate is the left-hand control of that row and the Commit button the right,
 * in the order the two acts belong in: the model writes a message from the
 * changes on disk, and the button beside it records those same changes under
 * whatever the field then holds. Both are the platform's own primary button, so
 * the pair reads as one row of actions; the Generate one is a square rather than
 * a word because the row has to keep the button's label at the sidebar's floor,
 * and its accessible name is what says what the glyph does. It carries no bubble:
 * one over a control that sits just under the field would cover the very text it
 * writes into.
 *
 * The field is a `textarea` of this plugin's own rather than the platform's
 * `Input`, because a commit message is not one line: a subject and the note under
 * it are one message, and a single-line control cannot show the break between
 * them. So Enter is a line break here, and the chord (⌘/Ctrl+Enter) is what
 * submits from the keyboard; the button is the plain path. The field grows with
 * what is typed and stops at four lines, past which it scrolls — a message
 * longer than that must not push the changed-path pane down the column. Its
 * corner is the controls' own, which is what makes the three read as one form (see
 * `styles.ts`).
 *
 * The form asks one question with two possible answers, and the reader says
 * which before they ask it: the commit takes the whole working tree, or the index
 * alone. `all` is the default because it is what the button means when nothing
 * else has been said — everything the list shows, recorded in one click, which is
 * what this form did before the scope was a choice. `staged` is the narrower
 * answer, for the reader who has moved paths into the index with the list's own
 * `+` and `−` and wants the commit to hold only those.
 *
 * The choice is the toolbar's: the More menu's commit rows set it, and the row in
 * force carries the menu's check. That is where the rest of the page's answers
 * about the repository live, and a caret beside the commit button spent the row's
 * width on a second control for one binary choice.
 *
 * The scope is the page's state rather than this form's, because the toolbar sets
 * it, both the Generate request and the commit request read it, and the button's
 * disabled state depends on the counts the page's status holds. The message stays
 * here for the reason below.
 *
 * The message is this component's own state rather than the page's, and that is
 * deliberate: the page renders thousands of diff rows, so a keystroke that
 * re-rendered it would repaint all of them. Nothing else needs the text — the
 * request carries it and the answer decides whether it is cleared — so it stays
 * here, one render per keystroke over one field.
 *
 * A commit empties the field and takes the findings with it, because both were
 * about the changes it just recorded; a refusal keeps the message, because a
 * message Git would not take is the one thing the answer is about. The field is
 * disabled for the length
 * of the request, so what is sent cannot be edited after it was read. Generation
 * is stated the same way and disables the same two controls for its own length: a
 * second Generate behind the first would only be a second model call, and a
 * Commit taken mid-generation would race the answer into a field it no longer
 * describes.
 *
 * @param props.t - the page's translate seat.
 * @param props.disabled - whether the repository can take a commit right now:
 * there is none to name, or the page is busy with something else.
 * @param props.committing - the commit this form asked for is in flight.
 * @param props.scope - the half the commit button is set to.
 * @param props.stagedCount - how many rows the index holds.
 * @param props.allCount - how many changed paths the whole list holds.
 * @param props.operation - the merge, rebase, or cherry-pick in progress, if any.
 * @param props.mergeMessage - the message the merge already carries, for the prefill.
 * @param props.ending - the merge this form is recording is in flight.
 * @param props.onCommit - runs the commit; resolves true when one was made.
 * @param props.onFinishMerge - records the merge the repository is holding.
 * @param props.onGenerate - asks the Host for a message; resolves null when the
 * request failed and the page has already reported it, in which case the field is
 * left exactly as it was.
 * @returns the form element.
 */
function CommitBar(props: {
  readonly t: Translate
  readonly disabled: boolean
  readonly committing: boolean
  readonly scope: CommitScope
  readonly stagedCount: number
  readonly allCount: number
  readonly operation: ConflictOperation | null
  readonly mergeMessage: string | undefined
  readonly ending: boolean
  readonly onCommit: (message: string) => Promise<boolean>
  readonly onFinishMerge: (message: string) => Promise<boolean>
  readonly onGenerate: () => Promise<GeneratedMessage | null>
}): ReactElement {
  const {
    t, disabled, committing, scope, stagedCount, allCount, operation, mergeMessage,
    ending, onCommit, onFinishMerge, onGenerate,
  } = props
  const [message, setMessage] = useState('')
  const [generating, setGenerating] = useState(false)
  const [warning, setWarning] = useState('')
  const field = useRef<HTMLTextAreaElement | null>(null)

  /** Whether this form is the one that records a merge in progress. */
  const merging = operation === 'merge'
  /**
   * Whether the repository is in an operation this page can neither continue nor
   * record: a rebase or a cherry-pick. A merge is not one of those — its commit
   * is this form's own button, whether or not it is ready yet.
   */
  const blocked = operation !== null && !merging

  /**
   * The merge message this form was last prefilled with.
   *
   * The field is the reader's the moment they touch it, so the prefill lands
   * once per message: a status re-read that carries the same words must not put
   * them back over an edit, and a field the reader emptied must stay empty. A
   * different message — a second merge — is prefilled again.
   */
  const prefilled = useRef<string | null>(null)

  /** How many rows the current scope would commit. */
  const count = scope === 'staged' ? stagedCount : allCount
  /** Whether the current scope has anything to commit, and so anything to describe. */
  const nothingToCommit = count === 0

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
   * Put the merge's own message in the field.
   *
   * Git wrote it when the merge started, so it is not a hint about the state:
   * it is what the commit will say, and it belongs where a commit's message
   * always lives. The field is prefilled only while it is empty, because a
   * reader who has typed has taken it over, and only once per message, because
   * a re-read that carries the same words must not undo an edit.
   */
  useEffect(() => {
    if (operation !== 'merge' || mergeMessage === undefined) {
      // The merge is over. A field still holding the words this effect put there
      // is holding a message for a commit that no longer exists — the merge was
      // finished or abandoned elsewhere — so it goes with the state it described.
      // Text the reader typed is theirs either way and stays.
      const previous = prefilled.current
      if (previous !== null) {
        prefilled.current = null
        setMessage(current => (current === previous ? '' : current))
      }
      return
    }
    if (prefilled.current === mergeMessage) return
    prefilled.current = mergeMessage
    setMessage(current => (current === '' ? mergeMessage : current))
  }, [operation, mergeMessage])

  /**
   * Ask for the commit the field currently describes.
   *
   * Bound to the button and to ⌘/Ctrl+Enter in the field: Enter alone is the line
   * break a message needs, so the chord is the keyboard's own way to submit.
   */
  const submit = useCallback((): void => {
    const trimmed = message.trim()
    if (disabled || committing || ending || generating || blocked) return
    // The merge's own button. The prefilled message is Git's already, so leaving
    // it untouched asks the Host to keep it (`--no-edit`) rather than to send a
    // copy of it back; only words the reader wrote are sent.
    if (merging) {
      const words = mergeMessage !== undefined && trimmed === mergeMessage ? '' : trimmed
      void onFinishMerge(words).then(made => {
        if (!made) return
        // The merge is recorded, so the words that did not override its message
        // are as spent as a commit's are.
        setMessage('')
        setWarning('')
      })
      return
    }
    if (trimmed === '' || nothingToCommit) return
    void onCommit(trimmed).then(made => {
      if (!made) return
      // The findings belonged to the changes this commit just recorded, so they
      // leave with the message rather than hanging over a form with nothing in it.
      setMessage('')
      setWarning('')
    })
  }, [
    message, disabled, committing, ending, generating, blocked, merging, mergeMessage,
    nothingToCommit, onCommit, onFinishMerge,
  ])

  // A different scope describes a different set of changes, so the finding from
  // the old one goes with it: kept, it would be the form claiming a check it never
  // ran. The scope is the page's state now that the toolbar's menu sets it, which
  // is why this follows the prop rather than the click that changed it.
  useEffect(() => {
    setWarning('')
  }, [scope])

  /**
   * Ask the Host for a message and put it in the field.
   *
   * The answer replaces whatever the field held, because the request is about the
   * changes on disk rather than about the text on screen; the model's findings
   * replace the last answer's for the same reason. A failed request leaves both
   * alone: the page has already opened its dialog on it, and clearing a message
   * the user typed would be this control taking a failure out on their work.
   */
  const generate = useCallback((): void => {
    if (disabled || committing || generating || nothingToCommit) return
    setGenerating(true)
    setWarning('')
    void onGenerate().then(result => {
      setGenerating(false)
      if (result === null) return
      setMessage(result.message)
      setWarning(result.warning ?? '')
    })
  }, [disabled, committing, generating, nothingToCommit, onGenerate])

  /**
   * What the field says while it holds no text of the reader's.
   *
   * Only two states answer here: the ordinary commit's own prompt, and the one
   * operation this page cannot record — a rebase or a cherry-pick, which the
   * reader has to finish or abandon in a terminal. A merge's state is not among
   * them, because its message is in the field itself rather than in a sentence
   * about the merge.
   */
  const pendingOperation = operation === null
    ? ''
    : t(operation === 'rebase' ? 'operation.rebase' : 'operation.cherryPick')
  const placeholder = blocked
    ? t('commit.operationBlocked', { operation: pendingOperation })
    : t('commit.placeholder')

  return (
    <div className="dsh-cg-commit-bar">
      {/* The frame is the textarea's border and fill, the way the platform's own
          field draws them: the box that grows has to carry no border at all, or
          the height measured for it would be a pixel short of what it is drawn
          at. The frame is what carries the theme's focus colour as well, since
          the field inside it is borderless and has nothing to light up.

          The frame holds two things, one row of them: the field itself, and the
          Generate glyph at the field's right end. It belongs inside the frame
          rather than beside the field because it is about the text in the field —
          it writes that text — and because the row under it is the one decision
          this form asks for (a commit, at the scope the button states), which the
          button there names on its own. It is a glyph rather than a word because
          a label at the field's right end would take the room the message needs;
          its accessible name says what it does, and it carries no bubble, so
          nothing hangs over the text it writes into. */}
      <span className="dsh-cg-commit-frame">
        <textarea
          ref={field}
          className="dsh-cg-commit-input"
          value={message}
          placeholder={placeholder}
          aria-label={placeholder}
          rows={1}
          disabled={committing || generating || ending || blocked}
          onChange={event => {
            setMessage(event.target.value)
            // The findings belonged to the message that was generated; the moment
            // it is edited they describe a draft this form no longer holds.
            if (warning !== '') setWarning('')
          }}
          onKeyDown={event => {
            if (event.key !== 'Enter' || !(event.metaKey || event.ctrlKey)) return
            event.preventDefault()
            submit()
          }}
        />
        {/* The Generate control is a bare glyph rather than a button: it stands
            inside the field, at the end of the text it writes, so a fill or a
            frame of its own would draw a second box inside the field's box and
            read as a button beside the message rather than as something done to
            it. It is still a real button — it takes focus, it can be disabled,
            and it carries its own accessible name — and the only thing it says
            on hover is that it is live, by deepening its own colour (see
            `styles.ts`). It writes for the scope the button below is set to, so
            it is disabled when that scope has nothing to describe. */}
        <button
          type="button"
          className="dsh-cg-commit-generate"
          aria-label={generating ? t('commit.generating') : t('commit.generate')}
          data-busy={generating}
          disabled={disabled || committing || generating || nothingToCommit || operation !== null}
          onClick={generate}
        >
          {generating ? SPINNER_ICON : <IconGenerate />}
        </button>
      </span>
      {warning === '' ? null : (
        <p className="dsh-cg-commit-note" role="status">{t('commit.warning', { text: warning })}</p>
      )}
      {/* The one action the form has, at the row's whole width. Which half it
          commits is chosen in the toolbar's More menu — the commit rows there
          mark the one in force — so the button states the answer it is set to
          rather than growing a caret of its own: the choice belongs with the
          other answers about the repository, and the button stays one target. */}
      <div className="dsh-cg-commit-actions">
        <button
          type="button"
          className="dsh-cg-commit-send"
          disabled={disabled || committing || ending || generating || blocked
            || (!merging && (message.trim() === '' || nothingToCommit))}
          onClick={submit}
        >
          {/* The label is its own span so a narrow sidebar elides it instead of
              wrapping it: the button is the platform's 28px tall, and a second
              line of text would spill out of a box that cannot grow. */}
          <span className="dsh-cg-commit-label">
            {ending || committing
              ? t('commit.busy')
              : merging
                ? t('commit.finishMerge')
                : t(scope === 'staged' ? 'commit.buttonStaged' : 'commit.buttonAll')}
          </span>
        </button>
      </div>
    </div>
  )
}

/**
 * The changed-path pane: both halves, stacked.
 *
 * The index's rows come first, under `Staged changes`, then the worktree's under
 * `Changes` — the order a commit reads in, and the order the old list switch
 * cycled through. Drawing both at once means a reader can see what is already
 * staged while staging the rest, and a path that is both staged and edited again
 * is one row under each header: the worktree's row offers `+`, the index's `−`.
 * A half with nothing in it is not drawn at all: its header is the tree's root
 * for the rows under it, so an empty one would be a heading for a list that is
 * not there, and a zero is nothing a reader can act on. A clean tree therefore
 * leaves the pane blank — the commit form is disabled at zero and the diff pane
 * is back at its empty hint, so there is nothing left to explain.
 *
 * Each half is a disclosure of its own (`ChangeGroup`): folding one away is how
 * the reader makes room for the other without the pane forgetting that it is
 * there. Within a half the paths are grouped by directory rather than listed
 * flat, so a run of files from one directory reads as one block and the
 * directory is named once above them instead of on every row. A directory that
 * only holds the next directory is folded into it (`buildFileTree` explains the
 * rule), so the tree spends its rows on the directories a reader can actually
 * stop at.
 *
 * Groups and folders open by default — the pane exists to show what changed,
 * and a reader who has just opened the tab should not have to unfold every
 * directory to find out. A group or folder the reader closes stays closed across
 * status refreshes, which is why the closed sets live here rather than being
 * derived from the answer; one that disappears simply stops being drawn, and a
 * new one arrives open.
 *
 * @param props.t - the page's translate seat.
 * @param props.status - the current status answer.
 * @param props.loaded - at least one answer has arrived.
 * @param props.files - every changed path; each half picks its own rows.
 * @param props.selection - the current selection, for the selected row's state.
 * @param props.staging - the row whose index write is in flight, as `side:path`.
 * @param props.discarding - the row whose discard is in flight, as `side:path`.
 * @param props.marking - the conflicted path whose resolution write is in flight.
 * @param props.markingAll - whether every conflicted path is being marked at once.
 * @param props.onSelect - called with the file and the half the reader picked.
 * @param props.onToggleStage - moves one row's path in or out of the index.
 * @param props.onDiscard - opens the confirmation for one row's worktree change.
 * @param props.onMarkResolved - stages one conflicted path as resolved.
 * @param props.onMarkAllResolved - stages every conflicted path as resolved.
 * @param props.onToggleFolderStage - moves every path under one folder in or out of the index.
 * @param props.onDiscardFolder - opens the confirmation for one folder's worktree changes.
 * @param props.onStageAll - moves one whole half in or out of the index.
 * @param props.onDiscardAll - opens the confirmation for every worktree change.
 * @returns the list body.
 */
function ChangeList(props: {
  readonly t: Translate
  readonly status: StatusPayload | null
  readonly loaded: boolean
  readonly files: readonly ChangedFile[]
  readonly selection: Selection | null
  readonly staging: string | null
  readonly discarding: string | null
  readonly marking: string | null
  /** Whether every conflicted path is being marked resolved at once. */
  readonly markingAll: boolean
  readonly onSelect: (file: ChangedFile, side: DiffSide) => void
  readonly onToggleStage: (file: ChangedFile, side: DiffSide) => void
  readonly onDiscard: (file: ChangedFile) => void
  readonly onMarkResolved: (file: ChangedFile) => void
  readonly onMarkAllResolved: () => void
  readonly onToggleFolderStage: (path: string, side: DiffSide) => void
  readonly onDiscardFolder: (path: string, count: number, untracked: boolean) => void
  readonly onStageAll: (side: StageableSide) => void
  readonly onDiscardAll: (count: number, untracked: boolean) => void
}): ReactElement {
  const {
    t, status, loaded, files, selection, staging, discarding, marking, markingAll, onSelect,
    onToggleStage, onDiscard, onMarkResolved, onMarkAllResolved, onToggleFolderStage,
    onDiscardFolder, onStageAll, onDiscardAll,
  } = props

  /** The groups the reader closed. */
  const [closedSides, setClosedSides] = useState<ReadonlySet<DiffSide>>(() => new Set())
  /**
   * The folders the reader closed, keyed by `side:path`.
   *
   * The side is part of the key because every list is on screen at once: the
   * same directory can hold an index row and a worktree row, and closing one
   * tree must not close the other.
   */
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(() => new Set())

  // Split once per status answer: a refresh rebuilds every tree, while a
  // selection or an indentation change leaves them alone.
  const visible = useMemo(() => ({
    conflict: files.filter(file => inList(file, 'conflict')),
    staged: files.filter(file => inList(file, 'staged')),
    unstaged: files.filter(file => inList(file, 'unstaged')),
  }), [files])

  const toggleSide = useCallback((side: DiffSide): void => {
    setClosedSides(previous => {
      const next = new Set(previous)
      if (next.has(side)) next.delete(side)
      else next.add(side)
      return next
    })
  }, [])

  const toggleFolder = useCallback((key: string): void => {
    setCollapsed(previous => {
      const next = new Set(previous)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  // A failed read is stated by the error dialog; the pane keeps only the fact
  // that there is nothing to list, so the two do not say the same thing twice.
  if (status !== null && status.ok !== true) {
    return <Note text={t(status.reason === 'no-repo' ? 'list.notRepo' : 'list.statusFailed')} />
  }
  if (!loaded && status === null) return <Note text={t('list.loading')} />

  return (
    <>
      {SIDES.filter(side => visible[side].length > 0).map(side => (
        <ChangeGroup
          key={side}
          t={t}
          side={side}
          files={visible[side]}
          open={!closedSides.has(side)}
          onToggle={() => toggleSide(side)}
          collapsed={collapsed}
          onToggleFolder={toggleFolder}
          selection={selection}
          staging={staging}
          discarding={discarding}
          marking={marking}
          markingAll={markingAll}
          onSelect={onSelect}
          onToggleStage={onToggleStage}
          onDiscard={onDiscard}
          onMarkResolved={onMarkResolved}
          onMarkAllResolved={onMarkAllResolved}
          onToggleFolderStage={onToggleFolderStage}
          onDiscardFolder={onDiscardFolder}
          // The conflict list's bulk action is its own check rather than the
          // index's `+`: every row in it is a file whose markers are gone, and
          // staging them all is the same decision the rows' own checks make.
          onStageAll={side === 'conflict' ? undefined : () => onStageAll(side)}
          onDiscardAll={onDiscardAll}
        />
      ))}
    </>
  )
}

/**
 * The header is the tree's root, styled and behaving like a folder row: the same
 * height, type, chevron, hover fill and trailing actions. Its children — the root
 * folders and the files that sit at the repository root — start one indentation
 * step in (`depth` 1), so the two groups and the trees under them read as one
 * tree rather than as two headings above two separate trees.
 *
 * The header is a disclosure button across the whole width — the row is the
 * target, not a chevron beside it — and it carries the half's count, so the
 * header and the rows under it always describe the same thing. Its trailing
 * actions are the row actions' own glyphs, standing for the whole half: the
 * index's offers `−` (unstage), the worktree's offers discard and `+`, and the
 * conflict list offers its rows' own check. They share the rows' reveal and are
 * siblings of the disclosure button, never children of it: a button inside a
 * button is invalid markup, and its clicks would bubble as a fold.
 *
 * A group action covers paths the reader cannot see as well as the ones on
 * screen — a closed folder or a folded group is still part of what `+` and `−`
 * mean. The Host re-reads the status inside its write queue, so the request
 * names no paths at all and the counts here are context rather than a list. The
 * conflict list's check is the exception that proves the rule: `git add` names
 * the files it resolves, so that one is sent one path at a time.
 *
 * @param props.t - the page's translate seat.
 * @param props.side - the half this group draws.
 * @param props.files - the paths in that half.
 * @param props.open - whether the group is unfolded.
 * @param props.onToggle - asks the page to fold or unfold the group.
 * @param props.collapsed - the folders the reader closed, keyed by `side:path`.
 * @param props.onToggleFolder - asks the page to flip one folder.
 * @param props.selection - the current selection, for the selected row's state.
 * @param props.staging - the row whose index write is in flight, as `side:path`.
 * @param props.discarding - the row whose discard is in flight, as `side:path`.
 * @param props.marking - the conflicted path whose resolution write is in flight.
 * @param props.onSelect - called with the file and the half the reader picked.
 * @param props.onToggleStage - moves one row's path in or out of the index.
 * @param props.onDiscard - opens the confirmation for one row's worktree change.
 * @param props.onMarkResolved - stages one conflicted path as resolved.
 * @param props.onToggleFolderStage - moves every path under one folder in or out of the index.
 * @param props.onDiscardFolder - opens the confirmation for one folder's worktree changes.
 * @param props.onStageAll - moves the whole half in or out of the index.
 * @param props.onDiscardAll - opens the confirmation for the half's worktree changes.
 * @returns the group.
 */
/**
 * One trailing row action: a glyph button with this page's own bubble.
 *
 * Every row and group header ends in the controls that move its path, discard
 * its change, or mark its conflict resolved, and those controls differ only in
 * their glyph, their labels, and the write behind them. The bubble's pace and
 * cap, the accessible name that is not always the bubble's text, and the spinner
 * that stands in while the write is in flight are therefore stated once here
 * rather than at each site.
 *
 * @param props.label - the bubble's text.
 * @param props.ariaLabel - the control's accessible name, when it differs from the label.
 * @param props.busy - whether this control's own write is in flight.
 * @param props.disabled - whether any write on the page is in flight.
 * @param props.onClick - the write to run.
 * @param props.icon - the glyph to draw while idle.
 * @returns the action element.
 */
function RowAction(props: {
  readonly label: string
  readonly ariaLabel?: string
  readonly busy: boolean
  readonly disabled: boolean
  readonly onClick: () => void
  readonly icon: ReactNode
}): ReactElement {
  return (
    <Tooltip
      label={props.label}
      side="top"
      delayMs={TOOLTIP_DELAY_MS}
      portal
      maxWidth={TOOLTIP_MAX_WIDTH}
    >
      <button
        type="button"
        className="dsh-cg-row-action"
        aria-label={props.ariaLabel ?? props.label}
        data-busy={props.busy}
        disabled={props.disabled}
        onClick={props.onClick}
      >
        {props.busy ? SPINNER_ICON : props.icon}
      </button>
    </Tooltip>
  )
}

function ChangeGroup(props: {
  readonly t: Translate
  readonly side: DiffSide
  readonly files: readonly ChangedFile[]
  readonly open: boolean
  readonly onToggle: () => void
  readonly collapsed: ReadonlySet<string>
  readonly onToggleFolder: (key: string) => void
  readonly selection: Selection | null
  readonly staging: string | null
  readonly discarding: string | null
  readonly marking: string | null
  /** Whether every conflicted path is being marked resolved at once. */
  readonly markingAll: boolean
  readonly onSelect: (file: ChangedFile, side: DiffSide) => void
  readonly onToggleStage: (file: ChangedFile, side: DiffSide) => void
  readonly onDiscard: (file: ChangedFile) => void
  readonly onMarkResolved: (file: ChangedFile) => void
  /** Marks every path in this group resolved; the conflict list's own bulk action. */
  readonly onMarkAllResolved: () => void
  readonly onToggleFolderStage: (path: string, side: DiffSide) => void
  readonly onDiscardFolder: (path: string, count: number, untracked: boolean) => void
  /** Absent for the conflict list, whose bulk action is its own check. */
  readonly onStageAll?: () => void
  readonly onDiscardAll: (count: number, untracked: boolean) => void
}): ReactElement {
  const {
    t, side, files, open, onToggle, collapsed, onToggleFolder, selection, staging, discarding,
    onSelect, onToggleStage, onDiscard, marking, markingAll, onMarkResolved, onMarkAllResolved,
    onToggleFolderStage, onDiscardFolder, onStageAll, onDiscardAll,
  } = props

  const tree = useMemo(() => buildFileTree(files), [files])
  const count = files.length
  const untracked = files.some(file => file.untracked)
  const actionsBusy = staging !== null || discarding !== null || marking !== null
  const stageBusy = staging === groupKey(side)
  const discardBusy = discarding === groupKey('unstaged')
  // The trailing slot's width comes from this attribute, so a group with no
  // action must say so rather than draw an empty one that reserves the space.
  const actions = side === 'unstaged' ? 'both' : 'stage'

  return (
    <section className="dsh-cg-group">
      <div className="dsh-cg-group-head" data-actions={actions}>
        <button
          type="button"
          className="dsh-cg-group-toggle"
          aria-expanded={open}
          onClick={onToggle}
        >
          <span className="dsh-cg-group-chevron" aria-hidden="true"><IconArrowRight /></span>
          <span className="dsh-cg-group-label">{headText(t(GROUP_KEY[side]), count)}</span>
        </button>
        <span className="dsh-cg-row-actions">
          {side === 'conflict'
            ? (
              <RowAction
                label={t('stage.markAllResolved')}
                busy={markingAll}
                disabled={count === 0 || actionsBusy}
                onClick={onMarkAllResolved}
                icon={<IconCheck />}
              />
            )
            : null}
          {side === 'unstaged'
            ? (
              <RowAction
                label={t('stage.discardAll')}
                busy={discardBusy}
                disabled={count === 0 || actionsBusy}
                onClick={() => onDiscardAll(count, untracked)}
                icon={<IconDiscard />}
              />
            )
            : null}
          {onStageAll === undefined
            ? null
            : (
              <RowAction
                label={t(side === 'staged' ? 'stage.unstageAll' : 'stage.stageAll')}
                busy={stageBusy}
                disabled={count === 0 || actionsBusy}
                onClick={onStageAll}
                icon={side === 'staged' ? <IconMinus /> : <IconPlus />}
              />
            )}
        </span>
      </div>
      {open
        ? (
          <>
            {tree.folders.map(folder => (
              <FolderBranch
                key={folder.path}
                t={t}
                folder={folder}
                side={side}
                depth={1}
                collapsed={collapsed}
                onToggle={onToggleFolder}
                selection={selection}
                staging={staging}
                discarding={discarding}
                marking={marking}
                onSelect={onSelect}
                onToggleStage={onToggleStage}
                onDiscard={onDiscard}
                onMarkResolved={onMarkResolved}
                onToggleFolderStage={onToggleFolderStage}
                onDiscardFolder={onDiscardFolder}
              />
            ))}
            {tree.files.map(file => (
              <ChangeRow
                key={file.path}
                t={t}
                file={file}
                side={side}
                depth={1}
                selection={selection}
                staging={staging}
                discarding={discarding}
                marking={marking}
                onSelect={onSelect}
                onToggleStage={onToggleStage}
                onDiscard={onDiscard}
                onMarkResolved={onMarkResolved}
              />
            ))}
          </>
        )
        : null}
    </section>
  )
}

/** The dictionary entry each list's heading is worded from. */
const GROUP_KEY: Readonly<Record<DiffSide, MessageKey>> = {
  staged: 'stage.staged',
  unstaged: 'stage.unstaged',
  conflict: 'stage.conflict',
}

/**
 * Every changed file under one folder row: its own files and every descendant's.
 *
 * The tree folds chains and collapses subtrees, but a folder action stands for
 * the folder itself, not for the rows currently visible: a closed folder's
 * files are still under it, and the confirmation's count has to say so.
 *
 * @param folder - the folder row whose subtree is collected.
 * @returns the changed files in that subtree, in tree order.
 */
function filesUnderFolder(folder: FileTreeFolder): readonly ChangedFile[] {
  const files: ChangedFile[] = [...folder.files]
  for (const child of folder.folders) files.push(...filesUnderFolder(child))
  return files
}

/**
 * One folder row and, while it is open, everything under it.
 *
 * The whole row is the disclosure control rather than a chevron the row merely
 * sits beside: the row is the target a reader aims at, and `aria-expanded` is
 * the state a screen reader announces either way. The row's own path is its
 * tooltip: the row folds a single-child chain into `types / client`, and the
 * tooltip is where the path Git knows is spelled in full. The row draws no
 * count, and its accessible name carries none either: the tree reads as paths,
 * not as a column of totals.
 *
 * The segments of a folded chain are drawn with the slashes between them, the
 * separators one step quieter than the names so the row still reads as one
 * directory rather than as a sentence about two.
 *
 * The tree is drawn as a flat run of rows indented by `depth` rather than as
 * nested lists: the pane is a scroller whose rows are full-width buttons, so a
 * level costs an indent and nothing needs a list's margins or markers, while a
 * collapsed folder simply draws no descendants.
 *
 * The folder row carries the same trailing actions as a file row, but they stand
 * for every changed path under it, closed children included. The page sends the
 * directory alone; the Host re-reads the status inside its write queue, so a
 * folder with thousands of files never has to be enumerated across a request.
 *
 * @param props.t - the page's translate seat.
 * @param props.folder - the folder to draw, with its children.
 * @param props.side - the list this folder is drawn under, which decides each
 *   file's side.
 * @param props.depth - the folder's level in the tree; a group's children start
 *   at 1.
 * @param props.collapsed - the folders the reader closed, keyed by `side:path`.
 * @param props.onToggle - asks the page to flip the folder named by that key.
 * @param props.selection - the current selection, for the selected row's state.
 * @param props.staging - the row whose index write is in flight, as `side:path`.
 * @param props.discarding - the row whose discard is in flight, as `side:path`.
 * @param props.marking - the conflicted path whose resolution write is in flight.
 * @param props.onSelect - called with the file and the half the reader picked.
 * @param props.onToggleStage - moves one row's path in or out of the index.
 * @param props.onDiscard - opens the confirmation for one row's worktree change.
 * @param props.onMarkResolved - stages one conflicted path as resolved.
 * @param props.onToggleFolderStage - moves every path under this folder in or out of the index.
 * @param props.onDiscardFolder - opens the confirmation for every worktree change under this folder.
 * @returns the folder row, and its open children.
 */
function FolderBranch(props: {
  readonly t: Translate
  readonly folder: FileTreeFolder
  readonly side: DiffSide
  readonly depth: number
  readonly collapsed: ReadonlySet<string>
  readonly onToggle: (path: string) => void
  readonly selection: Selection | null
  readonly staging: string | null
  readonly discarding: string | null
  readonly marking: string | null
  readonly onSelect: (file: ChangedFile, side: DiffSide) => void
  readonly onToggleStage: (file: ChangedFile, side: DiffSide) => void
  readonly onDiscard: (file: ChangedFile) => void
  readonly onMarkResolved: (file: ChangedFile) => void
  readonly onToggleFolderStage: (path: string, side: DiffSide) => void
  readonly onDiscardFolder: (path: string, count: number, untracked: boolean) => void
}): ReactElement {
  const {
    t, folder, side, depth, collapsed, onToggle, selection, staging, discarding, marking, onSelect,
    onToggleStage, onDiscard, onMarkResolved, onToggleFolderStage, onDiscardFolder,
  } = props
  const key = rowKey(side, folder.path)
  const open = !collapsed.has(key)
  const files = filesUnderFolder(folder)
  const stageBusy = staging === rowKey(side, folder.path)
  const discardBusy = discarding === rowKey('unstaged', folder.path)
  const actionsBusy = staging !== null || discarding !== null || marking !== null
  const untracked = files.some(file => file.untracked)
  const actions = side === 'conflict' ? 'mark' : side === 'unstaged' ? 'both' : 'stage'

  return (
    <>
      <div className="dsh-cg-folder-wrap" data-actions={actions} style={treeDepth(depth)}>
        <Tooltip
          label={folder.path}
          side="right"
          delayMs={TOOLTIP_DELAY_MS}
          portal
          maxWidth={TOOLTIP_MAX_WIDTH}
        >
          <button
            type="button"
            className="dsh-cg-folder"
            aria-expanded={open}
            aria-label={t('tree.folderLabel', { name: folder.name })}
            onClick={() => onToggle(key)}
          >
            <span className="dsh-cg-folder-chevron"><IconArrowRight /></span>
            <span className="dsh-cg-folder-name">
              {folder.segments.map((segment, index) => (
                <Fragment key={`${index}:${segment}`}>
                  {index === 0 ? null : <span className="dsh-cg-folder-sep">/</span>}
                  {segment}
                </Fragment>
              ))}
            </span>
          </button>
        </Tooltip>
        {side === 'conflict'
          ? null
          : (
            <span className="dsh-cg-row-actions">
              {side === 'unstaged'
                ? (
                  <RowAction
                    label={t('stage.discard')}
                    ariaLabel={t('stage.discardFolder', { path: folder.path })}
                    busy={discardBusy}
                    disabled={actionsBusy}
                    onClick={() => onDiscardFolder(folder.path, files.length, untracked)}
                    icon={<IconDiscard />}
                  />
                )
                : null}
              <RowAction
                label={t(side === 'staged' ? 'stage.unstage' : 'stage.stage')}
                ariaLabel={t(
                  side === 'staged' ? 'stage.unstageFolder' : 'stage.stageFolder',
                  { path: folder.path },
                )}
                busy={stageBusy}
                disabled={actionsBusy}
                onClick={() => onToggleFolderStage(folder.path, side)}
                icon={side === 'staged' ? <IconMinus /> : <IconPlus />}
              />
            </span>
          )}
      </div>
      {open ? (
        <>
          {folder.folders.map(child => (
            <FolderBranch
              key={child.path}
              t={t}
              folder={child}
              side={side}
              depth={depth + 1}
              collapsed={collapsed}
              onToggle={onToggle}
              selection={selection}
              staging={staging}
              discarding={discarding}
              marking={marking}
              onSelect={onSelect}
              onToggleStage={onToggleStage}
              onDiscard={onDiscard}
              onMarkResolved={onMarkResolved}
              onToggleFolderStage={onToggleFolderStage}
              onDiscardFolder={onDiscardFolder}
            />
          ))}
          {folder.files.map(file => (
            <ChangeRow
              key={file.path}
              t={t}
              file={file}
              side={side}
              depth={depth + 1}
              selection={selection}
              staging={staging}
              discarding={discarding}
              marking={marking}
              onSelect={onSelect}
              onToggleStage={onToggleStage}
              onDiscard={onDiscard}
              onMarkResolved={onMarkResolved}
            />
          ))}
        </>
      ) : null}
    </>
  )
}

/**
 * One changed file in the tree: its state letter, its own name, and the control
 * that moves it between the index and the worktree.
 *
 * The row names the file alone — the folders it sits under are the rows above
 * it — except for a rename, whose source path trails the name in the dimmed
 * column because it is the one part of the path the tree cannot place. The
 * tooltip still states the whole path and the state, since the row itself has
 * room for a letter and an elided name at most; the list it is drawn under is
 * already the pane's header, so repeating it there would say nothing new.
 *
 * The stage and discard controls are siblings of the selection button rather
 * than children: a button inside a button is invalid markup, its clicks bubble
 * as a selection, and a reader cannot tab to it. The row is therefore a wrapper
 * that owns the hover, the indent and the selected fill, with the selection
 * button taking the width and the actions sitting in their own trailing slot.
 * The actions are shown on hover, on the active row (the selected path keeps
 * them in reach once the pointer has moved on) and once one of them holds
 * keyboard focus, so the keyboard can reach them too; a disabled action is never
 * shown, because there is nothing it can do. Space on the selected row stages
 * without moving focus — the shortcut a list of paths invites. Their own bubbles
 * name the moves — `Stage changes`, `Discard changes` or `Unstage` — because a
 * glyph alone does not say which half it writes to.
 *
 * Only the opposite half's action is offered: a staged row shows `−` (unstage),
 * an unstaged row `+` (stage). The unstaged row also offers the discard action
 * to its left, which throws the worktree half away after a confirmation. A
 * conflicted row's one action is a check: it stages the path as resolved, which
 * is what `git add` on an unmerged path means. That is the same write the
 * conflict pane's header offers for the file on screen, and the row is where a
 * reader who resolved the file in their own editor needs it — without opening a
 * pane whose blocks are already gone. A path that holds both halves is one row
 * in each list: the worktree side's row offers `+` and the discard, the index
 * side's `−`.
 *
 * @param props.t - the page's translate seat.
 * @param props.file - the changed path this row names.
 * @param props.side - the list this row is drawn in, which is the side it stands for.
 * @param props.depth - the file's level in the tree; a group's children start at
 *   1.
 * @param props.selection - the current selection, for the selected row's state.
 * @param props.staging - the row whose index write is in flight, as `side:path`.
 * @param props.discarding - the row whose discard is in flight, as `side:path`.
 * @param props.marking - the conflicted path whose resolution write is in flight.
 * @param props.onSelect - called with the file and the half the reader picked.
 * @param props.onToggleStage - moves this row's path in or out of the index.
 * @param props.onDiscard - opens the confirmation for this row's worktree change.
 * @param props.onMarkResolved - stages this conflicted path as resolved.
 * @returns the row.
 */
function ChangeRow(props: {
  readonly t: Translate
  readonly file: ChangedFile
  readonly side: DiffSide
  readonly depth: number
  readonly selection: Selection | null
  readonly staging: string | null
  readonly discarding: string | null
  readonly marking: string | null
  readonly onSelect: (file: ChangedFile, side: DiffSide) => void
  readonly onToggleStage: (file: ChangedFile, side: DiffSide) => void
  readonly onDiscard: (file: ChangedFile) => void
  readonly onMarkResolved: (file: ChangedFile) => void
}): ReactElement {
  const {
    t, file, side, depth, selection, staging, discarding, marking, onSelect, onToggleStage,
    onDiscard, onMarkResolved,
  } = props
  const { name } = splitPath(file.path)
  const key = rowKey(side, file.path)
  const selected = selection?.kind === 'file'
    && selection.file.path === file.path
    && selection.side === side
  const busy = staging === key
  const discardBusy = discarding === key
  const markBusy = marking === file.path
  const actionsBusy = staging !== null || discarding !== null || marking !== null
  const actionLabel = t(side === 'staged' ? 'stage.unstageFile' : 'stage.stageFile', { path: name })
  const actionTip = t(side === 'staged' ? 'stage.unstage' : 'stage.stage')
  const discardLabel = t('stage.discardFile', { path: name })
  const actions = side === 'conflict' ? 'none' : side === 'unstaged' ? 'both' : 'stage'

  return (
    <div
      className="dsh-cg-row-wrap"
      data-selected={selected}
      data-actions={actions}
      style={treeDepth(depth)}
    >
      {/* The bubble is portaled so it can sit beside the sidebar rather than
          inside the list's own scroll box, which would clip it; a path too long
          for the cap wraps inside the bubble. It hangs from the selection button
          and the button reaches the row's own end, so the bubble starts outside
          the row instead of over the controls drawn there — the two never cover
          each other, and each control's own bubble says what it does. */}
      <Tooltip
        label={rowLabel(t, file)}
        side="right"
        delayMs={TOOLTIP_DELAY_MS}
        portal
        maxWidth={TOOLTIP_MAX_WIDTH}
      >
        <button
          type="button"
          className="dsh-cg-row"
          aria-selected={selected}
          onClick={() => onSelect(file, side)}
          onKeyDown={event => {
            if (event.key !== ' ' || side === 'conflict') return
            event.preventDefault()
            onToggleStage(file, side)
          }}
        >
          <span className="dsh-cg-badge" data-kind={file.kind}>{KIND_LETTER[file.kind]}</span>
          <span className="dsh-cg-path">
            <span className="dsh-cg-name">{name}</span>
            {file.origPath === undefined
              ? null
              : (
                <>
                  <span className="dsh-cg-dot">←</span>
                  <span className="dsh-cg-dir" title={file.origPath}>{file.origPath}</span>
                </>
              )}
          </span>
        </button>
      </Tooltip>
      {side === 'conflict'
        ? (
          <span className="dsh-cg-row-actions">
            <RowAction
              label={t('stage.markResolved')}
              ariaLabel={t('stage.markResolvedFile', { path: name })}
              busy={markBusy}
              disabled={actionsBusy}
              onClick={() => onMarkResolved(file)}
              icon={<IconCheck />}
            />
          </span>
        )
        : (
          <span className="dsh-cg-row-actions">
            {side === 'unstaged'
              ? (
                <RowAction
                  label={t('stage.discard')}
                  ariaLabel={discardLabel}
                  busy={discardBusy}
                  disabled={actionsBusy}
                  onClick={() => onDiscard(file)}
                  icon={<IconDiscard />}
                />
              )
              : null}
            <RowAction
              label={actionTip}
              ariaLabel={actionLabel}
              busy={busy}
              disabled={actionsBusy}
              onClick={() => onToggleStage(file, side)}
              icon={side === 'staged' ? <IconMinus /> : <IconPlus />}
            />
          </span>
        )}
    </div>
  )
}

/**
 * What a changed-path row says about itself when hovered: its path first — a
 * rename's old path trailing it — then its state, spelled out rather than
 * lettered, the same `· ` separator the pane headers use.
 *
 * The half the row stands for is deliberately absent: the group header above it
 * already names the list, so repeating it in every bubble would only add a word
 * the row cannot be mistaken about.
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
          {commit.refs.length > 0 ? <RefRow refs={commit.refs.slice(0, 3)} /> : null}
        </button>
      ))}
    </>
  )
}

/**
 * The branch and tag decorations a commit carries, as one row of chips: a single
 * line, and the whole of it reachable without leaving the row.
 *
 * A commit can carry three of these, and a name among them can be longer than
 * the room the sidebar has for all of them put together, so the row is where the
 * overflow goes. Two things used to happen instead, and both are wrong in the
 * same way — a name was shortened into its chip, so the rest of it was simply
 * gone, or it wrapped, so a chip stood two lines tall beside its one-line
 * neighbours. Neither is a way to read a branch name, and the row is the honest
 * one: the chips keep their names whole, the row stays one line, and what does
 * not fit sits to the right of the row rather than missing from it.
 *
 * The pointer is what asks the row to move. Entering walks it to its end;
 * leaving puts it back at its start at once, so the row always reads from its
 * first chip unless the pointer is on it. The walk is this component's own frame
 * loop rather than `behavior:'smooth'`, whose duration the browser picks and
 * which cannot be asked to hold a speed, and it starts from wherever the row is,
 * so a reader who scrolled it by hand is neither pulled back to the start nor
 * shown the same part of it twice. Nothing here is timed out or restored on a
 * delay: leaving is the whole of the rewind, and a walk that has reached the end
 * stops there for as long as the pointer stays.
 *
 * `styles.ts` states the scrolling itself — one line of chips, the sideways
 * overflow, and the hidden bar — so all this component owns is the walking.
 *
 * @param props.refs - the decorations to draw, already capped by the caller;
 * each name's `HEAD -> ` or `tag: ` prefix is stripped by `refLabel`.
 * @returns the row.
 */
function RefRow(props: { readonly refs: readonly string[] }): ReactElement {
  const { refs } = props

  /** The scroller: the row that is walked. */
  const box = useRef<HTMLSpanElement | null>(null)

  /** The frame the walk is on, or 0 at rest. */
  const frame = useRef(0)

  /** Drop a walk in flight, if there is one. */
  const halt = useCallback((): void => {
    if (frame.current !== 0) cancelAnimationFrame(frame.current)
    frame.current = 0
  }, [])

  // A walk outliving the row would hold a node the page has already dropped.
  useEffect(() => halt, [halt])

  /** Walk the row from where it is to its right edge, one frame at a time. */
  const walk = useCallback((): void => {
    const node = box.current
    if (node === null) return
    const from = node.scrollLeft
    const rest = node.scrollWidth - node.clientWidth - from
    // A row that fits, or one already walked to its end, asks for nothing.
    if (rest <= 0) return
    // The first frame's own timestamp is the walk's zero: a clock read here
    // would be a moment earlier than the frame that is about to be drawn.
    let started = 0
    const step = (now: number): void => {
      if (started === 0) started = now
      const walked = ((now - started) / 1000) * REF_SCROLL_SPEED
      const done = walked >= rest
      node.scrollLeft = done ? from + rest : from + walked
      frame.current = done ? 0 : requestAnimationFrame(step)
    }
    halt()
    frame.current = requestAnimationFrame(step)
  }, [halt])

  /** Put the row back at its start, at once. */
  const rewind = useCallback((): void => {
    halt()
    if (box.current !== null) box.current.scrollLeft = 0
  }, [halt])

  return (
    <span ref={box} className="dsh-cg-refs" onMouseEnter={walk} onMouseLeave={rewind}>
      {refs.map(ref => (
        <span key={ref} className="dsh-cg-ref">{refLabel(ref)}</span>
      ))}
    </span>
  )
}

/**
 * A pane's empty state: what it is, and why there is nothing to draw.
 *
 * Five states answer with the same two lines — the pane has no answer, or the
 * answer it has is not a patch to draw — and one of them carries the whole-file
 * choice that is the only action such a path can take. The shape is stated once
 * here so those states cannot drift apart.
 *
 * @param props.title - the state's own heading.
 * @param props.text - the sentence under it.
 * @param props.children - the action the state offers, when it offers one.
 * @returns the empty state.
 */
function EmptyPane(props: {
  readonly title: string
  readonly text: string
  readonly children?: ReactNode
}): ReactElement {
  return (
    <div className="dsh-cg-empty">
      <span className="dsh-cg-empty-title">{props.title}</span>
      <span className="dsh-cg-empty-text">{props.text}</span>
      {props.children}
    </div>
  )
}

/**
 * The diff pane: its header, its body, and its empty and error states.
 *
 * One pane, two kinds of content. A changed path's patch and a conflicted path's
 * blocks are both "the answer to the row the reader picked", so they are drawn by
 * the same component into the same frame; only the body and the header's controls
 * differ. That is what keeps the pane's layout, its empty states and its scrolling
 * from having to exist twice.
 *
 * @param props.t - the page's translate seat.
 * @param props.status - the current status answer.
 * @param props.selection - what the user picked.
 * @param props.current - the answer that belongs to that selection, if it arrived.
 * @param props.resolving - the conflict write in flight, as its keys or `whole`.
 * @param props.busy - an operation is already in flight elsewhere on the page.
 * @param props.onResolve - applies a choice to the selected conflict.
 * @returns the pane.
 */
function DiffPane(props: {
  readonly t: Translate
  readonly status: StatusPayload | null
  readonly selection: Selection | null
  readonly current: DocState | null
  readonly resolving: string | null
  readonly busy: boolean
  readonly onResolve: (choice: ResolveChoice, keys: readonly string[] | undefined) => void
}): ReactElement {
  const { t, status, selection, current, resolving, busy, onResolve } = props

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
      <EmptyPane
        title={t('diff.pane')}
        text={t(status.reason === 'no-repo' ? 'diff.notRepo' : 'diff.repoFailed')}
      />
    )
  }

  if (selection === null) {
    return (
      <EmptyPane title={t('diff.pane')} text={t('diff.emptyHint')} />
    )
  }

  const title = selection.kind === 'file' ? selection.file.path : current?.commit?.subject ?? selection.commit.subject
  const loading = current === null || current.loading

  // A conflicted path is its own pane rather than a patch with a badge: what the
  // reader does there is choose, and a choice has nowhere to live in a diff.
  if (selection.kind === 'file' && selection.side === 'conflict') {
    return (
      <ConflictPane
        t={t}
        file={selection.file}
        current={current}
        resolving={resolving}
        busy={busy}
        onResolve={onResolve}
      />
    )
  }

  return (
    <>
      <header className="dsh-cg-main-head">
        {/* The path alone. Its state is the changed-path list's: the row it was
            opened from carries the letter and the group, and the two halves of a
            half-staged path are two rows there as well. Repeating either badge
            here would say a second time what the reader just clicked. */}
        <span className="dsh-cg-main-title" title={title}>{title}</span>
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
 * The conflict pane: one unmerged path and the blocks its reader decides.
 *
 * The pane exists because a conflicted path is not something to *read*. `git
 * diff` answers one with a combined diff — a report about the merge, not a file
 * to choose within — and a delete/modify conflict answers with no diff at all.
 * What the reader needs is the file Git left on disk, split into the runs it
 * agrees on and the blocks it does not, with a way to say which side each block
 * keeps. That is what this draws.
 *
 * The header is the whole file's decision — take one side everywhere — and each
 * block carries its own, because a file with five conflicts is five decisions far
 * more often than it is one. Marking the file done is not among them: that is the
 * conflict row's own check, in the list the reader already reads, so the pane
 * does not repeat it.
 *
 * @param props.t - the page's translate seat.
 * @param props.file - the changed path, for its state letter and its name.
 * @param props.current - the conflict answer, or the fact that it is loading.
 * @param props.resolving - the write in flight, as its keys or `whole`.
 * @param props.busy - an operation is already in flight elsewhere on the page.
 * @param props.onResolve - applies a choice to this path.
 * @returns the pane.
 */
function ConflictPane(props: {
  readonly t: Translate
  readonly file: ChangedFile
  readonly current: DocState | null
  readonly resolving: string | null
  readonly busy: boolean
  readonly onResolve: (choice: ResolveChoice, keys: readonly string[] | undefined) => void
}): ReactElement {
  const { t, file, current, resolving, busy, onResolve } = props
  const conflict = current?.conflict
  const loading = current === null || current.loading

  // The blocks this file still has to decide, in file order. A whole-file state
  // — binary content, or a path with no worktree file — has none, and the
  // header's "take one side" buttons would have nothing to name.
  const keys = useMemo(
    () => (conflict?.blocks ?? []).flatMap(block => (block.kind === 'region' ? [block.key] : [])),
    [conflict],
  )
  const disabled = busy || keys.length === 0
  const allBusy = resolving === keys.join(',')

  return (
    <>
      <header className="dsh-cg-main-head">
        <span className="dsh-cg-main-title" title={file.path}>{file.path}</span>
        {/* No count here: every block is numbered `1 / 3` where it is drawn, the
            clean and whole-file states say themselves in the body, and the list's
            group already counts the paths. The header states the file and what the
            reader can do to all of it. */}
        <span className="dsh-cg-main-actions">
          {allBusy ? SPINNER_ICON : null}
          {keys.length === 0 ? null : (
            <>
              <ConflictButton
                label={t('conflict.takeAllOurs')}
                ghost
                disabled={disabled}
                onClick={() => onResolve('ours', keys)}
              />
              <ConflictButton
                label={t('conflict.takeAllTheirs')}
                ghost
                disabled={disabled}
                onClick={() => onResolve('theirs', keys)}
              />
            </>
          )}
        </span>
      </header>
      <div className="dsh-cg-diff">
        {loading
          ? <Note text={t('diff.loading')} />
          : conflict === undefined
            ? <Note text={t('diff.failed')} />
            : (
              <ConflictBody
                // A different path, or a different number of blocks, is a
                // different file to read: the folds the reader opened are dropped
                // with it, which is also what a resolution deserves, since it
                // renumbers every line below the one it settled.
                key={`${conflict.path}:${conflict.regions}`}
                t={t}
                doc={conflict}
                resolving={resolving}
                busy={busy}
                onResolve={onResolve}
              />
            )}
      </div>
    </>
  )
}

/**
 * One conflict choice: the card's own button.
 *
 * The pane offers the same four choices twice — for the whole file and for one
 * block — and the two differ only in their labels and what they resolve, so the
 * element is stated once here. `ghost` is the lighter variant the pane header and
 * a block's bar use; a whole-file choice with a heading of its own is drawn solid.
 *
 * @param props.label - the button's text, and its accessible name.
 * @param props.ghost - whether to draw the lighter variant.
 * @param props.disabled - whether a write is already in flight.
 * @param props.onClick - the choice to apply.
 * @returns the button.
 */
function ConflictButton(props: {
  readonly label: string
  readonly ghost?: boolean
  readonly disabled: boolean
  readonly onClick: () => void
}): ReactElement {
  return (
    <button
      type="button"
      className="dsh-cg-conflict-btn"
      data-variant={props.ghost === true ? 'ghost' : undefined}
      disabled={props.disabled}
      onClick={props.onClick}
    >
      {props.label}
    </button>
  )
}

/**
 * How many lines of the file one block occupies.
 *
 * A context run is its own lines. A region is its opener, its two sides and its
 * closer, plus the base marker and the base section when Git wrote one — the
 * same rows the pane draws, which is what makes the numbers in the gutter line up
 * with the file an editor would show.
 *
 * @param block - the block to measure.
 * @returns its line count.
 */
function blockLineCount(block: ConflictBlock): number {
  if (block.kind === 'context') return block.lines.length
  const base = block.base === undefined ? 0 : block.base.length + 1
  return 3 + block.ours.length + block.theirs.length + base
}

/**
 * One conflicted file, drawn as the file itself.
 *
 * The pane is a diff-shaped view rather than a report about a diff: every line of
 * the working-tree file is drawn once, in order, with the number it has on disk,
 * so the markers Git left in it appear where they are. Each block is drawn as a
 * card: its choice lives in the header of that card — the same place the diff
 * pane puts a hunk's `@@` scope — and the sides inside it are tinted the way an
 * addition and a deletion are tinted, because that is what a reader of this page
 * already knows how to read. The frame is what keeps two conflicts in one file
 * from reading as one long tinted stretch.
 *
 * The unchanged runs between blocks are folded the way Git folds the code around
 * a hunk: three lines either side, the rest one click away. A whole unchanged
 * file would otherwise sit between two conflicts and bury them.
 *
 * Three states other than the ordinary one, each answered in place rather than
 * by a refusal: a binary or missing path can only take a whole version, and a
 * file whose markers are already gone only has to be staged — which is a much
 * better thing to be told than "there is no diff".
 *
 * @param props.t - the page's translate seat.
 * @param props.doc - the parsed conflict.
 * @param props.resolving - the write in flight, as its keys or `whole`.
 * @param props.busy - an operation is already in flight elsewhere on the page.
 * @param props.onResolve - applies a choice to this path.
 * @returns the file.
 */
function ConflictBody(props: {
  readonly t: Translate
  readonly doc: ConflictDoc
  readonly resolving: string | null
  readonly busy: boolean
  readonly onResolve: (choice: ResolveChoice, keys: readonly string[] | undefined) => void
}): ReactElement {
  const { t, doc, resolving, busy, onResolve } = props

  // Which unchanged runs the reader has opened, by block index. Kept here rather
  // than in each run so a re-read of the answer does not hand back the same file
  // with every fold closed — the fresh document arrives as a new element (`key`
  // on this component), which is what clears it.
  const [expanded, setExpanded] = useState<ReadonlySet<number>>(() => new Set())
  const toggleContext = useCallback((index: number): void => {
    setExpanded(previous => {
      const next = new Set(previous)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }, [])

  // Where each block sits in the file's conflict order, for the "2 / 5" label.
  // Computed rather than counted during the walk so a block's number does not
  // depend on what has already been drawn above it.
  const ordinals = useMemo(() => {
    const order = new Map<string, number>()
    let ordinal = 0
    for (const block of doc.blocks) {
      if (block.kind !== 'region') continue
      ordinal += 1
      order.set(block.key, ordinal)
    }
    return order
  }, [doc])

  // The file line each block starts at. Counted here rather than read from the
  // answer, because the page is the half that draws the rows: a block occupies
  // exactly as many lines as it has, so the numbers cannot disagree with what is
  // on screen — and an answer from a Host that predates the numbering still
  // numbers correctly.
  const starts = useMemo(() => {
    const lines: number[] = []
    let line = 1
    for (const block of doc.blocks) {
      lines.push(line)
      line += blockLineCount(block)
    }
    return lines
  }, [doc])

  if (doc.state === 'binary' || doc.state === 'missing') {
    return (
      <EmptyPane
        title={t(doc.state === 'binary' ? 'conflict.binaryTitle' : 'conflict.missingTitle')}
        text={t(doc.state === 'binary' ? 'conflict.binaryText' : 'conflict.missingText')}
      >
        <div className="dsh-cg-conflict-choose">
          <ConflictButton
            label={t(doc.stages.ours ? 'conflict.keepOurs' : 'conflict.keepOursGone')}
            disabled={busy}
            onClick={() => onResolve('ours', undefined)}
          />
          <ConflictButton
            label={t(doc.stages.theirs ? 'conflict.keepTheirs' : 'conflict.keepTheirsGone')}
            disabled={busy}
            onClick={() => onResolve('theirs', undefined)}
          />
        </div>
      </EmptyPane>
    )
  }

  if (doc.state === 'clean') {
    return (
      <EmptyPane title={t('conflict.cleanTitle')} text={t('conflict.cleanText')} />
    )
  }

  return (
    <div className="dsh-cg-conflict-stream">
      {doc.blocks.map((block, index) => (block.kind === 'context'
        ? (
          <ConflictContext
            key={`context:${index}`}
            t={t}
            lines={block.lines}
            start={starts[index] ?? 1}
            index={index}
            expanded={expanded.has(index)}
            onToggle={toggleContext}
          />
        )
        : (
          <ConflictRegionView
            key={block.key}
            t={t}
            region={block}
            line={starts[index] ?? 1}
            ordinal={ordinals.get(block.key) ?? 0}
            total={doc.regions}
            resolving={resolving}
            busy={busy}
            onResolve={onResolve}
          />
        )))}
    </div>
  )
}

/**
 * One block of a conflicted file: its card, its markers, and its three versions.
 *
 * The sides are labelled with the words the reader chooses by — "current" and
 * "incoming" — beside the labels Git itself wrote after the markers (`HEAD` and
 * the branch that was merged in, or during a rebase the two commits involved).
 * Those labels are read from the file rather than assumed, because "ours" and
 * "theirs" swap roles across a rebase, and a tag that says "current" when the
 * file says otherwise is a tag that lies.
 *
 * "Keep both" is offered beside the two sides because it is the answer for the
 * most common conflict of all — both sides added something, and the reader wants
 * both — and because the only other way to express it is to edit the file by
 * hand.
 *
 * @param props.t - the page's translate seat.
 * @param props.region - the block to draw.
 * @param props.ordinal - its position among the file's conflicts, from 1.
 * @param props.total - how many conflicts the file holds.
 * @param props.resolving - the write in flight, as its keys or `whole`.
 * @param props.busy - an operation is already in flight elsewhere on the page.
 * @param props.onResolve - applies a choice to this block.
 * @returns the block's rows.
 */
function ConflictRegionView(props: {
  readonly t: Translate
  readonly region: ConflictRegion
  /** The file line the block starts at, counting from 1. */
  readonly line: number
  readonly ordinal: number
  readonly total: number
  readonly resolving: string | null
  readonly busy: boolean
  readonly onResolve: (choice: ResolveChoice, keys: readonly string[] | undefined) => void
}): ReactElement {
  const { t, region, line, ordinal, total, resolving, busy, onResolve } = props
  const mine = resolving === region.key
  const choose = (choice: ResolveChoice): (() => void) => () => onResolve(choice, [region.key])

  // Where each row sits in the file. Only the opener's number is handed in; the
  // rest follow from the side lengths, because a block is drawn exactly as it is
  // written — opener, ours, an optional base section, separator, theirs, closer —
  // and a number counted here cannot drift from the row it is drawn on.
  const oursLine = line + 1
  const baseLine = oursLine + region.ours.length
  const separatorLine = baseLine + (region.base === undefined ? 0 : region.base.length + 1)
  const theirsLine = separatorLine + 1
  const closeLine = theirsLine + region.theirs.length

  return (
    <div className="dsh-cg-conflict-card" data-busy={mine || undefined}>
      {/* The block's own container line, above the code it decides: the whole
          file's decision is the pane header's, and this is where one block's is.
          It heads the card rather than the file, so the code around it still
          reads as one continuous file and the block reads as one decision. */}
      <div className="dsh-cg-conflict-bar">
        <span className="dsh-cg-conflict-index">
          {t('conflict.block', { index: ordinal, total })}
        </span>
        <span className="dsh-cg-conflict-actions">
          {mine ? SPINNER_ICON : null}
          <ConflictButton
            label={t('conflict.takeOurs')}
            ghost
            disabled={busy}
            onClick={choose('ours')}
          />
          <ConflictButton
            label={t('conflict.takeTheirs')}
            ghost
            disabled={busy}
            onClick={choose('theirs')}
          />
          <ConflictButton
            label={t('conflict.takeBoth')}
            ghost
            disabled={busy}
            onClick={choose('both')}
          />
          {region.base === undefined
            ? null
            : (
              <ConflictButton
                label={t('conflict.takeBase')}
                ghost
                disabled={busy}
                onClick={choose('base')}
              />
            )}
        </span>
      </div>
      <ConflictMarker
        line={line}
        mark="<<<<<<<"
        tag={t('conflict.current')}
        gitLabel={region.oursLabel}
      />
      {region.ours.length === 0
        ? <ConflictNoLines t={t} kind="add" />
        : region.ours.map((text, index) => (
          <ConflictRow key={`ours:${index}`} line={oursLine + index} kind="add" text={text} />
        ))}
      {region.base === undefined
        ? null
        : (
          <>
            <ConflictMarker
              line={baseLine}
              mark="|||||||"
              tag={t('conflict.base')}
              gitLabel={region.baseLabel}
            />
            {region.base.length === 0
              ? <ConflictNoLines t={t} kind="base" />
              : region.base.map((text, index) => (
                <ConflictRow key={`base:${index}`} line={baseLine + 1 + index} kind="base" text={text} />
              ))}
          </>
        )}
      <ConflictMarker
        line={separatorLine}
        mark="======="
        tag={t('conflict.incoming')}
        gitLabel={region.theirsLabel}
      />
      {region.theirs.length === 0
        ? <ConflictNoLines t={t} kind="del" />
        : region.theirs.map((text, index) => (
          <ConflictRow key={`theirs:${index}`} line={theirsLine + index} kind="del" text={text} />
        ))}
      <ConflictMarker line={closeLine} mark=">>>>>>>" />
    </div>
  )
}

/**
 * One line of the file: its number, and the text Git left there.
 *
 * The number is the single one the file has. A patch's two columns are two
 * versions of it; a conflicted path has one version on disk, and printing the
 * same number twice would suggest otherwise.
 *
 * @param props.line - the line's number in the file, from 1.
 * @param props.kind - which side of the conflict the line belongs to, or that it
 * belongs to neither.
 * @param props.text - the line's text, its terminator already removed.
 * @returns the row.
 */
function ConflictRow(props: {
  readonly line: number
  readonly kind: 'add' | 'del' | 'base' | 'context'
  readonly text: string
}): ReactElement {
  return (
    <div className="dsh-cg-conflict-row" data-kind={props.kind}>
      <span className="dsh-cg-conflict-no">{props.line}</span>
      <span className="dsh-cg-conflict-text">{props.text}</span>
    </div>
  )
}

/**
 * One marker line, with the side it opens named in words.
 *
 * The run of marker characters is drawn as the file has it — that is what the
 * reader will see in an editor — and the tag says which side begins there. The
 * closer carries no tag of its own: the block has already been named by the
 * separator, and a second "incoming" at the end would only say it again.
 *
 * @param props.line - the line's number in the file, from 1.
 * @param props.mark - the marker run itself, `<<<<<<<` and its kin.
 * @param props.tag - the side the marker opens, when it opens one.
 * @param props.gitLabel - the label Git wrote after the marker, when it wrote one.
 *   Named for the file's text rather than for React: a prop called `ref` is
 *   claimed by the runtime, and a string in it is an error, not a label.
 * @returns the row.
 */
function ConflictMarker(props: {
  readonly line: number
  readonly mark: string
  readonly tag?: string
  readonly gitLabel?: string
}): ReactElement {
  return (
    <div className="dsh-cg-conflict-row" data-kind="meta">
      <span className="dsh-cg-conflict-no">{props.line}</span>
      <span className="dsh-cg-conflict-text">
        {props.mark}
        {props.tag === undefined ? null : <span className="dsh-cg-conflict-tag">{` ${props.tag}`}</span>}
        {props.gitLabel === undefined
          ? null
          : <span className="dsh-cg-conflict-ref">{` · ${props.gitLabel}`}</span>}
      </span>
    </div>
  )
}

/**
 * An empty side of a block, drawn as a word rather than as nothing.
 *
 * "This side deleted the lines" is a real answer to see, and a gap between two
 * markers reads as a rendering fault.
 *
 * @param props.t - the page's translate seat.
 * @param props.kind - which side is empty, so the row keeps that side's tint.
 * @returns the row.
 */
function ConflictNoLines(props: {
  readonly t: Translate
  readonly kind: 'add' | 'del' | 'base'
}): ReactElement {
  return (
    <div className="dsh-cg-conflict-row" data-kind={props.kind} data-empty="true">
      <span className="dsh-cg-conflict-no" />
      <span className="dsh-cg-conflict-text">{props.t('conflict.noLines')}</span>
    </div>
  )
}

/**
 * One unchanged run of a conflicted file, folded the way Git folds a hunk.
 *
 * A conflict pane shows the whole file, so the lines between two blocks can be
 * hundreds; drawing all of them would bury the blocks the reader came for. Three
 * lines either side is the same amount of context a patch would have shown, and
 * the count in the fold is how much else is there.
 *
 * @param props.t - the page's translate seat.
 * @param props.lines - the run's text, terminators already removed.
 * @param props.start - the file line the run starts at, counting from 1.
 * @param props.index - its position among the file's blocks, which is what the
 * fold is keyed by.
 * @param props.expanded - whether the reader has opened this run.
 * @param props.onToggle - asks the file to flip it.
 * @returns the rows.
 */
function ConflictContext(props: {
  readonly t: Translate
  readonly lines: readonly string[]
  /** The file line the run starts at, counting from 1. */
  readonly start: number
  readonly index: number
  readonly expanded: boolean
  readonly onToggle: (index: number) => void
}): ReactElement {
  const { t, lines, start, index, expanded, onToggle } = props

  if (lines.length <= CONFLICT_CONTEXT_EDGE * 2 + 1) {
    return (
      <>
        {lines.map((text, offset) => (
          <ConflictRow key={offset} line={start + offset} kind="context" text={text} />
        ))}
      </>
    )
  }

  const hidden = lines.length - CONFLICT_CONTEXT_EDGE * 2
  const fold = (
    <div key="fold" className="dsh-cg-conflict-fold">
      <button
        type="button"
        className="dsh-cg-conflict-fold-btn"
        // The count is spelled out because it is the only thing that says this
        // row stands for the lines that are not drawn.
        onClick={() => onToggle(index)}
      >
        {`⋯ ${t(expanded ? 'conflict.hideContext' : 'conflict.showContext', { count: hidden })}`}
      </button>
    </div>
  )

  if (expanded) {
    return (
      <>
        {fold}
        {lines.map((text, offset) => (
          <ConflictRow key={offset} line={start + offset} kind="context" text={text} />
        ))}
      </>
    )
  }

  const head = lines.slice(0, CONFLICT_CONTEXT_EDGE)
  const tail = lines.slice(lines.length - CONFLICT_CONTEXT_EDGE)
  return (
    <>
      {head.map((text, offset) => (
        <ConflictRow key={`head:${offset}`} line={start + offset} kind="context" text={text} />
      ))}
      {fold}
      {tail.map((text, offset) => (
        <ConflictRow
          key={`tail:${offset}`}
          line={start + lines.length - CONFLICT_CONTEXT_EDGE + offset}
          kind="context"
          text={text}
        />
      ))}
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

  const label = t(copied ? 'diff.copied' : 'diff.copy')
  return (
    <button
      type="button"
      className="dsh-cg-icon"
      title={label}
      aria-label={label}
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
      <EmptyPane
        title={t('diff.noTextTitle')}
        text={t(kind === 'untracked' ? 'diff.noTextUntracked' : 'diff.noTextOther')}
      />
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
