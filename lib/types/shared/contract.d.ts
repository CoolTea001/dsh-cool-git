/**
 * The wire contract both halves of dsh-cool-git agree on.
 *
 * The browser half never sees the Host Cordis context, so every fact about the
 * repository crosses the same-origin HTTP routes as JSON shaped by the types
 * below. The Host half parses Git's own output into them (see `host/git.ts`)
 * and the browser half renders them; nothing here touches Node or the DOM, so
 * the module is bundled into both halves unchanged.
 *
 * Every answer carries `ok`: an `ok: false` result is a normal answer the
 * browser reports in its error dialog, never a rejected promise. The one
 * exception is a transport failure, which the fetch wrapper turns into the
 * same shape.
 *
 * An `ok: false` answer says why in one of two ways, and the two are not
 * interchangeable. `failure` is a code plus the values its sentence
 * interpolates: the refusal is one this plugin names, and only the browser
 * knows the language to name it in, so the page words it from its own
 * dictionaries (see `client/locales.ts`). `error` is raw diagnostic text —
 * Git's own first line, or a transport or seam message — which no dictionary
 * can own because another program wrote it. A coded refusal carries no
 * `error`, and text carries no `failure`.
 */
/**
 * Every refusal this plugin can name, as a code rather than a sentence.
 *
 * The page renders each one from its own dictionary, so the same refusal reads
 * in whatever language the browser is set to; a code is therefore the wire
 * form, and the sentences live in `client/locales.ts` keyed `error.<code>`.
 * The set is closed on purpose: a refusal that is not one of these is Git's
 * own words and travels as `error` text instead.
 */
export type FailureCode = 'not-ready' | 'no-workdir' | 'no-subprocess' | 'missing-path' | 'bad-hash' | 'missing-message' | 'missing-branch' | 'missing-name' | 'git-exit' | 'no-root' | 'no-commits' | 'unparsable-commit' | 'unknown-branch' | 'remote-local-name' | 'checkout-dirty' | 'checkout-dirty-paths' | 'branch-exists' | 'branch-not-merged' | 'branch-in-use' | 'unknown-remote' | 'merge-dirty' | 'merge-conflict' | 'merge-same-branch' | 'merge-detached' | 'merge-no-commits' | 'not-conflicted' | 'stale-conflict' | 'resolve-unsafe' | 'bad-choice' | 'no-operation' | 'complete-conflict' | 'pull-no-commits' | 'push-no-commits' | 'pull-detached' | 'push-detached' | 'pull-no-upstream' | 'pull-dirty' | 'push-dirty' | 'auth' | 'pull-diverged' | 'pull-conflict' | 'push-behind' | 'push-no-remote' | 'push-ambiguous-remote' | 'commit-clean' | 'commit-nothing-staged' | 'commit-conflict' | 'commit-identity' | 'commit-undo-root' | 'commit-undo-operation' | 'no-llm' | 'no-model' | 'model-timeout' | 'model-truncated' | 'empty-message' | 'no-plugin-manager' | 'bad-version';
/**
 * One coded refusal, with the values its sentence interpolates.
 *
 * The values are already in their final form — a branch name, a count, a list
 * joined by `, ` — because the page only substitutes them into a template and
 * never reformats them. A sentence with no placeholder takes no `params` at
 * all.
 */
export interface Failure {
    /** The refusal, whose sentence is the page's `error.<code>` entry. */
    readonly code: FailureCode;
    /** Values for the sentence's `{name}` placeholders. */
    readonly params?: Readonly<Record<string, string | number>>;
}
/** How one path differs from the index or from HEAD, collapsed to one label. */
export type ChangeKind = 'added' | 'modified' | 'deleted' | 'renamed' | 'copied' | 'typechange' | 'untracked' | 'conflicted' | 'unknown';
/** One path `git status` reported, with both halves of its XY code kept. */
export interface ChangedFile {
    /** Worktree-relative path (the rename's destination when it was renamed). */
    readonly path: string;
    /** The rename/copy source, absent for every other kind of change. */
    readonly origPath?: string;
    /** The porcelain `X` column: the index's own state against HEAD. */
    readonly index: string;
    /** The porcelain `Y` column: the worktree's state against the index. */
    readonly worktree: string;
    /** The single label the sidebar shows for this row. */
    readonly kind: ChangeKind;
    /** The index differs from HEAD, so this change is staged. */
    readonly staged: boolean;
    /** The worktree differs from the index, so this change is unstaged. */
    readonly unstaged: boolean;
    /** Git does not track this path yet. */
    readonly untracked: boolean;
    /** The path is unmerged. */
    readonly conflicted: boolean;
}
/** The commit HEAD points at, when the branch has one. */
export interface HeadInfo {
    readonly hash: string;
    readonly short: string;
    readonly date: string;
    readonly subject: string;
}
/** `POST /status`: the repository HEAD, its branch, and every changed path. */
export interface StatusPayload {
    readonly ok: boolean;
    /** Raw diagnostic text: Git's own words, or a transport or seam message. */
    readonly error?: string;
    /** The coded refusal, which the page words in the active locale. */
    readonly failure?: Failure;
    /**
     * Why an `ok: false` answer happened, so the page can tell "this directory is
     * not a repository" (a normal empty state) from a real Git failure.
     */
    readonly reason?: 'no-repo' | 'error';
    /** Absolute path of the repository's top level, once resolved. */
    readonly root?: string;
    /** Current branch name; the short hash when HEAD is detached. */
    readonly branch?: string;
    /** HEAD is not on a branch. */
    readonly detached?: boolean;
    /** The tracked upstream of the current branch, e.g. `origin/main`. */
    readonly upstream?: string;
    readonly ahead?: number;
    readonly behind?: number;
    /** The branch has at least one commit to log and compare against. */
    readonly hasHead?: boolean;
    readonly head?: HeadInfo | null;
    readonly files?: readonly ChangedFile[];
    /** The owning Workspace, absent when the Host cannot name one. */
    readonly workspace?: WorkspaceInfo;
    /**
     * The multi-step operation the repository is in the middle of, when it is in
     * one.
     *
     * A merge that conflicts, and a pull that merges into a conflict, both leave
     * the working tree unfinished on purpose — that is the state the conflict list
     * resolves. This is how the page knows to turn its commit form into the merge's
     * own commit, and to keep that form from recording a half-merge. Absent at
     * rest, which is the ordinary case.
     */
    readonly operation?: ConflictOperation;
    /**
     * The message a merge already carries, when one is in progress.
     *
     * Git writes it when the merge starts — `Merge branch 'feat' into main`, the
     * `# Conflicts:` block under it, and a body when one was passed — and this is
     * that text with the comment block removed, exactly as a commit would record
     * it. The page prefills its commit form with it, so the merge is read as the
     * message it is about to be committed under rather than as a sentence about a
     * state. Absent when no merge is in progress or Git left no message.
     */
    readonly mergeMessage?: string;
}
/**
 * A multi-step Git operation that is in progress.
 *
 * `rebase` and `cherry-pick` are read for the same reason `merge` is: a reader
 * can start one in a terminal and come back to this tab, and the conflicted paths
 * it leaves behind are the same paths, resolved the same way. Only the way the
 * operation is finished or abandoned differs, and that is the Host's business.
 */
