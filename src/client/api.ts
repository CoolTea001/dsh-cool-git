/**
 * Client half of the package-private bridge to the Host routes.
 *
 * Every route answers JSON and never rejects: a transport failure becomes an
 * `{ ok: false }` result the caller reports in the error dialog, so the page has
 * exactly one failure shape to render no matter how the answer went wrong.
 */

import {
  ROUTES,
  type BranchDeleteTarget,
  type BranchReportPayload,
  type BranchesPayload,
  type CheckoutPayload,
  type CommitAllPayload,
  type CommitPayload,
  type CommitScope,
  type ConflictPayload,
  type CreateBranchPayload,
  type DeleteBranchesPayload,
  type DiffPayload,
  type DiffSide,
  type FetchPayload,
  type FetchUpstreamPayload,
  type IndexPayload,
  type LogPayload,
  type MergePayload,
  type MessageModel,
  type MessagePayload,
  type ModelEffortsPayload,
  type OperationPayload,
  type ResolveChoice,
  type ResolveDonePayload,
  type ResolvePayload,
  type SaveSettingsPayload,
  type SettingsPayload,
  type StatusPayload,
  type SyncPayload,
  type UpdateApplyPayload,
  type UpdateCheckPayload,
  type UndoCommitPayload,
} from '../shared/contract.js'
import { errorMessage } from '../shared/error.js'

/**
 * POST one JSON body and read a JSON answer.
 *
 * @param path - the route to post to, as {@link ROUTES} spells it.
 * @param body - the request body.
 * @returns the parsed payload, or an `{ ok: false }` result when the transport failed.
 */
async function postJson(path: string, body: unknown): Promise<any> {
  try {
    const response = await fetch(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      credentials: 'same-origin',
    })
    const payload: unknown = await response.json().catch(() => null)
    if (payload === null || typeof payload !== 'object') {
      return { ok: false, error: `HTTP ${response.status}` }
    }
    return payload
  } catch (error) {
    return { ok: false, error: errorMessage(error) }
  }
}

/**
 * Ask the Host for the session's repository state and changed paths.
 *
 * @param sessionId - the session whose directory Git runs in, when known.
 * @returns the status payload.
 */
export function fetchStatus(sessionId: string | undefined): Promise<StatusPayload> {
  return postJson(ROUTES.status, { sessionId })
}

/**
 * Ask the Host for the newest commits.
 *
 * @param sessionId - the session whose directory Git runs in, when known.
 * @param limit - how many commits to ask for; the Host clamps it.
 * @returns the log payload.
 */
export function fetchLog(sessionId: string | undefined, limit?: number): Promise<LogPayload> {
  return postJson(ROUTES.log, { sessionId, limit })
}

/**
 * Ask the Host for one side of one changed path's patch.
 *
 * The side is the row's own: a staged row asks for the index against HEAD, and
 * an unstaged row asks for the worktree against the index. A file that is both
 * appears as two rows, and each must answer with the patch that row names rather
 * than the same combined one.
 *
 * @param sessionId - the session whose directory Git runs in, when known.
 * @param file - the path to diff.
 * @param side - the half of the path this row stands for.
 * @param untracked - whether the path is untracked, which has no HEAD side.
 * @returns the diff payload.
 */
export function fetchDiff(
  sessionId: string | undefined,
  file: { readonly path: string },
  side: DiffSide,
  untracked: boolean,
): Promise<DiffPayload> {
  return postJson(ROUTES.diff, {
    sessionId,
    path: file.path,
    side,
    untracked,
  })
}

/**
 * Ask the Host for one commit's message and patch.
 *
 * @param sessionId - the session whose directory Git runs in, when known.
 * @param hash - the commit's hexadecimal object name.
 * @returns the commit payload.
 */
export function fetchCommit(sessionId: string | undefined, hash: string): Promise<CommitPayload> {
  return postJson(ROUTES.commit, { sessionId, hash })
}

