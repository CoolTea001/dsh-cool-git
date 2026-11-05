/**
 * The Host half's Git reader, and its writers.
 *
 * Every fact about the repository is produced by running the real `git` binary —
 * never by reading `.git` by hand. That keeps this plugin honest about the things
 * Git is authoritative for (the index, renames, merge state, `core.*`
 * configuration, `.gitignore`).
 *
 * Git runs as an argv on the Host's `subprocess` service: no shell, no
 * interpreter, and no sandbox between this module and the process. That is a
 * deliberate trade — Git runs with the Host's own rights, so the session's file
 * policy does not apply to it — made because a sandboxed invocation costs most of
 * a second on Windows, while every path a command carries comes from Git's own
 * output and every command runs inside the repository `routes.ts` resolved.
 *
 * Reading is the bulk of this module. The writes are the branch switch, the
 * merge, the fetch, the merge pull, the push, and the commit — each of which
 * reports Git's own refusal — plus the conflict resolver's own three: the index
 * write that stages a resolved path, the byte-level rewrite of one file's
 * conflict blocks, and the merge commit that records them once none is left.
 * The commit is the one that writes the index as well as the history, which is
 * why it is a single call rather than a stage the page could leave half-finished.
 *
 * The resolver is the one place this module writes a working-tree file itself
 * (see `resolveRegions`): nothing in Git's interface replaces one conflict block
 * with one side, so the file is spliced, and the parser that finds the blocks
 * lives in `conflict.ts` where it can be read on its own.
 *
 * Three properties of the invocation matter and are easy to lose:
 *
 *   - `--no-pager` on every command: without it a pager would hold the pipe open
 *     and the command would sit there until its timeout.
 *   - `GIT_OPTIONAL_LOCKS=0`: `git status` otherwise refreshes the index, which
 *     is a write, and taking a lock it does not need would fight the agent's own
 *     `git` calls in the same repository.
 *   - `-c core.quotePath=false`: Git otherwise C-quotes any path holding a
 *     non-ASCII byte (`"\346\226\207.md"`), and those paths then cannot be
 *     matched back to the ones `status` reported.
 *
 * Process output is parsed here rather than in the browser: the browser half has
 * no Node context, and parsing next to the command keeps the JSON contract in
 * `shared/contract.ts` the only thing the two halves must agree on.
 */
import { type BranchDeleteTarget, type BranchReportPayload, type BranchesPayload, type ChangedFile, type CheckoutPayload, type CommitAllPayload, type CommitPayload, type CommitScope, type ConflictPayload, type CreateBranchPayload, type DeleteBranchesPayload, type DiffPayload, type DiffSide, type FetchPayload, type FetchUpstreamPayload, type IndexPayload, type LogPayload, type MergePayload, type OperationPayload, type ResolveChoice, type ResolveDonePayload, type ResolvePayload, type StatusPayload, type SyncPayload, type UndoCommitPayload } from '../shared/contract.js';
import { type Refusal } from './refusal.js';
/** Commits returned when the caller names no limit. */
export declare const DEFAULT_LOG_LIMIT = 60;
/**
 * Upper bound on branches returned, so a huge ref list cannot flood the menu.
 *
 * Exported because the delete route caps a request at the same number: a
 * selection can never name more branches than the list it was drawn from.
 */
export declare const MAX_BRANCHES = 200;
/**
 * Everything one request needs to run Git: the process substrate and the
 * directory it runs in.
 *
 * Git is spawned as an argv on `subprocess` —never through `ctx.shell` —so no
 * sandbox, interpreter, or shell quoting sits between this module and the
 * process. That also means the session's file policy does not apply here: Git
 * runs with the Host's own rights, inside the repository this module resolved,
 * with every path taken from Git's own output.
 */
export interface GitTarget {
    /** The `subprocess` capability service. */
    readonly subprocess: any;
    /** The directory the command runs in. */
    readonly workdir: string;
}
/** The repository root one request answers for, or why there is none. */
export type RepositoryRoot = {
    readonly root: string;
} | {
    readonly refusal: Refusal;
    readonly reason: 'no-repo' | 'error';
};
/**
 * Resolve the repository root alone, without reading its status or history.
 *
 * The Settings routes need the repository's identity and nothing else: the
 * Workspace key is a directory, and a settings dialog that paid for a full
 * `git status` just to learn where it is would be slower than the request it
 * is about to make. This is the same `rev-parse` every other route starts
 * with, so the root it names is the same root they use.
 *
 * @param target - the process substrate and the session's directory.
 * @returns the root, or the coded refusal and its reason.
 */
