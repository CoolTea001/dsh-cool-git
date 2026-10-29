/**
 * The wire contract both halves of dsh-cool-git agree on.
 *
 * The browser half never sees the Host Cordis context, so every fact about the
 * repository crosses the same-origin HTTP routes as JSON shaped by the types
 * below. The Host half parses Git's own output into them (see `host/git.ts`)
 * and the browser half renders them; nothing here touches Node or the DOM, so
 * the module is bundled into both halves unchanged.
 *
 * Every answer carries `ok`: an `ok: false` result is a normal answer the
 * browser reports in its error dialog, never a rejected promise. The one
 * exception is a transport failure, which the fetch wrapper turns into the
 * same shape.
 *
 * An `ok: false` answer says why in one of two ways, and the two are not
 * interchangeable. `failure` is a code plus the values its sentence
 * interpolates: the refusal is one this plugin names, and only the browser
 * knows the language to name it in, so the page words it from its own
 * dictionaries (see `client/locales.ts`). `error` is raw diagnostic text —
 * Git's own first line, or a transport or seam message — which no dictionary
 * can own because another program wrote it. A coded refusal carries no
 * `error`, and text carries no `failure`.
 */

/**
 * Every refusal this plugin can name, as a code rather than a sentence.
 *
 * The page renders each one from its own dictionary, so the same refusal reads
 * in whatever language the browser is set to; a code is therefore the wire
 * form, and the sentences live in `client/locales.ts` keyed `error.<code>`.
 * The set is closed on purpose: a refusal that is not one of these is Git's
 * own words and travels as `error` text instead.
 */
export type FailureCode =
  // The route's own guards, before a repository is ever resolved.
  | 'not-ready'
  | 'no-workdir'
  | 'no-shell'
  | 'missing-path'
  | 'bad-hash'
  | 'missing-message'
  | 'missing-branch'
  | 'missing-name'
  // Reading the repository.
  | 'git-denied'
  | 'git-exit'
  | 'no-root'
  | 'no-commits'
  | 'unparsable-commit'
  // Switching branches.
  | 'unknown-branch'
  | 'remote-local-name'
  | 'checkout-denied'
  | 'checkout-dirty'
  | 'checkout-dirty-paths'
  // Creating and deleting branches.
  | 'branch-exists'
  | 'create-denied'
  | 'delete-denied'
  | 'branch-not-merged'
  | 'branch-in-use'
  | 'unknown-remote'
  // Merging one branch into another.
  | 'merge-denied'
  | 'merge-dirty'
  | 'merge-conflict'
  | 'merge-same-branch'
  | 'merge-detached'
  | 'merge-no-commits'
  // Handing off to the remote.
  | 'pull-no-commits'
  | 'push-no-commits'
  | 'pull-detached'
  | 'push-detached'
  | 'pull-no-upstream'
  | 'pull-denied'
  | 'push-denied'
  | 'fetch-denied'
  | 'pull-dirty'
  | 'push-dirty'
  | 'auth'
  | 'auth-helper'
  | 'pull-diverged'
  | 'push-behind'
  | 'push-no-remote'
  | 'push-ambiguous-remote'
  // Committing.
  | 'commit-clean'
  | 'commit-conflict'
  | 'commit-identity'
  | 'commit-denied'
  // Writing a commit message with the default model.
  | 'no-llm'
  | 'no-model'
  | 'model-timeout'
  | 'model-truncated'
  | 'empty-message'

/**
 * One coded refusal, with the values its sentence interpolates.
 *
 * The values are already in their final form — a branch name, a count, a list
 * joined by `, ` — because the page only substitutes them into a template and
 * never reformats them. A sentence with no placeholder takes no `params` at
 * all.
 */
export interface Failure {
  /** The refusal, whose sentence is the page's `error.<code>` entry. */
  readonly code: FailureCode
  /** Values for the sentence's `{name}` placeholders. */
  readonly params?: Readonly<Record<string, string | number>>
}