export type ConflictOperation = 'merge' | 'rebase' | 'cherry-pick';
/** The DSH Workspace this session belongs to, when the Host can name it. */
export interface WorkspaceInfo {
    /** The Workspace's display title. */
    readonly title: string;
    /** The Workspace's canonical directory. */
    readonly path: string;
}
/** `POST /branches`: the branches a switch may pick. */
export interface BranchesPayload {
    readonly ok: boolean;
    /** Raw diagnostic text: Git's own words, or a transport or seam message. */
    readonly error?: string;
    /** The coded refusal, which the page words in the active locale. */
    readonly failure?: Failure;
    readonly reason?: 'no-repo' | 'error';
    /** The checked-out branch, or null while HEAD is detached. */
    readonly current?: string | null;
    readonly detached?: boolean;
    /** Local branch names, most recently committed first. */
    readonly branches?: readonly string[];
    /**
     * Remote-tracking branch names (`origin/main`), most recently committed first
     * and one remote's symbolic `HEAD` left out. Handing one to `POST /checkout`
     * switches to the local branch that tracks it, creating it when it does not
     * exist yet.
     */
    readonly remotes?: readonly string[];
    /** One of the lists was cut at the Host's bound; the page says so. */
    readonly truncated?: boolean;
}
/**
 * How safe one branch looks to delete, judged before Git is asked.
 *
 * The marks are `git branch -d`'s own rule restated, so the badge and the answer
 * cannot disagree: Git deletes a branch whose tip is reachable from HEAD or from
 * that branch's own upstream, and refuses every other one. A branch that is
 * neither is one whose commits would be left reachable from nothing but the
 * reflog, which is what every mark but `safe` is saying.
 *
 * `gone` is the loudest of them because it is the easiest to misread: an
 * upstream that no longer exists looks, in a branch list, exactly like a branch
 * that was never pushed.
 */
export type BranchSafety = 'safe' | 'unmerged' | 'unpushed' | 'gone';
/** One branch the delete dialog may offer, with the verdict its mark is drawn from. */
export interface BranchEntry {
    /** The name the page shows: a local name, or `origin/main`. */
    readonly name: string;
    readonly kind: 'local' | 'remote';
    /**
     * For a remote-tracking branch, the remote it belongs to and the branch name
     * on that remote. The two are resolved by the Host against the configured
     * remotes rather than by splitting the name, because a local branch may itself
     * be called `origin/main`.
     */
    readonly remote?: string;
    readonly branch?: string;
    /** Whether HEAD is on this branch, which is the one Git will never delete. */
    readonly current?: boolean;
    /** The verdict the badge states. */
    readonly safety: BranchSafety;
    /** The upstream this branch tracks, when it tracks one. */
    readonly upstream?: string;
    /** How many commits this branch has that its upstream does not. */
    readonly ahead?: number;
    /** How many commits its upstream has that this branch does not. */
    readonly behind?: number;
}
/**
 * `POST /branch-report`: the branches the delete dialog may offer.
 *
 * A read of its own rather than a second field on `POST /branches`, because the
 * two dialogs ask different questions and only one of them pays for this one:
 * every mark here costs a `--merged` walk over the refs, and the switch dialog
 * opens far more often than the delete dialog does.
 */
export interface BranchReportPayload {
    readonly ok: boolean;
    /** Raw diagnostic text: Git's own words, or a transport or seam message. */
    readonly error?: string;
    /** The coded refusal, which the page words in the active locale. */
    readonly failure?: Failure;
    readonly reason?: 'no-repo' | 'error';
    /** The checked-out branch, or null while HEAD is detached. */
    readonly current?: string | null;
    readonly detached?: boolean;
    /** Local branches, most recently committed first. */
    readonly locals?: readonly BranchEntry[];
    /** Remote-tracking branches, most recently committed first. */
    readonly remotes?: readonly BranchEntry[];
    /** One of the lists was cut at the Host's bound; the page says so. */
    readonly truncated?: boolean;
}
/**
 * `POST /branch-create`: the outcome of starting a branch and switching to it.
 *
 * Shaped like `CheckoutPayload` because that is what it is: the new branch is
 * created and then checked out, so every state that refuses a switch — a
 * detached HEAD is not one of them, an unknown starting point and a working tree
 * in the way are — refuses this too.
 */
