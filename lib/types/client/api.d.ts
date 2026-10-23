/**
 * Client half of the package-private bridge to the Host routes.
 *
 * Every route answers JSON and never rejects: a transport failure becomes an
 * `{ ok: false }` result the caller reports in the error dialog, so the page has
 * exactly one failure shape to render no matter how the answer went wrong.
 */
import type { BranchesPayload, CheckoutPayload, CommitAllPayload, CommitPayload, DiffPayload, LogPayload, MergeDirection, MergePayload, MessagePayload, StatusPayload, SyncPayload } from '../shared/contract.js';
/**
 * Ask the Host for the session's repository state and changed paths.
 *
 * @param sessionId - the session whose directory Git runs in, when known.
 * @returns the status payload.
 */
export declare function fetchStatus(sessionId: string | undefined): Promise<StatusPayload>;
/**
 * Ask the Host for the newest commits.
 *
 * @param sessionId - the session whose directory Git runs in, when known.
 * @param limit - how many commits to ask for; the Host clamps it.
 * @returns the log payload.
 */
export declare function fetchLog(sessionId: string | undefined, limit?: number): Promise<LogPayload>;
/**
 * Ask the Host for one changed path's patch against HEAD.
 *
 * @param sessionId - the session whose directory Git runs in, when known.
 * @param file - the path to diff, with the row's own stage/untracked facts.
 * @returns the diff payload.
 */
export declare function fetchDiff(sessionId: string | undefined, file: {
    readonly path: string;
    readonly staged: boolean;
    readonly untracked: boolean;
}): Promise<DiffPayload>;
/**
 * Ask the Host for one commit's message and patch.
 *
 * @param sessionId - the session whose directory Git runs in, when known.
 * @param hash - the commit's hexadecimal object name.
 * @returns the commit payload.
 */
export declare function fetchCommit(sessionId: string | undefined, hash: string): Promise<CommitPayload>;
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
export declare function commitAll(sessionId: string | undefined, message: string): Promise<CommitAllPayload>;
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
export declare function generateMessage(sessionId: string | undefined): Promise<MessagePayload>;
/**
 * Ask the Host for the branches a switch may pick, local and remote-tracking.
 *
 * Read fresh on every open rather than cached: branches appear and disappear as
 * the agent works, and a stale menu would offer a branch that no longer exists.
 *
 * @param sessionId - the session whose directory Git runs in, when known.
 * @returns the branches payload.
 */
export declare function fetchBranches(sessionId: string | undefined): Promise<BranchesPayload>;
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
export declare function checkoutBranch(sessionId: string | undefined, branch: string): Promise<CheckoutPayload>;
/**
 * Ask the Host to merge one branch into another.
 *
 * The direction is the caller's, because it is what the user chose: `to` merges
 * this branch into the named one, `from` merges the named one into this one.
 * What the name may be is the Host's answer either way — a source may be a
 * remote-tracking ref, a target may not — and both directions leave the branch
 * HEAD is on where it is, so the page re-reads the repository afterwards rather
 * than switching anything itself.
 *
 * @param sessionId - the session whose directory Git runs in, when known.
 * @param branch - the branch to merge: the source for `from`, the target for `to`.
 * @param direction - which side of the merge the current branch is on.
 * @returns the merge payload.
 */
export declare function mergeBranch(sessionId: string | undefined, branch: string, direction: MergeDirection): Promise<MergePayload>;
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
export declare function pullBranch(sessionId: string | undefined): Promise<SyncPayload>;
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
export declare function pushBranch(sessionId: string | undefined): Promise<SyncPayload>;
//# sourceMappingURL=api.d.ts.map