/**
 * Ask the Host to commit every change the working tree has.
 *
 * One request, not a stage followed by a commit: the Host stages everything
 * `git status` reports — untracked files included, since those are rows the page
 * lists too — and commits it under this message. So the page never holds a
 * half-staged index it cannot name, and a refusal (a conflict left unresolved, a
 * message Git will not take) arrives as one answer.
 *
 * @param sessionId - the session whose directory Git runs in, when known.
 * @param message - the commit message, non-empty.
 * @returns the commit-all payload.
 */
export function commitAll(
  sessionId: string | undefined,
  message: string,
): Promise<CommitAllPayload> {
  return postJson(ROUTES.commitAll, { sessionId, message })
}

/**
 * Ask the Host to commit the index as it stands.
 *
 * Nothing is staged here: the page's own `+` and `−` actions decided what the
 * index holds, and the Host commits exactly that. A conflict, or an index with
 * nothing in it, is refused as one answer.
 *
 * @param sessionId - the session whose directory Git runs in, when known.
 * @param message - the commit message, non-empty.
 * @returns the commit payload, shaped like the commit-all answer.
 */
export function commitStaged(
  sessionId: string | undefined,
  message: string,
): Promise<CommitAllPayload> {
  return postJson(ROUTES.commitStaged, { sessionId, message })
}

/**
 * Ask the Host to take the commit at HEAD back off the branch.
 *
 * The move is a soft reset: the commit leaves the branch, and everything it
 * recorded stays in the index and the working tree, so the changes return as
 * staged work rather than disappearing. The page re-reads the repository after
 * it because both the history and the changed-path lists describe a branch that
 * has just moved.
 *
 * @param sessionId - the session whose directory Git runs in, when known.
 * @returns the undo payload, which names the commit that was moved.
 */
export function undoLastCommit(sessionId: string | undefined): Promise<UndoCommitPayload> {
  return postJson(ROUTES.undoCommit, { sessionId })
}

/**
 * Move one path into the index.
 *
 * The answer carries the repository's fresh status, so the page repaints both
 * halves of the list from the state this write produced instead of asking for a
 * second read that another writer could race.
 *
 * @param sessionId - the session whose directory Git runs in, when known.
 * @param path - the repository-relative path to stage.
 * @returns the index payload.
 */
export function stagePath(sessionId: string | undefined, path: string): Promise<IndexPayload> {
  return postJson(ROUTES.stage, { sessionId, path })
}

/**
 * Move one path out of the index, keeping its worktree file.
 *
 * @param sessionId - the session whose directory Git runs in, when known.
 * @param path - the repository-relative path to unstage.
 * @param origPath - the rename source, when the row is a rename: both halves of
 *   a staged rename are restored together.
 * @returns the index payload.
 */
export function unstagePath(
  sessionId: string | undefined,
  path: string,
  origPath?: string,
): Promise<IndexPayload> {
  return postJson(ROUTES.unstage, {
    sessionId,
    path,
    ...(origPath === undefined ? {} : { origPath }),
  })
}

/**
 * Discard one path's unstaged change.
 *
 * The Host restores a tracked path from the index, or deletes an untracked one;
 * either way the answer carries the fresh status, so the page repaints the lists
 * without a second read that another writer could race. This is destructive and
 * the page asks before calling it.
 *
 * @param sessionId - the session whose directory Git runs in, when known.
 * @param path - the repository-relative path to discard.
 * @param untracked - whether the path is untracked, which is deleted rather than restored.
 * @returns the index payload, carrying the repository state after the write.
 */
export function discardPath(
  sessionId: string | undefined,
  path: string,
  untracked: boolean,
): Promise<IndexPayload> {
  return postJson(ROUTES.discard, { sessionId, path, untracked })
}

/**
 * Stage every change under one folder.
 *
 * The request names the directory alone: the Host reads the status inside its
 * write queue and stages the paths under it that still sit in the worktree, so a
 * large folder never has to be enumerated across the request body or in a run of
 * one-file requests.
 *
 * @param sessionId - the session whose directory Git runs in, when known.
 * @param path - the repository-relative folder to stage.
 * @returns the index payload, carrying the repository state after the write.
 */