export interface CreateBranchPayload {
    readonly ok: boolean;
    /** Raw diagnostic text: Git's own words, or a transport or seam message. */
    readonly error?: string;
    /** The coded refusal, which the page words in the active locale. */
    readonly failure?: Failure;
    readonly reason?: 'no-repo' | 'error' | 'unknown-branch' | 'exists' | 'dirty';
    /** The branch HEAD is on after a successful create, which is the new one. */
    readonly branch?: string;
}
/** What became of one branch a delete request named. */
export interface BranchDeletion {
    /** The name as the dialog showed it: a local name, or `origin/main`. */
    readonly name: string;
    readonly ok: boolean;
    /** Raw diagnostic text: Git's own words, or a transport or seam message. */
    readonly error?: string;
    /** The coded refusal, which the page words in the active locale. */
    readonly failure?: Failure;
}
/**
 * One branch a delete request names, echoed back as the dialog read it.
 *
 * The page sends the entry it was given rather than a name this half re-derives,
 * because only the page knows which of the two lists the row came from and a
 * local branch may itself be called `origin/main`. The remote and branch pair is
 * carried for a remote-tracking row so the Host never has to split the name
 * again — and so a name it splits cannot differ from the one that was shown.
 */
export interface BranchDeleteTarget {
    /** The name the row showed: a local name, or `origin/main`. */
    readonly name: string;
    readonly kind: 'local' | 'remote';
    /** For a remote target, the remote the branch lives on. */
    readonly remote?: string;
    /** For a remote target, the branch name on that remote. */
    readonly branch?: string;
}
/**
 * `POST /branch-delete`: what became of every branch the request named.
 *
 * One answer for a list of deletions rather than one request each, because the
 * dialog's whole point is that the choice is made once: the branches are deleted
 * one at a time so that each has an outcome of its own, and a refusal on one
 * branch is that branch's result rather than the request's.
 */
export interface DeleteBranchesPayload {
    readonly ok: boolean;
    /** Raw diagnostic text: Git's own words, or a transport or seam message. */
    readonly error?: string;
    /** The coded refusal, which the page words in the active locale. */
    readonly failure?: Failure;
    readonly reason?: 'no-repo' | 'error';
    /** One entry per branch the request named, in the order it named them. */
    readonly results?: readonly BranchDeletion[];
}
/** `POST /checkout`: the outcome of switching the working tree to a branch. */
export interface CheckoutPayload {
    readonly ok: boolean;
    /** Raw diagnostic text: Git's own words, or a transport or seam message. */
    readonly error?: string;
    /** The coded refusal, which the page words in the active locale. */
    readonly failure?: Failure;
    /**
     * Why a switch failed, when the page can act on it: the directory is not a
     * repository, the named branch does not exist, the session may not write, or
     * local changes are in the way.
     */
    readonly reason?: 'no-repo' | 'error' | 'unknown-branch' | 'dirty';
    /** The branch HEAD is on after a successful switch. */
    readonly branch?: string;
}
/** `POST /merge`: the outcome of merging one branch into the one HEAD is on. */
export interface MergePayload {
    readonly ok: boolean;
    /** Raw diagnostic text: Git's own words, or a transport or seam message. */
    readonly error?: string;
    /** The coded refusal, which the page words in the active locale. */
    readonly failure?: Failure;
    /**
     * Why the merge did not happen, when the page can act on it: there is no
     * repository, the named branch does not exist, HEAD is detached or unborn, the
     * session may not write, local changes are in the way, or the two sides
     * conflict.
     */
    readonly reason?: 'no-repo' | 'error' | 'unknown-branch' | 'same-branch' | 'detached' | 'no-commits' | 'dirty' | 'conflict';
    /**
     * The branch the request named, which is the merge's source.
     *
     * The Host echoes it back because the page words its own failure around it:
     * a merge leaves HEAD where it was, so the branch the dialog held is the only
     * trace of what was asked once that dialog has closed.
     */
    readonly branch?: string;
    /**
     * The Host's own one-line account of what the merge did, on success.
     *
     * The same register as Git's own output, and the page does not draw it today:
     * a successful merge is reported by the re-read state, and the error dialog is
     * the only place a failed one is worded.
     */
    readonly summary?: string;
}
/**
 * `POST /fetch`: the outcome of refreshing every remote-tracking ref.
 *
 * The leanest of the payloads, because a fetch asks the least: it moves no
 * branch, no working tree, and no HEAD, so none of the states that refuse a pull
 * or a push can refuse it. What is left is a repository, a permission to write
 * `.git`, and whatever the remote answered.
 */
export interface FetchPayload {
    readonly ok: boolean;
    /** Raw diagnostic text: Git's own words, or a transport or seam message. */
    readonly error?: string;
    /** The coded refusal, which the page words in the active locale. */
    readonly failure?: Failure;
    /**
     * Why the fetch did not happen, when the page can act on it: there is no
     * repository, the session may not write, or the remote refused the
     * credentials.
     */
    readonly reason?: 'no-repo' | 'error' | 'auth';
}
/**
 * `POST /fetch-upstream`: refreshing just the current branch's upstream ref.
 *
 * A fetch of its own rather than `POST /fetch`, because of where it runs: a
 * branch switch already knows which branch it landed on, and the one ref the
 * sync control's counts compare against is that branch's upstream. Naming the
 * branch's own remote fetches every ref of that remote through the remote's
 * configured refspecs, which is what makes the refreshed upstream identical to
 * the one a plain `git fetch` would have written.
 *
 * Nothing to refresh is not a failure: no commit, a detached HEAD, and a branch
 * that tracks nothing all answer `skipped`, because the caller is the switch's
 * own follow-up and has no question to put to the reader in any of the three.
 */
