/**
 * The Host half's Git reader, and its four writers.
 *
 * Every fact about the repository is produced by running the real `git` binary
 * through the `shell` capability seam — never by reading `.git` by hand. That
 * keeps this plugin honest about the things Git is authoritative for (the index,
 * renames, merge state, `core.*` configuration, `.gitignore`) and inherits the
 * session's own file policy: `routes.ts` resolves the calling session's mode and
 * workspace root, every command carries that policy on its request, and the Git
 * tab can therefore never exceed what the session may already do. Without it the
 * seam would fall back to the deployment's mode and root — a `read-only` default
 * under a `workspace-write` session — and refuse the very writes the session
 * allows.
 *
 * Reading is the bulk of this module. Six commands change something — the
 * branch switch, the merge, the fetch, the fast-forward pull, the push, and the
 * commit — and each reports a sandbox refusal as such rather than as a Git
 * error, because under a `read-only` mode that refusal is the whole answer. The
 * commit is the one that writes the index as well as the history, which is why
 * it is a single call rather than a stage the page could leave half-finished.
 *
 * Three properties of the invocation matter and are easy to lose:
 *
 *   - `--no-pager` on every command: without it a pager would hold the pipe open
 *     and the command would sit there until its timeout.
 *   - `GIT_OPTIONAL_LOCKS=0`: `git status` otherwise refreshes the index, which
 *     is a write. Every read must also work in a `read-only` sandbox — and taking
 *     a lock it does not need would fight the agent's own `git` calls in the same
 *     repository.
 *   - `-c core.quotePath=false`: Git otherwise C-quotes any path holding a
 *     non-ASCII byte (`"\346\226\207.md"`), and those paths then cannot be
 *     matched back to the ones `status` reported.
 *
 * Process output is parsed here rather than in the browser: the browser half has
 * no Node context, and parsing next to the command keeps the JSON contract in
 * `shared/contract.ts` the only thing the two halves must agree on.
 */

import { existsSync } from 'node:fs'
import { join } from 'node:path'

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
  type CommitSummary,
  type CreateBranchPayload,
  type DeleteBranchesPayload,
  type DiffPayload,
  type FailureCode,
  type FetchPayload,
  type LogPayload,
  type MergePayload,
  type StatusPayload,
  type SyncPayload,
} from '../shared/contract.js'
import { errorMessage } from '../shared/error.js'
import { coded, type Refusal } from './refusal.js'

/** Wall-clock bound per Git invocation; a hung command is killed, not waited on. */
const GIT_TIMEOUT_MS = 20_000

/**
 * The exit code Git uses for its own fatal refusals.
 *
 * `git rev-parse --show-toplevel` outside a repository is one of them, and it is
 * the answer `resolveRepo` reads as "this directory has no repository". A
 * command that never reached Git — no `git` on `PATH`, a sandbox denial, a shell
 * that could not parse the line — exits with something else on POSIX, so the
 * code is how the two are told apart there.
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
 * A fetch or a push legitimately takes longer than a local read — a slow remote
 * or a large pack is not a hung command — so the local bound would kill a
 * transfer that was still making progress.
 */
const GIT_NETWORK_TIMEOUT_MS = 180_000

/**
 * Wall-clock bound for one credential helper's answer.
 *
 * A helper that reads a store answers at once; the bound is here so a helper
 * that decides to wait for an interactive sign-in cannot hold the page.
 */
const CREDENTIAL_TIMEOUT_MS = 30_000

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
 * What Git prints when a merge could not be applied cleanly.
 *
 * A conflict is a state on disk rather than a mistake in the request, and it is
 * the one merge answer the page words itself: the merge is aborted (see
 * `mergeBranch`), so the sentence has to say both that it failed and that
 * nothing was left behind. `git merge` prints one `CONFLICT` line per path and
 * then a summary sentence; the summary alone is enough to recognize it.
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
 * What Git prints when the credential helper itself could not start.
 *
 * Git for Windows runs every credential helper through its bundled MSYS `sh`,
 * and a confined sandbox can deny that runtime the pipe it creates at startup —
 * the helper then never reads the saved credential, and Git falls back to a
 * terminal prompt this plugin has disabled. That is a different failure from a
 * remote that rejected a credential, and the page words it differently.
 */
const CREDENTIAL_HELPER_UNAVAILABLE =
  /couldn't create signal pipe|failed to execute prompt script|unable to start the credential helper/i

/**
 * What Git prints when the remote refused the credentials this machine holds.
 *
 * Each transport words it differently — HTTPS asks for a username a
 * non-interactive session cannot supply, SSH names the key it could not use —
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
 * has no force to offer — restating it is what keeps the page from advertising a
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

/** Environment every invocation shares: no pager, no prompt, no index write. */
const GIT_ENV: Readonly<Record<string, string>> = {
  GIT_OPTIONAL_LOCKS: '0',
  GIT_TERMINAL_PROMPT: '0',
  GIT_PAGER: 'cat',
}

/**
 * The status invocation both the sidebar and the message generator start from.
 *
 * `--branch` adds the `## ...` header as the first NUL-terminated record, and
 * `--untracked-files=all` names every untracked file rather than collapsing each
 * directory of them into one row. The digest ignores the header; it reads the
 * same command so the two views of the tree cannot disagree.
 */
const STATUS_ARGS = ['status', '--porcelain=v1', '-z', '--branch', '--untracked-files=all'] as const

/** One Git invocation's outcome, resolved rather than thrown. */
interface GitRun {
  /** The process exit code, or null when it was killed by a signal. */
  readonly code: number | null
  readonly stdout: string
  readonly stderr: string
  /** The collected stdout hit the Host's bound; the text is incomplete. */
  readonly truncated: boolean
  /** Infrastructure failure (missing service, spawn error) — not a Git failure. */
  readonly failure?: string
  /** The sandbox refused the command instead of running it. */
  readonly denied?: boolean
}

/** A resolved repository, or the reason it cannot be used. */
type RepoResolution =
  | { readonly root: string; readonly hasHead: boolean }
  | { readonly refusal: Refusal; readonly reason: 'no-repo' | 'error' }

