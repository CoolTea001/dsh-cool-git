/**
 * Client half of the package-private bridge to the Host routes.
 *
 * Every route answers JSON and never rejects: a transport failure becomes an
 * `{ ok: false }` result the caller reports in the error dialog, so the page has
 * exactly one failure shape to render no matter how the answer went wrong.
 */

import type {
  BranchDeleteTarget,
  BranchReportPayload,
  BranchesPayload,
  CheckoutPayload,
  CommitAllPayload,
  CommitPayload,
  CreateBranchPayload,
  DeleteBranchesPayload,
  DiffPayload,
  FetchPayload,
  LogPayload,
  MergePayload,
  MessageModel,
  MessagePayload,
  ModelEffortsPayload,
  SaveSettingsPayload,
  SettingsPayload,
  StatusPayload,
  SyncPayload,
} from '../shared/contract.js'

const BASE = '/dsh-cool-git/api'

/**
 * POST one JSON body and read a JSON answer.
 *
 * @param path - route path below {@link BASE}.
 * @param body - the request body.
 * @returns the parsed payload, or an `{ ok: false }` result when the transport failed.
 */
async function postJson(path: string, body: unknown): Promise<any> {
  try {
    const response = await fetch(`${BASE}${path}`, {
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
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}

/**
 * Ask the Host for the session's repository state and changed paths.
 *
 * @param sessionId - the session whose directory Git runs in, when known.
 * @returns the status payload.
 */
export function fetchStatus(sessionId: string | undefined): Promise<StatusPayload> {
  return postJson('/status', { sessionId })
}

/**
 * Ask the Host for the newest commits.
 *
 * @param sessionId - the session whose directory Git runs in, when known.
 * @param limit - how many commits to ask for; the Host clamps it.
 * @returns the log payload.
 */
export function fetchLog(sessionId: string | undefined, limit?: number): Promise<LogPayload> {
  return postJson('/log', { sessionId, limit })
}

/**
 * Ask the Host for one changed path's patch against HEAD.
 *
 * @param sessionId - the session whose directory Git runs in, when known.
 * @param file - the path to diff, with the row's own stage/untracked facts.
 * @returns the diff payload.
 */
export function fetchDiff(
  sessionId: string | undefined,
  file: { readonly path: string; readonly staged: boolean; readonly untracked: boolean },
): Promise<DiffPayload> {
  return postJson('/diff', {
    sessionId,
    path: file.path,
    staged: file.staged,
    untracked: file.untracked,
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
  return postJson('/commit', { sessionId, hash })
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
  return postJson('/commit-all', { sessionId, message })
}

/**
 * Ask the Host to write a commit message for the changes on disk.
 *
 * The request names no changes and no model: which paths the model is shown, and
 * which model writes the message, are the Host's own reads — the repository's
 * state and the deployment's current default selection. The answer is a draft for
 * the form, never a commit: this call leaves the index and the history alone.
 *
 * @param sessionId - the session whose directory Git runs in, when known.
 * @returns the message payload, with the model's own findings beside it.
 */
export function generateMessage(sessionId: string | undefined): Promise<MessagePayload> {
  return postJson('/message', { sessionId })
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
  return postJson('/settings', { sessionId })
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
  return postJson('/settings-save', { sessionId, model, prompt })
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
  return postJson('/model-efforts', { provider, model })
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
  return postJson('/branches', { sessionId })
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
  return postJson('/checkout', { sessionId, branch })
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
  return postJson('/branch-report', { sessionId })
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
  return postJson('/branch-create', { sessionId, name, start })
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
  return postJson('/branch-delete', { sessionId, targets })
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
  return postJson('/merge', { sessionId, branch })
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
  return postJson('/fetch', { sessionId })
}

/**
 * Ask the Host to fast-forward the current branch from its upstream.
 *
 * The Host reads which branch and which upstream from the repository itself, so
 * this call carries nothing to aim: it is a request to pull, not an instruction
 * about what to pull. A divergent history is refused rather than merged.
 *
 * @param sessionId - the session whose directory Git runs in, when known.
 * @returns the sync payload.
 */
export function pullBranch(sessionId: string | undefined): Promise<SyncPayload> {
  return postJson('/pull', { sessionId })
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
  return postJson('/push', { sessionId })
}
