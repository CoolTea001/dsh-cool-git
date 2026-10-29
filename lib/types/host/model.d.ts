/**
 * The Host half's model directory, as the commit-message feature reads it.
 *
 * Two questions live here because both halves of the feature ask them: which
 * route writes a message when the Workspace has not chosen one, and which
 * routes the Settings dialog may offer. The answers are read from DSH's own
 * services on every request rather than copied into this plugin's settings
 * file, so a model added, removed, or made current by the rest of the app is
 * reflected the next time the dialog opens and the next time Generate runs.
 *
 * `agentDefaultModel` is the deployment's current default selection. DSH's
 * Session model picker saves through that service whenever the user switches
 * models, which is why it is also the model the user last chose in a session —
 * the same choice the Chat tab would make for a new conversation.
 */
import type { MessageModel, MessageModelGroup, ModelEffortsPayload } from '../shared/contract.js';
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
export declare function defaultSelection(ctx: any): MessageModel | undefined;
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
export declare function readModelGroups(ctx: any): Promise<readonly MessageModelGroup[]>;
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
export declare function readModelEfforts(ctx: any, provider: string, model: string): Promise<ModelEffortsPayload>;
//# sourceMappingURL=model.d.ts.map