export declare function readRepositoryRoot(target: GitTarget): Promise<RepositoryRoot>;
/**
 * Read the current branch, its upstream, and every changed path.
 *
 * @param target - the process substrate and the session's directory.
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
 * @param target - the process substrate and the session's directory.
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
 * @param target - the process substrate and the session's directory.
 * @param hash - a hexadecimal object name, already validated by the route.
 * @returns the commit payload, including the raw patch for the page's parser.
 */
export declare function readCommit(target: GitTarget, hash: string): Promise<CommitPayload>;
/**
 * Read one side of one path's change.
 *
 * The request names the side because the page lists a path once per half it
 * holds: a file staged and then edited again is two rows, and the patch under
 * each must be the one that row stands for. `staged` compares the index against
 * HEAD —what committing the index would record —and `unstaged` compares the
 * worktree against the index —what `git add` would capture. A conflicted path
 * has no meaningful side, so its request reads the combined diff Git prints for
 * an unmerged path.
 *
 * An untracked path has no HEAD side at all, so it is diffed against
 * `/dev/null`, whatever side the request names. A repository without commits has
 * no HEAD to compare against either, and `--cached` then compares the index
 * against the empty tree, which is the honest answer for the staged side there.
 *
 * @param target - the process substrate and the session's directory.
 * @param file - the changed path and the side of it to diff.
 * @returns the unified diff, or the reason there is none.
 */
export declare function readDiff(target: GitTarget, file: {
    readonly path: string;
    readonly side: DiffSide;
    readonly untracked: boolean;
}): Promise<DiffPayload>;
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
     * What Git printed for this path against `/dev/null`: its `--stat` line —?
     * which is where a binary file's byte size appears —and then its patch, cut
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
    /**
     * The repository root the read was resolved against.
     *
     * The commit-message writer keys a Workspace's saved choices by this path
     * when the Workspace registry cannot name one, and the digest is already
     * the request that resolved it —a second `rev-parse` would only repeat a
     * question this answer already holds.
     */
    readonly root: string;
    /** Which half of the working tree this digest describes. */
    readonly scope: CommitScope;
    /** Every changed path in scope, in the order `git status` named them. */
    readonly files: readonly ChangedFile[];
    /**
     * `git diff --stat` of the tracked changes: one line per path, following the
     * patch's own shape but carrying the file's magnitude —the only place a
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
 * because the prompt is one request —a message generator that walked the tree
 * path by path would run three commands per changed file —and because the model
 * is meant to see the changes as one change set rather than as an answer per
 * row.
 *
 * The scope narrows the material, not this reader's honesty about it. `staged`
 * describes the index alone: only the paths whose index side differs, the
 * `--cached` patch and stat, and no untracked previews, because an untracked
 * path is by definition not in the index. `all` keeps the whole working tree,
 * which is the message the commit-all button records.
 *
 * The one thing here that is not a change is the style sample: the branch's own
 * recent messages, which the prompt asks the model to write in the manner of.
 *
 * @param target - the process substrate and the session's directory.
 * @param scope - whether to describe the index alone or the whole working tree.
 * @returns the digest, or why the repository could not be read.
 */
export declare function readChangeDigest(target: GitTarget, scope?: CommitScope): Promise<ChangeDigest>;
/**
 * Read the branches a switch may pick: the local ones and the remote-tracking
 * ones.
 *
 * The two lists are read the same way and sorted by commit date, so either one
 * opens on the branches someone is actually working on. Whether a remote branch
 * is switchable is not a filter applied here: a remote branch is a real choice —?
 * checking it out is what creates the local branch that tracks it —so the page
 * shows both and the switch decides what to do with each.
 *
 * @param target - the process substrate and the session's directory.
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
 * branch that tracks it is created —or, when it already exists, switched to,
 * because that is what the pick meant. The local name is derived here rather
 * than left to Git's own guess so the exists-check and the branch Git is told to
 * create can never disagree.
 *
 * What a ref name may look like is Git's rule and is not restated here: a name
 * that no ref answers to is already an unknown branch, so a second, weaker
 * pattern would only turn names Git accepts —non-ASCII ones among them —into a
 * refusal of this plugin's own invention.
 *
 * The switch itself runs as `git switch`, whose argument is unambiguously a
 * branch rather than a path; Git older than 2.23 does not have that subcommand,
 * and the retry with `checkout` is what keeps those installations working.
 *
 * This is the one route that writes: a checkout replaces files in the working
 * tree, so a working tree in the way is a refusal the page words itself.
 *
 * @param target - the process substrate and the session's directory.
 * @param name - the local or remote-tracking branch to check out.
 * @returns the outcome, including the reason a switch was refused.
 */