/** How one path differs from the index or from HEAD, collapsed to one label. */
export type ChangeKind =
  | 'added'
  | 'modified'
  | 'deleted'
  | 'renamed'
  | 'copied'
  | 'typechange'
  | 'untracked'
  | 'conflicted'
  | 'unknown'

/** One path `git status` reported, with both halves of its XY code kept. */
export interface ChangedFile {
  /** Worktree-relative path (the rename's destination when it was renamed). */
  readonly path: string
  /** The rename/copy source, absent for every other kind of change. */
  readonly origPath?: string
  /** The porcelain `X` column: the index's own state against HEAD. */
  readonly index: string
  /** The porcelain `Y` column: the worktree's state against the index. */
  readonly worktree: string
  /** The single label the sidebar shows for this row. */
  readonly kind: ChangeKind
  /** The index differs from HEAD, so this change is staged. */
  readonly staged: boolean
  /** The worktree differs from the index, so this change is unstaged. */
  readonly unstaged: boolean
  /** Git does not track this path yet. */
  readonly untracked: boolean
  /** The path is unmerged. */
  readonly conflicted: boolean
}

/** The commit HEAD points at, when the branch has one. */
export interface HeadInfo {
  readonly hash: string
  readonly short: string
  readonly date: string
  readonly subject: string
}

/** `POST /status`: the repository HEAD, its branch, and every changed path. */
export interface StatusPayload {
  readonly ok: boolean
  /** Raw diagnostic text: Git's own words, or a transport or seam message. */
  readonly error?: string
  /** The coded refusal, which the page words in the active locale. */
  readonly failure?: Failure
  /**
   * Why an `ok: false` answer happened, so the page can tell "this directory is
   * not a repository" (a normal empty state) from a real Git failure.
   */
  readonly reason?: 'no-repo' | 'error'
  /** Absolute path of the repository's top level, once resolved. */
  readonly root?: string
  /** Current branch name; the short hash when HEAD is detached. */
  readonly branch?: string
  /** HEAD is not on a branch. */
  readonly detached?: boolean
  /** The tracked upstream of the current branch, e.g. `origin/main`. */
  readonly upstream?: string
  readonly ahead?: number
  readonly behind?: number
  /** The branch has at least one commit to log and compare against. */
  readonly hasHead?: boolean
  readonly head?: HeadInfo | null
  readonly files?: readonly ChangedFile[]
  /** The owning Workspace, absent when the Host cannot name one. */
  readonly workspace?: WorkspaceInfo
}

/** The DSH Workspace this session belongs to, when the Host can name it. */
export interface WorkspaceInfo {
  /** The Workspace's display title. */
  readonly title: string
  /** The Workspace's canonical directory. */
  readonly path: string
}

/** `POST /branches`: the branches a switch may pick. */
export interface BranchesPayload {
  readonly ok: boolean
  /** Raw diagnostic text: Git's own words, or a transport or seam message. */
  readonly error?: string
  /** The coded refusal, which the page words in the active locale. */
  readonly failure?: Failure
  readonly reason?: 'no-repo' | 'error'
  /** The checked-out branch, or null while HEAD is detached. */
  readonly current?: string | null
  readonly detached?: boolean
  /** Local branch names, most recently committed first. */
  readonly branches?: readonly string[]
  /**
   * Remote-tracking branch names (`origin/main`), most recently committed first
   * and one remote's symbolic `HEAD` left out. Handing one to `POST /checkout`
   * switches to the local branch that tracks it, creating it when it does not
   * exist yet.
   */
  readonly remotes?: readonly string[]
  /** One of the lists was cut at the Host's bound; the page says so. */
  readonly truncated?: boolean
}

