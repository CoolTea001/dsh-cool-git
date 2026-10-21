/**
 * The Host half's Git reader, and its four writers.
 *
 * Every fact about the repository is produced by running the real `git` binary
 * through the `shell` capability seam — never by reading `.git` by hand. That
 * keeps this plugin honest about the things Git is authoritative for (the index,
 * renames, merge state, `core.*` configuration, `.gitignore`) and inherits the
 * session's own file policy: `routes.ts` resolves the calling session's mode and
 * workspace root, every command carries that policy on its request, and the Git
 * tab can therefore never exceed what the session may already do. Without it the
 * seam would fall back to the deployment's mode and root — a `read-only` default
 * under a `workspace-write` session — and refuse the very writes the session
 * allows.
 *
 * Reading is the bulk of this module. Four commands change something — the
 * branch switch, the fast-forward pull, the push, and the commit — and each
 * reports a sandbox refusal as such rather than as a Git error, because under a
 * `read-only` mode that refusal is the whole answer. The commit is the one that
 * writes the index as well as the history, which is why it is a single call
 * rather than a stage the page could leave half-finished.
 *
 * Three properties of the invocation matter and are easy to lose:
 *
 *   - `--no-pager` on every command: without it a pager would hold the pipe open
 *     and the command would sit there until its timeout.
 *   - `GIT_OPTIONAL_LOCKS=0`: `git status` otherwise refreshes the index, which
 *     is a write. Every read must also work in a `read-only` sandbox — and taking
 *     a lock it does not need would fight the agent's own `git` calls in the same
 *     repository.
 *   - `-c core.quotePath=false`: Git otherwise C-quotes any path holding a
 *     non-ASCII byte (`"\346\226\207.md"`), and those paths then cannot be
 *     matched back to the ones `status` reported.
 *
 * Process output is parsed here rather than in the browser: the browser half has
 * no Node context, and parsing next to the command keeps the JSON contract in
 * `shared/contract.ts` the only thing the two halves must agree on.
 */
import { type BranchesPayload, type ChangedFile, type CheckoutPayload, type CommitAllPayload, type CommitPayload, type DiffPayload, type LogPayload, type StatusPayload, type SyncPayload } from '../shared/contract.js';
import { type Refusal } from './refusal.js';
/** Commits returned when the caller names no limit. */
export declare const DEFAULT_LOG_LIMIT = 60;
/**
 * Everything one request needs to run Git.
 *
 * The file policy travels with the shell rather than being re-derived per
 * command: the seam applies the policy a request carries, and an agentless call
 * would otherwise fall back to the deployment's own mode and root — which is
 * how a `workspace-write` session ends up refused a write it is allowed to make.
 * See `routes.ts` for where the policy is resolved from the session.
 */
export interface GitTarget {
    /** The `shell` capability service. */
    readonly shell: any;
    /** The directory the command runs in. */
    readonly workdir: string;
    /**
     * The calling session's resolved file policy, when the mounted executor
     * confines. Absent for an unconfined executor, or a request with no session.
     */
    readonly sandboxPolicy?: unknown;
}
/**
 * Read the current branch, its upstream, and every changed path.
 *
 * @param target - the shell seam, the session's directory, and the file policy.
 * @returns the status payload the page renders its sidebar from.
 */
export declare function readStatus(target: GitTarget): Promise<StatusPayload>;
/**
 * Read the newest commits of the current branch.
 *
 * An unborn branch is not an error: the history is legitimately empty, and the
 * page shows its empty state instead of `fatal: your current branch ... does
 * not have any commits yet`.
 *
 * @param target - the shell seam, the session's directory, and the file policy.
 * @param limit - how many commits to return; clamped to {@link MAX_LOG_LIMIT}.
 * @returns the log payload.
 */
export declare function readLog(target: GitTarget, limit: number): Promise<LogPayload>;
/**
 * Read one commit's message and its patch.
 *
 * The patch is produced by diffing the commit against its first parent. That is
 * deliberately not `git show`: with the default configuration `show` prints no
 * diff at all for a merge commit, and asking it for one only moved the problem
 * to a `--diff-merges` flag newer Git versions require. A root commit has no
 * parent to diff against, so it keeps `show`, which prints the whole tree as an
 * addition.
 *
 * @param target - the shell seam, the session's directory, and the file policy.
 * @param hash - a hexadecimal object name, already validated by the route.
 * @returns the commit payload, including the raw patch for the page's parser.
 */