/**
 * Everything one request needs to run Git.
 *
 * The file policy travels with the shell rather than being re-derived per
 * command: the seam applies the policy a request carries, and an agentless call
 * would otherwise fall back to the deployment's own mode and root — which is
 * how a `workspace-write` session ends up refused a write it is allowed to make.
 * See `routes.ts` for where the policy is resolved from the session.
 */
export interface GitTarget {
  /** The `shell` capability service. */
  readonly shell: any
  /** The directory the command runs in. */
  readonly workdir: string
  /**
   * The calling session's resolved file policy, when the mounted executor
   * confines. Absent for an unconfined executor, or a request with no session.
   */
  readonly sandboxPolicy?: unknown
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
 * Which text domain the mounted shell executor parses the command string in.
 *
 * `ctx.shell` is one seam over two domains: the POSIX providers run the string
 * through `bash -c`, and the Windows providers hand it to `pwsh -Command`, which
 * parses PowerShell itself. A command line is therefore written for the parser
 * that will read it — quoting is a property of the executor, not of Git.
 */
type ShellFlavor = 'posix' | 'powershell'

/**
 * Which domain the shell service in this composition speaks.
 *
 * The PowerShell executor publishes the `pwshPath` it resolved (see
 * `@deepseek-ai/dsh-pwsh-local`), so its presence is the executor's own answer
 * to this question — the seam itself carries no platform fact. A provider that
 * announces nothing falls back to the host platform, which is where every
 * shipped executor runs; the POSIX providers were the only ones before Windows
 * had a counterpart.
 *
 * @param shell - the `shell` capability service.
 * @returns the parser that will read this plugin's command strings.
 */
function shellFlavor(shell: any): ShellFlavor {
  if (typeof shell?.pwshPath === 'string') return 'powershell'
  return process.platform === 'win32' ? 'powershell' : 'posix'
}

/**
 * Quote one value for the shell line the seam runs.
 *
 * Every argument that is not a literal this module wrote must survive as a
 * single word, and both parsers take a single-quoted word literally — no
 * expansion, no backslash processing — so the only character that can end such
 * a word is a single quote itself. Each domain closes and reopens that word its
 * own way: POSIX escapes the quote outside the word, PowerShell doubles it
 * inside.
 *
 * @param value - the raw argument.
 * @param flavor - the parser that will read the line.
 * @returns a single quoted shell word.
 */
function quote(value: string, flavor: ShellFlavor): string {
  if (flavor === 'powershell') return `'${value.replace(/'/g, "''")}'`
  return `'${value.replace(/'/g, `'\\''`)}'`
}

/**
 * Build one shell line from literal words, quoted for the parser that reads it.
 *
 * @param words - the executable and its arguments, unquoted.
 * @param flavor - the parser that will read the line.
 * @returns the command string handed to `shell.resolve`.
 */
function shellCommand(words: readonly string[], flavor: ShellFlavor): string {
  const quoted = words.map((word) => quote(word, flavor))
  // PowerShell reads a quoted word in command position as a string expression,
  // and only the call operator runs it as a command; POSIX already runs a
  // quoted first word (and `&` there would background it instead).
  return flavor === 'powershell' ? `& ${quoted.join(' ')}` : quoted.join(' ')
}

/**
 * Build the full command line for one Git invocation.
 *
 * @param args - the subcommand and its arguments, each quoted individually.
 * @param flavor - the parser that will read the line.
 * @returns the command string handed to `shell.resolve`.
 */
function command(args: readonly string[], flavor: ShellFlavor): string {
  return shellCommand(['git', '--no-pager', '-c', 'core.quotePath=false', ...args], flavor)
}

/** How one shell invocation is bounded and fed, beyond its command line. */
interface InvocationOptions {
  readonly timeoutMs?: number
  readonly stdin?: string
  /** Extra environment on top of the Git defaults. */
  readonly env?: Readonly<Record<string, string>>
}

/**
 * Run one command line through the shell seam and collect its result.
 *
 * @param target - the shell seam, the directory, and the file policy to run under.
 * @param line - the full shell line, already quoted.
 * @param options - the bound, standard input, and environment for it.
 * @returns the invocation's outcome; never rejects.
 */
async function invoke(
  target: GitTarget,
  line: string,
  options: InvocationOptions = {},
): Promise<GitRun> {
  const { shell, sandboxPolicy } = target
  const request = {
    command: line,
    workdir: target.workdir,
    timeoutMs: options.timeoutMs ?? GIT_TIMEOUT_MS,
    onExpiry: 'kill' as const,
    stdoutMaxBytes: MAX_STDOUT_BYTES,
    env: { ...GIT_ENV, ...options.env },
    // Carried only when there is one: an unconfined executor takes no policy,
    // and the seam stays free to apply its own fallback then.
    ...(sandboxPolicy === undefined ? {} : { sandboxPolicy }),
    ...(options.stdin === undefined ? {} : { stdin: options.stdin }),
  }

  // resolve → execute → result is the seam's three-step protocol, and a throw at
  // any of the three is the same kind of failure: the command never reached Git,
  // so it is reported as infrastructure rather than as a Git answer.
  try {
    const spec = shell.resolve(request)
    const execution = await shell.execute(spec)
    const result = await execution.result()
    const code: number | null = typeof result?.exitCode === 'number' ? result.exitCode : null
    return {
      code,
      stdout: typeof result?.stdout?.text === 'string' ? result.stdout.text : '',
      stderr: typeof result?.stderr?.text === 'string' ? result.stderr.text : '',
      truncated: result?.stdout?.truncated === true,
      denied: result?.sandbox?.denied === true,
    }
  } catch (error) {
    return failureRun(errorMessage(error))
  }
}

/**
 * Run one Git command and collect its result.
 *
 * The outcome is returned as it came back rather than judged here: which exit
 * codes are a normal answer differs per command, and every caller reads them
 * itself.
 *
 * @param target - the shell seam, the directory, and the file policy to run under.
 * @param args - subcommand and arguments, before quoting.
 * @param options - the bound, standard input, and environment for it.
 * @returns the invocation's outcome; never rejects.
 */
async function runGit(
  target: GitTarget,
  args: readonly string[],
  options: InvocationOptions = {},
): Promise<GitRun> {
  return invoke(target, command(args, shellFlavor(target.shell)), options)
}

/** An outcome that never reached Git, so the caller reports it as infrastructure. */
function failureRun(error: string): GitRun {
  return { code: null, stdout: '', stderr: '', truncated: false, failure: error }
}

/**
 * Git's own diagnosis of a failed command, as one block of text.
 *
 * Git reports a refusal on stderr and leaves stdout for the case where it has
 * nothing to say there — a `pull` that refuses a divergence prints its advice on
 * stdout — so the two are read in that order.
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
 * Git writes its diagnosis to stderr; a sandbox denial is reported by the seam
 * instead and would otherwise read as an empty message. Only the two cases the
 * page words itself are coded — a denial, and a command that said nothing at
 * all — because every other refusal is Git's own first line, which is more
 * specific than anything this half could invent and cannot be translated.
 *
 * @param run - the failed invocation.
 * @returns the coded refusal, or the text Git printed.
 */
function refusalOf(run: GitRun): Refusal {
  if (run.denied === true) return coded('git-denied')
  const text = diagnosticText(run)
  if (text === '') return coded('git-exit', { code: run.code ?? 'null' })
  return { error: text.split('\n')[0] ?? text }
}

/**
 * The refusal a credential problem amounts to, when the diagnosis is one.
 *
 * The helper case is tested first on purpose: a helper a confined sandbox kept
 * from starting leaves Git with nobody to ask for a credential, which reads like
 * an authentication failure but is the sandbox's answer. Every route that can
 * cross the network shares this, because Git words the same two failures for a
 * fetch, a pull, a push, and a remote delete.
 *
 * @param text - Git's own diagnosis of the failed invocation.
 * @returns the coded refusal, or null when the failure is not about credentials.
 */
function authRefusal(text: string): Refusal | null {
  if (CREDENTIAL_HELPER_UNAVAILABLE.test(text)) return coded('auth-helper')
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
 * @param target - the shell seam, the session's directory, and the file policy.
 * @returns the root and HEAD state, or the reason it cannot be used.
 */
async function resolveRepo(target: GitTarget): Promise<RepoResolution> {
  const top = await runGit(target, ['rev-parse', '--show-toplevel'])
  if (top.failure !== undefined) return { refusal: { error: top.failure }, reason: 'error' }
  if (top.code !== 0) {
    // Git's own "no repository here" answer — a fatal exit on POSIX, and the
    // same sentence on Windows, whose PowerShell 5.1 executor reports every
    // failed native command as exit 1. Any other nonzero exit is a failure to
    // state as such: reporting every one of them as an empty directory is how a
    // shell that could not run the command read as a directory holding no
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
 * @param target - the shell seam, the session's directory, and the file policy.
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
 * @param target - the shell seam, the session's directory, and the file policy.
 * @returns the status payload the page renders its sidebar from.
 */
export async function readStatus(target: GitTarget): Promise<StatusPayload> {
  const repo = await resolveRepo(target)
  if ('refusal' in repo) return { ok: false, ...repo.refusal, reason: repo.reason }

  const root = inDir(target, repo.root)
  const status = await runGit(root, STATUS_ARGS)
  if (status.code !== 0) return { ok: false, ...refusalOf(status), reason: 'error' }

  const parsed = parseStatus(status.stdout)

  let head: StatusPayload['head'] = null
  if (repo.hasHead) {
    const log = await runGit(root, ['log', '-1', `--pretty=format:${HEAD_FORMAT}`])
    if (log.code === 0) {
      const [hash = '', short = '', date = '', subject = ''] = log.stdout.split(FIELD)
      head = { hash, short, date, subject }
    }
  }

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
  }
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
 * @param target - the shell seam, the session's directory, and the file policy.
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
 * @param target - the shell seam, the session's directory, and the file policy.
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
 * Read one path's difference against HEAD.
 *
 * A tracked path is diffed against HEAD rather than against the index, so a
 * file with both staged and unstaged edits shows everything that differs from
 * the last commit in one patch — which is what the row's own "show this file's
 * changes" means. An untracked path has no HEAD side at all, so it is diffed
 * against `/dev/null`; a repository without commits compares against the index
 * or the worktree, whichever side the row says holds the change.
 *
 * @param target - the shell seam, the session's directory, and the file policy.
 * @param file - the changed path, as `status` reported it.
 * @returns the unified diff, or the reason there is none.
 */
export async function readDiff(
  target: GitTarget,
  file: Pick<ChangedFile, 'path' | 'staged' | 'untracked'>,
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
  } else if (!repo.hasHead) {
    diff = await runGit(root, [
      'diff', ...(file.staged ? ['--cached'] : []), ...base, '--', file.path,
    ])
  } else {
    diff = await runGit(root, ['diff', 'HEAD', '-M', ...base, '--', file.path])
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
 * sample is the evidence for that style: ten messages are enough for a pattern —
 * a tag, a language, a body — to show, and few enough to stay a footnote beside
 * the patch.
 */
const STYLE_SAMPLE_COMMITS = 10

/**
 * Longest one sampled message may be, in characters.
 *
 * A message is a subject and usually a few lines; the bound is here so that one
 * enormous body — a squashed release note, a template nobody trimmed — cannot
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
   * What Git printed for this path against `/dev/null`: its `--stat` line —
   * which is where a binary file's byte size appears — and then its patch, cut
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
     * the request that resolved it — a second `rev-parse` would only repeat a
     * question this answer already holds.
     */
    readonly root: string
    /** Every changed path, in the order `git status` named them. */
    readonly files: readonly ChangedFile[]
    /**
     * `git diff --stat` of the tracked changes: one line per path, following the
     * patch's own shape but carrying the file's magnitude — the only place a
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
 * HEAD to compare against, so the staged half is asked for by name — the index
 * against the empty tree — and the unstaged half follows; the two are
 * concatenated rather than merged because both are already in the same format
 * and neither can name a path the other does not.
 *
 * @param root - the repository root, with the session's file policy.
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
 * answer here — the two sides always differ, an empty file included — and the
 * `--stat` line is asked for in the same invocation as the patch, because it is
 * where a binary file's size appears and a second command would only repeat the
 * same walk.
 *
 * A path whose read fails is left out of the previews: it stays on the list the
 * prompt opens with, because `git status` named it, and the alternative — one
 * unreadable file failing the whole request — would take the message away over a
 * file the model was only ever going to look at.
 *
 * @param root - the repository root, with the session's file policy.
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
 * other reason, reads as no sample — the generator then falls back to the commit
 * rules, which is a better answer than taking the message away over a style it
 * could not read.
 *
 * @param root - the repository root, with the session's file policy.
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
 * because the prompt is one request — a message generator that walked the tree
 * path by path would run three commands per changed file — and because the model
 * is meant to see the changes as one change set rather than as an answer per
 * row.
 *
 * The one thing here that is not a change is the style sample: the branch's own
 * recent messages, which the prompt asks the model to write in the manner of.
 *
 * @param target - the shell seam, the session's directory, and the file policy.
 * @returns the digest, or why the repository could not be read.
 */
export async function readChangeDigest(target: GitTarget): Promise<ChangeDigest> {
  const repo = await resolveRepo(target)
  if ('refusal' in repo) return { ok: false, refusal: repo.refusal, reason: repo.reason }
  const root = inDir(target, repo.root)

  const status = await runGit(root, STATUS_ARGS)
  if (status.code !== 0) return { ok: false, refusal: refusalOf(status), reason: 'error' }
  const files = parseStatus(status.stdout).files
  const recentMessages = await readRecentMessages(root, repo.hasHead)
  if (files.length === 0) {
    return {
      ok: true,
      root: repo.root,
      files,
      stat: '',
      patch: '',
      patchTruncated: false,
      untracked: [],
      recentMessages,
    }
  }

  const stat = await runTrackedDiff(root, repo.hasHead, ['--stat'])
  if (stat.code !== 0) return { ok: false, refusal: refusalOf(stat), reason: 'error' }
  const diff = await runTrackedDiff(root, repo.hasHead, ['--unified=3'])
  if (diff.code !== 0) return { ok: false, refusal: refusalOf(diff), reason: 'error' }
  const patch = cutAtLine(diff.stdout, MAX_DIGEST_PATCH_CHARS)

  return {
    ok: true,
    root: repo.root,
    files,
    stat: stat.stdout.trim(),
    patch: patch.text,
    patchTruncated: patch.truncated || diff.truncated,
    untracked: await readUntrackedPreviews(root, files),
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
 * @param root - the repository root, with the session's file policy.
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
 * is switchable is not a filter applied here: a remote branch is a real choice —
 * checking it out is what creates the local branch that tracks it — so the page
 * shows both and the switch decides what to do with each.
 *
 * @param target - the shell seam, the session's directory, and the file policy.
 * @returns the two branch lists and which branch HEAD is on.
 */
export async function readBranches(target: GitTarget): Promise<BranchesPayload> {
  const repo = await resolveRepo(target)
  if ('refusal' in repo) return { ok: false, ...repo.refusal, reason: repo.reason }

  const root = inDir(target, repo.root)
  const locals = await readRefNames(root, 'refs/heads/')
  if (!locals.ok) return { ok: false, ...locals.refusal, reason: 'error' }
  const remotes = await readRefNames(root, 'refs/remotes/')
  if (!remotes.ok) return { ok: false, ...remotes.refusal, reason: 'error' }

  const current = await currentBranch(root)

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
 * branch that tracks it is created — or, when it already exists, switched to,
 * because that is what the pick meant. The local name is derived here rather
 * than left to Git's own guess so the exists-check and the branch Git is told to
 * create can never disagree.
 *
 * What a ref name may look like is Git's rule and is not restated here: a name
 * that no ref answers to is already an unknown branch, so a second, weaker
 * pattern would only turn names Git accepts — non-ASCII ones among them — into a
 * refusal of this plugin's own invention.
 *
 * The switch itself runs as `git switch`, whose argument is unambiguously a
 * branch rather than a path; Git older than 2.23 does not have that subcommand,
 * and the retry with `checkout` is what keeps those installations working.
 *
 * This is the one route that writes: a checkout replaces files in the working
 * tree. It is therefore also the one place the session's file policy is
 * load-bearing, and a refusal is reported as such rather than as a Git error.
 *
 * @param target - the shell seam, the session's directory, and the file policy.
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
 * the way and the sandbox's answer told apart from Git's.
 *
 * @param root - the repository root, with the session's file policy.
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
 * @param root - the repository root, with the session's file policy.
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
 * @param root - the repository root, with the session's file policy.
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
 * No match means no configured remote owns the ref — a stale directory left by a
 * removed remote — and the caller states that rather than inventing a name.
 *
 * @param root - the repository root, with the session's file policy.
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
 * — a stale directory left by a removed remote — which the caller states rather
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
  if (run.denied === true) {
    return { ok: false, ...coded('checkout-denied'), reason: 'denied' }
  }

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
  if (!DIRTY_WORKTREE.test(text)) return null
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
 * is what keeps a name Git accepts — non-ASCII ones among them — from being
 * refused by a rule that does not exist. The one check made here is the one Git
 * cannot make cheaply: whether the name is already taken, which is a refusal the
 * page words rather than a bare `fatal` from a race.
 *
 * Creating at another point is a switch, so a working tree in the way refuses it
 * in the switch's own words, and the session's file policy is as load-bearing
 * here as it is there.
 *
 * @param target - the shell seam, the session's directory, and the file policy.
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
 * @param root - the repository root, with the session's file policy.
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
 * A dirty working tree is worded with the switch's own sentence — the operation
 * is a switch, and the paths Git named are the same paths — while the other two
 * cases are this operation's own: a name taken between the check and the call,
 * and a session that may not write.
 *
 * @param run - the failed invocation.
 * @param name - the branch the request was creating.
 * @returns the payload the page renders.
 */
function createFailure(run: GitRun, name: string): CreateBranchPayload {
  if (run.denied === true) {
    return { ok: false, ...coded('create-denied'), reason: 'denied' }
  }

  const text = diagnosticText(run)
  const dirty = dirtyRefusal(text)
  if (dirty !== null) return { ok: false, ...dirty, reason: 'dirty' }
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
 * @param root - the repository root, with the session's file policy.
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
 * This is half of `git branch -d`'s own rule — the other half is the branch's
 * upstream — and it is asked as one walk rather than one `merge-base` per branch
 * because the dialog's marks have to be drawn from a fixed number of calls.
 *
 * The answer is deliberately not cut at the list's own bound. A branch the page
 * shows must be classified, and which branches a `--count` would keep depends on
 * a sort that has nothing to do with which ones are merged, so a cut here would
 * mark an arbitrary branch as unmerged. What comes back is one short name per
 * line, which is the smallest answer this question has.
 *
 * @param root - the repository root, with the session's file policy.
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
 * HEAD reaches it — three answers that cost walks the switch dialog would pay
 * for on every open and never read.
 *
 * A remote-tracking branch is marked by the same rule as a local one, and the
 * rule reads differently there: a remote branch HEAD does not reach is the
 * ordinary case rather than a warning, so what the row says is simply that these
 * commits are on that remote and nowhere else in this repository. Which remote
 * owns the ref is resolved against the configured names rather than cut out of
 * the ref, because a local branch may itself be called `origin/main`.
 *
 * @param target - the shell seam, the session's directory, and the file policy.
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
 * would mean reading Git's own prose back — text that is translated, and whose
 * misreading would mark a branch deleted that is still there. The exit code of
 * one call per branch is an answer no locale can change.
 *
 * Nothing here offers a force. `-d` is the whole gate, and it is the right one:
 * it refuses exactly the branches whose commits would be left reachable from
 * nothing, which is the promise every mark in the dialog is making.
 *
 * @param target - the shell seam, the session's directory, and the file policy.
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
 * cannot be handed a full ref — a fully-qualified name is answered with "branch
 * not found" — so this is the one place a name this half passes on is not
 * already unambiguous.
 *
 * @param root - the repository root, with the session's file policy.
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
 * @param root - the repository root, with the session's file policy.
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
 * is standing on — the current one included — is the case the dialog disables.
 * Both sentences name the branch, because a batch's answer is read one line at a
 * time and a line that does not say which branch it is about is not an answer.
 *
 * @param run - the failed invocation.
 * @param name - the branch the request was deleting.
 * @returns the coded refusal, or Git's own first line.
 */
function deleteFailure(run: GitRun, name: string): Refusal {
  if (run.denied === true) return coded('delete-denied')

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
 * everything else is Git's own first line — a missing ref, an unreachable host,
 * a rejected hook — which is more specific than anything this half could invent.
 *
 * @param run - the failed push invocation.
 * @param branch - the branch name on the remote, for the one refusal that names it.
 * @returns the coded refusal, or Git's own first line.
 */
function remoteDeleteFailure(run: GitRun, branch: string): Refusal {
  if (run.denied === true) return coded('delete-denied')

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
 * direction — the current branch into a branch nobody is standing on — would be a
 * checkout, a merge, and a checkout back: three working-tree moves for one
 * intention, buying two saved clicks at the price of a commit made on a branch
 * the page is not showing, where nothing on screen would show it happen.
 *
 * A conflicting merge is aborted rather than left in the tree. The page has no
 * way to finish one — the commit form refuses while unmerged paths exist — so an
 * unfinished merge is exactly the state the fast-forward-only pull was shaped to
 * avoid. Aborting puts the working tree back where it was and words the refusal;
 * the branch is then merged by hand, with Git's own tools and markers.
 *
 * @param target - the shell seam, the session's directory, and the file policy.
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
 * half's own — which is also what keeps a name Git accepts from being refused by
 * a rule that does not exist. A new branch's starting point is resolved by the
 * same rule, so that resolution is reused here rather than restated.
 *
 * @param root - the repository root, with the session's file policy.
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
 * @param root - the repository root, with the session's file policy.
 * @param source - the branch to merge in.
 * @returns the outcome, including the reason a merge was refused.
 */
async function mergeIn(root: GitTarget, source: string): Promise<MergePayload> {
  const run = await runGit(root, ['merge', '--no-edit', source])
  if (run.code === 0) return { ok: true, branch: source, summary: mergeSummary(run, source) }
  if (run.failure !== undefined) return { ok: false, error: run.failure, reason: 'error' }

  if (await conflictedMerge(root, run)) {
    await runGit(root, ['merge', '--abort'])
    return { ok: false, ...coded('merge-conflict', { branch: source }), reason: 'conflict' }
  }
  return mergeFailure(run)
}

/**
 * Whether a failed merge left conflicts behind, or never started one.
 *
 * The pattern is Git's own summary sentence, and the fallback asks the index:
 * a merge that failed before touching the tree — a refused fast-forward, an
 * unrelated history — has no unmerged paths and must not be aborted, because
 * there is nothing to abort.
 *
 * @param root - the repository root, with the session's file policy.
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
 * The two coded cases are the ones the page can act on: a sandbox that forbids
 * writing at all, and a working tree with local changes in the way. Everything
 * else is Git's own first line — `refusing to merge unrelated histories` and
 * friends — which is more specific than anything this half could invent.
 *
 * @param run - the failed merge invocation.
 * @returns the payload the page renders.
 */
function mergeFailure(run: GitRun): MergePayload {
  if (run.denied === true) return { ok: false, ...coded('merge-denied'), reason: 'denied' }
  if (DIRTY_WORKTREE.test(diagnosticText(run))) {
    return { ok: false, ...coded('merge-dirty'), reason: 'dirty' }
  }
  return { ok: false, ...refusalOf(run), reason: 'error' }
}

/**
 * The Host's own one-line account of a merge that ran.
 *
 * Git says which of the three things happened in its own words — the two sides
 * were already equal, one moved up to the other, or a commit joined them — and
 * the account is built from that rather than from a guess.
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
 * The branch HEAD is on, or null while HEAD is detached.
 *
 * `symbolic-ref` is the only reader that distinguishes "on a branch" from
 * "detached": `status --branch` spells the latter `HEAD (no branch)`, which this
 * half would then have to pattern-match. Exit code 1 is a detached HEAD.
 *
 * @param root - the repository root, with the session's file policy.
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
 * pull do — including a renamed or unusually configured remote — instead of
 * this half re-deriving `remote` + `merge` from the configuration.
 *
 * @param root - the repository root, with the session's file policy.
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
 * @param root - the repository root, with the session's file policy.
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
 * so the answers differ only in which operation they name — and that name is
 * the first word of a code, because the sentences belong to the page and read
 * differently in each language.
 */
const ACTION_REFUSAL: Readonly<Record<'pull' | 'push', {
  readonly noCommits: FailureCode
  readonly detached: FailureCode
  readonly denied: FailureCode
  readonly dirty: FailureCode
}>> = {
  pull: {
    noCommits: 'pull-no-commits',
    detached: 'pull-detached',
    denied: 'pull-denied',
    dirty: 'pull-dirty',
  },
  push: {
    noCommits: 'push-no-commits',
    detached: 'push-detached',
    denied: 'push-denied',
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
 * Pull and push ask the same three questions before either touches the network —
 * is there a repository, does it have a commit, and is HEAD on a branch — and
 * must answer them in the same order, so the guard is taken once here and each
 * operation then names only itself. Without a branch there is nothing to hand
 * off, which is why the guard, not the caller, states that refusal.
 *
 * @param target - the shell seam, the session's directory, and the file policy.
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
 * uncommitted work, and cannot be refused by a detached or unborn HEAD — it is
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
 * @param target - the shell seam, the session's directory, and the file policy.
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
 * Two cases, and the second is the one worth separating: a sandbox that forbids
 * writing at all, and credentials the remote rejected. Everything else is Git's
 * own first line — `Could not resolve host` and friends — which is more specific
 * than anything this half could invent.
 *
 * @param run - the failed fetch invocation.
 * @returns the payload the page renders.
 */
function fetchFailure(run: GitRun): FetchPayload {
  if (run.denied === true) return { ok: false, ...coded('fetch-denied'), reason: 'denied' }

  const auth = authRefusal(diagnosticText(run))
  if (auth !== null) return { ok: false, ...auth, reason: 'auth' }

  return { ok: false, ...refusalOf(run), reason: 'error' }
}

/**
 * Pull the current branch from its upstream.
 *
 * `--ff-only` is deliberate, and it is the whole shape of this feature: a plain
 * `git pull` would invent a merge commit (a commit nobody wrote a message for)
 * and, when the two sides conflict, would leave the working tree in a merge this
 * page has no way to finish or abort. A fast-forward either applies cleanly or
 * is refused with the one thing the user can act on — that the branches have
 * diverged.
 *
 * @param target - the shell seam, the session's directory, and the file policy.
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

  const run = await runGit(handoff.root, ['pull', '--ff-only'], { timeoutMs: GIT_NETWORK_TIMEOUT_MS })
  if (run.failure !== undefined) return { ok: false, error: run.failure, reason: 'error', action: 'pull' }
  if (run.code !== 0) {
    const failure = syncFailure(run, 'pull')
    if (failure.failure?.code === 'auth-helper') {
      const retried = await retryWithStoredCredential(
        handoff.root, ['pull', '--ff-only'], 'pull', handoff.branch, upstream,
      )
      if (retried !== undefined) return retried
    }
    return failure
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
 * @param target - the shell seam, the session's directory, and the file policy.
 * @returns the outcome, including the reason a push was refused.
 */
export async function pushToRemote(target: GitTarget): Promise<SyncPayload> {
  const handoff = await resolveHandoff(target, 'push')
  if (!handoff.ok) return handoff.payload

  const { root, branch } = handoff
  let ref = await upstreamOf(root)
  let args: readonly string[] = ['push']
  let remoteName: string | undefined
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
    remoteName = remote
    ref = `${remote}/${branch}`
    args = ['push', '--set-upstream', remote, branch]
  }

  const run = await runGit(root, args, { timeoutMs: GIT_NETWORK_TIMEOUT_MS })
  if (run.failure !== undefined) return { ok: false, error: run.failure, reason: 'error', action: 'push' }
  if (run.code !== 0) {
    const failure = syncFailure(run, 'push')
    if (failure.failure?.code === 'auth-helper') {
      const retried = await retryWithStoredCredential(
        root, args, 'push', branch, ref, remoteName,
      )
      if (retried !== undefined) return retried
    }
    return failure
  }

  return syncSuccess(run, 'push', ref)
}

/**
 * Describe why a pull or a push was refused.
 *
 * The five cases worth separating are the ones the user can act on: a sandbox
 * that forbids writing at all, a divergent history, a dirty working tree,
 * credentials the remote rejected, and a credential helper that a confined
 * sandbox kept from starting at all. Everything else is Git's own first line,
 * which is more specific than anything this half could invent.
 *
 * @param run - the failed invocation.
 * @param action - which operation failed, for the message.
 * @returns the payload the page renders.
 */
function syncFailure(run: GitRun, action: 'pull' | 'push'): SyncPayload {
  if (run.denied === true) {
    return { ok: false, ...coded(ACTION_REFUSAL[action].denied), reason: 'denied', action }
  }

  // Git's own words, for every case below.
  const text = diagnosticText(run)

  const auth = authRefusal(text)
  if (auth !== null) return { ok: false, ...auth, reason: 'auth', action }

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

/** One configured credential helper, invoked without Git's shell bridge. */
interface CredentialHelper {
  /** The helper executable, as a path the OS can start directly. */
  readonly executable: string
  /** Arguments configured beside it. */
  readonly args: readonly string[]
}

/** One credential a helper handed back. */
interface StoredCredential {
  readonly username: string
  readonly password: string
}

/**
 * Split one `credential.helper` value into an executable and its arguments.
 *
 * Git starts a helper through the shell, which is exactly what a confined
 * Windows sandbox can deny. This reader starts the executable directly, so a
 * value that needs the shell — a `!` snippet, a variable, a glob, redirection —
 * is not one it can honor and is skipped.
 *
 * @param value - one configured helper value.
 * @returns the executable and arguments, or undefined when it needs a shell.
 */
function helperInvocation(value: string): { executable: string; args: string[] } | undefined {
  const trimmed = value.trim()
  if (trimmed === '' || trimmed.startsWith('!')) return undefined
  if (/['"`$~%;&|<>()]/.test(trimmed)) return undefined
  const [executable, ...args] = trimmed.split(/\s+/)
  if (executable === undefined || executable === '') return undefined
  return { executable, args }
}