/**
 * How safe one branch looks to delete, judged before Git is asked.
 *
 * The marks are `git branch -d`'s own rule restated, so the badge and the answer
 * cannot disagree: Git deletes a branch whose tip is reachable from HEAD or from
 * that branch's own upstream, and refuses every other one. A branch that is
 * neither is one whose commits would be left reachable from nothing but the
 * reflog, which is what every mark but `safe` is saying.
 *
 * `gone` is the loudest of them because it is the easiest to misread: an
 * upstream that no longer exists looks, in a branch list, exactly like a branch
 * that was never pushed.
 */
export type BranchSafety = 'safe' | 'unmerged' | 'unpushed' | 'gone'

/** One branch the delete dialog may offer, with the verdict its mark is drawn from. */
export interface BranchEntry {
  /** The name the page shows: a local name, or `origin/main`. */
  readonly name: string
  readonly kind: 'local' | 'remote'
  /**
   * For a remote-tracking branch, the remote it belongs to and the branch name
   * on that remote. The two are resolved by the Host against the configured
   * remotes rather than by splitting the name, because a local branch may itself
   * be called `origin/main`.
   */
  readonly remote?: string
  readonly branch?: string
  /** Whether HEAD is on this branch, which is the one Git will never delete. */
  readonly current?: boolean
  /** The verdict the badge states. */
  readonly safety: BranchSafety
  /** The upstream this branch tracks, when it tracks one. */
  readonly upstream?: string
  /** How many commits this branch has that its upstream does not. */
  readonly ahead?: number
  /** How many commits its upstream has that this branch does not. */
  readonly behind?: number
}

/**
 * `POST /branch-report`: the branches the delete dialog may offer.
 *
 * A read of its own rather than a second field on `POST /branches`, because the
 * two dialogs ask different questions and only one of them pays for this one:
 * every mark here costs a `--merged` walk over the refs, and the switch dialog
 * opens far more often than the delete dialog does.
 */
export interface BranchReportPayload {
  readonly ok: boolean
  /** Raw diagnostic text: Git's own words, or a transport or seam message. */
  readonly error?: string
  /** The coded refusal, which the page words in the active locale. */
  readonly failure?: Failure
  readonly reason?: 'no-repo' | 'error'
  /** The checked-out branch, or null while HEAD is detached. */
  readonly current?: string | null
  readonly detached?: boolean
  /** Local branches, most recently committed first. */
  readonly locals?: readonly BranchEntry[]
  /** Remote-tracking branches, most recently committed first. */
  readonly remotes?: readonly BranchEntry[]
  /** One of the lists was cut at the Host's bound; the page says so. */
  readonly truncated?: boolean
}

/**
 * `POST /branch-create`: the outcome of starting a branch and switching to it.
 *
 * Shaped like `CheckoutPayload` because that is what it is: the new branch is
 * created and then checked out, so every state that refuses a switch — a
 * detached HEAD is not one of them, an unknown starting point and a working tree
 * in the way are — refuses this too.
 */
export interface CreateBranchPayload {
  readonly ok: boolean
  /** Raw diagnostic text: Git's own words, or a transport or seam message. */
  readonly error?: string
  /** The coded refusal, which the page words in the active locale. */
  readonly failure?: Failure
  readonly reason?: 'no-repo' | 'error' | 'unknown-branch' | 'exists' | 'denied' | 'dirty'
  /** The branch HEAD is on after a successful create, which is the new one. */
  readonly branch?: string
}

/** What became of one branch a delete request named. */
export interface BranchDeletion {
  /** The name as the dialog showed it: a local name, or `origin/main`. */
  readonly name: string
  readonly ok: boolean
  /** Raw diagnostic text: Git's own words, or a transport or seam message. */
  readonly error?: string
  /** The coded refusal, which the page words in the active locale. */
  readonly failure?: Failure
}

/**
 * One branch a delete request names, echoed back as the dialog read it.
 *
 * The page sends the entry it was given rather than a name this half re-derives,
 * because only the page knows which of the two lists the row came from and a
 * local branch may itself be called `origin/main`. The remote and branch pair is
 * carried for a remote-tracking row so the Host never has to split the name
 * again — and so a name it splits cannot differ from the one that was shown.
 */