export interface FetchUpstreamPayload extends FetchPayload {
    /** There was nothing to refresh, so no remote was contacted. */
    readonly skipped?: boolean;
}
/** `POST /pull` and `POST /push`: the outcome of one hand-off with the remote. */
export interface SyncPayload {
    readonly ok: boolean;
    /** Raw diagnostic text: Git's own words, or a transport or seam message. */
    readonly error?: string;
    /** The coded refusal, which the page words in the active locale. */
    readonly failure?: Failure;
    /**
     * Why the operation did not happen, when the page can act on it: there is no
     * repository, the session may not write, HEAD is detached, the branch has no
     * upstream (or an ambiguous remote), the two sides diverged, local changes are
     * in the way, the merge the pull asked for conflicts, or the remote refused the
     * credentials.
     */
    readonly reason?: 'no-repo' | 'error' | 'detached' | 'no-upstream' | 'no-remote' | 'ambiguous-remote' | 'diverged' | 'dirty' | 'conflict' | 'auth';
    /** Which operation answered, so a caller can label its own report. */
    readonly action?: 'pull' | 'push';
    /**
     * The Host's own one-line account of what the operation did, on success.
     *
     * It is the Host's report rather than the page's copy — the same register as
     * Git's own output — and the page does not draw it today: a successful
     * operation is reported by the re-read state, and the error dialog is the
     * only place a failed one is worded.
     */
    readonly summary?: string;
}
/** One row of the commit history. */
export interface CommitSummary {
    readonly hash: string;
    readonly short: string;
    readonly author: string;
    readonly email: string;
    /** Author date, ISO-8601 with the author's own offset. */
    readonly date: string;
    readonly subject: string;
    /** Branch and tag decorations pointing at this commit (`%D`). */
    readonly refs: readonly string[];
    /** Parent hashes; more than one makes this a merge commit. */
    readonly parents: readonly string[];
}
/** `POST /log`: the newest commits of the current branch. */
export interface LogPayload {
    readonly ok: boolean;
    /** Raw diagnostic text: Git's own words, or a transport or seam message. */
    readonly error?: string;
    /** The coded refusal, which the page words in the active locale. */
    readonly failure?: Failure;
    readonly reason?: 'no-repo' | 'error';
    readonly commits?: readonly CommitSummary[];
    /** The repository has no commits yet, so the history is legitimately empty. */
    readonly empty?: boolean;
}
/**
 * Which half of a path's change one diff request is about.
 *
 * `staged` compares the index against HEAD — what a commit of the index would
 * record; `unstaged` compares the worktree against the index — what a `git add`
 * would capture; `conflict` is an unmerged path, whose diff is the combined one
 * Git prints for it. The side is part of the request because one path can have
 * both halves at once, and the two rows the page shows for it must not answer
 * with the same patch.
 */
export type DiffSide = 'staged' | 'unstaged' | 'conflict';
/** `POST /diff`: one side of one path's change. */
export interface DiffPayload {
    readonly ok: boolean;
    /** Raw diagnostic text: Git's own words, or a transport or seam message. */
    readonly error?: string;
    /** The coded refusal, which the page words in the active locale. */
    readonly failure?: Failure;
    readonly reason?: 'no-repo' | 'error';
    /** The path this patch answers for, echoed back for the page's own checks. */
    readonly path?: string;
    /** Unified diff text; empty when the path has no textual difference. */
    readonly patch?: string;
    /** The patch was cut at the Host's output bound; the page says so. */
    readonly truncated?: boolean;
    /** Git reported a binary difference, so there are no lines to render. */
    readonly binary?: boolean;
}
/**
 * Which of the three versions of a conflicted path the reader keeps for one
 * block, or for the whole file.
 *
 * `ours` and `theirs` are the index stages, not the sides of any particular
 * operation: during a merge stage 2 is the branch checked out and stage 3 is the
 * branch merged in, and the page labels both from the marker lines Git wrote
 * rather than from those words, because a rebase swaps which is which.
 *
 * `both` is the ordinary "keep both edits" answer, and is what a reader wants
 * when the two sides added different lines rather than changed the same one. It
 * has no meaning for a whole file and is refused there.
 */
export type ResolveChoice = 'ours' | 'theirs' | 'both' | 'base';
/** Which of the three index stages a conflicted path still has. */
export interface ConflictStages {
    /** Stage 1: the merge base. */
    readonly base: boolean;
    /** Stage 2: the version the current branch holds. */
    readonly ours: boolean;
    /** Stage 3: the version the other side holds. */
    readonly theirs: boolean;
}
/**
 * One `<<<<<<<` … `>>>>>>>` block of a conflicted file.
 *
 * The lines are display text with their terminators removed; the bytes they came
 * from stay in the Host, which is the only half that writes. A block carries its
 * own key so a resolution names *which* block it means without the page having to
 * trust an index that a concurrent edit could have moved.
 */