/**
 * Where a bare helper name's executable lives.
 *
 * Git looks for `git-credential-<name>` on its exec path, and the Windows
 * helpers (Git Credential Manager among them) also sit in the directory beside
 * it; a PATH entry is the last resort, for an install that put it there.
 *
 * @param executable - the configured value's first word.
 * @param execPath - `git --exec-path`, when the repository answered it.
 * @returns the existing executable path, or undefined.
 */
function helperExecutable(executable: string, execPath: string | undefined): string | undefined {
  const absolute = /^(?:[A-Za-z]:[\\/]|[\\/])/.test(executable)
  if (absolute) return existsSync(executable) ? executable : undefined

  const name = `git-credential-${executable}`
  const fileNames = process.platform === 'win32' ? [`${name}.exe`, name] : [name]
  const directories: string[] = []
  if (execPath !== undefined && execPath !== '') {
    directories.push(execPath, join(execPath, '..', '..', 'bin'))
  }
  directories.push(...(process.env.PATH ?? '').split(process.platform === 'win32' ? ';' : ':'))
  for (const directory of directories) {
    if (directory === '') continue
    for (const fileName of fileNames) {
      const candidate = join(directory, fileName)
      if (existsSync(candidate)) return candidate
    }
  }
  return undefined
}

/**
 * The credential helpers this repository's configuration names, in order.
 *
 * `git config --get-all` reads every level (system, global, local), which is the
 * same order Git would ask them in; helpers that need a shell are dropped
 * because the point of reading them here is to avoid one.
 *
 * @param target - the shell seam and the directory to ask.
 * @returns the helpers that can be started directly.
 */