export interface BranchDeleteTarget {
  /** The name the row showed: a local name, or `origin/main`. */
  readonly name: string
  readonly kind: 'local' | 'remote'
  /** For a remote target, the remote the branch lives on. */
  readonly remote?: string
  /** For a remote target, the branch name on that remote. */
  readonly branch?: string
}

/**
 * `POST /branch-delete`: what became of every branch the request named.
 *
 * One answer for a list of deletions rather than one request each, because the
 * dialog's whole point is that the choice is made once: the branches are deleted
 * one at a time so that each has an outcome of its own, and a refusal on one
 * branch is that branch's result rather than the request's.
 */
export interface DeleteBranchesPayload {
  readonly ok: boolean
  /** Raw diagnostic text: Git's own words, or a transport or seam message. */
  readonly error?: string
  /** The coded refusal, which the page words in the active locale. */
  readonly failure?: Failure
  readonly reason?: 'no-repo' | 'error' | 'denied'
  /** One entry per branch the request named, in the order it named them. */
  readonly results?: readonly BranchDeletion[]
}

/** `POST /checkout`: the outcome of switching the working tree to a branch. */
export interface CheckoutPayload {
  readonly ok: boolean
  /** Raw diagnostic text: Git's own words, or a transport or seam message. */
  readonly error?: string
  /** The coded refusal, which the page words in the active locale. */
  readonly failure?: Failure
  /**
   * Why a switch failed, when the page can act on it: the directory is not a
   * repository, the named branch does not exist, the session may not write, or
   * local changes are in the way.
   */
  readonly reason?: 'no-repo' | 'error' | 'unknown-branch' | 'denied' | 'dirty'
  /** The branch HEAD is on after a successful switch. */
  readonly branch?: string
}

/** `POST /merge`: the outcome of merging one branch into the one HEAD is on. */
export interface MergePayload {
  readonly ok: boolean
  /** Raw diagnostic text: Git's own words, or a transport or seam message. */
  readonly error?: string
  /** The coded refusal, which the page words in the active locale. */
  readonly failure?: Failure
  /**
   * Why the merge did not happen, when the page can act on it: there is no
   * repository, the named branch does not exist, HEAD is detached or unborn, the
   * session may not write, local changes are in the way, or the two sides
   * conflict.
   */
  readonly reason?:
    | 'no-repo'
    | 'error'
    | 'unknown-branch'
    | 'same-branch'
    | 'detached'
    | 'no-commits'
    | 'denied'
    | 'dirty'
    | 'conflict'
  /**
   * The branch the request named, which is the merge's source.
   *
   * The Host echoes it back because the page words its own failure around it:
   * a merge leaves HEAD where it was, so the branch the dialog held is the only
   * trace of what was asked once that dialog has closed.
   */
  readonly branch?: string
  /**
   * The Host's own one-line account of what the merge did, on success.
   *
   * The same register as Git's own output, and the page does not draw it today:
   * a successful merge is reported by the re-read state, and the error dialog is
   * the only place a failed one is worded.
   */
  readonly summary?: string
}

/**
 * `POST /fetch`: the outcome of refreshing every remote-tracking ref.
 *
 * The leanest of the payloads, because a fetch asks the least: it moves no
 * branch, no working tree, and no HEAD, so none of the states that refuse a pull
 * or a push can refuse it. What is left is a repository, a permission to write
 * `.git`, and whatever the remote answered.
 */
export interface FetchPayload {
  readonly ok: boolean
  /** Raw diagnostic text: Git's own words, or a transport or seam message. */
  readonly error?: string
  /** The coded refusal, which the page words in the active locale. */
  readonly failure?: Failure
  /**
   * Why the fetch did not happen, when the page can act on it: there is no
   * repository, the session may not write, or the remote refused the
   * credentials.
   */
  readonly reason?: 'no-repo' | 'error' | 'denied' | 'auth'
}

