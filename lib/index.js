//#region src/shared/contract.ts
/** Porcelain `XY` pairs Git uses for an unmerged path. */
const CONFLICT_PAIRS = /* @__PURE__ */ new Set([
	"DD",
	"AU",
	"UD",
	"UA",
	"DU",
	"AA",
	"UU"
]);
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
function classifyChange(index, worktree) {
	if (index === "?" || worktree === "?") return "untracked";
	if (CONFLICT_PAIRS.has(`${index}${worktree}`)) return "conflicted";
	const worktreeKind = kindOf(worktree);
	if (worktreeKind !== void 0) return worktreeKind;
	return kindOf(index) ?? "unknown";
}
/**
* Map one porcelain status character to its label.
*
* @param code - one character of the `XY` pair.
* @returns the label, or undefined for a space (no change on that side).
*/
function kindOf(code) {
	switch (code) {
		case "A": return "added";
		case "M": return "modified";
		case "D": return "deleted";
		case "R": return "renamed";
		case "C": return "copied";
		case "T": return "typechange";
		default: return;
	}
}
//#endregion
//#region src/host/git.ts
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
/**
* One coded refusal, shaped as a payload carries it.
*
* @param code - the refusal, whose sentence the page owns.
* @param params - the values that sentence interpolates, when it has any.
* @returns the payload fragment to spread into an `ok: false` answer.
*/
function coded$1(code, params) {
	return { failure: params === void 0 ? { code } : {
		code,
		params
	} };
}
/** Wall-clock bound per Git invocation; a hung command is killed, not waited on. */
const GIT_TIMEOUT_MS = 2e4;
/**
* Wall-clock bound for the two invocations that cross the network.
*
* A fetch or a push legitimately takes longer than a local read — a slow remote
* or a large pack is not a hung command — so the local bound would kill a
* transfer that was still making progress.
*/
const GIT_NETWORK_TIMEOUT_MS = 18e4;
/** Largest patch the Host collects; beyond this the answer is flagged truncated. */
const MAX_STDOUT_BYTES = 4 * 1024 * 1024;
/**
* Characters a ref name may use, and the shapes Git forbids inside one.
*
* The name is quoted for the shell and verified against `refs/heads/` before it
* is ever passed to a command that acts on it, so this is not what keeps the
* command safe; it is what keeps a typo from being answered by Git's own
* confusing ref-format error instead of a plain "this branch does not exist".
*/
const BRANCH_NAME = /^[A-Za-z0-9][A-Za-z0-9._/-]*$/;
/** Field separator inside one formatted record; `%x1f` is expanded by Git. */
const FIELD = "";
/** Separator that ends the commit-detail header block; `%x1e` is Git-expanded. */
const RECORD = "";
/** `HEAD` short form for the status header. */
const HEAD_FORMAT = [
	"%H",
	"%h",
	"%aI",
	"%s"
].join("%x1f");
/**
* One commit summary, in the order {@link parseSummary} destructures it; `%D`
* carries the ref decorations and `%P` the parents.
*/
const SUMMARY_FIELDS = [
	"%H",
	"%h",
	"%an",
	"%ae",
	"%aI",
	"%P",
	"%D",
	"%s"
];
/** One commit summary per record, for `log`. */
const LOG_FORMAT = SUMMARY_FIELDS.join("%x1f");
/** Where the message body sits in a detail record: after every summary field. */
const BODY_FIELD = SUMMARY_FIELDS.length;
/** Commit detail: the summary fields plus the message body. */
const DETAIL_FORMAT = `${LOG_FORMAT}%x1f%b%x1e`;
/** Environment every invocation shares: no pager, no prompt, no index write. */
const GIT_ENV = {
	GIT_OPTIONAL_LOCKS: "0",
	GIT_TERMINAL_PROMPT: "0",
	GIT_PAGER: "cat"
};
/**
* The same target aimed at another directory.
*
* @param target - the request's target.
* @param workdir - the directory the next command runs in.
* @returns a target that differs only in its directory.
*/
function inDir(target, workdir) {
	return {
		...target,
		workdir
	};
}
/**
* Quote one value for the shell line the seam runs.
*
* The seam executes the command as `bash -c <command>`, so every argument that
* is not a literal this module wrote must survive as a single word. Wrapping in
* single quotes does that; the only character that can end such a word is a
* single quote itself, which is closed, escaped, and reopened.
*
* @param value - the raw argument.
* @returns a single quoted shell word.
*/
function quote(value) {
	return `'${value.replace(/'/g, `'\\''`)}'`;
}
/**
* Build the full command line for one Git invocation.
*
* @param args - the subcommand and its arguments, each quoted individually.
* @returns the command string handed to `shell.resolve`.
*/
function command(args) {
	return [
		"git",
		"--no-pager",
		"-c",
		"core.quotePath=false",
		...args
	].map(quote).join(" ");
}
function messageOf(error) {
	return error instanceof Error ? error.message : String(error);
}
/**
* Run one Git command and collect its result.
*
* @param target - the shell seam, the directory, and the file policy to run under.
* @param args - subcommand and arguments, before quoting.
* @param acceptCodes - exit codes that are a normal answer rather than a failure.
* @param timeoutMs - wall-clock bound; the network commands raise it.
* @returns the invocation's outcome; never rejects.
*/
async function runGit(target, args, acceptCodes = [0], timeoutMs = GIT_TIMEOUT_MS) {
	const { shell, sandboxPolicy } = target;
	const request = {
		command: command(args),
		workdir: target.workdir,
		timeoutMs,
		onExpiry: "kill",
		stdoutMaxBytes: MAX_STDOUT_BYTES,
		env: { ...GIT_ENV },
		...sandboxPolicy === void 0 ? {} : { sandboxPolicy }
	};
	try {
		const spec = shell.resolve(request);
		const result = await (await shell.execute(spec)).result();
		return {
			code: typeof result?.exitCode === "number" ? result.exitCode : null,
			stdout: typeof result?.stdout?.text === "string" ? result.stdout.text : "",
			stderr: typeof result?.stderr?.text === "string" ? result.stderr.text : "",
			truncated: result?.stdout?.truncated === true,
			denied: result?.sandbox?.denied === true
		};
	} catch (error) {
		return failureRun(messageOf(error));
	}
}
/** An outcome that never reached Git, so the caller reports it as infrastructure. */
function failureRun(error) {
	return {
		code: null,
		stdout: "",
		stderr: "",
		truncated: false,
		failure: error
	};
}
/**
* Git's own diagnosis of a failed command, as one block of text.
*
* Git reports a refusal on stderr and leaves stdout for the case where it has
* nothing to say there — a `pull` that refuses a divergence prints its advice on
* stdout — so the two are read in that order.
*
* @param run - the failed invocation.
* @returns the trimmed diagnosis; empty when the command said nothing at all.
*/
function diagnosticText(run) {
	const stderr = run.stderr.trim();
	return stderr === "" ? run.stdout.trim() : stderr;
}
/**
* The one-line refusal a failed command amounts to, for the page to render.
*
* Git writes its diagnosis to stderr; a sandbox denial is reported by the seam
* instead and would otherwise read as an empty message. Only the two cases the
* page words itself are coded — a denial, and a command that said nothing at
* all — because every other refusal is Git's own first line, which is more
* specific than anything this half could invent and cannot be translated.
*
* @param run - the failed invocation.
* @returns the coded refusal, or the text Git printed.
*/
function refusalOf(run) {
	if (run.denied === true) return coded$1("git-denied");
	const text = diagnosticText(run);
	if (text === "") return coded$1("git-exit", { code: run.code ?? "null" });
	return { error: text.split("\n")[0] ?? text };
}
/**
* Resolve the repository that owns `workdir` and whether it has any commit.
*
* `--show-toplevel` is what makes the rest of the module simple: every later
* path is relative to a root Git itself named, not to a directory this plugin
* guessed, and a directory with no repository is answered as such instead of
* surfacing `fatal: not a git repository` as an error.
*
* @param target - the shell seam, the session's directory, and the file policy.
* @returns the root and HEAD state, or the reason it cannot be used.
*/
async function resolveRepo(target) {
	const top = await runGit(target, ["rev-parse", "--show-toplevel"]);
	if (top.failure !== void 0) return {
		refusal: { error: top.failure },
		reason: "error"
	};
	if (top.code !== 0) return {
		refusal: refusalOf(top),
		reason: "no-repo"
	};
	const root = top.stdout.trim();
	if (root === "") return {
		refusal: coded$1("no-root"),
		reason: "no-repo"
	};
	return {
		root,
		hasHead: (await runGit(inDir(target, root), [
			"rev-parse",
			"--verify",
			"--quiet",
			"HEAD"
		], [0, 1])).code === 0
	};
}
/**
* Read the current branch, its upstream, and every changed path.
*
* @param target - the shell seam, the session's directory, and the file policy.
* @returns the status payload the page renders its sidebar from.
*/
async function readStatus(target) {
	const repo = await resolveRepo(target);
	if ("refusal" in repo) return {
		ok: false,
		...repo.refusal,
		reason: repo.reason
	};
	const status = await runGit(inDir(target, repo.root), [
		"status",
		"--porcelain=v1",
		"-z",
		"--branch",
		"--untracked-files=all"
	]);
	if (status.code !== 0) return {
		ok: false,
		...refusalOf(status),
		reason: "error"
	};
	const parsed = parseStatus(status.stdout);
	let head = null;
	if (repo.hasHead) {
		const log = await runGit(inDir(target, repo.root), [
			"log",
			"-1",
			`--pretty=format:${HEAD_FORMAT}`
		]);
		if (log.code === 0) {
			const [hash = "", short = "", date = "", subject = ""] = log.stdout.split(FIELD);
			head = {
				hash,
				short,
				date,
				subject
			};
		}
	}
	return {
		ok: true,
		root: repo.root,
		branch: parsed.branch,
		detached: parsed.detached,
		upstream: parsed.upstream,
		ahead: parsed.ahead,
		behind: parsed.behind,
		hasHead: repo.hasHead,
		head,
		files: parsed.files
	};
}
/**
* Parse `git status --porcelain=v1 -z --branch` output.
*
* The format is NUL-separated, which is what makes it safe for paths holding
* spaces, quotes, or newlines: no escaping is involved at all. A rename or copy
* record is followed by one extra record holding its source path, so the walk
* consumes two records for those codes.
*
* @param output - the command's stdout.
* @returns the branch header and one entry per changed path.
*/
function parseStatus(output) {
	const records = output.split("\0");
	const header = parseBranchHeader(records[0]?.startsWith("## ") === true ? records[0] : void 0);
	const files = [];
	for (let index = header.consumed; index < records.length; index += 1) {
		const record = records[index];
		if (record === void 0 || record.length < 3) continue;
		const x = record.charAt(0);
		const y = record.charAt(1);
		const path = record.slice(3);
		let origPath;
		if (x === "R" || x === "C") {
			index += 1;
			origPath = records[index];
		}
		files.push(changedFile(path, origPath, x, y));
	}
	return {
		...header.value,
		files
	};
}
/** Branch facts assumed when the header is missing or unreadable. */
const UNKNOWN_BRANCH = {
	branch: "",
	detached: false,
	upstream: void 0,
	ahead: 0,
	behind: 0
};
/**
* Parse the `## ...` header line into its branch, upstream, and divergence.
*
* The four shapes Git emits are `## main`, `## main...origin/main`,
* `## main...origin/main [ahead 1, behind 2]`, and the unborn branch's
* `## No commits yet on main`; a detached HEAD is `## HEAD (no branch)`.
*
* @param record - the first NUL-separated record, when it is a branch header.
* @returns the facts, and the number of records the header occupied.
*/
function parseBranchHeader(record) {
	if (record === void 0) return {
		consumed: 0,
		value: UNKNOWN_BRANCH
	};
	const body = record.slice(3).trim();
	const text = /^(?:No commits yet on|Initial commit on) (.+)$/.exec(body)?.[1] ?? body;
	if (text === "HEAD (no branch)") return {
		consumed: 1,
		value: {
			...UNKNOWN_BRANCH,
			detached: true,
			branch: "HEAD"
		}
	};
	const [names, divergence] = splitOnce(text, " [");
	const [branch, upstream] = splitOnce(names, "...");
	const counts = parseDivergence(divergence);
	return {
		consumed: 1,
		value: {
			branch,
			detached: false,
			upstream: upstream === "" ? void 0 : upstream,
			ahead: counts.ahead,
			behind: counts.behind
		}
	};
}
/**
* Split `text` at the first occurrence of `separator`.
*
* @param text - the text to split.
* @param separator - the marker to split on.
* @returns both halves; the second is empty when the marker is absent.
*/
function splitOnce(text, separator) {
	const at = text.indexOf(separator);
	if (at < 0) return [text, ""];
	return [text.slice(0, at), text.slice(at + separator.length)];
}
/**
* Read the `ahead N, behind M` counts out of a branch header's bracket.
*
* @param divergence - the bracketed text without its opening bracket, if any.
* @returns the two counts; both zero when the branch has no upstream delta.
*/
function parseDivergence(divergence) {
	const body = divergence.endsWith("]") ? divergence.slice(0, -1) : divergence;
	const ahead = /\bahead (\d+)/.exec(body);
	const behind = /\bbehind (\d+)/.exec(body);
	return {
		ahead: ahead === null ? 0 : Number(ahead[1]),
		behind: behind === null ? 0 : Number(behind[1])
	};
}
/**
* Build one sidebar row from a porcelain record.
*
* @param path - the worktree path.
* @param origPath - the rename/copy source, when the record had one.
* @param x - the porcelain index column.
* @param y - the porcelain worktree column.
* @returns the row the page renders.
*/
function changedFile(path, origPath, x, y) {
	const kind = classifyChange(x, y);
	const untracked = kind === "untracked";
	const conflicted = kind === "conflicted";
	return {
		path,
		...origPath === void 0 ? {} : { origPath },
		index: x,
		worktree: y,
		kind,
		staged: !untracked && x !== " " && x !== "?",
		unstaged: !untracked && y !== " " && y !== "?",
		untracked,
		conflicted
	};
}
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
async function readLog(target, limit) {
	const repo = await resolveRepo(target);
	if ("refusal" in repo) return {
		ok: false,
		...repo.refusal,
		reason: repo.reason
	};
	if (!repo.hasHead) return {
		ok: true,
		commits: [],
		empty: true
	};
	const count = clampLimit(limit);
	const log = await runGit(inDir(target, repo.root), [
		"log",
		"-z",
		`--max-count=${count}`,
		`--pretty=format:${LOG_FORMAT}`
	]);
	if (log.code !== 0) return {
		ok: false,
		...refusalOf(log),
		reason: "error"
	};
	const commits = [];
	for (const record of log.stdout.split("\0")) {
		if (record === "") continue;
		const summary = parseSummary(record.split(FIELD));
		if (summary !== void 0) commits.push(summary);
	}
	return {
		ok: true,
		commits,
		empty: commits.length === 0
	};
}
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
async function readCommit(target, hash) {
	const repo = await resolveRepo(target);
	if ("refusal" in repo) return {
		ok: false,
		...repo.refusal,
		reason: repo.reason
	};
	if (!repo.hasHead) return {
		ok: false,
		...coded$1("no-commits"),
		reason: "error"
	};
	const meta = await runGit(inDir(target, repo.root), [
		"log",
		"-1",
		`--pretty=format:${DETAIL_FORMAT}`,
		hash
	]);
	if (meta.code !== 0) return {
		ok: false,
		...refusalOf(meta),
		reason: "error"
	};
	const cut = meta.stdout.indexOf(RECORD);
	const fields = (cut < 0 ? meta.stdout : meta.stdout.slice(0, cut)).split(FIELD);
	const summary = parseSummary(fields);
	if (summary === void 0) return {
		ok: false,
		...coded$1("unparsable-commit"),
		reason: "error"
	};
	const body = fields[BODY_FIELD] ?? "";
	const merge = summary.parents.length > 1;
	const patchRun = summary.parents.length === 0 ? await runGit(inDir(target, repo.root), [
		"show",
		"--no-color",
		"--no-ext-diff",
		"-M",
		"--patch",
		"-U3",
		"--format=",
		hash
	]) : await runGit(inDir(target, repo.root), [
		"diff",
		"--no-color",
		"--no-ext-diff",
		"-M",
		"-U3",
		`${hash}^`,
		hash
	]);
	if (patchRun.code !== 0) return {
		ok: false,
		...refusalOf(patchRun),
		reason: "error"
	};
	return {
		ok: true,
		commit: {
			...summary,
			body
		},
		patch: patchRun.stdout.replace(/^\n+/, ""),
		truncated: patchRun.truncated,
		merge
	};
}
/**
* Read one path's difference against HEAD.
*
* A tracked path is diffed against HEAD rather than against the index, so a
* file with both staged and unstaged edits shows everything that differs from
* the last commit in one patch — which is what "查看这个文件的改动" means. An
* untracked path has no HEAD side at all, so it is diffed against `/dev/null`;
* a repository without commits compares against the index or the worktree,
* whichever side the row says holds the change.
*
* @param target - the shell seam, the session's directory, and the file policy.
* @param file - the changed path, as `status` reported it.
* @returns the unified diff, or the reason there is none.
*/
async function readDiff(target, file) {
	const repo = await resolveRepo(target);
	if ("refusal" in repo) return {
		ok: false,
		...repo.refusal,
		reason: repo.reason
	};
	const base = ["--no-color", "--no-ext-diff"];
	const root = inDir(target, repo.root);
	let diff;
	if (file.untracked) diff = await runGit(root, [
		"diff",
		"--no-index",
		...base,
		"--",
		"/dev/null",
		file.path
	], [0, 1]);
	else if (!repo.hasHead) diff = await runGit(root, [
		"diff",
		...file.staged ? ["--cached"] : [],
		...base,
		"--",
		file.path
	]);
	else diff = await runGit(root, [
		"diff",
		"HEAD",
		"-M",
		...base,
		"--",
		file.path
	]);
	if (diff.code !== 0 && diff.code !== 1) return {
		ok: false,
		...refusalOf(diff),
		reason: "error"
	};
	const patch = diff.stdout;
	return {
		ok: true,
		path: file.path,
		patch,
		truncated: diff.truncated,
		binary: /^(?:Binary files .* differ|GIT binary patch)$/m.test(patch)
	};
}
/**
* Read the short names under one ref namespace, newest commit date first.
*
* `--count` is asked for one more name than the cap, so a cut list can say that
* it was cut. The separator question does arise here — and only here — because a
* remote's symbolic `HEAD` is wanted out of the list: `%(symref)` is empty for a
* real ref and names the target for that alias, and `%00` is how the two fields
* are kept apart inside a record (`%x1f` is expanded by `log --pretty` and not
* by `for-each-ref`; `%00` is). Ref names can hold no NUL, so a record is
* exactly two fields.
*
* @param root - the repository root, with the session's file policy.
* @param namespace - the ref namespace to read, e.g. `refs/heads/`.
* @returns the short names, or why the read failed.
*/
async function readRefNames(root, namespace) {
	const list = await runGit(root, [
		"for-each-ref",
		"--sort=-committerdate",
		`--count=201`,
		"--format=%(refname:short)%00%(symref)",
		namespace
	]);
	if (list.code !== 0) return {
		ok: false,
		refusal: refusalOf(list)
	};
	const names = [];
	let truncated = false;
	for (const record of list.stdout.split("\n")) {
		if (record === "") continue;
		const [name = "", symref = ""] = record.split("\0");
		if (symref !== "") continue;
		if (names.length === 200) {
			truncated = true;
			break;
		}
		names.push(name);
	}
	return {
		ok: true,
		names,
		truncated
	};
}
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
async function readBranches(target) {
	const repo = await resolveRepo(target);
	if ("refusal" in repo) return {
		ok: false,
		...repo.refusal,
		reason: repo.reason
	};
	const root = inDir(target, repo.root);
	const locals = await readRefNames(root, "refs/heads/");
	if (!locals.ok) return {
		ok: false,
		...locals.refusal,
		reason: "error"
	};
	const remotes = await readRefNames(root, "refs/remotes/");
	if (!remotes.ok) return {
		ok: false,
		...remotes.refusal,
		reason: "error"
	};
	const current = await currentBranch(root);
	return {
		ok: true,
		current,
		detached: current === null,
		branches: locals.names,
		remotes: remotes.names,
		truncated: locals.truncated || remotes.truncated
	};
}
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
async function switchBranch(target, name) {
	const repo = await resolveRepo(target);
	if ("refusal" in repo) return {
		ok: false,
		...repo.refusal,
		reason: repo.reason
	};
	if (!BRANCH_NAME.test(name) || name.includes("..") || name.includes("@{")) return {
		ok: false,
		...coded$1("invalid-branch", { name }),
		reason: "unknown-branch"
	};
	const root = inDir(target, repo.root);
	if (await refExists(root, `refs/heads/${name}`)) return switchTo(root, ["switch", name], ["checkout", name], name);
	if (!await refExists(root, `refs/remotes/${name}`)) return {
		ok: false,
		...coded$1("unknown-branch", { name }),
		reason: "unknown-branch"
	};
	const local = await localNameForRemote(root, name);
	if (local === null) return {
		ok: false,
		...coded$1("remote-local-name", { name }),
		reason: "error"
	};
	if (await refExists(root, `refs/heads/${local}`)) return switchTo(root, ["switch", local], ["checkout", local], local);
	return switchTo(root, [
		"switch",
		"-c",
		local,
		"--track",
		name
	], [
		"checkout",
		"-b",
		local,
		"--track",
		name
	], local);
}
/**
* Run one switch and report it.
*
* `git switch` arrived in 2.23; on an older Git the same intent is spelled with
* `checkout`, which differs in exactly one letter of one option (`-c` against
* `-b`), so the caller hands over both spellings rather than this helper
* translating an argument list it does not own.
*
* @param root - the repository root, with the session's file policy.
* @param attempt - the `switch` invocation, subcommand first.
* @param fallback - the same invocation for a Git without `switch`.
* @param branch - the local branch this switch lands on.
* @returns the outcome, including the reason a switch was refused.
*/
async function switchTo(root, attempt, fallback, branch) {
	let run = await runGit(root, attempt);
	if (run.code !== 0 && /switch.*(?:is not a git command|unknown)|unknown (?:option|subcommand)/i.test(run.stderr)) run = await runGit(root, fallback);
	if (run.code !== 0) return checkoutFailure(run);
	return {
		ok: true,
		branch
	};
}
/**
* Whether one fully-qualified ref resolves.
*
* `--quiet` with `--verify` answers in the exit code alone, which is the only
* question asked here: a name that resolves to nothing and a name that is not a
* valid ref at all are the same answer to "may this be switched to".
*
* @param root - the repository root, with the session's file policy.
* @param ref - the full ref name to resolve.
* @returns true when the ref exists.
*/
async function refExists(root, ref) {
	return (await runGit(root, [
		"rev-parse",
		"--verify",
		"--quiet",
		ref
	], [0, 1])).code === 0;
}
/**
* The local branch name a remote-tracking ref is checked out as.
*
* Git's rule is to strip the remote name, and the remote names are the
* configured ones rather than a guess cut out of the ref: a remote may itself
* contain a slash, so the longest matching remote is the only correct answer.
* No match means no configured remote owns the ref — a stale directory left by a
* removed remote — and the caller states that rather than inventing a name.
*
* @param root - the repository root, with the session's file policy.
* @param ref - the remote-tracking ref, e.g. `origin/feature/x`.
* @returns the local name, or null when no configured remote prefixes the ref.
*/
async function localNameForRemote(root, ref) {
	let best = null;
	for (const remote of await remotesOf(root)) {
		if (!ref.startsWith(`${remote}/`)) continue;
		if (best === null || remote.length > best.length) best = remote;
	}
	if (best === null) return null;
	const local = ref.slice(best.length + 1);
	return local === "" ? null : local;
}
/**
* Describe why a checkout was refused.
*
* The interesting case is a dirty working tree: Git names the paths it would
* have to overwrite, and those names are what makes the message actionable, so
* they are lifted out of the block Git prints rather than left in a wall of
* advice the page would truncate away.
*
* @param run - the failed invocation.
* @returns the payload the page renders.
*/
function checkoutFailure(run) {
	if (run.denied === true) return {
		ok: false,
		...coded$1("checkout-denied"),
		reason: "denied"
	};
	const text = diagnosticText(run);
	if (/local changes|would be overwritten|commit your changes or stash/i.test(text)) {
		const paths = text.split("\n").map((line) => line.trim()).filter((line) => line !== "" && !/^(?:error|fatal|Please|Aborting|note:)/i.test(line) && !line.includes(" ")).slice(0, 5);
		return {
			ok: false,
			...paths.length === 0 ? coded$1("checkout-dirty") : coded$1("checkout-dirty-paths", { paths: paths.join(", ") }),
			reason: "dirty"
		};
	}
	return {
		ok: false,
		...refusalOf(run),
		reason: "error"
	};
}
/**
* The branch HEAD is on, or null while HEAD is detached.
*
* `symbolic-ref` is the only reader that distinguishes "on a branch" from
* "detached": `status --branch` spells the latter `HEAD (no branch)`, which this
* half would then have to pattern-match. Exit code 1 is a detached HEAD.
*
* @param root - the repository root, with the session's file policy.
* @returns the short branch name.
*/
async function currentBranch(root) {
	const head = await runGit(root, [
		"symbolic-ref",
		"--short",
		"-q",
		"HEAD"
	], [0, 1]);
	if (head.code !== 0) return null;
	const name = head.stdout.trim();
	return name === "" ? null : name;
}
/**
* The full name of the current branch's upstream, e.g. `origin/main`.
*
* `@{upstream}` is the only reader that answers this the way Git's own push and
* pull do — including a renamed or unusually configured remote — instead of
* this half re-deriving `remote` + `merge` from the configuration.
*
* @param root - the repository root, with the session's file policy.
* @returns the upstream, or undefined when the branch has none.
*/
async function upstreamOf(root) {
	const upstream = await runGit(root, [
		"rev-parse",
		"--abbrev-ref",
		"--symbolic-full-name",
		"@{upstream}"
	], [
		0,
		1,
		128
	]);
	if (upstream.code !== 0) return void 0;
	const name = upstream.stdout.trim();
	return name === "" ? void 0 : name;
}
/**
* The configured remote names, in configuration order.
*
* @param root - the repository root, with the session's file policy.
* @returns the remote names; empty when the repository has none.
*/
async function remotesOf(root) {
	const list = await runGit(root, ["remote"]);
	if (list.code !== 0) return [];
	return list.stdout.split("\n").map((name) => name.trim()).filter((name) => name !== "");
}
/**
* The refusal each half of the round trip reports for a state it cannot move.
*
* Both halves ask the same three questions before either touches the network,
* so the answers differ only in which operation they name — and that name is
* the first word of a code, because the sentences belong to the page and read
* differently in each language.
*/
const ACTION_REFUSAL = {
	pull: {
		noCommits: "pull-no-commits",
		detached: "pull-detached",
		denied: "pull-denied",
		dirty: "pull-dirty"
	},
	push: {
		noCommits: "push-no-commits",
		detached: "push-detached",
		denied: "push-denied",
		dirty: "push-dirty"
	}
};
/**
* Resolve the repository and the branch a remote hand-off runs against.
*
* Pull and push ask the same three questions before either touches the network —
* is there a repository, does it have a commit, and is HEAD on a branch — and
* must answer them in the same order, so the guard is taken once here and each
* operation then names only itself. Without a branch there is nothing to hand
* off, which is why the guard, not the caller, states that refusal.
*
* @param target - the shell seam, the session's directory, and the file policy.
* @param action - which operation is asking, for its own refusal messages.
* @returns the repository root and its branch, or the payload to answer with.
*/
async function resolveHandoff(target, action) {
	const repo = await resolveRepo(target);
	if ("refusal" in repo) return {
		ok: false,
		payload: {
			ok: false,
			...repo.refusal,
			reason: repo.reason,
			action
		}
	};
	if (!repo.hasHead) return {
		ok: false,
		payload: {
			ok: false,
			...coded$1(ACTION_REFUSAL[action].noCommits),
			reason: "error",
			action
		}
	};
	const root = inDir(target, repo.root);
	const branch = await currentBranch(root);
	if (branch === null) return {
		ok: false,
		payload: {
			ok: false,
			...coded$1(ACTION_REFUSAL[action].detached),
			reason: "detached",
			action
		}
	};
	return {
		ok: true,
		root,
		branch
	};
}
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
async function pullFromRemote(target) {
	const handoff = await resolveHandoff(target, "pull");
	if (!handoff.ok) return handoff.payload;
	const upstream = await upstreamOf(handoff.root);
	if (upstream === void 0) return {
		ok: false,
		...coded$1("pull-no-upstream", { branch: handoff.branch }),
		reason: "no-upstream",
		action: "pull"
	};
	const run = await runGit(handoff.root, ["pull", "--ff-only"], [0], GIT_NETWORK_TIMEOUT_MS);
	if (run.failure !== void 0) return {
		ok: false,
		error: run.failure,
		reason: "error",
		action: "pull"
	};
	if (run.code !== 0) return syncFailure(run, "pull");
	const output = `${run.stdout}\n${run.stderr}`;
	return {
		ok: true,
		action: "pull",
		summary: /Already up[ -]to[ -]date/i.test(output) ? `Already up to date with ${upstream}` : `Pulled from ${upstream}`
	};
}
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
async function pushToRemote(target) {
	const handoff = await resolveHandoff(target, "push");
	if (!handoff.ok) return handoff.payload;
	const { root, branch } = handoff;
	let ref = await upstreamOf(root);
	let args = ["push"];
	if (ref === void 0) {
		const remotes = await remotesOf(root);
		const remote = remotes[0];
		if (remote === void 0) return {
			ok: false,
			...coded$1("push-no-remote"),
			reason: "no-remote",
			action: "push"
		};
		if (remotes.length > 1) return {
			ok: false,
			...coded$1("push-ambiguous-remote", { remotes: remotes.join(", ") }),
			reason: "ambiguous-remote",
			action: "push"
		};
		ref = `${remote}/${branch}`;
		args = [
			"push",
			"--set-upstream",
			remote,
			branch
		];
	}
	const run = await runGit(root, args, [0], GIT_NETWORK_TIMEOUT_MS);
	if (run.failure !== void 0) return {
		ok: false,
		error: run.failure,
		reason: "error",
		action: "push"
	};
	if (run.code !== 0) return syncFailure(run, "push");
	const output = `${run.stdout}\n${run.stderr}`;
	return {
		ok: true,
		action: "push",
		summary: /Everything up[ -]to[ -]date/i.test(output) ? `Everything up to date with ${ref}` : `Pushed to ${ref}`
	};
}
/**
* Describe why a pull or a push was refused.
*
* The four cases worth separating are the ones the user can act on: a sandbox
* that forbids writing at all, a divergent history, a dirty working tree, and
* credentials the remote rejected. Everything else is Git's own first line,
* which is more specific than anything this half could invent.
*
* @param run - the failed invocation.
* @param action - which operation failed, for the message.
* @returns the payload the page renders.
*/
function syncFailure(run, action) {
	if (run.denied === true) return {
		ok: false,
		...coded$1(ACTION_REFUSAL[action].denied),
		reason: "denied",
		action
	};
	const text = diagnosticText(run);
	if (/could not read Username|Authentication failed|Permission denied \(publickey\)|no such identity|terminal prompts disabled/i.test(text)) return {
		ok: false,
		...coded$1("auth"),
		reason: "auth",
		action
	};
	if (/local changes|would be overwritten|commit your changes or stash/i.test(text)) return {
		ok: false,
		...coded$1(ACTION_REFUSAL[action].dirty),
		reason: "dirty",
		action
	};
	if (action === "pull" && /Not possible to fast-forward|diverging branches|divergent branches/i.test(text)) return {
		ok: false,
		...coded$1("pull-diverged"),
		reason: "diverged",
		action
	};
	if (action === "push" && /non-fast-forward|fetch first|behind its remote|\[rejected\]/i.test(text)) return {
		ok: false,
		...coded$1("push-behind"),
		reason: "diverged",
		action
	};
	return {
		ok: false,
		...refusalOf(run),
		reason: "error",
		action
	};
}
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
async function commitAll(target, message) {
	const repo = await resolveRepo(target);
	if ("refusal" in repo) return {
		ok: false,
		...repo.refusal,
		reason: repo.reason
	};
	const root = inDir(target, repo.root);
	const status = await runGit(root, [
		"status",
		"--porcelain=v1",
		"-z",
		"--untracked-files=all"
	]);
	if (status.code !== 0) return {
		ok: false,
		...refusalOf(status),
		reason: "error"
	};
	const files = parseStatus(status.stdout).files;
	if (files.length === 0) return emptyCommit();
	if (files.some((file) => file.conflicted)) return conflictedCommit();
	const add = await runGit(root, ["add", "-A"]);
	if (add.failure !== void 0) return {
		ok: false,
		error: add.failure,
		reason: "error"
	};
	if (add.code !== 0) return commitFailure(add);
	const commit = await runGit(root, [
		"commit",
		"-m",
		message
	]);
	if (commit.failure !== void 0) return {
		ok: false,
		error: commit.failure,
		reason: "error"
	};
	if (commit.code !== 0) return commitFailure(commit);
	const made = await runGit(root, [
		"log",
		"-1",
		`--pretty=format:${LOG_FORMAT}`
	]);
	if (made.code !== 0) return { ok: true };
	const summary = parseSummary(made.stdout.split(FIELD));
	return summary === void 0 ? { ok: true } : {
		ok: true,
		commit: summary
	};
}
/** The answer for a tree that holds nothing to commit. */
function emptyCommit() {
	return {
		ok: false,
		...coded$1("commit-clean"),
		reason: "clean"
	};
}
/** The answer for a tree whose merge is not finished. */
function conflictedCommit() {
	return {
		ok: false,
		...coded$1("commit-conflict"),
		reason: "conflict"
	};
}
/**
* Describe why staging or the commit itself was refused.
*
* The sandbox is the refusal the user can act on: under a `read-only` mode Git
* never ran at all, and the seam is what says so. The other two cases worth
* separating are races against the read above — a merge that was aborted after
* it, and a tree another process emptied — which that reading already knows how
* to name. Everything else, a refusing hook and a signing failure among them, is
* Git's own first line, which is more specific than anything this half could
* invent.
*
* @param run - the failed invocation.
* @returns the payload the page renders.
*/
function commitFailure(run) {
	if (run.denied === true) return {
		ok: false,
		...coded$1("commit-denied"),
		reason: "denied"
	};
	const text = diagnosticText(run);
	if (/unmerged|merging is not possible|you have unmerged files/i.test(text)) return conflictedCommit();
	if (/nothing to commit|nothing added to commit|no changes added to commit/i.test(text)) return emptyCommit();
	return {
		ok: false,
		...refusalOf(run),
		reason: "error"
	};
}
/**
* Build one commit summary from a split formatted record.
*
* @param fields - the record split on the unit separator.
* @returns the summary, or undefined when the record is too short to trust.
*/
function parseSummary(fields) {
	const [hash, short, author, email, date, parents, refs, subject] = fields;
	if (hash === void 0 || hash === "") return void 0;
	return {
		hash,
		short: short ?? "",
		author: author ?? "",
		email: email ?? "",
		date: date ?? "",
		subject: subject ?? "",
		refs: (refs ?? "").split(",").map((ref) => ref.trim()).filter((ref) => ref !== ""),
		parents: (parents ?? "").split(" ").filter((parent) => parent !== "")
	};
}
/**
* Clamp a caller-supplied history depth into the accepted range.
*
* @param limit - the requested depth.
* @returns a positive integer no greater than {@link MAX_LOG_LIMIT}.
*/
function clampLimit(limit) {
	if (!Number.isFinite(limit)) return 60;
	return Math.min(300, Math.max(1, Math.trunc(limit)));
}
//#endregion
//#region src/host/workspace.ts
/**
* Find the Workspace that owns this request's session, or its directory.
*
* @param ctx - the Host plugin context.
* @param sessionId - the session the page belongs to, when it named one.
* @param directory - the directory Git ran in, as a fallback identity.
* @returns the Workspace, or undefined when none can be named.
*/
async function resolveWorkspace(ctx, sessionId, directory) {
	const registry = ctx.get("workspaceRegistry");
	if (registry === void 0) return void 0;
	if (typeof sessionId === "string" && sessionId !== "") {
		const owner = bySession(registry, sessionId);
		if (owner !== void 0) return owner;
	}
	try {
		const resolved = await registry.resolveByPath(directory);
		if (resolved !== void 0) return {
			title: resolved.title,
			path: resolved.path
		};
	} catch {}
}
/**
* Find the Workspace whose session account contains this id.
*
* @param registry - the Workspace registry service.
* @param sessionId - the session to look up.
* @returns the Workspace, or undefined when no account lists the session.
*/
function bySession(registry, sessionId) {
	try {
		for (const workspace of registry.list()) {
			if (!Array.isArray(workspace?.sessionIds)) continue;
			if (!workspace.sessionIds.includes(sessionId)) continue;
			if (typeof workspace.title !== "string" || typeof workspace.path !== "string") continue;
			return {
				title: workspace.title,
				path: workspace.path
			};
		}
	} catch {}
}
//#endregion
//#region src/host/routes.ts
/** Route table, kept in one place so the two halves cannot drift. */
const ROUTES = {
	status: "/dsh-cool-git/api/status",
	log: "/dsh-cool-git/api/log",
	diff: "/dsh-cool-git/api/diff",
	commit: "/dsh-cool-git/api/commit",
	commitAll: "/dsh-cool-git/api/commit-all",
	branches: "/dsh-cool-git/api/branches",
	checkout: "/dsh-cool-git/api/checkout",
	pull: "/dsh-cool-git/api/pull",
	push: "/dsh-cool-git/api/push"
};
/** Object names Git accepts, and all a route will pass on to the command line. */
const OBJECT_NAME = /^[0-9a-f]{4,40}$/i;
/**
* One coded refusal, shaped as a payload carries it.
*
* @param code - the refusal, whose sentence the page owns.
* @returns the payload fragment to spread into an `ok: false` answer.
*/
function coded(code) {
	return { failure: { code } };
}
/**
* Longest commit message a route hands to Git.
*
* A message is free-form text and Git itself bounds nothing here, so the bound
* is this route's: a request body is not a place to put a file.
*/
const MAX_MESSAGE_LENGTH = 1e4;
function sendJson(res, status, body) {
	res.writeHead(status, {
		"content-type": "application/json; charset=utf-8",
		"cache-control": "no-store"
	});
	res.end(JSON.stringify(body));
}
/**
* Answer 405 unless the request uses one of the allowed methods.
*
* @returns true when the handler may proceed.
*/
function methodAllowed(req, res, allowed) {
	if (allowed.includes(req.method)) return true;
	sendJson(res, 405, {
		ok: false,
		error: "method not allowed"
	});
	return false;
}
async function readBody(req) {
	const chunks = [];
	for await (const chunk of req) chunks.push(Buffer.from(chunk));
	const text = Buffer.concat(chunks).toString("utf8");
	if (text === "") return {};
	const parsed = JSON.parse(text);
	if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("body must be a JSON object");
	return parsed;
}
/**
* Reject a cross-site request.
*
* These routes reach a repository the session owns — and four of them change it
* — so a page on another origin has no business asking. A same-origin `fetch`
* omits `Origin` on some requests, so an absent header is allowed.
*/
function sameOrigin(req) {
	const origin = req.headers?.origin;
	if (typeof origin !== "string" || origin === "" || origin === "null") return true;
	const host = req.headers?.host;
	if (typeof host !== "string" || host === "") return false;
	try {
		return new URL(origin).host === host;
	} catch {
		return false;
	}
}
/**
* The directory and file policy of a session the Host already holds in store.
*
* @param ctx - the Host plugin context.
* @param sessionId - the session the page belongs to.
* @returns the live target, or undefined when no live session has that id.
*/
function liveTarget(ctx, sessionId) {
	const sessions = ctx.get("sessions");
	if (sessions === void 0) return void 0;
	try {
		const session = sessions.get(sessionId);
		const cwd = session?.header?.cwd;
		if (session === void 0 || typeof cwd !== "string" || cwd === "") return void 0;
		const sandboxPolicy = filePolicyFor(ctx, session);
		return {
			workdir: cwd,
			...sandboxPolicy === void 0 ? {} : { sandboxPolicy }
		};
	} catch {
		return;
	}
}
/**
* The directory a session that is not live yet still owns.
*
* The header of a session is durable from the moment the session is created, so
* the directory Git must run in is knowable before anything resumes it. That is
* exactly the state a reopened page meets its own tab in: the shell renders a
* restored View from the session catalog while the session's history stream is
* still opening, so the page's first read arrives before `sessions.get` answers
* anything — and an answer taken from the executor's default directory would name
* a repository that is not this session's.
*
* `sessionController.inspect` is the Host's own attached-or-persisted read: it
* returns the persisted header without activating an Agent, so nothing is resumed
* on behalf of a page that is only asking where the repository is. It is optional
* — a composition without it keeps the executor's default directory — and a
* failed read (an archived, foreign, or unreadable id) is not this route's answer
* to give.
*
* @param ctx - the Host plugin context.
* @param sessionId - the session the page belongs to.
* @returns the session's own directory, or undefined when it cannot be read.
*/
async function persistedWorkdir(ctx, sessionId) {
	const controller = ctx.get("sessionController");
	if (controller === void 0 || typeof controller.inspect !== "function") return void 0;
	try {
		const cwd = (await controller.inspect(sessionId))?.meta?.cwd;
		return typeof cwd === "string" && cwd !== "" ? cwd : void 0;
	} catch {
		return;
	}
}
/**
* Find the directory this request's Git commands must run in.
*
* The session's own header is the only source — live if the Host holds the
* session, durable if it does not yet, and never a directory the page named. A
* session the Host cannot read at all (an archived or foreign id) falls back to
* the executor's default directory, which is at least a directory that exists.
*
* A cold session has no resolved file policy, because the policy folds the
* session's own live log. Only a reading route may therefore run in a directory
* taken from the durable header: a route that writes waits for the session
* itself rather than borrowing the deployment's mode and root for a repository
* that is not the one the deployment describes.
*
* @param ctx - the Host plugin context.
* @param sessionId - the session the page belongs to, if it named one.
* @param effect - whether this request may change the repository.
* @returns the directory and the session's file policy, or the reason there is none.
*/
async function resolveTarget(ctx, sessionId, effect) {
	if (typeof sessionId === "string" && sessionId !== "") {
		const live = liveTarget(ctx, sessionId);
		if (live !== void 0) return live;
		const persisted = await persistedWorkdir(ctx, sessionId);
		if (persisted !== void 0) return effect === "write" ? coded("not-ready") : { workdir: persisted };
	}
	const shell = ctx.get("shell");
	if (shell !== void 0) try {
		const spec = shell.resolve({ command: "pwd" });
		if (typeof spec?.workdir === "string" && spec.workdir !== "") return { workdir: spec.workdir };
	} catch {}
	return coded("no-workdir");
}
/**
* The calling session's resolved file policy, when the mounted executor confines.
*
* `shell.sandboxMode` is how a confining executor advertises itself; a local,
* unconfined one answers `undefined` and takes no policy. The policy is what
* makes a write route inherit the session's own mode and workspace root instead
* of the deployment's fallback — without it a `workspace-write` session would be
* refused the checkout, pull or push it is allowed to run.
*
* @param ctx - the Host plugin context.
* @param session - the live session the request named.
* @returns the policy, or undefined when there is nothing to confine.
*/
function filePolicyFor(ctx, session) {
	if (ctx.get("shell")?.sandboxMode === void 0) return void 0;
	const policy = ctx.get("sandboxPolicy");
	if (policy === void 0 || typeof policy.resolve !== "function") return void 0;
	return policy.resolve({ session });
}
/** The `shell` capability, or the reason Git cannot run at all. */
function resolveShell(ctx) {
	const shell = ctx.get("shell");
	if (shell === void 0 || typeof shell.execute !== "function") return coded("no-shell");
	return { shell };
}
/**
* Run one JSON route body against Git.
*
* Every route repeats the same four steps — method, body, target, shell — so
* they are taken once here and the route only supplies its own arguments. A
* malformed body is a 400; everything later is a 200 carrying `ok: false`,
* because Git's own refusals are answers the page should show, not HTTP errors.
*
* @param ctx - the Host plugin context.
* @param req - the incoming request.
* @param res - the response to write.
* @param effect - whether this route may change the repository.
* @param run - the route's own work, given the parsed body and resolved target.
*/
async function handle(ctx, req, res, effect, run) {
	if (!methodAllowed(req, res, ["POST"])) return;
	let body;
	try {
		body = await readBody(req);
	} catch (error) {
		sendJson(res, 400, {
			ok: false,
			error: error instanceof Error ? error.message : String(error)
		});
		return;
	}
	const resolved = await resolveTarget(ctx, body.sessionId, effect);
	if (!("workdir" in resolved)) {
		sendJson(res, 200, {
			ok: false,
			...resolved
		});
		return;
	}
	const capability = resolveShell(ctx);
	if (!("shell" in capability)) {
		sendJson(res, 200, {
			ok: false,
			...capability
		});
		return;
	}
	const target = {
		shell: capability.shell,
		workdir: resolved.workdir,
		...resolved.sandboxPolicy === void 0 ? {} : { sandboxPolicy: resolved.sandboxPolicy }
	};
	try {
		sendJson(res, 200, await run(body, target));
	} catch (error) {
		sendJson(res, 200, {
			ok: false,
			error: error instanceof Error ? error.message : String(error)
		});
	}
}
/**
* Read one request's changed-path argument.
*
* NUL is the one byte that cannot survive the shell line the seam runs, so a
* path carrying one is refused rather than silently truncated.
*
* @param body - the parsed request body.
* @returns the path, or undefined when the body does not name a usable one.
*/
function readPath(body) {
	const path = body.path;
	if (typeof path !== "string" || path === "" || path.includes("\0")) return void 0;
	return path;
}
/**
* Read one request's commit argument.
*
* @param body - the parsed request body.
* @returns the object name, or undefined when it is not a plain hex name.
*/
function readHash(body) {
	const hash = body.hash;
	if (typeof hash !== "string" || !OBJECT_NAME.test(hash)) return void 0;
	return hash;
}
/**
* Read one request's branch argument.
*
* The shape checked here is only about what can be handed to the shell at all;
* whether the branch exists is Git's answer, not this half's.
*
* @param body - the parsed request body.
* @returns the branch name, or undefined when the body names none.
*/
function readBranch(body) {
	const branch = body.branch;
	if (typeof branch !== "string" || branch === "" || branch.length > 255) return void 0;
	if (branch.includes("\0") || branch.startsWith("-")) return void 0;
	return branch;
}
/**
* Read one request's commit message.
*
* A message is free-form text, so nothing about its content is checked; the two
* shapes refused are the ones no command line and no commit can carry — a NUL
* byte, and a message that is empty once trimmed, which Git itself rejects. The
* form's own button is disabled on an empty field, so this is the guard behind
* that rather than the answer the user meets.
*
* @param body - the parsed request body.
* @returns the trimmed message, or undefined when it is not one.
*/
function readMessage(body) {
	const message = body.message;
	if (typeof message !== "string" || message.includes("\0")) return void 0;
	const trimmed = message.trim();
	if (trimmed === "" || trimmed.length > MAX_MESSAGE_LENGTH) return void 0;
	return trimmed;
}
/**
* Serve every Git route for one plugin instance.
*
* @param ctx - the Host plugin context.
* @returns a disposer that unregisters exactly these routes.
*/
function registerRoutes(ctx) {
	const guard = (handler) => (req, res) => {
		if (!sameOrigin(req)) {
			sendJson(res, 403, {
				ok: false,
				error: "cross-origin request refused"
			});
			return;
		}
		return handler(req, res);
	};
	const route = (path, handler) => ctx.webServer.register({
		kind: "exact",
		path,
		handler: guard(handler)
	});
	const disposers = [
		route(ROUTES.status, (req, res) => handle(ctx, req, res, "read", async (body, target) => {
			const status = await readStatus(target);
			if (status.ok !== true || status.root === void 0) return status;
			const workspace = await resolveWorkspace(ctx, body.sessionId, status.root);
			return workspace === void 0 ? status : {
				...status,
				workspace
			};
		})),
		route(ROUTES.log, (req, res) => handle(ctx, req, res, "read", (body, target) => readLog(target, typeof body.limit === "number" ? body.limit : 60))),
		route(ROUTES.diff, (req, res) => handle(ctx, req, res, "read", (body, target) => {
			const path = readPath(body);
			if (path === void 0) return Promise.resolve({
				ok: false,
				...coded("missing-path")
			});
			return readDiff(target, {
				path,
				staged: body.staged === true,
				untracked: body.untracked === true
			});
		})),
		route(ROUTES.commit, (req, res) => handle(ctx, req, res, "read", (body, target) => {
			const hash = readHash(body);
			if (hash === void 0) return Promise.resolve({
				ok: false,
				...coded("bad-hash")
			});
			return readCommit(target, hash);
		})),
		route(ROUTES.branches, (req, res) => handle(ctx, req, res, "read", (_body, target) => readBranches(target))),
		route(ROUTES.commitAll, (req, res) => handle(ctx, req, res, "write", (body, target) => {
			const message = readMessage(body);
			if (message === void 0) return Promise.resolve({
				ok: false,
				...coded("missing-message")
			});
			return commitAll(target, message);
		})),
		route(ROUTES.checkout, (req, res) => handle(ctx, req, res, "write", (body, target) => {
			const branch = readBranch(body);
			if (branch === void 0) return Promise.resolve({
				ok: false,
				...coded("missing-branch")
			});
			return switchBranch(target, branch);
		})),
		route(ROUTES.pull, (req, res) => handle(ctx, req, res, "write", (_body, target) => pullFromRemote(target))),
		route(ROUTES.push, (req, res) => handle(ctx, req, res, "write", (_body, target) => pushToRemote(target)))
	];
	return () => {
		for (const dispose of disposers) dispose();
	};
}
//#endregion
//#region src/host/index.ts
/**
* Host entry for dsh-cool-git.
*
* The browser half owns the Git tab's rendering; this half owns the repository.
* Every question the page asks — which paths changed, what one path's patch is,
* which commits exist, what one commit contains — crosses a same-origin HTTP
* route served by the `webServer` carrier, because an out-of-tree bundle cannot
* generate a `ctx.remote` namespace and its Client half never sees the Host
* Cordis context.
*
* The `shell` and `sandboxPolicy` capabilities are read per request rather than
* declared as hard dependencies: a composition without them still loads the
* plugin and answers one clear error line instead of failing to mount the tab,
* and a request resolves the calling session's own file policy so a write route
* runs under it rather than under the deployment's fallback.
*/
const name = "dsh-cool-git";
/** The web carrier is a hard dependency: without it there is no route to serve. */
const inject = ["webServer"];
function apply(ctx) {
	ctx.effect(() => registerRoutes(ctx), "dsh-cool-git: git routes");
}
//#endregion
export { ROUTES, apply, inject, name };
