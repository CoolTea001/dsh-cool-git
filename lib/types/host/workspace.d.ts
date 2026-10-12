/**
 * Which DSH Workspace a Git request belongs to.
 *
 * The 变更文件区 header names the Workspace the session lives in, and the Workspace
 * registry is the only authority for that name — a directory's own basename is a
 * guess, and the title is user-editable. Two lookups, in order of certainty:
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
import type { WorkspaceInfo } from '../shared/contract.js';
/**
 * Find the Workspace that owns this request's session, or its directory.
 *
 * @param ctx - the Host plugin context.
 * @param sessionId - the session the page belongs to, when it named one.
 * @param directory - the directory Git ran in, as a fallback identity.
 * @returns the Workspace, or undefined when none can be named.
 */
export declare function resolveWorkspace(ctx: any, sessionId: unknown, directory: string): Promise<WorkspaceInfo | undefined>;
//# sourceMappingURL=workspace.d.ts.map