/** `POST /pull` and `POST /push`: the outcome of one hand-off with the remote. */
export interface SyncPayload {
  readonly ok: boolean
  /** Raw diagnostic text: Git's own words, or a transport or seam message. */
  readonly error?: string
  /** The coded refusal, which the page words in the active locale. */
  readonly failure?: Failure
  /**
   * Why the operation did not happen, when the page can act on it: there is no
   * repository, the session may not write, HEAD is detached, the branch has no
   * upstream (or an ambiguous remote), the two sides diverged, local changes are
   * in the way, or the remote refused the credentials.
   */
  readonly reason?:
    | 'no-repo'
    | 'error'
    | 'denied'
    | 'detached'
    | 'no-upstream'
    | 'no-remote'
    | 'ambiguous-remote'
    | 'diverged'
    | 'dirty'
    | 'auth'
  /** Which operation answered, so a caller can label its own report. */
  readonly action?: 'pull' | 'push'
  /**
   * The Host's own one-line account of what the operation did, on success.
   *
   * It is the Host's report rather than the page's copy — the same register as
   * Git's own output — and the page does not draw it today: a successful
   * operation is reported by the re-read state, and the error dialog is the
   * only place a failed one is worded.
   */
  readonly summary?: string
}

/** One row of the commit history. */
export interface CommitSummary {
  readonly hash: string
  readonly short: string
  readonly author: string
  readonly email: string
  /** Author date, ISO-8601 with the author's own offset. */
  readonly date: string
  readonly subject: string
  /** Branch and tag decorations pointing at this commit (`%D`). */
  readonly refs: readonly string[]
  /** Parent hashes; more than one makes this a merge commit. */
  readonly parents: readonly string[]
}

/** `POST /log`: the newest commits of the current branch. */
export interface LogPayload {
  readonly ok: boolean
  /** Raw diagnostic text: Git's own words, or a transport or seam message. */
  readonly error?: string
  /** The coded refusal, which the page words in the active locale. */
  readonly failure?: Failure
  readonly reason?: 'no-repo' | 'error'
  readonly commits?: readonly CommitSummary[]
  /** The repository has no commits yet, so the history is legitimately empty. */
  readonly empty?: boolean
}

/** `POST /diff`: one path's patch against HEAD. */
export interface DiffPayload {
  readonly ok: boolean
  /** Raw diagnostic text: Git's own words, or a transport or seam message. */
  readonly error?: string
  /** The coded refusal, which the page words in the active locale. */
  readonly failure?: Failure
  readonly reason?: 'no-repo' | 'error'
  /** The path this patch answers for, echoed back for the page's own checks. */
  readonly path?: string
  /** Unified diff text; empty when the path has no textual difference. */
  readonly patch?: string
  /** The patch was cut at the Host's output bound; the page says so. */
  readonly truncated?: boolean
  /** Git reported a binary difference, so there are no lines to render. */
  readonly binary?: boolean
}

/** `POST /commit`: one commit's message plus its whole patch. */
export interface CommitPayload {
  readonly ok: boolean
  /** Raw diagnostic text: Git's own words, or a transport or seam message. */
  readonly error?: string
  /** The coded refusal, which the page words in the active locale. */
  readonly failure?: Failure
  readonly reason?: 'no-repo' | 'error'
  readonly commit?: CommitSummary & { readonly body: string }
  /** Unified diff of the commit against its first parent. */
  readonly patch?: string
  readonly truncated?: boolean
  /** The commit is a merge, whose combined diff Git prints only on request. */
  readonly merge?: boolean
}

/**
 * `POST /commit-all`: one commit made out of every change the working tree has.
 *
 * The page asks for this in one request because staging and committing are one
 * decision here: the tab lists changes and commits all of them, so an index left
 * half-staged between two answers would be a state nothing on the page could
 * name or undo.
 */