export interface ConflictRegion {
    /**
     * Identity of this block, derived from its position and its bytes.
     *
     * The page sends it back with a choice, and the Host refuses a key that no
     * longer matches the file — which is what keeps an editor that wrote the file
     * in the meantime from turning a click into a splice at the wrong place. Two
     * byte-identical blocks in one file therefore still have different keys.
     */
    readonly key: string;
    readonly ours: readonly string[];
    readonly theirs: readonly string[];
    /** The merge base, present only for a `diff3`-style conflict. */
    readonly base?: readonly string[];
    /**
     * The label Git wrote after the marker (`HEAD`, `feat`, a short hash with the
     * subject), which is what the page calls each side.
     *
     * Read from the file rather than assumed: a rebase writes the sides in the
     * opposite roles, and a sentence that hard-coded "current"/"incoming" would be
     * wrong exactly there.
     */
    readonly oursLabel?: string;
    readonly theirsLabel?: string;
    readonly baseLabel?: string;
}
/** One run of a conflicted file: ordinary lines, or a block to resolve. */
export type ConflictBlock = {
    readonly kind: 'context';
    readonly lines: readonly string[];
} | ({
    readonly kind: 'region';
} & ConflictRegion);
/**
 * One conflicted path, as the page resolves it.
 *
 * A parsed view rather than a patch, because `git diff` answers an unmerged path
 * with a *combined* diff (`diff --cc`, `@@@` headers, two-column prefixes) that
 * is a report about the conflict rather than something to choose within, and
 * because a delete/modify conflict has no diff at all — Git prints
 * `* Unmerged path x` and nothing else. The worktree file and its markers are
 * what a resolver can actually act on, so those are what this carries.
 */
export interface ConflictDoc {
    readonly path: string;
    readonly blocks: readonly ConflictBlock[];
    /** How many blocks carry a choice; zero means the markers are already gone. */
    readonly regions: number;
    /**
     * Whether Git wrote a merge base into the file (`diff3`/`zdiff3` style), which
     * is the only reason a block has a third version to show.
     */
    readonly style: 'merge' | 'diff3';
    /** The file is binary, so there are no markers and only a whole-file choice. */
    readonly binary: boolean;
    readonly stages: ConflictStages;
    /**
     * What there is to do with the path: blocks to resolve, a clean file that only
     * needs staging, a path one side deleted (so a whole-file choice is the only
     * one that can express it, whether or not Git left a marker-free copy in the
     * working tree), or content with no markers to find.
     */
    readonly state: 'regions' | 'clean' | 'missing' | 'binary';
}
/** `POST /conflict`: one unmerged path, ready to resolve. */
export interface ConflictPayload {
    readonly ok: boolean;
    /** Raw diagnostic text: Git's own words, or a transport or seam message. */
    readonly error?: string;
    /** The coded refusal, which the page words in the active locale. */
    readonly failure?: Failure;
    /**
     * Why no conflict was read, when the page can act on it: there is no
     * repository, the path is no longer unmerged (it was resolved elsewhere), or
     * the read itself failed.
     */
    readonly reason?: 'no-repo' | 'error' | 'not-conflicted';
    readonly conflict?: ConflictDoc;
}
/**
 * `POST /resolve`: one choice applied to one path.
 *
 * Two shapes share the route because they are one decision. A request naming
 * `keys` replaces exactly those blocks and leaves the file's remaining markers
 * alone — the reader is part-way through a file with several conflicts. A request
 * naming none is a whole-file choice for a path that has no blocks to choose
 * within (binary content, or a file deleted on one side), and because that *is*
 * the resolution it is staged as well.
 */
export interface ResolvePayload {
    readonly ok: boolean;
    /** Raw diagnostic text: Git's own words, or a transport or seam message. */
    readonly error?: string;
    /** The coded refusal, which the page words in the active locale. */
    readonly failure?: Failure;
    /**
     * Why nothing was written, when the page can act on it: there is no
     * repository, the path is not unmerged, the file changed since it was read, or
     * the path is not one this plugin may write.
     */
    readonly reason?: 'no-repo' | 'error' | 'not-conflicted' | 'stale' | 'unsafe';
    /** The path after the write, so the pane repaints from what is on disk. */
    readonly conflict?: ConflictDoc;
    /** The write staged the path as resolved. */
    readonly staged?: boolean;
    /** The repository state after the write, when the write staged the path. */
    readonly status?: StatusPayload;
}
/**
 * `POST /resolve-done`: one path marked resolved, without writing it.
 *
 * The reader who edited the file themselves — or who resolved every block and
 * wants to look once more before telling Git so — has nothing left to write and
 * only needs the index to agree. That is `git add`, and this is the route for it.
 */
export interface ResolveDonePayload {
    readonly ok: boolean;
    /** Raw diagnostic text: Git's own words, or a transport or seam message. */
    readonly error?: string;
    /** The coded refusal, which the page words in the active locale. */
    readonly failure?: Failure;
    readonly reason?: 'no-repo' | 'error' | 'not-conflicted';
    /** The repository state after the index write. */
    readonly status?: StatusPayload;
}
/**
 * `POST /merge-commit`: finishing the merge a merge or a pull left in progress.
 *
 * It is answered with the re-read status, because the commit moves the branch and
 * the working tree at once and the page has no other way to learn what it did.
 */
