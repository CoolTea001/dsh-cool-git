/**
 * What the plugin page's update row asks the Host, and what the Host does about
 * it.
 *
 * The row lives on this bundle's own page in the native Plugins panel (see
 * `client/update.tsx`), but neither the registry nor the profile is the browser's
 * to read: the page would have to reach the npm registry itself, and it would
 * have to install a package, which is the Host's own operation. So the two
 * questions cross this package's routes as JSON, exactly as every Git question
 * does, and this module answers them.
 *
 * The published version is read from the public registry the package publishes
 * to (`package.json`'s `publishConfig`), not from `pluginManager.inspect`: that
 * operation refuses a spec whose name the profile already installs — the answer
 * this row needs most of all — so it can never say what the newest release is for
 * an installed plugin. The profile's own record (which version is installed, and
 * from where) comes from `pluginManager.listBundles`, which is the same source
 * the native Source section draws from.
 *
 * Both reads are cached in this module for a few minutes: the page asks on every
 * mount, the registry costs a network round trip, and a version published mid-
 * session is not a fact worth a request per repaint. The cache belongs to the
 * Host process, so stopping the plugin clears it with the module.
 */

import {
  PACKAGE_NAME,
  type UpdateApplyPayload,
  type UpdateCheckPayload,
} from '../shared/contract.js'
import { errorMessage } from '../shared/error.js'
import { coded } from './refusal.js'

/** The registry the package publishes to, ending in the slash paths append to. */
const REGISTRY = 'https://registry.npmjs.org/'

/** How long a successful read answers without asking the registry again. */
const CACHE_TTL_MS = 5 * 60_000

/** How long a failed read is remembered, so a dead network is not retried per repaint. */
const FAILURE_TTL_MS = 30_000

/** How long one registry request may take before it is treated as unreachable. */
const REQUEST_TIMEOUT_MS = 8_000

/**
 * The shape a version this half will install must have.
 *
 * The page sends back a version it was shown, but a request body is not a place
 * to put a package spec: a string that is not a plain version could name a tag,
 * a range, or another package's path, and `installBundle` would take it. The
 * bound is npm's own spelling for a release, prerelease suffixes included.
 */
const VERSION = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]{1,64})?$/

/** One cached answer, with the moment it was taken. */
let cache: { readonly at: number; readonly value: UpdateCheckPayload } | undefined

/**
 * Ask the registry for this package's newest published version.
 *
 * A redirect is followed by `fetch` itself; anything but a 2xx is a failure the
 * caller reports as "could not read", because a registry that answers 500 or a
 * proxy that answers 403 says nothing about the version. The body is read as
 * JSON and only its `version` field is kept: that is the whole of what the row
 * draws, and a full packument would be megabytes.
 *
 * @returns the version, or the reason there is none.
 */
async function readPublishedVersion(): Promise<{ version: string } | { error: string }> {
  const response = await fetch(`${REGISTRY}${PACKAGE_NAME}/latest`, {
    headers: { accept: 'application/json' },
    redirect: 'follow',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })
  if (!response.ok) return { error: `registry answered HTTP ${response.status}` }
  const body: unknown = await response.json().catch(() => undefined)
  const version = (body as { version?: unknown } | undefined)?.version
  if (typeof version !== 'string' || version === '') return { error: 'registry answered no version' }
  return { version }
}

/**
 * The profile's own record of this bundle.
 *
 * `listBundles` is the manager's full answer, and this plugin's row is the one
 * entry whose name is the package's. A manager that is absent (a deployment
 * without the Plugins panel) or that does not list the bundle (an installation
 * DSH itself provides) leaves both fields absent rather than failing the read:
 * the version can still be compared, and the row simply cannot say where it came
 * from.
 *
 * @param ctx - the Host plugin context.
 * @returns the installed version and the recorded spec, when known.
 */
async function readInstalled(ctx: any): Promise<{ installed?: string; source?: string }> {
  const manager = ctx.get('pluginManager')
  if (manager === undefined || typeof manager.listBundles !== 'function') return {}
  try {
    const bundles: unknown = await manager.listBundles()
    if (!Array.isArray(bundles)) return {}
    const own = bundles.find((bundle: any) => bundle?.name === PACKAGE_NAME)
    if (own === undefined || own === null) return {}
    return {
      ...(typeof own.version === 'string' ? { installed: own.version } : {}),
      ...(typeof own.source === 'string' ? { source: own.source } : {}),
    }
  } catch {
    /* an unreadable manager is not this row's failure to report */
    return {}
  }
}

/**
 * Answer the page's first question: which version is published, and which one
 * the profile holds.
 *
 * The cache is keyed by nothing because the question is about one package in one
 * profile; a second profile would be a second Host process with its own module.
 *
 * @param ctx - the Host plugin context.
 * @returns the payload the row draws.
 */
export async function checkPublishedVersion(ctx: any): Promise<UpdateCheckPayload> {
  const now = Date.now()
  if (cache !== undefined && now - cache.at < (cache.value.ok ? CACHE_TTL_MS : FAILURE_TTL_MS)) {
    return cache.value
  }

  const installed = await readInstalled(ctx)

  let published: { version: string } | undefined
  let error: string | undefined
  try {
    const answer = await readPublishedVersion()
    if ('version' in answer) published = answer
    else error = answer.error
  } catch (caught) {
    error = errorMessage(caught)
  }

  const value: UpdateCheckPayload = published === undefined
    ? { ok: false, error: error ?? 'the registry could not be read', ...installed }
    : { ok: true, latest: published.version, ...installed }
  cache = { at: now, value }
  return value
}

/**
 * Answer the page's second question: install one published version.
 *
 * The manager's operation is the same one the Plugins panel runs, so the profile
 * files, the lockfile, the registry fallback and the build-script approval all
 * behave exactly as they do there; nothing about installation is reimplemented
 * here. The one thing this route refuses on its own is a version that is not a
 * version, before any file is touched.
 *
 * The call replaces whatever the profile recorded for this bundle — including a
 * `link:` development install — which is what the page asks the reader to confirm
 * before calling it.
 *
 * @param ctx - the Host plugin context.
 * @param version - the version the page was shown.
 * @returns the manager's outcome, or the reason the install never started.
 */
export async function installPublishedVersion(ctx: any, version: unknown): Promise<UpdateApplyPayload> {
  if (typeof version !== 'string' || !VERSION.test(version)) {
    return { ok: false, ...coded('bad-version') }
  }
  const manager = ctx.get('pluginManager')
  if (manager === undefined || typeof manager.installBundle !== 'function') {
    return { ok: false, ...coded('no-plugin-manager') }
  }

  try {
    const result: any = await manager.installBundle(`${PACKAGE_NAME}@${version}`)
    // The manager states how the change was applied. Anything it does not name
    // is reported as live, because a change it accepted without a restart reason
    // is one the composition already picked up.
    const application = result?.application === 'restart-required' ? 'restart-required' : 'applied'
    return {
      ok: true,
      application,
      ...(typeof result?.restartReason === 'string' ? { restartReason: result.restartReason } : {}),
    }
  } catch (caught) {
    return { ok: false, error: errorMessage(caught) }
  }
}

/** Drop the cached answer, so the next read asks the registry again. */
export function forgetPublishedVersion(): void {
  cache = undefined
}
