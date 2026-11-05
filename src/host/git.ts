/**
 * The Host half's Git reader, and its writers.
 *
 * Every fact about the repository is produced by running the real `git` binary —
 * never by reading `.git` by hand. That keeps this plugin honest about the things
 * Git is authoritative for (the index, renames, merge state, `core.*`
 * configuration, `.gitignore`).
 *
 * Git runs as an argv on the Host's `subprocess` service: no shell, no
 * interpreter, and no sandbox between this module and the process. That is a
 * deliberate trade — Git runs with the Host's own rights, so the session's file
 * policy does not apply to it — made because a sandboxed invocation costs most of
 * a second on Windows, while every path a command carries comes from Git's own
 * output and every command runs inside the repository `routes.ts` resolved.
 *
 * Reading is the bulk of this module. The writes are the branch switch, the
 * merge, the fetch, the merge pull, the push, and the commit — each of which
 * reports Git's own refusal — plus the conflict resolver's own three: the index
 * write that stages a resolved path, the byte-level rewrite of one file's
 * conflict blocks, and the merge commit that records them once none is left.
 * The commit is the one that writes the index as well as the history, which is
 * why it is a single call rather than a stage the page could leave half-finished.
 *
 * The resolver is the one place this module writes a working-tree file itself
 * (see `resolveRegions`): nothing in Git's interface replaces one conflict block
 * with one side, so the file is spliced, and the parser that finds the blocks
 * lives in `conflict.ts` where it can be read on its own.
 *
 * Three properties of the invocation matter and are easy to lose:
 *
 *   - `--no-pager` on every command: without it a pager would hold the pipe open
 *     and the command would sit there until its timeout.
 *   - `GIT_OPTIONAL_LOCKS=0`: `git status` otherwise refreshes the index, which
 *     is a write, and taking a lock it does not need would fight the agent's own
 *     `git` calls in the same repository.
 *   - `-c core.quotePath=false`: Git otherwise C-quotes any path holding a
 *     non-ASCII byte (`"\346\226\207.md"`), and those paths then cannot be
 *     matched back to the ones `status` reported.
 *
 * Process output is parsed here rather than in the browser: the browser half has
 * no Node context, and parsing next to the command keeps the JSON contract in
 * `shared/contract.ts` the only thing the two halves must agree on.
 */

import { existsSync } from 'node:fs'
import { lstat, readFile, unlink, writeFile } from 'node:fs/promises'
import { join, isAbsolute, relative, resolve } from 'node:path'

import {
  classifyChange,
  type BranchDeleteTarget,
  type BranchDeletion,
  type BranchEntry,
  type BranchReportPayload,
  type BranchSafety,
  type BranchesPayload,
  type ChangedFile,
  type CheckoutPayload,
  type CommitAllPayload,
  type CommitPayload,
  type CommitScope,
  type CommitSummary,
  type ConflictOperation,
  type ConflictPayload,
  type ConflictStages,
  type CreateBranchPayload,
  type DeleteBranchesPayload,
  type DiffPayload,
  type DiffSide,
  type FailureCode,
  type FetchPayload,
  type FetchUpstreamPayload,
  type IndexPayload,
  type LogPayload,
  type MergePayload,
  type OperationPayload,
  type ResolveChoice,
  type ResolveDonePayload,
  type ResolvePayload,
  type StatusPayload,
  type SyncPayload,
  type UndoCommitPayload,
} from '../shared/contract.js'
import { errorMessage } from '../shared/error.js'
import {
  applyResolutions,
  describeConflict,
  parseConflict,
  type Resolution,
} from './conflict.js'
import { coded, type Refusal } from './refusal.js'

/** Wall-clock bound per Git invocation; a hung command is killed, not waited on. */
const GIT_TIMEOUT_MS = 20_000

/**
 * The exit code Git uses for its own fatal refusals.
 *
 * `git rev-parse --show-toplevel` outside a repository is one of them, and it is
 * the answer `resolveRepo` reads as "this directory has no repository". A
 * command that never reached Git — no `git` on `PATH` — fails to spawn at all,
 * so an exit code is always Git's own answer here.
 */
const GIT_FATAL_EXIT = 128

/**
 * What Git prints when the directory has no repository at all.
 *
 * The text is also needed on Windows: a PowerShell 5.1 executor reports every
 * failed native command as exit 1 (`$LASTEXITCODE` is not propagated; PowerShell
 * 7 does), so the code alone cannot tell Git's fatal answer from a shell that
 * never ran Git there.
 */
const NOT_A_REPO = /not a git repository/i

/**
 * Wall-clock bound for the two invocations that cross the network.
 *
 * A fetch or a push legitimately takes longer than a local read —a slow remote
 * or a large pack is not a hung command —so the local bound would kill a
 * transfer that was still making progress.
 */
const GIT_NETWORK_TIMEOUT_MS = 180_000

/** Largest patch the Host collects; beyond this the answer is flagged truncated. */
const MAX_STDOUT_BYTES = 4 * 1024 * 1024

/** Commits returned when the caller names no limit. */
export const DEFAULT_LOG_LIMIT = 60

/** Upper bound on commits per request, so one call cannot walk a whole history. */
const MAX_LOG_LIMIT = 300

/**
 * Upper bound on branches returned, so a huge ref list cannot flood the menu.
 *
 * Exported because the delete route caps a request at the same number: a
 * selection can never name more branches than the list it was drawn from.
 */
export const MAX_BRANCHES = 200

/**
 * What Git prints when it refuses to touch a working tree that is not clean.
 *
 * `checkout`, `pull` and `push` each word the refusal their own way, and the page
 * has one sentence per action for it, so the three spellings are one pattern.
 */
const DIRTY_WORKTREE = /local changes|would be overwritten|commit your changes or stash/i

/**
 * What Git prints when a switch cannot run because another operation is mid-flight.
 *
 * A merge, a rebase, or a cherry-pick has the index in a state no checkout may
 * disturb, and Git refuses with its own advice rather than with the local-changes
 * wording above. The reader's answer is the same either way — finish or abandon
 * what is in flight — so it is read as the same refusal.
 */
const UNFINISHED_OPERATION = /you need to resolve your current index|cannot switch branch|You are in the middle of/i

/**
 * What Git prints when a merge could not be applied cleanly.
 *
 * A conflict is a state on disk rather than a mistake in the request, and it is
 * the one merge answer the page words itself: the merge stays in the tree (see
 * `mergeBranch`), so the sentence has to say that the conflicts are waiting to
 * be resolved rather than that nothing happened. `git merge` prints one
 * `CONFLICT` line per path and then a summary sentence; the summary alone is
 * enough to recognize it.
 */
const MERGE_CONFLICT = /CONFLICT|Automatic merge failed|fix conflicts/i

/**
 * What an older Git prints when it has no `switch` subcommand.
 *
 * `git switch` arrived in 2.23, and the same intent is spelled `checkout` on
 * anything older; the retry is what keeps those installations working.
 */
const NO_SWITCH = /switch.*(?:is not a git command|unknown)|unknown (?:option|subcommand)/i

/**
 * What Git prints when it has no author or committer identity to record.
 *
 * Modern Git refuses to guess one from the account and host name, so every
 * commit fails until `user.name` and `user.email` are configured. The first
 * line alone says only "Author identity unknown", which is why the page words
 * this state itself instead of passing that sentence through.
 */
const MISSING_IDENTITY =
  /Author identity unknown|Committer identity unknown|Please tell me who you are|unable to auto-detect email address/i

/**
 * What Git prints when the remote refused the credentials this machine holds.
 *
 * Each transport words it differently —HTTPS asks for a username a
 * non-interactive session cannot supply, SSH names the key it could not use —?
 * and every one of them is the same authentication failure to the page, which
 * never prompts for credentials of its own.
 */
const AUTH_FAILURE = new RegExp(
  [
    'could not read Username',
    'Authentication failed',
    'Permission denied \\(publickey\\)',
    'no such identity',
    'terminal prompts disabled',
  ].join('|'),
  'i',
)

/**
 * What Git prints when the branch being created is already there.
 *
 * The name is checked before Git is asked, so this is the race the check cannot
 * close rather than the ordinary answer; it is worded anyway, because a race
 * that surfaces `fatal:` in a dialog that had a sentence ready is the kind of
 * gap this half exists to avoid.
 */
const BRANCH_EXISTS = /already exists/i

/**
 * What Git prints when it will not delete a branch for want of a merge.
 *
 * This is the one refusal the delete dialog's marks predict, so it is the one
 * the page words itself: Git's own sentence ends in a `-D` hint, and this plugin
 * has no force to offer —restating it is what keeps the page from advertising a
 * command it will not run.
 */
const BRANCH_NOT_MERGED = /not fully merged/i

/**
 * What Git prints when a worktree is standing on the branch being deleted.
 *
 * The current branch and a branch checked out in another worktree are the same
 * answer from Git and the same fact to the reader: this branch is in use. The
 * page tells them apart by which row it disabled, not by which sentence it got.
 */
const BRANCH_IN_USE = /used by worktree|cannot delete branch/i

/**
 * What Git prints when the ref a delete named is not on the remote.
 *
 * A branch someone else already deleted is the ordinary reason a delete fails
 * after a fetch: the dialog was drawn from a list that was true when it opened.
 */
const REMOTE_REF_MISSING = /remote ref does not exist|unable to delete/i

/** Field separator inside one formatted record; `%x1f` is expanded by Git. */
const FIELD = '\x1f'
/** Separator that ends the commit-detail header block; `%x1e` is Git-expanded. */
const RECORD = '\x1e'

/** The status header's `HEAD` line: hash, short hash, author date, subject. */
const HEAD_FIELDS = ['%H', '%h', '%aI', '%s'] as const

/** `HEAD` short form for the status header. */
const HEAD_FORMAT = HEAD_FIELDS.join('%x1f')

/**
 * One commit summary, in the order {@link parseSummary} destructures it; `%D`
 * carries the ref decorations and `%P` the parents.
 */
const SUMMARY_FIELDS = ['%H', '%h', '%an', '%ae', '%aI', '%P', '%D', '%s'] as const

/** One commit summary per record, for `log`. */
const LOG_FORMAT = SUMMARY_FIELDS.join('%x1f')

/** Where the message body sits in a detail record: after every summary field. */
const BODY_FIELD = SUMMARY_FIELDS.length

/** Commit detail: the summary fields plus the message body. */
const DETAIL_FORMAT = `${LOG_FORMAT}%x1f%b%x1e`

/**
 * The status invocation both the sidebar and the message generator start from.
 *
 * `--branch` adds the `## ...` header as the first NUL-terminated record, and
 * `--untracked-files=all` names every untracked file rather than collapsing each
 * directory of them into one row. The digest ignores the header; it reads the
 * same command so the two views of the tree cannot disagree.
 */
const STATUS_ARGS = ['status', '--porcelain=v1', '-z', '--branch', '--untracked-files=all'] as const

/**
 * The same read for the write routes, without the branch header.
 *
 * The folder and commit writers read the changed paths and nothing about the
 * branch, so the record `--branch` adds would only be parsed and dropped.
 */
const STATUS_PATH_ARGS = ['status', '--porcelain=v1', '-z', '--untracked-files=all'] as const

/** One Git invocation's outcome, resolved rather than thrown. */
interface GitRun {
  /** The process exit code, or null when it was killed by a signal. */
  readonly code: number | null
  readonly stdout: string
  readonly stderr: string
  /** The collected stdout hit the Host's bound; the text is incomplete. */
  readonly truncated: boolean
  /** Infrastructure failure (missing service, spawn error) —not a Git failure. */
  readonly failure?: string
}

/** A resolved repository, or the reason it cannot be used. */
type RepoResolution =
  | { readonly root: string; readonly hasHead: boolean }
  | { readonly refusal: Refusal; readonly reason: 'no-repo' | 'error' }

/**
 * Everything one request needs to run Git: the process substrate and the
 * directory it runs in.
 *
 * Git is spawned as an argv on `subprocess` —never through `ctx.shell` —so no
 * sandbox, interpreter, or shell quoting sits between this module and the
 * process. That also means the session's file policy does not apply here: Git
 * runs with the Host's own rights, inside the repository this module resolved,
 * with every path taken from Git's own output.
 */
export interface GitTarget {
  /** The `subprocess` capability service. */
  readonly subprocess: any
  /** The directory the command runs in. */
  readonly workdir: string
}

/**
 * The same target aimed at another directory.
 *
 * @param target - the request's target.
 * @param workdir - the directory the next command runs in.
 * @returns a target that differs only in its directory.
 */
function inDir(target: GitTarget, workdir: string): GitTarget {
  return { ...target, workdir }
}

/**
 * A path as a pathspec that cannot be read as a pattern.
 *
 * Git pathspecs treat `*`, `?`, and `[` as wildcards, so a path that really
 * contains one —a file named `a*.txt` —would otherwise name every file the
 * pattern matches. `:(literal)` turns the rest of the word into a literal path,
 * which is the only reading a path from `git status` should ever get: it is a
 * name, not a pattern the page composed.
 *
 * @param path - the repository-relative path as `status` reported it.
 * @returns the literal pathspec for it.
 */
function literalPath(path: string): string {
  return `:(literal)${path}`
}

/** How one invocation is bounded and fed, beyond its argv. */
interface InvocationOptions {
  readonly timeoutMs?: number
  readonly stdin?: string
  /** Extra environment on top of the Git defaults. */
  readonly env?: Readonly<Record<string, string>>
}

/**
 * How long a killed Git process may take to settle before its result is read as
 * killed. The substrate performs the same graceful-then-forced escalation, so a
 * Git process that ignores the first signal still cannot hold a route open.
 */
const GRACE_MS = 2_000

/**
 * Environment every invocation runs with.
 *
 * `GIT_OPTIONAL_LOCKS` keeps read-only commands from rewriting `.git/index`
 * behind an `index.lock`, so a `status` or `diff` this plugin runs can never
 * fail an Agent's own `git add` that happens to overlap it. `GIT_TERMINAL_PROMPT`
 * turns a credential prompt into a failed fetch instead of a hung process, since
 * nothing here can answer one. The colour and pager pins keep the parsed output
 * free of escape sequences and make a `PAGER` inherited from the environment
 * irrelevant. `TERM` is a POSIX concept: Windows does not read it.
 */
const GIT_ENV: Readonly<Record<string, string>> = {
  NO_COLOR: '1',
  PAGER: 'cat',
  GIT_PAGER: 'cat',
  GIT_OPTIONAL_LOCKS: '0',
  GIT_TERMINAL_PROMPT: '0',
  ...(process.platform === 'win32' ? {} : { TERM: 'dumb' }),
}

/** Largest stderr the direct path retains; a diagnosis is one short line. */
const MAX_STDERR_BYTES = 64 * 1024

/** Largest spill file one direct stream may leave behind, when truncated. */
const MAX_SPILL_BYTES = 8 * 1024 * 1024

/**
 * Read one collected stream without letting a provider fault escape.
 *
 * The seam's readers answer `readFrom(0)` for the whole collected stream, and a
 * provider that cannot produce it must read as "no output" rather than as a
 * rejected route: the command itself may already have succeeded.
 *
 * @param reader - the collected reader, as the substrate exposed it.
 * @returns the stream's text and whether it was truncated.
 */
function collectedText(reader: any): { text: string; lossy: boolean } {
  try {
    const read = typeof reader?.readFrom === 'function' ? reader.readFrom(0) : undefined
    return { text: typeof read?.text === 'string' ? read.text : '', lossy: read?.lossy === true }
  } catch {
    return { text: '', lossy: false }
  }
}

/**
 * Run one argv on the request's process substrate and collect its result.
 *
 * There is exactly one way to run Git: spawn it as an argv. No shell parses the
 * line, no sandbox wraps the process, and no interpreter sits in front of the
 * executable —which is what makes a command cost a few tens of milliseconds
 * rather than most of a second on Windows.
 *
 * @param target - the substrate and the directory.
 * @param words - the executable and its arguments.
 * @param options - the bound, standard input, and environment for it.
 * @returns the invocation's outcome; never rejects.
 */
