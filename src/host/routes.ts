/**
 * The Host half's HTTP surface.
 *
 * The browser half has no Cordis context and no remote namespace of its own, so
 * every question it asks the Host crosses a same-origin route registered on the
 * `webServer` carrier. Each route answers JSON and never rejects: a transport
 * failure becomes an `{ ok: false }` result the page reports in its error dialog.
 *
 * The Host stays authoritative about *where* Git runs. A request may name the
 * session it belongs to, but never a directory: the directory is read from that
 * session's own header — from the live session when the Host holds it, and from
 * the session's durable header when it does not yet — so a page cannot point the
 * plugin at a repository the session does not own. The durable read is what lets
 * a reopened page's Git tab answer for its own repository on the first request,
 * which arrives while the session is still being resumed (see `resolveWorkdir`).
 *
 * It is equally authoritative about *what* Git may write: a route marked `write`
 * is refused for a session the Host has not resumed yet, so a page cannot change
 * a repository nothing is holding.
 */

import {
  commitAll,
  commitStaged,
  completeMerge,
  createBranch,
  deleteBranches,
  discardAll,
  discardFolder,
  discardPath,
  fetchRemotes,
  fetchUpstream,
  markResolved,
  mergeBranch,
  pullFromRemote,
  pushToRemote,
  readBranches,
  readBranchReport,
  readCommit,
  readConflict,
  readDiff,
  readLog,
  readRepositoryRoot,
  readStatus,
  resolveConflict,
  stageAll,
  stageFolder,
  stagePath,
  switchBranch,
  undoLastCommit,
  unstageAll,
  unstageFolder,
  unstagePath,
  DEFAULT_LOG_LIMIT,
  MAX_BRANCHES,
  type GitTarget,
} from './git.js'
import {
  MAX_MODEL_ID_LENGTH,
  ROUTES,
  type BranchDeleteTarget,
  type CommitScope,
  type DiffSide,
  type ResolveChoice,
  type SettingsPayload,
  type SaveSettingsPayload,
} from '../shared/contract.js'
import { errorMessage } from '../shared/error.js'
import { DEFAULT_MESSAGE_PROMPT } from '../shared/prompt.js'
import { generateCommitMessage } from './message.js'
import { defaultSelection, readModelEfforts, readModelGroups } from './model.js'
import { coded, type Refusal } from './refusal.js'
import {
  readModelChoice,
  readPromptChoice,
  readWorkspaceSettings,
  saveWorkspaceSettings,
} from './settings.js'
import { resolveWorkspace, workspaceSettingsKey } from './workspace.js'
import { checkPublishedVersion, installPublishedVersion } from './update.js'

// Re-exported so the Host entry keeps its `ROUTES` export; the table itself
// lives in the shared contract, beside the payloads it addresses.
export { ROUTES }

/** Object names Git accepts, and all a route will pass on to the command line. */
const OBJECT_NAME = /^[0-9a-f]{4,40}$/i

/**
 * Longest commit message a route hands to Git.
 *
 * A message is free-form text and Git itself bounds nothing here, so the bound
 * is this route's: a request body is not a place to put a file.
 */
const MAX_MESSAGE_LENGTH = 10_000

function sendJson(res: any, status: number, body: unknown): void {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  })
  res.end(JSON.stringify(body))
}

/**
 * Answer 405 unless the request uses one of the allowed methods.
 *
 * @returns true when the handler may proceed.
 */
function methodAllowed(req: any, res: any, allowed: readonly string[]): boolean {
  if (allowed.includes(req.method)) return true
  sendJson(res, 405, { ok: false, error: 'method not allowed' })
  return false
}

async function readBody(req: any): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(Buffer.from(chunk as Uint8Array))
  const text = Buffer.concat(chunks).toString('utf8')
  if (text === '') return {}
  const parsed: unknown = JSON.parse(text)
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('body must be a JSON object')
  }
  return parsed as Record<string, unknown>
}

/**
 * Read one route's JSON body, answering 400 when it is not one.
 *
 * Every route that takes a body goes through here, the one route that resolves
 * no Git target included, so a malformed body is one answer everywhere: it is
 * parsed before anything else is resolved, and a request that is not a JSON
 * object never reaches Git.
 *
 * @param req - the incoming request.
 * @param res - the response to write.
 * @returns the parsed body, or undefined once the 400 has been sent.
 */
async function readJsonBody(req: any, res: any): Promise<Record<string, unknown> | undefined> {
  try {
    return await readBody(req)
  } catch (error) {
    sendJson(res, 400, { ok: false, error: errorMessage(error) })
    return undefined
  }
}

