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

import type { CommitScope, LogPayload, StatusPayload } from '../shared/contract.js'

/**
 * The prefix every entry this plugin writes carries.
 *
 * Versioned because the shape is: a later revision that stores something else
 * under the same names must not read this revision's values as its own. The
 * version lives in the key rather than inside the value so an old entry is
 * simply never found, and the index below drops it on the next write.
 */
const PREFIX = 'dsh-cool-git.cache.v1'

/** The `localStorage` entry listing the repositories whose snapshots are saved. */
const INDEX_KEY = `${PREFIX}.repositories`

/**
 * The prefix of the entries holding a Workspace's commit-scope choice.
 *
 * Deliberately outside {@link PREFIX}: the choice is a preference rather than a
 * snapshot, and the index's eviction sweeps snapshot entries only. Versioned on
 * its own so a later revision can change the stored shape without misreading
 * what this one wrote.
 */
const SCOPE_PREFIX = 'dsh-cool-git.commit-scope.v1'

/**
 * How old a saved snapshot may be before a mount re-reads it.
 *
 * A switch out of this tab and back within this window is one the reader is
 * still working in, and the answer they left is the one they want to see; a
 * longer absence is when the agent — or the reader, in another window — may
 * have moved the working tree. Five seconds is short enough that a return after
 * any real work re-reads, and long enough that flipping between tabs does not
 * start a `git status` per flip.
 */
const SNAPSHOT_FRESH_MS = 5_000

/**
 * How many repositories' snapshots are kept persisted; the oldest goes first.
 *
 * The bound is on disk, not on memory: the map above keeps every snapshot this
 * page has used, because dropping one from memory would turn a tab switch back
 * into a reload for no benefit — the entries are small next to the diff pane
 * they feed, and a page visits a bounded set of Workspaces.
 */
const MAX_SAVED_REPOSITORIES = 8

/**
 * Largest snapshot persisted, in JSON characters.
 *
 * `localStorage` is one shared quota of a few megabytes, and an oversized
 * repository answer — tens of thousands of changed paths, a very long history —
 * would spend much of it on one page. A snapshot over this bound stays in
 * memory, where the tab switch that needs it is served anyway; only a page
 * reload loses it, and that reload re-reads the repository.
 */
const MAX_SNAPSHOT_CHARS = 512 * 1024

/** One repository's last answer, as a mount reads it back. */
export interface RepositorySnapshot {
  /** The last `status` answer, or null when that read never answered. */
  readonly status: StatusPayload | null
  /** The last `log` answer, or null when that read never answered. */
  readonly log: LogPayload | null
  /** Wall-clock milliseconds when the snapshot was written, from `Date.now()`. */
  readonly savedAt: number
}

/** The snapshots alive in this page, keyed by repository identity. */
const snapshots = new Map<string, RepositorySnapshot>()

/** Session identity to repository identity, as earlier mounts learned it. */
const aliases = new Map<string, string>()

/**
 * The identity one session's repository is cached under.
 *
 * A session id is the key the page knows before it knows anything else, but the
 * page cannot run without one — the Host falls back to the executor's own
 * directory — so the empty string stands for "the session the shell did not
 * name": one answer for that directory, which is the same answer every such
 * mount would read.
 *
 * @param sessionId - the session the page belongs to, when it named one.
 * @returns the alias key.
 */
function identityOf(sessionId: string | undefined): string {
  return sessionId ?? ''
}

/**
 * One repository's `localStorage` entry name.
 *
 * @param repository - the repository's cache identity, an absolute path.
 * @returns the entry name.
 */
function repositoryKey(repository: string): string {
  return `${PREFIX}.repository.${encodeURIComponent(repository)}`
}

/**
 * One session's alias entry name.
 *
 * @param session - the session identity, as {@link identityOf} spelled it.
 * @returns the entry name.
 */
function aliasKey(session: string): string {
  return `${PREFIX}.session.${encodeURIComponent(session)}`
}

