import { existsSync } from "node:fs";
import { lstat, mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
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
/**
* This bundle's own package name.
*
* The update row on the plugin's detail page is about one package and installs
* that package, so the name is stated once here rather than read back from the
* page's subject: the subject names whichever bundle the reader opened, and only
* the package itself may be upgraded from its own page.
*/
const PACKAGE_NAME = "dsh-cool-git";
/**
* The routes both halves address, in one table.
*
* The browser half posts to these paths and the Host half registers them, so the
* table lives in the shared contract rather than in either half's module: a
* rename here reaches both halves at once instead of leaving one calling a route
* the other no longer serves. The prefix is this package's own because an
* out-of-tree bundle cannot claim a namespace on the shared origin any other way.
*/
const ROUTES = {
	status: "/dsh-cool-git/api/status",
	log: "/dsh-cool-git/api/log",
	diff: "/dsh-cool-git/api/diff",
	commit: "/dsh-cool-git/api/commit",
	commitAll: "/dsh-cool-git/api/commit-all",
	commitStaged: "/dsh-cool-git/api/commit-staged",
	undoCommit: "/dsh-cool-git/api/undo-commit",
	stage: "/dsh-cool-git/api/stage",
	unstage: "/dsh-cool-git/api/unstage",
	discard: "/dsh-cool-git/api/discard",
	stageFolder: "/dsh-cool-git/api/stage-folder",
	unstageFolder: "/dsh-cool-git/api/unstage-folder",
	discardFolder: "/dsh-cool-git/api/discard-folder",
	stageAll: "/dsh-cool-git/api/stage-all",
	unstageAll: "/dsh-cool-git/api/unstage-all",
	discardAll: "/dsh-cool-git/api/discard-all",
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
	conflict: "/dsh-cool-git/api/conflict",
	resolve: "/dsh-cool-git/api/resolve",
	resolveDone: "/dsh-cool-git/api/resolve-done",
	mergeCommit: "/dsh-cool-git/api/merge-commit",
	fetch: "/dsh-cool-git/api/fetch",
	fetchUpstream: "/dsh-cool-git/api/fetch-upstream",
	pull: "/dsh-cool-git/api/pull",
	push: "/dsh-cool-git/api/push",
	update: "/dsh-cool-git/api/update",
	updateApply: "/dsh-cool-git/api/update-apply"
};
//#endregion
//#region src/shared/error.ts
/**
* One caught value as the text a payload or a route reports.
*
* Both halves catch values they did not throw — a transport failure in the
* browser, a seam, route, or adapter failure on the Host — and both state the
* failure as text. A caught value is not necessarily an `Error`, so its message
* is read when it has one and the value is stringified otherwise.
*/
/**
* Read one caught value as text.
*
* @param error - the caught value.
* @returns its message, or the value itself as a string.
*/
function errorMessage(error) {
	return error instanceof Error ? error.message : String(error);
}
//#endregion
//#region src/host/conflict.ts
/**
* Longest file this module will parse, in bytes.
*
* A conflicted file is a source file, and one larger than this is not something
* a reader resolves block by block anyway. Past the bound the path is answered
* as binary — no markers, so the whole-file choice is the only one offered —
* which is honest and still leaves the reader a way through.
*/
const MAX_CONFLICT_BYTES = 4 * 1024 * 1024;
/** How much of a file is sniffed for a NUL byte, which is what makes it binary. */
const BINARY_SNIFF_BYTES = 8e3;
/** Shortest run of marker characters Git writes; a longer run is accepted too. */
const MARKER_LENGTH = 7;
/** The four characters a marker line can begin with. */
const OPEN_BYTE = 60;
const BASE_BYTE = 124;
const SEP_BYTE = 61;
const CLOSE_BYTE = 62;
const NEWLINE = 10;
const CARRIAGE_RETURN = 13;
/** Decode bytes as UTF-8, which is only ever done for display and for labels. */
const DECODER = new TextDecoder("utf-8", { fatal: false });
/**
* Split a buffer into lines, keeping each line's terminator in its range.
*
* A file whose last line has no terminator still gets a range for it: the block
* a resolution splices is defined by bytes, and a trailing line is as much a
* byte range as any other.
*
* @param bytes - the file's content.
* @returns one range per line, in order.
*/
function splitLines(bytes) {
	const lines = [];
	let start = 0;
	for (let index = 0; index < bytes.length; index += 1) {
		if (bytes[index] !== NEWLINE) continue;
		lines.push({
			start,
			end: index + 1
		});
		start = index + 1;
	}
	if (start < bytes.length) lines.push({
		start,
		end: bytes.length
	});
	return lines;
}
/**
* Where one line's content ends, with its terminator and any `\r` removed.
*
* @param bytes - the file's content.
* @param line - the line's range.
* @returns the index one past the line's last content byte.
*/
function contentEnd(bytes, line) {
	let end = line.end;
	if (end > line.start && bytes[end - 1] === NEWLINE) end -= 1;
	if (end > line.start && bytes[end - 1] === CARRIAGE_RETURN) end -= 1;
	return end;
}
/**
* Decode one byte range as text, for display only.
*
* @param bytes - the file's content.
* @param start - the range's first byte.
* @param end - one past the range's last byte.
* @returns the decoded text.
*/
function textOf(bytes, start, end) {
	return DECODER.decode(bytes.subarray(start, end));
}
/**
* Read one line as a conflict marker, when it is one.
*
* A marker is a run of at least seven identical characters at the start of the
* line: `<` opens a block, `|` opens its merge base (diff3 style), `=` separates
* the sides, and `>` closes it. The run must be exactly the marker's own
* character, so a line of source that merely starts with `<<<<<<<` plus text is
* still read as a marker — which is what Git writes, and what a reader who
* pasted one in would expect.
*
* `=======` takes no label; the other three carry the name Git put there
* (`HEAD`, a branch, a short hash with its subject).
*
* @param bytes - the file's content.
* @param line - the line to read.
* @returns the marker, or null for an ordinary line.
*/
function markerOf(bytes, line) {
	const end = contentEnd(bytes, line);
	const first = bytes[line.start];
	if (first !== OPEN_BYTE && first !== BASE_BYTE && first !== SEP_BYTE && first !== CLOSE_BYTE) return null;
	let cursor = line.start;
	while (cursor < end && bytes[cursor] === first) cursor += 1;
	if (cursor - line.start < MARKER_LENGTH) return null;
	const label = textOf(bytes, cursor, end).trim();
	switch (first) {
		case OPEN_BYTE: return {
			kind: "open",
			label
		};
		case BASE_BYTE: return {
			kind: "base",
			label
		};
		case CLOSE_BYTE: return {
			kind: "close",
			label
		};
		default: return label === "" ? {
			kind: "sep",
			label: ""
		} : null;
	}
}
/**
* Hash one region's identity, position included.
*
* The page sends this key back with a choice, and the Host refuses a key the
* file no longer holds — so a file an editor (or an agent) rewrote between the
* read and the click cannot turn that click into a splice at the wrong offset.
* The region's ordinal is part of the hash so that two byte-identical blocks in
* one file are still two different keys.
*
* The hash is a plain FNV-1a pair rather than a cryptographic digest: it is
* compared for equality within one file and never stored, and it must be the
* same in the half that computes it and the half that echoes it, which is the
* same half here.
*
* @param ordinal - the region's position among the file's regions.
* @param bytes - the whole block's bytes, markers included.
* @returns sixteen hexadecimal characters.
*/
function regionKey(ordinal, bytes) {
	let left = 2166136261;
	let right = 16777619;
	const mix = (value) => {
		left = Math.imul(left ^ value, 16777619) >>> 0;
		right = Math.imul(right + value, 2246822507) >>> 0;
	};
	mix(ordinal & 255);
	mix(ordinal >>> 8 & 255);
	for (let index = 0; index < bytes.length; index += 1) mix(bytes[index] ?? 0);
	return `${left.toString(16).padStart(8, "0")}${right.toString(16).padStart(8, "0")}`;
}
/**
* Turn a run of lines into the display strings a block carries.
*
* @param bytes - the file's content.
* @param lines - the lines to decode.
* @returns one string per line, without its terminator.
*/
function linesOf(bytes, lines) {
	return lines.map((line) => textOf(bytes, line.start, contentEnd(bytes, line)));
}
/**
* Parse every conflict block a file holds.
*
* A malformed block — an opening marker with no separator or no closing marker
* after it — is left as ordinary text rather than guessed at: the file is the
* reader's, and half a block is not something to rewrite. A later, well-formed
* block after it is still found, because the scan simply moves past the line it
* could not use.
*
* @param bytes - the file's content.
* @returns the blocks, the regions' byte layout, and the marker style.
*/
function parseConflict(bytes) {
	const lines = splitLines(bytes);
	const blocks = [];
	const regions = [];
	let style = "merge";
	let contextStart = 0;
	let index = 0;
	while (index < lines.length) {
		const open = markerOf(bytes, lines[index]);
		if (open === null || open.kind !== "open") {
			index += 1;
			continue;
		}
		let baseLine = -1;
		let separatorLine = -1;
		let closeLine = -1;
		let baseMarker = null;
		let closeMarker = null;
		for (let probe = index + 1; probe < lines.length; probe += 1) {
			const marker = markerOf(bytes, lines[probe]);
			if (marker === null) continue;
			if (marker.kind === "open" && separatorLine < 0) break;
			if (marker.kind === "base" && baseLine < 0 && separatorLine < 0) {
				baseLine = probe;
				baseMarker = marker;
			} else if (marker.kind === "sep" && separatorLine < 0) separatorLine = probe;
			else if (marker.kind === "close" && separatorLine >= 0) {
				closeLine = probe;
				closeMarker = marker;
				break;
			}
		}
		if (separatorLine < 0 || closeLine < 0) {
			index += 1;
			continue;
		}
		const context = lines.slice(contextStart, index);
		if (context.length > 0) blocks.push({
			kind: "context",
			lines: linesOf(bytes, context)
		});
		const oursLines = lines.slice(index + 1, baseLine >= 0 ? baseLine : separatorLine);
		const baseLines = baseLine >= 0 ? lines.slice(baseLine + 1, separatorLine) : [];
		const theirsLines = lines.slice(separatorLine + 1, closeLine);
		const start = lines[index]?.start ?? 0;
		const end = lines[closeLine]?.end ?? start;
		const key = regionKey(regions.length, bytes.subarray(start, end));
		if (baseLines.length > 0) style = "diff3";
		regions.push({
			key,
			start,
			end,
			ours: oursLines,
			theirs: theirsLines,
			base: baseLines
		});
		const region = {
			key,
			ours: linesOf(bytes, oursLines),
			theirs: linesOf(bytes, theirsLines),
			...baseLines.length === 0 ? {} : { base: linesOf(bytes, baseLines) },
			...open.label === "" ? {} : { oursLabel: open.label },
			...baseMarker === null || baseMarker.label === "" ? {} : { baseLabel: baseMarker.label },
			...closeMarker === null || closeMarker.label === "" ? {} : { theirsLabel: closeMarker.label }
		};
		blocks.push({
			kind: "region",
			...region
		});
		index = closeLine + 1;
		contextStart = index;
	}
	const trailing = lines.slice(contextStart);
	if (trailing.length > 0) blocks.push({
		kind: "context",
		lines: linesOf(bytes, trailing)
	});
	return {
		blocks,
		regions,
		style
	};
}
/**
* Whether a file looks binary, which is what decides there are no markers to
* read.
*
* The test is a NUL byte in the file's first few kilobytes — the same rule Git
* applies — because a conflicted binary file has no textual content to choose
* between and its whole version is the only choice available.
*
* @param bytes - the file's content.
* @returns true when the content is not text.
*/
function isBinary(bytes) {
	const limit = Math.min(bytes.length, BINARY_SNIFF_BYTES);
	for (let index = 0; index < limit; index += 1) if (bytes[index] === 0) return true;
	return false;
}
/**
* Describe one conflicted path as the page renders it.
*
* Two facts decide that there is nothing to choose block by block, and both are
* read here rather than left to the page. One is the content: binary data,
* anything too large to parse, and a path that is not a regular file at all have
* no markers to find. The other is the index: when one of the two sides has no
* stage, the conflict is a delete/modify or an add/add across a missing side —
* and Git may well have left a marker-free copy of the other side in the
* working tree while doing it. That copy parses as "clean", which is exactly the
* wrong thing to say: staging it would be a decision the reader never made, and
* the side that deleted the path would be silently outvoted.
*
* @param path - the repository-relative path.
* @param bytes - the working-tree file, or null when the path has none.
* @param stages - which index stages the path still holds.
* @param binary - whether the path is one with no text to resolve block by block.
* @returns the document the pane draws.
*/
function describeConflict(path, bytes, stages, binary = false) {
	const oneSided = !stages.ours || !stages.theirs;
	if (binary || bytes !== null && (bytes.length > MAX_CONFLICT_BYTES || isBinary(bytes))) return {
		path,
		blocks: [],
		regions: 0,
		style: "merge",
		binary: true,
		stages,
		state: "binary"
	};
	if (bytes === null || oneSided) return {
		path,
		blocks: [],
		regions: 0,
		style: "merge",
		binary: false,
		stages,
		state: "missing"
	};
	const parsed = parseConflict(bytes);
	return {
		path,
		blocks: parsed.blocks,
		regions: parsed.regions.length,
		style: parsed.style,
		binary: false,
		stages,
		state: parsed.regions.length === 0 ? "clean" : "regions"
	};
}
/**
* Apply a set of choices to a parsed file, and return its new bytes.
*
* Every key must still name a region the file holds, and no key may be used
* twice; a request that fails either test is answered with null rather than
* partially applied, because a half-applied resolution is a file the reader did
* not ask for. The caller turns that into the "this file changed" answer.
*
* A choice replaces the block *including its marker lines*, which is why the
* replacement is made of the side's original byte ranges: the text that lands in
* the file is exactly the text that was in it, terminators and all.
*
* @param bytes - the file's current content.
* @param parsed - the parse of those same bytes.
* @param resolutions - the choices, in any order.
* @returns the new content, or null when a key no longer matches.
*/
function applyResolutions(bytes, parsed, resolutions) {
	const remaining = new Map(parsed.regions.map((region) => [region.key, region]));
	const picked = [];
	for (const resolution of resolutions) {
		const region = remaining.get(resolution.key);
		if (region === void 0) return null;
		remaining.delete(resolution.key);
		picked.push({
			region,
			choice: resolution.choice
		});
	}
	picked.sort((left, right) => left.region.start - right.region.start);
	const chunks = [];
	let cursor = 0;
	for (const { region, choice } of picked) {
		if (region.start < cursor) return null;
		chunks.push(bytes.subarray(cursor, region.start));
		chunks.push(...replacement(bytes, region, choice));
		cursor = region.end;
	}
	chunks.push(bytes.subarray(cursor));
	const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
	const output = new Uint8Array(total);
	let offset = 0;
	for (const chunk of chunks) {
		output.set(chunk, offset);
		offset += chunk.length;
	}
	return output;
}
/**
* The bytes one choice puts in place of a block.
*
* `base` on a file with no merge base (a `merge`-style conflict) falls back to
* keeping both sides, which is the closest thing to "neither of the two edits
* alone" that the file can express.
*
* @param bytes - the file's content, which the ranges point into.
* @param region - the block being replaced.
* @param choice - what to keep.
* @returns the byte ranges to splice in, in order.
*/
function replacement(bytes, region, choice) {
	const take = (spans) => spans.map((span) => bytes.subarray(span.start, span.end));
	switch (choice) {
		case "ours": return take(region.ours);
		case "theirs": return take(region.theirs);
		case "base": return region.base.length > 0 ? take(region.base) : [...take(region.ours), ...take(region.theirs)];
		case "both": return [...take(region.ours), ...take(region.theirs)];
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
/** Wall-clock bound per Git invocation; a hung command is killed, not waited on. */
const GIT_TIMEOUT_MS = 2e4;
/**
* The exit code Git uses for its own fatal refusals.
*
* `git rev-parse --show-toplevel` outside a repository is one of them, and it is
* the answer `resolveRepo` reads as "this directory has no repository". A
* command that never reached Git — no `git` on `PATH` — fails to spawn at all,
* so an exit code is always Git's own answer here.
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
* A fetch or a push legitimately takes longer than a local read —a slow remote
* or a large pack is not a hung command —so the local bound would kill a
* transfer that was still making progress.
*/
const GIT_NETWORK_TIMEOUT_MS = 18e4;
/** Largest patch the Host collects; beyond this the answer is flagged truncated. */
const MAX_STDOUT_BYTES = 4 * 1024 * 1024;
/** Upper bound on commits per request, so one call cannot walk a whole history. */
const MAX_LOG_LIMIT = 300;
/**
* What Git prints when it refuses to touch a working tree that is not clean.
*
* `checkout`, `pull` and `push` each word the refusal their own way, and the page
* has one sentence per action for it, so the three spellings are one pattern.
*/
const DIRTY_WORKTREE = /local changes|would be overwritten|commit your changes or stash/i;
/**
* What Git prints when a switch cannot run because another operation is mid-flight.
*
* A merge, a rebase, or a cherry-pick has the index in a state no checkout may
* disturb, and Git refuses with its own advice rather than with the local-changes
* wording above. The reader's answer is the same either way — finish or abandon
* what is in flight — so it is read as the same refusal.
*/
const UNFINISHED_OPERATION = /you need to resolve your current index|cannot switch branch|You are in the middle of/i;
/**
* What Git prints when a merge could not be applied cleanly.
*
* A conflict is a state on disk rather than a mistake in the request, and it is
* the one merge answer the page words itself: the merge stays in the tree (see
* `mergeBranch`), so the sentence has to say that the conflicts are waiting to
* be resolved rather than that nothing happened. `git merge` prints one
* `CONFLICT` line per path and then a summary sentence; the summary alone is
* enough to recognize it.
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
* What Git prints when the remote refused the credentials this machine holds.
*
* Each transport words it differently —HTTPS asks for a username a
* non-interactive session cannot supply, SSH names the key it could not use —?
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
* has no force to offer —restating it is what keeps the page from advertising a
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
/**
* The status invocation both the sidebar and the message generator start from.
*
* `--branch` adds the `## ...` header as the first NUL-terminated record, and
* `--untracked-files=all` names every untracked file rather than collapsing each
* directory of them into one row. The digest ignores the header; it reads the
* same command so the two views of the tree cannot disagree.
*/
const STATUS_ARGS = [
	"status",
	"--porcelain=v1",
	"-z",
	"--branch",
	"--untracked-files=all"
];
/**
* The same read for the write routes, without the branch header.
*
* The folder and commit writers read the changed paths and nothing about the
* branch, so the record `--branch` adds would only be parsed and dropped.
*/
const STATUS_PATH_ARGS = [
	"status",
	"--porcelain=v1",
	"-z",
	"--untracked-files=all"
];
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
* A path as a pathspec that cannot be read as a pattern.
*
* Git pathspecs treat `*`, `?`, and `[` as wildcards, so a path that really
* contains one —a file named `a*.txt` —would otherwise name every file the
* pattern matches. `:(literal)` turns the rest of the word into a literal path,
* which is the only reading a path from `git status` should ever get: it is a
* name, not a pattern the page composed.
*
* @param path - the repository-relative path as `status` reported it.
* @returns the literal pathspec for it.
*/
function literalPath(path) {
	return `:(literal)${path}`;
}
/**
* How long a killed Git process may take to settle before its result is read as
* killed. The substrate performs the same graceful-then-forced escalation, so a
* Git process that ignores the first signal still cannot hold a route open.
*/
const GRACE_MS = 2e3;
/**
* Environment every invocation runs with.
*
* `GIT_OPTIONAL_LOCKS` keeps read-only commands from rewriting `.git/index`
* behind an `index.lock`, so a `status` or `diff` this plugin runs can never
* fail an Agent's own `git add` that happens to overlap it. `GIT_TERMINAL_PROMPT`
* turns a credential prompt into a failed fetch instead of a hung process, since
* nothing here can answer one. The colour and pager pins keep the parsed output
* free of escape sequences and make a `PAGER` inherited from the environment
* irrelevant. `TERM` is a POSIX concept: Windows does not read it.
*/
const GIT_ENV = {
	NO_COLOR: "1",
	PAGER: "cat",
	GIT_PAGER: "cat",
	GIT_OPTIONAL_LOCKS: "0",
	GIT_TERMINAL_PROMPT: "0",
	...process.platform === "win32" ? {} : { TERM: "dumb" }
};
/** Largest stderr the direct path retains; a diagnosis is one short line. */
const MAX_STDERR_BYTES = 64 * 1024;
/** Largest spill file one direct stream may leave behind, when truncated. */
const MAX_SPILL_BYTES = 8 * 1024 * 1024;
/**
* Read one collected stream without letting a provider fault escape.
*
* The seam's readers answer `readFrom(0)` for the whole collected stream, and a
* provider that cannot produce it must read as "no output" rather than as a
* rejected route: the command itself may already have succeeded.
*
* @param reader - the collected reader, as the substrate exposed it.
* @returns the stream's text and whether it was truncated.
*/
function collectedText(reader) {
	try {
		const read = typeof reader?.readFrom === "function" ? reader.readFrom(0) : void 0;
		return {
			text: typeof read?.text === "string" ? read.text : "",
			lossy: read?.lossy === true
		};
	} catch {
		return {
			text: "",
			lossy: false
		};
	}
}
/**
* Run one argv on the request's process substrate and collect its result.
*
* There is exactly one way to run Git: spawn it as an argv. No shell parses the
* line, no sandbox wraps the process, and no interpreter sits in front of the
* executable —which is what makes a command cost a few tens of milliseconds
* rather than most of a second on Windows.
*
* @param target - the substrate and the directory.
* @param words - the executable and its arguments.
* @param options - the bound, standard input, and environment for it.
* @returns the invocation's outcome; never rejects.
*/
async function invoke(target, words, options = {}) {
	const subprocess = target.subprocess;
	if (subprocess === void 0 || typeof subprocess.spawn !== "function") return failureRun("the subprocess service is unavailable, so Git cannot run");
	let handle;
	try {
		handle = subprocess.spawn({
			argv: [...words],
			cwd: target.workdir,
			stdio: {
				stdin: options.stdin === void 0 ? "ignore" : { data: options.stdin },
				stdout: {
					maxBytes: MAX_STDOUT_BYTES,
					spill: { maxBytes: MAX_SPILL_BYTES }
				},
				stderr: {
					maxBytes: MAX_STDERR_BYTES,
					spill: { maxBytes: MAX_SPILL_BYTES }
				}
			},
			graceMs: GRACE_MS,
			env: {
				...GIT_ENV,
				...options.env
			}
		});
	} catch (error) {
		return failureRun(errorMessage(error));
	}
	const readers = handle?.collected;
	if (typeof handle?.done?.then !== "function" || readers === void 0) {
		try {
			handle?.terminate?.();
		} catch {}
		return failureRun("the subprocess service returned no readable process handle");
	}
	const timeoutMs = options.timeoutMs ?? GIT_TIMEOUT_MS;
	let timedOut = false;
	const timer = setTimeout(() => {
		timedOut = true;
		try {
			handle.terminate();
		} catch {}
	}, Math.max(1, timeoutMs));
	try {
		const outcome = await handle.done;
		const stdout = collectedText(readers.stdout);
		const stderr = collectedText(readers.stderr);
		return {
			code: typeof outcome?.exitCode === "number" ? outcome.exitCode : null,
			stdout: stdout.text,
			stderr: stderr.text,
			truncated: stdout.lossy
		};
	} catch (error) {
		if (timedOut) {
			const stdout = collectedText(readers.stdout);
			const stderr = collectedText(readers.stderr);
			return {
				code: null,
				stdout: stdout.text,
				stderr: stderr.text,
				truncated: stdout.lossy
			};
		}
		return failureRun(errorMessage(error));
	} finally {
		clearTimeout(timer);
	}
}
/**
* Run one Git command and collect its result.
*
* The outcome is returned as it came back rather than judged here: which exit
* codes are a normal answer differs per command, and every caller reads them
* itself.
*
* @param target - the substrate and the directory.
* @param args - subcommand and arguments.
* @param options - the bound, standard input, and environment for it.
* @returns the invocation's outcome; never rejects.
*/
async function runGit(target, args, options = {}) {
	return invoke(target, [
		"git",
		"--no-pager",
		"-c",
		"core.quotePath=false",
		...args
	], options);
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
* nothing to say there —a `pull` that refuses a divergence prints its advice on
* stdout —so the two are read in that order.
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
* Git writes its diagnosis to stderr; only a command that said nothing at all is
* coded, because every other refusal is Git's own first line, which is more
* specific than anything this half could invent and cannot be translated.
*
* @param run - the failed invocation.
* @returns the coded refusal, or the text Git printed.
*/
function refusalOf(run) {
	const text = diagnosticText(run);
	if (text === "") return coded("git-exit", { code: run.code ?? "null" });
	return { error: text.split("\n")[0] ?? text };
}
/**
* The refusal a credential problem amounts to, when the diagnosis is one.
*
* Every route that can cross the network shares this, because Git words the same
* failure for a fetch, a pull, a push, and a remote delete.
*
* @param text - Git's own diagnosis of the failed invocation.
* @returns the coded refusal, or null when the failure is not about credentials.
*/
function authRefusal(text) {
	if (AUTH_FAILURE.test(text)) return coded("auth");
	return null;
}
/**
* Resolve the repository that owns `workdir` and whether it has any commit.
*
* `--show-toplevel` is what makes the rest of the module simple: every later
* path is relative to a root Git itself named, not to a directory this plugin
* guessed, and a directory with no repository is answered as such instead of
* surfacing `fatal: not a git repository` as an error.
*
* @param target - the substrate and the session's directory.
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
		])).code === 0
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
* @param target - the process substrate and the session's directory.
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
* @param target - the process substrate and the session's directory.
* @returns the status payload the page renders its sidebar from.
*/
async function readStatus(target) {
	const repo = await resolveRepo(target);
	if ("refusal" in repo) return {
		ok: false,
		...repo.refusal,
		reason: repo.reason
	};
	const root = inDir(target, repo.root);
	const [status, log, operation] = await Promise.all([
		runGit(root, STATUS_ARGS),
		repo.hasHead ? runGit(root, [
			"log",
			"-1",
			`--pretty=format:${HEAD_FORMAT}`
		]) : Promise.resolve(void 0),
		readOperation(root)
	]);
	if (status.code !== 0) return {
		ok: false,
		...refusalOf(status),
		reason: "error"
	};
	const parsed = parseStatus(status.stdout);
	let head = null;
	if (log !== void 0 && log.code === 0) {
		const [hash = "", short = "", date = "", subject = ""] = log.stdout.split(FIELD);
		head = {
			hash,
			short,
			date,
			subject
		};
	}
	const mergeMessage = operation === "merge" ? await readMergeMessage(root) : void 0;
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
		files: parsed.files,
		...operation === void 0 ? {} : { operation },
		...mergeMessage === void 0 ? {} : { mergeMessage }
	};
}
/**
* Which multi-step operation the repository is in the middle of, if any.
*
* Git records each one as a file (or directory) in its own directory, and names
* the path itself through `--git-path`, which is what makes the read correct in
* a worktree or a submodule where `.git` is a file rather than a directory. One
* invocation asks for all four because they are one question — the page has one
* banner, not four — and the answer is whichever marker exists.
*
* A rebase has two spellings: the interactive/merge backend keeps a directory
* (`rebase-merge`) and the older apply backend keeps another (`rebase-apply`).
* Both mean the same thing to the page.
*
* @param root - the repository root and the process substrate.
* @returns the operation, or undefined when the repository is at rest.
*/
async function readOperation(root) {
	const paths = await runGit(root, [
		"rev-parse",
		"--git-path",
		"MERGE_HEAD",
		"--git-path",
		"rebase-merge",
		"--git-path",
		"rebase-apply",
		"--git-path",
		"CHERRY_PICK_HEAD"
	]);
	if (paths.code !== 0) return void 0;
	const [merge, rebaseMerge, rebaseApply, cherryPick] = paths.stdout.split("\n");
	if (markerExists(root, merge)) return "merge";
	if (markerExists(root, rebaseMerge) || markerExists(root, rebaseApply)) return "rebase";
	if (markerExists(root, cherryPick)) return "cherry-pick";
}
/**
* Whether one `--git-path` answer names a marker that exists in this worktree.
*
* `--git-path` answers with the path Git itself would read, relative to the
* worktree root (or absolute, when the worktree lives elsewhere), and an absent
* marker is an empty answer rather than an error. The existence check is the
* only question asked: the marker's content never matters, only that Git wrote
* one.
*
* @param root - the repository root and the process substrate.
* @param path - the path `--git-path` answered with, when it answered.
* @returns true when that path exists.
*/
function markerExists(root, path) {
	return path !== void 0 && path !== "" && existsSync(resolve(root.workdir, path));
}
/**
* The message a merge already has, cleaned the way Git cleans it.
*
* `MERGE_MSG` is written when the merge starts and is the message the commit
* would carry: Git's own `Merge branch 'feat' into main`, a body when one was
* passed, and the `# Conflicts:` block it notes the unresolved paths under. The
* page shows the same words in the commit form VSCode does, so the reader sees
* what is about to be recorded instead of being told a merge is in progress.
*
* The file's path comes from `--git-path`, which is correct in a worktree and a
* submodule, and its text goes through `git stripspace --strip-comments` rather
* than through a rule of this module's own: the comment block is Git's, and the
* character that marks it is `core.commentChar`, which the same command honours.
* A merge whose file cannot be read or cleaned answers `undefined` — the form
* then opens empty, which is exactly the state it has before Git wrote anything.
*
* @param root - the repository root and the process substrate.
* @returns the cleaned message, or undefined when there is none to show.
*/
async function readMergeMessage(root) {
	const located = await runGit(root, [
		"rev-parse",
		"--git-path",
		"MERGE_MSG"
	]);
	if (located.code !== 0) return void 0;
	const path = located.stdout.trim();
	if (path === "") return void 0;
	let text;
	try {
		text = await readFile(isAbsolute(path) ? path : resolve(root.workdir, path), "utf8");
	} catch {
		return;
	}
	const cleaned = await runGit(root, ["stripspace", "--strip-comments"], { stdin: text });
	if (cleaned.code !== 0) return void 0;
	const message = cleaned.stdout.trim();
	return message === "" ? void 0 : message;
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
* @param target - the process substrate and the session's directory.
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
	const log = await runGit(inDir(target, repo.root), [
		"log",
		"-z",
		`--max-count=${clampLimit(limit)}`,
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
* @param target - the process substrate and the session's directory.
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
	const root = inDir(target, repo.root);
	const meta = await runGit(root, [
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
	const patchRun = summary.parents.length === 0 ? await runGit(root, [
		"show",
		"--no-color",
		"--no-ext-diff",
		"-M",
		"--patch",
		"-U3",
		"--format=",
		hash
	]) : await runGit(root, [
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
	]);
	else if (file.side === "conflict") diff = await runGit(root, [
		"diff",
		"-M",
		...base,
		"--",
		literalPath(file.path)
	]);
	else if (file.side === "staged") diff = await runGit(root, [
		"diff",
		"--cached",
		"-M",
		...base,
		"--",
		literalPath(file.path)
	]);
	else diff = await runGit(root, [
		"diff",
		"-M",
		...base,
		"--",
		literalPath(file.path)
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
* sample is the evidence for that style: ten messages are enough for a pattern —?
* a tag, a language, a body —to show, and few enough to stay a footnote beside
* the patch.
*/
const STYLE_SAMPLE_COMMITS = 10;
/**
* Longest one sampled message may be, in characters.
*
* A message is a subject and usually a few lines; the bound is here so that one
* enormous body —a squashed release note, a template nobody trimmed —cannot
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
* HEAD to compare against, so the staged half is asked for by name —the index
* against the empty tree —and the unstaged half follows; the two are
* concatenated rather than merged because both are already in the same format
* and neither can name a path the other does not.
*
* @param root - the repository root and the process substrate.
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
* answer here —the two sides always differ, an empty file included —and the
* `--stat` line is asked for in the same invocation as the patch, because it is
* where a binary file's size appears and a second command would only repeat the
* same walk.
*
* A path whose read fails is left out of the previews: it stays on the list the
* prompt opens with, because `git status` named it, and the alternative —one
* unreadable file failing the whole request —would take the message away over a
* file the model was only ever going to look at.
*
* @param root - the repository root and the process substrate.
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
		]);
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
* other reason, reads as no sample —the generator then falls back to the commit
* rules, which is a better answer than taking the message away over a style it
* could not read.
*
* @param root - the repository root and the process substrate.
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
async function readChangeDigest(target, scope = "all") {
	const repo = await resolveRepo(target);
	if ("refusal" in repo) return {
		ok: false,
		refusal: repo.refusal,
		reason: repo.reason
	};
	const root = inDir(target, repo.root);
	const status = await runGit(root, STATUS_ARGS);
	if (status.code !== 0) return {
		ok: false,
		refusal: refusalOf(status),
		reason: "error"
	};
	const parsed = parseStatus(status.stdout).files;
	if (scope === "staged" && parsed.some((file) => file.conflicted)) return {
		ok: false,
		refusal: coded("commit-conflict"),
		reason: "error"
	};
	const files = scope === "staged" ? parsed.filter((file) => file.staged) : parsed;
	const recentMessages = await readRecentMessages(root, repo.hasHead);
	if (files.length === 0) return {
		ok: true,
		root: repo.root,
		scope,
		files,
		stat: "",
		patch: "",
		patchTruncated: false,
		untracked: [],
		recentMessages
	};
	const format = scope === "staged" ? ["--cached"] : [];
	const stat = scope === "staged" ? await runGit(root, [
		"diff",
		...format,
		"-M",
		"--no-color",
		"--no-ext-diff",
		"--stat"
	]) : await runTrackedDiff(root, repo.hasHead, ["--stat"]);
	if (stat.code !== 0) return {
		ok: false,
		refusal: refusalOf(stat),
		reason: "error"
	};
	const diff = scope === "staged" ? await runGit(root, [
		"diff",
		...format,
		"-M",
		"--no-color",
		"--no-ext-diff",
		"--unified=3"
	]) : await runTrackedDiff(root, repo.hasHead, ["--unified=3"]);
	if (diff.code !== 0) return {
		ok: false,
		refusal: refusalOf(diff),
		reason: "error"
	};
	const patch = cutAtLine(diff.stdout, MAX_DIGEST_PATCH_CHARS);
	return {
		ok: true,
		root: repo.root,
		scope,
		files,
		stat: stat.stdout.trim(),
		patch: patch.text,
		patchTruncated: patch.truncated || diff.truncated,
		untracked: scope === "staged" ? [] : await readUntrackedPreviews(root, files),
		recentMessages
	};
}
/**
* Read the short names under one ref namespace, newest commit date first.
*
* A projection over {@link readRefRecords} rather than a second walk: the switch
* list and the delete dialog must agree about which refs exist and which
* symbolic aliases are not branches, so they read the same records and only this
* reader narrows them to names.
*
* @param root - the repository root and the process substrate.
* @param namespace - the ref namespace to read, e.g. `refs/heads/`.
* @returns the short names, or why the read failed.
*/
async function readRefNames(root, namespace) {
	const records = await readRefRecords(root, namespace);
	if (!records.ok) return records;
	return {
		ok: true,
		names: records.records.map((record) => record.name),
		truncated: records.truncated
	};
}
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
async function readBranches(target) {
	const repo = await resolveRepo(target);
	if ("refusal" in repo) return {
		ok: false,
		...repo.refusal,
		reason: repo.reason
	};
	const root = inDir(target, repo.root);
	const [locals, remotes, current] = await Promise.all([
		readRefNames(root, "refs/heads/"),
		readRefNames(root, "refs/remotes/"),
		currentBranch(root)
	]);
	if (!locals.ok) return {
		ok: false,
		...locals.refusal,
		reason: "error"
	};
	if (!remotes.ok) return {
		ok: false,
		...remotes.refusal,
		reason: "error"
	};
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
* the way named.
*
* @param root - the repository root and the process substrate.
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
* @param root - the repository root and the process substrate.
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
* @param root - the repository root and the process substrate.
* @param ref - the full ref name to resolve.
* @returns true when the ref exists.
*/
async function refExists(root, ref) {
	return (await runGit(root, [
		"rev-parse",
		"--verify",
		"--quiet",
		ref
	])).code === 0;
}
/**
* The local branch name a remote-tracking ref is checked out as.
*
* Git's rule is to strip the remote name, and the remote names are the
* configured ones rather than a guess cut out of the ref: a remote may itself
* contain a slash, so the longest matching remote is the only correct answer.
* No match means no configured remote owns the ref —a stale directory left by a
* removed remote —and the caller states that rather than inventing a name.
*
* @param root - the repository root and the process substrate.
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
* —a stale directory left by a removed remote —which the caller states rather
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
	if (!DIRTY_WORKTREE.test(text) && !UNFINISHED_OPERATION.test(text)) return null;
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
* @param root - the repository root and the process substrate.
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
* A dirty working tree is worded with the switch's own sentence —the operation
* is a switch, and the paths Git named are the same paths —while the other two
* cases are this operation's own: a name taken between the check and the call,
* and a session that may not write.
*
* @param run - the failed invocation.
* @param name - the branch the request was creating.
* @returns the payload the page renders.
*/
function createFailure(run, name) {
	const text = diagnosticText(run);
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
* Read one ref namespace as records, newest commit date first.
*
* `--count` is asked for one more record than the cap, so a cut list can say
* that it was cut. `%00` is how the fields are kept apart inside a record
* (`%x1f` is expanded by `log --pretty` and not by `for-each-ref`; `%00` is),
* and a ref name can hold no NUL, so a record is exactly five fields.
*
* This is the one walk both branch readers use: the switch list takes the
* names, and the delete dialog takes the whole records.
*
* @param root - the repository root and the process substrate.
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
		if (records.length === 200) {
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
* This is half of `git branch -d`'s own rule —the other half is the branch's
* upstream —and it is asked as one walk rather than one `merge-base` per branch
* because the dialog's marks have to be drawn from a fixed number of calls.
*
* The answer is deliberately not cut at the list's own bound. A branch the page
* shows must be classified, and which branches a `--count` would keep depends on
* a sort that has nothing to do with which ones are merged, so a cut here would
* mark an arbitrary branch as unmerged. What comes back is one short name per
* line, which is the smallest answer this question has.
*
* @param root - the repository root and the process substrate.
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
* cannot be handed a full ref —a fully-qualified name is answered with "branch
* not found" —so this is the one place a name this half passes on is not
* already unambiguous.
*
* @param root - the repository root and the process substrate.
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
* @param root - the repository root and the process substrate.
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
	], { timeoutMs: GIT_NETWORK_TIMEOUT_MS });
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
* is standing on —the current one included —is the case the dialog disables.
* Both sentences name the branch, because a batch's answer is read one line at a
* time and a line that does not say which branch it is about is not an answer.
*
* @param run - the failed invocation.
* @param name - the branch the request was deleting.
* @returns the coded refusal, or Git's own first line.
*/
function deleteFailure(run, name) {
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
* everything else is Git's own first line —a missing ref, an unreachable host,
* a rejected hook —which is more specific than anything this half could invent.
*
* @param run - the failed push invocation.
* @param branch - the branch name on the remote, for the one refusal that names it.
* @returns the coded refusal, or Git's own first line.
*/
function remoteDeleteFailure(run, branch) {
	const text = diagnosticText(run);
	const auth = authRefusal(text);
	if (auth !== null) return auth;
	if (REMOTE_REF_MISSING.test(text)) return coded("unknown-branch", { name: branch });
	return refusalOf(run);
}
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
* half's own —which is also what keeps a name Git accepts from being refused by
* a rule that does not exist. A new branch's starting point is resolved by the
* same rule, so that resolution is reused here rather than restated.
*
* @param root - the repository root and the process substrate.
* @param name - the branch to judge.
* @returns true when a merge may name it as its source.
*/
async function mergeableRef(root, name) {
	return await startRef(root, name) !== null;
}
/**
* Merge one branch into the branch HEAD is on.
*
* `--no-edit` is what keeps this non-interactive: without it Git opens an editor
* for the merge commit's message, and no editor exists behind this seam.
*
* @param root - the repository root and the process substrate.
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
	if (await conflictedMerge(root, run)) return {
		ok: false,
		...coded("merge-conflict", { branch: source }),
		reason: "conflict"
	};
	return mergeFailure(run);
}
/**
* Whether a failed merge left conflicts behind, or never started one.
*
* The pattern is Git's own summary sentence, and the fallback asks the index: a
* merge that failed before touching the tree — a refused fast-forward, an
* unrelated history — has no unmerged paths, and that is the difference between
* "there is a merge in progress to resolve" and "nothing happened at all".
*
* @param root - the repository root and the process substrate.
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
* The one coded case is the one the page can act on: a working tree with local
* changes in the way. Everything
* else is Git's own first line —`refusing to merge unrelated histories` and
* friends —which is more specific than anything this half could invent.
*
* @param run - the failed merge invocation.
* @returns the payload the page renders.
*/
function mergeFailure(run) {
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
* Git says which of the three things happened in its own words —the two sides
* were already equal, one moved up to the other, or a commit joined them —and
* the page states that outcome as one line beside the branch it names.
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
* The stages one unmerged path still holds, or null when it is not unmerged.
*
* `ls-files -u` is the authority for this rather than `status`: it is the index
* itself, it names the stage of every entry, and its `-z` output is safe for any
* path. A path with no unmerged entries answers with no output at all, which is
* the one case the resolver must not write to — `git add` on it would mean
* something else entirely.
*
* @param root - the repository root and the process substrate.
* @param path - the repository-relative path.
* @returns which of base, ours, and theirs exist, or null when none does.
*/
async function conflictStages(root, path) {
	const listed = await runGit(root, [
		"ls-files",
		"-u",
		"-z",
		"--",
		literalPath(path)
	]);
	if (listed.code !== 0 || listed.stdout === "") return null;
	const stages = {
		base: false,
		ours: false,
		theirs: false
	};
	for (const record of listed.stdout.split("\0")) {
		const tab = record.indexOf("	");
		if (tab < 0) continue;
		const stage = record.slice(0, tab).split(" ")[2];
		if (stage === "1") stages.base = true;
		else if (stage === "2") stages.ours = true;
		else if (stage === "3") stages.theirs = true;
	}
	return stages.base || stages.ours || stages.theirs ? stages : null;
}
/**
* Whether the worktree entry at one path is a symlink.
*
* A conflicted symlink has no text to resolve: its content is the target path,
* and Git records it as mode `120000`. The page offers the whole-file choice for
* it, and this is what tells the two apart, because `lstat` is the only read that
* does not follow the link.
*
* @param workdir - the repository root.
* @param path - the repository-relative path.
* @returns true when the entry is a symlink.
*/
async function isSymlink(workdir, path) {
	try {
		return (await lstat(join(workdir, path))).isSymbolicLink();
	} catch {
		return false;
	}
}
/**
* Read one worktree file's bytes, or null when there is no regular file there.
*
* Bytes rather than text because a resolution splices what it did not choose
* back into the file unchanged, and a decode/encode round trip would not do that
* for a file in any encoding but UTF-8.
*
* @param workdir - the repository root.
* @param path - the repository-relative path.
* @returns the content, or null when the path holds no regular file.
*/
async function readWorktreeFile(workdir, path) {
	try {
		if (!(await lstat(join(workdir, path))).isFile()) return null;
		return new Uint8Array(await readFile(join(workdir, path)));
	} catch {
		return null;
	}
}
/**
* Whether one request path names a file inside the repository.
*
* The check is lexical on purpose. Every path a resolver writes is one the page
* drew from `git status`, and the index is asked again before anything is
* written — an unmerged path is, by construction, tracked and inside the
* repository. This is the belt to that suspenders: a request body is still
* something a page composed, and a `../` in it must not become a write outside
* the tree. The file itself is then checked for being a symlink, which a lexical
* test cannot see.
*
* @param workdir - the repository root.
* @param path - the path the request named.
* @returns the absolute path, or null when it is not inside the root.
*/
function containedPath(workdir, path) {
	const root = resolve(workdir);
	const target = resolve(root, path);
	const relativePath = relative(root, target);
	if (relativePath === "" || relativePath.startsWith("..") || isAbsolute(relativePath)) return null;
	return target;
}
/**
* Read one unmerged path as the page resolves it.
*
* @param target - the process substrate and the session's directory.
* @param path - the repository-relative path.
* @returns the conflict document, or the reason there is none.
*/
async function readConflict(target, path) {
	const repo = await resolveRepo(target);
	if ("refusal" in repo) return {
		ok: false,
		...repo.refusal,
		reason: repo.reason
	};
	const root = inDir(target, repo.root);
	const stages = await conflictStages(root, path);
	if (stages === null) return {
		ok: false,
		...coded("not-conflicted", { path }),
		reason: "not-conflicted"
	};
	const link = await isSymlink(root.workdir, path);
	return {
		ok: true,
		conflict: describeConflict(path, link ? null : await readWorktreeFile(root.workdir, path), stages, link)
	};
}
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
async function resolveConflict(target, path, choice, keys) {
	const repo = await resolveRepo(target);
	if ("refusal" in repo) return {
		ok: false,
		...repo.refusal,
		reason: repo.reason
	};
	const absolute = containedPath(repo.root, path);
	if (absolute === null) return {
		ok: false,
		...coded("resolve-unsafe", { path }),
		reason: "unsafe"
	};
	const root = inDir(target, repo.root);
	return withRepoWrite(repo.root, async () => {
		const stages = await conflictStages(root, path);
		if (stages === null) return {
			ok: false,
			...coded("not-conflicted", { path }),
			reason: "not-conflicted"
		};
		if (keys === void 0) return resolveWholeFile(target, root, absolute, path, choice, stages);
		return resolveRegions(root, absolute, path, choice, keys);
	});
}
/**
* Take one whole version of a path that has no blocks to choose within.
*
* `git checkout --ours/--theirs` is what writes it, rather than this module
* copying bytes: the stage is the version Git recorded, and checkout restores it
* with the mode it had — which matters for a symlink or an executable file, and
* which a plain file write would silently flatten. When the chosen side is the
* one that deleted the path there is nothing to check out, so the worktree copy
* is removed instead and `git add -A` records the deletion.
*
* @param target - the process substrate and the session's directory.
* @param root - the repository root and the process substrate.
* @param absolute - the worktree path, already checked to be inside the root.
* @param path - the repository-relative path.
* @param choice - which version to keep; `both` and `base` have no whole-file meaning.
* @param stages - the stages the path holds.
* @returns the file after the write, or the refusal.
*/
async function resolveWholeFile(target, root, absolute, path, choice, stages) {
	if (choice !== "ours" && choice !== "theirs") return {
		ok: false,
		...coded("bad-choice", { choice }),
		reason: "error"
	};
	if (choice === "ours" ? stages.ours : stages.theirs) {
		const failure = writeFailure(await runGit(root, [
			"checkout",
			`--${choice}`,
			"--",
			literalPath(path)
		]));
		if (failure !== null) return {
			...failure,
			reason: "error"
		};
	} else try {
		await unlink(absolute);
	} catch {}
	const failure = writeFailure(await runGit(root, [
		"add",
		"-A",
		"--",
		literalPath(path)
	]));
	if (failure !== null) return {
		...failure,
		reason: "error"
	};
	const answer = await indexAnswer(target);
	return answer.ok === true ? {
		ok: true,
		staged: true,
		status: answer.status
	} : {
		...answer,
		reason: answer.reason === "no-repo" ? "no-repo" : "error"
	};
}
/**
* Replace the named blocks of one file with the chosen side's bytes.
*
* @param root - the repository root and the process substrate.
* @param absolute - the worktree path, already checked to be inside the root.
* @param path - the repository-relative path.
* @param choice - which version to keep.
* @param keys - the blocks to replace.
* @returns the file after the write, or the refusal.
*/
async function resolveRegions(root, absolute, path, choice, keys) {
	if (await isSymlink(root.workdir, path)) return {
		ok: false,
		...coded("resolve-unsafe", { path }),
		reason: "unsafe"
	};
	const bytes = await readWorktreeFile(root.workdir, path);
	if (bytes === null) return {
		ok: false,
		...coded("not-conflicted", { path }),
		reason: "not-conflicted"
	};
	const next = applyResolutions(bytes, parseConflict(bytes), keys.map((key) => ({
		key,
		choice
	})));
	if (next === null) return {
		ok: false,
		...coded("stale-conflict", { path }),
		reason: "stale"
	};
	try {
		await writeFile(absolute, next);
	} catch (error) {
		return {
			ok: false,
			error: errorMessage(error),
			reason: "error"
		};
	}
	return {
		ok: true,
		conflict: describeConflict(path, next, await conflictStages(root, path) ?? {
			base: false,
			ours: false,
			theirs: false
		})
	};
}
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
async function markResolved(target, path) {
	const repo = await resolveRepo(target);
	if ("refusal" in repo) return {
		ok: false,
		...repo.refusal,
		reason: repo.reason
	};
	const root = inDir(target, repo.root);
	return withRepoWrite(repo.root, async () => {
		if (await conflictStages(root, path) === null) return {
			ok: false,
			...coded("not-conflicted", { path }),
			reason: "not-conflicted"
		};
		const failure = writeFailure(await runGit(root, [
			"add",
			"-A",
			"--",
			literalPath(path)
		]));
		if (failure !== null) return {
			...failure,
			reason: "error"
		};
		return indexAnswer(target);
	});
}
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
async function completeMerge(target, message) {
	const repo = await resolveRepo(target);
	if ("refusal" in repo) return {
		ok: false,
		...repo.refusal,
		reason: repo.reason
	};
	const root = inDir(target, repo.root);
	return withRepoWrite(repo.root, async () => {
		if (await readOperation(root) !== "merge") return {
			ok: false,
			...coded("no-operation"),
			reason: "no-operation"
		};
		const unmerged = await runGit(root, [
			"diff",
			"--name-only",
			"--diff-filter=U"
		]);
		if (unmerged.code === 0 && unmerged.stdout.trim() !== "") return {
			ok: false,
			...coded("complete-conflict"),
			reason: "conflict"
		};
		const words = message?.trim() ?? "";
		const run = await runGit(root, words === "" ? ["commit", "--no-edit"] : [
			"commit",
			"-m",
			words
		]);
		if (run.failure !== void 0) return {
			ok: false,
			error: run.failure,
			reason: "error"
		};
		if (run.code !== 0) {
			const text = diagnosticText(run);
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
		const status = await readStatus(target);
		if (status.ok !== true) return {
			ok: false,
			...refusalOfStatus(status),
			reason: "error"
		};
		return {
			ok: true,
			status,
			summary: "Merged"
		};
	});
}
/**
* The refusal one payload's own failure amounts to, for a nested read.
*
* A write route that re-reads the status has already succeeded by the time the
* read can fail, so the read's reason is carried over rather than re-derived.
*
* @param payload - the failed status answer.
* @returns the coded refusal, or its text.
*/
function refusalOfStatus(payload) {
	if (payload.failure !== void 0) return { failure: payload.failure };
	return { error: payload.error ?? "could not read the status after the write" };
}
/**
* The branch HEAD is on, or null while HEAD is detached.
*
* `symbolic-ref` is the only reader that distinguishes "on a branch" from
* "detached": `status --branch` spells the latter `HEAD (no branch)`, which this
* half would then have to pattern-match. Exit code 1 is a detached HEAD.
*
* @param root - the repository root and the process substrate.
* @returns the short branch name.
*/
async function currentBranch(root) {
	const head = await runGit(root, [
		"symbolic-ref",
		"--short",
		"-q",
		"HEAD"
	]);
	if (head.code !== 0) return null;
	const name = head.stdout.trim();
	return name === "" ? null : name;
}
/**
* The full name of the current branch's upstream, e.g. `origin/main`.
*
* `@{upstream}` is the only reader that answers this the way Git's own push and
* pull do —including a renamed or unusually configured remote —instead of
* this half re-deriving `remote` + `merge` from the configuration.
*
* @param root - the repository root and the process substrate.
* @returns the upstream, or undefined when the branch has none.
*/
async function upstreamOf(root) {
	const upstream = await runGit(root, [
		"rev-parse",
		"--abbrev-ref",
		"--symbolic-full-name",
		"@{upstream}"
	]);
	if (upstream.code !== 0) return void 0;
	const name = upstream.stdout.trim();
	return name === "" ? void 0 : name;
}
/**
* The configured remote names, in configuration order.
*
* @param root - the repository root and the process substrate.
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
* so the answers differ only in which operation they name —and that name is
* the first word of a code, because the sentences belong to the page and read
* differently in each language.
*/
const ACTION_REFUSAL = {
	pull: {
		noCommits: "pull-no-commits",
		detached: "pull-detached",
		dirty: "pull-dirty"
	},
	push: {
		noCommits: "push-no-commits",
		detached: "push-detached",
		dirty: "push-dirty"
	}
};
/**
* Resolve the repository and the branch a remote hand-off runs against.
*
* Pull and push ask the same three questions before either touches the network —?
* is there a repository, does it have a commit, and is HEAD on a branch —and
* must answer them in the same order, so the guard is taken once here and each
* operation then names only itself. Without a branch there is nothing to hand
* off, which is why the guard, not the caller, states that refusal.
*
* @param target - the process substrate and the session's directory.
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
async function fetchRemotes(target) {
	const repo = await resolveRepo(target);
	if ("refusal" in repo) return {
		ok: false,
		...repo.refusal,
		reason: repo.reason
	};
	const run = await runGit(inDir(target, repo.root), ["fetch", "--all"], { timeoutMs: GIT_NETWORK_TIMEOUT_MS });
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
* One case is worth separating: credentials the remote rejected. Everything
* else is Git's
* own first line —`Could not resolve host` and friends —which is more specific
* than anything this half could invent.
*
* @param run - the failed fetch invocation.
* @returns the payload the page renders.
*/
function fetchFailure(run) {
	const auth = authRefusal(diagnosticText(run));
	if (auth !== null) return {
		ok: false,
		...auth,
		reason: "auth"
	};
	return {
		ok: false,
		...refusalOf(run),
		reason: "error"
	};
}
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
async function fetchUpstream(target) {
	const repo = await resolveRepo(target);
	if ("refusal" in repo) return {
		ok: false,
		...repo.refusal,
		reason: repo.reason
	};
	if (!repo.hasHead) return {
		ok: true,
		skipped: true
	};
	const root = inDir(target, repo.root);
	if (await currentBranch(root) === null) return {
		ok: true,
		skipped: true
	};
	const upstream = await upstreamOf(root);
	if (upstream === void 0) return {
		ok: true,
		skipped: true
	};
	const split = splitRemote(await remotesOf(root), upstream);
	if (split === null) return {
		ok: true,
		skipped: true
	};
	const run = await runGit(root, ["fetch", split.remote], { timeoutMs: GIT_NETWORK_TIMEOUT_MS });
	if (run.failure !== void 0) return {
		ok: false,
		error: run.failure,
		reason: "error"
	};
	if (run.code !== 0) return fetchFailure(run);
	return { ok: true };
}
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
	const run = await runGit(handoff.root, [
		"pull",
		"--ff",
		"--no-rebase",
		"--no-edit"
	], { timeoutMs: GIT_NETWORK_TIMEOUT_MS });
	if (run.failure !== void 0) return {
		ok: false,
		error: run.failure,
		reason: "error",
		action: "pull"
	};
	if (run.code !== 0) {
		if (await conflictedMerge(handoff.root, run)) return {
			ok: false,
			...coded("pull-conflict", { branch: handoff.branch }),
			reason: "conflict",
			action: "pull"
		};
		return syncFailure(run, "pull");
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
* @param target - the process substrate and the session's directory.
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
		ref = `${remote}/${branch}`;
		args = [
			"push",
			"--set-upstream",
			remote,
			branch
		];
	}
	const run = await runGit(root, args, { timeoutMs: GIT_NETWORK_TIMEOUT_MS });
	if (run.failure !== void 0) return {
		ok: false,
		error: run.failure,
		reason: "error",
		action: "push"
	};
	if (run.code !== 0) return syncFailure(run, "push");
	return syncSuccess(run, "push", ref);
}
/**
* The Host's own one-line account of a pull or a push that ran.
*
* Git words the three outcomes itself — already in step, moved forward, or
* updated — and the page has one sentence per operation, so the interesting
* half is only whether anything moved.
*
* @param run - the successful invocation.
* @param action - which operation ran.
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
* Describe why a pull or a push was refused.
*
* The cases worth separating are the ones the user can act on: a divergent
* history, a dirty working tree, and credentials the remote rejected.
* Everything else is Git's own first line, which is more specific than anything
* this half could invent.
*
* @param run - the failed invocation.
* @param action - which operation failed, for the message.
* @returns the payload the page renders.
*/
function syncFailure(run, action) {
	const text = diagnosticText(run);
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
* One queue of repository writes per repository root.
*
* Stage, unstage, discard, both commit routes, the conflict resolver's writes,
* and the merge commit that finishes one all write the repository. The
* index writers among them take Git's `index.lock`, and two overlapping is a lock
* error the user did not cause; a discard and a block resolution write the
* worktree instead, but they still must not interleave with a stage that is
* re-reading the state it came from. The page already disables its own controls
* while one is in flight, but a second window, the agent in the same repository,
* or a stale answer can still arrive at the same moment, so the Host serializes
* the routes themselves. The queue is keyed by root because two repositories have
* no reason to wait on each other, and dropped when the last write finishes so it
* holds no state of its own.
*
* The resolver's write is the one that depends on being inside the queue for more
* than mutual exclusion: it re-reads the index and the file under the lock, so the
* region key the page sent is checked against the bytes that are really there.
*/
const writeQueues = /* @__PURE__ */ new Map();
/**
* Run one repository write after every earlier one for the same repository.
*
* @param root - the repository root the write belongs to.
* @param run - the write to run, once the queue reaches it.
* @returns whatever the write answered.
*/
async function withRepoWrite(root, run) {
	const next = (writeQueues.get(root) ?? Promise.resolve()).catch(() => void 0).then(run);
	writeQueues.set(root, next);
	try {
		return await next;
	} finally {
		if (writeQueues.get(root) === next) writeQueues.delete(root);
	}
}
/**
* Re-read the status after one repository write, and shape it as the route's answer.
*
* The status is read inside the queue, after the write, so the lists the page
* paints are the state that write produced rather than a read that raced it.
*
* @param target - the process substrate and the session's directory.
* @returns the fresh status, or why it could not be read.
*/
async function indexAnswer(target) {
	const status = await readStatus(target);
	if (status.ok === true) return {
		ok: true,
		status
	};
	return {
		ok: false,
		...status.failure === void 0 ? { error: status.error ?? "could not read the status after the index write" } : { failure: status.failure },
		reason: status.reason === "no-repo" ? "no-repo" : "error"
	};
}
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
async function stagePath(target, path) {
	const repo = await resolveRepo(target);
	if ("refusal" in repo) return {
		ok: false,
		...repo.refusal,
		reason: repo.reason
	};
	const root = inDir(target, repo.root);
	return withRepoWrite(repo.root, async () => {
		return writeFailure(await runGit(root, [
			"add",
			"-A",
			"--",
			literalPath(path)
		])) ?? indexAnswer(target);
	});
}
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
async function unstagePath(target, path, origPath) {
	const repo = await resolveRepo(target);
	if ("refusal" in repo) return {
		ok: false,
		...repo.refusal,
		reason: repo.reason
	};
	const root = inDir(target, repo.root);
	const paths = (origPath === void 0 ? [path] : [path, origPath]).map(literalPath);
	return withRepoWrite(repo.root, async () => {
		return writeFailure(repo.hasHead ? await runGit(root, [
			"restore",
			"--staged",
			"--",
			...paths
		]) : await runGit(root, [
			"rm",
			"--cached",
			"--",
			...paths
		])) ?? indexAnswer(target);
	});
}
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
async function discardPath(target, path, untracked) {
	const repo = await resolveRepo(target);
	if ("refusal" in repo) return {
		ok: false,
		...repo.refusal,
		reason: repo.reason
	};
	const root = inDir(target, repo.root);
	return withRepoWrite(repo.root, async () => {
		return writeFailure(untracked ? await runGit(root, [
			"clean",
			"-f",
			"--",
			literalPath(path)
		]) : await runGit(root, [
			"restore",
			"--worktree",
			"--",
			literalPath(path)
		])) ?? indexAnswer(target);
	});
}
/** Whether one repository-relative file path sits inside a folder path. */
function inFolder(path, folder) {
	return path.startsWith(`${folder}/`);
}
/** The NUL-separated pathspec list the `--pathspec-from-file` commands read. */
function pathspecInput(paths) {
	return paths.map(literalPath).join("\0") + "\0";
}
/** The two options that make a Git command read its pathspecs from standard input. */
const PATHSPEC_STDIN = ["--pathspec-from-file=-", "--pathspec-file-nul"];
/**
* The changed paths under one folder, or the refusal that stopped the read.
* The status is read inside the write queue, so a folder write acts on the paths
* the repository holds when the write runs rather than on the page's possibly
* older list. A folder route names a directory, never its files: a tree with
* thousands of untracked paths would otherwise have to cross the request body.
*
* @param root - the repository root and the process substrate.
* @param folder - the repository-relative folder path, or null for every path.
* @returns the files under the folder, or the failure payload to answer with.
*/
async function folderStatus(root, folder) {
	const status = await runGit(root, STATUS_PATH_ARGS);
	if (status.failure !== void 0) return {
		ok: false,
		payload: {
			ok: false,
			error: status.failure,
			reason: "error"
		}
	};
	if (status.code !== 0) return {
		ok: false,
		payload: {
			ok: false,
			...refusalOf(status),
			reason: "error"
		}
	};
	return {
		ok: true,
		files: parseStatus(status.stdout).files.filter((file) => folder === null || inFolder(file.path, folder))
	};
}
/**
* The failure one write command amounts to, or null when it succeeded.
*
* Every index and worktree write shares the same two checks — transport and
* Git's own refusal — so the check lives here once. A payload that words the
* failure its own way still reads this shape and adds what it knows.
*
* @param run - the command's outcome.
* @returns the failure payload, or null when the command succeeded.
*/
function writeFailure(run) {
	if (run.failure !== void 0) return {
		ok: false,
		error: run.failure,
		reason: "error"
	};
	if (run.code !== 0) return {
		ok: false,
		...refusalOf(run),
		reason: "error"
	};
	return null;
}
/**
* Stage every change under one folder.
*
* The paths come from the status the queue reads, not from the request: the page
* names a folder, and the Host resolves which paths under it are still waiting
* in the worktree. Conflicted paths are left out on purpose —`git add` on one
* means "resolved", and a folder action cannot know that the reader finished
* editing every conflict it contains.
*
* @param target - the process substrate and the session's directory.
* @param folder - the repository-relative folder to stage, or null for every path.
* @returns the fresh status, or the refusal.
*/
async function stageScope(target, folder) {
	const repo = await resolveRepo(target);
	if ("refusal" in repo) return {
		ok: false,
		...repo.refusal,
		reason: repo.reason
	};
	const root = inDir(target, repo.root);
	return withRepoWrite(repo.root, async () => {
		const read = await folderStatus(root, folder);
		if (!read.ok) return read.payload;
		const paths = read.files.filter((file) => file.conflicted !== true && (file.unstaged || file.untracked)).map((file) => file.path);
		if (paths.length === 0) return indexAnswer(target);
		return writeFailure(await runGit(root, [
			"add",
			"-A",
			...PATHSPEC_STDIN
		], { stdin: pathspecInput(paths) })) ?? indexAnswer(target);
	});
}
/**
* Move every staged change under one folder out of the index.
*
* A staged rename is two index entries, so both halves of every rename are named
* together, exactly as the single-path unstage does. An unborn branch has no HEAD
* to restore from, so its index entries are removed instead and the files become
* untracked again.
*
* @param target - the process substrate and the session's directory.
* @param folder - the repository-relative folder to unstage, or null for every path.
* @returns the fresh status, or the refusal.
*/
async function unstageScope(target, folder) {
	const repo = await resolveRepo(target);
	if ("refusal" in repo) return {
		ok: false,
		...repo.refusal,
		reason: repo.reason
	};
	const root = inDir(target, repo.root);
	return withRepoWrite(repo.root, async () => {
		const read = await folderStatus(root, folder);
		if (!read.ok) return read.payload;
		const paths = [...new Set(read.files.filter((file) => file.staged && file.conflicted !== true).flatMap((file) => file.origPath === void 0 ? [file.path] : [file.path, file.origPath]))];
		if (paths.length === 0) return indexAnswer(target);
		return writeFailure(repo.hasHead ? await runGit(root, [
			"restore",
			"--staged",
			...PATHSPEC_STDIN
		], { stdin: pathspecInput(paths) }) : await runGit(root, [
			"rm",
			"--cached",
			...PATHSPEC_STDIN
		], { stdin: pathspecInput(paths) })) ?? indexAnswer(target);
	});
}
/**
* Discard every unstaged change under one folder.
*
* A tracked path is restored from the index, so a folder holding a partly staged
* file loses only that file's worktree half and keeps what the index holds. An
* untracked path is deleted, and because `git clean` takes no pathspec-from-file
* the folder itself is the pathspec: it removes exactly the untracked paths under
* the folder the list was drawn from, while ignored files stay untouched unless
* they were asked for (they never are). Conflicted paths are left alone —their
* worktree state is the reader's resolution in progress.
*
* @param target - the process substrate and the session's directory.
* @param folder - the repository-relative folder to discard, or null for every path.
* @returns the fresh status, or the refusal.
*/
async function discardScope(target, folder) {
	const repo = await resolveRepo(target);
	if ("refusal" in repo) return {
		ok: false,
		...repo.refusal,
		reason: repo.reason
	};
	const root = inDir(target, repo.root);
	return withRepoWrite(repo.root, async () => {
		const read = await folderStatus(root, folder);
		if (!read.ok) return read.payload;
		const tracked = read.files.filter((file) => file.conflicted !== true && file.unstaged && !file.untracked).map((file) => file.path);
		const untracked = read.files.some((file) => file.untracked);
		if (tracked.length === 0 && !untracked) return indexAnswer(target);
		if (tracked.length > 0) {
			const failure = writeFailure(await runGit(root, [
				"restore",
				"--worktree",
				...PATHSPEC_STDIN
			], { stdin: pathspecInput(tracked) }));
			if (failure !== null) return failure;
		}
		if (untracked) {
			const failure = writeFailure(folder === null ? await runGit(root, [
				"clean",
				"-f",
				"-d"
			]) : await runGit(root, [
				"clean",
				"-f",
				"-d",
				"--",
				literalPath(folder)
			]));
			if (failure !== null) return failure;
		}
		return indexAnswer(target);
	});
}
/** Stage every change under one folder (see `stageScope`). */
function stageFolder(target, folder) {
	return stageScope(target, folder);
}
/**
* Stage every changed path in the repository, from every folder.
*
* The page's header action names no directory: it stands for the whole worktree
* list, and the Host resolves that list from the status it reads in the queue.
*
* @param target - the process substrate and the session's directory.
* @returns the fresh status, or the refusal.
*/
function stageAll(target) {
	return stageScope(target, null);
}
/** Move every staged change under one folder out of the index (see `unstageScope`). */
function unstageFolder(target, folder) {
	return unstageScope(target, folder);
}
/**
* Move every staged change in the repository out of the index.
*
* @param target - the process substrate and the session's directory.
* @returns the fresh status, or the refusal.
*/
function unstageAll(target) {
	return unstageScope(target, null);
}
/** Discard every unstaged change under one folder (see `discardScope`). */
function discardFolder(target, folder) {
	return discardScope(target, folder);
}
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
function discardAll(target) {
	return discardScope(target, null);
}
/**
* Read back the commit Git just wrote, the same way the history reads one.
*
* A failure here is not a failed commit —the commit is already made —so the
* answer stays a success and simply names nothing.
*
* @param root - the repository root and the process substrate.
* @returns the success payload, with the summary when it could be read.
*/
async function readMadeCommit(root) {
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
async function commitAll(target, message) {
	const repo = await resolveRepo(target);
	if ("refusal" in repo) return {
		ok: false,
		...repo.refusal,
		reason: repo.reason
	};
	const root = inDir(target, repo.root);
	return withRepoWrite(repo.root, async () => {
		const status = await runGit(root, STATUS_PATH_ARGS);
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
		], { stdin: message });
		if (commit.failure !== void 0) return {
			ok: false,
			error: commit.failure,
			reason: "error"
		};
		if (commit.code !== 0) return commitFailure(commit);
		return readMadeCommit(root);
	});
}
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
async function commitStaged(target, message) {
	const repo = await resolveRepo(target);
	if ("refusal" in repo) return {
		ok: false,
		...repo.refusal,
		reason: repo.reason
	};
	const root = inDir(target, repo.root);
	return withRepoWrite(repo.root, async () => {
		const status = await runGit(root, STATUS_PATH_ARGS);
		if (status.code !== 0) return {
			ok: false,
			...refusalOf(status),
			reason: "error"
		};
		const files = parseStatus(status.stdout).files;
		if (files.some((file) => file.conflicted)) return conflictedCommit();
		if (!files.some((file) => file.staged)) return nothingStagedCommit();
		const commit = await runGit(root, [
			"commit",
			"-F",
			"-"
		], { stdin: message });
		if (commit.failure !== void 0) return {
			ok: false,
			error: commit.failure,
			reason: "error"
		};
		if (commit.code !== 0) return commitFailure(commit, "staged");
		return readMadeCommit(root);
	});
}
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
async function undoLastCommit(target) {
	const repo = await resolveRepo(target);
	if ("refusal" in repo) return {
		ok: false,
		...repo.refusal,
		reason: repo.reason
	};
	if (!repo.hasHead) return {
		ok: false,
		...coded("no-commits"),
		reason: "no-commits"
	};
	const root = inDir(target, repo.root);
	return withRepoWrite(repo.root, async () => {
		if (await readOperation(root) !== void 0) return {
			ok: false,
			...coded("commit-undo-operation"),
			reason: "operation"
		};
		const parent = await runGit(root, [
			"rev-parse",
			"--verify",
			"--quiet",
			"HEAD^"
		]);
		if (parent.failure !== void 0) return {
			ok: false,
			error: parent.failure,
			reason: "error"
		};
		if (parent.code !== 0) return {
			ok: false,
			...coded("commit-undo-root"),
			reason: "root"
		};
		const made = await runGit(root, [
			"log",
			"-1",
			`--pretty=format:${LOG_FORMAT}`
		]);
		const commit = made.code === 0 ? parseSummary(made.stdout.split(FIELD)) : void 0;
		const reset = await runGit(root, [
			"reset",
			"--soft",
			"HEAD^"
		]);
		if (reset.failure !== void 0) return {
			ok: false,
			error: reset.failure,
			reason: "error"
		};
		if (reset.code !== 0) return {
			ok: false,
			...refusalOf(reset),
			reason: "error"
		};
		return commit === void 0 ? { ok: true } : {
			ok: true,
			commit
		};
	});
}
/** The answer for a tree that holds nothing to commit. */
function emptyCommit() {
	return {
		ok: false,
		...coded("commit-clean"),
		reason: "clean"
	};
}
/** The answer for an index that holds nothing to commit. */
function nothingStagedCommit() {
	return {
		ok: false,
		...coded("commit-nothing-staged"),
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
* Describe why a commit was refused.
*
* The cases worth separating are races against the read above — a merge that was
* aborted after it, and a tree another process emptied — and a missing author
* identity, which Git reports as a state the user can fix rather than as a fault
* of this repository. Everything else, a refusing hook and a signing failure
* among them, is Git's own first line, which is more specific than anything this
* half could invent.
*
* @param run - the failed invocation.
* @param scope - which commit was asked for, so "nothing to commit" says which
*   half it found empty.
* @returns the payload the page renders.
*/
function commitFailure(run, scope = "all") {
	const text = diagnosticText(run);
	if (/unmerged|merging is not possible|you have unmerged files/i.test(text)) return conflictedCommit();
	if (/nothing to commit|nothing added to commit|no changes added to commit/i.test(text)) return scope === "staged" ? nothingStagedCommit() : emptyCommit();
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
			error: errorMessage(error)
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
* The file is one JSON document at `<dsh home>/cool-git/settings.json`:
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
* The pre-rename location, `<dsh home>/dsh-cool-git/settings.json`, is still read
* while the current path holds no document. Nothing writes there any more: the
* next save lands on the current path and carries the whole map with it, so the
* rename moves what a Workspace had chosen instead of resetting it.
*
* A missing member is the meaningful state: no `model` means "use DSH's current
* default selection", and no `prompt` means "use the built-in prompt". The prompt
* field opens on the built-in text, so whatever it holds at Save is what this file
* stores — that text verbatim included — and only clearing the field removes the
* override. A model is never copied that way: following the default selection
* stays "no member".
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
	return join(harnessHome(ctx), "cool-git", "settings.json");
}
/**
* The document this plugin wrote before its directory was renamed.
*
* Read only, and only while `settingsFilePath` holds no document: a Workspace that
* chose a model or a prompt before the rename keeps that choice, and starting over
* from the defaults would be a silent reset of something the user set. Nothing
* writes here any more, so a file this path names is a leftover its owner may
* delete once the next save has moved the whole map to the current path.
*
* @param ctx - the Host plugin context.
* @returns the absolute path of the pre-rename document.
*/
function legacySettingsFilePath(ctx) {
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
* The document's text, from the current path or the pre-rename one.
*
* A path that cannot be read, and one that holds nothing but whitespace, both
* leave the question open: a document with no bytes holds no Workspace entry, and
* `JSON.parse` would only read it as a malformed file. The first location with
* something to parse wins, so a Workspace whose only document predates the rename
* is read exactly as it was before it.
*
* @param ctx - the Host plugin context.
* @returns the text to parse, or undefined when neither location holds a document.
*/
async function readDocumentText(ctx) {
	for (const file of [settingsFilePath(ctx), legacySettingsFilePath(ctx)]) {
		let text;
		try {
			text = await readFile(file, "utf8");
		} catch {
			continue;
		}
		if (text.trim() === "") continue;
		return text;
	}
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
	const text = await readDocumentText(ctx);
	if (text === void 0) return {};
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
		return (await readDocument(ctx))[workspacePath] ?? {};
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
	const model = parseModel(value);
	return model === void 0 ? { ok: false } : {
		ok: true,
		value: model
	};
}
/**
* Read one request's prompt field.
*
* An empty field is the dialog's way of saying "follow the built-in prompt", so
* an absent field, a null, and a blank one all mean "no override". Anything else
* is stored as written, the built-in text included: the field opens on that text,
* and a reader who saved the box as it stood asked for the words they saw rather
* than for whatever the built-in prompt says after its next revision.
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
	if (value.trim() === "") return {
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
* The key one Workspace's saved choices are stored under.
*
* The registry's canonical path when it can name a Workspace — that is the path
* every session attached to it resolves to, a session opened from a subdirectory
* included — and the repository root otherwise, because a deployment without the
* registry still has a directory to key by. The Settings route and the message
* writer both call this: a save under one key and a read under another would
* leave the dialog looking like it never stored anything.
*
* @param workspace - the Workspace, when the registry named one.
* @param root - the repository root, as the fallback identity.
* @returns the settings key.
*/
function workspaceSettingsKey(workspace, root) {
	return workspace?.path === void 0 || workspace.path === "" ? root : workspace.path;
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
	const stagedOnly = digest.scope === "staged";
	const lines = [];
	lines.push("Recent commit messages on this branch, newest first (git log --pretty=format:%B):");
	if (digest.recentMessages.length === 0) lines.push("  (none: this branch has no commit to imitate yet)");
	else for (const sample of digest.recentMessages) {
		lines.push("---");
		lines.push(sample.text);
		if (sample.truncated) lines.push("[the message above was cut at the read limit]");
	}
	lines.push("");
	lines.push(stagedOnly ? `This index has ${digest.files.length} staged path(s).` : `This working tree has ${digest.files.length} changed path(s).`);
	lines.push("");
	lines.push(stagedOnly ? "Staged paths (git status --porcelain, XY then path):" : "Changed paths (git status --porcelain, XY then path):");
	for (const file of digest.files) lines.push(`  ${describeFile(file)}`);
	lines.push("");
	lines.push(stagedOnly ? "Staged changes (git diff --cached --stat):" : "Tracked changes (git diff --stat):");
	lines.push(digest.stat === "" ? "  (none)" : digest.stat);
	lines.push("");
	lines.push(stagedOnly ? "Staged changes (git diff --cached):" : "Tracked changes (git diff, staged and unstaged):");
	if (digest.patch === "") lines.push("  (none)");
	else {
		lines.push(digest.patch);
		if (digest.patchTruncated) lines.push("[the patch above was cut at the read limit]");
	}
	if (!stagedOnly) {
		lines.push("");
		if (digest.untracked.length === 0) lines.push("Untracked files: none.");
		else {
			lines.push("Untracked files (git diff --no-index --stat -p against /dev/null):");
			for (const preview of digest.untracked) {
				lines.push(`--- ${preview.path}${preview.truncated ? " (cut at the read limit)" : ""}`);
				lines.push(preview.text);
			}
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
		return { refusal: { error: errorMessage(error) } };
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
* @param target - the process substrate and the session's directory.
* @param sessionId - the session the request named, for the model call's own
* attribution; the repository is resolved from it already, never from a path.
* @param scope - whether the message describes the index alone or the whole
* working tree, the same scope the commit button is set to.
* @returns the payload the page fills its form from.
*/
async function generateCommitMessage(ctx, target, sessionId, scope = "all") {
	const digest = await readChangeDigest(target, scope);
	if (digest.ok !== true) return {
		ok: false,
		...digest.refusal,
		reason: digest.reason
	};
	if (digest.files.length === 0) return {
		ok: false,
		...coded(scope === "staged" ? "commit-nothing-staged" : "commit-clean"),
		reason: "clean"
	};
	const settings = await readWorkspaceSettings(ctx, workspaceSettingsKey(await resolveWorkspace(ctx, sessionId, digest.root), digest.root));
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
//#region src/host/update.ts
/**
* What the plugin page's update row asks the Host, and what the Host does about
* it.
*
* The row lives on this bundle's own page in the native Plugins panel (see
* `client/update.tsx`), but neither the registry nor the profile is the browser's
* to read: the page would have to reach the npm registry itself, and it would
* have to install a package, which is the Host's own operation. So the two
* questions cross this package's routes as JSON, exactly as every Git question
* does, and this module answers them.
*
* The published version is read from the public registry the package publishes
* to (`package.json`'s `publishConfig`), not from `pluginManager.inspect`: that
* operation refuses a spec whose name the profile already installs — the answer
* this row needs most of all — so it can never say what the newest release is for
* an installed plugin. The profile's own record (which version is installed, and
* from where) comes from `pluginManager.listBundles`, which is the same source
* the native Source section draws from.
*
* Both reads are cached in this module for a few minutes: the page asks on every
* mount, the registry costs a network round trip, and a version published mid-
* session is not a fact worth a request per repaint. The cache belongs to the
* Host process, so stopping the plugin clears it with the module.
*/
/** The registry the package publishes to, ending in the slash paths append to. */
const REGISTRY = "https://registry.npmjs.org/";
/** How long a successful read answers without asking the registry again. */
const CACHE_TTL_MS = 5 * 6e4;
/** How long a failed read is remembered, so a dead network is not retried per repaint. */
const FAILURE_TTL_MS = 3e4;
/** How long one registry request may take before it is treated as unreachable. */
const REQUEST_TIMEOUT_MS = 8e3;
/**
* The shape a version this half will install must have.
*
* The page sends back a version it was shown, but a request body is not a place
* to put a package spec: a string that is not a plain version could name a tag,
* a range, or another package's path, and `installBundle` would take it. The
* bound is npm's own spelling for a release, prerelease suffixes included.
*/
const VERSION = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]{1,64})?$/;
/** One cached answer, with the moment it was taken. */
let cache;
/**
* Ask the registry for this package's newest published version.
*
* A redirect is followed by `fetch` itself; anything but a 2xx is a failure the
* caller reports as "could not read", because a registry that answers 500 or a
* proxy that answers 403 says nothing about the version. The body is read as
* JSON and only its `version` field is kept: that is the whole of what the row
* draws, and a full packument would be megabytes.
*
* @returns the version, or the reason there is none.
*/
async function readPublishedVersion() {
	const response = await fetch(`${REGISTRY}${PACKAGE_NAME}/latest`, {
		headers: { accept: "application/json" },
		redirect: "follow",
		signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
	});
	if (!response.ok) return { error: `registry answered HTTP ${response.status}` };
	const version = (await response.json().catch(() => void 0))?.version;
	if (typeof version !== "string" || version === "") return { error: "registry answered no version" };
	return { version };
}
/**
* The profile's own record of this bundle.
*
* `listBundles` is the manager's full answer, and this plugin's row is the one
* entry whose name is the package's. A manager that is absent (a deployment
* without the Plugins panel) or that does not list the bundle (an installation
* DSH itself provides) leaves both fields absent rather than failing the read:
* the version can still be compared, and the row simply cannot say where it came
* from.
*
* @param ctx - the Host plugin context.
* @returns the installed version and the recorded spec, when known.
*/
async function readInstalled(ctx) {
	const manager = ctx.get("pluginManager");
	if (manager === void 0 || typeof manager.listBundles !== "function") return {};
	try {
		const bundles = await manager.listBundles();
		if (!Array.isArray(bundles)) return {};
		const own = bundles.find((bundle) => bundle?.name === PACKAGE_NAME);
		if (own === void 0 || own === null) return {};
		return {
			...typeof own.version === "string" ? { installed: own.version } : {},
			...typeof own.source === "string" ? { source: own.source } : {}
		};
	} catch {
		return {};
	}
}
/**
* Answer the page's first question: which version is published, and which one
* the profile holds.
*
* The cache is keyed by nothing because the question is about one package in one
* profile; a second profile would be a second Host process with its own module.
*
* @param ctx - the Host plugin context.
* @returns the payload the row draws.
*/
async function checkPublishedVersion(ctx) {
	const now = Date.now();
	if (cache !== void 0 && now - cache.at < (cache.value.ok ? CACHE_TTL_MS : FAILURE_TTL_MS)) return cache.value;
	const installed = await readInstalled(ctx);
	let published;
	let error;
	try {
		const answer = await readPublishedVersion();
		if ("version" in answer) published = answer;
		else error = answer.error;
	} catch (caught) {
		error = errorMessage(caught);
	}
	const value = published === void 0 ? {
		ok: false,
		error: error ?? "the registry could not be read",
		...installed
	} : {
		ok: true,
		latest: published.version,
		...installed
	};
	cache = {
		at: now,
		value
	};
	return value;
}
/**
* Answer the page's second question: install one published version.
*
* The manager's operation is the same one the Plugins panel runs, so the profile
* files, the lockfile, the registry fallback and the build-script approval all
* behave exactly as they do there; nothing about installation is reimplemented
* here. The one thing this route refuses on its own is a version that is not a
* version, before any file is touched.
*
* The call replaces whatever the profile recorded for this bundle — including a
* `link:` development install — which is what the page asks the reader to confirm
* before calling it.
*
* @param ctx - the Host plugin context.
* @param version - the version the page was shown.
* @returns the manager's outcome, or the reason the install never started.
*/
async function installPublishedVersion(ctx, version) {
	if (typeof version !== "string" || !VERSION.test(version)) return {
		ok: false,
		...coded("bad-version")
	};
	const manager = ctx.get("pluginManager");
	if (manager === void 0 || typeof manager.installBundle !== "function") return {
		ok: false,
		...coded("no-plugin-manager")
	};
	try {
		const result = await manager.installBundle(`${PACKAGE_NAME}@${version}`);
		return {
			ok: true,
			application: result?.application === "restart-required" ? "restart-required" : "applied",
			...typeof result?.restartReason === "string" ? { restartReason: result.restartReason } : {}
		};
	} catch (caught) {
		return {
			ok: false,
			error: errorMessage(caught)
		};
	}
}
//#endregion
//#region src/host/routes.ts
/**
* The Host half's HTTP surface.
*
* The browser half has no Cordis context and no remote namespace of its own, so
* every question it asks the Host crosses a same-origin route registered on the
* `webServer` carrier. Each route answers JSON and never rejects: a transport
* failure becomes an `{ ok: false }` result the page reports in its error dialog.
*
* The Host stays authoritative about *where* Git runs. A request may name the
* session it belongs to, but never a directory: the directory is read from that
* session's own header — from the live session when the Host holds it, and from
* the session's durable header when it does not yet — so a page cannot point the
* plugin at a repository the session does not own. The durable read is what lets
* a reopened page's Git tab answer for its own repository on the first request,
* which arrives while the session is still being resumed (see `resolveWorkdir`).
*
* It is equally authoritative about *what* Git may write: a route marked `write`
* is refused for a session the Host has not resumed yet, so a page cannot change
* a repository nothing is holding.
*/
/** Object names Git accepts, and all a route will pass on to the command line. */
const OBJECT_NAME = /^[0-9a-f]{4,40}$/i;
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
* Read one route's JSON body, answering 400 when it is not one.
*
* Every route that takes a body goes through here, the one route that resolves
* no Git target included, so a malformed body is one answer everywhere: it is
* parsed before anything else is resolved, and a request that is not a JSON
* object never reaches Git.
*
* @param req - the incoming request.
* @param res - the response to write.
* @returns the parsed body, or undefined once the 400 has been sent.
*/
async function readJsonBody(req, res) {
	try {
		return await readBody(req);
	} catch (error) {
		sendJson(res, 400, {
			ok: false,
			error: errorMessage(error)
		});
		return;
	}
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
* The Host's process substrate, or the reason Git cannot run at all.
*
* @param ctx - the Host plugin context.
* @returns the substrate, or the coded refusal.
*/
function resolveSubprocess(ctx) {
	const subprocess = ctx.get("subprocess");
	if (subprocess === void 0 || typeof subprocess.spawn !== "function") return coded("no-subprocess");
	return { subprocess };
}
/**
* The directory of a session the Host already holds in store.
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
		return { workdir: cwd };
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
* the Host's own working directory, which is at least a directory that exists.
*
* A cold session is answered from its durable header only for a reading route: a
* route that writes waits for the session itself rather than acting on a
* repository that may not be the one the page is showing.
*
* @param ctx - the Host plugin context.
* @param sessionId - the session the page belongs to, if it named one.
* @param effect - whether this request may change the repository.
* @returns the directory, or the reason there is none.
*/
async function resolveWorkdir(ctx, sessionId, effect) {
	if (typeof sessionId === "string" && sessionId !== "") {
		const live = liveTarget(ctx, sessionId);
		if (live !== void 0) return live;
		const persisted = await persistedWorkdir(ctx, sessionId);
		if (persisted !== void 0) return effect === "write" ? coded("not-ready") : { workdir: persisted };
	}
	return process.cwd() === "" ? coded("no-workdir") : { workdir: process.cwd() };
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
* @param target - the process substrate and the session's directory.
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
		key: workspaceSettingsKey(workspace, root.root),
		...workspace === void 0 ? {} : { workspace }
	};
}
/**
* Run one JSON route body against Git.
*
* Every route repeats the same four steps — method, body, directory, substrate —
* so they are taken once here and the route only supplies its own arguments. A
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
	const body = await readJsonBody(req, res);
	if (body === void 0) return;
	const resolved = await resolveWorkdir(ctx, body.sessionId, effect);
	if (!("workdir" in resolved)) {
		sendJson(res, 200, {
			ok: false,
			...resolved
		});
		return;
	}
	const capability = resolveSubprocess(ctx);
	if (!("subprocess" in capability)) {
		sendJson(res, 200, {
			ok: false,
			...capability
		});
		return;
	}
	const target = {
		subprocess: capability.subprocess,
		workdir: resolved.workdir
	};
	try {
		sendJson(res, 200, await run(body, target));
	} catch (error) {
		sendJson(res, 200, {
			ok: false,
			error: errorMessage(error)
		});
	}
}
/**
* Read one request's changed-path argument.
*
* NUL is the one byte an argv cannot carry, so a path holding one is refused
* rather than silently truncated.
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
* Run one route's work with the path the request named, or refuse it.
*
* Ten routes name exactly one path, and every one of them refuses a body that
* does not carry a usable path the same way, so the check is stated once here
* rather than repeated at each route. The refusal is an answer the page draws,
* not an HTTP error, exactly as Git's own refusals are.
*
* @param body - the parsed request body.
* @param run - the route's work, given the path the body named.
* @returns the route's answer, or the missing-path refusal.
*/
function withPath(body, run) {
	const path = readPath(body);
	if (path === void 0) return {
		ok: false,
		...coded("missing-path")
	};
	return run(path);
}
/**
* Read the rename source an unstage request may carry.
*
* A staged rename is two index entries, so restoring it means naming both. The
* field is optional — every other row has no source — and an absent or empty one
* is simply no source rather than a malformed request. A NUL is refused for the
* same reason {@link readPath} refuses one.
*
* @param body - the parsed request body.
* @returns the source path, or undefined when the body names none.
*/
function readOrigPath(body) {
	const origPath = body.origPath;
	if (origPath === void 0 || origPath === "") return void 0;
	if (typeof origPath !== "string" || origPath.includes("\0")) return void 0;
	return origPath;
}
/**
* Read which half of a path a diff request is about.
*
* The page always names the side of the row it drew, because a path can be
* listed twice — staged and unstaged — and the two rows must answer with
* different patches. A request that names none is read as the worktree side, the
* answer the page used to give for a tracked path; the `staged` boolean is still
* honoured as the older spelling of the same choice.
*
* @param body - the parsed request body.
* @returns the side to diff.
*/
function readSide(body) {
	const side = body.side;
	if (side === "staged" || side === "unstaged" || side === "conflict") return side;
	return body.staged === true ? "staged" : "unstaged";
}
/**
* Read which version a resolution keeps.
*
* The set is closed and it is the contract's: a choice the page cannot mean — a
* misspelling, a `both` sent for a whole file — is refused rather than guessed
* at, because guessing here writes the reader's file.
*
* @param body - the parsed request body.
* @param wholeFile - whether the request is for the whole file, where only a
*   single side makes sense.
* @returns the choice, or undefined when the body names none it may use.
*/
function readChoice(body, wholeFile) {
	const choice = body.choice;
	if (wholeFile) return choice === "ours" || choice === "theirs" ? choice : void 0;
	if (choice === "ours" || choice === "theirs" || choice === "both" || choice === "base") return choice;
}
/**
* How many conflict blocks one resolution may name.
*
* A bound rather than a rule about the file: a resolution is one request, and one
* request is one round trip, so the number of blocks it may carry is the number
* this half is willing to make it. A file with more conflicts than this is
* resolved in more than one click.
*/
const MAX_CONFLICT_KEYS = 500;
/**
* Read the conflict blocks one resolution applies to.
*
* The two shapes of a resolution are told apart by whether the body carries the
* field at all, and never by whether the list turned out to be usable: a body
* naming keys that do not fit this shape is refused, because reading it as a
* whole-file request instead would resolve a file the reader asked to resolve
* block by block. An empty list is refused for the same reason — it is not the
* spelling the page uses for "the whole file".
*
* @param value - the field as the body carried it.
* @returns the keys, or undefined when they are not a usable list.
*/
function readKeys(value) {
	if (!Array.isArray(value) || value.length === 0 || value.length > MAX_CONFLICT_KEYS) return void 0;
	const out = [];
	for (const key of value) {
		if (typeof key !== "string" || key === "" || key.length > 64) return void 0;
		out.push(key);
	}
	return out;
}
/**
* Read the scope a commit or a generated message covers.
*
* @param body - the parsed request body.
* @returns `staged` only when the request names it; everything else is `all`.
*/
function readScope(body) {
	return body.scope === "staged" ? "staged" : "all";
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
* The shape checked here is only about what can be handed to Git at all:
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
	if (!Array.isArray(raw) || raw.length === 0 || raw.length > 200) return void 0;
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
		route(ROUTES.diff, (req, res) => handle(ctx, req, res, "read", (body, target) => withPath(body, (path) => readDiff(target, {
			path,
			side: readSide(body),
			untracked: body.untracked === true
		})))),
		route(ROUTES.commit, (req, res) => handle(ctx, req, res, "read", (body, target) => {
			const hash = readHash(body);
			if (hash === void 0) return {
				ok: false,
				...coded("bad-hash")
			};
			return readCommit(target, hash);
		})),
		route(ROUTES.branches, (req, res) => handle(ctx, req, res, "read", (_body, target) => readBranches(target))),
		route(ROUTES.stage, (req, res) => handle(ctx, req, res, "write", (body, target) => withPath(body, (path) => stagePath(target, path)))),
		route(ROUTES.unstage, (req, res) => handle(ctx, req, res, "write", (body, target) => withPath(body, (path) => unstagePath(target, path, readOrigPath(body))))),
		route(ROUTES.discard, (req, res) => handle(ctx, req, res, "write", (body, target) => withPath(body, (path) => discardPath(target, path, body.untracked === true)))),
		route(ROUTES.stageFolder, (req, res) => handle(ctx, req, res, "write", (body, target) => withPath(body, (path) => stageFolder(target, path)))),
		route(ROUTES.unstageFolder, (req, res) => handle(ctx, req, res, "write", (body, target) => withPath(body, (path) => unstageFolder(target, path)))),
		route(ROUTES.discardFolder, (req, res) => handle(ctx, req, res, "write", (body, target) => withPath(body, (path) => discardFolder(target, path)))),
		route(ROUTES.stageAll, (req, res) => handle(ctx, req, res, "write", (_body, target) => stageAll(target))),
		route(ROUTES.unstageAll, (req, res) => handle(ctx, req, res, "write", (_body, target) => unstageAll(target))),
		route(ROUTES.discardAll, (req, res) => handle(ctx, req, res, "write", (_body, target) => discardAll(target))),
		route(ROUTES.commitAll, (req, res) => handle(ctx, req, res, "write", (body, target) => {
			const message = readMessage(body);
			if (message === void 0) return {
				ok: false,
				...coded("missing-message")
			};
			return commitAll(target, message);
		})),
		route(ROUTES.commitStaged, (req, res) => handle(ctx, req, res, "write", (body, target) => {
			const message = readMessage(body);
			if (message === void 0) return {
				ok: false,
				...coded("missing-message")
			};
			return commitStaged(target, message);
		})),
		route(ROUTES.undoCommit, (req, res) => handle(ctx, req, res, "write", (_body, target) => undoLastCommit(target))),
		route(ROUTES.message, (req, res) => handle(ctx, req, res, "read", (body, target) => generateCommitMessage(ctx, target, typeof body.sessionId === "string" ? body.sessionId : void 0, readScope(body)))),
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
			const body = await readJsonBody(req, res);
			if (body === void 0) return;
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
		route(ROUTES.update, async (req, res) => {
			if (!methodAllowed(req, res, ["POST"])) return;
			if (await readJsonBody(req, res) === void 0) return;
			sendJson(res, 200, await checkPublishedVersion(ctx));
		}),
		route(ROUTES.updateApply, async (req, res) => {
			if (!methodAllowed(req, res, ["POST"])) return;
			const body = await readJsonBody(req, res);
			if (body === void 0) return;
			sendJson(res, 200, await installPublishedVersion(ctx, body.version));
		}),
		route(ROUTES.checkout, (req, res) => handle(ctx, req, res, "write", (body, target) => {
			const branch = readBranch(body);
			if (branch === void 0) return {
				ok: false,
				...coded("missing-branch")
			};
			return switchBranch(target, branch);
		})),
		route(ROUTES.branchReport, (req, res) => handle(ctx, req, res, "read", (_body, target) => readBranchReport(target))),
		route(ROUTES.branchCreate, (req, res) => handle(ctx, req, res, "write", (body, target) => {
			const name = readRefName(body.name);
			if (name === void 0) return {
				ok: false,
				...coded("missing-name")
			};
			const start = readRefName(body.start);
			if (start === void 0) return {
				ok: false,
				...coded("missing-branch")
			};
			return createBranch(target, name, start);
		})),
		route(ROUTES.branchDelete, (req, res) => handle(ctx, req, res, "write", (body, target) => {
			const targets = readTargets(body);
			if (targets === void 0) return {
				ok: false,
				...coded("missing-branch")
			};
			return deleteBranches(target, targets);
		})),
		route(ROUTES.merge, (req, res) => handle(ctx, req, res, "write", (body, target) => {
			const branch = readBranch(body);
			if (branch === void 0) return {
				ok: false,
				...coded("missing-branch")
			};
			return mergeBranch(target, branch);
		})),
		route(ROUTES.conflict, (req, res) => handle(ctx, req, res, "read", (body, target) => withPath(body, (path) => readConflict(target, path)))),
		route(ROUTES.resolve, (req, res) => handle(ctx, req, res, "write", (body, target) => withPath(body, (path) => {
			const wholeFile = body.keys === void 0;
			const keys = wholeFile ? void 0 : readKeys(body.keys);
			if (!wholeFile && keys === void 0) return {
				ok: false,
				...coded("bad-choice")
			};
			const choice = readChoice(body, wholeFile);
			if (choice === void 0) return {
				ok: false,
				...coded("bad-choice")
			};
			return resolveConflict(target, path, choice, keys);
		}))),
		route(ROUTES.resolveDone, (req, res) => handle(ctx, req, res, "write", (body, target) => withPath(body, (path) => markResolved(target, path)))),
		route(ROUTES.mergeCommit, (req, res) => handle(ctx, req, res, "write", (body, target) => completeMerge(target, readMessage(body)))),
		route(ROUTES.fetch, (req, res) => handle(ctx, req, res, "write", (_body, target) => fetchRemotes(target))),
		route(ROUTES.fetchUpstream, (req, res) => handle(ctx, req, res, "write", (_body, target) => fetchUpstream(target))),
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
* The `subprocess` capability is a hard dependency too: it is the only way this
* half runs Git, so a composition without it has no Git tab to offer.
*/
const name = "dsh-cool-git";
/** The web carrier and the process substrate: without either there is no tab. */
const inject = ["webServer", "subprocess"];
function apply(ctx) {
	ctx.effect(() => registerRoutes(ctx), "dsh-cool-git: git routes");
}
//#endregion
export { ROUTES, apply, inject, name };
