/**
 * Which DSH Workspace a Git request belongs to.
 *
 * The Changed files pane's header names the Workspace the session lives in, and
 * the Workspace registry is the only authority for that name: a directory's own
 * basename is a guess, and the title is user-editable. Two lookups follow, in
 * order of certainty:
 *
 *   1. the registry's own session account: a Workspace lists the sessions whose
 *      canonical cwd equals its path, so a session id that appears in that list
 *      names its Workspace exactly;
 *   2. the directory itself, for a session the registry has not accounted (a
 *      cold or foreign id), resolved through the same canonicalization the
 *      registry stores.
 *
 * Both lookups are best-effort. A composition without a Workspace registry, or
 * a directory no Workspace owns, simply leaves the header's left half to the
 * page's fallback, which is the repository's own directory name.
 */

import type { WorkspaceInfo } from '../shared/contract.js'

/**
 * Find the Workspace that owns this request's session, or its directory.
 *
 * @param ctx - the Host plugin context.
 * @param sessionId - the session the page belongs to, when it named one.
 * @param directory - the directory Git ran in, as a fallback identity.
 * @returns the Workspace, or undefined when none can be named.
 */
export async function resolveWorkspace(
  ctx: any,
  sessionId: unknown,
  directory: string,
): Promise<WorkspaceInfo | undefined> {
  const registry = ctx.get('workspaceRegistry')
  if (registry === undefined) return undefined

  if (typeof sessionId === 'string' && sessionId !== '') {
    const owner = bySession(registry, sessionId)
    if (owner !== undefined) return owner
  }

  try {
    const resolved = await registry.resolveByPath(directory)
    if (resolved !== undefined) return { title: resolved.title, path: resolved.path }
  } catch {
    /* an unresolvable path is not an error: the page falls back to the directory name */
  }
  return undefined
}

/**
 * Find the Workspace whose session account contains this id.
 *
 * @param registry - the Workspace registry service.
 * @param sessionId - the session to look up.
 * @returns the Workspace, or undefined when no account lists the session.
 */
function bySession(registry: any, sessionId: string): WorkspaceInfo | undefined {
  try {
    for (const workspace of registry.list() as readonly any[]) {
      if (!Array.isArray(workspace?.sessionIds)) continue
      if (!workspace.sessionIds.includes(sessionId)) continue
      if (typeof workspace.title !== 'string' || typeof workspace.path !== 'string') continue
      return { title: workspace.title, path: workspace.path }
    }
  } catch {
    /* a registry that cannot list is treated as one that cannot name a Workspace */
  }
  return undefined
}
