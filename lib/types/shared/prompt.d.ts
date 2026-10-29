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
export declare const DEFAULT_MESSAGE_PROMPT: string;
//# sourceMappingURL=prompt.d.ts.map