async function credentialHelpers(target: GitTarget): Promise<readonly CredentialHelper[]> {
  const configured = await runGit(target, ['config', '--get-all', 'credential.helper'])
  if (configured.code !== 0) return []

  const execPathRun = await runGit(target, ['--exec-path'])
  const execPath = execPathRun.code === 0 ? execPathRun.stdout.trim() : undefined

  const helpers: CredentialHelper[] = []
  const seen = new Set<string>()
  for (const line of configured.stdout.split('\n')) {
    const invocation = helperInvocation(line)
    if (invocation === undefined) continue
    const executable = helperExecutable(invocation.executable, execPath)
    if (executable === undefined || seen.has(executable)) continue
    seen.add(executable)
    helpers.push({ executable, args: invocation.args })
  }
  return helpers
}

/**
 * Read the username and password out of one helper's answer.
 *
 * @param text - the helper's standard output.
 * @returns the pair, or undefined when the helper supplied no credential.
 */
function parseCredential(text: string): StoredCredential | undefined {
  let username = ''
  let password = ''
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (line.startsWith('username=')) username = line.slice('username='.length)
    else if (line.startsWith('password=')) password = line.slice('password='.length)
  }
  return username === '' || password === '' ? undefined : { username, password }
}

/**
 * Ask this machine's credential helpers for one host's stored credential.
 *
 * The helpers are started directly, so this works where Git's own helper
 * invocation cannot: Git for Windows starts every helper through its bundled
 * MSYS shell, and a sandbox that denies that shell its pipe leaves the helper
 * unreachable even though the credential is on the machine.
 *
 * @param target - the shell seam and the directory to run in.
 * @param host - the HTTPS host the credential belongs to.
 * @returns the credential, or undefined when no helper holds one.
 */