export declare function readCommit(target: GitTarget, hash: string): Promise<CommitPayload>;
/**
 * Read one path's difference against HEAD.
 *
 * A tracked path is diffed against HEAD rather than against the index, so a
 * file with both staged and unstaged edits shows everything that differs from
 * the last commit in one patch — which is what the row's own "show this file's
 * changes" means. An untracked path has no HEAD side at all, so it is diffed
 * against `/dev/null`; a repository without commits compares against the index
 * or the worktree, whichever side the row says holds the change.
 *
 * @param target - the shell seam, the session's directory, and the file policy.
 * @param file - the changed path, as `status` reported it.
 * @returns the unified diff, or the reason there is none.
 */
export declare function readDiff(target: GitTarget, file: Pick<ChangedFile, 'path' | 'staged' | 'untracked'>): Promise<DiffPayload>;
/** One recent commit message, as the prompt's style evidence. */
export interface StyleSample {
    /** The message as it was committed: its subject, and its body when it has one. */
    readonly text: string;
    /** The message was longer than {@link MAX_SAMPLE_MESSAGE_CHARS} and is stored cut. */
    readonly truncated: boolean;
}
/** One untracked path, as the message prompt sees it. */
export interface UntrackedPreview {
    /** Worktree-relative path. */
    readonly path: string;
    /**
     * What Git printed for this path against `/dev/null`: its `--stat` line —
     * which is where a binary file's byte size appears — and then its patch, cut
     * at the Host's bound.
     */
    readonly text: string;
    /** The preview was cut, so the file is longer than what is shown. */
    readonly truncated: boolean;
}
/**
 * Everything the message generator reads out of the working tree.
 *
 * A refusal is the reader's own rather than a payload, because the route wraps
 * it the way every other route wraps its reader's: the three fields below are
 * the material, and there is nothing to say about a repository that could not be
 * read.
 */
export type ChangeDigest = {
    readonly ok: true;
    /** Every changed path, in the order `git status` named them. */
    readonly files: readonly ChangedFile[];
    /**
     * `git diff --stat` of the tracked changes: one line per path, following the
     * patch's own shape but carrying the file's magnitude — the only place a
     * binary file's size appears at all.
     */
    readonly stat: string;
    /** Unified patch of the tracked changes, staged and unstaged alike. */
    readonly patch: string;
    /** The patch was cut at {@link MAX_DIGEST_PATCH_CHARS}. */
    readonly patchTruncated: boolean;
    /** Untracked paths' contents, each bounded and at most `MAX_PREVIEW_FILES`. */
    readonly untracked: readonly UntrackedPreview[];
    /**
     * This branch's recent commit messages, newest first and at most
     * `STYLE_SAMPLE_COMMITS` of them: the style the generated message is asked to
     * match. Empty on an unborn branch, which is the same answer as no style.
     */
    readonly recentMessages: readonly StyleSample[];
} | {
    readonly ok: false;
    readonly refusal: Refusal;
    readonly reason: 'no-repo' | 'error';
};
/**
 * Read the working tree as one block of material for a generated commit message.
 *
 * This is the reader `readStatus` and `readDiff` would give if they were asked
 * together and once: the changed paths, the tracked patch with its `--stat`, and
 * the untracked files a patch against HEAD cannot reach. It exists as one read
 * because the prompt is one request — a message generator that walked the tree
 * path by path would run three commands per changed file — and because the model
 * is meant to see the changes as one change set rather than as an answer per
 * row.
 *
 * The one thing here that is not a change is the style sample: the branch's own
 * recent messages, which the prompt asks the model to write in the manner of.
 *
 * @param target - the shell seam, the session's directory, and the file policy.
 * @returns the digest, or why the repository could not be read.
 */
export declare function readChangeDigest(target: GitTarget): Promise<ChangeDigest>;
/**
 * Read the branches a switch may pick: the local ones and the remote-tracking
 * ones.
 *
 * The two lists are read the same way and sorted by commit date, so either one
 * opens on the branches someone is actually working on. Whether a remote branch
 * is switchable is not a filter applied here: a remote branch is a real choice —
 * checking it out is what creates the local branch that tracks it — so the page
 * shows both and the switch decides what to do with each.
 *
 * @param target - the shell seam, the session's directory, and the file policy.
 * @returns the two branch lists and which branch HEAD is on.
 */
