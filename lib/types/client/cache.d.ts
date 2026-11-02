/**
 * The Git page's memory of a workspace, kept across mounts and page reloads.
 *
 * The shell renders exactly one conversation View at a time: the skeleton hands
 * `renderSlot('conversation.view', …, { only: viewId })` the active id, so
 * switching to another tab unmounts this page, and switching back mounts a new
 * instance of it. Without a cache that mount is a cold start — no answer to draw,
 * the loading rows in both panes, and two Host reads (`status` and `log`, which
 * are three and two `git` invocations) before anything settles. That wait is the
 * one part of a tab switch the page cannot hide by itself.
 *
 * So the last answer is kept where the next mount can find it:
 *
 *   1. a module-level map, which outlives the unmount and is what makes a tab
 *      switch paint the state the reader left at once;
 *   2. one `localStorage` entry per repository, which outlives a page reload and
 *      is read before the first paint;
 *   3. one `localStorage` alias per session, which is how a mount learns which
 *      repository's entry to look for before the Host has answered anything.
 *
 * The cache is a snapshot, not a source of truth. A View that hydrates from it
 * re-reads the repository whenever the saved answer is older than
 * {@link SNAPSHOT_FRESH_MS} — in the background, over the state already drawn —
 * and every operation on the page writes the answer it just read. Stale data
 * therefore lasts one background read at most. A first visit — no alias, no
 * entry — renders exactly as it did before there was a cache.
 *
 * Keys are the repository's identity, not the session's: every session in one
 * Workspace reads the same repository, so one entry serves them all. The
 * Workspace's canonical path is preferred, for the same reason the Settings
 * routes key a Workspace's saved choices by it; the repository root is the
 * fallback for a deployment whose Workspace registry cannot name one.
 *
 * One choice lives beside the answers on that same identity: the commit form's
 * scope — whether the button commits the index or stages and commits the whole
 * worktree. It is a statement about the Workspace rather than about one
 * conversation, so it is stored under the repository key and read through the
 * same alias, which is what lets a reload open the form the way it was left
 * before the Host has answered. It sits outside the snapshot entry so that
 * evicting an old answer cannot take the reader's choice with it.
 *
 * Nothing here throws. `localStorage` may be refused (quota, a sandboxed frame,
 * a browser that will not store) and a persisted value may be damaged or written
 * by another version of this plugin, so every read is treated as data rather
 * than trusted, and every write is allowed to fail: persistence is a
 * convenience, never a precondition.
 */
import type { CommitScope, LogPayload, StatusPayload } from '../shared/contract.js';
/** One repository's last answer, as a mount reads it back. */
export interface RepositorySnapshot {
    /** The last `status` answer, or null when that read never answered. */
    readonly status: StatusPayload | null;
    /** The last `log` answer, or null when that read never answered. */
    readonly log: LogPayload | null;
    /** Wall-clock milliseconds when the snapshot was written, from `Date.now()`. */
    readonly savedAt: number;
}
/**
 * The commit scope the reader left a Workspace set to, if there is one.
 *
 * The answer is available before the Host's first read: a reload resolves the
 * repository through the session's alias, which earlier mounts wrote to
 * `localStorage`, so the commit form opens in the saved scope rather than the
 * default. A session opening this tab for the first time has no alias yet;
 * {@link readCommitScope} can then be called again with the `status` answer
 * that named the repository, and the page adopts what that Workspace saved.
 *
 * @param sessionId - the session the page belongs to, when it named one.
 * @param status - the answer that names the repository now being shown, when one
 *   has arrived; it takes precedence over the session's last-known repository.
 * @returns the saved scope, or undefined when this repository has none.
 */
export declare function readCommitScope(sessionId: string | undefined, status?: StatusPayload | null): CommitScope | undefined;
/**
 * Record the commit scope for the repository a session is showing.
 *
 * The repository is named by the answer on screen when it can be, and by the
 * session's alias otherwise, exactly as a snapshot write names it: a scope
 * change while the page still shows the cached answer must land on the same
 * Workspace key that read will use. A write that fails is not reported — the
 * page keeps the choice for as long as it is open, and persistence is a
 * convenience rather than a precondition.
 *
 * @param sessionId - the session the page belongs to, when it named one.
 * @param status - the answer the page is showing, or null before one arrives.
 * @param scope - the scope the reader picked.
 */
export declare function writeCommitScope(sessionId: string | undefined, status: StatusPayload | null, scope: CommitScope): void;
/**
 * The saved snapshot for the repository this session last read, if there is one.
 *
 * The alias answers before the Host does: a session that has opened this tab
 * before names its repository from `localStorage`, so a reloading page finds the
 * saved answer during its first render rather than after a network round trip.
 * A session no mount has seen, or one whose Workspace was never a repository,
 * simply answers null and loads exactly as it did before the cache existed.
 *
 * @param sessionId - the session the page belongs to, when it named one.
 * @returns the snapshot, or null when there is none to draw.
 */
export declare function readRepositorySnapshot(sessionId: string | undefined): RepositorySnapshot | null;
/**
 * Whether a saved snapshot is recent enough that a mount need not re-read.
 *
 * @param snapshot - the snapshot a mount would hydrate from.
 * @returns true when the answer is younger than {@link SNAPSHOT_FRESH_MS}.
 */
export declare function isSnapshotFresh(snapshot: RepositorySnapshot): boolean;
/**
 * Remember the answer a read just produced.
 *
 * Called by every path that re-reads the repository, so the snapshot on hand is
 * always the last thing the page saw — a manual Refresh, a checkout, a commit,
 * a pull, or the background re-read a mount starts. The repository is named by
 * the answer itself when it can be; a failure that names none (a transport
 * error, or a directory that is no longer a repository) is saved under the
 * session's last known repository, so the next mount shows the same failure
 * instead of a spinner.
 *
 * @param sessionId - the session the page belongs to, when it named one.
 * @param status - the `status` answer, or null when it never arrived.
 * @param log - the `log` answer, or null when it never arrived.
 */
export declare function writeRepositorySnapshot(sessionId: string | undefined, status: StatusPayload | null, log: LogPayload | null): void;
//# sourceMappingURL=cache.d.ts.map