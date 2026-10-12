/**
 * Host entry for dsh-cool-git.
 *
 * The session Git tab lives entirely in the browser half for now: it renders
 * a placeholder page and talks to nothing. This entry exists so the bundle
 * patch has a plugin to mount, and it is where Git operations will grow once
 * they need the filesystem or the `subprocess` seam — the browser half never
 * sees the Host Cordis context, so every future route lives here.
 */

export const name = 'dsh-cool-git'

/** No routes, no services: the tab is client-only until Git work lands here. */
export function apply(): void {}
