/**
 * Client half of the package-private bridge to the Host routes.
 *
 * Every route answers JSON and never rejects: a transport failure becomes an
 * `{ ok: false }` result the caller reports in the error dialog, so the page has
 * exactly one failure shape to render no matter how the answer went wrong.
 */
import type { BranchesPayload, CheckoutPayload, CommitPayload, DiffPayload, LogPayload, StatusPayload, SyncPayload } from '../shared/contract.js';
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
 * This is the only call that changes the repository: the Host runs a real
 * checkout, so the working tree on disk is different afterwards and every
 * other answer on this page is stale.
 *
 * @param sessionId - the session whose directory Git runs in, when known.
 * @param branch - the local or remote-tracking branch to switch to.
 * @returns the checkout payload.
 */
export declare function checkoutBranch(sessionId: string | undefined, branch: string): Promise<CheckoutPayload>;
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