async function storedCredential(
  target: GitTarget,
  host: string,
): Promise<StoredCredential | undefined> {
  const flavor = shellFlavor(target.shell)
  for (const helper of await credentialHelpers(target)) {
    const line = shellCommand([helper.executable, ...helper.args, 'get'], flavor)
    const run = await invoke(target, line, {
      timeoutMs: CREDENTIAL_TIMEOUT_MS,
      stdin: `protocol=https\nhost=${host}\n\n`,
      env: { GCM_INTERACTIVE: 'never' },
    })
    if (run.code !== 0) continue
    const credential = parseCredential(run.stdout)
    if (credential !== undefined) return credential
  }
  return undefined
}

/**
 * The remote a branch hands off to, as its configuration names it.
 *
 * @param root - the repository root, with the session's file policy.
 * @param branch - the branch being handed off.
 * @returns the remote name, or undefined when the branch tracks the local tree.
 */
async function remoteOfBranch(root: GitTarget, branch: string): Promise<string | undefined> {
  const run = await runGit(root, ['config', '--get', `branch.${branch}.remote`])
  if (run.code !== 0) return undefined
  const name = run.stdout.trim()
  return name === '' || name === '.' ? undefined : name
}

/**
 * The URL one configured remote hands off to.
 *
 * @param root - the repository root, with the session's file policy.
 * @param remote - the remote's name.
 * @returns the URL, or undefined when it cannot be read.
 */