/**
 * Reject a cross-site request.
 *
 * These routes reach a repository the session owns — and four of them change it
 * — so a page on another origin has no business asking. A same-origin `fetch`
 * omits `Origin` on some requests, so an absent header is allowed.
 */
function sameOrigin(req: any): boolean {
  const origin = req.headers?.origin
  if (typeof origin !== 'string' || origin === '' || origin === 'null') return true
  const host = req.headers?.host
  if (typeof host !== 'string' || host === '') return false
  try {
    return new URL(origin).host === host
  } catch {
    return false
  }
}

/**
 * What one route may do to the repository, which decides what a session the Host
 * has not resumed yet is allowed to answer.
 */
type RouteEffect = 'read' | 'write'

/**
 * The Host's process substrate, or the reason Git cannot run at all.
 *
 * @param ctx - the Host plugin context.
 * @returns the substrate, or the coded refusal.
 */
function resolveSubprocess(ctx: any): { subprocess: any } | Refusal {
  const subprocess = ctx.get('subprocess')
  if (subprocess === undefined || typeof subprocess.spawn !== 'function') {
    return coded('no-subprocess')
  }
  return { subprocess }
}

/**
 * The directory of a session the Host already holds in store.
 *
 * @param ctx - the Host plugin context.
 * @param sessionId - the session the page belongs to.
 * @returns the live target, or undefined when no live session has that id.
 */
function liveTarget(
  ctx: any,
  sessionId: string,
): { workdir: string } | undefined {
  const sessions = ctx.get('sessions')
  if (sessions === undefined) return undefined
  try {
    const session = sessions.get(sessionId)
    const cwd = session?.header?.cwd
    if (session === undefined || typeof cwd !== 'string' || cwd === '') return undefined
    return { workdir: cwd }
  } catch {
    /* an unreadable store falls through to persistence, then to the default */
    return undefined
  }
}

/**
 * The directory a session that is not live yet still owns.
 *
 * The header of a session is durable from the moment the session is created, so
 * the directory Git must run in is knowable before anything resumes it. That is
 * exactly the state a reopened page meets its own tab in: the shell renders a
 * restored View from the session catalog while the session's history stream is
 * still opening, so the page's first read arrives before `sessions.get` answers
 * anything — and an answer taken from the executor's default directory would name
 * a repository that is not this session's.
 *
 * `sessionController.inspect` is the Host's own attached-or-persisted read: it
 * returns the persisted header without activating an Agent, so nothing is resumed
 * on behalf of a page that is only asking where the repository is. It is optional
 * — a composition without it keeps the executor's default directory — and a
 * failed read (an archived, foreign, or unreadable id) is not this route's answer
 * to give.
 *
 * @param ctx - the Host plugin context.
 * @param sessionId - the session the page belongs to.
 * @returns the session's own directory, or undefined when it cannot be read.
 */
async function persistedWorkdir(ctx: any, sessionId: string): Promise<string | undefined> {
  const controller = ctx.get('sessionController')
  if (controller === undefined || typeof controller.inspect !== 'function') return undefined
  try {
    const inspection = await controller.inspect(sessionId)
    const cwd = inspection?.meta?.cwd
    return typeof cwd === 'string' && cwd !== '' ? cwd : undefined
  } catch {
    return undefined
  }
}

/**
 * Find the directory this request's Git commands must run in.
 *
 * The session's own header is the only source — live if the Host holds the
 * session, durable if it does not yet, and never a directory the page named. A
 * session the Host cannot read at all (an archived or foreign id) falls back to
 * the Host's own working directory, which is at least a directory that exists.
 *
 * A cold session is answered from its durable header only for a reading route: a
 * route that writes waits for the session itself rather than acting on a
 * repository that may not be the one the page is showing.
 *
 * @param ctx - the Host plugin context.
 * @param sessionId - the session the page belongs to, if it named one.
 * @param effect - whether this request may change the repository.
 * @returns the directory, or the reason there is none.
 */
async function resolveWorkdir(
  ctx: any,
  sessionId: unknown,
  effect: RouteEffect,
): Promise<{ workdir: string } | Refusal> {
  if (typeof sessionId === 'string' && sessionId !== '') {
    const live = liveTarget(ctx, sessionId)
    if (live !== undefined) return live
    const persisted = await persistedWorkdir(ctx, sessionId)
    if (persisted !== undefined) {
      return effect === 'write' ? coded('not-ready') : { workdir: persisted }
    }
  }
  return process.cwd() === '' ? coded('no-workdir') : { workdir: process.cwd() }
}