export declare function readBranches(target: GitTarget): Promise<BranchesPayload>;
/**
 * Switch the working tree to one branch.
 *
 * The name is a local branch, or a remote-tracking one (`origin/main`). The local
 * case has always been here: the name is checked against `refs/heads/` first, so
 * only a branch that really exists is ever acted on, and a typo becomes "this
 * branch does not exist" instead of Git's remote-guessing or an
 * ambiguous-argument error. The remote case is the same decision answered by
 * today's Git: checking out `origin/main` is how the local `main` that tracks it
 * comes into being, so the name is checked against `refs/remotes/` and the local
 * branch that tracks it is created — or, when it already exists, switched to,
 * because that is what the pick meant. The local name is derived here rather
 * than left to Git's own guess so the exists-check and the branch Git is told to
 * create can never disagree.
 *
 * What a ref name may look like is Git's rule and is not restated here: a name
 * that no ref answers to is already an unknown branch, so a second, weaker
 * pattern would only turn names Git accepts — non-ASCII ones among them — into a
 * refusal of this plugin's own invention.
 *
 * The switch itself runs as `git switch`, whose argument is unambiguously a
 * branch rather than a path; Git older than 2.23 does not have that subcommand,
 * and the retry with `checkout` is what keeps those installations working.
 *
 * This is the one route that writes: a checkout replaces files in the working
 * tree. It is therefore also the one place the session's file policy is
 * load-bearing, and a refusal is reported as such rather than as a Git error.
 *
 * @param target - the shell seam, the session's directory, and the file policy.
 * @param name - the local or remote-tracking branch to check out.
 * @returns the outcome, including the reason a switch was refused.
 */
export declare function switchBranch(target: GitTarget, name: string): Promise<CheckoutPayload>;
/**
 * Pull the current branch from its upstream.
 *
 * `--ff-only` is deliberate, and it is the whole shape of this feature: a plain
 * `git pull` would invent a merge commit (a commit nobody wrote a message for)
 * and, when the two sides conflict, would leave the working tree in a merge this
 * page has no way to finish or abort. A fast-forward either applies cleanly or
 * is refused with the one thing the user can act on — that the branches have
 * diverged.
 *
 * @param target - the shell seam, the session's directory, and the file policy.
 * @returns the outcome, including the reason a pull was refused.
 */
export declare function pullFromRemote(target: GitTarget): Promise<SyncPayload>;
/**
 * Push the current branch to its upstream, or set one up when there is none.
 *
 * A branch with no upstream is the normal state of a branch that has just been
 * created, and `git push` refuses it by design. Rather than guess, this asks
 * which remotes exist: with exactly one, pushing to it and recording it as the
 * upstream is what the user meant; with none or several, the answer is a
 * question this page cannot answer, and it says so.
 *
 * @param target - the shell seam, the session's directory, and the file policy.
 * @returns the outcome, including the reason a push was refused.
 */
export declare function pushToRemote(target: GitTarget): Promise<SyncPayload>;
/**
 * Stage every change and commit it under one message.
 *
 * The tree is read before it is touched, and both refusals that matter come out
 * of that read. A tree with nothing in it is not a commit that Git would fail to
 * make — "nothing to commit" is a state, and the answer says so as one. And a
 * tree holding an unmerged path is refused before `git add -A` runs: staging a
 * conflicted file resolves it as far as Git is concerned, so a commit made then
 * would record conflict markers as the resolution, which is a commit nobody can
 * mean and one this page has no way to take back.
 *
 * What is committed is deliberately everything the page is listing — tracked
 * edits, deletions, and untracked files alike — because that is the one decision
 * the form offers. The message is the route's to validate; by the time it
 * arrives here it is non-empty text.
 *
 * @param target - the shell seam, the session's directory, and the file policy.
 * @param message - the commit message, already trimmed and checked by the route.
 * @returns the outcome, including the reason a commit did not happen.
 */
export declare function commitAll(target: GitTarget, message: string): Promise<CommitAllPayload>;
//# sourceMappingURL=git.d.ts.map