export interface OperationPayload {
    readonly ok: boolean;
    /** Raw diagnostic text: Git's own words, or a transport or seam message. */
    readonly error?: string;
    /** The coded refusal, which the page words in the active locale. */
    readonly failure?: Failure;
    /**
     * Why the operation did not finish, when the page can act on it: there is no
     * repository, nothing was in progress, the tree still holds unresolved
     * conflicts, or the commit itself was refused.
     */
    readonly reason?: 'no-repo' | 'error' | 'no-operation' | 'conflict';
    /** The repository state after the operation. */
    readonly status?: StatusPayload;
    /** The merge commit that was just created, once one was. */
    readonly commit?: CommitSummary;
    /** The Host's own one-line account of what the operation did. */
    readonly summary?: string;
}
/** `POST /commit`: one commit's message plus its whole patch. */
export interface CommitPayload {
    readonly ok: boolean;
    /** Raw diagnostic text: Git's own words, or a transport or seam message. */
    readonly error?: string;
    /** The coded refusal, which the page words in the active locale. */
    readonly failure?: Failure;
    readonly reason?: 'no-repo' | 'error';
    readonly commit?: CommitSummary & {
        readonly body: string;
    };
    /** Unified diff of the commit against its first parent. */
    readonly patch?: string;
    readonly truncated?: boolean;
    /** The commit is a merge, whose combined diff Git prints only on request. */
    readonly merge?: boolean;
}
/**
 * `POST /commit-all` and `POST /commit-staged`: one commit, made out of every
 * change the working tree has or out of the index alone.
 *
 * Commit-all stages and commits in one request, because that is the one decision
 * the button offers when the page commits everything. Commit-staged runs `git
 * commit` over the index as it stands: the page's own stage and unstage actions
 * are what decides what is in it, and this route never stages anything itself.
 */
export interface CommitAllPayload {
    readonly ok: boolean;
    /** Raw diagnostic text: Git's own words, or a transport or seam message. */
    readonly error?: string;
    /** The coded refusal, which the page words in the active locale. */
    readonly failure?: Failure;
    /**
     * Why no commit was made, when the page can act on it: there is no repository,
     * the session may not write, there was nothing to commit, the index holds
     * nothing to commit (commit-staged only), or the tree still holds an
     * unresolved conflict — which `git add -A` would otherwise stage, markers and
     * all.
     */
    readonly reason?: 'no-repo' | 'error' | 'clean' | 'conflict';
    /** The commit that was just created, once it succeeded. */
    readonly commit?: CommitSummary;
}
/**
 * `POST /undo-commit`: the commit at HEAD, moved back off the branch.
 *
 * The move is a soft reset: HEAD steps back to the commit's first parent, while
 * the index and the working tree keep every byte the commit recorded. So the
 * changes the commit held come back as staged changes, ready to be amended,
 * split, or committed again — nothing the reader wrote is thrown away.
 *
 * The route refuses while a merge, rebase, or cherry-pick is in progress: the
 * branch is in the middle of an operation whose commits this reset would step
 * over. The first commit has no parent to step back to, and is refused as well
 * instead of leaving the branch unborn.
 */
export interface UndoCommitPayload {
    readonly ok: boolean;
    /** Raw diagnostic text: Git's own words, or a transport or seam message. */
    readonly error?: string;
    /** The coded refusal, which the page words in the active locale. */
    readonly failure?: Failure;
    /**
     * Why no commit was undone: there is no repository, the repository has no
     * commits, an operation is in progress, or the commit at HEAD is the first
     * one.
     */
    readonly reason?: 'no-repo' | 'error' | 'no-commits' | 'operation' | 'root';
    /** The commit that was taken off the branch, once the move succeeded. */
    readonly commit?: CommitSummary;
}
/**
 * `POST /stage`, `/unstage`, `/discard` and their `-folder` siblings: the
 * repository after one path write.
 *
 * A folder route names a directory rather than one file: the Host reads the
 * status inside the write queue and applies the same move to every changed path
 * under that directory, so the page never has to enumerate a tree that may be
 * large or stale. The answer carries the re-read status, so the page can repaint
 * both lists and the counts in one step instead of asking for a second read that
 * could race a third writer. A failure says why like every other route, and the
 * page's actions stay where they were: a write that did not happen changed
 * nothing on disk.
 */
export interface IndexPayload {
    readonly ok: boolean;
    /** Raw diagnostic text: Git's own words, or a transport or seam message. */
    readonly error?: string;
    /** The coded refusal, which the page words in the active locale. */
    readonly failure?: Failure;
    /** Why no move happened, when the page can act on it. */
    readonly reason?: 'no-repo' | 'error';
    /** The repository state after the move, when the move was made. */
    readonly status?: StatusPayload;
}
/**
 * Whether a commit — and the message written for it — covers the index alone or
 * the whole working tree.
 *
 * The page's default is `staged`: a reader who has moved paths into the index
 * has said what the commit should hold, and a commit that quietly took the rest
 * too would make the staging they just did meaningless. `all` is the explicit
 * alternative, for the reader who has staged nothing and wants the one-click
 * commit the tab used to offer.
 */
export type CommitScope = 'staged' | 'all';
/**
 * `POST /message`: one commit message the Workspace's model wrote for the
 * pending changes.
 *
 * The request says only which session is asking: *what* the model is shown —
 * the changed paths, the tracked patch, and the untracked files a patch against
 * HEAD cannot reach — is the Host's own read of the repository, exactly as every
 * other route resolves its own subject. Which model and prompt write it are the
 * Host's reads too: the Workspace's Settings choices when it has them, and DSH's
 * current default selection and the built-in prompt otherwise. So the page
 * cannot aim the call at a model the Workspace did not choose, and the model only
 * ever describes the tree Git reported.
 *
 * `message` is the model's own words and therefore carries no code, the same way
 * Git's diagnosis does not: it is another program's text, except that here it is
 * the answer rather than a refusal. The refusals this route words itself are the
 * ones the page can act on — there is nothing to describe, there is no model to
 * describe it with, or the model answered with nothing usable.
 */