export interface CommitAllPayload {
  readonly ok: boolean
  /** Raw diagnostic text: Git's own words, or a transport or seam message. */
  readonly error?: string
  /** The coded refusal, which the page words in the active locale. */
  readonly failure?: Failure
  /**
   * Why no commit was made, when the page can act on it: there is no repository,
   * the session may not write, there was nothing to commit, or the tree still
   * holds an unresolved conflict — which `git add -A` would otherwise stage,
   * markers and all.
   */
  readonly reason?: 'no-repo' | 'error' | 'denied' | 'clean' | 'conflict'
  /** The commit that was just created, once it succeeded. */
  readonly commit?: CommitSummary
}

/**
 * `POST /message`: one commit message the Workspace's model wrote for the
 * pending changes.
 *
 * The request says only which session is asking: *what* the model is shown —
 * the changed paths, the tracked patch, and the untracked files a patch against
 * HEAD cannot reach — is the Host's own read of the repository, exactly as every
 * other route resolves its own subject. Which model and prompt write it are the
 * Host's reads too: the Workspace's Settings choices when it has them, and DSH's
 * current default selection and the built-in prompt otherwise. So the page
 * cannot aim the call at a model the Workspace did not choose, and the model only
 * ever describes the tree Git reported.
 *
 * `message` is the model's own words and therefore carries no code, the same way
 * Git's diagnosis does not: it is another program's text, except that here it is
 * the answer rather than a refusal. The refusals this route words itself are the
 * ones the page can act on — there is nothing to describe, there is no model to
 * describe it with, or the model answered with nothing usable.
 */
export interface MessagePayload {
  readonly ok: boolean
  /** Raw diagnostic text: the model adapter's own failure, or a seam message. */
  readonly error?: string
  /** The coded refusal, which the page words in the active locale. */
  readonly failure?: Failure
  /**
   * Why no message was written, when the page can act on it: there is no
   * repository, the model is missing, unconfigured, or timed out, it answered
   * with nothing, or the working tree holds nothing to describe.
   */
  readonly reason?: 'no-repo' | 'error' | 'clean'
  /** The message the form takes: a subject, and a body when one is needed. */
  readonly message?: string
  /**
   * What the model's own pre-commit check flagged in these changes — a temp file,
   * an oversized file, or something that looks like a credential.
   *
   * The message is written either way; these are the lines worth reading before
   * the commit is made, and the page states them beside the form rather than
   * inside it, because a warning is not part of a commit message.
   */
  readonly warnings?: readonly string[]
}

/**
 * One model route the Settings dialog may write commit messages with.
 *
 * The identifiers are the ones `llm.stream` takes, and the optional effort is
 * the adapter-owned level a saved route may carry. The dialog's picker sets the
 * effort per model from the adapter's own list (see `ModelEffortsPayload`); a
 * route without one leaves the level to the adapter's default.
 */
export interface MessageModel {
  /** Registered provider route. */
  readonly provider: string
  /** Provider-owned model id. */
  readonly model: string
  /** Adapter-owned reasoning effort, when the route carries one. */
  readonly reasoningEffort?: string
}

/** One model row inside a provider group of the Settings picker. */
export interface MessageModelOption {
  /** Provider-owned model id, as `llm.stream` takes it. */
  readonly id: string
  /** Human-readable model name for the picker. */
  readonly name: string
}

/**
 * One provider's models, in the adapter's own catalog order.
 *
 * Grouping survives the wire even though the picker draws a flat list: the
 * provider's display name is what a reader recognizes, and a provider whose
 * catalog could not be read is left out rather than failing the whole answer.
 */
export interface MessageModelGroup {
  /** Registered provider route. */
  readonly provider: string
  /** Human-readable provider name. */
  readonly name: string
  readonly models: readonly MessageModelOption[]
}

/**
 * `POST /model-efforts`: the reasoning efforts one model route offers.
 *
 * Read per model rather than shipped with the catalog: an adapter resolves
 * effort metadata one route at a time, and the picker only needs a row's list
 * while that row's effort control is open. The ids come in the adapter's own
 * order and are exactly what a saved route may name. An empty list is a real
 * answer — the model offers no selectable level, so its default applies.
 */
