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
 * Reading is the bulk of this module. Four commands change something — the
 * branch switch, the fast-forward pull, the push, and the commit — and each
 * reports a sandbox refusal as such rather than as a Git error, because under a
 * `read-only` mode that refusal is the whole answer. The commit is the one that
 * writes the index as well as the history, which is why it is a single call
 * rather than a stage the page could leave half-finished.
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

import {
  classifyChange,
  type BranchesPayload,
  type ChangedFile,
  type CheckoutPayload,
  type CommitAllPayload,
  type CommitPayload,
  type CommitSummary,
  type DiffPayload,
  type FailureCode,
  type LogPayload,
  type StatusPayload,
  type SyncPayload,
} from '../shared/contract.js'
import { coded, type Refusal } from './refusal.js'

/** Wall-clock bound per Git invocation; a hung command is killed, not waited on. */
const GIT_TIMEOUT_MS = 20_000

/**
 * Wall-clock bound for the two invocations that cross the network.
 *
 * A fetch or a push legitimately takes longer than a local read — a slow remote
 * or a large pack is not a hung command — so the local bound would kill a
 * transfer that was still making progress.
 */
const GIT_NETWORK_TIMEOUT_MS = 180_000

/** Largest patch the Host collects; beyond this the answer is flagged truncated. */
const MAX_STDOUT_BYTES = 4 * 1024 * 1024

/** Commits returned when the caller names no limit. */
export const DEFAULT_LOG_LIMIT = 60

/** Upper bound on commits per request, so one call cannot walk a whole history. */
const MAX_LOG_LIMIT = 300

/** Upper bound on branches returned, so a huge ref list cannot flood the menu. */
const MAX_BRANCHES = 200

/**
 * What Git prints when it refuses to touch a working tree that is not clean.
 *
 * `checkout`, `pull` and `push` each word the refusal their own way, and the page
 * has one sentence per action for it, so the three spellings are one pattern.
 */
const DIRTY_WORKTREE = /local changes|would be overwritten|commit your changes or stash/i

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
 * Quote one value for the shell line the seam runs.
 *
 * The seam executes the command as `bash -c <command>`, so every argument that
 * is not a literal this module wrote must survive as a single word. Wrapping in
 * single quotes does that; the only character that can end such a word is a
 * single quote itself, which is closed, escaped, and reopened.
 *
 * @param value - the raw argument.
 * @returns a single quoted shell word.
 */