/** The Workspace key a settings request belongs to, or why there is none. */
type SettingsTarget =
  | { readonly ok: true; readonly key: string; readonly workspace?: SettingsPayload['workspace'] }
  | { readonly ok: false; readonly refusal: Refusal; readonly reason: 'no-repo' | 'error' }

/**
 * Resolve the Workspace a settings request is about.
 *
 * The repository root is the identity of last resort: a deployment without a
 * Workspace registry still has a directory, and the same directory must key the
 * same choices whether the registry answered or not. When the registry can name
 * a Workspace, its canonical path wins, because that is the path every session
 * attached to that Workspace resolves to — including a session opened from a
 * subdirectory of it.
 *
 * @param ctx - the Host plugin context.
 * @param sessionId - the session the request named.
 * @param target - the process substrate and the session's directory.
 * @returns the key and the Workspace, or the refusal to report.
 */
async function resolveSettingsTarget(
  ctx: any,
  sessionId: unknown,
  target: GitTarget,
): Promise<SettingsTarget> {
  const root = await readRepositoryRoot(target)
  if ('refusal' in root) return { ok: false, refusal: root.refusal, reason: root.reason }
  const workspace = await resolveWorkspace(ctx, sessionId, root.root)
  return {
    ok: true,
    key: workspaceSettingsKey(workspace, root.root),
    ...(workspace === undefined ? {} : { workspace }),
  }
}

/**
 * Run one JSON route body against Git.
 *
 * Every route repeats the same four steps — method, body, directory, substrate —
 * so they are taken once here and the route only supplies its own arguments. A
 * malformed body is a 400; everything later is a 200 carrying `ok: false`,
 * because Git's own refusals are answers the page should show, not HTTP errors.
 *
 * @param ctx - the Host plugin context.
 * @param req - the incoming request.
 * @param res - the response to write.
 * @param effect - whether this route may change the repository.
 * @param run - the route's own work, given the parsed body and resolved target.
 */
async function handle(
  ctx: any,
  req: any,
  res: any,
  effect: RouteEffect,
  run: (body: Record<string, unknown>, target: GitTarget) => unknown | Promise<unknown>,
): Promise<void> {
  if (!methodAllowed(req, res, ['POST'])) return

  const body = await readJsonBody(req, res)
  if (body === undefined) return

  const resolved = await resolveWorkdir(ctx, body.sessionId, effect)
  if (!('workdir' in resolved)) {
    sendJson(res, 200, { ok: false, ...resolved })
    return
  }

  const capability = resolveSubprocess(ctx)
  if (!('subprocess' in capability)) {
    sendJson(res, 200, { ok: false, ...capability })
    return
  }

  const target: GitTarget = { subprocess: capability.subprocess, workdir: resolved.workdir }

  try {
    sendJson(res, 200, await run(body, target))
  } catch (error) {
    sendJson(res, 200, { ok: false, error: errorMessage(error) })
  }
}

/**
 * Read one request's changed-path argument.
 *
 * NUL is the one byte an argv cannot carry, so a path holding one is refused
 * rather than silently truncated.
 *
 * @param body - the parsed request body.
 * @returns the path, or undefined when the body does not name a usable one.
 */
function readPath(body: Record<string, unknown>): string | undefined {
  const path = body.path
  if (typeof path !== 'string' || path === '' || path.includes('\0')) return undefined
  return path
}

/**
 * Run one route's work with the path the request named, or refuse it.
 *
 * Ten routes name exactly one path, and every one of them refuses a body that
 * does not carry a usable path the same way, so the check is stated once here
 * rather than repeated at each route. The refusal is an answer the page draws,
 * not an HTTP error, exactly as Git's own refusals are.
 *
 * @param body - the parsed request body.
 * @param run - the route's work, given the path the body named.
 * @returns the route's answer, or the missing-path refusal.
 */
function withPath(body: Record<string, unknown>, run: (path: string) => unknown): unknown {
  const path = readPath(body)
  if (path === undefined) return { ok: false, ...coded('missing-path') }
  return run(path)
}

/**
 * Read the rename source an unstage request may carry.
 *
 * A staged rename is two index entries, so restoring it means naming both. The
 * field is optional — every other row has no source — and an absent or empty one
 * is simply no source rather than a malformed request. A NUL is refused for the
 * same reason {@link readPath} refuses one.
 *
 * @param body - the parsed request body.
 * @returns the source path, or undefined when the body names none.
 */
function readOrigPath(body: Record<string, unknown>): string | undefined {
  const origPath = body.origPath
  if (origPath === undefined || origPath === '') return undefined
  if (typeof origPath !== 'string' || origPath.includes('\0')) return undefined
  return origPath
}