export interface ModelEffortsPayload {
  readonly ok: boolean
  /** Raw diagnostic text: a transport or seam message. */
  readonly error?: string
  /** The adapter's effort ids, in its own order. */
  readonly efforts?: readonly string[]
}

/**
 * `POST /settings`: what one Workspace has chosen for generated messages.
 *
 * `model` and `prompt` are the Workspace's overrides and are `null` when the
 * deployment's defaults are in use. `defaultModel` and `defaultPrompt` are the
 * same defaults restated for the dialog, so the picker can say which model the
 * default currently means and the prompt field can open on the built-in text.
 *
 * The default model is DSH's current default selection — the model the user
 * last chose in a session — and never a copy this plugin keeps: the Host reads
 * it per request, exactly as every chat request does.
 */
export interface SettingsPayload {
  readonly ok: boolean
  /** Raw diagnostic text: a transport or seam message. */
  readonly error?: string
  /** The coded refusal, which the page words in the active locale. */
  readonly failure?: Failure
  readonly reason?: 'no-repo' | 'error'
  /** The Workspace the choices belong to, when the Host can name it. */
  readonly workspace?: WorkspaceInfo
  /** The saved model override, or null while the default model is in use. */
  readonly model?: MessageModel | null
  /** The saved prompt override, or null while the built-in prompt is in use. */
  readonly prompt?: string | null
  /** The deployment's current default selection, or null when it names none. */
  readonly defaultModel?: MessageModel | null
  /** The built-in system prompt, always present on a successful read. */
  readonly defaultPrompt?: string
  /** Every model the dialog may pick, grouped by provider. */
  readonly groups?: readonly MessageModelGroup[]
}

/**
 * Longest custom message prompt the Settings route accepts.
 *
 * The bound is the wire contract's rather than either half's: the page stops the
 * field at the same value so a paste cannot turn Save into a refusal, and the
 * Host refuses anything longer rather than writing an unbounded file.
 */
export const MAX_PROMPT_LENGTH = 20_000

/** `POST /settings-save`: the outcome of storing one Workspace's choices. */
export interface SaveSettingsPayload {
  readonly ok: boolean
  /** Raw diagnostic text: a transport or seam message. */
  readonly error?: string
  /** The coded refusal, which the page words in the active locale. */
  readonly failure?: Failure
  readonly reason?: 'no-repo' | 'error'
}

/** Porcelain `XY` pairs Git uses for an unmerged path. */
const CONFLICT_PAIRS: ReadonlySet<string> = new Set([
  'DD', 'AU', 'UD', 'UA', 'DU', 'AA', 'UU',
])

/**
 * Collapse one porcelain `XY` pair into the single label the sidebar shows.
 *
 * The worktree column wins when it says anything: a path staged as added and
 * then deleted in the worktree is, to the person reading the row, deleted. The
 * index column is consulted only when the worktree is clean against it.
 *
 * @param index - porcelain `X`, the index's state against HEAD.
 * @param worktree - porcelain `Y`, the worktree's state against the index.
 * @returns the row's label.
 */
export function classifyChange(index: string, worktree: string): ChangeKind {
  if (index === '?' || worktree === '?') return 'untracked'
  if (CONFLICT_PAIRS.has(`${index}${worktree}`)) return 'conflicted'
  const worktreeKind = kindOf(worktree)
  if (worktreeKind !== undefined) return worktreeKind
  return kindOf(index) ?? 'unknown'
}

/**
 * Map one porcelain status character to its label.
 *
 * @param code - one character of the `XY` pair.
 * @returns the label, or undefined for a space (no change on that side).
 */
function kindOf(code: string): ChangeKind | undefined {
  switch (code) {
    case 'A': return 'added'
    case 'M': return 'modified'
    case 'D': return 'deleted'
    case 'R': return 'renamed'
    case 'C': return 'copied'
    case 'T': return 'typechange'
    default: return undefined
  }
}