export function stageFolder(sessionId: string | undefined, path: string): Promise<IndexPayload> {
  return postJson(ROUTES.stageFolder, { sessionId, path })
}

/**
 * Move every staged change under one folder out of the index.
 *
 * @param sessionId - the session whose directory Git runs in, when known.
 * @param path - the repository-relative folder to unstage.
 * @returns the index payload, carrying the repository state after the write.
 */
export function unstageFolder(sessionId: string | undefined, path: string): Promise<IndexPayload> {
  return postJson(ROUTES.unstageFolder, { sessionId, path })
}

/**
 * Discard every unstaged change under one folder.
 *
 * @param sessionId - the session whose directory Git runs in, when known.
 * @param path - the repository-relative folder to discard.
 * @returns the index payload, carrying the repository state after the write.
 */
export function discardFolder(sessionId: string | undefined, path: string): Promise<IndexPayload> {
  return postJson(ROUTES.discardFolder, { sessionId, path })
}

/**
 * Stage every changed path in the repository.
 *
 * The header's whole-list action names no path: the Host resolves the worktree
 * side from the status it reads in its write queue, so the request stays one
 * call however large the tree is.
 *
 * @param sessionId - the session whose directory Git runs in, when known.
 * @returns the index payload, carrying the repository state after the write.
 */
export function stageAll(sessionId: string | undefined): Promise<IndexPayload> {
  return postJson(ROUTES.stageAll, { sessionId })
}

/**
 * Move every staged change in the repository out of the index.
 *
 * @param sessionId - the session whose directory Git runs in, when known.
 * @returns the index payload, carrying the repository state after the write.
 */
export function unstageAll(sessionId: string | undefined): Promise<IndexPayload> {
  return postJson(ROUTES.unstageAll, { sessionId })
}

/**
 * Discard every unstaged change in the repository.
 *
 * @param sessionId - the session whose directory Git runs in, when known.
 * @returns the index payload, carrying the repository state after the write.
 */
export function discardAll(sessionId: string | undefined): Promise<IndexPayload> {
  return postJson(ROUTES.discardAll, { sessionId })
}

/**
 * Ask the Host to write a commit message for the changes on disk.
 *
 * The request names no changes and no model: which paths the model is shown, and
 * which model writes the message, are the Host's own reads — the repository's
 * state and the deployment's current default selection. The answer is a draft for
 * the form, never a commit: this call leaves the index and the history alone.
 *
 * The scope is the one the form's commit button is set to: a staged-only commit
 * gets a message about the index alone, so it cannot describe a file it will
 * leave behind.
 *
 * @param sessionId - the session whose directory Git runs in, when known.
 * @param scope - whether the message describes the index or the whole tree.
 * @returns the message payload, with the model's own findings beside it.
 */
export function generateMessage(
  sessionId: string | undefined,
  scope: CommitScope,
): Promise<MessagePayload> {
  return postJson(ROUTES.message, { sessionId, scope })
}

/**
 * Ask the Host what this Workspace has chosen for generated messages.
 *
 * Read when the Settings dialog opens rather than cached: which models exist and
 * which one DSH currently defaults to change with the rest of the app, and a
 * dialog opened after a model switch must say what that switch now means. The
 * answer also carries the built-in prompt, so the field can open on the text the
 * default actually uses.
 *
 * @param sessionId - the session whose Workspace these choices belong to.
 * @returns the settings payload.
 */
export function fetchSettings(sessionId: string | undefined): Promise<SettingsPayload> {
  return postJson(ROUTES.settings, { sessionId })
}

/**
 * Store this Workspace's choices for generated messages.
 *
 * Both fields are sent every time, because the dialog's Save is one answer to
 * both questions: a null model or a blank prompt is how it asks for the default
 * back. The Host keys the write by the session's own Workspace, never by
 * anything the caller names, so one Workspace cannot write another's choices.
 *
 * @param sessionId - the session whose Workspace these choices belong to.
 * @param model - the model to use, or null for DSH's current default.
 * @param prompt - the system prompt to use, or null for the built-in one.
 * @returns the save payload.
 */