async function remoteUrlOf(root: GitTarget, remote: string): Promise<string | undefined> {
  const run = await runGit(root, ['remote', 'get-url', remote])
  if (run.code !== 0) return undefined
  const url = run.stdout.trim()
  return url === '' ? undefined : url
}

/**
 * The host of an HTTPS remote URL.
 *
 * @param url - the remote's configured URL.
 * @returns the host, or undefined for any transport a header cannot answer.
 */
function httpsHost(url: string): string | undefined {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' ? parsed.host : undefined
  } catch {
    return undefined
  }
}

/**
 * The payload for a hand-off that completed.
 *
 * @param run - the successful invocation.
 * @param action - which operation completed.
 * @param label - what the summary calls the other side.
 * @returns the payload the page renders.
 */
function syncSuccess(run: GitRun, action: 'pull' | 'push', label: string): SyncPayload {
  const output = `${run.stdout}\n${run.stderr}`
  if (action === 'pull') {
    const upToDate = /Already up[ -]to[ -]date/i.test(output)
    return { ok: true, action, summary: upToDate ? `Already up to date with ${label}` : `Pulled from ${label}` }
  }
  const upToDate = /Everything up[ -]to[ -]date/i.test(output)
  return { ok: true, action, summary: upToDate ? `Everything up to date with ${label}` : `Pushed to ${label}` }
}

