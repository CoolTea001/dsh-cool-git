import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
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
//#region src/host/refusal.ts
/**
* One coded refusal, shaped as a payload carries it.
*
* @param code - the refusal, whose sentence the page owns.
* @param params - the values that sentence interpolates, when it has any.
* @returns the payload fragment to spread into an `ok: false` answer.
*/
function coded(code, params) {
	return { failure: params === void 0 ? { code } : {
		code,
		params
	} };
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
* Reading is the bulk of this module. Six commands change something — the
* branch switch, the merge, the fetch, the fast-forward pull, the push, and the
* commit — and each reports a sandbox refusal as such rather than as a Git
* error, because under a `read-only` mode that refusal is the whole answer. The
* commit is the one that writes the index as well as the history, which is why
* it is a single call rather than a stage the page could leave half-finished.
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
/** Wall-clock bound per Git invocation; a hung command is killed, not waited on. */
const GIT_TIMEOUT_MS = 2e4;
/**
* The exit code Git uses for its own fatal refusals.
*
* `git rev-parse --show-toplevel` outside a repository is one of them, and it is
* the answer `resolveRepo` reads as "this directory has no repository". A
* command that never reached Git — no `git` on `PATH`, a sandbox denial, a shell
* that could not parse the line — exits with something else on POSIX, so the
* code is how the two are told apart there.
*/
const GIT_FATAL_EXIT = 128;
/**
* What Git prints when the directory has no repository at all.
*
* The text is also needed on Windows: a PowerShell 5.1 executor reports every
* failed native command as exit 1 (`$LASTEXITCODE` is not propagated; PowerShell
* 7 does), so the code alone cannot tell Git's fatal answer from a shell that
* never ran Git there.
*/
const NOT_A_REPO = /not a git repository/i;
/**
* Wall-clock bound for the two invocations that cross the network.
*
* A fetch or a push legitimately takes longer than a local read — a slow remote
* or a large pack is not a hung command — so the local bound would kill a
* transfer that was still making progress.
*/
const GIT_NETWORK_TIMEOUT_MS = 18e4;
/**
* Wall-clock bound for one credential helper's answer.
*
* A helper that reads a store answers at once; the bound is here so a helper
* that decides to wait for an interactive sign-in cannot hold the page.
*/
const CREDENTIAL_TIMEOUT_MS = 3e4;
/** Largest patch the Host collects; beyond this the answer is flagged truncated. */
const MAX_STDOUT_BYTES = 4 * 1024 * 1024;
/** Upper bound on commits per request, so one call cannot walk a whole history. */
const MAX_LOG_LIMIT = 300;
/** Upper bound on branches returned, so a huge ref list cannot flood the menu. */
const MAX_BRANCHES = 200;
/**
* What Git prints when it refuses to touch a working tree that is not clean.
*
* `checkout`, `pull` and `push` each word the refusal their own way, and the page
* has one sentence per action for it, so the three spellings are one pattern.
*/
const DIRTY_WORKTREE = /local changes|would be overwritten|commit your changes or stash/i;
/**
* What Git prints when a merge could not be applied cleanly.
*
* A conflict is a state on disk rather than a mistake in the request, and it is
* the one merge answer the page words itself: the merge is aborted (see
* `mergeBranch`), so the sentence has to say both that it failed and that
* nothing was left behind. `git merge` prints one `CONFLICT` line per path and
* then a summary sentence; the summary alone is enough to recognize it.
*/
const MERGE_CONFLICT = /CONFLICT|Automatic merge failed|fix conflicts/i;
/**
* What an older Git prints when it has no `switch` subcommand.
*
* `git switch` arrived in 2.23, and the same intent is spelled `checkout` on
* anything older; the retry is what keeps those installations working.
*/
const NO_SWITCH = /switch.*(?:is not a git command|unknown)|unknown (?:option|subcommand)/i;
/**
* What Git prints when it has no author or committer identity to record.
*
* Modern Git refuses to guess one from the account and host name, so every
* commit fails until `user.name` and `user.email` are configured. The first
* line alone says only "Author identity unknown", which is why the page words
* this state itself instead of passing that sentence through.
*/
const MISSING_IDENTITY = /Author identity unknown|Committer identity unknown|Please tell me who you are|unable to auto-detect email address/i;
/**
* What Git prints when the credential helper itself could not start.
*
* Git for Windows runs every credential helper through its bundled MSYS `sh`,
* and a confined sandbox can deny that runtime the pipe it creates at startup —
* the helper then never reads the saved credential, and Git falls back to a
* terminal prompt this plugin has disabled. That is a different failure from a
* remote that rejected a credential, and the page words it differently.
*/
const CREDENTIAL_HELPER_UNAVAILABLE = /couldn't create signal pipe|failed to execute prompt script|unable to start the credential helper/i;
/**
* What Git prints when the remote refused the credentials this machine holds.
*
* Each transport words it differently — HTTPS asks for a username a
* non-interactive session cannot supply, SSH names the key it could not use —
* and every one of them is the same authentication failure to the page, which
* never prompts for credentials of its own.
*/
const AUTH_FAILURE = new RegExp([
	"could not read Username",
	"Authentication failed",
	"Permission denied \\(publickey\\)",
	"no such identity",
	"terminal prompts disabled"
].join("|"), "i");
/**
* What Git prints when the branch being created is already there.
*
* The name is checked before Git is asked, so this is the race the check cannot
* close rather than the ordinary answer; it is worded anyway, because a race
* that surfaces `fatal:` in a dialog that had a sentence ready is the kind of
* gap this half exists to avoid.
*/
const BRANCH_EXISTS = /already exists/i;
/**
* What Git prints when it will not delete a branch for want of a merge.
*
* This is the one refusal the delete dialog's marks predict, so it is the one
* the page words itself: Git's own sentence ends in a `-D` hint, and this plugin
* has no force to offer — restating it is what keeps the page from advertising a
* command it will not run.
*/
const BRANCH_NOT_MERGED = /not fully merged/i;
/**
* What Git prints when a worktree is standing on the branch being deleted.
*
* The current branch and a branch checked out in another worktree are the same
* answer from Git and the same fact to the reader: this branch is in use. The
* page tells them apart by which row it disabled, not by which sentence it got.
*/
const BRANCH_IN_USE = /used by worktree|cannot delete branch/i;
/**
* What Git prints when the ref a delete named is not on the remote.
*
* A branch someone else already deleted is the ordinary reason a delete fails
* after a fetch: the dialog was drawn from a list that was true when it opened.
*/
const REMOTE_REF_MISSING = /remote ref does not exist|unable to delete/i;
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
* Which domain the shell service in this composition speaks.
*
* The PowerShell executor publishes the `pwshPath` it resolved (see
* `@deepseek-ai/dsh-pwsh-local`), so its presence is the executor's own answer
* to this question — the seam itself carries no platform fact. A provider that
* announces nothing falls back to the host platform, which is where every
* shipped executor runs; the POSIX providers were the only ones before Windows
* had a counterpart.
*
* @param shell - the `shell` capability service.
* @returns the parser that will read this plugin's command strings.
*/
function shellFlavor(shell) {
	if (typeof shell?.pwshPath === "string") return "powershell";
	return process.platform === "win32" ? "powershell" : "posix";
}
/**
* Quote one value for the shell line the seam runs.
*
* Every argument that is not a literal this module wrote must survive as a
* single word, and both parsers take a single-quoted word literally — no
* expansion, no backslash processing — so the only character that can end such
* a word is a single quote itself. Each domain closes and reopens that word its
* own way: POSIX escapes the quote outside the word, PowerShell doubles it
* inside.
*
* @param value - the raw argument.
* @param flavor - the parser that will read the line.
* @returns a single quoted shell word.
*/
function quote(value, flavor) {
	if (flavor === "powershell") return `'${value.replace(/'/g, "''")}'`;
	return `'${value.replace(/'/g, `'\\''`)}'`;
}
/**
* Build one shell line from literal words, quoted for the parser that reads it.
*
* @param words - the executable and its arguments, unquoted.
* @param flavor - the parser that will read the line.
* @returns the command string handed to `shell.resolve`.
*/
function shellCommand(words, flavor) {
	const quoted = words.map((word) => quote(word, flavor));
	return flavor === "powershell" ? `& ${quoted.join(" ")}` : quoted.join(" ");
}
/**
* Build the full command line for one Git invocation.
*
* @param args - the subcommand and its arguments, each quoted individually.
* @param flavor - the parser that will read the line.
* @returns the command string handed to `shell.resolve`.
*/
function command(args, flavor) {
	return shellCommand([
		"git",
		"--no-pager",
		"-c",
		"core.quotePath=false",
		...args
	], flavor);
}
function messageOf(error) {
	return error instanceof Error ? error.message : String(error);
}
/**
* Run one command line through the shell seam and collect its result.
*
* @param target - the shell seam, the directory, and the file policy to run under.
* @param line - the full shell line, already quoted.
* @param options - the bound, standard input, and environment for it.
* @returns the invocation's outcome; never rejects.
*/
async function invoke(target, line, options = {}) {
	const { shell, sandboxPolicy } = target;
	const request = {
		command: line,
		workdir: target.workdir,
		timeoutMs: options.timeoutMs ?? GIT_TIMEOUT_MS,
		onExpiry: "kill",
		stdoutMaxBytes: MAX_STDOUT_BYTES,
		env: {
			...GIT_ENV,
			...options.env
		},
		...sandboxPolicy === void 0 ? {} : { sandboxPolicy },
		...options.stdin === void 0 ? {} : { stdin: options.stdin }
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
/**
* Run one Git command and collect its result.
*
* @param target - the shell seam, the directory, and the file policy to run under.
* @param args - subcommand and arguments, before quoting.
* @param acceptCodes - exit codes that are a normal answer rather than a failure.
* @param timeoutMs - wall-clock bound; the network commands raise it.
* @param stdin - text handed to the command on its standard input, for the one
*   argument that is free text rather than a name.
* @param env - extra environment on top of the Git defaults.
* @returns the invocation's outcome; never rejects.
*/
async function runGit(target, args, acceptCodes = [0], timeoutMs = GIT_TIMEOUT_MS, stdin, env) {
	return invoke(target, command(args, shellFlavor(target.shell)), {
		timeoutMs,
		stdin,
		env
	});
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
	if (run.denied === true) return coded("git-denied");
	const text = diagnosticText(run);
	if (text === "") return coded("git-exit", { code: run.code ?? "null" });
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
	if (top.code !== 0) {
		const noRepo = top.code === GIT_FATAL_EXIT || NOT_A_REPO.test(diagnosticText(top));
		return {
			refusal: refusalOf(top),
			reason: noRepo ? "no-repo" : "error"
		};
	}
	const root = top.stdout.trim();
	if (root === "") return {
		refusal: coded("no-root"),
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
* Resolve the repository root alone, without reading its status or history.
*
* The Settings routes need the repository's identity and nothing else: the
* Workspace key is a directory, and a settings dialog that paid for a full
* `git status` just to learn where it is would be slower than the request it
* is about to make. This is the same `rev-parse` every other route starts
* with, so the root it names is the same root they use.
*
* @param target - the shell seam, the session's directory, and the file policy.
* @returns the root, or the coded refusal and its reason.
*/
async function readRepositoryRoot(target) {
	const repo = await resolveRepo(target);
	if ("refusal" in repo) return {
		refusal: repo.refusal,
		reason: repo.reason
	};
	return { root: repo.root };
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
		...coded("no-commits"),
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
		...coded("unparsable-commit"),
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
* the last commit in one patch — which is what the row's own "show this file's
* changes" means. An untracked path has no HEAD side at all, so it is diffed
* against `/dev/null`; a repository without commits compares against the index
* or the worktree, whichever side the row says holds the change.
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
* Largest tracked patch the message prompt carries, in characters.
*
* The prompt is one model request, so the patch inside it is bounded here rather
* than by the read: `runGit`'s own bound is four megabytes, which is a fine
* answer for a pane to scroll and far too much to put in a prompt beside a file
* list and a set of previews.
*/
const MAX_DIGEST_PATCH_CHARS = 12e4;
/**
* Largest preview one untracked path contributes to the prompt.
*
* A patch of an untracked path is its whole content, so without this a single
* new lockfile could fill the request; the size line `--stat` prints outside the
* cap is what still tells the model the file is large.
*/
const MAX_PREVIEW_CHARS = 12e3;
/** Total preview budget across every untracked path. */
const MAX_PREVIEW_TOTAL_CHARS = 48e3;
/** How many untracked paths' contents the prompt describes. */
const MAX_PREVIEW_FILES = 20;
/**
* How many recent commit messages the prompt reads as its style sample.
*
* The generator writes in the style this repository already commits in, and the
* sample is the evidence for that style: ten messages are enough for a pattern —
* a tag, a language, a body — to show, and few enough to stay a footnote beside
* the patch.
*/
const STYLE_SAMPLE_COMMITS = 10;
/**
* Longest one sampled message may be, in characters.
*
* A message is a subject and usually a few lines; the bound is here so that one
* enormous body — a squashed release note, a template nobody trimmed — cannot
* crowd the diff out of the request. A message over the bound is stored cut and
* marked as such, because half a message otherwise reads as all of it.
*/
const MAX_SAMPLE_MESSAGE_CHARS = 400;
/**
* Run the one diff that covers every tracked change.
*
* `git diff HEAD` is the whole of it when the branch has a commit: index and
* worktree are both compared against HEAD, so a staged edit and a further
* unstaged one appear under the path they belong to. An unborn branch has no
* HEAD to compare against, so the staged half is asked for by name — the index
* against the empty tree — and the unstaged half follows; the two are
* concatenated rather than merged because both are already in the same format
* and neither can name a path the other does not.
*
* @param root - the repository root, with the session's file policy.
* @param hasHead - HEAD resolves to a commit.
* @param format - the diff's own switches, e.g. `--stat`.
* @returns the invocation's outcome; never rejects.
*/
async function runTrackedDiff(root, hasHead, format) {
	const base = [
		"-M",
		"--no-color",
		"--no-ext-diff",
		...format
	];
	if (hasHead) return runGit(root, [
		"diff",
		"HEAD",
		...base
	]);
	const staged = await runGit(root, [
		"diff",
		"--cached",
		...base
	]);
	if (staged.code !== 0) return staged;
	const unstaged = await runGit(root, ["diff", ...base]);
	if (unstaged.code !== 0) return unstaged;
	return {
		...staged,
		stdout: staged.stdout + unstaged.stdout,
		truncated: staged.truncated || unstaged.truncated
	};
}
/**
* Cut one block of Git's output at a character bound, on a line boundary.
*
* A block cut mid-line would hand the model half a hunk header or half a line of
* code, which reads as a change that is not there; cutting at the last newline
* inside the bound leaves whole lines only, and the flag is what tells the model
* the picture is incomplete.
*
* @param text - the text as Git printed it.
* @param limit - the most characters the caller may carry.
* @returns the text to carry, and whether anything was dropped.
*/
function cutAtLine(text, limit) {
	if (text.length <= limit) return {
		text,
		truncated: false
	};
	const head = text.slice(0, limit);
	const lastBreak = head.lastIndexOf("\n");
	return {
		text: lastBreak < 0 ? head : head.slice(0, lastBreak + 1),
		truncated: true
	};
}
/**
* Read every untracked path's content, each against `/dev/null`.
*
* `--no-index` is the one place Git compares two paths instead of a path against
* a tree, which is the only way an untracked file's content is reachable at all:
* it is in no tree, so no `diff HEAD` can name it. Exit code 1 is the normal
* answer here — the two sides always differ, an empty file included — and the
* `--stat` line is asked for in the same invocation as the patch, because it is
* where a binary file's size appears and a second command would only repeat the
* same walk.
*
* A path whose read fails is left out of the previews: it stays on the list the
* prompt opens with, because `git status` named it, and the alternative — one
* unreadable file failing the whole request — would take the message away over a
* file the model was only ever going to look at.
*
* @param root - the repository root, with the session's file policy.
* @param files - every changed path; the untracked ones are the subject here.
* @returns one bounded preview per untracked path, in status order.
*/
async function readUntrackedPreviews(root, files) {
	const previews = [];
	let budget = MAX_PREVIEW_TOTAL_CHARS;
	for (const file of files) {
		if (!file.untracked || previews.length >= MAX_PREVIEW_FILES || budget <= 0) continue;
		const run = await runGit(root, [
			"diff",
			"--no-index",
			"--stat",
			"-p",
			"--no-color",
			"--no-ext-diff",
			"--",
			"/dev/null",
			file.path
		], [0, 1]);
		if (run.code !== 0 && run.code !== 1) continue;
		if (run.stdout.trim() === "") continue;
		const cut = cutAtLine(run.stdout, Math.min(MAX_PREVIEW_CHARS, budget));
		budget -= cut.text.length;
		previews.push({
			path: file.path,
			text: cut.text,
			truncated: cut.truncated || run.truncated
		});
	}
	return previews;
}
/**
* Read this branch's recent commit messages, as the generator's style sample.
*
* `-z` is what makes one commit one record: a message is multi-line by nature, so
* the newline-separated default would need the format parsed back apart, while
* NUL cannot occur in a commit message and splits the records outright. Each
* record is cut to {@link MAX_SAMPLE_MESSAGE_CHARS} on a line boundary, by the
* same rule the patch is cut by.
*
* Nothing here is fatal: a branch with no commits, or a `log` that fails for any
* other reason, reads as no sample — the generator then falls back to the commit
* rules, which is a better answer than taking the message away over a style it
* could not read.
*
* @param root - the repository root, with the session's file policy.
* @param hasHead - HEAD resolves to a commit, so there is history to read.
* @returns the sampled messages, newest first.
*/
async function readRecentMessages(root, hasHead) {
	if (!hasHead) return [];
	const log = await runGit(root, [
		"log",
		`-n${STYLE_SAMPLE_COMMITS}`,
		"-z",
		"--pretty=format:%B"
	]);
	if (log.code !== 0) return [];
	return log.stdout.split("\0").map((message) => message.trim()).filter((message) => message !== "").map((message) => {
		const cut = cutAtLine(message, MAX_SAMPLE_MESSAGE_CHARS);
		return {
			text: cut.text.trim(),
			truncated: cut.truncated
		};
	}).filter((sample) => sample.text !== "");
}
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
async function readChangeDigest(target) {
	const repo = await resolveRepo(target);
	if ("refusal" in repo) return {
		ok: false,
		refusal: repo.refusal,
		reason: repo.reason
	};
	const root = inDir(target, repo.root);
	const status = await runGit(root, [
		"status",
		"--porcelain=v1",
		"-z",
		"--branch",
		"--untracked-files=all"
	]);
	if (status.code !== 0) return {
		ok: false,
		refusal: refusalOf(status),
		reason: "error"
	};
	const files = parseStatus(status.stdout).files;
	const recentMessages = await readRecentMessages(root, repo.hasHead);
	if (files.length === 0) return {
		ok: true,
		root: repo.root,
		files,
		stat: "",
		patch: "",
		patchTruncated: false,
		untracked: [],
		recentMessages
	};
	const stat = await runTrackedDiff(root, repo.hasHead, ["--stat"]);
	if (stat.code !== 0) return {
		ok: false,
		refusal: refusalOf(stat),
		reason: "error"
	};
	const diff = await runTrackedDiff(root, repo.hasHead, ["--unified=3"]);
	if (diff.code !== 0) return {
		ok: false,
		refusal: refusalOf(diff),
		reason: "error"
	};
	const patch = cutAtLine(diff.stdout, MAX_DIGEST_PATCH_CHARS);
	return {
		ok: true,
		root: repo.root,
		files,
		stat: stat.stdout.trim(),
		patch: patch.text,
		patchTruncated: patch.truncated || diff.truncated,
		untracked: await readUntrackedPreviews(root, files),
		recentMessages
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
		if (names.length === MAX_BRANCHES) {
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
async function switchBranch(target, name) {
	const repo = await resolveRepo(target);
	if ("refusal" in repo) return {
		ok: false,
		...repo.refusal,
		reason: repo.reason
	};
	const root = inDir(target, repo.root);
	if (await refExists(root, `refs/heads/${name}`)) return switchTo(root, ["switch", name], ["checkout", name], name);
	if (!await refExists(root, `refs/remotes/${name}`)) return {
		ok: false,
		...coded("unknown-branch", { name }),
		reason: "unknown-branch"
	};
	const local = await localNameForRemote(root, name);
	if (local === null) return {
		ok: false,
		...coded("remote-local-name", { name }),
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
* Run one switch and hand back the invocation itself.
*
* `git switch` arrived in 2.23; on an older Git the same intent is spelled with
* `checkout`, which differs in exactly one letter of one option (`-c` against
* `-b`), so the caller hands over both spellings rather than this helper
* translating an argument list it does not own.
*
* The raw run is returned rather than a payload because the caller words its own
* failure: a switch reads the refusal as a checkout, with the paths that are in
* the way and the sandbox's answer told apart from Git's.
*
* @param root - the repository root, with the session's file policy.
* @param attempt - the `switch` invocation, subcommand first.
* @param fallback - the same invocation for a Git without `switch`.
* @returns the invocation's outcome.
*/
async function runSwitch(root, attempt, fallback) {
	const run = await runGit(root, attempt);
	if (run.code !== 0 && NO_SWITCH.test(run.stderr)) return runGit(root, fallback);
	return run;
}
/**
* Run one switch and report it.
*
* @param root - the repository root, with the session's file policy.
* @param attempt - the `switch` invocation, subcommand first.
* @param fallback - the same invocation for a Git without `switch`.
* @param branch - the local branch this switch lands on.
* @returns the outcome, including the reason a switch was refused.
*/
async function switchTo(root, attempt, fallback, branch) {
	const run = await runSwitch(root, attempt, fallback);
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
	const split = splitRemote(await remotesOf(root), ref);
	return split === null ? null : split.branch;
}
/**
* The remote and the branch name one remote-tracking ref is made of.
*
* The remote names are the configured ones rather than a guess cut out of the
* ref: a remote may itself contain a slash, so the longest matching remote is
* the only correct answer, and no match means no configured remote owns the ref
* — a stale directory left by a removed remote — which the caller states rather
* than inventing a name.
*
* The split is resolved here rather than by the page because a local branch may
* itself be called `origin/main`: the two are only told apart by asking which
* remotes exist, and that is a question only this half can answer.
*
* @param remotes - the configured remote names.
* @param ref - the remote-tracking ref, e.g. `origin/feature/x`.
* @returns the remote and the branch on it, or null when no remote prefixes it.
*/
function splitRemote(remotes, ref) {
	let best = null;
	for (const remote of remotes) {
		if (!ref.startsWith(`${remote}/`)) continue;
		if (best === null || remote.length > best.length) best = remote;
	}
	if (best === null) return null;
	const branch = ref.slice(best.length + 1);
	return branch === "" ? null : {
		remote: best,
		branch
	};
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
		...coded("checkout-denied"),
		reason: "denied"
	};
	const dirty = dirtyRefusal(diagnosticText(run));
	if (dirty !== null) return {
		ok: false,
		...dirty,
		reason: "dirty"
	};
	return {
		ok: false,
		...refusalOf(run),
		reason: "error"
	};
}
/**
* The refusal a working tree in the way amounts to, when Git named the paths.
*
* The paths are what makes the message actionable, so they are lifted out of the
* block Git prints rather than left in a wall of advice the page would truncate
* away. They travel unsplit: the sentence is the page's, and a list joined for it
* here is the same list in either language.
*
* Shared with the branch this half starts, because Git refuses both the same way:
* creating a branch at another point is a switch with a ref made first, and a
* working tree in the way stops it in the same words.
*
* @param text - Git's own diagnosis of the failed invocation.
* @returns the coded refusal, or null when the tree was not what Git refused.
*/
function dirtyRefusal(text) {
	if (!DIRTY_WORKTREE.test(text)) return null;
	const paths = text.split("\n").map((line) => line.trim()).filter((line) => line !== "" && !/^(?:error|fatal|Please|Aborting|note:)/i.test(line) && !line.includes(" ")).slice(0, 5);
	return paths.length === 0 ? coded("checkout-dirty") : coded("checkout-dirty-paths", { paths: paths.join(", ") });
}
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
* is what keeps a name Git accepts — non-ASCII ones among them — from being
* refused by a rule that does not exist. The one check made here is the one Git
* cannot make cheaply: whether the name is already taken, which is a refusal the
* page words rather than a bare `fatal` from a race.
*
* Creating at another point is a switch, so a working tree in the way refuses it
* in the switch's own words, and the session's file policy is as load-bearing
* here as it is there.
*
* @param target - the shell seam, the session's directory, and the file policy.
* @param name - the local branch to create.
* @param start - the local or remote-tracking branch it starts at.
* @returns the outcome, including the reason the create was refused.
*/
async function createBranch(target, name, start) {
	const repo = await resolveRepo(target);
	if ("refusal" in repo) return {
		ok: false,
		...repo.refusal,
		reason: repo.reason
	};
	const root = inDir(target, repo.root);
	if (await refExists(root, `refs/heads/${name}`)) return {
		ok: false,
		...coded("branch-exists", { branch: name }),
		reason: "exists"
	};
	const base = await startRef(root, start);
	if (base === null) return {
		ok: false,
		...coded("unknown-branch", { name: start }),
		reason: "unknown-branch"
	};
	const run = await runSwitch(root, [
		"switch",
		"-c",
		name,
		base
	], [
		"checkout",
		"-b",
		name,
		base
	]);
	if (run.code !== 0) return createFailure(run, name);
	return {
		ok: true,
		branch: name
	};
}
/**
* The fully-qualified ref a new branch starts at, when the name resolves to one.
*
* Only a branch may be a starting point, local or remote-tracking: the dialog
* offers branches and nothing else, so a tag or a raw commit is not a name this
* half invents a meaning for. A remote-tracking start is what sets the new
* branch's upstream, which is Git's own answer to branching off `origin/main`.
*
* @param root - the repository root, with the session's file policy.
* @param name - the local or remote-tracking branch to start at.
* @returns the full ref, or null when no branch answers to the name.
*/
async function startRef(root, name) {
	if (await refExists(root, `refs/heads/${name}`)) return `refs/heads/${name}`;
	if (await refExists(root, `refs/remotes/${name}`)) return `refs/remotes/${name}`;
	return null;
}
/**
* Describe why starting a branch was refused.
*
* A dirty working tree is worded with the switch's own sentence — the operation
* is a switch, and the paths Git named are the same paths — while the other two
* cases are this operation's own: a name taken between the check and the call,
* and a session that may not write.
*
* @param run - the failed invocation.
* @param name - the branch the request was creating.
* @returns the payload the page renders.
*/
function createFailure(run, name) {
	if (run.denied === true) return {
		ok: false,
		...coded("create-denied"),
		reason: "denied"
	};
	const text = diagnosticText(run);
	const dirty = dirtyRefusal(text);
	if (dirty !== null) return {
		ok: false,
		...dirty,
		reason: "dirty"
	};
	if (BRANCH_EXISTS.test(text)) return {
		ok: false,
		...coded("branch-exists", { branch: name }),
		reason: "exists"
	};
	return {
		ok: false,
		...refusalOf(run),
		reason: "error"
	};
}
/**
* The fields one branch record is read from.
*
* `%(HEAD)` is what makes the current branch free: it is the same `*` the
* `branch` command draws, answered by the same walk that lists the refs, so the
* dialog never asks a second question to find out where it is. `%(symref)` is
* carried only to drop a remote's symbolic `HEAD`, which shortens to a bare
* remote name and is not a branch anyone can delete.
*/
const REF_RECORD_FORMAT = "%(refname:short)%00%(upstream:short)%00%(upstream:track)%00%(symref)%00%(HEAD)";
/**
* Read one ref namespace as records, cut at the page's own bound.
*
* @param root - the repository root, with the session's file policy.
* @param namespace - the ref namespace to read, e.g. `refs/heads/`.
* @returns the records, or why the read failed.
*/
async function readRefRecords(root, namespace) {
	const list = await runGit(root, [
		"for-each-ref",
		"--sort=-committerdate",
		`--count=201`,
		`--format=${REF_RECORD_FORMAT}`,
		namespace
	]);
	if (list.code !== 0) return {
		ok: false,
		refusal: refusalOf(list)
	};
	const records = [];
	let truncated = false;
	for (const line of list.stdout.split("\n")) {
		if (line === "") continue;
		const [name = "", upstream = "", track = "", symref = "", head = ""] = line.split("\0");
		if (symref !== "") continue;
		if (records.length === MAX_BRANCHES) {
			truncated = true;
			break;
		}
		records.push({
			name,
			upstream,
			track,
			current: head === "*"
		});
	}
	return {
		ok: true,
		records,
		truncated
	};
}
/**
* The branches in one namespace whose tip HEAD already reaches.
*
* This is half of `git branch -d`'s own rule — the other half is the branch's
* upstream — and it is asked as one walk rather than one `merge-base` per branch
* because the dialog's marks have to be drawn from a fixed number of calls.
*
* The answer is deliberately not cut at the list's own bound. A branch the page
* shows must be classified, and which branches a `--count` would keep depends on
* a sort that has nothing to do with which ones are merged, so a cut here would
* mark an arbitrary branch as unmerged. What comes back is one short name per
* line, which is the smallest answer this question has.
*
* @param root - the repository root, with the session's file policy.
* @param namespace - the ref namespace to walk, e.g. `refs/heads/`.
* @returns the merged names, or why the walk failed.
*/
async function mergedRefNames(root, namespace) {
	const list = await runGit(root, [
		"for-each-ref",
		"--merged=HEAD",
		"--format=%(refname:short)",
		namespace
	]);
	if (list.code !== 0) return {
		ok: false,
		refusal: refusalOf(list)
	};
	const names = list.stdout.split("\n").filter((name) => name !== "");
	return {
		ok: true,
		names: new Set(names)
	};
}
/**
* The verdict one branch's badge states.
*
* `git branch -d` deletes a branch whose tip HEAD reaches, and one whose tip its
* own upstream reaches; it refuses everything else. So the two safe answers are
* a branch merged into HEAD and a branch whose upstream is level with it, and the
* three unsafe ones are told apart by what the reader would have to do about it:
* a branch no copy of which exists anywhere (`unmerged`), one with commits only
* this checkout has (`unpushed`), and one whose upstream has been deleted, which
* looks exactly like a branch that was never pushed and is the mark most worth
* spelling out (`gone`).
*
* @param record - the branch's own record.
* @param merged - whether HEAD already reaches this branch's tip.
* @returns the mark the row carries.
*/
function safetyOf(record, merged) {
	if (merged) return "safe";
	if (record.upstream === "") return "unmerged";
	if (record.track.includes("gone")) return "gone";
	if (record.track.includes("ahead")) return "unpushed";
	return "safe";
}
/**
* The counts Git's own tracking note is made of.
*
* @param track - Git's `[ahead 1, behind 2]` note, possibly empty.
* @returns the counts it named, each absent when Git did not name it.
*/
function aheadBehindOf(track) {
	const ahead = /ahead (\d+)/.exec(track);
	const behind = /behind (\d+)/.exec(track);
	return {
		...ahead === null ? {} : { ahead: Number(ahead[1]) },
		...behind === null ? {} : { behind: Number(behind[1]) }
	};
}
/**
* Read the branches the delete dialog may offer, with the facts its marks need.
*
* A read of its own rather than a second half of `POST /branches`, because the
* two dialogs ask different questions: a switch wants names and nothing else,
* while this one wants each branch's upstream, its tracking state, and whether
* HEAD reaches it — three answers that cost walks the switch dialog would pay
* for on every open and never read.
*
* A remote-tracking branch is marked by the same rule as a local one, and the
* rule reads differently there: a remote branch HEAD does not reach is the
* ordinary case rather than a warning, so what the row says is simply that these
* commits are on that remote and nowhere else in this repository. Which remote
* owns the ref is resolved against the configured names rather than cut out of
* the ref, because a local branch may itself be called `origin/main`.
*
* @param target - the shell seam, the session's directory, and the file policy.
* @returns the two lists, each with its marks, and which branch HEAD is on.
*/
async function readBranchReport(target) {
	const repo = await resolveRepo(target);
	if ("refusal" in repo) return {
		ok: false,
		...repo.refusal,
		reason: repo.reason
	};
	const root = inDir(target, repo.root);
	const locals = await readRefRecords(root, "refs/heads/");
	if (!locals.ok) return {
		ok: false,
		...locals.refusal,
		reason: "error"
	};
	const remotes = await readRefRecords(root, "refs/remotes/");
	if (!remotes.ok) return {
		ok: false,
		...remotes.refusal,
		reason: "error"
	};
	const localMerged = repo.hasHead ? await mergedRefNames(root, "refs/heads/") : {
		ok: true,
		names: /* @__PURE__ */ new Set()
	};
	if (!localMerged.ok) return {
		ok: false,
		...localMerged.refusal,
		reason: "error"
	};
	const remoteMerged = repo.hasHead ? await mergedRefNames(root, "refs/remotes/") : {
		ok: true,
		names: /* @__PURE__ */ new Set()
	};
	if (!remoteMerged.ok) return {
		ok: false,
		...remoteMerged.refusal,
		reason: "error"
	};
	const current = await currentBranch(root);
	const configured = await remotesOf(root);
	const localEntries = locals.records.map((record) => ({
		name: record.name,
		kind: "local",
		current: record.current,
		safety: safetyOf(record, localMerged.names.has(record.name)),
		...record.upstream === "" ? {} : { upstream: record.upstream },
		...aheadBehindOf(record.track)
	}));
	const remoteEntries = [];
	for (const record of remotes.records) {
		const split = splitRemote(configured, record.name);
		if (split === null) continue;
		remoteEntries.push({
			name: record.name,
			kind: "remote",
			remote: split.remote,
			branch: split.branch,
			safety: safetyOf(record, remoteMerged.names.has(record.name)),
			...aheadBehindOf(record.track)
		});
	}
	return {
		ok: true,
		current,
		detached: current === null,
		locals: localEntries,
		remotes: remoteEntries,
		truncated: locals.truncated || remotes.truncated
	};
}
/**
* Delete the branches a request named, one at a time.
*
* One at a time rather than one `git branch -d a b c`, because the answer the
* dialog needs is per branch: Git reports a mixed batch by exiting nonzero and
* naming the branch it refused, and telling which of the others went through
* would mean reading Git's own prose back — text that is translated, and whose
* misreading would mark a branch deleted that is still there. The exit code of
* one call per branch is an answer no locale can change.
*
* Nothing here offers a force. `-d` is the whole gate, and it is the right one:
* it refuses exactly the branches whose commits would be left reachable from
* nothing, which is the promise every mark in the dialog is making.
*
* @param target - the shell seam, the session's directory, and the file policy.
* @param wanted - the branches to delete, in the order the page listed them.
* @returns one outcome per branch, and whether all of them succeeded.
*/
async function deleteBranches(target, wanted) {
	const repo = await resolveRepo(target);
	if ("refusal" in repo) return {
		ok: false,
		...repo.refusal,
		reason: repo.reason
	};
	const root = inDir(target, repo.root);
	const configured = await remotesOf(root);
	const results = [];
	for (const item of wanted) results.push(item.kind === "remote" ? await deleteRemoteBranch(root, configured, item) : await deleteLocalBranch(root, item.name));
	return {
		ok: results.every((result) => result.ok),
		results
	};
}
/**
* Delete one local branch, with Git's own `-d` deciding.
*
* The name is checked against `refs/heads/` first so a name that is not a branch
* is stated as such rather than surfacing Git's wording, and the one shape Git
* would read as an option is refused here: `branch -d` takes a short name and
* cannot be handed a full ref — a fully-qualified name is answered with "branch
* not found" — so this is the one place a name this half passes on is not
* already unambiguous.
*
* @param root - the repository root, with the session's file policy.
* @param name - the local branch to delete.
* @returns what became of it.
*/
async function deleteLocalBranch(root, name) {
	if (name.startsWith("-") || !await refExists(root, `refs/heads/${name}`)) return {
		name,
		ok: false,
		...coded("unknown-branch", { name })
	};
	const run = await runGit(root, [
		"branch",
		"-d",
		name
	]);
	if (run.code === 0) return {
		name,
		ok: true
	};
	return {
		name,
		ok: false,
		...deleteFailure(run, name)
	};
}
/**
* Delete one branch on the remote that holds it.
*
* The ref is passed fully qualified, which is what keeps a branch name that
* looks like an option from being read as one: `--delete` takes refs, and
* `refs/heads/...` is unambiguously a ref, so the name Git is told to remove is
* the name the dialog showed and not one the command line could reinterpret.
*
* The remote is checked against the configured ones because the page sends back
* the pair it was given rather than a name this half re-splits, and a request
* that names a remote the repository does not have is a refusal to state rather
* than a push to attempt.
*
* @param root - the repository root, with the session's file policy.
* @param configured - the configured remote names.
* @param item - the remote-tracking branch to delete.
* @returns what became of it.
*/
async function deleteRemoteBranch(root, configured, item) {
	const remote = item.remote ?? "";
	const branch = item.branch ?? "";
	const named = remote === "" ? item.name : remote;
	if (branch === "" || branch.startsWith("-") || !configured.includes(remote)) return {
		name: item.name,
		ok: false,
		...coded("unknown-remote", { remote: named })
	};
	const run = await runGit(root, [
		"push",
		remote,
		"--delete",
		`refs/heads/${branch}`
	], [0], GIT_NETWORK_TIMEOUT_MS);
	if (run.code === 0) return {
		name: item.name,
		ok: true
	};
	return {
		name: item.name,
		ok: false,
		...remoteDeleteFailure(run, branch)
	};
}
/**
* Describe why deleting one local branch was refused.
*
* The two refusals the dialog can predict are worded here, because it is the
* dialog that predicted them: a branch Git will not delete for want of a merge
* is the case every mark but `safe` is warning about, and a branch some worktree
* is standing on — the current one included — is the case the dialog disables.
* Both sentences name the branch, because a batch's answer is read one line at a
* time and a line that does not say which branch it is about is not an answer.
*
* @param run - the failed invocation.
* @param name - the branch the request was deleting.
* @returns the coded refusal, or Git's own first line.
*/
function deleteFailure(run, name) {
	if (run.denied === true) return coded("delete-denied");
	const text = diagnosticText(run);
	if (BRANCH_NOT_MERGED.test(text)) return coded("branch-not-merged", { branch: name });
	if (BRANCH_IN_USE.test(text)) return coded("branch-in-use", { branch: name });
	return refusalOf(run);
}
/**
* Describe why deleting one remote branch was refused.
*
* The credential answers are the ones `fetch` already words, because a delete is
* a push and fails the same way when there is nothing to authenticate with;
* everything else is Git's own first line — a missing ref, an unreachable host,
* a rejected hook — which is more specific than anything this half could invent.
*
* @param run - the failed push invocation.
* @param branch - the branch name on the remote, for the one refusal that names it.
* @returns the coded refusal, or Git's own first line.
*/
function remoteDeleteFailure(run, branch) {
	if (run.denied === true) return coded("delete-denied");
	const text = diagnosticText(run);
	if (CREDENTIAL_HELPER_UNAVAILABLE.test(text)) return coded("auth-helper");
	if (AUTH_FAILURE.test(text)) return coded("auth");
	if (REMOTE_REF_MISSING.test(text)) return coded("unknown-branch", { name: branch });
	return refusalOf(run);
}
/**
* Merge one branch into the branch HEAD is on.
*
* That is a plain `git merge`, and it is the only shape this page offers: Git
* merges into the branch it is on, and the branch it is on is the one the reader
* is looking at, so the operation stated is the operation Git has. The other
* direction — the current branch into a branch nobody is standing on — would be a
* checkout, a merge, and a checkout back: three working-tree moves for one
* intention, buying two saved clicks at the price of a commit made on a branch
* the page is not showing, where nothing on screen would show it happen.
*
* A conflicting merge is aborted rather than left in the tree. The page has no
* way to finish one — the commit form refuses while unmerged paths exist — so an
* unfinished merge is exactly the state the fast-forward-only pull was shaped to
* avoid. Aborting puts the working tree back where it was and words the refusal;
* the branch is then merged by hand, with Git's own tools and markers.
*
* @param target - the shell seam, the session's directory, and the file policy.
* @param name - the branch to merge in, local or remote-tracking.
* @returns the outcome, including the reason a merge was refused.
*/
async function mergeBranch(target, name) {
	const repo = await resolveRepo(target);
	if ("refusal" in repo) return {
		ok: false,
		...repo.refusal,
		reason: repo.reason
	};
	if (!repo.hasHead) return {
		ok: false,
		...coded("merge-no-commits"),
		reason: "no-commits"
	};
	const root = inDir(target, repo.root);
	const current = await currentBranch(root);
	if (current === null) return {
		ok: false,
		...coded("merge-detached"),
		reason: "detached"
	};
	if (name === current) return {
		ok: false,
		...coded("merge-same-branch", { branch: name }),
		reason: "same-branch"
	};
	if (!await mergeableRef(root, name)) return {
		ok: false,
		...coded("unknown-branch", { name }),
		reason: "unknown-branch"
	};
	return mergeIn(root, name);
}
/**
* Whether one name can be the source of a merge.
*
* Both a local branch and a remote-tracking ref can be merged in, and the answer
* is `rev-parse` on the fully-qualified name rather than a pattern of this
* half's own — which is also what keeps a name Git accepts from being refused by
* a rule that does not exist.
*
* @param root - the repository root, with the session's file policy.
* @param name - the branch to judge.
* @returns true when a merge may name it as its source.
*/
async function mergeableRef(root, name) {
	if (await refExists(root, `refs/heads/${name}`)) return true;
	return refExists(root, `refs/remotes/${name}`);
}
/**
* Merge one branch into the branch HEAD is on.
*
* `--no-edit` is what keeps this non-interactive: without it Git opens an editor
* for the merge commit's message, and no editor exists behind this seam.
*
* @param root - the repository root, with the session's file policy.
* @param source - the branch to merge in.
* @returns the outcome, including the reason a merge was refused.
*/
async function mergeIn(root, source) {
	const run = await runGit(root, [
		"merge",
		"--no-edit",
		source
	]);
	if (run.code === 0) return {
		ok: true,
		branch: source,
		summary: mergeSummary(run, source)
	};
	if (run.failure !== void 0) return {
		ok: false,
		error: run.failure,
		reason: "error"
	};
	if (await conflictedMerge(root, run)) {
		await runGit(root, ["merge", "--abort"]);
		return {
			ok: false,
			...coded("merge-conflict", { branch: source }),
			reason: "conflict"
		};
	}
	return mergeFailure(run);
}
/**
* Whether a failed merge left conflicts behind, or never started one.
*
* The pattern is Git's own summary sentence, and the fallback asks the index:
* a merge that failed before touching the tree — a refused fast-forward, an
* unrelated history — has no unmerged paths and must not be aborted, because
* there is nothing to abort.
*
* @param root - the repository root, with the session's file policy.
* @param run - the failed merge invocation.
* @returns true when the merge is in progress with conflicts.
*/
async function conflictedMerge(root, run) {
	if (MERGE_CONFLICT.test(diagnosticText(run))) return true;
	const unmerged = await runGit(root, [
		"diff",
		"--name-only",
		"--diff-filter=U"
	]);
	return unmerged.code === 0 && unmerged.stdout.trim() !== "";
}
/**
* Describe why a merge was refused.
*
* The two coded cases are the ones the page can act on: a sandbox that forbids
* writing at all, and a working tree with local changes in the way. Everything
* else is Git's own first line — `refusing to merge unrelated histories` and
* friends — which is more specific than anything this half could invent.
*
* @param run - the failed merge invocation.
* @returns the payload the page renders.
*/
function mergeFailure(run) {
	if (run.denied === true) return {
		ok: false,
		...coded("merge-denied"),
		reason: "denied"
	};
	if (DIRTY_WORKTREE.test(diagnosticText(run))) return {
		ok: false,
		...coded("merge-dirty"),
		reason: "dirty"
	};
	return {
		ok: false,
		...refusalOf(run),
		reason: "error"
	};
}
/**
* The Host's own one-line account of a merge that ran.
*
* Git says which of the three things happened in its own words — the two sides
* were already equal, one moved up to the other, or a commit joined them — and
* the account is built from that rather than from a guess.
*
* @param run - the successful merge invocation.
* @param source - the branch that was merged in.
* @returns the summary line.
*/
function mergeSummary(run, source) {
	const output = `${run.stdout}\n${run.stderr}`;
	if (/Already up[ -]to[ -]date/i.test(output)) return `Already up to date with ${source}`;
	if (/Fast-forward/i.test(output)) return `Fast-forwarded ${source}`;
	return `Merged ${source}`;
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
			...coded(ACTION_REFUSAL[action].noCommits),
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
			...coded(ACTION_REFUSAL[action].detached),
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
* Refresh every remote-tracking ref from its remote.
*
* This is the one network operation with nothing to decide. It moves no branch,
* no HEAD, and no working tree, so it cannot conflict, cannot be blocked by
* uncommitted work, and cannot be refused by a detached or unborn HEAD — it is
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
* @param target - the shell seam, the session's directory, and the file policy.
* @returns the outcome, including the reason a fetch was refused.
*/
async function fetchRemotes(target) {
	const repo = await resolveRepo(target);
	if ("refusal" in repo) return {
		ok: false,
		...repo.refusal,
		reason: repo.reason
	};
	const run = await runGit(inDir(target, repo.root), ["fetch", "--all"], [0], GIT_NETWORK_TIMEOUT_MS);
	if (run.failure !== void 0) return {
		ok: false,
		error: run.failure,
		reason: "error"
	};
	if (run.code !== 0) return fetchFailure(run);
	return { ok: true };
}
/**
* Describe why a fetch was refused.
*
* Two cases, and the second is the one worth separating: a sandbox that forbids
* writing at all, and credentials the remote rejected. The order matters because
* a credential helper a confined sandbox kept from starting leaves Git with
* nobody to ask, which reads like an auth failure but is the sandbox. Everything
* else is Git's own first line — `Could not resolve host` and friends — which is
* more specific than anything this half could invent.
*
* @param run - the failed fetch invocation.
* @returns the payload the page renders.
*/
function fetchFailure(run) {
	if (run.denied === true) return {
		ok: false,
		...coded("fetch-denied"),
		reason: "denied"
	};
	const text = diagnosticText(run);
	if (CREDENTIAL_HELPER_UNAVAILABLE.test(text)) return {
		ok: false,
		...coded("auth-helper"),
		reason: "auth"
	};
	if (AUTH_FAILURE.test(text)) return {
		ok: false,
		...coded("auth"),
		reason: "auth"
	};
	return {
		ok: false,
		...refusalOf(run),
		reason: "error"
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
		...coded("pull-no-upstream", { branch: handoff.branch }),
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
	if (run.code !== 0) {
		const failure = syncFailure(run, "pull");
		if (failure.failure?.code === "auth-helper") {
			const retried = await retryWithStoredCredential(handoff.root, ["pull", "--ff-only"], "pull", handoff.branch, upstream);
			if (retried !== void 0) return retried;
		}
		return failure;
	}
	return syncSuccess(run, "pull", upstream);
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
	let remoteName;
	if (ref === void 0) {
		const remotes = await remotesOf(root);
		const remote = remotes[0];
		if (remote === void 0) return {
			ok: false,
			...coded("push-no-remote"),
			reason: "no-remote",
			action: "push"
		};
		if (remotes.length > 1) return {
			ok: false,
			...coded("push-ambiguous-remote", { remotes: remotes.join(", ") }),
			reason: "ambiguous-remote",
			action: "push"
		};
		remoteName = remote;
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
	if (run.code !== 0) {
		const failure = syncFailure(run, "push");
		if (failure.failure?.code === "auth-helper") {
			const retried = await retryWithStoredCredential(root, args, "push", branch, ref, remoteName);
			if (retried !== void 0) return retried;
		}
		return failure;
	}
	return syncSuccess(run, "push", ref);
}
/**
* Describe why a pull or a push was refused.
*
* The five cases worth separating are the ones the user can act on: a sandbox
* that forbids writing at all, a divergent history, a dirty working tree,
* credentials the remote rejected, and a credential helper that a confined
* sandbox kept from starting at all. Everything else is Git's own first line,
* which is more specific than anything this half could invent.
*
* @param run - the failed invocation.
* @param action - which operation failed, for the message.
* @returns the payload the page renders.
*/
function syncFailure(run, action) {
	if (run.denied === true) return {
		ok: false,
		...coded(ACTION_REFUSAL[action].denied),
		reason: "denied",
		action
	};
	const text = diagnosticText(run);
	if (CREDENTIAL_HELPER_UNAVAILABLE.test(text)) return {
		ok: false,
		...coded("auth-helper"),
		reason: "auth",
		action
	};
	if (AUTH_FAILURE.test(text)) return {
		ok: false,
		...coded("auth"),
		reason: "auth",
		action
	};
	if (DIRTY_WORKTREE.test(text)) return {
		ok: false,
		...coded(ACTION_REFUSAL[action].dirty),
		reason: "dirty",
		action
	};
	if (action === "pull" && /Not possible to fast-forward|diverging branches|divergent branches/i.test(text)) return {
		ok: false,
		...coded("pull-diverged"),
		reason: "diverged",
		action
	};
	if (action === "push" && /non-fast-forward|fetch first|behind its remote|\[rejected\]/i.test(text)) return {
		ok: false,
		...coded("push-behind"),
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
* Split one `credential.helper` value into an executable and its arguments.
*
* Git starts a helper through the shell, which is exactly what a confined
* Windows sandbox can deny. This reader starts the executable directly, so a
* value that needs the shell — a `!` snippet, a variable, a glob, redirection —
* is not one it can honor and is skipped.
*
* @param value - one configured helper value.
* @returns the executable and arguments, or undefined when it needs a shell.
*/
function helperInvocation(value) {
	const trimmed = value.trim();
	if (trimmed === "" || trimmed.startsWith("!")) return void 0;
	if (/['"`$~%;&|<>()]/.test(trimmed)) return void 0;
	const [executable, ...args] = trimmed.split(/\s+/);
	if (executable === void 0 || executable === "") return void 0;
	return {
		executable,
		args
	};
}
/**
* Where a bare helper name's executable lives.
*
* Git looks for `git-credential-<name>` on its exec path, and the Windows
* helpers (Git Credential Manager among them) also sit in the directory beside
* it; a PATH entry is the last resort, for an install that put it there.
*
* @param executable - the configured value's first word.
* @param execPath - `git --exec-path`, when the repository answered it.
* @returns the existing executable path, or undefined.
*/
function helperExecutable(executable, execPath) {
	if (/^(?:[A-Za-z]:[\\/]|[\\/])/.test(executable)) return existsSync(executable) ? executable : void 0;
	const name = `git-credential-${executable}`;
	const fileNames = process.platform === "win32" ? [`${name}.exe`, name] : [name];
	const directories = [];
	if (execPath !== void 0 && execPath !== "") directories.push(execPath, join(execPath, "..", "..", "bin"));
	directories.push(...(process.env.PATH ?? "").split(process.platform === "win32" ? ";" : ":"));
	for (const directory of directories) {
		if (directory === "") continue;
		for (const fileName of fileNames) {
			const candidate = join(directory, fileName);
			if (existsSync(candidate)) return candidate;
		}
	}
}
/**
* The credential helpers this repository's configuration names, in order.
*
* `git config --get-all` reads every level (system, global, local), which is the
* same order Git would ask them in; helpers that need a shell are dropped
* because the point of reading them here is to avoid one.
*
* @param target - the shell seam and the directory to ask.
* @returns the helpers that can be started directly.
*/
async function credentialHelpers(target) {
	const configured = await runGit(target, [
		"config",
		"--get-all",
		"credential.helper"
	]);
	if (configured.code !== 0) return [];
	const execPathRun = await runGit(target, ["--exec-path"]);
	const execPath = execPathRun.code === 0 ? execPathRun.stdout.trim() : void 0;
	const helpers = [];
	const seen = /* @__PURE__ */ new Set();
	for (const line of configured.stdout.split("\n")) {
		const invocation = helperInvocation(line);
		if (invocation === void 0) continue;
		const executable = helperExecutable(invocation.executable, execPath);
		if (executable === void 0 || seen.has(executable)) continue;
		seen.add(executable);
		helpers.push({
			executable,
			args: invocation.args
		});
	}
	return helpers;
}
/**
* Read the username and password out of one helper's answer.
*
* @param text - the helper's standard output.
* @returns the pair, or undefined when the helper supplied no credential.
*/
function parseCredential(text) {
	let username = "";
	let password = "";
	for (const raw of text.split("\n")) {
		const line = raw.trim();
		if (line.startsWith("username=")) username = line.slice(9);
		else if (line.startsWith("password=")) password = line.slice(9);
	}
	return username === "" || password === "" ? void 0 : {
		username,
		password
	};
}
/**
* Ask this machine's credential helpers for one host's stored credential.
*
* The helpers are started directly, so this works where Git's own helper
* invocation cannot: Git for Windows starts every helper through its bundled
* MSYS shell, and a sandbox that denies that shell its pipe leaves the helper
* unreachable even though the credential is on the machine.
*
* @param target - the shell seam and the directory to run in.
* @param host - the HTTPS host the credential belongs to.
* @returns the credential, or undefined when no helper holds one.
*/
async function storedCredential(target, host) {
	const flavor = shellFlavor(target.shell);
	for (const helper of await credentialHelpers(target)) {
		const run = await invoke(target, shellCommand([
			helper.executable,
			...helper.args,
			"get"
		], flavor), {
			timeoutMs: CREDENTIAL_TIMEOUT_MS,
			stdin: `protocol=https\nhost=${host}\n\n`,
			env: { GCM_INTERACTIVE: "never" }
		});
		if (run.code !== 0) continue;
		const credential = parseCredential(run.stdout);
		if (credential !== void 0) return credential;
	}
}
/**
* The remote a branch hands off to, as its configuration names it.
*
* @param root - the repository root, with the session's file policy.
* @param branch - the branch being handed off.
* @returns the remote name, or undefined when the branch tracks the local tree.
*/
async function remoteOfBranch(root, branch) {
	const run = await runGit(root, [
		"config",
		"--get",
		`branch.${branch}.remote`
	]);
	if (run.code !== 0) return void 0;
	const name = run.stdout.trim();
	return name === "" || name === "." ? void 0 : name;
}
/**
* The URL one configured remote hands off to.
*
* @param root - the repository root, with the session's file policy.
* @param remote - the remote's name.
* @returns the URL, or undefined when it cannot be read.
*/
async function remoteUrlOf(root, remote) {
	const run = await runGit(root, [
		"remote",
		"get-url",
		remote
	]);
	if (run.code !== 0) return void 0;
	const url = run.stdout.trim();
	return url === "" ? void 0 : url;
}
/**
* The host of an HTTPS remote URL.
*
* @param url - the remote's configured URL.
* @returns the host, or undefined for any transport a header cannot answer.
*/
function httpsHost(url) {
	try {
		const parsed = new URL(url);
		return parsed.protocol === "https:" ? parsed.host : void 0;
	} catch {
		return;
	}
}
/**
* The payload for a hand-off that completed.
*
* @param run - the successful invocation.
* @param action - which operation completed.
* @param label - what the summary calls the other side.
* @returns the payload the page renders.
*/
function syncSuccess(run, action, label) {
	const output = `${run.stdout}\n${run.stderr}`;
	if (action === "pull") return {
		ok: true,
		action,
		summary: /Already up[ -]to[ -]date/i.test(output) ? `Already up to date with ${label}` : `Pulled from ${label}`
	};
	return {
		ok: true,
		action,
		summary: /Everything up[ -]to[ -]date/i.test(output) ? `Everything up to date with ${label}` : `Pushed to ${label}`
	};
}
/**
* Retry one network hand-off with the credential the machine already holds.
*
* Git for Windows starts every credential helper through its bundled MSYS
* shell, and the Windows sandbox can deny that shell the pipe it creates at
* startup — the helper then never runs even though a credential is stored. The
* helper executable can be asked directly, and its answer can travel to Git as
* an HTTP header: `http.extraHeader` needs no helper and no shell, and the
* transport process itself is a plain Windows executable.
*
* Only the `auth-helper` refusal reaches this path, and only an HTTPS remote
* can be answered this way; the credential itself is never persisted, never
* printed, and travels only in the child's environment.
*
* @param target - the repository root, with the session's file policy.
* @param args - the network command to repeat.
* @param action - which operation is retried, for the payload.
* @param branch - the branch being handed off.
* @param label - what the summary calls the other side.
* @param knownRemote - the remote an upstream-less branch would push to.
* @returns the retried outcome, or undefined when no credential could be read.
*/
async function retryWithStoredCredential(target, args, action, branch, label, knownRemote) {
	const remote = knownRemote ?? await remoteOfBranch(target, branch);
	if (remote === void 0) return void 0;
	const url = await remoteUrlOf(target, remote);
	if (url === void 0) return void 0;
	const host = httpsHost(url);
	if (host === void 0) return void 0;
	const credential = await storedCredential(target, host);
	if (credential === void 0) return void 0;
	const pair = `${credential.username}:${credential.password}`;
	const header = `Authorization: Basic ${Buffer.from(pair).toString("base64")}`;
	const run = await runGit(target, args, [0], GIT_NETWORK_TIMEOUT_MS, void 0, {
		GIT_CONFIG_COUNT: "1",
		GIT_CONFIG_KEY_0: `http.https://${host}/.extraHeader`,
		GIT_CONFIG_VALUE_0: header
	});
	if (run.failure !== void 0) return {
		ok: false,
		error: run.failure,
		reason: "error",
		action
	};
	if (run.code !== 0) return syncFailure(run, action);
	return syncSuccess(run, action, label);
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
		"-F",
		"-"
	], [0], GIT_TIMEOUT_MS, message);
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
		...coded("commit-clean"),
		reason: "clean"
	};
}
/** The answer for a tree whose merge is not finished. */
function conflictedCommit() {
	return {
		ok: false,
		...coded("commit-conflict"),
		reason: "conflict"
	};
}
/**
* Describe why staging or the commit itself was refused.
*
* The sandbox is the refusal the user can act on: under a `read-only` mode Git
* never ran at all, and the seam is what says so. The other three cases worth
* separating are races against the read above — a merge that was aborted after
* it, and a tree another process emptied — and a missing author identity, which
* Git reports as a state the user can fix rather than as a fault of this
* repository. Everything else, a refusing hook and a signing failure among them,
* is Git's own first line, which is more specific than anything this half could
* invent.
*
* @param run - the failed invocation.
* @returns the payload the page renders.
*/
function commitFailure(run) {
	if (run.denied === true) return {
		ok: false,
		...coded("commit-denied"),
		reason: "denied"
	};
	const text = diagnosticText(run);
	if (/unmerged|merging is not possible|you have unmerged files/i.test(text)) return conflictedCommit();
	if (/nothing to commit|nothing added to commit|no changes added to commit/i.test(text)) return emptyCommit();
	if (MISSING_IDENTITY.test(text)) return {
		ok: false,
		...coded("commit-identity"),
		reason: "error"
	};
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
	return Math.min(MAX_LOG_LIMIT, Math.max(1, Math.trunc(limit)));
}
/**
* What the model is told before it is shown the changes.
*
* The style of the repository's own commits comes first because it is the
* stronger signal: a project whose history is Chinese, or untagged, or writes a
* body on every change, is a project whose next message should look like that. The
* commit rules follow as the answer for when there is nothing to imitate, and
* rule 2 stays an instruction in either case — the sensitive-content check is not
* a matter of house style.
*
* Rule 2 is a pre-commit check rather than a shape for the message, so the model
* needs somewhere to put what it finds: the answer is split into the message and
* the `WARNING:` lines that follow it (see `splitAnswer` in the Host half), which
* is what keeps a finding out of the commit message and still in front of the
* person about to commit.
*/
const DEFAULT_MESSAGE_PROMPT = [
	"You write the Git commit message for a working tree from the changes you are shown.",
	"Write it in the style of this repository's recent commits, which are shown to you: match their language, their tag prefix or lack of one, their mood, their capitalization, and whether they carry a body.",
	"When the recent commits do not establish a style — there are none, too few, or no consistent pattern — follow the project's commit rules instead:",
	...[
		"1. Default to English, and keep the message concise.",
		"2. Check for temp files, large files, and sensitive content (keys, tokens, .env) before committing.",
		"3. Add a tag such as feat | refactor | fix | chore."
	],
	"Keep the subject line at most 72 characters, and add a body only when the change needs one.",
	"Apply rule 2 before you write, whatever style you are following. When the check finds something the committer must look at first, put one line per finding after the message, each beginning with \"WARNING: \" and naming the path and what is wrong with it.",
	"Answer with the commit message alone: no Markdown, no code fences, no quotation marks around the message, and no commentary of your own."
].join("\n");
//#endregion
//#region src/host/model.ts
/**
* Read DSH's current default model selection.
*
* The service is optional because a composition can be built without it, and its
* answer is untrusted because it is a Config-backed read: a selection naming no
* provider or no model is the same answer as no service at all, which is what the
* page words as "no default model".
*
* @param ctx - the Host plugin context.
* @returns the route to call, or undefined when there is none to call.
*/
function defaultSelection(ctx) {
	const service = ctx.get("agentDefaultModel");
	if (service === void 0 || typeof service.currentSelection !== "function") return void 0;
	try {
		const selection = service.currentSelection();
		const provider = selection?.provider;
		const model = selection?.model;
		if (typeof provider !== "string" || provider === "") return void 0;
		if (typeof model !== "string" || model === "") return void 0;
		const effort = selection?.reasoningEffort;
		return {
			provider,
			model,
			...typeof effort === "string" && effort !== "" ? { reasoningEffort: effort } : {}
		};
	} catch {
		return;
	}
}
/**
* Read every registered provider's model catalog for the Settings picker.
*
* One provider at a time, because the catalog is adapter-owned: a provider whose
* endpoint is unreachable, whose credential is missing, or whose adapter answers
* with an unusable list is left out rather than taking every other provider's
* rows with it. The dialog can still be used — the default model and every
* provider that did answer remain selectable — and an empty catalog is drawn as
* its own empty state rather than as a failed request.
*
* @param ctx - the Host plugin context.
* @returns provider groups in registration order, each in catalog order.
*/
async function readModelGroups(ctx) {
	const llm = ctx.get("llm");
	if (llm === void 0 || typeof llm.listProviders !== "function" || typeof llm.listModels !== "function") return [];
	let providers;
	try {
		providers = llm.listProviders();
	} catch {
		return [];
	}
	if (!Array.isArray(providers)) return [];
	return (await Promise.all(providers.map(async (provider) => {
		const id = provider?.id;
		if (typeof id !== "string" || id === "") return void 0;
		const name = typeof provider?.name === "string" && provider.name !== "" ? provider.name : id;
		try {
			const models = await llm.listModels(id);
			if (!Array.isArray(models)) return void 0;
			const options = models.filter((model) => typeof model?.id === "string" && model.id !== "" && typeof model?.name === "string" && model.name !== "").map((model) => ({
				id: model.id,
				name: model.name
			}));
			return options.length === 0 ? void 0 : {
				provider: id,
				name,
				models: options
			};
		} catch {
			return;
		}
	}))).filter((group) => group !== void 0);
}
/**
* Read the reasoning efforts one exact route offers.
*
* Effort metadata is adapter-owned and resolved per model, which is why the
* picker asks for it when a row's effort control is opened rather than shipping
* every model's list with the catalog. The result is only ever what the adapter
* itself declared: an empty list means the model offers no selectable level (its
* own default applies), and a failed read is reported rather than flattened into
* that same empty list — a row that could not be asked must not look like a model
* that has nothing to offer.
*
* @param ctx - the Host plugin context.
* @param provider - the registered provider route.
* @param model - the provider-owned model id.
* @returns the effort ids, or the failure to report.
*/
async function readModelEfforts(ctx, provider, model) {
	const llm = ctx.get("llm");
	if (llm === void 0 || typeof llm.resolveModelInfo !== "function") return {
		ok: false,
		error: "model service unavailable"
	};
	try {
		const info = await llm.resolveModelInfo(provider, model);
		const declared = Array.isArray(info?.reasoning?.efforts) ? info.reasoning.efforts : [];
		const efforts = [];
		for (const effort of declared) {
			const id = effort?.id;
			if (typeof id !== "string" || id === "" || efforts.includes(id)) continue;
			efforts.push(id);
		}
		return {
			ok: true,
			efforts
		};
	} catch (error) {
		return {
			ok: false,
			error: error instanceof Error ? error.message : String(error)
		};
	}
}
//#endregion
//#region src/host/settings.ts
/**
* Durable per-Workspace choices for generated commit messages.
*
* A Workspace owns two questions about the model call that writes its commit
* messages: which model writes them, and what prompt it is told. Both are
* Workspace preferences rather than repository facts, so they are stored beside
* the rest of the harness's user data instead of in the working tree — a Git
* tab must not leave a settings file behind in the repository it is showing.
*
* The file is one JSON document at `<dsh home>/dsh-cool-git/settings.json`:
*
*   {
*     "version": 1,
*     "workspaces": {
*       "/canonical/workspace/path": {
*         "model": { "provider": "…", "model": "…" },
*         "prompt": "…"
*       }
*     }
*   }
*
* A missing member is the meaningful state: no `model` means "use DSH's current
* default selection", and no `prompt` means "use the built-in prompt". Removing
* an override is therefore a deletion rather than a copy of today's default,
* which is what lets a later change to the built-in prompt reach a Workspace
* that never meant to diverge from it.
*
* Reads and writes are serialized through one promise chain. A Generate request
* reads this file while the Settings dialog may be saving it, and a read that
* landed between a truncation and the completed write would see an empty
* document. Serializing inside this process is enough: the file is one user's
* preferences, and a second DSH process writing it at the same instant is a
* last-writer-wins case neither process can see.
*
* Reading never throws at the route. A missing, unreadable, or malformed file is
* the same answer as an empty one — the defaults — because a settings file that
* cannot be parsed is not a reason to refuse to generate a commit message. A
* write is different: it can fail, and the route reports that failure to the
* dialog rather than pretending the choice was stored.
*/
/** Serialize this module's reads and writes; see the module note above. */
let queue = Promise.resolve();
/**
* Run one settings operation after every operation queued before it.
*
* @param task - the operation to run.
* @returns the operation's own result, with its failure passed through.
*/
function serialized(task) {
	const run = queue.then(task, task);
	queue = run.then(() => void 0, () => void 0);
	return run;
}
/**
* The harness home this deployment keeps user data in.
*
* `dshHomePath` is provided by DSH's boot and is the authoritative answer: it
* folds an explicit configuration and `$DSH_HOME` the same way every other
* feature does. The environment fallback exists for a host probe or a
* composition that did not provide the capability, and the last fallback is the
* default home the same helper would have resolved.
*
* @param ctx - the Host plugin context.
* @returns the absolute harness home.
*/
function harnessHome(ctx) {
	const provided = ctx.get("dshHomePath");
	if (typeof provided === "function") try {
		const home = provided();
		if (typeof home === "string" && home !== "") return home;
	} catch {}
	const configured = process.env.DSH_HOME;
	if (typeof configured === "string" && configured.trim() !== "") return resolve(configured);
	return join(homedir(), ".dsh");
}
/**
* The settings document for this deployment.
*
* @param ctx - the Host plugin context.
* @returns the absolute path to read and write.
*/
function settingsFilePath(ctx) {
	return join(harnessHome(ctx), "dsh-cool-git", "settings.json");
}
/**
* Whether a value is a record this module may read fields from.
*
* @param value - the value to test.
* @returns true for a plain object.
*/
function isRecord(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
/**
* Read one persisted model selection, rejecting anything `llm.stream` could not
* take.
*
* @param value - the stored field.
* @returns the selection, or undefined when it is absent or unusable.
*/
function parseModel(value) {
	if (!isRecord(value)) return void 0;
	const provider = value.provider;
	const model = value.model;
	if (typeof provider !== "string" || provider === "" || provider.length > 200) return void 0;
	if (typeof model !== "string" || model === "" || model.length > 200) return void 0;
	const effort = value.reasoningEffort;
	return {
		provider,
		model,
		...typeof effort === "string" && effort !== "" && effort.length <= 100 ? { reasoningEffort: effort } : {}
	};
}
/**
* Read one persisted prompt, rejecting a value the textarea could not hold.
*
* @param value - the stored field.
* @returns the prompt, or undefined when it is absent or unusable.
*/
function parsePrompt(value) {
	if (typeof value !== "string") return void 0;
	if (value.trim() === "" || value.length > 2e4) return void 0;
	return value;
}
/**
* Read the whole document, treating every unreadable state as empty.
*
* The per-entry sanitizing happens here rather than at each caller, so a
* hand-edited file can only ever contribute the fields this plugin knows about.
*
* @param ctx - the Host plugin context.
* @returns the Workspace entries, or an empty map.
*/
async function readDocument(ctx) {
	let text;
	try {
		text = await readFile(settingsFilePath(ctx), "utf8");
	} catch {
		return {};
	}
	let parsed;
	try {
		parsed = JSON.parse(text);
	} catch {
		return {};
	}
	if (!isRecord(parsed) || !isRecord(parsed.workspaces)) return {};
	const workspaces = {};
	for (const [key, value] of Object.entries(parsed.workspaces)) {
		if (!isRecord(value)) continue;
		const model = parseModel(value.model);
		const prompt = parsePrompt(value.prompt);
		if (model === void 0 && prompt === void 0) continue;
		workspaces[key] = {
			...model === void 0 ? {} : { model },
			...prompt === void 0 ? {} : { prompt }
		};
	}
	return workspaces;
}
/**
* Write the whole document, creating its directory when needed.
*
* @param ctx - the Host plugin context.
* @param workspaces - the entries to persist.
*/
async function writeDocument(ctx, workspaces) {
	const file = settingsFilePath(ctx);
	const document = {
		version: 1,
		workspaces
	};
	await mkdir(dirname(file), { recursive: true });
	await writeFile(file, `${JSON.stringify(document, null, 2)}\n`, "utf8");
}
/**
* Read one Workspace's overrides.
*
* @param ctx - the Host plugin context.
* @param workspacePath - the Workspace's canonical path, or the repository root.
* @returns the stored choices; empty when nothing has been saved.
*/
function readWorkspaceSettings(ctx, workspacePath) {
	return serialized(async () => {
		const entry = (await readDocument(ctx))[workspacePath];
		if (entry === void 0) return {};
		return {
			...entry.model === void 0 ? {} : { model: entry.model },
			...entry.prompt === void 0 ? {} : { prompt: entry.prompt }
		};
	});
}
/**
* Replace one Workspace's overrides with the given choices.
*
* An absent `model` or `prompt` removes that override, which is how the dialog
* says "use the default again". An entry with neither is removed outright, so
* the document holds only Workspaces that actually differ from the defaults.
*
* @param ctx - the Host plugin context.
* @param workspacePath - the Workspace's canonical path, or the repository root.
* @param next - the choices to store; absent members clear their override.
*/
function saveWorkspaceSettings(ctx, workspacePath, next) {
	return serialized(async () => {
		const workspaces = await readDocument(ctx);
		const entry = {
			...next.model === void 0 ? {} : { model: next.model },
			...next.prompt === void 0 ? {} : { prompt: next.prompt }
		};
		if (entry.model === void 0 && entry.prompt === void 0) delete workspaces[workspacePath];
		else workspaces[workspacePath] = entry;
		await writeDocument(ctx, workspaces);
	});
}
/**
* Read one request's model field.
*
* `null` and an absent field both mean "no override"; an object is accepted only
* when it names a provider and a model, because the picker is the only thing
* that writes one and a malformed route body is a bug rather than a choice.
*
* @param value - the request body's field.
* @returns the override, or the refusal to report.
*/
function readModelChoice(value) {
	if (value === null || value === void 0) return {
		ok: true,
		value: void 0
	};
	if (!isRecord(value)) return { ok: false };
	const provider = value.provider;
	const model = value.model;
	if (typeof provider !== "string" || provider === "" || provider.length > 200) return { ok: false };
	if (typeof model !== "string" || model === "" || model.length > 200) return { ok: false };
	const effort = value.reasoningEffort;
	return {
		ok: true,
		value: {
			provider,
			model,
			...typeof effort === "string" && effort !== "" && effort.length <= 100 ? { reasoningEffort: effort } : {}
		}
	};
}
/**
* Read one request's prompt field.
*
* A blank prompt, an absent one, and one identical to the built-in prompt all
* mean "no override": the first two because an empty textarea is the dialog's
* way of saying "use the default", and the third because saving the default
* text verbatim would freeze this Workspace at today's wording.
*
* @param value - the request body's field.
* @returns the override, or the refusal to report.
*/
function readPromptChoice(value) {
	if (value === null || value === void 0) return {
		ok: true,
		value: void 0
	};
	if (typeof value !== "string" || value.length > 2e4) return { ok: false };
	const trimmed = value.trim();
	if (trimmed === "" || trimmed === DEFAULT_MESSAGE_PROMPT.trim()) return {
		ok: true,
		value: void 0
	};
	return {
		ok: true,
		value
	};
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
//#region src/host/message.ts
/**
* Longest answer the model may write.
*
* A message is a subject and a few lines; the cap is not a length this plugin
* wants to reach, it is what keeps a model that ignored the instructions from
* spending a whole context window on one commit message.
*
* It has to be generous, because the call inherits the default selection's
* reasoning effort: a model that thinks before it answers spends this same
* budget on that thinking, and a cap sized for the message alone lets the
* thinking end the stream before the first word of the message is written.
* That is a silent empty answer — the model did answer, with reasoning — so
* the cap covers both halves with room to spare.
*/
const MAX_OUTPUT_TOKENS = 4096;
/**
* How long one generation may take, end to end.
*
* The default selection can name a high reasoning effort, and a large change set
* is slow to read, so the bound is generous; it exists for the request that would
* otherwise never answer at all, holding the page's Generate control disabled and
* a connection open behind it.
*/
const GENERATE_TIMEOUT_MS = 12e4;
/**
* The shape a finding line takes, and the prefix that is stripped from it.
*
* A model that follows the instruction writes `WARNING: <finding>`; the ones that
* do not write a warning glyph, a localized word, or nothing at all. The pattern
* accepts the spellings worth accepting and nothing else, because a line wrongly
* taken for a warning is a line dropped from the commit message.
*/
const WARNING_LINE = /^\s{0,4}(?:warnings?|注意|警告|⚠)\s*[:：]\s*/iu;
/**
* One changed path, as the prompt's list states it.
*
* The two porcelain columns are kept because they say which half of the change is
* staged — `M ` is committed by the index, ` M` is not — and the words beside
* them are the ones the sidebar shows, so the model reads the same label the
* person about to commit is reading.
*
* @param file - the changed path.
* @returns one prompt line's worth of description.
*/
function describeFile(file) {
	const flags = [file.kind];
	if (file.origPath !== void 0) flags.push(`renamed from ${file.origPath}`);
	if (file.untracked) flags.push("untracked, so not in the index");
	else if (file.conflicted) flags.push("unresolved conflict");
	else flags.push(file.staged ? file.unstaged ? "staged in part" : "staged" : "not staged");
	return `${file.index}${file.worktree} ${file.path} (${flags.join(", ")})`;
}
/**
* Assemble the request body the model is shown.
*
* Every section is labelled with the command that produced it, so the model can
* tell a status line from a patch line and know that the untracked section was
* read against `/dev/null` rather than against the index. The two truncation
* notes are the only place a cut is admitted: without them a patch that stops
* mid-file reads as a file that ends there.
*
* The style sample opens the request rather than closing it, because it is what
* the system prompt asks the model to write in the manner of: the messages are
* shown whole — subject and body, separated from each other the way the sections
* are — so that a body someone always writes is as visible as a tag someone
* always uses.
*
* @param digest - the repository read.
* @returns the user message's text.
*/
function promptText(digest) {
	const lines = [];
	lines.push("Recent commit messages on this branch, newest first (git log --pretty=format:%B):");
	if (digest.recentMessages.length === 0) lines.push("  (none: this branch has no commit to imitate yet)");
	else for (const sample of digest.recentMessages) {
		lines.push("---");
		lines.push(sample.text);
		if (sample.truncated) lines.push("[the message above was cut at the read limit]");
	}
	lines.push("");
	lines.push(`This working tree has ${digest.files.length} changed path(s).`);
	lines.push("");
	lines.push("Changed paths (git status --porcelain, XY then path):");
	for (const file of digest.files) lines.push(`  ${describeFile(file)}`);
	lines.push("");
	lines.push("Tracked changes (git diff --stat):");
	lines.push(digest.stat === "" ? "  (none)" : digest.stat);
	lines.push("");
	lines.push("Tracked changes (git diff, staged and unstaged):");
	if (digest.patch === "") lines.push("  (none)");
	else {
		lines.push(digest.patch);
		if (digest.patchTruncated) lines.push("[the patch above was cut at the read limit]");
	}
	lines.push("");
	if (digest.untracked.length === 0) lines.push("Untracked files: none.");
	else {
		lines.push("Untracked files (git diff --no-index --stat -p against /dev/null):");
		for (const preview of digest.untracked) {
			lines.push(`--- ${preview.path}${preview.truncated ? " (cut at the read limit)" : ""}`);
			lines.push(preview.text);
		}
	}
	return lines.join("\n");
}
/**
* Assemble the model's streamed answer into one string.
*
* Only text deltas are kept: the plugin asks for no tools, so a tool call would
* be an answer it cannot use, and reasoning deltas are the model's own working
* and are not the message. A text block's completed form is kept as a fallback
* for a provider that delivers no delta at all: an adapter may answer in whole
* blocks, and the message in those blocks is the same message. A terminal
* `error` or `aborted` finish is the only thing that turns the stream into a
* refusal, because those are the two finishes that carry no usable answer at
* all — with one exception, below.
*
* A `max-tokens` finish before any text is the failure this call has to name
* rather than report as an empty answer: the budget was spent on reasoning, so
* the model never reached the message. Reporting it as "no message" would send
* the reader looking at the repository instead of at the cap.
*
* The session id travels for attribution and nothing else: it is the session
* whose Git tab asked, so the provider's own session header names the
* conversation the spend belongs to, and the session's checkpoint policy flushes
* its log before dispatch. Nothing about this call enters that log — the message
* is a draft the page holds, not a conversation turn — which is why the request
* is not marked as an agent-loop request and the title service passes it by.
*
* @param llm - the `llm` capability.
* @param selection - the route to call.
* @param prompt - the user message's text.
* @param sessionId - the session the request belongs to, when the route named one.
* @param systemPrompt - the system prompt this Workspace uses: the built-in one,
*   or the text the Settings dialog stored for it.
* @returns the assembled answer, or the refusal to report.
*/
async function askModel(llm, selection, prompt, sessionId, systemPrompt) {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), GENERATE_TIMEOUT_MS);
	let text = "";
	let blockText = "";
	try {
		const options = {
			provider: selection.provider,
			model: selection.model,
			...selection.reasoningEffort === void 0 ? {} : { reasoningEffort: selection.reasoningEffort },
			maxTokens: MAX_OUTPUT_TOKENS,
			system: systemPrompt,
			messages: [{
				role: "user",
				content: [{
					type: "text",
					text: prompt
				}]
			}],
			signal: controller.signal,
			...sessionId === void 0 || sessionId === "" ? {} : { sessionId }
		};
		for await (const chunk of llm.stream(options)) {
			if (chunk?.type === "finish") {
				const reason = chunk.reason;
				if (reason?.kind === "error") return { refusal: { error: failureText(reason.failure) } };
				if (reason?.kind === "aborted") return { refusal: controller.signal.aborted ? coded("model-timeout") : { error: failureText(reason.failure) } };
				if (reason?.kind === "max-tokens" && text === "" && blockText === "") return { refusal: coded("model-truncated") };
				continue;
			}
			if (chunk?.type === "text-delta" && typeof chunk.text === "string") text += chunk.text;
			else if (chunk?.type === "block-end" && chunk.block?.type === "text" && typeof chunk.block.text === "string") blockText += chunk.block.text;
		}
	} catch (error) {
		return { refusal: { error: error instanceof Error ? error.message : String(error) } };
	} finally {
		clearTimeout(timer);
	}
	return { text: text === "" ? blockText : text };
}
/**
* One adapter failure as the page's own reason line.
*
* The adapter's message is another program's text and cannot be translated, but
* its code is the part that says what kind of failure it was — `401`, a rate
* limit, a missing model — and a message without it reads as a bare sentence with
* no handle on it.
*
* @param failure - the terminal failure a finish chunk carried.
* @returns the text to report.
*/
function failureText(failure) {
	const message = failure?.message;
	const code = failure?.code;
	const text = typeof message === "string" && message !== "" ? message : "the model call failed";
	return typeof code === "string" && code !== "" ? `${text} (${code})` : text;
}
/**
* Split the model's answer into the commit message and the findings after it.
*
* Everything before the first finding line is the message and everything from
* that line on is a warning, which is the shape the system prompt asks for. An
* answer that opens with a finding has no message to keep, so the whole answer is
* taken as the message rather than thrown away: the field is a draft the user
* edits, and a warning line in it is a smaller failure than an empty form.
*
* @param raw - the assembled answer.
* @returns the message, and the findings in the order they were written.
*/
function splitAnswer(raw) {
	const cleaned = raw.replace(/^\s*```[a-zA-Z]*\s*\n?/u, "").replace(/\n?```\s*$/u, "").trim();
	const lines = cleaned.split(/\r?\n/u);
	const cut = lines.findIndex((line) => WARNING_LINE.test(line));
	if (cut <= 0) return {
		message: cleaned,
		warnings: []
	};
	const message = lines.slice(0, cut).join("\n").trim();
	if (message === "") return {
		message: cleaned,
		warnings: []
	};
	return {
		message,
		warnings: lines.slice(cut).filter((line) => WARNING_LINE.test(line)).map((line) => line.replace(WARNING_LINE, "").trim()).filter((line) => line !== "")
	};
}
/**
* Write one commit message for the changes this working tree holds.
*
* The order of the checks is the order the page can act on them: a working tree
* with nothing changed is refused before any model is looked for, because a
* missing model is not what the user needs to hear about a clean tree.
*
* The Workspace's own choices are read here rather than carried on the request.
* The page asks for a message and nothing else, so a stale tab cannot write with
* a model or prompt the Workspace has since changed, and a request forged from
* the same origin cannot point the model at text the Settings dialog never
* stored. Which Workspace that is, is the Host's answer: the registry's path
* when it can name one, and the repository root the digest just resolved
* otherwise.
*
* @param ctx - the Host plugin context.
* @param target - the shell seam, the session's directory, and the file policy.
* @param sessionId - the session the request named, for the model call's own
* attribution; the repository is resolved from it already, never from a path.
* @returns the payload the page fills its form from.
*/
async function generateCommitMessage(ctx, target, sessionId) {
	const digest = await readChangeDigest(target);
	if (digest.ok !== true) return {
		ok: false,
		...digest.refusal,
		reason: digest.reason
	};
	if (digest.files.length === 0) return {
		ok: false,
		...coded("commit-clean"),
		reason: "clean"
	};
	const workspace = await resolveWorkspace(ctx, sessionId, digest.root);
	const settings = await readWorkspaceSettings(ctx, workspace?.path === void 0 || workspace.path === "" ? digest.root : workspace.path);
	const llm = ctx.get("llm");
	if (llm === void 0 || typeof llm.stream !== "function") return {
		ok: false,
		...coded("no-llm")
	};
	const selection = settings.model ?? defaultSelection(ctx);
	if (selection === void 0) return {
		ok: false,
		...coded("no-model")
	};
	const answer = await askModel(llm, selection, promptText(digest), sessionId, settings.prompt ?? DEFAULT_MESSAGE_PROMPT);
	if ("refusal" in answer) return {
		ok: false,
		...answer.refusal
	};
	const { message, warnings } = splitAnswer(answer.text);
	if (message === "") return {
		ok: false,
		...coded("empty-message")
	};
	return {
		ok: true,
		message,
		...warnings.length === 0 ? {} : { warnings }
	};
}
//#endregion
//#region src/host/routes.ts
/**
* The Host half's HTTP surface.
*
* The browser half has no Cordis context and no remote namespace of its own, so
* every question it asks the Host crosses a same-origin route registered on the
* `webServer` carrier. Each route answers JSON and never rejects: a transport or
* sandbox failure becomes an `{ ok: false }` result the page reports in its error
* dialog.
*
* The Host stays authoritative about *where* Git runs. A request may name the
* session it belongs to, but never a directory: the directory is read from that
* session's own header — from the live session when the Host holds it, and from
* the session's durable header when it does not yet — so a page cannot point the
* plugin at a repository the session does not own. The durable read is what lets
* a reopened page's Git tab answer for its own repository on the first request,
* which arrives while the session is still being resumed (see `resolveTarget`).
*
* It is equally authoritative about *how much* Git may write. Each request's
* file policy is resolved from the same session and carried on every command, so
* a write route runs under exactly the mode and workspace root that session
* already has — never under a deployment fallback that would refuse it. A session
* that is not live yet has no such policy to resolve, so its routes may read but
* never write.
*/
/** Route table, kept in one place so the two halves cannot drift. */
const ROUTES = {
	status: "/dsh-cool-git/api/status",
	log: "/dsh-cool-git/api/log",
	diff: "/dsh-cool-git/api/diff",
	commit: "/dsh-cool-git/api/commit",
	commitAll: "/dsh-cool-git/api/commit-all",
	message: "/dsh-cool-git/api/message",
	settings: "/dsh-cool-git/api/settings",
	settingsSave: "/dsh-cool-git/api/settings-save",
	modelEfforts: "/dsh-cool-git/api/model-efforts",
	branches: "/dsh-cool-git/api/branches",
	branchReport: "/dsh-cool-git/api/branch-report",
	branchCreate: "/dsh-cool-git/api/branch-create",
	branchDelete: "/dsh-cool-git/api/branch-delete",
	checkout: "/dsh-cool-git/api/checkout",
	merge: "/dsh-cool-git/api/merge",
	fetch: "/dsh-cool-git/api/fetch",
	pull: "/dsh-cool-git/api/pull",
	push: "/dsh-cool-git/api/push"
};
/** Object names Git accepts, and all a route will pass on to the command line. */
const OBJECT_NAME = /^[0-9a-f]{4,40}$/i;
/**
* Longest commit message a route hands to Git.
*
* A message is free-form text and Git itself bounds nothing here, so the bound
* is this route's: a request body is not a place to put a file.
*/
const MAX_MESSAGE_LENGTH = 1e4;
/**
* Most branches one delete request may name.
*
* The bound is the branch list's own: the dialog cannot show more rows than the
* Host lists, so a request naming more than this is not a selection anyone made.
*/
const MAX_DELETE_TARGETS = 200;
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
* Resolve the Workspace a settings request is about.
*
* The repository root is the identity of last resort: a deployment without a
* Workspace registry still has a directory, and the same directory must key the
* same choices whether the registry answered or not. When the registry can name
* a Workspace, its canonical path wins, because that is the path every session
* attached to that Workspace resolves to — including a session opened from a
* subdirectory of it.
*
* @param ctx - the Host plugin context.
* @param sessionId - the session the request named.
* @param target - the shell seam and the session's directory.
* @returns the key and the Workspace, or the refusal to report.
*/
async function resolveSettingsTarget(ctx, sessionId, target) {
	const root = await readRepositoryRoot(target);
	if ("refusal" in root) return {
		ok: false,
		refusal: root.refusal,
		reason: root.reason
	};
	const workspace = await resolveWorkspace(ctx, sessionId, root.root);
	return {
		ok: true,
		key: workspace?.path === void 0 || workspace.path === "" ? root.root : workspace.path,
		...workspace === void 0 ? {} : { workspace }
	};
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
* Read one identifier naming a model route.
*
* The shape is the one a stored `MessageModel` accepts: a non-empty string under
* the same length ceiling settings uses, with no NUL. Whether the route exists is
* the `llm` service's answer, not this half's — a route this deployment no longer
* mounts still has to be asked about, because a saved choice may name it.
*
* @param value - the field as the body carried it.
* @returns the identifier, or undefined when the body does not name one.
*/
function readIdentifier(value) {
	if (typeof value !== "string" || value === "" || value.length > 200) return void 0;
	if (value.includes("\0")) return void 0;
	return value;
}
/**
* Read one ref name out of a request, under whatever key the caller read it from.
*
* The shape checked here is only about what can be handed to the shell at all:
* a ref name cannot be empty, cannot be longer than Git's own ceiling, cannot
* carry a NUL, and cannot begin with a dash — the last one because the commands
* this half runs take some of their arguments positionally, where a name that
* looks like an option would be read as one. Whether the branch exists is Git's
* answer, not this half's.
*
* @param value - the field as the body carried it.
* @returns the name, or undefined when it is not one a command line may carry.
*/
function readRefName(value) {
	if (typeof value !== "string" || value === "" || value.length > 255) return void 0;
	if (value.includes("\0") || value.startsWith("-")) return void 0;
	return value;
}
/**
* Read one request's branch argument.
*
* @param body - the parsed request body.
* @returns the branch name, or undefined when the body names none.
*/
function readBranch(body) {
	return readRefName(body.branch);
}
/**
* Read one request's list of branches to delete.
*
* Each entry is echoed back in the shape the delete dialog read it in — which
* list the row came from, and for a remote-tracking row the remote and branch it
* was split into — so nothing here re-derives a name from a string and no name
* the page showed can differ from the one that is deleted. An entry that does
* not fit that shape fails the whole request rather than being skipped: a
* deletion list that quietly lost a member is the one answer this route must
* never give.
*
* The bound is the branch list's own, so a request can never name more branches
* than the dialog could have shown.
*
* @param body - the parsed request body.
* @returns the targets, or undefined when the body does not carry a valid list.
*/
function readTargets(body) {
	const raw = body.targets;
	if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_DELETE_TARGETS) return void 0;
	const targets = [];
	for (const item of raw) {
		if (typeof item !== "object" || item === null) return void 0;
		const record = item;
		const name = readRefName(record.name);
		if (name === void 0) return void 0;
		if (record.kind === "local") {
			targets.push({
				name,
				kind: "local"
			});
			continue;
		}
		if (record.kind !== "remote") return void 0;
		const remote = readRefName(record.remote);
		const branch = readRefName(record.branch);
		if (remote === void 0 || branch === void 0) return void 0;
		targets.push({
			name,
			kind: "remote",
			remote,
			branch
		});
	}
	return targets;
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
		route(ROUTES.message, (req, res) => handle(ctx, req, res, "read", (body, target) => generateCommitMessage(ctx, target, typeof body.sessionId === "string" ? body.sessionId : void 0))),
		route(ROUTES.settings, (req, res) => handle(ctx, req, res, "read", async (body, target) => {
			const resolved = await resolveSettingsTarget(ctx, body.sessionId, target);
			if (resolved.ok !== true) return {
				ok: false,
				...resolved.refusal,
				reason: resolved.reason
			};
			const [saved, groups] = await Promise.all([readWorkspaceSettings(ctx, resolved.key), readModelGroups(ctx)]);
			const defaultModel = defaultSelection(ctx);
			return {
				ok: true,
				...resolved.workspace === void 0 ? {} : { workspace: resolved.workspace },
				model: saved.model ?? null,
				prompt: saved.prompt ?? null,
				defaultModel: defaultModel ?? null,
				defaultPrompt: DEFAULT_MESSAGE_PROMPT,
				groups
			};
		})),
		route(ROUTES.settingsSave, (req, res) => handle(ctx, req, res, "read", async (body, target) => {
			const resolved = await resolveSettingsTarget(ctx, body.sessionId, target);
			if (resolved.ok !== true) return {
				ok: false,
				...resolved.refusal,
				reason: resolved.reason
			};
			const model = readModelChoice(body.model);
			if (model.ok !== true) return {
				ok: false,
				error: "invalid model selection"
			};
			const prompt = readPromptChoice(body.prompt);
			if (prompt.ok !== true) return {
				ok: false,
				error: "invalid prompt"
			};
			await saveWorkspaceSettings(ctx, resolved.key, {
				...model.value === void 0 ? {} : { model: model.value },
				...prompt.value === void 0 ? {} : { prompt: prompt.value }
			});
			return { ok: true };
		})),
		route(ROUTES.modelEfforts, async (req, res) => {
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
			const provider = readIdentifier(body.provider);
			const model = readIdentifier(body.model);
			if (provider === void 0 || model === void 0) {
				sendJson(res, 200, {
					ok: false,
					error: "invalid model route"
				});
				return;
			}
			sendJson(res, 200, await readModelEfforts(ctx, provider, model));
		}),
		route(ROUTES.checkout, (req, res) => handle(ctx, req, res, "write", (body, target) => {
			const branch = readBranch(body);
			if (branch === void 0) return Promise.resolve({
				ok: false,
				...coded("missing-branch")
			});
			return switchBranch(target, branch);
		})),
		route(ROUTES.branchReport, (req, res) => handle(ctx, req, res, "read", (_body, target) => readBranchReport(target))),
		route(ROUTES.branchCreate, (req, res) => handle(ctx, req, res, "write", (body, target) => {
			const name = readRefName(body.name);
			if (name === void 0) return Promise.resolve({
				ok: false,
				...coded("missing-name")
			});
			const start = readRefName(body.start);
			if (start === void 0) return Promise.resolve({
				ok: false,
				...coded("missing-branch")
			});
			return createBranch(target, name, start);
		})),
		route(ROUTES.branchDelete, (req, res) => handle(ctx, req, res, "write", (body, target) => {
			const targets = readTargets(body);
			if (targets === void 0) return Promise.resolve({
				ok: false,
				...coded("missing-branch")
			});
			return deleteBranches(target, targets);
		})),
		route(ROUTES.merge, (req, res) => handle(ctx, req, res, "write", (body, target) => {
			const branch = readBranch(body);
			if (branch === void 0) return Promise.resolve({
				ok: false,
				...coded("missing-branch")
			});
			return mergeBranch(target, branch);
		})),
		route(ROUTES.fetch, (req, res) => handle(ctx, req, res, "write", (_body, target) => fetchRemotes(target))),
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