async function invoke(
  target: GitTarget,
  words: readonly string[],
  options: InvocationOptions = {},
): Promise<GitRun> {
  const subprocess = target.subprocess
  if (subprocess === undefined || typeof subprocess.spawn !== 'function') {
    return failureRun('the subprocess service is unavailable, so Git cannot run')
  }

  let handle: any
  try {
    handle = subprocess.spawn({
      argv: [...words],
      cwd: target.workdir,
      stdio: {
        stdin: options.stdin === undefined ? 'ignore' : { data: options.stdin },
        stdout: { maxBytes: MAX_STDOUT_BYTES, spill: { maxBytes: MAX_SPILL_BYTES } },
        stderr: { maxBytes: MAX_STDERR_BYTES, spill: { maxBytes: MAX_SPILL_BYTES } },
      },
      graceMs: GRACE_MS,
      env: { ...GIT_ENV, ...options.env },
    })
  } catch (error) {
    // No process was created, so nothing ran and nothing was written.
    return failureRun(errorMessage(error))
  }

  const readers = handle?.collected
  if (typeof handle?.done?.then !== 'function' || readers === undefined) {
    try { handle?.terminate?.() } catch { /* the range is already gone */ }
    return failureRun('the subprocess service returned no readable process handle')
  }

  const timeoutMs = options.timeoutMs ?? GIT_TIMEOUT_MS
  let timedOut = false
  const timer = setTimeout(() => {
    timedOut = true
    try { handle.terminate() } catch { /* the range is already gone */ }
  }, Math.max(1, timeoutMs))

  try {
    const outcome = await handle.done
    const stdout = collectedText(readers.stdout)
    const stderr = collectedText(readers.stderr)
    return {
      code: typeof outcome?.exitCode === 'number' ? outcome.exitCode : null,
      stdout: stdout.text,
      stderr: stderr.text,
      truncated: stdout.lossy,
    }
  } catch (error) {
    // A rejection after this call's own deadline is the kill it asked for, not
    // a provider failure; its collected output is still the answer to report.
    if (timedOut) {
      const stdout = collectedText(readers.stdout)
      const stderr = collectedText(readers.stderr)
      return { code: null, stdout: stdout.text, stderr: stderr.text, truncated: stdout.lossy }
    }
    return failureRun(errorMessage(error))
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Run one Git command and collect its result.
 *
 * The outcome is returned as it came back rather than judged here: which exit
 * codes are a normal answer differs per command, and every caller reads them
 * itself.
 *
 * @param target - the substrate and the directory.
 * @param args - subcommand and arguments.
 * @param options - the bound, standard input, and environment for it.
 * @returns the invocation's outcome; never rejects.
 */
async function runGit(
  target: GitTarget,
  args: readonly string[],
  options: InvocationOptions = {},
): Promise<GitRun> {
  return invoke(target, ['git', '--no-pager', '-c', 'core.quotePath=false', ...args], options)
}

/** An outcome that never reached Git, so the caller reports it as infrastructure. */
function failureRun(error: string): GitRun {
  return { code: null, stdout: '', stderr: '', truncated: false, failure: error }
}

/**
 * Git's own diagnosis of a failed command, as one block of text.
 *
 * Git reports a refusal on stderr and leaves stdout for the case where it has
 * nothing to say there —a `pull` that refuses a divergence prints its advice on
 * stdout —so the two are read in that order.
 *
 * @param run - the failed invocation.
 * @returns the trimmed diagnosis; empty when the command said nothing at all.
 */
function diagnosticText(run: GitRun): string {
  const stderr = run.stderr.trim()
  return stderr === '' ? run.stdout.trim() : stderr
}

/**
 * The one-line refusal a failed command amounts to, for the page to render.
 *
 * Git writes its diagnosis to stderr; only a command that said nothing at all is
 * coded, because every other refusal is Git's own first line, which is more
 * specific than anything this half could invent and cannot be translated.
 *
 * @param run - the failed invocation.
 * @returns the coded refusal, or the text Git printed.
 */
function refusalOf(run: GitRun): Refusal {
  const text = diagnosticText(run)
  if (text === '') return coded('git-exit', { code: run.code ?? 'null' })
  return { error: text.split('\n')[0] ?? text }
}

/**
 * The refusal a credential problem amounts to, when the diagnosis is one.
 *
 * Every route that can cross the network shares this, because Git words the same
 * failure for a fetch, a pull, a push, and a remote delete.
 *
 * @param text - Git's own diagnosis of the failed invocation.
 * @returns the coded refusal, or null when the failure is not about credentials.
 */
function authRefusal(text: string): Refusal | null {
  if (AUTH_FAILURE.test(text)) return coded('auth')
  return null
}

/**
 * Resolve the repository that owns `workdir` and whether it has any commit.
 *
 * `--show-toplevel` is what makes the rest of the module simple: every later
 * path is relative to a root Git itself named, not to a directory this plugin
 * guessed, and a directory with no repository is answered as such instead of
 * surfacing `fatal: not a git repository` as an error.
 *
 * @param target - the substrate and the session's directory.
 * @returns the root and HEAD state, or the reason it cannot be used.
 */
async function resolveRepo(target: GitTarget): Promise<RepoResolution> {
  const top = await runGit(target, ['rev-parse', '--show-toplevel'])
  if (top.failure !== undefined) return { refusal: { error: top.failure }, reason: 'error' }
  if (top.code !== 0) {
    // Git's own "no repository here" answer. Any other nonzero exit is a
    // failure to state as such: reporting every one of them as an empty
    // directory is how a broken shell read as a directory holding no
    // repository.
    const noRepo = top.code === GIT_FATAL_EXIT || NOT_A_REPO.test(diagnosticText(top))
    return { refusal: refusalOf(top), reason: noRepo ? 'no-repo' : 'error' }
  }
  const root = top.stdout.trim()
  if (root === '') return { refusal: coded('no-root'), reason: 'no-repo' }

  // `--quiet` keeps an unborn branch from writing "fatal: Needed a single
  // revision" to stderr, and exit code 1 is then a normal "no commits yet".
  const head = await runGit(inDir(target, root), ['rev-parse', '--verify', '--quiet', 'HEAD'])
  return { root, hasHead: head.code === 0 }
}

/** The repository root one request answers for, or why there is none. */
export type RepositoryRoot =
  | { readonly root: string }
  | { readonly refusal: Refusal; readonly reason: 'no-repo' | 'error' }

/**
 * Resolve the repository root alone, without reading its status or history.
 *
 * The Settings routes need the repository's identity and nothing else: the
 * Workspace key is a directory, and a settings dialog that paid for a full
 * `git status` just to learn where it is would be slower than the request it
 * is about to make. This is the same `rev-parse` every other route starts
 * with, so the root it names is the same root they use.
 *
 * @param target - the process substrate and the session's directory.
 * @returns the root, or the coded refusal and its reason.
 */
export async function readRepositoryRoot(target: GitTarget): Promise<RepositoryRoot> {
  const repo = await resolveRepo(target)
  if ('refusal' in repo) return { refusal: repo.refusal, reason: repo.reason }
  return { root: repo.root }
}

/**
 * Read the current branch, its upstream, and every changed path.
 *
 * @param target - the process substrate and the session's directory.
 * @returns the status payload the page renders its sidebar from.
 */
export async function readStatus(target: GitTarget): Promise<StatusPayload> {
  const repo = await resolveRepo(target)
  if ('refusal' in repo) return { ok: false, ...repo.refusal, reason: repo.reason }

  const root = inDir(target, repo.root)
  // The three reads answer different questions and none depends on the others,
  // so they are asked at once: on a host where a Git invocation means starting
  // a whole process, the page load is then the slower of the three rather than
  // their sum.
  const [status, log, operation] = await Promise.all([
    runGit(root, STATUS_ARGS),
    repo.hasHead ? runGit(root, ['log', '-1', `--pretty=format:${HEAD_FORMAT}`]) : Promise.resolve(undefined),
    readOperation(root),
  ])
  if (status.code !== 0) return { ok: false, ...refusalOf(status), reason: 'error' }

  const parsed = parseStatus(status.stdout)

  let head: StatusPayload['head'] = null
  if (log !== undefined && log.code === 0) {
    const [hash = '', short = '', date = '', subject = ''] = log.stdout.split(FIELD)
    head = { hash, short, date, subject }
  }

  // A merge already has the words it will commit under, and the page's form is
  // where a reader looks for them: it is prefilled from here rather than from a
  // sentence about the merge being in progress.
  const mergeMessage = operation === 'merge' ? await readMergeMessage(root) : undefined

  return {
    ok: true,
    root: repo.root,
    branch: parsed.branch,
    detached: parsed.detached,
    upstream: parsed.upstream,
    ahead: parsed.ahead,
    behind: parsed.behind,
    hasHead: repo.hasHead,
    head,
    files: parsed.files,
    ...(operation === undefined ? {} : { operation }),
    ...(mergeMessage === undefined ? {} : { mergeMessage }),
  }
}

/**
 * Which multi-step operation the repository is in the middle of, if any.
 *
 * Git records each one as a file (or directory) in its own directory, and names
 * the path itself through `--git-path`, which is what makes the read correct in
 * a worktree or a submodule where `.git` is a file rather than a directory. One
 * invocation asks for all four because they are one question — the page has one
 * banner, not four — and the answer is whichever marker exists.
 *
 * A rebase has two spellings: the interactive/merge backend keeps a directory
 * (`rebase-merge`) and the older apply backend keeps another (`rebase-apply`).
 * Both mean the same thing to the page.
 *
 * @param root - the repository root and the process substrate.
 * @returns the operation, or undefined when the repository is at rest.
 */
async function readOperation(root: GitTarget): Promise<ConflictOperation | undefined> {
  const paths = await runGit(root, [
    'rev-parse',
    '--git-path', 'MERGE_HEAD',
    '--git-path', 'rebase-merge',
    '--git-path', 'rebase-apply',
    '--git-path', 'CHERRY_PICK_HEAD',
  ])
  if (paths.code !== 0) return undefined

  const [merge, rebaseMerge, rebaseApply, cherryPick] = paths.stdout.split('\n')
  if (markerExists(root, merge)) return 'merge'
  if (markerExists(root, rebaseMerge) || markerExists(root, rebaseApply)) return 'rebase'
  if (markerExists(root, cherryPick)) return 'cherry-pick'
  return undefined
}

/**
 * Whether one `--git-path` answer names a marker that exists in this worktree.
 *
 * `--git-path` answers with the path Git itself would read, relative to the
 * worktree root (or absolute, when the worktree lives elsewhere), and an absent
 * marker is an empty answer rather than an error. The existence check is the
 * only question asked: the marker's content never matters, only that Git wrote
 * one.
 *
 * @param root - the repository root and the process substrate.
 * @param path - the path `--git-path` answered with, when it answered.
 * @returns true when that path exists.
 */
function markerExists(root: GitTarget, path: string | undefined): boolean {
  return path !== undefined && path !== '' && existsSync(resolve(root.workdir, path))
}

/**
 * The message a merge already has, cleaned the way Git cleans it.
 *
 * `MERGE_MSG` is written when the merge starts and is the message the commit
 * would carry: Git's own `Merge branch 'feat' into main`, a body when one was
 * passed, and the `# Conflicts:` block it notes the unresolved paths under. The
 * page shows the same words in the commit form VSCode does, so the reader sees
 * what is about to be recorded instead of being told a merge is in progress.
 *
 * The file's path comes from `--git-path`, which is correct in a worktree and a
 * submodule, and its text goes through `git stripspace --strip-comments` rather
 * than through a rule of this module's own: the comment block is Git's, and the
 * character that marks it is `core.commentChar`, which the same command honours.
 * A merge whose file cannot be read or cleaned answers `undefined` — the form
 * then opens empty, which is exactly the state it has before Git wrote anything.
 *
 * @param root - the repository root and the process substrate.
 * @returns the cleaned message, or undefined when there is none to show.
 */
async function readMergeMessage(root: GitTarget): Promise<string | undefined> {
  const located = await runGit(root, ['rev-parse', '--git-path', 'MERGE_MSG'])
  if (located.code !== 0) return undefined
  const path = located.stdout.trim()
  if (path === '') return undefined

  let text: string
  try {
    text = await readFile(isAbsolute(path) ? path : resolve(root.workdir, path), 'utf8')
  } catch {
    return undefined
  }

  const cleaned = await runGit(root, ['stripspace', '--strip-comments'], { stdin: text })
  if (cleaned.code !== 0) return undefined
  const message = cleaned.stdout.trim()
  return message === '' ? undefined : message
}

/** The branch facts and changed paths one `status` invocation reported. */
interface ParsedStatus {
  readonly branch: string
  readonly detached: boolean
  readonly upstream: string | undefined
  readonly ahead: number
  readonly behind: number
  readonly files: readonly ChangedFile[]
}

/**
 * Parse `git status --porcelain=v1 -z --branch` output.
 *
 * The format is NUL-separated, which is what makes it safe for paths holding
 * spaces, quotes, or newlines: no escaping is involved at all. A rename or copy
 * record is followed by one extra record holding its source path, so the walk
 * consumes two records for those codes.
 *
 * @param output - the command's stdout.
 * @returns the branch header and one entry per changed path.
 */
function parseStatus(output: string): ParsedStatus {
  const records = output.split('\0')
  const header = parseBranchHeader(records[0]?.startsWith('## ') === true ? records[0] : undefined)
  const files: ChangedFile[] = []

  for (let index = header.consumed; index < records.length; index += 1) {
    const record = records[index]
    if (record === undefined || record.length < 3) continue
    const x = record.charAt(0)
    const y = record.charAt(1)
    const path = record.slice(3)
    let origPath: string | undefined
    if (x === 'R' || x === 'C') {
      index += 1
      origPath = records[index]
    }
    files.push(changedFile(path, origPath, x, y))
  }

  return { ...header.value, files }
}

/** The branch facts a `## ...` header carries, plus how many records it used. */
interface BranchHeader {
  readonly consumed: number
  readonly value: Omit<ParsedStatus, 'files'>
}

/** Branch facts assumed when the header is missing or unreadable. */
const UNKNOWN_BRANCH: Omit<ParsedStatus, 'files'> = {
  branch: '',
  detached: false,
  upstream: undefined,
  ahead: 0,
  behind: 0,
}

/**
 * Parse the `## ...` header line into its branch, upstream, and divergence.
 *
 * The four shapes Git emits are `## main`, `## main...origin/main`,
 * `## main...origin/main [ahead 1, behind 2]`, and the unborn branch's
 * `## No commits yet on main`; a detached HEAD is `## HEAD (no branch)`.
 *
 * @param record - the first NUL-separated record, when it is a branch header.
 * @returns the facts, and the number of records the header occupied.
 */
function parseBranchHeader(record: string | undefined): BranchHeader {
  if (record === undefined) return { consumed: 0, value: UNKNOWN_BRANCH }
  const body = record.slice(3).trim()
  const unborn = /^(?:No commits yet on|Initial commit on) (.+)$/.exec(body)
  const text = unborn?.[1] ?? body
  if (text === 'HEAD (no branch)') {
    return { consumed: 1, value: { ...UNKNOWN_BRANCH, detached: true, branch: 'HEAD' } }
  }

  const [names, divergence] = splitOnce(text, ' [')
  const [branch, upstream] = splitOnce(names, '...')
  const counts = parseDivergence(divergence)
  return {
    consumed: 1,
    value: {
      branch,
      detached: false,
      upstream: upstream === '' ? undefined : upstream,
      ahead: counts.ahead,
      behind: counts.behind,
    },
  }
}

/**
 * Split `text` at the first occurrence of `separator`.
 *
 * @param text - the text to split.
 * @param separator - the marker to split on.
 * @returns both halves; the second is empty when the marker is absent.
 */
function splitOnce(text: string, separator: string): [string, string] {
  const at = text.indexOf(separator)
  if (at < 0) return [text, '']
  return [text.slice(0, at), text.slice(at + separator.length)]
}

/**
 * Read the `ahead N, behind M` counts out of a branch header's bracket.
 *
 * @param divergence - the bracketed text without its opening bracket, if any.
 * @returns the two counts; both zero when the branch has no upstream delta.
 */
function parseDivergence(divergence: string): { ahead: number; behind: number } {
  const body = divergence.endsWith(']') ? divergence.slice(0, -1) : divergence
  const ahead = /\bahead (\d+)/.exec(body)
  const behind = /\bbehind (\d+)/.exec(body)
  return {
    ahead: ahead === null ? 0 : Number(ahead[1]),
    behind: behind === null ? 0 : Number(behind[1]),
  }
}

/**
 * Build one sidebar row from a porcelain record.
 *
 * @param path - the worktree path.
 * @param origPath - the rename/copy source, when the record had one.
 * @param x - the porcelain index column.
 * @param y - the porcelain worktree column.
 * @returns the row the page renders.
 */
function changedFile(path: string, origPath: string | undefined, x: string, y: string): ChangedFile {
  const kind = classifyChange(x, y)
  const untracked = kind === 'untracked'
  const conflicted = kind === 'conflicted'
  return {
    path,
    ...(origPath === undefined ? {} : { origPath }),
    index: x,
    worktree: y,
    kind,
    // An untracked path is in neither the index nor HEAD, so neither side of
    // the row is "staged": Git's `??` is not a stage marker.
    staged: !untracked && x !== ' ' && x !== '?',
    unstaged: !untracked && y !== ' ' && y !== '?',
    untracked,
    conflicted,
  }
}

/**
 * Read the newest commits of the current branch.
 *
 * An unborn branch is not an error: the history is legitimately empty, and the
 * page shows its empty state instead of `fatal: your current branch ... does
 * not have any commits yet`.
 *
 * @param target - the process substrate and the session's directory.
 * @param limit - how many commits to return; clamped to {@link MAX_LOG_LIMIT}.
 * @returns the log payload.
 */
export async function readLog(target: GitTarget, limit: number): Promise<LogPayload> {
  const repo = await resolveRepo(target)
  if ('refusal' in repo) return { ok: false, ...repo.refusal, reason: repo.reason }
  if (!repo.hasHead) return { ok: true, commits: [], empty: true }

  const root = inDir(target, repo.root)
  const count = clampLimit(limit)
  // `-z` separates commits with NUL instead of a newline, so a multi-line commit
  // body (and any subject holding a newline) cannot be mistaken for a record
  // boundary. The fields inside one record are split on the unit separator.
  const log = await runGit(root, [
    'log', '-z', `--max-count=${count}`, `--pretty=format:${LOG_FORMAT}`,
  ])
  if (log.code !== 0) return { ok: false, ...refusalOf(log), reason: 'error' }

  const commits: CommitSummary[] = []
  for (const record of log.stdout.split('\0')) {
    if (record === '') continue
    const summary = parseSummary(record.split(FIELD))
    if (summary !== undefined) commits.push(summary)
  }
  return { ok: true, commits, empty: commits.length === 0 }
}

/**
 * Read one commit's message and its patch.
 *
 * The patch is produced by diffing the commit against its first parent. That is
 * deliberately not `git show`: with the default configuration `show` prints no
 * diff at all for a merge commit, and asking it for one only moved the problem
 * to a `--diff-merges` flag newer Git versions require. A root commit has no
 * parent to diff against, so it keeps `show`, which prints the whole tree as an
 * addition.
 *
 * @param target - the process substrate and the session's directory.
 * @param hash - a hexadecimal object name, already validated by the route.
 * @returns the commit payload, including the raw patch for the page's parser.
 */
export async function readCommit(target: GitTarget, hash: string): Promise<CommitPayload> {
  const repo = await resolveRepo(target)
  if ('refusal' in repo) return { ok: false, ...repo.refusal, reason: repo.reason }
  if (!repo.hasHead) return { ok: false, ...coded('no-commits'), reason: 'error' }

  const root = inDir(target, repo.root)
  const meta = await runGit(root, [
    'log', '-1', `--pretty=format:${DETAIL_FORMAT}`, hash,
  ])
  if (meta.code !== 0) return { ok: false, ...refusalOf(meta), reason: 'error' }

  const cut = meta.stdout.indexOf(RECORD)
  const fields = (cut < 0 ? meta.stdout : meta.stdout.slice(0, cut)).split(FIELD)
  const summary = parseSummary(fields)
  if (summary === undefined) return { ok: false, ...coded('unparsable-commit'), reason: 'error' }
  const body = fields[BODY_FIELD] ?? ''

  const merge = summary.parents.length > 1
  const patchRun = summary.parents.length === 0
    ? await runGit(root, [
        'show', '--no-color', '--no-ext-diff', '-M', '--patch', '-U3', '--format=', hash,
      ])
    : await runGit(root, [
        'diff', '--no-color', '--no-ext-diff', '-M', '-U3', `${hash}^`, hash,
      ])
  if (patchRun.code !== 0) return { ok: false, ...refusalOf(patchRun), reason: 'error' }

  return {
    ok: true,
    commit: { ...summary, body },
    patch: patchRun.stdout.replace(/^\n+/, ''),
    truncated: patchRun.truncated,
    merge,
  }
}

/**
 * Read one side of one path's change.
 *
 * The request names the side because the page lists a path once per half it
 * holds: a file staged and then edited again is two rows, and the patch under
 * each must be the one that row stands for. `staged` compares the index against
 * HEAD —what committing the index would record —and `unstaged` compares the
 * worktree against the index —what `git add` would capture. A conflicted path
 * has no meaningful side, so its request reads the combined diff Git prints for
 * an unmerged path.
 *
 * An untracked path has no HEAD side at all, so it is diffed against
 * `/dev/null`, whatever side the request names. A repository without commits has
 * no HEAD to compare against either, and `--cached` then compares the index
 * against the empty tree, which is the honest answer for the staged side there.
 *
 * @param target - the process substrate and the session's directory.
 * @param file - the changed path and the side of it to diff.
 * @returns the unified diff, or the reason there is none.
 */
export async function readDiff(
  target: GitTarget,
  file: { readonly path: string; readonly side: DiffSide; readonly untracked: boolean },
): Promise<DiffPayload> {
  const repo = await resolveRepo(target)
  if ('refusal' in repo) return { ok: false, ...repo.refusal, reason: repo.reason }

  const base = ['--no-color', '--no-ext-diff']
  const root = inDir(target, repo.root)
  let diff: GitRun
  if (file.untracked) {
    // `--no-index` is the one place Git compares two paths instead of a path
    // against a tree. It exits 1 whenever the two sides differ, which for this
    // invocation is the normal answer rather than a failure.
    diff = await runGit(root, [
      'diff', '--no-index', ...base, '--', '/dev/null', file.path,
    ])
  } else if (file.side === 'conflict') {
    // An unmerged path's combined diff is neither side: it shows the worktree
    // against the merge base, with the conflict markers in place.
    diff = await runGit(root, ['diff', '-M', ...base, '--', literalPath(file.path)])
  } else if (file.side === 'staged') {
    diff = await runGit(root, ['diff', '--cached', '-M', ...base, '--', literalPath(file.path)])
  } else {
    diff = await runGit(root, ['diff', '-M', ...base, '--', literalPath(file.path)])
  }

  if (diff.code !== 0 && diff.code !== 1) {
    return { ok: false, ...refusalOf(diff), reason: 'error' }
  }

  const patch = diff.stdout
  return {
    ok: true,
    path: file.path,
    patch,
    truncated: diff.truncated,
    binary: /^(?:Binary files .* differ|GIT binary patch)$/m.test(patch),
  }
}

/**
 * Largest tracked patch the message prompt carries, in characters.
 *
 * The prompt is one model request, so the patch inside it is bounded here rather
 * than by the read: `runGit`'s own bound is four megabytes, which is a fine
 * answer for a pane to scroll and far too much to put in a prompt beside a file
 * list and a set of previews.
 */
const MAX_DIGEST_PATCH_CHARS = 120_000

/**
 * Largest preview one untracked path contributes to the prompt.
 *
 * A patch of an untracked path is its whole content, so without this a single
 * new lockfile could fill the request; the size line `--stat` prints outside the
 * cap is what still tells the model the file is large.
 */
const MAX_PREVIEW_CHARS = 12_000

/** Total preview budget across every untracked path. */
const MAX_PREVIEW_TOTAL_CHARS = 48_000

/** How many untracked paths' contents the prompt describes. */
const MAX_PREVIEW_FILES = 20

/**
 * How many recent commit messages the prompt reads as its style sample.
 *
 * The generator writes in the style this repository already commits in, and the
 * sample is the evidence for that style: ten messages are enough for a pattern —?
 * a tag, a language, a body —to show, and few enough to stay a footnote beside
 * the patch.
 */
const STYLE_SAMPLE_COMMITS = 10

/**
 * Longest one sampled message may be, in characters.
 *
 * A message is a subject and usually a few lines; the bound is here so that one
 * enormous body —a squashed release note, a template nobody trimmed —cannot
 * crowd the diff out of the request. A message over the bound is stored cut and
 * marked as such, because half a message otherwise reads as all of it.
 */
const MAX_SAMPLE_MESSAGE_CHARS = 400

/** One recent commit message, as the prompt's style evidence. */
export interface StyleSample {
  /** The message as it was committed: its subject, and its body when it has one. */
  readonly text: string
  /** The message was longer than {@link MAX_SAMPLE_MESSAGE_CHARS} and is stored cut. */
  readonly truncated: boolean
}

/** One untracked path, as the message prompt sees it. */
export interface UntrackedPreview {
  /** Worktree-relative path. */
  readonly path: string
  /**
   * What Git printed for this path against `/dev/null`: its `--stat` line —?
   * which is where a binary file's byte size appears —and then its patch, cut
   * at the Host's bound.
   */
  readonly text: string
  /** The preview was cut, so the file is longer than what is shown. */
  readonly truncated: boolean
}

/**
 * Everything the message generator reads out of the working tree.
 *
 * A refusal is the reader's own rather than a payload, because the route wraps
 * it the way every other route wraps its reader's: the three fields below are
 * the material, and there is nothing to say about a repository that could not be
 * read.
 */
export type ChangeDigest =
  | {
    readonly ok: true
    /**
     * The repository root the read was resolved against.
     *
     * The commit-message writer keys a Workspace's saved choices by this path
     * when the Workspace registry cannot name one, and the digest is already
     * the request that resolved it —a second `rev-parse` would only repeat a
     * question this answer already holds.
     */
    readonly root: string
    /** Which half of the working tree this digest describes. */
    readonly scope: CommitScope
    /** Every changed path in scope, in the order `git status` named them. */
    readonly files: readonly ChangedFile[]
    /**
     * `git diff --stat` of the tracked changes: one line per path, following the
     * patch's own shape but carrying the file's magnitude —the only place a
     * binary file's size appears at all.
     */
    readonly stat: string
    /** Unified patch of the tracked changes, staged and unstaged alike. */
    readonly patch: string
    /** The patch was cut at {@link MAX_DIGEST_PATCH_CHARS}. */
    readonly patchTruncated: boolean
    /** Untracked paths' contents, each bounded and at most `MAX_PREVIEW_FILES`. */
    readonly untracked: readonly UntrackedPreview[]
    /**
     * This branch's recent commit messages, newest first and at most
     * `STYLE_SAMPLE_COMMITS` of them: the style the generated message is asked to
     * match. Empty on an unborn branch, which is the same answer as no style.
     */
    readonly recentMessages: readonly StyleSample[]
  }
  | { readonly ok: false; readonly refusal: Refusal; readonly reason: 'no-repo' | 'error' }

/**
 * Run the one diff that covers every tracked change.
 *
 * `git diff HEAD` is the whole of it when the branch has a commit: index and
 * worktree are both compared against HEAD, so a staged edit and a further
 * unstaged one appear under the path they belong to. An unborn branch has no
 * HEAD to compare against, so the staged half is asked for by name —the index
 * against the empty tree —and the unstaged half follows; the two are
 * concatenated rather than merged because both are already in the same format
 * and neither can name a path the other does not.
 *
 * @param root - the repository root and the process substrate.
 * @param hasHead - HEAD resolves to a commit.
 * @param format - the diff's own switches, e.g. `--stat`.
 * @returns the invocation's outcome; never rejects.
 */
async function runTrackedDiff(
  root: GitTarget,
  hasHead: boolean,
  format: readonly string[],
): Promise<GitRun> {
  const base = ['-M', '--no-color', '--no-ext-diff', ...format]
  if (hasHead) return runGit(root, ['diff', 'HEAD', ...base])
  const staged = await runGit(root, ['diff', '--cached', ...base])
  if (staged.code !== 0) return staged
  const unstaged = await runGit(root, ['diff', ...base])
  if (unstaged.code !== 0) return unstaged
  return {
    ...staged,
    stdout: staged.stdout + unstaged.stdout,
    truncated: staged.truncated || unstaged.truncated,
  }
}

/**
 * Cut one block of Git's output at a character bound, on a line boundary.
 *
 * A block cut mid-line would hand the model half a hunk header or half a line of
 * code, which reads as a change that is not there; cutting at the last newline
 * inside the bound leaves whole lines only, and the flag is what tells the model
 * the picture is incomplete.
 *
 * @param text - the text as Git printed it.
 * @param limit - the most characters the caller may carry.
 * @returns the text to carry, and whether anything was dropped.
 */
function cutAtLine(text: string, limit: number): { readonly text: string; readonly truncated: boolean } {
  if (text.length <= limit) return { text, truncated: false }
  const head = text.slice(0, limit)
  const lastBreak = head.lastIndexOf('\n')
  return { text: lastBreak < 0 ? head : head.slice(0, lastBreak + 1), truncated: true }
}

/**
 * Read every untracked path's content, each against `/dev/null`.
 *
 * `--no-index` is the one place Git compares two paths instead of a path against
 * a tree, which is the only way an untracked file's content is reachable at all:
 * it is in no tree, so no `diff HEAD` can name it. Exit code 1 is the normal
 * answer here —the two sides always differ, an empty file included —and the
 * `--stat` line is asked for in the same invocation as the patch, because it is
 * where a binary file's size appears and a second command would only repeat the
 * same walk.
 *
 * A path whose read fails is left out of the previews: it stays on the list the
 * prompt opens with, because `git status` named it, and the alternative —one
 * unreadable file failing the whole request —would take the message away over a
 * file the model was only ever going to look at.
 *
 * @param root - the repository root and the process substrate.
 * @param files - every changed path; the untracked ones are the subject here.
 * @returns one bounded preview per untracked path, in status order.
 */
async function readUntrackedPreviews(
  root: GitTarget,
  files: readonly ChangedFile[],
): Promise<readonly UntrackedPreview[]> {
  const previews: UntrackedPreview[] = []
  let budget = MAX_PREVIEW_TOTAL_CHARS
  for (const file of files) {
    if (!file.untracked || previews.length >= MAX_PREVIEW_FILES || budget <= 0) continue
    const run = await runGit(root, [
      'diff', '--no-index', '--stat', '-p', '--no-color', '--no-ext-diff', '--', '/dev/null', file.path,
    ])
    if (run.code !== 0 && run.code !== 1) continue
    if (run.stdout.trim() === '') continue
    const cut = cutAtLine(run.stdout, Math.min(MAX_PREVIEW_CHARS, budget))
    budget -= cut.text.length
    previews.push({ path: file.path, text: cut.text, truncated: cut.truncated || run.truncated })
  }
  return previews
}

/**
 * Read this branch's recent commit messages, as the generator's style sample.
 *
 * `-z` is what makes one commit one record: a message is multi-line by nature, so
 * the newline-separated default would need the format parsed back apart, while
 * NUL cannot occur in a commit message and splits the records outright. Each
 * record is cut to {@link MAX_SAMPLE_MESSAGE_CHARS} on a line boundary, by the
 * same rule the patch is cut by.
 *
 * Nothing here is fatal: a branch with no commits, or a `log` that fails for any
 * other reason, reads as no sample —the generator then falls back to the commit
 * rules, which is a better answer than taking the message away over a style it
 * could not read.
 *
 * @param root - the repository root and the process substrate.
 * @param hasHead - HEAD resolves to a commit, so there is history to read.
 * @returns the sampled messages, newest first.
 */
async function readRecentMessages(root: GitTarget, hasHead: boolean): Promise<readonly StyleSample[]> {
  if (!hasHead) return []
  const log = await runGit(root, [
    'log', `-n${STYLE_SAMPLE_COMMITS}`, '-z', '--pretty=format:%B',
  ])
  if (log.code !== 0) return []

  return log.stdout
    .split('\0')
    .map(message => message.trim())
    .filter(message => message !== '')
    .map(message => {
      const cut = cutAtLine(message, MAX_SAMPLE_MESSAGE_CHARS)
      return { text: cut.text.trim(), truncated: cut.truncated }
    })
    .filter(sample => sample.text !== '')
}

/**
 * Read the working tree as one block of material for a generated commit message.
 *
 * This is the reader `readStatus` and `readDiff` would give if they were asked
 * together and once: the changed paths, the tracked patch with its `--stat`, and
 * the untracked files a patch against HEAD cannot reach. It exists as one read
 * because the prompt is one request —a message generator that walked the tree
 * path by path would run three commands per changed file —and because the model
 * is meant to see the changes as one change set rather than as an answer per
 * row.
 *
 * The scope narrows the material, not this reader's honesty about it. `staged`
 * describes the index alone: only the paths whose index side differs, the
 * `--cached` patch and stat, and no untracked previews, because an untracked
 * path is by definition not in the index. `all` keeps the whole working tree,
 * which is the message the commit-all button records.
 *
 * The one thing here that is not a change is the style sample: the branch's own
 * recent messages, which the prompt asks the model to write in the manner of.
 *
 * @param target - the process substrate and the session's directory.
 * @param scope - whether to describe the index alone or the whole working tree.
 * @returns the digest, or why the repository could not be read.
 */
export async function readChangeDigest(
  target: GitTarget,
  scope: CommitScope = 'all',
): Promise<ChangeDigest> {
  const repo = await resolveRepo(target)
  if ('refusal' in repo) return { ok: false, refusal: repo.refusal, reason: repo.reason }
  const root = inDir(target, repo.root)

  const status = await runGit(root, STATUS_ARGS)
  if (status.code !== 0) return { ok: false, refusal: refusalOf(status), reason: 'error' }
  const parsed = parseStatus(status.stdout).files
  // A commit of the index is refused while the tree holds an unmerged path, so a
  // message for that commit must not describe a set it could never record. The
  // page states the conflict refusal rather than pretending the index is whole.
  if (scope === 'staged' && parsed.some(file => file.conflicted)) {
    return { ok: false, refusal: coded('commit-conflict'), reason: 'error' }
  }
  const files = scope === 'staged'
    ? parsed.filter(file => file.staged)
    : parsed
  const recentMessages = await readRecentMessages(root, repo.hasHead)
  if (files.length === 0) {
    return {
      ok: true,
      root: repo.root,
      scope,
      files,
      stat: '',
      patch: '',
      patchTruncated: false,
      untracked: [],
      recentMessages,
    }
  }

  const format = scope === 'staged' ? ['--cached'] : []
  const stat = scope === 'staged'
    ? await runGit(root, ['diff', ...format, '-M', '--no-color', '--no-ext-diff', '--stat'])
    : await runTrackedDiff(root, repo.hasHead, ['--stat'])
  if (stat.code !== 0) return { ok: false, refusal: refusalOf(stat), reason: 'error' }
  const diff = scope === 'staged'
    ? await runGit(root, ['diff', ...format, '-M', '--no-color', '--no-ext-diff', '--unified=3'])
    : await runTrackedDiff(root, repo.hasHead, ['--unified=3'])
  if (diff.code !== 0) return { ok: false, refusal: refusalOf(diff), reason: 'error' }
  const patch = cutAtLine(diff.stdout, MAX_DIGEST_PATCH_CHARS)

  return {
    ok: true,
    root: repo.root,
    scope,
    files,
    stat: stat.stdout.trim(),
    patch: patch.text,
    patchTruncated: patch.truncated || diff.truncated,
    untracked: scope === 'staged' ? [] : await readUntrackedPreviews(root, files),
    recentMessages,
  }
}

/**
 * One namespace's branch names, and whether the cap cut the list.
 *
 * A failure is reported as the reason rather than as a payload, because the two
 * callers wrap it in the same answer and neither has anything to add to it.
 */
type RefNames =
  | { readonly ok: true; readonly names: readonly string[]; readonly truncated: boolean }
  | { readonly ok: false; readonly refusal: Refusal }

/**
 * Read the short names under one ref namespace, newest commit date first.
 *
 * A projection over {@link readRefRecords} rather than a second walk: the switch
 * list and the delete dialog must agree about which refs exist and which
 * symbolic aliases are not branches, so they read the same records and only this
 * reader narrows them to names.
 *
 * @param root - the repository root and the process substrate.
 * @param namespace - the ref namespace to read, e.g. `refs/heads/`.
 * @returns the short names, or why the read failed.
 */
async function readRefNames(root: GitTarget, namespace: string): Promise<RefNames> {
  const records = await readRefRecords(root, namespace)
  if (!records.ok) return records
  return { ok: true, names: records.records.map(record => record.name), truncated: records.truncated }
}

/**
 * Read the branches a switch may pick: the local ones and the remote-tracking
 * ones.
 *
 * The two lists are read the same way and sorted by commit date, so either one
 * opens on the branches someone is actually working on. Whether a remote branch
 * is switchable is not a filter applied here: a remote branch is a real choice —?
 * checking it out is what creates the local branch that tracks it —so the page
 * shows both and the switch decides what to do with each.
 *
 * @param target - the process substrate and the session's directory.
 * @returns the two branch lists and which branch HEAD is on.
 */
export async function readBranches(target: GitTarget): Promise<BranchesPayload> {
  const repo = await resolveRepo(target)
  if ('refusal' in repo) return { ok: false, ...repo.refusal, reason: repo.reason }

  const root = inDir(target, repo.root)
  // Three independent questions about the ref tables: the local names, the
  // remote-tracking names, and which branch HEAD points at. Asking them in
  // parallel keeps one menu opening from paying their process starts in a row.
  const [locals, remotes, current] = await Promise.all([
    readRefNames(root, 'refs/heads/'),
    readRefNames(root, 'refs/remotes/'),
    currentBranch(root),
  ])
  if (!locals.ok) return { ok: false, ...locals.refusal, reason: 'error' }
  if (!remotes.ok) return { ok: false, ...remotes.refusal, reason: 'error' }

  return {
    ok: true,
    current,
    detached: current === null,
    branches: locals.names,
    remotes: remotes.names,
    truncated: locals.truncated || remotes.truncated,
  }
}

/**
 * Switch the working tree to one branch.
 *
 * The name is a local branch, or a remote-tracking one (`origin/main`). The local
 * case has always been here: the name is checked against `refs/heads/` first, so
 * only a branch that really exists is ever acted on, and a typo becomes "this
 * branch does not exist" instead of Git's remote-guessing or an
 * ambiguous-argument error. The remote case is the same decision answered by
 * today's Git: checking out `origin/main` is how the local `main` that tracks it
 * comes into being, so the name is checked against `refs/remotes/` and the local
 * branch that tracks it is created —or, when it already exists, switched to,
 * because that is what the pick meant. The local name is derived here rather
 * than left to Git's own guess so the exists-check and the branch Git is told to
 * create can never disagree.
 *
 * What a ref name may look like is Git's rule and is not restated here: a name
 * that no ref answers to is already an unknown branch, so a second, weaker
 * pattern would only turn names Git accepts —non-ASCII ones among them —into a
 * refusal of this plugin's own invention.
 *
 * The switch itself runs as `git switch`, whose argument is unambiguously a
 * branch rather than a path; Git older than 2.23 does not have that subcommand,
 * and the retry with `checkout` is what keeps those installations working.
 *
 * This is the one route that writes: a checkout replaces files in the working
 * tree, so a working tree in the way is a refusal the page words itself.
 *
 * @param target - the process substrate and the session's directory.
 * @param name - the local or remote-tracking branch to check out.
 * @returns the outcome, including the reason a switch was refused.
 */
export async function switchBranch(target: GitTarget, name: string): Promise<CheckoutPayload> {
  const repo = await resolveRepo(target)
  if ('refusal' in repo) return { ok: false, ...repo.refusal, reason: repo.reason }
  const root = inDir(target, repo.root)
  if (await refExists(root, `refs/heads/${name}`)) {
    return switchTo(root, ['switch', name], ['checkout', name], name)
  }
  if (!await refExists(root, `refs/remotes/${name}`)) {
    return { ok: false, ...coded('unknown-branch', { name }), reason: 'unknown-branch' }
  }

  const local = await localNameForRemote(root, name)
  if (local === null) {
    return { ok: false, ...coded('remote-local-name', { name }), reason: 'error' }
  }
  // The local branch may already track this remote: then the pick is a plain
  // switch, which is also the case where Git's own `--track` would refuse with
  // "a branch named ... already exists".
  if (await refExists(root, `refs/heads/${local}`)) {
    return switchTo(root, ['switch', local], ['checkout', local], local)
  }
  return switchTo(
    root,
    ['switch', '-c', local, '--track', name],
    ['checkout', '-b', local, '--track', name],
    local,
  )
}

/**
 * Run one switch and hand back the invocation itself.
 *
 * `git switch` arrived in 2.23; on an older Git the same intent is spelled with
 * `checkout`, which differs in exactly one letter of one option (`-c` against
 * `-b`), so the caller hands over both spellings rather than this helper
 * translating an argument list it does not own.
 *
 * The raw run is returned rather than a payload because the caller words its own
 * failure: a switch reads the refusal as a checkout, with the paths that are in
 * the way named.
 *
 * @param root - the repository root and the process substrate.
 * @param attempt - the `switch` invocation, subcommand first.
 * @param fallback - the same invocation for a Git without `switch`.
 * @returns the invocation's outcome.
 */
async function runSwitch(
  root: GitTarget,
  attempt: readonly string[],
  fallback: readonly string[],
): Promise<GitRun> {
  const run = await runGit(root, attempt)
  if (run.code !== 0 && NO_SWITCH.test(run.stderr)) return runGit(root, fallback)
  return run
}

/**
 * Run one switch and report it.
 *
 * @param root - the repository root and the process substrate.
 * @param attempt - the `switch` invocation, subcommand first.
 * @param fallback - the same invocation for a Git without `switch`.
 * @param branch - the local branch this switch lands on.
 * @returns the outcome, including the reason a switch was refused.
 */
async function switchTo(
  root: GitTarget,
  attempt: readonly string[],
  fallback: readonly string[],
  branch: string,
): Promise<CheckoutPayload> {
  const run = await runSwitch(root, attempt, fallback)
  if (run.code !== 0) return checkoutFailure(run)
  return { ok: true, branch }
}

/**
 * Whether one fully-qualified ref resolves.
 *
 * `--quiet` with `--verify` answers in the exit code alone, which is the only
 * question asked here: a name that resolves to nothing and a name that is not a
 * valid ref at all are the same answer to "may this be switched to".
 *
 * @param root - the repository root and the process substrate.
 * @param ref - the full ref name to resolve.
 * @returns true when the ref exists.
 */
async function refExists(root: GitTarget, ref: string): Promise<boolean> {
  const run = await runGit(root, ['rev-parse', '--verify', '--quiet', ref])
  return run.code === 0
}

/**
 * The local branch name a remote-tracking ref is checked out as.
 *
 * Git's rule is to strip the remote name, and the remote names are the
 * configured ones rather than a guess cut out of the ref: a remote may itself
 * contain a slash, so the longest matching remote is the only correct answer.
 * No match means no configured remote owns the ref —a stale directory left by a
 * removed remote —and the caller states that rather than inventing a name.
 *
 * @param root - the repository root and the process substrate.
 * @param ref - the remote-tracking ref, e.g. `origin/feature/x`.
 * @returns the local name, or null when no configured remote prefixes the ref.
 */
async function localNameForRemote(root: GitTarget, ref: string): Promise<string | null> {
  const split = splitRemote(await remotesOf(root), ref)
  return split === null ? null : split.branch
}

/**
 * The remote and the branch name one remote-tracking ref is made of.
 *
 * The remote names are the configured ones rather than a guess cut out of the
 * ref: a remote may itself contain a slash, so the longest matching remote is
 * the only correct answer, and no match means no configured remote owns the ref
 * —a stale directory left by a removed remote —which the caller states rather
 * than inventing a name.
 *
 * The split is resolved here rather than by the page because a local branch may
 * itself be called `origin/main`: the two are only told apart by asking which
 * remotes exist, and that is a question only this half can answer.
 *
 * @param remotes - the configured remote names.
 * @param ref - the remote-tracking ref, e.g. `origin/feature/x`.
 * @returns the remote and the branch on it, or null when no remote prefixes it.
 */
function splitRemote(
  remotes: readonly string[],
  ref: string,
): { readonly remote: string; readonly branch: string } | null {
  let best: string | null = null
  for (const remote of remotes) {
    if (!ref.startsWith(`${remote}/`)) continue
    if (best === null || remote.length > best.length) best = remote
  }
  if (best === null) return null
  const branch = ref.slice(best.length + 1)
  return branch === '' ? null : { remote: best, branch }
}

/**
 * Describe why a checkout was refused.
 *
 * The interesting case is a dirty working tree: Git names the paths it would
 * have to overwrite, and those names are what makes the message actionable, so
 * they are lifted out of the block Git prints rather than left in a wall of
 * advice the page would truncate away.
 *
 * @param run - the failed invocation.
 * @returns the payload the page renders.
 */
function checkoutFailure(run: GitRun): CheckoutPayload {
  const dirty = dirtyRefusal(diagnosticText(run))
  if (dirty !== null) return { ok: false, ...dirty, reason: 'dirty' }

  return { ok: false, ...refusalOf(run), reason: 'error' }
}

/**
 * The refusal a working tree in the way amounts to, when Git named the paths.
 *
 * The paths are what makes the message actionable, so they are lifted out of the
 * block Git prints rather than left in a wall of advice the page would truncate
 * away. They travel unsplit: the sentence is the page's, and a list joined for it
 * here is the same list in either language.
 *
 * Shared with the branch this half starts, because Git refuses both the same way:
 * creating a branch at another point is a switch with a ref made first, and a
 * working tree in the way stops it in the same words.
 *
 * @param text - Git's own diagnosis of the failed invocation.
 * @returns the coded refusal, or null when the tree was not what Git refused.
 */
function dirtyRefusal(text: string): Refusal | null {
  // A merge, a rebase, or a cherry-pick in progress refuses a switch before the
  // working tree is even considered, and Git words that as the index it wants
  // resolved rather than as local changes. It is the same answer to the reader —
  // finish what is in flight first — so it takes the same refusal.
  if (!DIRTY_WORKTREE.test(text) && !UNFINISHED_OPERATION.test(text)) return null
  const paths = text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line !== '' && !/^(?:error|fatal|Please|Aborting|note:)/i.test(line) && !line.includes(' '))
    .slice(0, 5)
  return paths.length === 0
    ? coded('checkout-dirty')
    : coded('checkout-dirty-paths', { paths: paths.join(', ') })
}

/**
 * Start a branch at one point and switch to it.
 *
 * The start point is resolved to a fully-qualified ref before Git is asked, for
 * the same reason the switch resolves its own name: `refs/heads/main` is a ref
 * and nothing else, so a name that begins with a dash can never be read as an
 * option by the command that follows, and the exists-check and the ref Git is
 * told to branch from can never disagree.
 *
 * The name itself is left to Git's rule. A name Git will not take is answered
 * with Git's own sentence rather than a pattern of this half's invention, which
 * is what keeps a name Git accepts —non-ASCII ones among them —from being
 * refused by a rule that does not exist. The one check made here is the one Git
 * cannot make cheaply: whether the name is already taken, which is a refusal the
 * page words rather than a bare `fatal` from a race.
 *
 * Creating at another point is a switch, so a working tree in the way refuses it
 * in the switch's own words.
 *
 * @param target - the process substrate and the session's directory.
 * @param name - the local branch to create.
 * @param start - the local or remote-tracking branch it starts at.
 * @returns the outcome, including the reason the create was refused.
 */
export async function createBranch(
  target: GitTarget,
  name: string,
  start: string,
): Promise<CreateBranchPayload> {
  const repo = await resolveRepo(target)
  if ('refusal' in repo) return { ok: false, ...repo.refusal, reason: repo.reason }
  const root = inDir(target, repo.root)

  if (await refExists(root, `refs/heads/${name}`)) {
    return { ok: false, ...coded('branch-exists', { branch: name }), reason: 'exists' }
  }

  const base = await startRef(root, start)
  if (base === null) {
    return { ok: false, ...coded('unknown-branch', { name: start }), reason: 'unknown-branch' }
  }

  const run = await runSwitch(
    root,
    ['switch', '-c', name, base],
    ['checkout', '-b', name, base],
  )
  if (run.code !== 0) return createFailure(run, name)
  return { ok: true, branch: name }
}

/**
 * The fully-qualified ref a new branch starts at, when the name resolves to one.
 *
 * Only a branch may be a starting point, local or remote-tracking: the dialog
 * offers branches and nothing else, so a tag or a raw commit is not a name this
 * half invents a meaning for. A remote-tracking start is what sets the new
 * branch's upstream, which is Git's own answer to branching off `origin/main`.
 *
 * @param root - the repository root and the process substrate.
 * @param name - the local or remote-tracking branch to start at.
 * @returns the full ref, or null when no branch answers to the name.
 */
async function startRef(root: GitTarget, name: string): Promise<string | null> {
  if (await refExists(root, `refs/heads/${name}`)) return `refs/heads/${name}`
  if (await refExists(root, `refs/remotes/${name}`)) return `refs/remotes/${name}`
  return null
}

/**
 * Describe why starting a branch was refused.
 *
 * A dirty working tree is worded with the switch's own sentence —the operation
 * is a switch, and the paths Git named are the same paths —while the other two
 * cases are this operation's own: a name taken between the check and the call,
 * and a session that may not write.
 *
 * @param run - the failed invocation.
 * @param name - the branch the request was creating.
 * @returns the payload the page renders.
 */
function createFailure(run: GitRun, name: string): CreateBranchPayload {
  const text = diagnosticText(run)
  if (BRANCH_EXISTS.test(text)) {
    return { ok: false, ...coded('branch-exists', { branch: name }), reason: 'exists' }
  }

  return { ok: false, ...refusalOf(run), reason: 'error' }
}

/** One record `for-each-ref` printed for a branch. */
interface RefRecord {
  readonly name: string
  /** The upstream's short name, empty when the branch tracks nothing. */
  readonly upstream: string
  /** Git's own `[ahead 1, behind 2]` / `[gone]` note, empty when in step. */
  readonly track: string
  /** Whether HEAD is on this branch. */
  readonly current: boolean
}

/**
 * The fields one branch record is read from.
 *
 * `%(HEAD)` is what makes the current branch free: it is the same `*` the
 * `branch` command draws, answered by the same walk that lists the refs, so the
 * dialog never asks a second question to find out where it is. `%(symref)` is
 * carried only to drop a remote's symbolic `HEAD`, which shortens to a bare
 * remote name and is not a branch anyone can delete.
 */
const REF_RECORD_FORMAT =
  '%(refname:short)%00%(upstream:short)%00%(upstream:track)%00%(symref)%00%(HEAD)'

/** One namespace's branch records, or why they could not be read. */
type RefRecords =
  | { readonly ok: true; readonly records: readonly RefRecord[]; readonly truncated: boolean }
  | { readonly ok: false; readonly refusal: Refusal }

/**
 * Read one ref namespace as records, newest commit date first.
 *
 * `--count` is asked for one more record than the cap, so a cut list can say
 * that it was cut. `%00` is how the fields are kept apart inside a record
 * (`%x1f` is expanded by `log --pretty` and not by `for-each-ref`; `%00` is),
 * and a ref name can hold no NUL, so a record is exactly five fields.
 *
 * This is the one walk both branch readers use: the switch list takes the
 * names, and the delete dialog takes the whole records.
 *
 * @param root - the repository root and the process substrate.
 * @param namespace - the ref namespace to read, e.g. `refs/heads/`.
 * @returns the records, or why the read failed.
 */
async function readRefRecords(root: GitTarget, namespace: string): Promise<RefRecords> {
  const list = await runGit(root, [
    'for-each-ref', '--sort=-committerdate', `--count=${MAX_BRANCHES + 1}`,
    `--format=${REF_RECORD_FORMAT}`, namespace,
  ])
  if (list.code !== 0) return { ok: false, refusal: refusalOf(list) }

  const records: RefRecord[] = []
  let truncated = false
  for (const line of list.stdout.split('\n')) {
    if (line === '') continue
    const [name = '', upstream = '', track = '', symref = '', head = ''] = line.split('\0')
    if (symref !== '') continue
    if (records.length === MAX_BRANCHES) {
      truncated = true
      break
    }
    records.push({ name, upstream, track, current: head === '*' })
  }
  return { ok: true, records, truncated }
}

/** The names one `--merged` walk answered with, or why it could not answer. */
type MergedNames =
  | { readonly ok: true; readonly names: ReadonlySet<string> }
  | { readonly ok: false; readonly refusal: Refusal }

/**
 * The branches in one namespace whose tip HEAD already reaches.
 *
 * This is half of `git branch -d`'s own rule —the other half is the branch's
 * upstream —and it is asked as one walk rather than one `merge-base` per branch
 * because the dialog's marks have to be drawn from a fixed number of calls.
 *
 * The answer is deliberately not cut at the list's own bound. A branch the page
 * shows must be classified, and which branches a `--count` would keep depends on
 * a sort that has nothing to do with which ones are merged, so a cut here would
 * mark an arbitrary branch as unmerged. What comes back is one short name per
 * line, which is the smallest answer this question has.
 *
 * @param root - the repository root and the process substrate.
 * @param namespace - the ref namespace to walk, e.g. `refs/heads/`.
 * @returns the merged names, or why the walk failed.
 */
async function mergedRefNames(root: GitTarget, namespace: string): Promise<MergedNames> {
  const list = await runGit(root, [
    'for-each-ref', '--merged=HEAD', '--format=%(refname:short)', namespace,
  ])
  if (list.code !== 0) return { ok: false, refusal: refusalOf(list) }
  const names = list.stdout.split('\n').filter(name => name !== '')
  return { ok: true, names: new Set(names) }
}

/**
 * The verdict one branch's badge states.
 *
 * `git branch -d` deletes a branch whose tip HEAD reaches, and one whose tip its
 * own upstream reaches; it refuses everything else. So the two safe answers are
 * a branch merged into HEAD and a branch whose upstream is level with it, and the
 * three unsafe ones are told apart by what the reader would have to do about it:
 * a branch no copy of which exists anywhere (`unmerged`), one with commits only
 * this checkout has (`unpushed`), and one whose upstream has been deleted, which
 * looks exactly like a branch that was never pushed and is the mark most worth
 * spelling out (`gone`).
 *
 * @param record - the branch's own record.
 * @param merged - whether HEAD already reaches this branch's tip.
 * @returns the mark the row carries.
 */
function safetyOf(record: RefRecord, merged: boolean): BranchSafety {
  if (merged) return 'safe'
  if (record.upstream === '') return 'unmerged'
  if (record.track.includes('gone')) return 'gone'
  if (record.track.includes('ahead')) return 'unpushed'
  // Not merged into HEAD, but every commit it has is already on its upstream:
  // Git deletes this one, with a warning that says exactly that.
  return 'safe'
}

/**
 * The counts Git's own tracking note is made of.
 *
 * @param track - Git's `[ahead 1, behind 2]` note, possibly empty.
 * @returns the counts it named, each absent when Git did not name it.
 */
function aheadBehindOf(track: string): { ahead?: number; behind?: number } {
  const ahead = /ahead (\d+)/.exec(track)
  const behind = /behind (\d+)/.exec(track)
  return {
    ...(ahead === null ? {} : { ahead: Number(ahead[1]) }),
    ...(behind === null ? {} : { behind: Number(behind[1]) }),
  }
}

/**
 * Read the branches the delete dialog may offer, with the facts its marks need.
 *
 * A read of its own rather than a second half of `POST /branches`, because the
 * two dialogs ask different questions: a switch wants names and nothing else,
 * while this one wants each branch's upstream, its tracking state, and whether
 * HEAD reaches it —three answers that cost walks the switch dialog would pay
 * for on every open and never read.
 *
 * A remote-tracking branch is marked by the same rule as a local one, and the
 * rule reads differently there: a remote branch HEAD does not reach is the
 * ordinary case rather than a warning, so what the row says is simply that these
 * commits are on that remote and nowhere else in this repository. Which remote
 * owns the ref is resolved against the configured names rather than cut out of
 * the ref, because a local branch may itself be called `origin/main`.
 *
 * @param target - the process substrate and the session's directory.
 * @returns the two lists, each with its marks, and which branch HEAD is on.
 */
export async function readBranchReport(target: GitTarget): Promise<BranchReportPayload> {
  const repo = await resolveRepo(target)
  if ('refusal' in repo) return { ok: false, ...repo.refusal, reason: repo.reason }
  const root = inDir(target, repo.root)

  const locals = await readRefRecords(root, 'refs/heads/')
  if (!locals.ok) return { ok: false, ...locals.refusal, reason: 'error' }
  const remotes = await readRefRecords(root, 'refs/remotes/')
  if (!remotes.ok) return { ok: false, ...remotes.refusal, reason: 'error' }

  // `--merged=HEAD` has no answer on an unborn branch: there is nothing to merge
  // into and, the list below being empty, nothing to classify either.
  const localMerged = repo.hasHead
    ? await mergedRefNames(root, 'refs/heads/')
    : { ok: true as const, names: new Set<string>() }
  if (!localMerged.ok) return { ok: false, ...localMerged.refusal, reason: 'error' }
  const remoteMerged = repo.hasHead
    ? await mergedRefNames(root, 'refs/remotes/')
    : { ok: true as const, names: new Set<string>() }
  if (!remoteMerged.ok) return { ok: false, ...remoteMerged.refusal, reason: 'error' }

  const current = await currentBranch(root)
  const configured = await remotesOf(root)

  const localEntries: BranchEntry[] = locals.records.map(record => ({
    name: record.name,
    kind: 'local',
    current: record.current,
    safety: safetyOf(record, localMerged.names.has(record.name)),
    ...(record.upstream === '' ? {} : { upstream: record.upstream }),
    ...aheadBehindOf(record.track),
  }))

  const remoteEntries: BranchEntry[] = []
  for (const record of remotes.records) {
    const split = splitRemote(configured, record.name)
    if (split === null) continue
    remoteEntries.push({
      name: record.name,
      kind: 'remote',
      remote: split.remote,
      branch: split.branch,
      safety: safetyOf(record, remoteMerged.names.has(record.name)),
      ...aheadBehindOf(record.track),
    })
  }

  return {
    ok: true,
    current,
    detached: current === null,
    locals: localEntries,
    remotes: remoteEntries,
    truncated: locals.truncated || remotes.truncated,
  }
}

/**
 * Delete the branches a request named, one at a time.
 *
 * One at a time rather than one `git branch -d a b c`, because the answer the
 * dialog needs is per branch: Git reports a mixed batch by exiting nonzero and
 * naming the branch it refused, and telling which of the others went through
 * would mean reading Git's own prose back —text that is translated, and whose
 * misreading would mark a branch deleted that is still there. The exit code of
 * one call per branch is an answer no locale can change.
 *
 * Nothing here offers a force. `-d` is the whole gate, and it is the right one:
 * it refuses exactly the branches whose commits would be left reachable from
 * nothing, which is the promise every mark in the dialog is making.
 *
 * @param target - the process substrate and the session's directory.
 * @param wanted - the branches to delete, in the order the page listed them.
 * @returns one outcome per branch, and whether all of them succeeded.
 */
export async function deleteBranches(
  target: GitTarget,
  wanted: readonly BranchDeleteTarget[],
): Promise<DeleteBranchesPayload> {
  const repo = await resolveRepo(target)
  if ('refusal' in repo) return { ok: false, ...repo.refusal, reason: repo.reason }
  const root = inDir(target, repo.root)
  const configured = await remotesOf(root)

  const results: BranchDeletion[] = []
  for (const item of wanted) {
    results.push(item.kind === 'remote'
      ? await deleteRemoteBranch(root, configured, item)
      : await deleteLocalBranch(root, item.name))
  }
  return { ok: results.every(result => result.ok), results }
}

/**
 * Delete one local branch, with Git's own `-d` deciding.
 *
 * The name is checked against `refs/heads/` first so a name that is not a branch
 * is stated as such rather than surfacing Git's wording, and the one shape Git
 * would read as an option is refused here: `branch -d` takes a short name and
 * cannot be handed a full ref —a fully-qualified name is answered with "branch
 * not found" —so this is the one place a name this half passes on is not
 * already unambiguous.
 *
 * @param root - the repository root and the process substrate.
 * @param name - the local branch to delete.
 * @returns what became of it.
 */
async function deleteLocalBranch(root: GitTarget, name: string): Promise<BranchDeletion> {
  if (name.startsWith('-') || !await refExists(root, `refs/heads/${name}`)) {
    return { name, ok: false, ...coded('unknown-branch', { name }) }
  }

  const run = await runGit(root, ['branch', '-d', name])
  if (run.code === 0) return { name, ok: true }
  return { name, ok: false, ...deleteFailure(run, name) }
}

/**
 * Delete one branch on the remote that holds it.
 *
 * The ref is passed fully qualified, which is what keeps a branch name that
 * looks like an option from being read as one: `--delete` takes refs, and
 * `refs/heads/...` is unambiguously a ref, so the name Git is told to remove is
 * the name the dialog showed and not one the command line could reinterpret.
 *
 * The remote is checked against the configured ones because the page sends back
 * the pair it was given rather than a name this half re-splits, and a request
 * that names a remote the repository does not have is a refusal to state rather
 * than a push to attempt.
 *
 * @param root - the repository root and the process substrate.
 * @param configured - the configured remote names.
 * @param item - the remote-tracking branch to delete.
 * @returns what became of it.
 */
async function deleteRemoteBranch(
  root: GitTarget,
  configured: readonly string[],
  item: BranchDeleteTarget,
): Promise<BranchDeletion> {
  const remote = item.remote ?? ''
  const branch = item.branch ?? ''
  const named = remote === '' ? item.name : remote
  if (branch === '' || branch.startsWith('-') || !configured.includes(remote)) {
    return { name: item.name, ok: false, ...coded('unknown-remote', { remote: named }) }
  }

  const run = await runGit(
    root,
    ['push', remote, '--delete', `refs/heads/${branch}`],
    { timeoutMs: GIT_NETWORK_TIMEOUT_MS },
  )
  if (run.code === 0) return { name: item.name, ok: true }
  return { name: item.name, ok: false, ...remoteDeleteFailure(run, branch) }
}

/**
 * Describe why deleting one local branch was refused.
 *
 * The two refusals the dialog can predict are worded here, because it is the
 * dialog that predicted them: a branch Git will not delete for want of a merge
 * is the case every mark but `safe` is warning about, and a branch some worktree
 * is standing on —the current one included —is the case the dialog disables.
 * Both sentences name the branch, because a batch's answer is read one line at a
 * time and a line that does not say which branch it is about is not an answer.
 *
 * @param run - the failed invocation.
 * @param name - the branch the request was deleting.
 * @returns the coded refusal, or Git's own first line.
 */
function deleteFailure(run: GitRun, name: string): Refusal {
  const text = diagnosticText(run)
  if (BRANCH_NOT_MERGED.test(text)) return coded('branch-not-merged', { branch: name })
  if (BRANCH_IN_USE.test(text)) return coded('branch-in-use', { branch: name })
  return refusalOf(run)
}

/**
 * Describe why deleting one remote branch was refused.
 *
 * The credential answers are the ones `fetch` already words, because a delete is
 * a push and fails the same way when there is nothing to authenticate with;
 * everything else is Git's own first line —a missing ref, an unreachable host,
 * a rejected hook —which is more specific than anything this half could invent.
 *
 * @param run - the failed push invocation.
 * @param branch - the branch name on the remote, for the one refusal that names it.
 * @returns the coded refusal, or Git's own first line.
 */
function remoteDeleteFailure(run: GitRun, branch: string): Refusal {
  const text = diagnosticText(run)
  const auth = authRefusal(text)
  if (auth !== null) return auth
  if (REMOTE_REF_MISSING.test(text)) return coded('unknown-branch', { name: branch })
  return refusalOf(run)
}

/**
 * Merge one branch into the branch HEAD is on.
 *
 * That is a plain `git merge`, and it is the only shape this page offers: Git
 * merges into the branch it is on, and the branch it is on is the one the reader
 * is looking at, so the operation stated is the operation Git has. The other
 * direction —the current branch into a branch nobody is standing on —would be a
 * checkout, a merge, and a checkout back: three working-tree moves for one
 * intention, buying two saved clicks at the price of a commit made on a branch
 * the page is not showing, where nothing on screen would show it happen.
 *
 * A conflicting merge is left in the tree rather than aborted. The working tree
 * is exactly what the reader has to decide about, and the conflict list beside
 * the diff pane is where they decide it: block by block, then `git add`, then the
 * merge commit — which Git has already written the message for. Aborting would
 * throw that state away and send the reader to a terminal to reproduce it, which
 * is the one thing this page exists to avoid.
 *
 * @param target - the process substrate and the session's directory.
 * @param name - the branch to merge in, local or remote-tracking.
 * @returns the outcome, including the reason a merge was refused.
 */
export async function mergeBranch(
  target: GitTarget,
  name: string,
): Promise<MergePayload> {
  const repo = await resolveRepo(target)
  if ('refusal' in repo) return { ok: false, ...repo.refusal, reason: repo.reason }
  if (!repo.hasHead) return { ok: false, ...coded('merge-no-commits'), reason: 'no-commits' }

  const root = inDir(target, repo.root)
  const current = await currentBranch(root)
  if (current === null) return { ok: false, ...coded('merge-detached'), reason: 'detached' }
  if (name === current) {
    return { ok: false, ...coded('merge-same-branch', { branch: name }), reason: 'same-branch' }
  }

  if (!await mergeableRef(root, name)) {
    return { ok: false, ...coded('unknown-branch', { name }), reason: 'unknown-branch' }
  }
  return mergeIn(root, name)
}

/**
 * Whether one name can be the source of a merge.
 *
 * Both a local branch and a remote-tracking ref can be merged in, and the answer
 * is `rev-parse` on the fully-qualified name rather than a pattern of this
 * half's own —which is also what keeps a name Git accepts from being refused by
 * a rule that does not exist. A new branch's starting point is resolved by the
 * same rule, so that resolution is reused here rather than restated.
 *
 * @param root - the repository root and the process substrate.
 * @param name - the branch to judge.
 * @returns true when a merge may name it as its source.
 */
async function mergeableRef(root: GitTarget, name: string): Promise<boolean> {
  return (await startRef(root, name)) !== null
}

/**
 * Merge one branch into the branch HEAD is on.
 *
 * `--no-edit` is what keeps this non-interactive: without it Git opens an editor
 * for the merge commit's message, and no editor exists behind this seam.
 *
 * @param root - the repository root and the process substrate.
 * @param source - the branch to merge in.
 * @returns the outcome, including the reason a merge was refused.
 */
async function mergeIn(root: GitTarget, source: string): Promise<MergePayload> {
  const run = await runGit(root, ['merge', '--no-edit', source])
  if (run.code === 0) return { ok: true, branch: source, summary: mergeSummary(run, source) }
  if (run.failure !== undefined) return { ok: false, error: run.failure, reason: 'error' }

  // The merge stays in the tree: the conflicts it wrote are what the page
  // resolves, and the commit that finishes it is made once every path is
  // resolved (see `completeMerge`).
  if (await conflictedMerge(root, run)) {
    return { ok: false, ...coded('merge-conflict', { branch: source }), reason: 'conflict' }
  }
  return mergeFailure(run)
}

/**
 * Whether a failed merge left conflicts behind, or never started one.
 *
 * The pattern is Git's own summary sentence, and the fallback asks the index: a
 * merge that failed before touching the tree — a refused fast-forward, an
 * unrelated history — has no unmerged paths, and that is the difference between
 * "there is a merge in progress to resolve" and "nothing happened at all".
 *
 * @param root - the repository root and the process substrate.
 * @param run - the failed merge invocation.
 * @returns true when the merge is in progress with conflicts.
 */
async function conflictedMerge(root: GitTarget, run: GitRun): Promise<boolean> {
  if (MERGE_CONFLICT.test(diagnosticText(run))) return true
  const unmerged = await runGit(root, ['diff', '--name-only', '--diff-filter=U'])
  return unmerged.code === 0 && unmerged.stdout.trim() !== ''
}

/**
 * Describe why a merge was refused.
 *
 * The one coded case is the one the page can act on: a working tree with local
 * changes in the way. Everything
 * else is Git's own first line —`refusing to merge unrelated histories` and
 * friends —which is more specific than anything this half could invent.
 *
 * @param run - the failed merge invocation.
 * @returns the payload the page renders.
 */
function mergeFailure(run: GitRun): MergePayload {
  if (DIRTY_WORKTREE.test(diagnosticText(run))) {
    return { ok: false, ...coded('merge-dirty'), reason: 'dirty' }
  }
  return { ok: false, ...refusalOf(run), reason: 'error' }
}

/**
 * The Host's own one-line account of a merge that ran.
 *
 * Git says which of the three things happened in its own words —the two sides
 * were already equal, one moved up to the other, or a commit joined them —and
 * the page states that outcome as one line beside the branch it names.
 *
 * @param run - the successful merge invocation.
 * @param source - the branch that was merged in.
 * @returns the summary line.
 */
function mergeSummary(run: GitRun, source: string): string {
  const output = `${run.stdout}\n${run.stderr}`
  if (/Already up[ -]to[ -]date/i.test(output)) return `Already up to date with ${source}`
  if (/Fast-forward/i.test(output)) return `Fast-forwarded ${source}`
  return `Merged ${source}`
}

/**
 * The stages one unmerged path still holds, or null when it is not unmerged.
 *
 * `ls-files -u` is the authority for this rather than `status`: it is the index
 * itself, it names the stage of every entry, and its `-z` output is safe for any
 * path. A path with no unmerged entries answers with no output at all, which is
 * the one case the resolver must not write to — `git add` on it would mean
 * something else entirely.
 *
 * @param root - the repository root and the process substrate.
 * @param path - the repository-relative path.
 * @returns which of base, ours, and theirs exist, or null when none does.
 */
async function conflictStages(root: GitTarget, path: string): Promise<ConflictStages | null> {
  const listed = await runGit(root, ['ls-files', '-u', '-z', '--', literalPath(path)])
  if (listed.code !== 0 || listed.stdout === '') return null

  const stages = { base: false, ours: false, theirs: false }
  for (const record of listed.stdout.split('\0')) {
    const tab = record.indexOf('\t')
    if (tab < 0) continue
    // `<mode> <object> <stage>` before the tab, the path after it.
    const stage = record.slice(0, tab).split(' ')[2]
    if (stage === '1') stages.base = true
    else if (stage === '2') stages.ours = true
    else if (stage === '3') stages.theirs = true
  }
  return stages.base || stages.ours || stages.theirs ? stages : null
}

/**
 * Whether the worktree entry at one path is a symlink.
 *
 * A conflicted symlink has no text to resolve: its content is the target path,
 * and Git records it as mode `120000`. The page offers the whole-file choice for
 * it, and this is what tells the two apart, because `lstat` is the only read that
 * does not follow the link.
 *
 * @param workdir - the repository root.
 * @param path - the repository-relative path.
 * @returns true when the entry is a symlink.
 */
async function isSymlink(workdir: string, path: string): Promise<boolean> {
  try {
    return (await lstat(join(workdir, path))).isSymbolicLink()
  } catch {
    return false
  }
}

/**
 * Read one worktree file's bytes, or null when there is no regular file there.
 *
 * Bytes rather than text because a resolution splices what it did not choose
 * back into the file unchanged, and a decode/encode round trip would not do that
 * for a file in any encoding but UTF-8.
 *
 * @param workdir - the repository root.
 * @param path - the repository-relative path.
 * @returns the content, or null when the path holds no regular file.
 */
async function readWorktreeFile(workdir: string, path: string): Promise<Uint8Array | null> {
  try {
    const info = await lstat(join(workdir, path))
    if (!info.isFile()) return null
    return new Uint8Array(await readFile(join(workdir, path)))
  } catch {
    return null
  }
}

/**
 * Whether one request path names a file inside the repository.
 *
 * The check is lexical on purpose. Every path a resolver writes is one the page
 * drew from `git status`, and the index is asked again before anything is
 * written — an unmerged path is, by construction, tracked and inside the
 * repository. This is the belt to that suspenders: a request body is still
 * something a page composed, and a `../` in it must not become a write outside
 * the tree. The file itself is then checked for being a symlink, which a lexical
 * test cannot see.
 *
 * @param workdir - the repository root.
 * @param path - the path the request named.
 * @returns the absolute path, or null when it is not inside the root.
 */
function containedPath(workdir: string, path: string): string | null {
  const root = resolve(workdir)
  const target = resolve(root, path)
  const relativePath = relative(root, target)
  if (relativePath === '' || relativePath.startsWith('..') || isAbsolute(relativePath)) return null
  return target
}

/**
 * Read one unmerged path as the page resolves it.
 *
 * @param target - the process substrate and the session's directory.
 * @param path - the repository-relative path.
 * @returns the conflict document, or the reason there is none.
 */
export async function readConflict(target: GitTarget, path: string): Promise<ConflictPayload> {
  const repo = await resolveRepo(target)
  if ('refusal' in repo) return { ok: false, ...repo.refusal, reason: repo.reason }
  const root = inDir(target, repo.root)

  const stages = await conflictStages(root, path)
  if (stages === null) {
    return { ok: false, ...coded('not-conflicted', { path }), reason: 'not-conflicted' }
  }

  const link = await isSymlink(root.workdir, path)
  const bytes = link ? null : await readWorktreeFile(root.workdir, path)
  return { ok: true, conflict: describeConflict(path, bytes, stages, link) }
}

/**
 * Apply one choice to one unmerged path.
 *
 * Two shapes, one decision. A request naming region keys rewrites exactly those
 * blocks and leaves the rest of the file — including any conflict it did not
 * name — as it was: the reader is part-way through a file with several
 * conflicts, and each block is their decision to make. A request naming none is
 * a whole-file choice, which is the only kind a binary file or a path deleted on
 * one side can take, and because that *is* the resolution it is staged as well.
 *
 * The write runs in the repository's write queue, and the index is re-read inside
 * it: a path resolved by someone else since the page read it is refused rather
 * than written, and a region key that no longer matches the file is refused the
 * same way.
 *
 * @param target - the process substrate and the session's directory.
 * @param path - the repository-relative path.
 * @param choice - which version to keep.
 * @param keys - the blocks to replace, or undefined for a whole-file choice.
 * @returns the file after the write, or the refusal.
 */
export async function resolveConflict(
  target: GitTarget,
  path: string,
  choice: ResolveChoice,
  keys: readonly string[] | undefined,
): Promise<ResolvePayload> {
  const repo = await resolveRepo(target)
  if ('refusal' in repo) return { ok: false, ...repo.refusal, reason: repo.reason }

  const absolute = containedPath(repo.root, path)
  if (absolute === null) {
    return { ok: false, ...coded('resolve-unsafe', { path }), reason: 'unsafe' }
  }
  const root = inDir(target, repo.root)

  return withRepoWrite(repo.root, async () => {
    const stages = await conflictStages(root, path)
    if (stages === null) {
      return { ok: false, ...coded('not-conflicted', { path }), reason: 'not-conflicted' }
    }
    if (keys === undefined) return resolveWholeFile(target, root, absolute, path, choice, stages)
    return resolveRegions(root, absolute, path, choice, keys)
  })
}

/**
 * Take one whole version of a path that has no blocks to choose within.
 *
 * `git checkout --ours/--theirs` is what writes it, rather than this module
 * copying bytes: the stage is the version Git recorded, and checkout restores it
 * with the mode it had — which matters for a symlink or an executable file, and
 * which a plain file write would silently flatten. When the chosen side is the
 * one that deleted the path there is nothing to check out, so the worktree copy
 * is removed instead and `git add -A` records the deletion.
 *
 * @param target - the process substrate and the session's directory.
 * @param root - the repository root and the process substrate.
 * @param absolute - the worktree path, already checked to be inside the root.
 * @param path - the repository-relative path.
 * @param choice - which version to keep; `both` and `base` have no whole-file meaning.
 * @param stages - the stages the path holds.
 * @returns the file after the write, or the refusal.
 */
async function resolveWholeFile(
  target: GitTarget,
  root: GitTarget,
  absolute: string,
  path: string,
  choice: ResolveChoice,
  stages: ConflictStages,
): Promise<ResolvePayload> {
  if (choice !== 'ours' && choice !== 'theirs') {
    return { ok: false, ...coded('bad-choice', { choice }), reason: 'error' }
  }

  const present = choice === 'ours' ? stages.ours : stages.theirs
  if (present) {
    const restore = await runGit(root, ['checkout', `--${choice}`, '--', literalPath(path)])
    const failure = writeFailure(restore)
    if (failure !== null) return { ...failure, reason: 'error' }
  } else {
    try {
      await unlink(absolute)
    } catch {
      // Already gone: the deletion is the resolution either way.
    }
  }

  const add = await runGit(root, ['add', '-A', '--', literalPath(path)])
  const failure = writeFailure(add)
  if (failure !== null) return { ...failure, reason: 'error' }

  const answer = await indexAnswer(target)
  return answer.ok === true
    ? { ok: true, staged: true, status: answer.status }
    : { ...answer, reason: answer.reason === 'no-repo' ? 'no-repo' : 'error' }
}

/**
 * Replace the named blocks of one file with the chosen side's bytes.
 *
 * @param root - the repository root and the process substrate.
 * @param absolute - the worktree path, already checked to be inside the root.
 * @param path - the repository-relative path.
 * @param choice - which version to keep.
 * @param keys - the blocks to replace.
 * @returns the file after the write, or the refusal.
 */
async function resolveRegions(
  root: GitTarget,
  absolute: string,
  path: string,
  choice: ResolveChoice,
  keys: readonly string[],
): Promise<ResolvePayload> {
  if (await isSymlink(root.workdir, path)) {
    return { ok: false, ...coded('resolve-unsafe', { path }), reason: 'unsafe' }
  }

  const bytes = await readWorktreeFile(root.workdir, path)
  if (bytes === null) {
    return { ok: false, ...coded('not-conflicted', { path }), reason: 'not-conflicted' }
  }

  const parsed = parseConflict(bytes)
  const resolutions: Resolution[] = keys.map(key => ({ key, choice }))
  const next = applyResolutions(bytes, parsed, resolutions)
  if (next === null) {
    // The file changed since the page read it. Nothing is written: the page
    // re-reads and the reader chooses again against what is really there.
    return { ok: false, ...coded('stale-conflict', { path }), reason: 'stale' }
  }

  try {
    await writeFile(absolute, next)
  } catch (error) {
    return { ok: false, error: errorMessage(error), reason: 'error' }
  }

  const stages = await conflictStages(root, path)
  return {
    ok: true,
    conflict: describeConflict(path, next, stages ?? { base: false, ours: false, theirs: false }),
  }
}

/**
 * Tell Git that one path is resolved, without writing it.
 *
 * The reader who edited the file themselves, or who resolved every block and
 * wants one last look before committing to it, has nothing left to write. `git
 * add` is the whole of that decision — and it is the only place a conflicted path
 * is ever staged, because on an unmerged path `add` means "resolved", which no
 * bulk action can decide for the reader.
 *
 * @param target - the process substrate and the session's directory.
 * @param path - the repository-relative path.
 * @returns the fresh status, or the refusal.
 */
export async function markResolved(target: GitTarget, path: string): Promise<ResolveDonePayload> {
  const repo = await resolveRepo(target)
  if ('refusal' in repo) return { ok: false, ...repo.refusal, reason: repo.reason }
  const root = inDir(target, repo.root)

  return withRepoWrite(repo.root, async () => {
    if (await conflictStages(root, path) === null) {
      return { ok: false, ...coded('not-conflicted', { path }), reason: 'not-conflicted' }
    }
    const add = await runGit(root, ['add', '-A', '--', literalPath(path)])
    const failure = writeFailure(add)
    if (failure !== null) return { ...failure, reason: 'error' }
    return indexAnswer(target)
  })
}

/**
 * Finish the merge a conflicted merge or pull left in progress.
 *
 * Git already wrote the message a merge commit should carry into `MERGE_MSG` —
 * `Merge branch 'feat' into main`, and the conflict note under it — so the form
 * that finishes a merge has two honest states: the reader emptied it, and
 * `--no-edit` records Git's words unchanged; or the reader wrote their own, and
 * `-m` records those. Neither opens an editor, which matters because there is
 * none behind this seam.
 *
 * Only a merge is finished here. A rebase and a cherry-pick continue by applying
 * the next commit, which is a different question from "record the resolution",
 * so they are refused rather than half-finished.
 *
 * @param target - the process substrate and the session's directory.
 * @param message - the reader's own message, or nothing to keep Git's.
 * @returns the commit that was made, or the refusal.
 */
export async function completeMerge(target: GitTarget, message?: string): Promise<OperationPayload> {
  const repo = await resolveRepo(target)
  if ('refusal' in repo) return { ok: false, ...repo.refusal, reason: repo.reason }
  const root = inDir(target, repo.root)

  return withRepoWrite(repo.root, async () => {
    const operation = await readOperation(root)
    if (operation !== 'merge') {
      return { ok: false, ...coded('no-operation'), reason: 'no-operation' }
    }

    const unmerged = await runGit(root, ['diff', '--name-only', '--diff-filter=U'])
    if (unmerged.code === 0 && unmerged.stdout.trim() !== '') {
      return { ok: false, ...coded('complete-conflict'), reason: 'conflict' }
    }

    const words = message?.trim() ?? ''
    const run = await runGit(root, words === '' ? ['commit', '--no-edit'] : ['commit', '-m', words])
    if (run.failure !== undefined) return { ok: false, error: run.failure, reason: 'error' }
    if (run.code !== 0) {
      const text = diagnosticText(run)
      if (MISSING_IDENTITY.test(text)) {
        return { ok: false, ...coded('commit-identity'), reason: 'error' }
      }
      return { ok: false, ...refusalOf(run), reason: 'error' }
    }

    const status = await readStatus(target)
    if (status.ok !== true) return { ok: false, ...refusalOfStatus(status), reason: 'error' }
    return { ok: true, status, summary: 'Merged' }
  })
}

/**
 * The refusal one payload's own failure amounts to, for a nested read.
 *
 * A write route that re-reads the status has already succeeded by the time the
 * read can fail, so the read's reason is carried over rather than re-derived.
 *
 * @param payload - the failed status answer.
 * @returns the coded refusal, or its text.
 */
function refusalOfStatus(payload: StatusPayload): Refusal {
  if (payload.failure !== undefined) return { failure: payload.failure }
  return { error: payload.error ?? 'could not read the status after the write' }
}

/**
 * The branch HEAD is on, or null while HEAD is detached.
 *
 * `symbolic-ref` is the only reader that distinguishes "on a branch" from
 * "detached": `status --branch` spells the latter `HEAD (no branch)`, which this
 * half would then have to pattern-match. Exit code 1 is a detached HEAD.
 *
 * @param root - the repository root and the process substrate.
 * @returns the short branch name.
 */
async function currentBranch(root: GitTarget): Promise<string | null> {
  const head = await runGit(root, ['symbolic-ref', '--short', '-q', 'HEAD'])
  if (head.code !== 0) return null
  const name = head.stdout.trim()
  return name === '' ? null : name
}

/**
 * The full name of the current branch's upstream, e.g. `origin/main`.
 *
 * `@{upstream}` is the only reader that answers this the way Git's own push and
 * pull do —including a renamed or unusually configured remote —instead of
 * this half re-deriving `remote` + `merge` from the configuration.
 *
 * @param root - the repository root and the process substrate.
 * @returns the upstream, or undefined when the branch has none.
 */
async function upstreamOf(root: GitTarget): Promise<string | undefined> {
  const upstream = await runGit(root, ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{upstream}'])
  if (upstream.code !== 0) return undefined
  const name = upstream.stdout.trim()
  return name === '' ? undefined : name
}

/**
 * The configured remote names, in configuration order.
 *
 * @param root - the repository root and the process substrate.
 * @returns the remote names; empty when the repository has none.
 */
async function remotesOf(root: GitTarget): Promise<readonly string[]> {
  const list = await runGit(root, ['remote'])
  if (list.code !== 0) return []
  return list.stdout.split('\n').map(name => name.trim()).filter(name => name !== '')
}

/**
 * The refusal each half of the round trip reports for a state it cannot move.
 *
 * Both halves ask the same three questions before either touches the network,
 * so the answers differ only in which operation they name —and that name is
 * the first word of a code, because the sentences belong to the page and read
 * differently in each language.
 */
const ACTION_REFUSAL: Readonly<Record<'pull' | 'push', {
  readonly noCommits: FailureCode
  readonly detached: FailureCode
  readonly dirty: FailureCode
}>> = {
  pull: {
    noCommits: 'pull-no-commits',
    detached: 'pull-detached',
    dirty: 'pull-dirty',
  },
  push: {
    noCommits: 'push-no-commits',
    detached: 'push-detached',
    dirty: 'push-dirty',
  },
}

/** Where a pull or a push would run, or why it cannot run at all. */
type Handoff =
  | { readonly ok: true; readonly root: GitTarget; readonly branch: string }
  | { readonly ok: false; readonly payload: SyncPayload }

/**
 * Resolve the repository and the branch a remote hand-off runs against.
 *
 * Pull and push ask the same three questions before either touches the network —?
 * is there a repository, does it have a commit, and is HEAD on a branch —and
 * must answer them in the same order, so the guard is taken once here and each
 * operation then names only itself. Without a branch there is nothing to hand
 * off, which is why the guard, not the caller, states that refusal.
 *
 * @param target - the process substrate and the session's directory.
 * @param action - which operation is asking, for its own refusal messages.
 * @returns the repository root and its branch, or the payload to answer with.
 */
async function resolveHandoff(target: GitTarget, action: 'pull' | 'push'): Promise<Handoff> {
  const repo = await resolveRepo(target)
  if ('refusal' in repo) {
    return { ok: false, payload: { ok: false, ...repo.refusal, reason: repo.reason, action } }
  }
  if (!repo.hasHead) {
    return {
      ok: false,
      payload: { ok: false, ...coded(ACTION_REFUSAL[action].noCommits), reason: 'error', action },
    }
  }

  const root = inDir(target, repo.root)
  const branch = await currentBranch(root)
  if (branch === null) {
    return {
      ok: false,
      payload: { ok: false, ...coded(ACTION_REFUSAL[action].detached), reason: 'detached', action },
    }
  }
  return { ok: true, root, branch }
}

/**
 * Refresh every remote-tracking ref from its remote.
 *
 * This is the one network operation with nothing to decide. It moves no branch,
 * no HEAD, and no working tree, so it cannot conflict, cannot be blocked by
 * uncommitted work, and cannot be refused by a detached or unborn HEAD —it is
 * asked for by a reader who wants the page's idea of the remotes to be current,
 * and the answer is either "done" or why the network would not answer.
 *
 * `--all` rather than a bare `fetch`: with no remote named, Git fetches the
 * current branch's upstream remote (or `origin`), which would leave every other
 * remote in the branch list as stale as it was. `--prune` is deliberately *not*
 * passed: dropping a ref is a deletion the reader did not ask for, and a
 * repository configured with `fetch.prune` gets it anyway, because this runs
 * Git's own defaults for everything it does not name.
 *
 * @param target - the process substrate and the session's directory.
 * @returns the outcome, including the reason a fetch was refused.
 */
export async function fetchRemotes(target: GitTarget): Promise<FetchPayload> {
  const repo = await resolveRepo(target)
  if ('refusal' in repo) return { ok: false, ...repo.refusal, reason: repo.reason }

  const root = inDir(target, repo.root)
  const run = await runGit(root, ['fetch', '--all'], { timeoutMs: GIT_NETWORK_TIMEOUT_MS })
  if (run.failure !== undefined) return { ok: false, error: run.failure, reason: 'error' }
  if (run.code !== 0) return fetchFailure(run)
  return { ok: true }
}

/**
 * Describe why a fetch was refused.
 *
 * One case is worth separating: credentials the remote rejected. Everything
 * else is Git's
 * own first line —`Could not resolve host` and friends —which is more specific
 * than anything this half could invent.
 *
 * @param run - the failed fetch invocation.
 * @returns the payload the page renders.
 */
function fetchFailure(run: GitRun): FetchPayload {
  const auth = authRefusal(diagnosticText(run))
  if (auth !== null) return { ok: false, ...auth, reason: 'auth' }
  return { ok: false, ...refusalOf(run), reason: 'error' }
}

/**
 * Refresh just the current branch's upstream ref.
 *
 * The branch switch's own follow-up. A switch re-reads the working tree, but the
 * ahead/behind counts the page draws are read from the local remote-tracking
 * refs, and a checkout does not move those: a branch the remote has moved past
 * would read as level with it until someone fetched. That is the one answer the
 * sync control must not give, because it is what tells the reader whether the
 * remote has changes for this branch at all.
 *
 * The fetch names the branch's own remote rather than every remote (`--all`) or
 * a hand-built refspec: the upstream's short name is already known, but writing
 * it as a refspec would mean re-deriving the remote's own fetch mapping, while
 * naming the remote runs the configured refspecs and refreshes exactly the ref
 * `@{upstream}` resolves to. Every other ref of that remote comes along, which is
 * the same trade `fetchRemotes` makes for the whole repository.
 *
 * A repository with nothing to refresh —no commit, a detached HEAD, or a branch
 * that tracks nothing —answers `skipped` rather than an error: this runs after a
 * switch that has already been reported, and none of the three leaves the reader
 * anything to act on.
 *
 * @param target - the process substrate and the session's directory.
 * @returns the outcome, including `skipped` when there was nothing to fetch.
 */
export async function fetchUpstream(target: GitTarget): Promise<FetchUpstreamPayload> {
  const repo = await resolveRepo(target)
  if ('refusal' in repo) return { ok: false, ...repo.refusal, reason: repo.reason }
  if (!repo.hasHead) return { ok: true, skipped: true }

  const root = inDir(target, repo.root)
  if (await currentBranch(root) === null) return { ok: true, skipped: true }
  const upstream = await upstreamOf(root)
  if (upstream === undefined) return { ok: true, skipped: true }

  const split = splitRemote(await remotesOf(root), upstream)
  if (split === null) return { ok: true, skipped: true }

  const run = await runGit(root, ['fetch', split.remote], { timeoutMs: GIT_NETWORK_TIMEOUT_MS })
  if (run.failure !== undefined) return { ok: false, error: run.failure, reason: 'error' }
  if (run.code !== 0) return fetchFailure(run)
  return { ok: true }
}

/**
 * Pull the current branch from its upstream.
 *
 * The three flags are deliberate, and together they are the whole shape of this
 * feature: a one-click sync brings the remote in with a merge and nothing else.
 *
 * `--no-rebase` replaces an inherited `pull.rebase` / `branch.<name>.rebase`,
 * because a rebase rewrites this branch's history, which is not something a
 * button that says "sync" should do behind the reader's back.
 *
 * `--ff` replaces an inherited `pull.ff` / `merge.ff` as well. This one is the
 * difference between "works" and "works on some repositories": a repository
 * configured `merge.ff = only` (a not-uncommon hand setting, and what several
 * GUI guides recommend) makes a plain `git pull --no-rebase` refuse the merge
 * with `Not possible to fast-forward, aborting` and Git's own advice to merge by
 * hand or rebase. Stating `--ff` on the command line overrides that setting and
 * restores the only policy this route means: fast-forward when the histories
 * allow it, join them with a merge commit when they do not.
 *
 * `--no-edit` names the message's provenance: nobody writes it, and no editor
 * can be opened to ask. Git fills a merge commit's subject itself —
 * `Merge branch 'main' of <remote> into main` — and that is the message this
 * shape is for.
 *
 * The merge may fast-forward (the common case), or it may join the two histories
 * with that merge commit, or it may conflict. A conflicted merge is left in the
 * tree exactly as a conflicted `git merge` is: the conflict list resolves it, and
 * `completeMerge` records it.
 *
 * @param target - the process substrate and the session's directory.
 * @returns the outcome, including the reason a pull was refused.
 */
export async function pullFromRemote(target: GitTarget): Promise<SyncPayload> {
  const handoff = await resolveHandoff(target, 'pull')
  if (!handoff.ok) return handoff.payload

  const upstream = await upstreamOf(handoff.root)
  if (upstream === undefined) {
    return {
      ok: false,
      ...coded('pull-no-upstream', { branch: handoff.branch }),
      reason: 'no-upstream',
      action: 'pull',
    }
  }

  const run = await runGit(handoff.root, ['pull', '--ff', '--no-rebase', '--no-edit'], {
    timeoutMs: GIT_NETWORK_TIMEOUT_MS,
  })
  if (run.failure !== undefined) return { ok: false, error: run.failure, reason: 'error', action: 'pull' }
  if (run.code !== 0) {
    if (await conflictedMerge(handoff.root, run)) {
      return {
        ok: false,
        ...coded('pull-conflict', { branch: handoff.branch }),
        reason: 'conflict',
        action: 'pull',
      }
    }
    return syncFailure(run, 'pull')
  }

  return syncSuccess(run, 'pull', upstream)
}

/**
 * Push the current branch to its upstream, or set one up when there is none.
 *
 * A branch with no upstream is the normal state of a branch that has just been
 * created, and `git push` refuses it by design. Rather than guess, this asks
 * which remotes exist: with exactly one, pushing to it and recording it as the
 * upstream is what the user meant; with none or several, the answer is a
 * question this page cannot answer, and it says so.
 *
 * @param target - the process substrate and the session's directory.
 * @returns the outcome, including the reason a push was refused.
 */
export async function pushToRemote(target: GitTarget): Promise<SyncPayload> {
  const handoff = await resolveHandoff(target, 'push')
  if (!handoff.ok) return handoff.payload

  const { root, branch } = handoff
  let ref = await upstreamOf(root)
  let args: readonly string[] = ['push']
  if (ref === undefined) {
    const remotes = await remotesOf(root)
    const remote = remotes[0]
    if (remote === undefined) {
      return { ok: false, ...coded('push-no-remote'), reason: 'no-remote', action: 'push' }
    }
    if (remotes.length > 1) {
      return {
        ok: false,
        ...coded('push-ambiguous-remote', { remotes: remotes.join(', ') }),
        reason: 'ambiguous-remote',
        action: 'push',
      }
    }
    ref = `${remote}/${branch}`
    args = ['push', '--set-upstream', remote, branch]
  }

  const run = await runGit(root, args, { timeoutMs: GIT_NETWORK_TIMEOUT_MS })
  if (run.failure !== undefined) return { ok: false, error: run.failure, reason: 'error', action: 'push' }
  if (run.code !== 0) return syncFailure(run, 'push')

  return syncSuccess(run, 'push', ref)
}

/**
 * The Host's own one-line account of a pull or a push that ran.
 *
 * Git words the three outcomes itself — already in step, moved forward, or
 * updated — and the page has one sentence per operation, so the interesting
 * half is only whether anything moved.
 *
 * @param run - the successful invocation.
 * @param action - which operation ran.
 * @param label - what the summary calls the other side.
 * @returns the payload the page renders.
 */
function syncSuccess(run: GitRun, action: 'pull' | 'push', label: string): SyncPayload {
  const output = `${run.stdout}\n${run.stderr}`
  if (action === 'pull') {
    return {
      ok: true,
      action,
      summary: /Already up[ -]to[ -]date/i.test(output) ? `Already up to date with ${label}` : `Pulled from ${label}`,
    }
  }
  return {
    ok: true,
    action,
    summary: /Everything up[ -]to[ -]date/i.test(output) ? `Everything up to date with ${label}` : `Pushed to ${label}`,
  }
}

/**
 * Describe why a pull or a push was refused.
 *
 * The cases worth separating are the ones the user can act on: a divergent
 * history, a dirty working tree, and credentials the remote rejected.
 * Everything else is Git's own first line, which is more specific than anything
 * this half could invent.
 *
 * @param run - the failed invocation.
 * @param action - which operation failed, for the message.
 * @returns the payload the page renders.
 */
function syncFailure(run: GitRun, action: 'pull' | 'push'): SyncPayload {
  // Git's own words, for every case below.
  const text = diagnosticText(run)
  if (DIRTY_WORKTREE.test(text)) {
    return { ok: false, ...coded(ACTION_REFUSAL[action].dirty), reason: 'dirty', action }
  }

  if (action === 'pull' && /Not possible to fast-forward|diverging branches|divergent branches/i.test(text)) {
    return { ok: false, ...coded('pull-diverged'), reason: 'diverged', action }
  }

  if (action === 'push' && /non-fast-forward|fetch first|behind its remote|\[rejected\]/i.test(text)) {
    // The one button pulls before it pushes, so this refusal means the remote
    // moved again between the two halves rather than that nobody pulled.
    return { ok: false, ...coded('push-behind'), reason: 'diverged', action }
  }

  return { ok: false, ...refusalOf(run), reason: 'error', action }
}

/**
 * One queue of repository writes per repository root.
 *
 * Stage, unstage, discard, both commit routes, the conflict resolver's writes,
 * and the merge commit that finishes one all write the repository. The
 * index writers among them take Git's `index.lock`, and two overlapping is a lock
 * error the user did not cause; a discard and a block resolution write the
 * worktree instead, but they still must not interleave with a stage that is
 * re-reading the state it came from. The page already disables its own controls
 * while one is in flight, but a second window, the agent in the same repository,
 * or a stale answer can still arrive at the same moment, so the Host serializes
 * the routes themselves. The queue is keyed by root because two repositories have
 * no reason to wait on each other, and dropped when the last write finishes so it
 * holds no state of its own.
 *
 * The resolver's write is the one that depends on being inside the queue for more
 * than mutual exclusion: it re-reads the index and the file under the lock, so the
 * region key the page sent is checked against the bytes that are really there.
 */
const writeQueues = new Map<string, Promise<unknown>>()

/**
 * Run one repository write after every earlier one for the same repository.
 *
 * @param root - the repository root the write belongs to.
 * @param run - the write to run, once the queue reaches it.
 * @returns whatever the write answered.
 */
async function withRepoWrite<T>(root: string, run: () => Promise<T>): Promise<T> {
  const previous = writeQueues.get(root) ?? Promise.resolve()
  const next = previous.catch(() => undefined).then(run)
  writeQueues.set(root, next)
  try {
    return await next
  } finally {
    // Only the tail clears the entry: an earlier write finishing while a later
    // one is queued must not drop the later write's place.
    if (writeQueues.get(root) === next) writeQueues.delete(root)
  }
}

/**
 * Re-read the status after one repository write, and shape it as the route's answer.
 *
 * The status is read inside the queue, after the write, so the lists the page
 * paints are the state that write produced rather than a read that raced it.
 *
 * @param target - the process substrate and the session's directory.
 * @returns the fresh status, or why it could not be read.
 */
async function indexAnswer(target: GitTarget): Promise<IndexPayload> {
  const status = await readStatus(target)
  if (status.ok === true) return { ok: true, status }
  return {
    ok: false,
    ...(status.failure === undefined
      ? { error: status.error ?? 'could not read the status after the index write' }
      : { failure: status.failure }),
    reason: status.reason === 'no-repo' ? 'no-repo' : 'error',
  }
}

/**
 * Move one path into the index.
 *
 * `-A` rather than a bare `add`: the path may be a deletion (a removed file has
 * no worktree content to add) or an untracked file, and `-A` is what makes one
 * call cover both without deciding from the row the page drew. `--` ends the
 * options so a path that begins with a dash is a path.
 *
 * @param target - the process substrate and the session's directory.
 * @param path - the repository-relative path to stage.
 * @returns the fresh status, or the refusal.
 */
export async function stagePath(target: GitTarget, path: string): Promise<IndexPayload> {
  const repo = await resolveRepo(target)
  if ('refusal' in repo) return { ok: false, ...repo.refusal, reason: repo.reason }
  const root = inDir(target, repo.root)

  return withRepoWrite(repo.root, async () => {
    const add = await runGit(root, ['add', '-A', '--', literalPath(path)])
    return writeFailure(add) ?? indexAnswer(target)
  })
}

/**
 * Move one path out of the index, keeping the worktree file.
 *
 * `git restore --staged` is the normal answer: it puts the index entry back to
 * HEAD and leaves the file on disk alone, which is exactly "unstage". An unborn
 * branch has no HEAD to restore from, so its index entries are removed instead —?
 * the file becomes untracked again, which is what it was before it was staged.
 *
 * A staged rename is two index entries —the new path added and the old one
 * removed —so the row's source path is restored in the same call. Restoring only
 * the destination would leave the deletion of the source staged: half a rename,
 * which is not a state the row it came from can describe.
 *
 * @param path - the repository-relative path to unstage.
 * @param origPath - the rename/copy source, when the row has one.
 * @returns the fresh status, or the refusal.
 */
export async function unstagePath(
  target: GitTarget,
  path: string,
  origPath?: string,
): Promise<IndexPayload> {
  const repo = await resolveRepo(target)
  if ('refusal' in repo) return { ok: false, ...repo.refusal, reason: repo.reason }
  const root = inDir(target, repo.root)
  const paths = (origPath === undefined ? [path] : [path, origPath]).map(literalPath)

  return withRepoWrite(repo.root, async () => {
    const restore = repo.hasHead
      ? await runGit(root, ['restore', '--staged', '--', ...paths])
      : await runGit(root, ['rm', '--cached', '--', ...paths])
    return writeFailure(restore) ?? indexAnswer(target)
  })
}

/**
 * Discard one path's unstaged change.
 *
 * A tracked path is restored from the index —`git restore --worktree` —so a
 * file that is staged and then edited again keeps the staged half and loses only
 * the worktree half; the index is never touched. An untracked path has no index
 * entry to restore, so `git clean -f` deletes the file itself instead. Both are
 * destructive in the worktree, which is why the page asks before calling this.
 *
 * @param target - the process substrate and the session's directory.
 * @param path - the repository-relative path to discard.
 * @param untracked - whether the path is untracked, which is deleted rather than restored.
 * @returns the fresh status, or the refusal.
 */
export async function discardPath(
  target: GitTarget,
  path: string,
  untracked: boolean,
): Promise<IndexPayload> {
  const repo = await resolveRepo(target)
  if ('refusal' in repo) return { ok: false, ...repo.refusal, reason: repo.reason }
  const root = inDir(target, repo.root)

  return withRepoWrite(repo.root, async () => {
    const discard = untracked
      ? await runGit(root, ['clean', '-f', '--', literalPath(path)])
      : await runGit(root, ['restore', '--worktree', '--', literalPath(path)])
    return writeFailure(discard) ?? indexAnswer(target)
  })
}

/** Whether one repository-relative file path sits inside a folder path. */
function inFolder(path: string, folder: string): boolean {
  return path.startsWith(`${folder}/`)
}

/** The NUL-separated pathspec list the `--pathspec-from-file` commands read. */
function pathspecInput(paths: readonly string[]): string {
  return paths.map(literalPath).join('\0') + '\0'
}

/** The two options that make a Git command read its pathspecs from standard input. */
const PATHSPEC_STDIN = ['--pathspec-from-file=-', '--pathspec-file-nul'] as const

/**
 * The changed paths under one folder, or the refusal that stopped the read.
 * The status is read inside the write queue, so a folder write acts on the paths
 * the repository holds when the write runs rather than on the page's possibly
 * older list. A folder route names a directory, never its files: a tree with
 * thousands of untracked paths would otherwise have to cross the request body.
 *
 * @param root - the repository root and the process substrate.
 * @param folder - the repository-relative folder path, or null for every path.
 * @returns the files under the folder, or the failure payload to answer with.
 */
async function folderStatus(
  root: GitTarget,
  folder: string | null,
): Promise<
  | { readonly ok: true; readonly files: readonly ChangedFile[] }
  | { readonly ok: false; readonly payload: IndexPayload }
> {
  const status = await runGit(root, STATUS_PATH_ARGS)
  if (status.failure !== undefined) {
    return { ok: false, payload: { ok: false, error: status.failure, reason: 'error' } }
  }
  if (status.code !== 0) {
    return { ok: false, payload: { ok: false, ...refusalOf(status), reason: 'error' } }
  }
  return {
    ok: true,
    files: parseStatus(status.stdout).files
      .filter(file => folder === null || inFolder(file.path, folder)),
  }
}

/**
 * The failure one write command amounts to, or null when it succeeded.
 *
 * Every index and worktree write shares the same two checks — transport and
 * Git's own refusal — so the check lives here once. A payload that words the
 * failure its own way still reads this shape and adds what it knows.
 *
 * @param run - the command's outcome.
 * @returns the failure payload, or null when the command succeeded.
 */
function writeFailure(run: GitRun): IndexPayload | null {
  if (run.failure !== undefined) return { ok: false, error: run.failure, reason: 'error' }
  if (run.code !== 0) return { ok: false, ...refusalOf(run), reason: 'error' }
  return null
}

/**
 * Stage every change under one folder.
 *
 * The paths come from the status the queue reads, not from the request: the page
 * names a folder, and the Host resolves which paths under it are still waiting
 * in the worktree. Conflicted paths are left out on purpose —`git add` on one
 * means "resolved", and a folder action cannot know that the reader finished
 * editing every conflict it contains.
 *
 * @param target - the process substrate and the session's directory.
 * @param folder - the repository-relative folder to stage, or null for every path.
 * @returns the fresh status, or the refusal.
 */
async function stageScope(target: GitTarget, folder: string | null): Promise<IndexPayload> {
  const repo = await resolveRepo(target)
  if ('refusal' in repo) return { ok: false, ...repo.refusal, reason: repo.reason }
  const root = inDir(target, repo.root)

  return withRepoWrite(repo.root, async () => {
    const read = await folderStatus(root, folder)
    if (!read.ok) return read.payload
    const paths = read.files
      .filter(file => file.conflicted !== true && (file.unstaged || file.untracked))
      .map(file => file.path)
    if (paths.length === 0) return indexAnswer(target)
    const add = await runGit(root, ['add', '-A', ...PATHSPEC_STDIN], { stdin: pathspecInput(paths) })
    return writeFailure(add) ?? indexAnswer(target)
  })
}

/**
 * Move every staged change under one folder out of the index.
 *
 * A staged rename is two index entries, so both halves of every rename are named
 * together, exactly as the single-path unstage does. An unborn branch has no HEAD
 * to restore from, so its index entries are removed instead and the files become
 * untracked again.
 *
 * @param target - the process substrate and the session's directory.
 * @param folder - the repository-relative folder to unstage, or null for every path.
 * @returns the fresh status, or the refusal.
 */
async function unstageScope(target: GitTarget, folder: string | null): Promise<IndexPayload> {
  const repo = await resolveRepo(target)
  if ('refusal' in repo) return { ok: false, ...repo.refusal, reason: repo.reason }
  const root = inDir(target, repo.root)

  return withRepoWrite(repo.root, async () => {
    const read = await folderStatus(root, folder)
    if (!read.ok) return read.payload
    const paths = [...new Set(read.files
      .filter(file => file.staged && file.conflicted !== true)
      .flatMap(file => file.origPath === undefined ? [file.path] : [file.path, file.origPath]))]
    if (paths.length === 0) return indexAnswer(target)
    const restore = repo.hasHead
      ? await runGit(root, ['restore', '--staged', ...PATHSPEC_STDIN], { stdin: pathspecInput(paths) })
      : await runGit(root, ['rm', '--cached', ...PATHSPEC_STDIN], { stdin: pathspecInput(paths) })
    return writeFailure(restore) ?? indexAnswer(target)
  })
}

/**
 * Discard every unstaged change under one folder.
 *
 * A tracked path is restored from the index, so a folder holding a partly staged
 * file loses only that file's worktree half and keeps what the index holds. An
 * untracked path is deleted, and because `git clean` takes no pathspec-from-file
 * the folder itself is the pathspec: it removes exactly the untracked paths under
 * the folder the list was drawn from, while ignored files stay untouched unless
 * they were asked for (they never are). Conflicted paths are left alone —their
 * worktree state is the reader's resolution in progress.
 *
 * @param target - the process substrate and the session's directory.
 * @param folder - the repository-relative folder to discard, or null for every path.
 * @returns the fresh status, or the refusal.
 */
async function discardScope(target: GitTarget, folder: string | null): Promise<IndexPayload> {
  const repo = await resolveRepo(target)
  if ('refusal' in repo) return { ok: false, ...repo.refusal, reason: repo.reason }
  const root = inDir(target, repo.root)

  return withRepoWrite(repo.root, async () => {
    const read = await folderStatus(root, folder)
    if (!read.ok) return read.payload
    const tracked = read.files
      .filter(file => file.conflicted !== true && file.unstaged && !file.untracked)
      .map(file => file.path)
    const untracked = read.files.some(file => file.untracked)
    if (tracked.length === 0 && !untracked) return indexAnswer(target)
    if (tracked.length > 0) {
      const restore = await runGit(
        root,
        ['restore', '--worktree', ...PATHSPEC_STDIN],
        { stdin: pathspecInput(tracked) },
      )
      const failure = writeFailure(restore)
      if (failure !== null) return failure
    }
    if (untracked) {
      const clean = folder === null
        ? await runGit(root, ['clean', '-f', '-d'])
        : await runGit(root, ['clean', '-f', '-d', '--', literalPath(folder)])
      const failure = writeFailure(clean)
      if (failure !== null) return failure
    }
    return indexAnswer(target)
  })
}

/** Stage every change under one folder (see `stageScope`). */
export function stageFolder(target: GitTarget, folder: string): Promise<IndexPayload> {
  return stageScope(target, folder)
}

/**
 * Stage every changed path in the repository, from every folder.
 *
 * The page's header action names no directory: it stands for the whole worktree
 * list, and the Host resolves that list from the status it reads in the queue.
 *
 * @param target - the process substrate and the session's directory.
 * @returns the fresh status, or the refusal.
 */
export function stageAll(target: GitTarget): Promise<IndexPayload> {
  return stageScope(target, null)
}

/** Move every staged change under one folder out of the index (see `unstageScope`). */
export function unstageFolder(target: GitTarget, folder: string): Promise<IndexPayload> {
  return unstageScope(target, folder)
}

/**
 * Move every staged change in the repository out of the index.
 *
 * @param target - the process substrate and the session's directory.
 * @returns the fresh status, or the refusal.
 */
export function unstageAll(target: GitTarget): Promise<IndexPayload> {
  return unstageScope(target, null)
}

/** Discard every unstaged change under one folder (see `discardScope`). */
export function discardFolder(target: GitTarget, folder: string): Promise<IndexPayload> {
  return discardScope(target, folder)
}

/**
 * Discard every unstaged change in the repository, from every folder.
 *
 * The clean step has no folder to name, so it runs over the whole worktree
 * without a pathspec; ignored files are still left alone because the command is
 * never given `-x`.
 *
 * @param target - the process substrate and the session's directory.
 * @returns the fresh status, or the refusal.
 */
export function discardAll(target: GitTarget): Promise<IndexPayload> {
  return discardScope(target, null)
}

/**
 * Read back the commit Git just wrote, the same way the history reads one.
 *
 * A failure here is not a failed commit —the commit is already made —so the
 * answer stays a success and simply names nothing.
 *
 * @param root - the repository root and the process substrate.
 * @returns the success payload, with the summary when it could be read.
 */
async function readMadeCommit(root: GitTarget): Promise<CommitAllPayload> {
  const made = await runGit(root, ['log', '-1', `--pretty=format:${LOG_FORMAT}`])
  if (made.code !== 0) return { ok: true }
  const summary = parseSummary(made.stdout.split(FIELD))
  return summary === undefined ? { ok: true } : { ok: true, commit: summary }
}

/**
 * Stage every change and commit it under one message.
 *
 * The tree is read before it is touched, and both refusals that matter come out
 * of that read. A tree with nothing in it is not a commit that Git would fail to
 * make —?nothing to commit" is a state, and the answer says so as one. And a
 * tree holding an unmerged path is refused before `git add -A` runs: staging a
 * conflicted file resolves it as far as Git is concerned, so a commit made then
 * would record conflict markers as the resolution, which is a commit nobody can
 * mean and one this page has no way to take back.
 *
 * What is committed is deliberately everything the page is listing —tracked
 * edits, deletions, and untracked files alike —because that is the decision
 * this route's button offers. The message is the route's to validate; by the
 * time it arrives here it is non-empty text.
 *
 * @param target - the process substrate and the session's directory.
 * @param message - the commit message, already trimmed and checked by the route.
 * @returns the outcome, including the reason a commit did not happen.
 */
export async function commitAll(target: GitTarget, message: string): Promise<CommitAllPayload> {
  const repo = await resolveRepo(target)
  if ('refusal' in repo) return { ok: false, ...repo.refusal, reason: repo.reason }
  const root = inDir(target, repo.root)

  return withRepoWrite(repo.root, async () => {
    const status = await runGit(root, STATUS_PATH_ARGS)
    if (status.code !== 0) return { ok: false, ...refusalOf(status), reason: 'error' }

    const files = parseStatus(status.stdout).files
    if (files.length === 0) return emptyCommit()
    if (files.some(file => file.conflicted)) return conflictedCommit()

    // `-A` is what makes the two halves one decision: it stages a new path, a
    // deletion, and an edit in the same pass, from the repository root, whatever
    // the session's own directory is.
    const add = await runGit(root, ['add', '-A'])
    if (add.failure !== undefined) return { ok: false, error: add.failure, reason: 'error' }
    if (add.code !== 0) return commitFailure(add)

    // No `--no-verify`: a repository's own hooks are part of what committing to it
    // means, and a hook that refuses is reported as the refusal it is.
    //
    // `-F -` puts the message on stdin rather than on the command line: a commit
    // message is free text, and a Windows PowerShell 5.1 executor drops the
    // double quotes out of native arguments (it has no quoting layer to escape
    // them), so `-m` would silently change what the user wrote.
    const commit = await runGit(root, ['commit', '-F', '-'], { stdin: message })
    if (commit.failure !== undefined) return { ok: false, error: commit.failure, reason: 'error' }
    if (commit.code !== 0) return commitFailure(commit)

    return readMadeCommit(root)
  })
}

/**
 * Commit the index as it stands, under one message.
 *
 * The opposite trade from {@link commitAll}: nothing is staged here, because the
 * page's own `+` and `−` actions are what decided the index, and a commit that
 * quietly staged the rest would make those actions meaningless. The checks that
 * remain are the ones Git would make anyway, worded so the page can say which
 * happened: an unfinished merge, or an index with nothing in it to record.
 *
 * @param target - the process substrate and the session's directory.
 * @param message - the commit message, already trimmed and checked by the route.
 * @returns the outcome, including the reason a commit did not happen.
 */
export async function commitStaged(target: GitTarget, message: string): Promise<CommitAllPayload> {
  const repo = await resolveRepo(target)
  if ('refusal' in repo) return { ok: false, ...repo.refusal, reason: repo.reason }
  const root = inDir(target, repo.root)

  return withRepoWrite(repo.root, async () => {
    const status = await runGit(root, STATUS_PATH_ARGS)
    if (status.code !== 0) return { ok: false, ...refusalOf(status), reason: 'error' }

    const files = parseStatus(status.stdout).files
    if (files.some(file => file.conflicted)) return conflictedCommit()
    if (!files.some(file => file.staged)) return nothingStagedCommit()

    const commit = await runGit(root, ['commit', '-F', '-'], { stdin: message })
    if (commit.failure !== undefined) return { ok: false, error: commit.failure, reason: 'error' }
    if (commit.code !== 0) return commitFailure(commit, 'staged')

    return readMadeCommit(root)
  })
}

/**
 * Take the commit at HEAD back off the branch, keeping everything it recorded.
 *
 * The reset is soft on purpose. A mixed or hard reset would also rewrite the
 * index or the working tree, and the commit's changes would then have to be
 * rediscovered by the reader; a soft reset leaves both exactly as the commit
 * made them, so what the commit held comes back as staged changes. The branch
 * loses one entry in its history and nothing else.
 *
 * Three states are refused before the reset runs. A merge, rebase, or
 * cherry-pick in progress means HEAD is part of an operation this reset would
 * step over. A first commit has no parent to step back to, and resetting past it
 * would leave the branch unborn — a state this page has no way to undo. No
 * commit at all is the read's own empty state.
 *
 * The commit summary is read before the reset, while HEAD still names it, so
 * the answer can report which commit moved even though it is no longer on the
 * branch. A summary that cannot be read is not a failed undo: the reset already
 * happened, so the answer stays a success and simply names nothing.
 *
 * @param target - the process substrate and the session's directory.
 * @returns the outcome, including the reason no commit was undone.
 */
export async function undoLastCommit(target: GitTarget): Promise<UndoCommitPayload> {
  const repo = await resolveRepo(target)
  if ('refusal' in repo) return { ok: false, ...repo.refusal, reason: repo.reason }
  if (!repo.hasHead) return { ok: false, ...coded('no-commits'), reason: 'no-commits' }
  const root = inDir(target, repo.root)

  return withRepoWrite(repo.root, async () => {
    const operation = await readOperation(root)
    if (operation !== undefined) {
      return { ok: false, ...coded('commit-undo-operation'), reason: 'operation' }
    }

    // `HEAD^` is checked before the reset rather than inferred from the exit
    // code of `reset`: a first commit would otherwise be reported as Git's
    // ambiguous "bad revision" instead of as the state it is.
    const parent = await runGit(root, ['rev-parse', '--verify', '--quiet', 'HEAD^'])
    if (parent.failure !== undefined) return { ok: false, error: parent.failure, reason: 'error' }
    if (parent.code !== 0) return { ok: false, ...coded('commit-undo-root'), reason: 'root' }

    const made = await runGit(root, ['log', '-1', `--pretty=format:${LOG_FORMAT}`])
    const commit = made.code === 0 ? parseSummary(made.stdout.split(FIELD)) : undefined

    // `--soft` is the whole decision: HEAD moves to the parent, the index and
    // the worktree are not touched, and the commit's changes reappear as staged.
    const reset = await runGit(root, ['reset', '--soft', 'HEAD^'])
    if (reset.failure !== undefined) return { ok: false, error: reset.failure, reason: 'error' }
    if (reset.code !== 0) return { ok: false, ...refusalOf(reset), reason: 'error' }

    return commit === undefined ? { ok: true } : { ok: true, commit }
  })
}

/** The answer for a tree that holds nothing to commit. */
function emptyCommit(): CommitAllPayload {
  return { ok: false, ...coded('commit-clean'), reason: 'clean' }
}

/** The answer for an index that holds nothing to commit. */
function nothingStagedCommit(): CommitAllPayload {
  return { ok: false, ...coded('commit-nothing-staged'), reason: 'clean' }
}

/** The answer for a tree whose merge is not finished. */
function conflictedCommit(): CommitAllPayload {
  return { ok: false, ...coded('commit-conflict'), reason: 'conflict' }
}

/**
 * Describe why a commit was refused.
 *
 * The cases worth separating are races against the read above — a merge that was
 * aborted after it, and a tree another process emptied — and a missing author
 * identity, which Git reports as a state the user can fix rather than as a fault
 * of this repository. Everything else, a refusing hook and a signing failure
 * among them, is Git's own first line, which is more specific than anything this
 * half could invent.
 *
 * @param run - the failed invocation.
 * @param scope - which commit was asked for, so "nothing to commit" says which
 *   half it found empty.
 * @returns the payload the page renders.
 */
function commitFailure(run: GitRun, scope: CommitScope = 'all'): CommitAllPayload {
  const text = diagnosticText(run)
  if (/unmerged|merging is not possible|you have unmerged files/i.test(text)) return conflictedCommit()
  if (/nothing to commit|nothing added to commit|no changes added to commit/i.test(text)) {
    return scope === 'staged' ? nothingStagedCommit() : emptyCommit()
  }
  if (MISSING_IDENTITY.test(text)) {
    return { ok: false, ...coded('commit-identity'), reason: 'error' }
  }

  return { ok: false, ...refusalOf(run), reason: 'error' }
}

/**
 * Build one commit summary from a split formatted record.
 *
 * @param fields - the record split on the unit separator.
 * @returns the summary, or undefined when the record is too short to trust.
 */
function parseSummary(fields: readonly string[]): CommitSummary | undefined {
  const [hash, short, author, email, date, parents, refs, subject] = fields
  if (hash === undefined || hash === '') return undefined
  return {
    hash,
    short: short ?? '',
    author: author ?? '',
    email: email ?? '',
    date: date ?? '',
    subject: subject ?? '',
    refs: (refs ?? '').split(',').map(ref => ref.trim()).filter(ref => ref !== ''),
    parents: (parents ?? '').split(' ').filter(parent => parent !== ''),
  }
}

/**
 * Clamp a caller-supplied history depth into the accepted range.
 *
 * @param limit - the requested depth.
 * @returns a positive integer no greater than {@link MAX_LOG_LIMIT}.
 */
function clampLimit(limit: number): number {
  if (!Number.isFinite(limit)) return DEFAULT_LOG_LIMIT
  return Math.min(MAX_LOG_LIMIT, Math.max(1, Math.trunc(limit)))
}