export function saveSettings(
  sessionId: string | undefined,
  model: MessageModel | null,
  prompt: string | null,
): Promise<SaveSettingsPayload> {
  return postJson(ROUTES.settingsSave, { sessionId, model, prompt })
}

/**
 * Ask which reasoning efforts one model route may be saved with.
 *
 * Asked lazily, per model, when the picker opens that row's effort control:
 * effort metadata is resolved by the adapter that owns the route, and a dialog
 * that resolved every model up front would pay for lists nobody opened. The
 * answer is the adapter's own ids, which is what a saved route names.
 *
 * @param provider - the registered provider route.
 * @param model - the provider-owned model id.
 * @returns the efforts payload.
 */
export function fetchModelEfforts(provider: string, model: string): Promise<ModelEffortsPayload> {
  return postJson(ROUTES.modelEfforts, { provider, model })
}

/**
 * Ask the Host for the branches a switch may pick, local and remote-tracking.
 *
 * Read fresh on every open rather than cached: branches appear and disappear as
 * the agent works, and a stale menu would offer a branch that no longer exists.
 *
 * @param sessionId - the session whose directory Git runs in, when known.
 * @returns the branches payload.
 */
export function fetchBranches(sessionId: string | undefined): Promise<BranchesPayload> {
  return postJson(ROUTES.branches, { sessionId })
}

/**
 * Ask the Host to check out one branch.
 *
 * This is one of the calls that change the repository, and it is the one that
 * moves HEAD: the Host runs a real checkout, so the working tree on disk is
 * different afterwards and every other answer on this page is stale.
 *
 * @param sessionId - the session whose directory Git runs in, when known.
 * @param branch - the local or remote-tracking branch to switch to.
 * @returns the checkout payload.
 */
export function checkoutBranch(
  sessionId: string | undefined,
  branch: string,
): Promise<CheckoutPayload> {
  return postJson(ROUTES.checkout, { sessionId, branch })
}

/**
 * Ask the Host for the branches the delete dialog may offer.
 *
 * A read of its own rather than the switch list, because these rows carry facts
 * the switch never needs: which upstream each branch tracks, how far ahead or
 * behind it is, and whether HEAD already reaches it. Those are what the row's
 * safety mark is drawn from, and they are read when the dialog opens.
 *
 * @param sessionId - the session whose directory Git runs in, when known.
 * @returns the branch report payload.
 */
export function fetchBranchReport(sessionId: string | undefined): Promise<BranchReportPayload> {
  return postJson(ROUTES.branchReport, { sessionId })
}

/**
 * Ask the Host to start a branch at one point and switch to it.
 *
 * The start point is a branch rather than a commit: the dialog offers the same
 * list a switch does, so the choice is between branches and the new one lands on
 * the point that was named. Branching off a remote-tracking ref is what sets the
 * new branch's upstream, which is Git's own answer to starting from `origin/main`.
 *
 * @param sessionId - the session whose directory Git runs in, when known.
 * @param name - the local branch to create.
 * @param start - the local or remote-tracking branch it starts at.
 * @returns the create payload.
 */
export function createBranch(
  sessionId: string | undefined,
  name: string,
  start: string,
): Promise<CreateBranchPayload> {
  return postJson(ROUTES.branchCreate, { sessionId, name, start })
}

/**
 * Ask the Host to delete the branches the dialog selected.
 *
 * One request for the whole selection, because the choice was made once: the
 * Host deletes each branch on its own and answers with one result per branch, so
 * the page reports the refusals and keeps them next to the names they were about.
 * Each target is echoed back in the shape the report gave it — a local branch, or
 * a remote-tracking row with its remote and branch — rather than a name the Host
 * would have to split again.
 *
 * @param sessionId - the session whose directory Git runs in, when known.
 * @param targets - the branches to delete, in the order the dialog listed them.
 * @returns the delete payload.
 */