function quote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`
}

/**
 * Build the full command line for one Git invocation.
 *
 * @param args - the subcommand and its arguments, each quoted individually.
 * @returns the command string handed to `shell.resolve`.
 */
function command(args: readonly string[]): string {
  return ['git', '--no-pager', '-c', 'core.quotePath=false', ...args].map(quote).join(' ')
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/**
 * Run one Git command and collect its result.
 *
 * @param target - the shell seam, the directory, and the file policy to run under.
 * @param args - subcommand and arguments, before quoting.
 * @param acceptCodes - exit codes that are a normal answer rather than a failure.
 * @param timeoutMs - wall-clock bound; the network commands raise it.
 * @returns the invocation's outcome; never rejects.
 */
async function runGit(
  target: GitTarget,
  args: readonly string[],
  acceptCodes: readonly number[] = [0],
  timeoutMs: number = GIT_TIMEOUT_MS,
): Promise<GitRun> {
  const { shell, sandboxPolicy } = target
  const request = {
    command: command(args),
    workdir: target.workdir,
    timeoutMs,
    onExpiry: 'kill' as const,
    stdoutMaxBytes: MAX_STDOUT_BYTES,
    env: { ...GIT_ENV },
    // Carried only when there is one: an unconfined executor takes no policy,
    // and the seam stays free to apply its own fallback then.
    ...(sandboxPolicy === undefined ? {} : { sandboxPolicy }),
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
    return failureRun(messageOf(error))
  }
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
  if (top.code !== 0) return { refusal: refusalOf(top), reason: 'no-repo' }
  const root = top.stdout.trim()
  if (root === '') return { refusal: coded('no-root'), reason: 'no-repo' }

  // `--quiet` keeps an unborn branch from writing "fatal: Needed a single
  // revision" to stderr, and exit code 1 is then a normal "no commits yet".
  const head = await runGit(inDir(target, root), ['rev-parse', '--verify', '--quiet', 'HEAD'], [0, 1])
  return { root, hasHead: head.code === 0 }
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

  // `--branch` adds the `## ...` header as the first NUL-terminated record, and
  // `--untracked-files=all` names every untracked file rather than collapsing
  // each directory of them into one row.
  const status = await runGit(inDir(target, repo.root), [
    'status', '--porcelain=v1', '-z', '--branch', '--untracked-files=all',
  ])
  if (status.code !== 0) return { ok: false, ...refusalOf(status), reason: 'error' }

  const parsed = parseStatus(status.stdout)

  let head: StatusPayload['head'] = null
  if (repo.hasHead) {
    const log = await runGit(inDir(target, repo.root), ['log', '-1', `--pretty=format:${HEAD_FORMAT}`])
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

  const count = clampLimit(limit)
  // `-z` separates commits with NUL instead of a newline, so a multi-line commit
  // body (and any subject holding a newline) cannot be mistaken for a record
  // boundary. The fields inside one record are split on the unit separator.
  const log = await runGit(inDir(target, repo.root), [
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

  const meta = await runGit(inDir(target, repo.root), [
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
    ? await runGit(inDir(target, repo.root), [
        'show', '--no-color', '--no-ext-diff', '-M', '--patch', '-U3', '--format=', hash,
      ])
    : await runGit(inDir(target, repo.root), [
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
    ], [0, 1])
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
    ], [0, 1])
    if (run.code !== 0 && run.code !== 1) continue
    if (run.stdout.trim() === '') continue
    const cut = cutAtLine(run.stdout, Math.min(MAX_PREVIEW_CHARS, budget))
    budget -= cut.text.length
    previews.push({ path: file.path, text: cut.text, truncated: cut.truncated || run.truncated })
  }
  return previews
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
 * @param target - the shell seam, the session's directory, and the file policy.
 * @returns the digest, or why the repository could not be read.
 */
export async function readChangeDigest(target: GitTarget): Promise<ChangeDigest> {
  const repo = await resolveRepo(target)
  if ('refusal' in repo) return { ok: false, refusal: repo.refusal, reason: repo.reason }
  const root = inDir(target, repo.root)

  const status = await runGit(root, [
    'status', '--porcelain=v1', '-z', '--branch', '--untracked-files=all',
  ])
  if (status.code !== 0) return { ok: false, refusal: refusalOf(status), reason: 'error' }
  const files = parseStatus(status.stdout).files
  if (files.length === 0) {
    return { ok: true, files, stat: '', patch: '', patchTruncated: false, untracked: [] }
  }

  const stat = await runTrackedDiff(root, repo.hasHead, ['--stat'])
  if (stat.code !== 0) return { ok: false, refusal: refusalOf(stat), reason: 'error' }
  const diff = await runTrackedDiff(root, repo.hasHead, ['--unified=3'])
  if (diff.code !== 0) return { ok: false, refusal: refusalOf(diff), reason: 'error' }
  const patch = cutAtLine(diff.stdout, MAX_DIGEST_PATCH_CHARS)

  return {
    ok: true,
    files,
    stat: stat.stdout.trim(),
    patch: patch.text,
    patchTruncated: patch.truncated || diff.truncated,
    untracked: await readUntrackedPreviews(root, files),
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
 * `--count` is asked for one more name than the cap, so a cut list can say that
 * it was cut. The separator question does arise here — and only here — because a
 * remote's symbolic `HEAD` is wanted out of the list: `%(symref)` is empty for a
 * real ref and names the target for that alias, and `%00` is how the two fields
 * are kept apart inside a record (`%x1f` is expanded by `log --pretty` and not
 * by `for-each-ref`; `%00` is). Ref names can hold no NUL, so a record is
 * exactly two fields.
 *
 * @param root - the repository root, with the session's file policy.
 * @param namespace - the ref namespace to read, e.g. `refs/heads/`.
 * @returns the short names, or why the read failed.
 */
async function readRefNames(root: GitTarget, namespace: string): Promise<RefNames> {
  const list = await runGit(root, [
    'for-each-ref', '--sort=-committerdate', `--count=${MAX_BRANCHES + 1}`,
    '--format=%(refname:short)%00%(symref)', namespace,
  ])
  if (list.code !== 0) return { ok: false, refusal: refusalOf(list) }

  const names: string[] = []
  let truncated = false
  for (const record of list.stdout.split('\n')) {
    if (record === '') continue
    const [name = '', symref = ''] = record.split('\0')
    // A remote's `HEAD` alias shortens to the bare remote name, which is not a
    // branch anyone can switch to; the ref it points at is in the list itself.
    if (symref !== '') continue
    if (names.length === MAX_BRANCHES) {
      truncated = true
      break
    }
    names.push(name)
  }
  return { ok: true, names, truncated }
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
 * Run one switch and report it.
 *
 * `git switch` arrived in 2.23; on an older Git the same intent is spelled with
 * `checkout`, which differs in exactly one letter of one option (`-c` against
 * `-b`), so the caller hands over both spellings rather than this helper
 * translating an argument list it does not own.
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
  let run = await runGit(root, attempt)
  if (run.code !== 0 && /switch.*(?:is not a git command|unknown)|unknown (?:option|subcommand)/i.test(run.stderr)) {
    run = await runGit(root, fallback)
  }
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
  const run = await runGit(root, ['rev-parse', '--verify', '--quiet', ref], [0, 1])
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
  let best: string | null = null
  for (const remote of await remotesOf(root)) {
    if (!ref.startsWith(`${remote}/`)) continue
    if (best === null || remote.length > best.length) best = remote
  }
  if (best === null) return null
  const local = ref.slice(best.length + 1)
  return local === '' ? null : local
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

  const text = diagnosticText(run)
  if (DIRTY_WORKTREE.test(text)) {
    const paths = text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line !== '' && !/^(?:error|fatal|Please|Aborting|note:)/i.test(line) && !line.includes(' '))
      .slice(0, 5)
    // The paths travel unsplit: the sentence is the page's, and a list joined
    // for it here is the same list in either language.
    const refusal = paths.length === 0
      ? coded('checkout-dirty')
      : coded('checkout-dirty-paths', { paths: paths.join(', ') })
    return { ok: false, ...refusal, reason: 'dirty' }
  }

  return { ok: false, ...refusalOf(run), reason: 'error' }
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
  const head = await runGit(root, ['symbolic-ref', '--short', '-q', 'HEAD'], [0, 1])
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
  const upstream = await runGit(
    root, ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{upstream}'], [0, 1, 128],
  )
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

  const run = await runGit(
    handoff.root, ['pull', '--ff-only'], [0], GIT_NETWORK_TIMEOUT_MS,
  )
  if (run.failure !== undefined) return { ok: false, error: run.failure, reason: 'error', action: 'pull' }
  if (run.code !== 0) return syncFailure(run, 'pull')

  const output = `${run.stdout}\n${run.stderr}`
  const summary = /Already up[ -]to[ -]date/i.test(output)
    ? `Already up to date with ${upstream}`
    : `Pulled from ${upstream}`
  return { ok: true, action: 'pull', summary }
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

  const run = await runGit(root, args, [0], GIT_NETWORK_TIMEOUT_MS)
  if (run.failure !== undefined) return { ok: false, error: run.failure, reason: 'error', action: 'push' }
  if (run.code !== 0) return syncFailure(run, 'push')

  const output = `${run.stdout}\n${run.stderr}`
  const summary = /Everything up[ -]to[ -]date/i.test(output)
    ? `Everything up to date with ${ref}`
    : `Pushed to ${ref}`
  return { ok: true, action: 'push', summary }
}

/**
 * Describe why a pull or a push was refused.
 *
 * The four cases worth separating are the ones the user can act on: a sandbox
 * that forbids writing at all, a divergent history, a dirty working tree, and
 * credentials the remote rejected. Everything else is Git's own first line,
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

  if (AUTH_FAILURE.test(text)) {
    return { ok: false, ...coded('auth'), reason: 'auth', action }
  }

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
  const commit = await runGit(root, ['commit', '-m', message])
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
 * never ran at all, and the seam is what says so. The other two cases worth
 * separating are races against the read above — a merge that was aborted after
 * it, and a tree another process emptied — which that reading already knows how
 * to name. Everything else, a refusing hook and a signing failure among them, is
 * Git's own first line, which is more specific than anything this half could
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
