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
import { ROUTES } from '../shared/contract.js';
export { ROUTES };
/**
 * Serve every Git route for one plugin instance.
 *
 * @param ctx - the Host plugin context.
 * @returns a disposer that unregisters exactly these routes.
 */
export declare function registerRoutes(ctx: any): () => void;
//# sourceMappingURL=routes.d.ts.map