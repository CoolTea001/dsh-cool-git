/**
 * The Host half's HTTP surface.
 *
 * The browser half has no Cordis context and no remote namespace of its own, so
 * every question it asks the Host crosses a same-origin route registered on the
 * `webServer` carrier. Each route answers JSON and never rejects: a transport or
 * sandbox failure becomes an `{ ok: false }` result the page reports in its error
 * dialog.
 *
 * The Host stays authoritative about *where* Git runs. A request may name the
 * session it belongs to, but never a directory: the directory is read from that
 * session's own header — from the live session when the Host holds it, and from
 * the session's durable header when it does not yet — so a page cannot point the
 * plugin at a repository the session does not own. The durable read is what lets
 * a reopened page's Git tab answer for its own repository on the first request,
 * which arrives while the session is still being resumed (see `resolveTarget`).
 *
 * It is equally authoritative about *how much* Git may write. Each request's
 * file policy is resolved from the same session and carried on every command, so
 * a write route runs under exactly the mode and workspace root that session
 * already has — never under a deployment fallback that would refuse it. A session
 * that is not live yet has no such policy to resolve, so its routes may read but
 * never write.
 */

import {
  commitAll,
  createBranch,
  deleteBranches,
  fetchRemotes,
  mergeBranch,
  pullFromRemote,
  pushToRemote,
  readBranches,
  readBranchReport,
  readCommit,
  readDiff,
  readLog,
  readRepositoryRoot,
  readStatus,
  switchBranch,
  DEFAULT_LOG_LIMIT,
  type GitTarget,
} from './git.js'
import type { BranchDeleteTarget, SettingsPayload, SaveSettingsPayload } from '../shared/contract.js'
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
import { resolveWorkspace } from './workspace.js'

/** Route table, kept in one place so the two halves cannot drift. */
export const ROUTES = {
  status: '/dsh-cool-git/api/status',
  log: '/dsh-cool-git/api/log',
  diff: '/dsh-cool-git/api/diff',
  commit: '/dsh-cool-git/api/commit',
  commitAll: '/dsh-cool-git/api/commit-all',
  message: '/dsh-cool-git/api/message',
  settings: '/dsh-cool-git/api/settings',
  settingsSave: '/dsh-cool-git/api/settings-save',
  modelEfforts: '/dsh-cool-git/api/model-efforts',
  branches: '/dsh-cool-git/api/branches',
  branchReport: '/dsh-cool-git/api/branch-report',
  branchCreate: '/dsh-cool-git/api/branch-create',
  branchDelete: '/dsh-cool-git/api/branch-delete',
  checkout: '/dsh-cool-git/api/checkout',
  merge: '/dsh-cool-git/api/merge',
  fetch: '/dsh-cool-git/api/fetch',
  pull: '/dsh-cool-git/api/pull',
  push: '/dsh-cool-git/api/push',
} as const

/** Object names Git accepts, and all a route will pass on to the command line. */
const OBJECT_NAME = /^[0-9a-f]{4,40}$/i

/**
 * Longest commit message a route hands to Git.
 *
 * A message is free-form text and Git itself bounds nothing here, so the bound
 * is this route's: a request body is not a place to put a file.
 */
const MAX_MESSAGE_LENGTH = 10_000

/**
 * Most branches one delete request may name.
 *
 * The bound is the branch list's own: the dialog cannot show more rows than the
 * Host lists, so a request naming more than this is not a selection anyone made.
 */
const MAX_DELETE_TARGETS = 200

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
 * The directory and file policy of a session the Host already holds in store.
 *
 * @param ctx - the Host plugin context.
 * @param sessionId - the session the page belongs to.
 * @returns the live target, or undefined when no live session has that id.
 */
