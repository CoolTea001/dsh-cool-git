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
import { type UpdateApplyPayload, type UpdateCheckPayload } from '../shared/contract.js';
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
export declare function checkPublishedVersion(ctx: any): Promise<UpdateCheckPayload>;
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
export declare function installPublishedVersion(ctx: any, version: unknown): Promise<UpdateApplyPayload>;
/** Drop the cached answer, so the next read asks the registry again. */
export declare function forgetPublishedVersion(): void;
//# sourceMappingURL=update.d.ts.map