/**
 * Read which half of a path a diff request is about.
 *
 * The page always names the side of the row it drew, because a path can be
 * listed twice — staged and unstaged — and the two rows must answer with
 * different patches. A request that names none is read as the worktree side, the
 * answer the page used to give for a tracked path; the `staged` boolean is still
 * honoured as the older spelling of the same choice.
 *
 * @param body - the parsed request body.
 * @returns the side to diff.
 */
function readSide(body: Record<string, unknown>): DiffSide {
  const side = body.side
  if (side === 'staged' || side === 'unstaged' || side === 'conflict') return side
  return body.staged === true ? 'staged' : 'unstaged'
}

/**
 * Read which version a resolution keeps.
 *
 * The set is closed and it is the contract's: a choice the page cannot mean — a
 * misspelling, a `both` sent for a whole file — is refused rather than guessed
 * at, because guessing here writes the reader's file.
 *
 * @param body - the parsed request body.
 * @param wholeFile - whether the request is for the whole file, where only a
 *   single side makes sense.
 * @returns the choice, or undefined when the body names none it may use.
 */
function readChoice(
  body: Record<string, unknown>,
  wholeFile: boolean,
): ResolveChoice | undefined {
  const choice = body.choice
  if (wholeFile) return choice === 'ours' || choice === 'theirs' ? choice : undefined
  if (choice === 'ours' || choice === 'theirs' || choice === 'both' || choice === 'base') return choice
  return undefined
}

/**
 * How many conflict blocks one resolution may name.
 *
 * A bound rather than a rule about the file: a resolution is one request, and one
 * request is one round trip, so the number of blocks it may carry is the number
 * this half is willing to make it. A file with more conflicts than this is
 * resolved in more than one click.
 */
const MAX_CONFLICT_KEYS = 500

/**
 * Read the conflict blocks one resolution applies to.
 *
 * The two shapes of a resolution are told apart by whether the body carries the
 * field at all, and never by whether the list turned out to be usable: a body
 * naming keys that do not fit this shape is refused, because reading it as a
 * whole-file request instead would resolve a file the reader asked to resolve
 * block by block. An empty list is refused for the same reason — it is not the
 * spelling the page uses for "the whole file".
 *
 * @param value - the field as the body carried it.
 * @returns the keys, or undefined when they are not a usable list.
 */
function readKeys(value: unknown): readonly string[] | undefined {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_CONFLICT_KEYS) return undefined
  const out: string[] = []
  for (const key of value) {
    if (typeof key !== 'string' || key === '' || key.length > 64) return undefined
    out.push(key)
  }
  return out
}

/**
 * Read the scope a commit or a generated message covers.
 *
 * @param body - the parsed request body.
 * @returns `staged` only when the request names it; everything else is `all`.
 */
function readScope(body: Record<string, unknown>): CommitScope {
  return body.scope === 'staged' ? 'staged' : 'all'
}

/**
 * Read one request's commit argument.
 *
 * @param body - the parsed request body.
 * @returns the object name, or undefined when it is not a plain hex name.
 */
function readHash(body: Record<string, unknown>): string | undefined {
  const hash = body.hash
  if (typeof hash !== 'string' || !OBJECT_NAME.test(hash)) return undefined
  return hash
}

/**
 * Read one identifier naming a model route.
 *
 * The shape is the one a stored `MessageModel` accepts: a non-empty string under
 * the same length ceiling settings uses, with no NUL. Whether the route exists is
 * the `llm` service's answer, not this half's — a route this deployment no longer
 * mounts still has to be asked about, because a saved choice may name it.
 *
 * @param value - the field as the body carried it.
 * @returns the identifier, or undefined when the body does not name one.
 */
function readIdentifier(value: unknown): string | undefined {
  if (typeof value !== 'string' || value === '' || value.length > MAX_MODEL_ID_LENGTH) return undefined
  if (value.includes('\0')) return undefined
  return value
}

/**
 * Read one ref name out of a request, under whatever key the caller read it from.
 *
 * The shape checked here is only about what can be handed to Git at all:
 * a ref name cannot be empty, cannot be longer than Git's own ceiling, cannot
 * carry a NUL, and cannot begin with a dash — the last one because the commands
 * this half runs take some of their arguments positionally, where a name that
 * looks like an option would be read as one. Whether the branch exists is Git's
 * answer, not this half's.
 *
 * @param value - the field as the body carried it.
 * @returns the name, or undefined when it is not one a command line may carry.
 */
function readRefName(value: unknown): string | undefined {
  if (typeof value !== 'string' || value === '' || value.length > 255) return undefined
  if (value.includes('\0') || value.startsWith('-')) return undefined
  return value
}