function liveTarget(
  ctx: any,
  sessionId: string,
): { workdir: string; sandboxPolicy?: unknown } | undefined {
  const sessions = ctx.get('sessions')
  if (sessions === undefined) return undefined
  try {
    const session = sessions.get(sessionId)
    const cwd = session?.header?.cwd
    if (session === undefined || typeof cwd !== 'string' || cwd === '') return undefined
    const sandboxPolicy = filePolicyFor(ctx, session)
    return { workdir: cwd, ...(sandboxPolicy === undefined ? {} : { sandboxPolicy }) }
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
 * the executor's default directory, which is at least a directory that exists.
 *
 * A cold session has no resolved file policy, because the policy folds the
 * session's own live log. Only a reading route may therefore run in a directory
 * taken from the durable header: a route that writes waits for the session
 * itself rather than borrowing the deployment's mode and root for a repository
 * that is not the one the deployment describes.
 *
 * @param ctx - the Host plugin context.
 * @param sessionId - the session the page belongs to, if it named one.
 * @param effect - whether this request may change the repository.
 * @returns the directory and the session's file policy, or the reason there is none.
 */
async function resolveTarget(
  ctx: any,
  sessionId: unknown,
  effect: RouteEffect,
): Promise<{ workdir: string; sandboxPolicy?: unknown } | Refusal> {
  if (typeof sessionId === 'string' && sessionId !== '') {
    const live = liveTarget(ctx, sessionId)
    if (live !== undefined) return live
    const persisted = await persistedWorkdir(ctx, sessionId)
    if (persisted !== undefined) {
      return effect === 'write' ? coded('not-ready') : { workdir: persisted }
    }
  }

  const shell = ctx.get('shell')
  if (shell !== undefined) {
    try {
      const spec = shell.resolve({ command: 'pwd' })
      if (typeof spec?.workdir === 'string' && spec.workdir !== '') return { workdir: spec.workdir }
    } catch {
      /* fall through to the process directory */
    }
  }
  return coded('no-workdir')
}

/**
 * The calling session's resolved file policy, when the mounted executor confines.
 *
 * `shell.sandboxMode` is how a confining executor advertises itself; a local,
 * unconfined one answers `undefined` and takes no policy. The policy is what
 * makes a write route inherit the session's own mode and workspace root instead
 * of the deployment's fallback — without it a `workspace-write` session would be
 * refused the checkout, pull or push it is allowed to run.
 *
 * @param ctx - the Host plugin context.
 * @param session - the live session the request named.
 * @returns the policy, or undefined when there is nothing to confine.
 */
function filePolicyFor(ctx: any, session: any): unknown {
  if (ctx.get('shell')?.sandboxMode === undefined) return undefined
  const policy = ctx.get('sandboxPolicy')
  if (policy === undefined || typeof policy.resolve !== 'function') return undefined
  return policy.resolve({ session })
}

/** The `shell` capability, or the reason Git cannot run at all. */
function resolveShell(ctx: any): { shell: any } | Refusal {
  const shell = ctx.get('shell')
  if (shell === undefined || typeof shell.execute !== 'function') {
    return coded('no-shell')
  }
  return { shell }
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
 * @param target - the shell seam and the session's directory.
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
    key: workspace?.path === undefined || workspace.path === '' ? root.root : workspace.path,
    ...(workspace === undefined ? {} : { workspace }),
  }
}

/**
 * Run one JSON route body against Git.
 *
 * Every route repeats the same four steps — method, body, target, shell — so
 * they are taken once here and the route only supplies its own arguments. A
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
  run: (body: Record<string, unknown>, target: GitTarget) => Promise<unknown>,
): Promise<void> {
  if (!methodAllowed(req, res, ['POST'])) return

  let body: Record<string, unknown>
  try {
    body = await readBody(req)
  } catch (error) {
    sendJson(res, 400, { ok: false, error: error instanceof Error ? error.message : String(error) })
    return
  }

  const resolved = await resolveTarget(ctx, body.sessionId, effect)
  if (!('workdir' in resolved)) {
    sendJson(res, 200, { ok: false, ...resolved })
    return
  }

  const capability = resolveShell(ctx)
  if (!('shell' in capability)) {
    sendJson(res, 200, { ok: false, ...capability })
    return
  }

  const target: GitTarget = {
    shell: capability.shell,
    workdir: resolved.workdir,
    ...(resolved.sandboxPolicy === undefined ? {} : { sandboxPolicy: resolved.sandboxPolicy }),
  }

  try {
    sendJson(res, 200, await run(body, target))
  } catch (error) {
    sendJson(res, 200, { ok: false, error: error instanceof Error ? error.message : String(error) })
  }
}

/**
 * Read one request's changed-path argument.
 *
 * NUL is the one byte that cannot survive the shell line the seam runs, so a
 * path carrying one is refused rather than silently truncated.
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
  if (typeof value !== 'string' || value === '' || value.length > 200) return undefined
  if (value.includes('\0')) return undefined
  return value
}

/**
 * Read one ref name out of a request, under whatever key the caller read it from.
 *
 * The shape checked here is only about what can be handed to the shell at all:
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
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_DELETE_TARGETS) return undefined

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

    route(ROUTES.diff, (req, res) => handle(ctx, req, res, 'read', (body, target) => {
      const path = readPath(body)
      if (path === undefined) return Promise.resolve({ ok: false, ...coded('missing-path') })
      return readDiff(target, {
        path,
        staged: body.staged === true,
        untracked: body.untracked === true,
      })
    })),

    route(ROUTES.commit, (req, res) => handle(ctx, req, res, 'read', (body, target) => {
      const hash = readHash(body)
      if (hash === undefined) return Promise.resolve({ ok: false, ...coded('bad-hash') })
      return readCommit(target, hash)
    })),

    route(ROUTES.branches, (req, res) => handle(ctx, req, res, 'read', (_body, target) =>
      readBranches(target))),

    // The one route that writes both the index and the history: it stages every
    // change the page is listing and commits it under the page's own message, so
    // the two halves of a commit cannot be left apart by a page that never sent
    // the second request.
    route(ROUTES.commitAll, (req, res) => handle(ctx, req, res, 'write', (body, target) => {
      const message = readMessage(body)
      if (message === undefined) return Promise.resolve({ ok: false, ...coded('missing-message') })
      return commitAll(target, message)
    })),

    // The commit form's other request, and a read: it writes a message for the
    // changes on disk, which is why the Commit button stays the only control that
    // stages or records anything. Which model writes it and what prompt it is
    // given are the Host's business too — the Workspace's saved choices, or the
    // deployment's defaults — so the page asks for a message and never says how
    // to write it. The session id is passed on only as the model call's own
    // attribution; the repository is resolved from it by `handle`, never from
    // anything the body holds.
    route(ROUTES.message, (req, res) => handle(ctx, req, res, 'read', (body, target) =>
      generateCommitMessage(ctx, target, typeof body.sessionId === 'string' ? body.sessionId : undefined))),

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
      let body: Record<string, unknown>
      try {
        body = await readBody(req)
      } catch (error) {
        sendJson(res, 400, { ok: false, error: error instanceof Error ? error.message : String(error) })
        return
      }
      const provider = readIdentifier(body.provider)
      const model = readIdentifier(body.model)
      if (provider === undefined || model === undefined) {
        sendJson(res, 200, { ok: false, error: 'invalid model route' })
        return
      }
      sendJson(res, 200, await readModelEfforts(ctx, provider, model))
    }),

    route(ROUTES.checkout, (req, res) => handle(ctx, req, res, 'write', (body, target) => {
      const branch = readBranch(body)
      if (branch === undefined) return Promise.resolve({ ok: false, ...coded('missing-branch') })
      return switchBranch(target, branch)
    })),

    // The delete dialog's own read: the same refs the switch lists, plus each
    // one's upstream, its tracking state, and whether HEAD reaches it. A read of
    // its own rather than a second half of `branches`, because those three
    // answers cost walks and the switch dialog opens far more often than this one.
    route(ROUTES.branchReport, (req, res) => handle(ctx, req, res, 'read', (_body, target) =>
      readBranchReport(target))),

    // Creating a branch is the switch with a ref made first, so it is the same
    // write effect and the same file policy: the two names are a new branch and
    // the branch it starts at, and which of Git's rules each has to satisfy is
    // Git's answer rather than a shape checked here.
    route(ROUTES.branchCreate, (req, res) => handle(ctx, req, res, 'write', (body, target) => {
      const name = readRefName(body.name)
      if (name === undefined) return Promise.resolve({ ok: false, ...coded('missing-name') })
      const start = readRefName(body.start)
      if (start === undefined) return Promise.resolve({ ok: false, ...coded('missing-branch') })
      return createBranch(target, name, start)
    })),

    // The one route that removes refs, and the one whose answer is a list: each
    // branch is deleted on its own so that a refusal belongs to the branch it
    // was about, and the page reads that list back line by line.
    route(ROUTES.branchDelete, (req, res) => handle(ctx, req, res, 'write', (body, target) => {
      const targets = readTargets(body)
      if (targets === undefined) return Promise.resolve({ ok: false, ...coded('missing-branch') })
      return deleteBranches(target, targets)
    })),

    // The branch is the whole of this argument, and the Host decides what a name
    // may be: a local branch or a remote-tracking ref, because that is Git's rule
    // and not a shape a request body can be trusted to know.
    route(ROUTES.merge, (req, res) => handle(ctx, req, res, 'write', (body, target) => {
      const branch = readBranch(body)
      if (branch === undefined) return Promise.resolve({ ok: false, ...coded('missing-branch') })
      return mergeBranch(target, branch)
    })),

    // The fetch is the remote operation with the fewest arguments of all: it
    // names nothing, because it refreshes every remote the repository has. It is
    // still a write effect rather than a read one — what it moves lives in
    // `.git`, and a session that may not write there must be refused here rather
    // than by Git.
    route(ROUTES.fetch, (req, res) => handle(ctx, req, res, 'write', (_body, target) =>
      fetchRemotes(target))),

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