/**
 * Retry one network hand-off with the credential the machine already holds.
 *
 * Git for Windows starts every credential helper through its bundled MSYS
 * shell, and the Windows sandbox can deny that shell the pipe it creates at
 * startup — the helper then never runs even though a credential is stored. The
 * helper executable can be asked directly, and its answer can travel to Git as
 * an HTTP header: `http.extraHeader` needs no helper and no shell, and the
 * transport process itself is a plain Windows executable.
 *
 * Only the `auth-helper` refusal reaches this path, and only an HTTPS remote
 * can be answered this way; the credential itself is never persisted, never
 * printed, and travels only in the child's environment.
 *
 * @param target - the repository root, with the session's file policy.
 * @param args - the network command to repeat.
 * @param action - which operation is retried, for the payload.
 * @param branch - the branch being handed off.
 * @param label - what the summary calls the other side.
 * @param knownRemote - the remote an upstream-less branch would push to.
 * @returns the retried outcome, or undefined when no credential could be read.
 */
async function retryWithStoredCredential(
  target: GitTarget,
  args: readonly string[],
  action: 'pull' | 'push',
  branch: string,
  label: string,
  knownRemote?: string,
): Promise<SyncPayload | undefined> {
  const remote = knownRemote ?? (await remoteOfBranch(target, branch))
  if (remote === undefined) return undefined
  const url = await remoteUrlOf(target, remote)
  if (url === undefined) return undefined
  const host = httpsHost(url)
  if (host === undefined) return undefined

  const credential = await storedCredential(target, host)
  if (credential === undefined) return undefined
  const pair = `${credential.username}:${credential.password}`
  const header = `Authorization: Basic ${Buffer.from(pair).toString('base64')}`
  const run = await runGit(target, args, {
    timeoutMs: GIT_NETWORK_TIMEOUT_MS,
    env: {
      GIT_CONFIG_COUNT: '1',
      GIT_CONFIG_KEY_0: `http.https://${host}/.extraHeader`,
      GIT_CONFIG_VALUE_0: header,
    },
  })
  if (run.failure !== undefined) return { ok: false, error: run.failure, reason: 'error', action }
  if (run.code !== 0) return syncFailure(run, action)
  return syncSuccess(run, action, label)
}

