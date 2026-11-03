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
 * The `subprocess` capability is a hard dependency too: it is the only way this
 * half runs Git, so a composition without it has no Git tab to offer.
 */
export declare const name = "dsh-cool-git";
/** The web carrier and the process substrate: without either there is no tab. */
export declare const inject: string[];
/** The route table, exported so a probe or test can address the routes by name. */
export { ROUTES } from './routes.js';
export declare function apply(ctx: any): void;
//# sourceMappingURL=index.d.ts.map