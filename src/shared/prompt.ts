/**
 * The system prompt the commit-message writer uses when a Workspace has not
 * replaced it.
 *
 * It lives in `shared/` rather than in the Host half because both halves need
 * the same text: the Host sends it to the model, and the Settings dialog shows
 * it as the value of the prompt field, so that "what the default does" can be
 * read before it is changed. Keeping one copy is also what lets the dialog
 * decide that text equal to this prompt is not a customization at all — saving
 * it stores no override, and a future change to this copy still reaches a
 * Workspace that never meant to diverge from it.
 *
 * The prompt is English copy this project owns rather than sentences the page
 * words in the active locale: it is read by a model, not by the reader of the
 * Git tab, and a translated system prompt would make the same repository
 * generate different messages in different browser languages.
 */

/**
 * The project's commit rules, as the model is told them when no style is clear.
 *
 * These are the fallback rather than the instruction: the repository's own recent
 * messages are what the model is asked to write in the manner of, and these rules
 * are what it answers to when that sample says nothing — an unborn branch, a first
 * commit, a history with no pattern to it. They restate the commit rules of this
 * project (`AGENTS.md`), which a contributor reads before committing.
 */
const COMMIT_RULES: readonly string[] = [
  '1. Default to English, and keep the message concise.',
  '2. Check for temp files, large files, and sensitive content (keys, tokens, .env) before committing.',
  '3. Add a tag such as feat | refactor | fix | chore.',
]

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
export const DEFAULT_MESSAGE_PROMPT: string = [
  'You write the Git commit message for a working tree from the changes you are shown.',
  'Write it in the style of this repository\'s recent commits, which are shown to you: match their language, their tag prefix or lack of one, their mood, their capitalization, and whether they carry a body.',
  'When the recent commits do not establish a style — there are none, too few, or no consistent pattern — follow the project\'s commit rules instead:',
  ...COMMIT_RULES,
  'Keep the subject line at most 72 characters, and add a body only when the change needs one.',
  'Apply rule 2 before you write, whatever style you are following. When the check finds something the committer must look at first, put one line per finding after the message, each beginning with "WARNING: " and naming the path and what is wrong with it.',
  'Answer with the commit message alone: no Markdown, no code fences, no quotation marks around the message, and no commentary of your own.',
].join('\n')