/**
 * Stage every change and commit it under one message.
 *
 * The tree is read before it is touched, and both refusals that matter come out
 * of that read. A tree with nothing in it is not a commit that Git would fail to
 * make — "nothing to commit" is a state, and the answer says so as one. And a
 * tree holding an unmerged path is refused before `git add -A` runs: staging a
 * conflicted file resolves it as far as Git is concerned, so a commit made then
 * would record conflict markers as the resolution, which is a commit nobody can
 * mean and one this page has no way to take back.
 *
 * What is committed is deliberately everything the page is listing — tracked
 * edits, deletions, and untracked files alike — because that is the one decision
 * the form offers. The message is the route's to validate; by the time it
 * arrives here it is non-empty text.
 *
 * @param target - the shell seam, the session's directory, and the file policy.
 * @param message - the commit message, already trimmed and checked by the route.
 * @returns the outcome, including the reason a commit did not happen.
 */
export async function commitAll(target: GitTarget, message: string): Promise<CommitAllPayload> {
  const repo = await resolveRepo(target)
  if ('refusal' in repo) return { ok: false, ...repo.refusal, reason: repo.reason }
  const root = inDir(target, repo.root)

  const status = await runGit(root, ['status', '--porcelain=v1', '-z', '--untracked-files=all'])
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

  // The commit Git just wrote, read back the same way the history reads one. A
  // failure here is not a failed commit — the commit is already made — so the
  // answer stays a success and simply names nothing.
  const made = await runGit(root, ['log', '-1', `--pretty=format:${LOG_FORMAT}`])
  if (made.code !== 0) return { ok: true }
  const summary = parseSummary(made.stdout.split(FIELD))
  return summary === undefined ? { ok: true } : { ok: true, commit: summary }
}

/** The answer for a tree that holds nothing to commit. */
function emptyCommit(): CommitAllPayload {
  return { ok: false, ...coded('commit-clean'), reason: 'clean' }
}

/** The answer for a tree whose merge is not finished. */
function conflictedCommit(): CommitAllPayload {
  return { ok: false, ...coded('commit-conflict'), reason: 'conflict' }
}

/**
 * Describe why staging or the commit itself was refused.
 *
 * The sandbox is the refusal the user can act on: under a `read-only` mode Git
 * never ran at all, and the seam is what says so. The other three cases worth
 * separating are races against the read above — a merge that was aborted after
 * it, and a tree another process emptied — and a missing author identity, which
 * Git reports as a state the user can fix rather than as a fault of this
 * repository. Everything else, a refusing hook and a signing failure among them,
 * is Git's own first line, which is more specific than anything this half could
 * invent.
 *
 * @param run - the failed invocation.
 * @returns the payload the page renders.
 */
function commitFailure(run: GitRun): CommitAllPayload {
  if (run.denied === true) {
    return { ok: false, ...coded('commit-denied'), reason: 'denied' }
  }

  const text = diagnosticText(run)
  if (/unmerged|merging is not possible|you have unmerged files/i.test(text)) return conflictedCommit()
  if (/nothing to commit|nothing added to commit|no changes added to commit/i.test(text)) return emptyCommit()
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