/**
 * The repository one answer is about, as the cache identifies it.
 *
 * The Workspace's canonical path first, because it is the path every session
 * attached to that Workspace resolves and the key the Settings routes store a
 * Workspace's choices under; the repository root second, because a deployment
 * whose registry cannot name a Workspace still has a directory to key by.
 *
 * The two identities can disagree across restarts or registry availability — the
 * status route attaches `workspace` only when the registry answers — so the same
 * repository may end up with two cold-start entries. That costs one re-read and
 * one of the saved slots; it can never show another repository's answer, because
 * each entry is keyed by the path the answer itself named.
 *
 * @param status - the answer to read the identity out of.
 * @returns the identity, or undefined when the answer names no repository.
 */
function repositoryOf(status: StatusPayload | null): string | undefined {
  const workspace = status?.workspace?.path
  if (typeof workspace === 'string' && workspace !== '') return workspace
  const root = status?.root
  if (typeof root === 'string' && root !== '') return root
  return undefined
}

/**
 * The repository identity a session was last seen reading, if any.
 *
 * @param session - the session identity, as {@link identityOf} spelled it.
 * @returns the repository identity, or undefined when no mount has recorded one.
 */
function readAlias(session: string): string | undefined {
  const known = aliases.get(session)
  if (known !== undefined) return known
  let stored: string | null
  try {
    stored = localStorage.getItem(aliasKey(session))
  } catch {
    return undefined
  }
  if (stored === null || stored === '') return undefined
  aliases.set(session, stored)
  return stored
}

/**
 * Record the repository a session read.
 *
 * Written through to `localStorage` so the alias survives a page reload, which
 * is the reload where the mount has no answer of its own and must find the
 * saved one before it asks the Host.
 *
 * An alias is deliberately not swept when its repository's entry is evicted: it
 * is one short string per session the browser has seen this tab in, and removing
 * it would only cost that session a full read, while finding and rewriting every
 * alias on an eviction would turn a cache write into a storage scan.
 *
 * @param session - the session identity, as {@link identityOf} spelled it.
 * @param repository - the repository identity the session read.
 */
function writeAlias(session: string, repository: string): void {
  if (aliases.get(session) === repository) return
  aliases.set(session, repository)
  try {
    localStorage.setItem(aliasKey(session), repository)
  } catch {
    /* the in-memory alias still serves this page's mounts */
  }
}

/**
 * One repository's commit-scope entry name.
 *
 * @param repository - the repository's identity, an absolute path.
 * @returns the entry name.
 */
function scopeKey(repository: string): string {
  return `${SCOPE_PREFIX}.${encodeURIComponent(repository)}`
}

/**
 * Read one repository's saved commit scope.
 *
 * A stored value is read as data rather than trusted: an entry written by
 * another revision of this plugin, or one damaged on disk, is the same answer
 * as no entry at all — the form opens on its default.
 *
 * @param repository - the identity to read.
 * @returns the saved scope, or undefined when none is stored.
 */
function readStoredScope(repository: string): CommitScope | undefined {
  let raw: string | null
  try {
    raw = localStorage.getItem(scopeKey(repository))
  } catch {
    return undefined
  }
  return raw === 'staged' || raw === 'all' ? raw : undefined
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
export function readCommitScope(
  sessionId: string | undefined,
  status: StatusPayload | null = null,
): CommitScope | undefined {
  const repository = repositoryOf(status) ?? readAlias(identityOf(sessionId))
  return repository === undefined ? undefined : readStoredScope(repository)
}

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
export function writeCommitScope(
  sessionId: string | undefined,
  status: StatusPayload | null,
  scope: CommitScope,
): void {
  const session = identityOf(sessionId)
  const repository = repositoryOf(status) ?? readAlias(session)
  if (repository === undefined) return
  // Recorded here as well: a reader who changes the scope before the first
  // snapshot write lands still leaves a reload a way to find this repository.
  writeAlias(session, repository)
  try {
    localStorage.setItem(scopeKey(repository), scope)
  } catch {
    /* the open page already shows the choice */
  }
}

/**
 * The repository order the index holds, most recently written first.
 *
 * @returns the identities the index lists; anything unreadable reads as empty.
 */
function readIndex(): string[] {
  let raw: string | null
  try {
    raw = localStorage.getItem(INDEX_KEY)
  } catch {
    return []
  }
  if (raw === null) return []
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return []
  }
  if (!Array.isArray(parsed)) return []
  return parsed.filter((entry): entry is string => typeof entry === 'string' && entry !== '')
}