/**
 * Read one request's branch argument.
 *
 * @param body - the parsed request body.
 * @returns the branch name, or undefined when the body names none.
 */
function readBranch(body: Record<string, unknown>): string | undefined {
  return readRefName(body.branch)
}

/**
 * Read one request's list of branches to delete.
 *
 * Each entry is echoed back in the shape the delete dialog read it in — which
 * list the row came from, and for a remote-tracking row the remote and branch it
 * was split into — so nothing here re-derives a name from a string and no name
 * the page showed can differ from the one that is deleted. An entry that does
 * not fit that shape fails the whole request rather than being skipped: a
 * deletion list that quietly lost a member is the one answer this route must
 * never give.
 *
 * The bound is the branch list's own, so a request can never name more branches
 * than the dialog could have shown.
 *
 * @param body - the parsed request body.
 * @returns the targets, or undefined when the body does not carry a valid list.
 */
function readTargets(body: Record<string, unknown>): readonly BranchDeleteTarget[] | undefined {
  const raw = body.targets
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_BRANCHES) return undefined

  const targets: BranchDeleteTarget[] = []
  for (const item of raw) {
    if (typeof item !== 'object' || item === null) return undefined
    const record = item as Record<string, unknown>
    const name = readRefName(record.name)
    if (name === undefined) return undefined
    if (record.kind === 'local') {
      targets.push({ name, kind: 'local' })
      continue
    }
    if (record.kind !== 'remote') return undefined
    const remote = readRefName(record.remote)
    const branch = readRefName(record.branch)
    if (remote === undefined || branch === undefined) return undefined
    targets.push({ name, kind: 'remote', remote, branch })
  }
  return targets
}

/**
 * Read one request's commit message.
 *
 * A message is free-form text, so nothing about its content is checked; the two
 * shapes refused are the ones no command line and no commit can carry — a NUL
 * byte, and a message that is empty once trimmed, which Git itself rejects. The
 * form's own button is disabled on an empty field, so this is the guard behind
 * that rather than the answer the user meets.
 *
 * @param body - the parsed request body.
 * @returns the trimmed message, or undefined when it is not one.
 */
function readMessage(body: Record<string, unknown>): string | undefined {
  const message = body.message
  if (typeof message !== 'string' || message.includes('\0')) return undefined
  const trimmed = message.trim()
  if (trimmed === '' || trimmed.length > MAX_MESSAGE_LENGTH) return undefined
  return trimmed
}

/**
 * Serve every Git route for one plugin instance.
 *
 * @param ctx - the Host plugin context.
 * @returns a disposer that unregisters exactly these routes.
 */
