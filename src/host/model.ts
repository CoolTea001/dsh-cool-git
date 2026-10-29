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

import type { MessageModel, MessageModelGroup, ModelEffortsPayload } from '../shared/contract.js'

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
export function defaultSelection(ctx: any): MessageModel | undefined {
  const service = ctx.get('agentDefaultModel')
  if (service === undefined || typeof service.currentSelection !== 'function') return undefined
  try {
    const selection = service.currentSelection()
    const provider = selection?.provider
    const model = selection?.model
    if (typeof provider !== 'string' || provider === '') return undefined
    if (typeof model !== 'string' || model === '') return undefined
    const effort = selection?.reasoningEffort
    return {
      provider,
      model,
      ...(typeof effort === 'string' && effort !== '' ? { reasoningEffort: effort } : {}),
    }
  } catch {
    /* an unreadable selection is no selection, which the page reports */
    return undefined
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
export async function readModelGroups(ctx: any): Promise<readonly MessageModelGroup[]> {
  const llm = ctx.get('llm')
  if (llm === undefined || typeof llm.listProviders !== 'function' || typeof llm.listModels !== 'function') {
    return []
  }

  let providers: readonly any[]
  try {
    providers = llm.listProviders()
  } catch {
    return []
  }
  if (!Array.isArray(providers)) return []

  const groups = await Promise.all(providers.map(async (provider): Promise<MessageModelGroup | undefined> => {
    const id = provider?.id
    if (typeof id !== 'string' || id === '') return undefined
    const name = typeof provider?.name === 'string' && provider.name !== '' ? provider.name : id
    try {
      const models = await llm.listModels(id)
      if (!Array.isArray(models)) return undefined
      const options = models
        .filter((model: any) => typeof model?.id === 'string' && model.id !== '' && typeof model?.name === 'string' && model.name !== '')
        .map((model: any) => ({ id: model.id, name: model.name }))
      return options.length === 0 ? undefined : { provider: id, name, models: options }
    } catch {
      return undefined
    }
  }))

  return groups.filter((group): group is MessageModelGroup => group !== undefined)
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
export async function readModelEfforts(
  ctx: any,
  provider: string,
  model: string,
): Promise<ModelEffortsPayload> {
  const llm = ctx.get('llm')
  if (llm === undefined || typeof llm.resolveModelInfo !== 'function') {
    return { ok: false, error: 'model service unavailable' }
  }
  try {
    const info = await llm.resolveModelInfo(provider, model)
    const declared = Array.isArray(info?.reasoning?.efforts) ? info.reasoning.efforts : []
    const efforts: string[] = []
    for (const effort of declared) {
      const id = effort?.id
      if (typeof id !== 'string' || id === '' || efforts.includes(id)) continue
      efforts.push(id)
    }
    return { ok: true, efforts }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}