/**
 * Put one repository at the head of the index, and drop the entries past the
 * bound.
 *
 * Eviction is by write order rather than by read: a page that only ever reads is
 * the page that benefits from the entry, and re-writing the index on every read
 * would trade a read for a write on the common path. The bound is what keeps a
 * long-lived page from accumulating every repository it ever opened.
 *
 * @param repository - the identity just written.
 */
function touchIndex(repository: string): void {
  const order = readIndex().filter(entry => entry !== repository)
  order.unshift(repository)
  for (const dropped of order.slice(MAX_SAVED_REPOSITORIES)) {
    try {
      localStorage.removeItem(repositoryKey(dropped))
    } catch {
      /* an entry left behind is one the next index write will forget */
    }
  }
  try {
    localStorage.setItem(INDEX_KEY, JSON.stringify(order.slice(0, MAX_SAVED_REPOSITORIES)))
  } catch {
    /* the entries are still readable by alias; the bound is only a bound */
  }
}

/**
 * Read and check one stored snapshot.
 *
 * @param repository - the identity to read.
 * @returns the snapshot, or null when there is none or it cannot be trusted.
 */
function readStored(repository: string): RepositorySnapshot | null {
  let raw: string | null
  try {
    raw = localStorage.getItem(repositoryKey(repository))
  } catch {
    return null
  }
  if (raw === null) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  return asSnapshot(parsed)
}

/**
 * Read one stored value as a snapshot, or null when any part of it is not one.
 *
 * The checks cover what a render walks: a `status` answer's changed-path rows,
 * a `log` answer's commit rows, and the Workspace the sidebar names. The scalar
 * facts beside them — the branch, its divergence, the head commit — are read
 * through optional access and draw as absent when an entry lacks one, so they
 * are not required here. A value from another revision of this plugin fails one
 * of these checks and is dropped, which is the same result as having no cache:
 * the mount re-reads.
 *
 * @param value - the parsed entry.
 * @returns the snapshot, or null when the value is not one.
 */
function asSnapshot(value: unknown): RepositorySnapshot | null {
  if (!isRecord(value)) return null
  const savedAt = value.savedAt
  if (typeof savedAt !== 'number' || !Number.isFinite(savedAt)) return null
  const status = value.status
  if (status !== null && !isStatus(status)) return null
  const log = value.log
  if (log !== null && !isLog(log)) return null
  return { status: status as StatusPayload | null, log: log as LogPayload | null, savedAt }
}

/**
 * Whether one value can be drawn by the page as a `status` answer.
 *
 * @param value - the value to check.
 * @returns true when the sidebar can render it.
 */
function isStatus(value: unknown): boolean {
  if (!isRecord(value) || typeof value.ok !== 'boolean') return false
  if (value.workspace !== undefined && !isWorkspace(value.workspace)) return false
  if (value.ok !== true) return true
  const files = value.files
  return Array.isArray(files) && files.every(isChangedFile)
}

/**
 * Whether one value is a changed-path row the tree can group and draw.
 *
 * @param value - the value to check.
 * @returns true for a row the sidebar renders.
 */