export interface MessagePayload {
    readonly ok: boolean;
    /** Raw diagnostic text: the model adapter's own failure, or a seam message. */
    readonly error?: string;
    /** The coded refusal, which the page words in the active locale. */
    readonly failure?: Failure;
    /**
     * Why no message was written, when the page can act on it: there is no
     * repository, the model is missing, unconfigured, or timed out, it answered
     * with nothing, or the working tree holds nothing to describe.
     */
    readonly reason?: 'no-repo' | 'error' | 'clean';
    /** The message the form takes: a subject, and a body when one is needed. */
    readonly message?: string;
    /**
     * What the model's own pre-commit check flagged in these changes — a temp file,
     * an oversized file, or something that looks like a credential.
     *
     * The message is written either way; these are the lines worth reading before
     * the commit is made, and the page states them beside the form rather than
     * inside it, because a warning is not part of a commit message.
     */
    readonly warnings?: readonly string[];
}
/**
 * One model route the Settings dialog may write commit messages with.
 *
 * The identifiers are the ones `llm.stream` takes, and the optional effort is
 * the adapter-owned level a saved route may carry. The dialog's picker sets the
 * effort per model from the adapter's own list (see `ModelEffortsPayload`); a
 * route without one leaves the level to the adapter's default.
 */
export interface MessageModel {
    /** Registered provider route. */
    readonly provider: string;
    /** Provider-owned model id. */
    readonly model: string;
    /** Adapter-owned reasoning effort, when the route carries one. */
    readonly reasoningEffort?: string;
}
/** One model row inside a provider group of the Settings picker. */
export interface MessageModelOption {
    /** Provider-owned model id, as `llm.stream` takes it. */
    readonly id: string;
    /** Human-readable model name for the picker. */
    readonly name: string;
}
/**
 * One provider's models, in the adapter's own catalog order.
 *
 * Grouping survives the wire even though the picker draws a flat list: the
 * provider's display name is what a reader recognizes, and a provider whose
 * catalog could not be read is left out rather than failing the whole answer.
 */
export interface MessageModelGroup {
    /** Registered provider route. */
    readonly provider: string;
    /** Human-readable provider name. */
    readonly name: string;
    readonly models: readonly MessageModelOption[];
}
/**
 * `POST /model-efforts`: the reasoning efforts one model route offers.
 *
 * Read per model rather than shipped with the catalog: an adapter resolves
 * effort metadata one route at a time, and the picker only needs a row's list
 * while that row's effort control is open. The ids come in the adapter's own
 * order and are exactly what a saved route may name. An empty list is a real
 * answer — the model offers no selectable level, so its default applies.
 */
export interface ModelEffortsPayload {
    readonly ok: boolean;
    /** Raw diagnostic text: a transport or seam message. */
    readonly error?: string;
    /** The adapter's effort ids, in its own order. */
    readonly efforts?: readonly string[];
}
/**
 * `POST /settings`: what one Workspace has chosen for generated messages.
 *
 * `model` and `prompt` are the Workspace's overrides and are `null` when the
 * deployment's defaults are in use. `defaultModel` and `defaultPrompt` are the
 * same defaults restated for the dialog, so the picker can say which model the
 * default currently means and the prompt field can open on the built-in text.
 *
 * The default model is DSH's current default selection — the model the user
 * last chose in a session — and never a copy this plugin keeps: the Host reads
 * it per request, exactly as every chat request does.
 */
export interface SettingsPayload {
    readonly ok: boolean;
    /** Raw diagnostic text: a transport or seam message. */
    readonly error?: string;
    /** The coded refusal, which the page words in the active locale. */
    readonly failure?: Failure;
    readonly reason?: 'no-repo' | 'error';
    /** The Workspace the choices belong to, when the Host can name it. */
    readonly workspace?: WorkspaceInfo;
    /** The saved model override, or null while the default model is in use. */
    readonly model?: MessageModel | null;
    /** The saved prompt override, or null while the built-in prompt is in use. */
    readonly prompt?: string | null;
    /** The deployment's current default selection, or null when it names none. */
    readonly defaultModel?: MessageModel | null;
    /** The built-in system prompt, always present on a successful read. */
    readonly defaultPrompt?: string;
    /** Every model the dialog may pick, grouped by provider. */
    readonly groups?: readonly MessageModelGroup[];
}
/**
 * Longest custom message prompt the Settings route accepts.
 *
 * The bound is the wire contract's rather than either half's: the page stops the
 * field at the same value so a paste cannot turn Save into a refusal, and the
 * Host refuses anything longer rather than writing an unbounded file.
 */
export declare const MAX_PROMPT_LENGTH = 20000;
/**
 * Longest provider or model identifier either half accepts.
 *
 * A route may store only what the settings reader would hand back, so the two
 * checks share the one bound: a longer identifier the route accepted would be
 * dropped by the next read instead of being written and reported as saved.
 */
export declare const MAX_MODEL_ID_LENGTH = 200;
/** `POST /settings-save`: the outcome of storing one Workspace's choices. */
export interface SaveSettingsPayload {
    readonly ok: boolean;
    /** Raw diagnostic text: a transport or seam message. */
    readonly error?: string;
    /** The coded refusal, which the page words in the active locale. */
    readonly failure?: Failure;
    readonly reason?: 'no-repo' | 'error';
}
/**
 * Collapse one porcelain `XY` pair into the single label the sidebar shows.
 *
 * The worktree column wins when it says anything: a path staged as added and
 * then deleted in the worktree is, to the person reading the row, deleted. The
 * index column is consulted only when the worktree is clean against it.
 *
 * @param index - porcelain `X`, the index's state against HEAD.
 * @param worktree - porcelain `Y`, the worktree's state against the index.
 * @returns the row's label.
 */