export function registerRoutes(ctx: any): () => void {
  const guard = (handler: (req: any, res: any) => void | Promise<void>) => (req: any, res: any) => {
    if (!sameOrigin(req)) {
      sendJson(res, 403, { ok: false, error: 'cross-origin request refused' })
      return
    }
    return handler(req, res)
  }

  const route = (path: string, handler: (req: any, res: any) => void | Promise<void>): (() => void) =>
    ctx.webServer.register({ kind: 'exact', path, handler: guard(handler) })

  // Registered eagerly, so a route is answering from the moment the plugin is
  // applied; the returned disposer is what the plugin's own effect owns.
  const disposers = [
    // The status answer carries the Workspace's name as well as the repository's
    // state: the sidebar's first row names the Workspace, and only the Host can
    // read that registry.
    route(ROUTES.status, (req, res) => handle(ctx, req, res, 'read', async (body, target) => {
      const status = await readStatus(target)
      if (status.ok !== true || status.root === undefined) return status
      const workspace = await resolveWorkspace(ctx, body.sessionId, status.root)
      return workspace === undefined ? status : { ...status, workspace }
    })),

    route(ROUTES.log, (req, res) => handle(ctx, req, res, 'read', (body, target) =>
      readLog(target, typeof body.limit === 'number' ? body.limit : DEFAULT_LOG_LIMIT))),

    route(ROUTES.diff, (req, res) => handle(ctx, req, res, 'read', (body, target) =>
      withPath(body, path => readDiff(target, {
        path,
        side: readSide(body),
        untracked: body.untracked === true,
      })))),

    route(ROUTES.commit, (req, res) => handle(ctx, req, res, 'read', (body, target) => {
      const hash = readHash(body)
      if (hash === undefined) return { ok: false, ...coded('bad-hash') }
      return readCommit(target, hash)
    })),

    route(ROUTES.branches, (req, res) => handle(ctx, req, res, 'read', (_body, target) =>
      readBranches(target))),

    // One path into the index. A write, so it is refused before Git runs for a
    // session the Host has not resumed; the answer carries the fresh status, so
    // the page repaints both lists from the state this write produced.
    route(ROUTES.stage, (req, res) => handle(ctx, req, res, 'write', (body, target) =>
      withPath(body, path => stagePath(target, path)))),

    // One path out of the index, with the rename source when the row has one:
    // both halves of a staged rename are restored in one request.
    route(ROUTES.unstage, (req, res) => handle(ctx, req, res, 'write', (body, target) =>
      withPath(body, path => unstagePath(target, path, readOrigPath(body))))),

    // One path's unstaged change discarded. The `untracked` flag is the row's
    // own answer to whether there is an index entry to restore: an untracked
    // path has none, so the Host deletes the file itself instead.
    route(ROUTES.discard, (req, res) => handle(ctx, req, res, 'write', (body, target) =>
      withPath(body, path => discardPath(target, path, body.untracked === true)))),

    // The folder siblings: one directory, and every changed path under it that
    // the Host reads inside the write queue. Conflicted paths are left alone.
    route(ROUTES.stageFolder, (req, res) => handle(ctx, req, res, 'write', (body, target) =>
      withPath(body, path => stageFolder(target, path)))),

    route(ROUTES.unstageFolder, (req, res) => handle(ctx, req, res, 'write', (body, target) =>
      withPath(body, path => unstageFolder(target, path)))),

    route(ROUTES.discardFolder, (req, res) => handle(ctx, req, res, 'write', (body, target) =>
      withPath(body, path => discardFolder(target, path)))),

    // The header's whole-list siblings: no path in the body, because the scope
    // is every changed path the repository lists on the side the action belongs
    // to. The Host reads that list inside the write queue, exactly as the folder
    // routes do for one directory.
    route(ROUTES.stageAll, (req, res) => handle(ctx, req, res, 'write', (_body, target) =>
      stageAll(target))),

    route(ROUTES.unstageAll, (req, res) => handle(ctx, req, res, 'write', (_body, target) =>
      unstageAll(target))),

    route(ROUTES.discardAll, (req, res) => handle(ctx, req, res, 'write', (_body, target) =>
      discardAll(target))),

    // The one route that writes both the index and the history: it stages every
    // change the page is listing and commits it under the page's own message, so
    // the two halves of a commit-all cannot be left apart by a page that never
    // sent the second request. The staged-scope sibling below commits only what
    // the page's own stage actions put in the index.
    route(ROUTES.commitAll, (req, res) => handle(ctx, req, res, 'write', (body, target) => {
      const message = readMessage(body)
      if (message === undefined) return { ok: false, ...coded('missing-message') }
      return commitAll(target, message)
    })),

    // Commit the index alone. Nothing is staged here: the page's `+` and `−`
    // actions decided what this commits, and staging the rest would make them
    // meaningless.
    route(ROUTES.commitStaged, (req, res) => handle(ctx, req, res, 'write', (body, target) => {
      const message = readMessage(body)
      if (message === undefined) return { ok: false, ...coded('missing-message') }
      return commitStaged(target, message)
    })),

    // Undo the commit at HEAD, keeping every change it recorded in the index.
    // The Host decides what "one step back" means — the commit's first parent,
    // never a branch name the page could name — and refuses a repository in the
    // middle of another operation, because the reset would step over it.
    route(ROUTES.undoCommit, (req, res) => handle(ctx, req, res, 'write', (_body, target) =>
      undoLastCommit(target))),

    // The commit form's other request, and a read: it writes a message for the
    // changes on disk, which is why the Commit button stays the only control that
    // records anything. The scope decides which changes the message describes, so
    // a message for a staged-only commit never names a path the commit leaves
    // behind. Which model writes it and what prompt it is given are the Host's
    // business too — the Workspace's saved choices, or the deployment's defaults
    // — so the page asks for a message and never says how to write it. The
    // session id is passed on only as the model call's own attribution; the
    // repository is resolved from it by `handle`, never from anything the body
    // holds.
    route(ROUTES.message, (req, res) => handle(ctx, req, res, 'read', (body, target) =>
      generateCommitMessage(
        ctx,
        target,
        typeof body.sessionId === 'string' ? body.sessionId : undefined,
        readScope(body),
      ))),

    // The Settings dialog's read. It answers with the Workspace's saved choices
    // beside the defaults they fall back to — the current default model and the
    // built-in prompt — because the dialog has to show the effective value even
    // when the Workspace has saved nothing of its own.
    route(ROUTES.settings, (req, res) => handle(ctx, req, res, 'read', async (body, target) => {
      const resolved = await resolveSettingsTarget(ctx, body.sessionId, target)
      if (resolved.ok !== true) return { ok: false, ...resolved.refusal, reason: resolved.reason }
      const [saved, groups] = await Promise.all([
        readWorkspaceSettings(ctx, resolved.key),
        readModelGroups(ctx),
      ])
      const defaultModel = defaultSelection(ctx)
      const payload: SettingsPayload = {
        ok: true,
        ...(resolved.workspace === undefined ? {} : { workspace: resolved.workspace }),
        model: saved.model ?? null,
        prompt: saved.prompt ?? null,
        defaultModel: defaultModel ?? null,
        defaultPrompt: DEFAULT_MESSAGE_PROMPT,
        groups,
      }
      return payload
    })),

    // The Settings dialog's write. It changes the user's preferences, not the
    // repository, so it is a read effect: a session the Host has not resumed yet
    // can still store a choice for the Workspace its durable header names. Both
    // fields are replaced by every request — the dialog sends the complete
    // answer — and a null or blank field clears that override.
    route(ROUTES.settingsSave, (req, res) => handle(ctx, req, res, 'read', async (body, target) => {
      const resolved = await resolveSettingsTarget(ctx, body.sessionId, target)
      if (resolved.ok !== true) return { ok: false, ...resolved.refusal, reason: resolved.reason }
      const model = readModelChoice(body.model)
      if (model.ok !== true) return { ok: false, error: 'invalid model selection' }
      const prompt = readPromptChoice(body.prompt)
      if (prompt.ok !== true) return { ok: false, error: 'invalid prompt' }
      await saveWorkspaceSettings(ctx, resolved.key, {
        ...(model.value === undefined ? {} : { model: model.value }),
        ...(prompt.value === undefined ? {} : { prompt: prompt.value }),
      })
      const payload: SaveSettingsPayload = { ok: true }
      return payload
    })),

    // The Settings picker's effort control: what one model route may be saved
    // with. Deliberately outside `handle` — this is a question about the
    // deployment's models, not about the session's working tree, so it resolves
    // no Git target and needs no shell. The route is asked once per model the
    // reader opens, because effort metadata is adapter-resolved per model.
    route(ROUTES.modelEfforts, async (req, res) => {
      if (!methodAllowed(req, res, ['POST'])) return
      const body = await readJsonBody(req, res)
      if (body === undefined) return
      const provider = readIdentifier(body.provider)
      const model = readIdentifier(body.model)
      if (provider === undefined || model === undefined) {
        sendJson(res, 200, { ok: false, error: 'invalid model route' })
        return
      }
      sendJson(res, 200, await readModelEfforts(ctx, provider, model))
    }),

    // The plugin page's own two routes (see `host/update.ts`). They answer for
    // the profile and the public registry rather than for any repository, so
    // they take no session and never reach `handle`: there is no working
    // directory to resolve and no shell to run.
    route(ROUTES.update, async (req, res) => {
      if (!methodAllowed(req, res, ['POST'])) return
      if (await readJsonBody(req, res) === undefined) return
      sendJson(res, 200, await checkPublishedVersion(ctx))
    }),

    // The install itself. A body naming no version the contract allows is
    // refused before the manager is asked, so a request that reached this route
    // can only install this package at a version the page was shown.
    route(ROUTES.updateApply, async (req, res) => {
      if (!methodAllowed(req, res, ['POST'])) return
      const body = await readJsonBody(req, res)
      if (body === undefined) return
      sendJson(res, 200, await installPublishedVersion(ctx, body.version))
    }),

    route(ROUTES.checkout, (req, res) => handle(ctx, req, res, 'write', (body, target) => {
      const branch = readBranch(body)
      if (branch === undefined) return { ok: false, ...coded('missing-branch') }
      return switchBranch(target, branch)
    })),

    // The delete dialog's own read: the same refs the switch lists, plus each
    // one's upstream, its tracking state, and whether HEAD reaches it. A read of
    // its own rather than a second half of `branches`, because those three
    // answers cost walks and the switch dialog opens far more often than this one.
    route(ROUTES.branchReport, (req, res) => handle(ctx, req, res, 'read', (_body, target) =>
      readBranchReport(target))),

    // Creating a branch is the switch with a ref made first, so it is the same
    // write effect: the two names are a new branch and the branch it starts at,
    // and which of Git's rules each has to satisfy is Git's answer rather than a
    // shape checked here.
    route(ROUTES.branchCreate, (req, res) => handle(ctx, req, res, 'write', (body, target) => {
      const name = readRefName(body.name)
      if (name === undefined) return { ok: false, ...coded('missing-name') }
      const start = readRefName(body.start)
      if (start === undefined) return { ok: false, ...coded('missing-branch') }
      return createBranch(target, name, start)
    })),

    // The one route that removes refs, and the one whose answer is a list: each
    // branch is deleted on its own so that a refusal belongs to the branch it
    // was about, and the page reads that list back line by line.
    route(ROUTES.branchDelete, (req, res) => handle(ctx, req, res, 'write', (body, target) => {
      const targets = readTargets(body)
      if (targets === undefined) return { ok: false, ...coded('missing-branch') }
      return deleteBranches(target, targets)
    })),

    // The branch is the whole of this argument, and the Host decides what a name
    // may be: a local branch or a remote-tracking ref, because that is Git's rule
    // and not a shape a request body can be trusted to know.
    route(ROUTES.merge, (req, res) => handle(ctx, req, res, 'write', (body, target) => {
      const branch = readBranch(body)
      if (branch === undefined) return { ok: false, ...coded('missing-branch') }
      return mergeBranch(target, branch)
    })),

    // One unmerged path, as the resolver draws it. A read: opening a conflict
    // writes nothing, and the pane re-reads it after every choice.
    route(ROUTES.conflict, (req, res) => handle(ctx, req, res, 'read', (body, target) =>
      withPath(body, path => readConflict(target, path)))),

    // One choice for one path. Whether it is a block choice or a whole-file one
    // is read from the request: a body carrying `keys` replaces those blocks and
    // leaves the rest of the file alone, and a body carrying none takes a whole
    // version and marks the path resolved. A `both` or a `base` with no keys is
    // refused rather than reinterpreted, because there is no whole file it could
    // mean — and a `keys` field that is present but unusable is refused too,
    // rather than quietly becoming the whole-file request it was not.
    route(ROUTES.resolve, (req, res) => handle(ctx, req, res, 'write', (body, target) =>
      withPath(body, path => {
        const wholeFile = body.keys === undefined
        const keys = wholeFile ? undefined : readKeys(body.keys)
        if (!wholeFile && keys === undefined) return { ok: false, ...coded('bad-choice') }
        const choice = readChoice(body, wholeFile)
        if (choice === undefined) return { ok: false, ...coded('bad-choice') }
        return resolveConflict(target, path, choice, keys)
      }))),

    // One path marked resolved without anything being written: the reader edited
    // it themselves, and the index is the only thing that has to agree.
    route(ROUTES.resolveDone, (req, res) => handle(ctx, req, res, 'write', (body, target) =>
      withPath(body, path => markResolved(target, path)))),

    // Finish a merge: every conflict is resolved and staged, and the body may
    // carry the reader's own message. An empty one asks for Git's `MERGE_MSG`,
    // which is the message a merge commit has by default, so the two shapes are
    // one request and the form decides which it is.
    route(ROUTES.mergeCommit, (req, res) => handle(ctx, req, res, 'write', (body, target) =>
      completeMerge(target, readMessage(body)))),

    // The fetch is the remote operation with the fewest arguments of all: it
    // names nothing, because it refreshes every remote the repository has. It is
    // still a write effect rather than a read one — what it moves lives in
    // `.git`, and a session that may not write there must be refused here rather
    // than by Git.
    route(ROUTES.fetch, (req, res) => handle(ctx, req, res, 'write', (_body, target) =>
      fetchRemotes(target))),

    // The switch's own follow-up fetch. It is asked after a checkout, never by a
    // row of the menu, so it names nothing: which branch and which remote to
    // refresh are read from the repository the switch just left HEAD on. It is a
    // write effect for the same reason `fetch` is — its refs live in `.git` — and
    // a session that may not write there is refused by this route rather than by
    // Git. A repository with nothing to refresh answers `skipped`, which the page
    // treats as the quiet success it is.
    route(ROUTES.fetchUpstream, (req, res) => handle(ctx, req, res, 'write', (_body, target) =>
      fetchUpstream(target))),

    // The two remote operations name no arguments of their own: which branch,
    // which upstream, and which remote are all read from the repository by the
    // Host, so a page can ask for a pull or a push but never aim one.
    route(ROUTES.pull, (req, res) => handle(ctx, req, res, 'write', (_body, target) =>
      pullFromRemote(target))),

    route(ROUTES.push, (req, res) => handle(ctx, req, res, 'write', (_body, target) =>
      pushToRemote(target))),
  ]

  return () => {
    for (const dispose of disposers) dispose()
  }
}