function isChangedFile(value: unknown): boolean {
  if (!isRecord(value)) return false
  if (typeof value.path !== 'string') return false
  if (value.origPath !== undefined && typeof value.origPath !== 'string') return false
  return typeof value.index === 'string'
    && typeof value.worktree === 'string'
    && typeof value.kind === 'string'
    && typeof value.staged === 'boolean'
    && typeof value.unstaged === 'boolean'
    && typeof value.untracked === 'boolean'
    && typeof value.conflicted === 'boolean'
}

/**
 * Whether one value can be drawn by the page as a `log` answer.
 *
 * @param value - the value to check.
 * @returns true when the history pane can render it.
 */
function isLog(value: unknown): boolean {
  if (!isRecord(value) || typeof value.ok !== 'boolean') return false
  if (value.ok !== true) return true
  const commits = value.commits
  return Array.isArray(commits) && commits.every(isCommit)
}

/**
 * Whether one value is a commit row the history pane can draw.
 *
 * @param value - the value to check.
 * @returns true for a row the pane renders.
 */
function isCommit(value: unknown): boolean {
  if (!isRecord(value)) return false
  const refs = value.refs
  const parents = value.parents
  return typeof value.hash === 'string'
    && typeof value.short === 'string'
    && typeof value.author === 'string'
    && typeof value.email === 'string'
    && typeof value.date === 'string'
    && typeof value.subject === 'string'
    && Array.isArray(refs) && refs.every(ref => typeof ref === 'string')
    && Array.isArray(parents) && parents.every(parent => typeof parent === 'string')
}

/**
 * Whether one value is the Workspace the sidebar names.
 *
 * @param value - the value to check.
 * @returns true for a Workspace the header can read.
 */
function isWorkspace(value: unknown): boolean {
  return isRecord(value) && typeof value.title === 'string' && typeof value.path === 'string'
}

/**
 * Whether one value is a plain object worth reading fields from.
 *
 * @param value - the value to check.
 * @returns true for a non-null, non-array object.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Persist one snapshot, if it is small enough to be worth the quota.
 *
 * A write that fails is not reported: the memory copy is what the next tab
 * switch reads, and only a page reload would notice the difference. An entry
 * over the size bound is removed rather than left stale, so a reload never
 * hydrates from an answer newer than the one on disk.
 *
 * @param repository - the identity the snapshot belongs to.
 * @param snapshot - the answer to save.
 */
function persist(repository: string, snapshot: RepositorySnapshot): void {
  let raw: string
  try {
    raw = JSON.stringify(snapshot)
  } catch {
    return
  }
  try {
    if (raw.length > MAX_SNAPSHOT_CHARS) {
      localStorage.removeItem(repositoryKey(repository))
      return
    }
    localStorage.setItem(repositoryKey(repository), raw)
  } catch {
    return
  }
  touchIndex(repository)
}

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
export function readRepositorySnapshot(sessionId: string | undefined): RepositorySnapshot | null {
  const repository = readAlias(identityOf(sessionId))
  if (repository === undefined) return null
  const memory = snapshots.get(repository)
  if (memory !== undefined) return memory
  const stored = readStored(repository)
  if (stored !== null) snapshots.set(repository, stored)
  return stored
}

/**
 * Whether a saved snapshot is recent enough that a mount need not re-read.
 *
 * @param snapshot - the snapshot a mount would hydrate from.
 * @returns true when the answer is younger than {@link SNAPSHOT_FRESH_MS}.
 */
export function isSnapshotFresh(snapshot: RepositorySnapshot): boolean {
  return Date.now() - snapshot.savedAt < SNAPSHOT_FRESH_MS
}

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
export function writeRepositorySnapshot(
  sessionId: string | undefined,
  status: StatusPayload | null,
  log: LogPayload | null,
): void {
  const session = identityOf(sessionId)
  const repository = repositoryOf(status) ?? readAlias(session)
  if (repository === undefined) return
  writeAlias(session, repository)
  const snapshot: RepositorySnapshot = { status, log, savedAt: Date.now() }
  snapshots.set(repository, snapshot)
  persist(repository, snapshot)
}