export declare function classifyChange(index: string, worktree: string): ChangeKind;
/**
 * This bundle's own package name.
 *
 * The update row on the plugin's detail page is about one package and installs
 * that package, so the name is stated once here rather than read back from the
 * page's subject: the subject names whichever bundle the reader opened, and only
 * the package itself may be upgraded from its own page.
 */
export declare const PACKAGE_NAME = "dsh-cool-git";
/**
 * Where this plugin is published and where its source lives.
 *
 * The plugin page's update row links to both: the package is what an update
 * installs, and the repository is what an issue or a changelog is read in. They
 * restate `package.json`'s `homepage` and `repository` because the browser half
 * never reads that file — the bundle carries its own constants.
 */
export declare const PACKAGE_NPM_PAGE = "https://www.npmjs.com/package/dsh-cool-git";
export declare const PACKAGE_REPOSITORY = "https://github.com/CoolTea001/dsh-cool-git";
/**
 * `POST /update`: the newest published version of this plugin.
 *
 * `latest` is what the public registry answers for `PACKAGE_NAME`; it is absent
 * when the registry could not be read, and the row then says so instead of
 * guessing. `installed` and `source` are the profile's own record, read from the
 * plugin manager, so the row can tell a registry install (which the button can
 * replace) from a `link:` or `file:` development install.
 */
export interface UpdateCheckPayload {
    readonly ok: boolean;
    /** Raw diagnostic text: a transport or seam message. */
    readonly error?: string;
    /** The coded refusal, which the page words in the active locale. */
    readonly failure?: Failure;
    /** The newest version the registry names, absent when it could not be read. */
    readonly latest?: string;
    /** The version the profile records, when the manager lists this bundle. */
    readonly installed?: string;
    /** How the profile installs it: a registry spec, or a `link:`/`file:` path. */
    readonly source?: string;
}
/**
 * `POST /update-apply`: the outcome of installing one published version.
 *
 * The manager's own answer is passed through: `applied` means the profile now
 * runs the new version (a composition with HMR recomposes at once), while
 * `restart-required` means the files changed but the running process still holds
 * the old code. `changed: false` is a success too — the requested version was
 * already what the profile records.
 */
export interface UpdateApplyPayload {
    readonly ok: boolean;
    /** Raw diagnostic text: a transport or seam message, or the manager's own. */
    readonly error?: string;
    /** The coded refusal, which the page words in the active locale. */
    readonly failure?: Failure;
    /** How the manager applied the change. */
    readonly application?: 'applied' | 'restart-required';
    /** Why a restart is needed, as the manager stated it. */
    readonly restartReason?: string;
}
/**
 * The routes both halves address, in one table.
 *
 * The browser half posts to these paths and the Host half registers them, so the
 * table lives in the shared contract rather than in either half's module: a
 * rename here reaches both halves at once instead of leaving one calling a route
 * the other no longer serves. The prefix is this package's own because an
 * out-of-tree bundle cannot claim a namespace on the shared origin any other way.
 */
export declare const ROUTES: {
    readonly status: "/dsh-cool-git/api/status";
    readonly log: "/dsh-cool-git/api/log";
    readonly diff: "/dsh-cool-git/api/diff";
    readonly commit: "/dsh-cool-git/api/commit";
    readonly commitAll: "/dsh-cool-git/api/commit-all";
    readonly commitStaged: "/dsh-cool-git/api/commit-staged";
    readonly undoCommit: "/dsh-cool-git/api/undo-commit";
    readonly stage: "/dsh-cool-git/api/stage";
    readonly unstage: "/dsh-cool-git/api/unstage";
    readonly discard: "/dsh-cool-git/api/discard";
    readonly stageFolder: "/dsh-cool-git/api/stage-folder";
    readonly unstageFolder: "/dsh-cool-git/api/unstage-folder";
    readonly discardFolder: "/dsh-cool-git/api/discard-folder";
    readonly stageAll: "/dsh-cool-git/api/stage-all";
    readonly unstageAll: "/dsh-cool-git/api/unstage-all";
    readonly discardAll: "/dsh-cool-git/api/discard-all";
    readonly message: "/dsh-cool-git/api/message";
    readonly settings: "/dsh-cool-git/api/settings";
    readonly settingsSave: "/dsh-cool-git/api/settings-save";
    readonly modelEfforts: "/dsh-cool-git/api/model-efforts";
    readonly branches: "/dsh-cool-git/api/branches";
    readonly branchReport: "/dsh-cool-git/api/branch-report";
    readonly branchCreate: "/dsh-cool-git/api/branch-create";
    readonly branchDelete: "/dsh-cool-git/api/branch-delete";
    readonly checkout: "/dsh-cool-git/api/checkout";
    readonly merge: "/dsh-cool-git/api/merge";
    readonly conflict: "/dsh-cool-git/api/conflict";
    readonly resolve: "/dsh-cool-git/api/resolve";
    readonly resolveDone: "/dsh-cool-git/api/resolve-done";
    readonly mergeCommit: "/dsh-cool-git/api/merge-commit";
    readonly fetch: "/dsh-cool-git/api/fetch";
    readonly fetchUpstream: "/dsh-cool-git/api/fetch-upstream";
    readonly pull: "/dsh-cool-git/api/pull";
    readonly push: "/dsh-cool-git/api/push";
    readonly update: "/dsh-cool-git/api/update";
    readonly updateApply: "/dsh-cool-git/api/update-apply";
};
//# sourceMappingURL=contract.d.ts.map