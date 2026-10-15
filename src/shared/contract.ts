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
  // Reading the repository.
  | 'git-denied'
  | 'git-exit'
  | 'no-root'
  | 'no-commits'
  | 'unparsable-commit'
  // Switching branches.
  | 'invalid-branch'
  | 'unknown-branch'
  | 'remote-local-name'
  | 'checkout-denied'
  | 'checkout-dirty'
  | 'checkout-dirty-paths'
  // Handing off to the remote.
  | 'pull-no-commits'
  | 'push-no-commits'
  | 'pull-detached'
  | 'push-detached'
  | 'pull-no-upstream'
  | 'pull-denied'
  | 'push-denied'
  | 'pull-dirty'
  | 'push-dirty'
  | 'auth'
  | 'pull-diverged'
  | 'push-behind'
  | 'push-no-remote'
  | 'push-ambiguous-remote'
  // Committing.
  | 'commit-clean'
  | 'commit-conflict'
  | 'commit-denied'

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