export declare function switchBranch(target: GitTarget, name: string): Promise<CheckoutPayload>;
/**
 * Start a branch at one point and switch to it.
 *
 * The start point is resolved to a fully-qualified ref before Git is asked, for
 * the same reason the switch resolves its own name: `refs/heads/main` is a ref
 * and nothing else, so a name that begins with a dash can never be read as an
 * option by the command that follows, and the exists-check and the ref Git is
 * told to branch from can never disagree.
 *
 * The name itself is left to Git's rule. A name Git will not take is answered
 * with Git's own sentence rather than a pattern of this half's invention, which
 * is what keeps a name Git accepts —non-ASCII ones among them —from being
 * refused by a rule that does not exist. The one check made here is the one Git
 * cannot make cheaply: whether the name is already taken, which is a refusal the
 * page words rather than a bare `fatal` from a race.
 *
 * Creating at another point is a switch, so a working tree in the way refuses it
 * in the switch's own words.
 *
 * @param target - the process substrate and the session's directory.
 * @param name - the local branch to create.
 * @param start - the local or remote-tracking branch it starts at.
 * @returns the outcome, including the reason the create was refused.
 */
export declare function createBranch(target: GitTarget, name: string, start: string): Promise<CreateBranchPayload>;
/**
 * Read the branches the delete dialog may offer, with the facts its marks need.
 *
 * A read of its own rather than a second half of `POST /branches`, because the
 * two dialogs ask different questions: a switch wants names and nothing else,
 * while this one wants each branch's upstream, its tracking state, and whether
 * HEAD reaches it —three answers that cost walks the switch dialog would pay
 * for on every open and never read.
 *
 * A remote-tracking branch is marked by the same rule as a local one, and the
 * rule reads differently there: a remote branch HEAD does not reach is the
 * ordinary case rather than a warning, so what the row says is simply that these
 * commits are on that remote and nowhere else in this repository. Which remote
 * owns the ref is resolved against the configured names rather than cut out of
 * the ref, because a local branch may itself be called `origin/main`.
 *
 * @param target - the process substrate and the session's directory.
 * @returns the two lists, each with its marks, and which branch HEAD is on.
 */
export declare function readBranchReport(target: GitTarget): Promise<BranchReportPayload>;
/**
 * Delete the branches a request named, one at a time.
 *
 * One at a time rather than one `git branch -d a b c`, because the answer the
 * dialog needs is per branch: Git reports a mixed batch by exiting nonzero and
 * naming the branch it refused, and telling which of the others went through
 * would mean reading Git's own prose back —text that is translated, and whose
 * misreading would mark a branch deleted that is still there. The exit code of
 * one call per branch is an answer no locale can change.
 *
 * Nothing here offers a force. `-d` is the whole gate, and it is the right one:
 * it refuses exactly the branches whose commits would be left reachable from
 * nothing, which is the promise every mark in the dialog is making.
 *
 * @param target - the process substrate and the session's directory.
 * @param wanted - the branches to delete, in the order the page listed them.
 * @returns one outcome per branch, and whether all of them succeeded.
 */
export declare function deleteBranches(target: GitTarget, wanted: readonly BranchDeleteTarget[]): Promise<DeleteBranchesPayload>;
/**
 * Merge one branch into the branch HEAD is on.
 *
 * That is a plain `git merge`, and it is the only shape this page offers: Git
 * merges into the branch it is on, and the branch it is on is the one the reader
 * is looking at, so the operation stated is the operation Git has. The other
 * direction —the current branch into a branch nobody is standing on —would be a
 * checkout, a merge, and a checkout back: three working-tree moves for one
 * intention, buying two saved clicks at the price of a commit made on a branch
 * the page is not showing, where nothing on screen would show it happen.
 *
 * A conflicting merge is left in the tree rather than aborted. The working tree
 * is exactly what the reader has to decide about, and the conflict list beside
 * the diff pane is where they decide it: block by block, then `git add`, then the
 * merge commit — which Git has already written the message for. Aborting would
 * throw that state away and send the reader to a terminal to reproduce it, which
 * is the one thing this page exists to avoid.
 *
 * @param target - the process substrate and the session's directory.
 * @param name - the branch to merge in, local or remote-tracking.
 * @returns the outcome, including the reason a merge was refused.
 */