export function deleteBranches(
  sessionId: string | undefined,
  targets: readonly BranchDeleteTarget[],
): Promise<DeleteBranchesPayload> {
  return postJson(ROUTES.branchDelete, { sessionId, targets })
}

/**
 * Ask the Host to merge one branch into the one HEAD is on.
 *
 * The named branch is the source, because that is the only merge Git has: it
 * merges into the branch it is on, which is the branch the page is showing. What
 * the name may be is the Host's answer — a local branch or a remote-tracking ref
 * — and the merge leaves HEAD where it is, so the page re-reads the repository
 * afterwards rather than switching anything itself.
 *
 * @param sessionId - the session whose directory Git runs in, when known.
 * @param branch - the branch to merge in.
 * @returns the merge payload.
 */
export function mergeBranch(
  sessionId: string | undefined,
  branch: string,
): Promise<MergePayload> {
  return postJson(ROUTES.merge, { sessionId, branch })
}

/**
 * Ask the Host for one unmerged path, as the resolver draws it.
 *
 * The answer is a parsed view of the working-tree file — its context, its
 * conflict blocks, and the label Git gave each side — rather than a patch,
 * because a patch of an unmerged path is a combined diff, which describes the
 * conflict instead of offering a choice within it.
 *
 * @param sessionId - the session whose directory Git runs in, when known.
 * @param path - the repository-relative path.
 * @returns the conflict payload.
 */
export function fetchConflict(
  sessionId: string | undefined,
  path: string,
): Promise<ConflictPayload> {
  return postJson(ROUTES.conflict, { sessionId, path })
}

/**
 * Ask the Host to apply one choice to one path.
 *
 * Two shapes, as the route reads them: `keys` replaces exactly those blocks and
 * leaves the rest of the file alone, while a request naming none takes a whole
 * version and marks the path resolved. The answer carries the file after the
 * write, so the pane repaints from what is really on disk instead of assuming
 * the rewrite did what the click meant.
 *
 * @param sessionId - the session whose directory Git runs in, when known.
 * @param path - the repository-relative path.
 * @param choice - which version to keep.
 * @param keys - the blocks to replace, or undefined for a whole-file choice.
 * @returns the resolve payload.
 */
export function resolveConflict(
  sessionId: string | undefined,
  path: string,
  choice: ResolveChoice,
  keys?: readonly string[],
): Promise<ResolvePayload> {
  return postJson(ROUTES.resolve, {
    sessionId,
    path,
    choice,
    ...(keys === undefined ? {} : { keys }),
  })
}

/**
 * Ask the Host to mark one path resolved without writing it.
 *
 * The reader who edited the file themselves has nothing left to write; `git add`
 * is the whole of the decision, and on an unmerged path that is what "resolved"
 * means. The answer carries the fresh status, so the sidebar's conflict count
 * falls in the same paint.
 *
 * @param sessionId - the session whose directory Git runs in, when known.
 * @param path - the repository-relative path.
 * @returns the resolve-done payload.
 */
export function markResolved(
  sessionId: string | undefined,
  path: string,
): Promise<ResolveDonePayload> {
  return postJson(ROUTES.resolveDone, { sessionId, path })
}

/**
 * Ask the Host to finish a merge.
 *
 * Every conflict must be resolved and staged first. The message is the one the
 * form held, or none at all — and none is the normal case, because the merge
 * already has Git's own `MERGE_MSG` — so an empty field records the merge with
 * the words Git wrote when it started.
 *
 * @param sessionId - the session whose directory Git runs in, when known.
 * @param message - the reader's message, or nothing to keep Git's.
 * @returns the operation payload, carrying the merge commit once it is made.
 */
export function completeMerge(
  sessionId: string | undefined,
  message?: string,
): Promise<OperationPayload> {
  return postJson(ROUTES.mergeCommit, message === undefined ? { sessionId } : { sessionId, message })
}

