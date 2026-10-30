/**
 * The Host half's commit-message writer.
 *
 * The commit form's Generate control asks the Host for a message, and the Host
 * writes one with the model and prompt this Workspace has chosen in Settings.
 * When it has chosen neither, the call falls back to DSH's *current default
 * model* — `agentDefaultModel` is where the deployment records which provider,
 * model, and reasoning effort a new conversation would run on, so the message is
 * written by the model the user is already paying for and switching that default
 * switches this too — and to the built-in prompt in `shared/prompt.ts`. Nothing
 * here caches either choice: both are read per request, exactly as the model
 * picker and the Settings dialog read them.
 *
 * The material is the repository itself, read once through `readChangeDigest`:
 * the changed paths, the tracked patch with its `--stat`, the untracked files no
 * patch against HEAD can reach, and the branch's own recent messages. That is what
 * makes the model's rule 2 check mean anything — `.env` is on the list because it
 * is on disk, and an oversized binary file is visible through the `--stat` line
 * that carries its byte size — and it is also what the message is asked to imitate,
 * so the style the repository already commits in is evidence rather than a guess.
 *
 * Two things are deliberately not here. This module never stages or commits
 * anything: generating a message is a read, it leaves the index and the history
 * alone, and the Commit button remains the only thing on the page that writes.
 * And the message is never checked against Git's own rules beyond being
 * non-empty, because it is a draft the user reads before pressing Commit — the
 * one place a message has to be right is the commit itself.
 *
 * The model call names the session that asked, so the spend is attributed the way
 * every other call in that conversation is; it does not enter the conversation's
 * log, because a draft the page may throw away is not a turn. That is also why the
 * call is not marked as an agent-loop request: the title generator reads those
 * markers, and a commit message is nobody's session title.
 *
 * The prompt is two pieces of English copy this half owns rather than sentences
 * the page words in the active locale: the style the recent messages show, and the
 * project's commit rules (`AGENTS.md`) as the answer when that style cannot be
 * read. The system prompt itself lives in `shared/prompt.ts`, because the
 * Settings dialog shows the same text as the built-in default.
 */
import type { MessagePayload } from '../shared/contract.js';
import { type GitTarget } from './git.js';
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
export declare function generateCommitMessage(ctx: any, target: GitTarget, sessionId?: string): Promise<MessagePayload>;
//# sourceMappingURL=message.d.ts.map