export declare function mergeBranch(target: GitTarget, name: string): Promise<MergePayload>;
/**
 * Read one unmerged path as the page resolves it.
 *
 * @param target - the process substrate and the session's directory.
 * @param path - the repository-relative path.
 * @returns the conflict document, or the reason there is none.
 */
export declare function readConflict(target: GitTarget, path: string): Promise<ConflictPayload>;
/**
 * Apply one choice to one unmerged path.
 *
 * Two shapes, one decision. A request naming region keys rewrites exactly those
 * blocks and leaves the rest of the file — including any conflict it did not
 * name — as it was: the reader is part-way through a file with several
 * conflicts, and each block is their decision to make. A request naming none is
 * a whole-file choice, which is the only kind a binary file or a path deleted on
 * one side can take, and because that *is* the resolution it is staged as well.
 *
 * The write runs in the repository's write queue, and the index is re-read inside
 * it: a path resolved by someone else since the page read it is refused rather
 * than written, and a region key that no longer matches the file is refused the
 * same way.
 *
 * @param target - the process substrate and the session's directory.
 * @param path - the repository-relative path.
 * @param choice - which version to keep.
 * @param keys - the blocks to replace, or undefined for a whole-file choice.
 * @returns the file after the write, or the refusal.
 */
export declare function resolveConflict(target: GitTarget, path: string, choice: ResolveChoice, keys: readonly string[] | undefined): Promise<ResolvePayload>;
/**
 * Tell Git that one path is resolved, without writing it.
 *
 * The reader who edited the file themselves, or who resolved every block and
 * wants one last look before committing to it, has nothing left to write. `git
 * add` is the whole of that decision — and it is the only place a conflicted path
 * is ever staged, because on an unmerged path `add` means "resolved", which no
 * bulk action can decide for the reader.
 *
 * @param target - the process substrate and the session's directory.
 * @param path - the repository-relative path.
 * @returns the fresh status, or the refusal.
 */
export declare function markResolved(target: GitTarget, path: string): Promise<ResolveDonePayload>;
/**
 * Finish the merge a conflicted merge or pull left in progress.
 *
 * Git already wrote the message a merge commit should carry into `MERGE_MSG` —
 * `Merge branch 'feat' into main`, and the conflict note under it — so the form
 * that finishes a merge has two honest states: the reader emptied it, and
 * `--no-edit` records Git's words unchanged; or the reader wrote their own, and
 * `-m` records those. Neither opens an editor, which matters because there is
 * none behind this seam.
 *
 * Only a merge is finished here. A rebase and a cherry-pick continue by applying
 * the next commit, which is a different question from "record the resolution",
 * so they are refused rather than half-finished.
 *
 * @param target - the process substrate and the session's directory.
 * @param message - the reader's own message, or nothing to keep Git's.
 * @returns the commit that was made, or the refusal.
 */
export declare function completeMerge(target: GitTarget, message?: string): Promise<OperationPayload>;
/**
 * Refresh every remote-tracking ref from its remote.
 *
 * This is the one network operation with nothing to decide. It moves no branch,
 * no HEAD, and no working tree, so it cannot conflict, cannot be blocked by
 * uncommitted work, and cannot be refused by a detached or unborn HEAD —it is
 * asked for by a reader who wants the page's idea of the remotes to be current,
 * and the answer is either "done" or why the network would not answer.
 *
 * `--all` rather than a bare `fetch`: with no remote named, Git fetches the
 * current branch's upstream remote (or `origin`), which would leave every other
 * remote in the branch list as stale as it was. `--prune` is deliberately *not*
 * passed: dropping a ref is a deletion the reader did not ask for, and a
 * repository configured with `fetch.prune` gets it anyway, because this runs
 * Git's own defaults for everything it does not name.
 *
 * @param target - the process substrate and the session's directory.
 * @returns the outcome, including the reason a fetch was refused.
 */