/**
 * Ask the Host to refresh every remote-tracking ref.
 *
 * Nothing crosses with the request and nothing comes back but the outcome: which
 * remotes exist is the repository's answer, and what a fetch moves lives inside
 * `.git`. The page re-reads the repository afterwards, because the two things a
 * fetch can change on screen — the divergence counts and the remote branch list
 * — are both read from those refs.
 *
 * @param sessionId - the session whose directory Git runs in, when known.
 * @returns the fetch payload.
 */
export function fetchRemotes(sessionId: string | undefined): Promise<FetchPayload> {
  return postJson(ROUTES.fetch, { sessionId })
}

/**
 * Ask the Host to refresh just the current branch's upstream ref.
 *
 * The branch switch's follow-up rather than a reader's request: the counts the
 * sync control draws compare the branch with its upstream, and only a fetch moves
 * that ref. A switch re-reads the working tree but leaves the remote-tracking ref
 * where the last fetch put it, so the page asks for this after a switch to find
 * out whether the remote has anything new for the branch it just landed on.
 *
 * Every answer is quiet. `skipped` means there was nothing to refresh — no
 * upstream, a detached HEAD — and an `ok: false` means the fetch could not reach
 * the remote (offline, no credentials, a session that may not write `.git`); the
 * caller keeps the counts it has and opens no dialog, because the switch itself
 * already succeeded and was reported.
 *
 * @param sessionId - the session whose directory Git runs in, when known.
 * @returns the fetch payload, with `skipped` when there was nothing to refresh.
 */
export function fetchBranchUpstream(sessionId: string | undefined): Promise<FetchUpstreamPayload> {
  return postJson(ROUTES.fetchUpstream, { sessionId })
}

/**
 * Ask the Host to pull the current branch from its upstream.
 *
 * The Host reads which branch and which upstream from the repository itself, so
 * this call carries nothing to aim: it is a request to pull, not an instruction
 * about what to pull. The pull merges rather than rebases, so a divergent history
 * is joined with a merge commit whose message Git writes itself; when the two
 * sides conflict, the merge is left in the working tree and the answer says so —
 * `reason: 'conflict'` — which is what puts the paths in the conflict list.
 *
 * @param sessionId - the session whose directory Git runs in, when known.
 * @returns the sync payload.
 */
export function pullBranch(sessionId: string | undefined): Promise<SyncPayload> {
  return postJson(ROUTES.pull, { sessionId })
}

/**
 * Ask the Host to push the current branch to its upstream.
 *
 * As with the pull, the target comes from the repository. A branch with no
 * upstream is pushed to the single configured remote (which then becomes its
 * upstream); with no remote or several, the Host refuses rather than guess.
 *
 * @param sessionId - the session whose directory Git runs in, when known.
 * @returns the sync payload.
 */
export function pushBranch(sessionId: string | undefined): Promise<SyncPayload> {
  return postJson(ROUTES.push, { sessionId })
}

/**
 * Ask the Host which version of this plugin is published.
 *
 * The question belongs to the plugin's own page rather than to any session: the
 * registry and the profile are the Host's to read, and neither has anything to
 * do with the repository a Git tab is showing, so no session id travels with the
 * request. An answer that could not reach the registry is `ok: false` with text,
 * which the row states quietly under itself.
 *
 * @returns the version payload.
 */
export function checkUpdate(): Promise<UpdateCheckPayload> {
  return postJson(ROUTES.update, {})
}

/**
 * Ask the Host to install one published version of this plugin.
 *
 * The version is the one the row was shown, never one the reader typed; the Host
 * refuses anything that is not a plain release version before the manager is
 * asked, and the manager itself performs the same install the Plugins panel
 * performs.
 *
 * @param version - the version to install.
 * @returns the install payload, carrying how the manager applied it.
 */
export function applyUpdate(version: string): Promise<UpdateApplyPayload> {
  return postJson(ROUTES.updateApply, { version })
}
