/**
 * Host entry for dsh-cool-git.
 *
 * The browser half owns the Git tab's rendering; this half owns the repository.
 * Every question the page asks — which paths changed, what one path's patch is,
 * which commits exist, what one commit contains — crosses a same-origin HTTP
 * route served by the `webServer` carrier, because an out-of-tree bundle cannot
 * generate a `ctx.remote` namespace and its Client half never sees the Host
 * Cordis context.
 *
 * The `shell` and `sandboxPolicy` capabilities are read per request rather than
 * declared as hard dependencies: a composition without them still loads the
 * plugin and answers one clear error line instead of failing to mount the tab,
 * and a request resolves the calling session's own file policy so a write route
 * runs under it rather than under the deployment's fallback.
 */
export declare const name = "dsh-cool-git";
/** The web carrier is a hard dependency: without it there is no route to serve. */
export declare const inject: string[];
/** The route table, exported so a probe or test can address the routes by name. */
export { ROUTES } from './routes.js';
export declare function apply(ctx: any): void;
//# sourceMappingURL=index.d.ts.map