export declare function fetchRemotes(target: GitTarget): Promise<FetchPayload>;
/**
 * Refresh just the current branch's upstream ref.
 *
 * The branch switch's own follow-up. A switch re-reads the working tree, but the
 * ahead/behind counts the page draws are read from the local remote-tracking
 * refs, and a checkout does not move those: a branch the remote has moved past
 * would read as level with it until someone fetched. That is the one answer the
 * sync control must not give, because it is what tells the reader whether the
 * remote has changes for this branch at all.
 *
 * The fetch names the branch's own remote rather than every remote (`--all`) or
 * a hand-built refspec: the upstream's short name is already known, but writing
 * it as a refspec would mean re-deriving the remote's own fetch mapping, while
 * naming the remote runs the configured refspecs and refreshes exactly the ref
 * `@{upstream}` resolves to. Every other ref of that remote comes along, which is
 * the same trade `fetchRemotes` makes for the whole repository.
 *
 * A repository with nothing to refresh —no commit, a detached HEAD, or a branch
 * that tracks nothing —answers `skipped` rather than an error: this runs after a
 * switch that has already been reported, and none of the three leaves the reader
 * anything to act on.
 *
 * @param target - the process substrate and the session's directory.
 * @returns the outcome, including `skipped` when there was nothing to fetch.
 */
export declare function fetchUpstream(target: GitTarget): Promise<FetchUpstreamPayload>;
/**
 * Pull the current branch from its upstream.
 *
 * The three flags are deliberate, and together they are the whole shape of this
 * feature: a one-click sync brings the remote in with a merge and nothing else.
 *
 * `--no-rebase` replaces an inherited `pull.rebase` / `branch.<name>.rebase`,
 * because a rebase rewrites this branch's history, which is not something a
 * button that says "sync" should do behind the reader's back.
 *
 * `--ff` replaces an inherited `pull.ff` / `merge.ff` as well. This one is the
 * difference between "works" and "works on some repositories": a repository
 * configured `merge.ff = only` (a not-uncommon hand setting, and what several
 * GUI guides recommend) makes a plain `git pull --no-rebase` refuse the merge
 * with `Not possible to fast-forward, aborting` and Git's own advice to merge by
 * hand or rebase. Stating `--ff` on the command line overrides that setting and
 * restores the only policy this route means: fast-forward when the histories
 * allow it, join them with a merge commit when they do not.
 *
 * `--no-edit` names the message's provenance: nobody writes it, and no editor
 * can be opened to ask. Git fills a merge commit's subject itself —
 * `Merge branch 'main' of <remote> into main` — and that is the message this
 * shape is for.
 *
 * The merge may fast-forward (the common case), or it may join the two histories
 * with that merge commit, or it may conflict. A conflicted merge is left in the
 * tree exactly as a conflicted `git merge` is: the conflict list resolves it, and
 * `completeMerge` records it.
 *
 * @param target - the process substrate and the session's directory.
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
 * @param target - the process substrate and the session's directory.
 * @returns the outcome, including the reason a push was refused.
 */
export declare function pushToRemote(target: GitTarget): Promise<SyncPayload>;
/**
 * Move one path into the index.
 *
 * `-A` rather than a bare `add`: the path may be a deletion (a removed file has
 * no worktree content to add) or an untracked file, and `-A` is what makes one
 * call cover both without deciding from the row the page drew. `--` ends the
 * options so a path that begins with a dash is a path.
 *
 * @param target - the process substrate and the session's directory.
 * @param path - the repository-relative path to stage.
 * @returns the fresh status, or the refusal.
 */
export declare function stagePath(target: GitTarget, path: string): Promise<IndexPayload>;
/**
 * Move one path out of the index, keeping the worktree file.
 *
 * `git restore --staged` is the normal answer: it puts the index entry back to
 * HEAD and leaves the file on disk alone, which is exactly "unstage". An unborn
 * branch has no HEAD to restore from, so its index entries are removed instead —?
 * the file becomes untracked again, which is what it was before it was staged.
 *
 * A staged rename is two index entries —the new path added and the old one
 * removed —so the row's source path is restored in the same call. Restoring only
 * the destination would leave the deletion of the source staged: half a rename,
 * which is not a state the row it came from can describe.
 *
 * @param path - the repository-relative path to unstage.
 * @param origPath - the rename/copy source, when the row has one.
 * @returns the fresh status, or the refusal.
 */
export declare function unstagePath(target: GitTarget, path: string, origPath?: string): Promise<IndexPayload>;
/**
 * Discard one path's unstaged change.
 *
 * A tracked path is restored from the index —`git restore --worktree` —so a
 * file that is staged and then edited again keeps the staged half and loses only
 * the worktree half; the index is never touched. An untracked path has no index
 * entry to restore, so `git clean -f` deletes the file itself instead. Both are
 * destructive in the worktree, which is why the page asks before calling this.
 *
 * @param target - the process substrate and the session's directory.
 * @param path - the repository-relative path to discard.
 * @param untracked - whether the path is untracked, which is deleted rather than restored.
 * @returns the fresh status, or the refusal.
 */
