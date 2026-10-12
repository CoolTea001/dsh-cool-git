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

import { registerRoutes } from './routes.js'

export const name = 'dsh-cool-git'

/** The web carrier is a hard dependency: without it there is no route to serve. */
export const inject = ['webServer']

/** The route table, exported so a probe or test can address the routes by name. */
export { ROUTES } from './routes.js'

export function apply(ctx: any): void {
  // Tied to the plugin's fiber, so stopping or reloading the plugin takes its
  // routes down with it instead of leaving them answering for a dead instance.
  ctx.effect(() => registerRoutes(ctx), 'dsh-cool-git: git routes')
}
