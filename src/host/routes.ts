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
  pullFromRemote,
  pushToRemote,
  readBranches,
  readCommit,
  readDiff,
  readLog,
  readStatus,
  switchBranch,
  DEFAULT_LOG_LIMIT,
  type GitTarget,
} from './git.js'
import { resolveWorkspace } from './workspace.js'

/** Route table, kept in one place so the two halves cannot drift. */
export const ROUTES = {
  status: '/dsh-cool-git/api/status',
  log: '/dsh-cool-git/api/log',
  diff: '/dsh-cool-git/api/diff',
  commit: '/dsh-cool-git/api/commit',
  commitAll: '/dsh-cool-git/api/commit-all',
  branches: '/dsh-cool-git/api/branches',
  checkout: '/dsh-cool-git/api/checkout',
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
): Promise<{ workdir: string; sandboxPolicy?: unknown } | { error: string }> {
  if (typeof sessionId === 'string' && sessionId !== '') {
    const live = liveTarget(ctx, sessionId)
    if (live !== undefined) return live
    const persisted = await persistedWorkdir(ctx, sessionId)
    if (persisted !== undefined) {
      return effect === 'write' ? { error: '会话尚未就绪，请稍后重试' } : { workdir: persisted }
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
  return { error: '无法确定该会话的工作目录' }
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
function resolveShell(ctx: any): { shell: any } | { error: string } {
  const shell = ctx.get('shell')
  if (shell === undefined || typeof shell.execute !== 'function') {
    return { error: 'shell 服务不可用，无法执行 Git 命令' }
  }
  return { shell }
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
  if ('error' in resolved) {
    sendJson(res, 200, { ok: false, error: resolved.error })
    return
  }

  const capability = resolveShell(ctx)
  if ('error' in capability) {
    sendJson(res, 200, { ok: false, error: capability.error })
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
 * Read one request's branch argument.
 *
 * The shape checked here is only about what can be handed to the shell at all;
 * whether the branch exists is Git's answer, not this half's.
 *
 * @param body - the parsed request body.
 * @returns the branch name, or undefined when the body names none.
 */
function readBranch(body: Record<string, unknown>): string | undefined {
  const branch = body.branch
  if (typeof branch !== 'string' || branch === '' || branch.length > 255) return undefined
  if (branch.includes('\0') || branch.startsWith('-')) return undefined
  return branch
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
      if (path === undefined) return Promise.resolve({ ok: false, error: '缺少文件路径' })
      return readDiff(target, {
        path,
        staged: body.staged === true,
        untracked: body.untracked === true,
      })
    })),

    route(ROUTES.commit, (req, res) => handle(ctx, req, res, 'read', (body, target) => {
      const hash = readHash(body)
      if (hash === undefined) return Promise.resolve({ ok: false, error: '提交标识不合法' })
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
      if (message === undefined) return Promise.resolve({ ok: false, error: '缺少提交信息' })
      return commitAll(target, message)
    })),

    route(ROUTES.checkout, (req, res) => handle(ctx, req, res, 'write', (body, target) => {
      const branch = readBranch(body)
      if (branch === undefined) return Promise.resolve({ ok: false, error: '缺少分支名' })
      return switchBranch(target, branch)
    })),

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
