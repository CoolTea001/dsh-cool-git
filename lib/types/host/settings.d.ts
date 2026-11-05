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
import { type MessageModel } from '../shared/contract.js';
/** One Workspace's stored overrides; an absent member means "use the default". */
export interface WorkspaceMessageSettings {
    /** The model to call instead of DSH's current default selection. */
    readonly model?: MessageModel;
    /** The system prompt to use instead of the built-in one. */
    readonly prompt?: string;
}
/**
 * The settings document for this deployment.
 *
 * @param ctx - the Host plugin context.
 * @returns the absolute path to read and write.
 */
export declare function settingsFilePath(ctx: any): string;
/**
 * Read one Workspace's overrides.
 *
 * @param ctx - the Host plugin context.
 * @param workspacePath - the Workspace's canonical path, or the repository root.
 * @returns the stored choices; empty when nothing has been saved.
 */
export declare function readWorkspaceSettings(ctx: any, workspacePath: string): Promise<WorkspaceMessageSettings>;
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
export declare function saveWorkspaceSettings(ctx: any, workspacePath: string, next: WorkspaceMessageSettings): Promise<void>;
/** The result of normalizing one model field from a request body. */
type ModelChoice = {
    readonly ok: true;
    readonly value: MessageModel | undefined;
} | {
    readonly ok: false;
};
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
export declare function readModelChoice(value: unknown): ModelChoice;
/** The result of normalizing one prompt field from a request body. */
type PromptChoice = {
    readonly ok: true;
    readonly value: string | undefined;
} | {
    readonly ok: false;
};
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
export declare function readPromptChoice(value: unknown): PromptChoice;
export {};
//# sourceMappingURL=settings.d.ts.map