export declare function discardPath(target: GitTarget, path: string, untracked: boolean): Promise<IndexPayload>;
/** Stage every change under one folder (see `stageScope`). */
export declare function stageFolder(target: GitTarget, folder: string): Promise<IndexPayload>;
/**
 * Stage every changed path in the repository, from every folder.
 *
 * The page's header action names no directory: it stands for the whole worktree
 * list, and the Host resolves that list from the status it reads in the queue.
 *
 * @param target - the process substrate and the session's directory.
 * @returns the fresh status, or the refusal.
 */
export declare function stageAll(target: GitTarget): Promise<IndexPayload>;
/** Move every staged change under one folder out of the index (see `unstageScope`). */
export declare function unstageFolder(target: GitTarget, folder: string): Promise<IndexPayload>;
/**
 * Move every staged change in the repository out of the index.
 *
 * @param target - the process substrate and the session's directory.
 * @returns the fresh status, or the refusal.
 */
export declare function unstageAll(target: GitTarget): Promise<IndexPayload>;
/** Discard every unstaged change under one folder (see `discardScope`). */
export declare function discardFolder(target: GitTarget, folder: string): Promise<IndexPayload>;
/**
 * Discard every unstaged change in the repository, from every folder.
 *
 * The clean step has no folder to name, so it runs over the whole worktree
 * without a pathspec; ignored files are still left alone because the command is
 * never given `-x`.
 *
 * @param target - the process substrate and the session's directory.
 * @returns the fresh status, or the refusal.
 */
export declare function discardAll(target: GitTarget): Promise<IndexPayload>;
/**
 * Stage every change and commit it under one message.
 *
 * The tree is read before it is touched, and both refusals that matter come out
 * of that read. A tree with nothing in it is not a commit that Git would fail to
 * make —?nothing to commit" is a state, and the answer says so as one. And a
 * tree holding an unmerged path is refused before `git add -A` runs: staging a
 * conflicted file resolves it as far as Git is concerned, so a commit made then
 * would record conflict markers as the resolution, which is a commit nobody can
 * mean and one this page has no way to take back.
 *
 * What is committed is deliberately everything the page is listing —tracked
 * edits, deletions, and untracked files alike —because that is the decision
 * this route's button offers. The message is the route's to validate; by the
 * time it arrives here it is non-empty text.
 *
 * @param target - the process substrate and the session's directory.
 * @param message - the commit message, already trimmed and checked by the route.
 * @returns the outcome, including the reason a commit did not happen.
 */
export declare function commitAll(target: GitTarget, message: string): Promise<CommitAllPayload>;
/**
 * Commit the index as it stands, under one message.
 *
 * The opposite trade from {@link commitAll}: nothing is staged here, because the
 * page's own `+` and `−` actions are what decided the index, and a commit that
 * quietly staged the rest would make those actions meaningless. The checks that
 * remain are the ones Git would make anyway, worded so the page can say which
 * happened: an unfinished merge, or an index with nothing in it to record.
 *
 * @param target - the process substrate and the session's directory.
 * @param message - the commit message, already trimmed and checked by the route.
 * @returns the outcome, including the reason a commit did not happen.
 */
export declare function commitStaged(target: GitTarget, message: string): Promise<CommitAllPayload>;
/**
 * Take the commit at HEAD back off the branch, keeping everything it recorded.
 *
 * The reset is soft on purpose. A mixed or hard reset would also rewrite the
 * index or the working tree, and the commit's changes would then have to be
 * rediscovered by the reader; a soft reset leaves both exactly as the commit
 * made them, so what the commit held comes back as staged changes. The branch
 * loses one entry in its history and nothing else.
 *
 * Three states are refused before the reset runs. A merge, rebase, or
 * cherry-pick in progress means HEAD is part of an operation this reset would
 * step over. A first commit has no parent to step back to, and resetting past it
 * would leave the branch unborn — a state this page has no way to undo. No
 * commit at all is the read's own empty state.
 *
 * The commit summary is read before the reset, while HEAD still names it, so
 * the answer can report which commit moved even though it is no longer on the
 * branch. A summary that cannot be read is not a failed undo: the reset already
 * happened, so the answer stays a success and simply names nothing.
 *
 * @param target - the process substrate and the session's directory.
 * @returns the outcome, including the reason no commit was undone.
 */
export declare function undoLastCommit(target: GitTarget): Promise<UndoCommitPayload>;
//# sourceMappingURL=git.d.ts.map