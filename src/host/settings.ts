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

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'

import { MAX_PROMPT_LENGTH, type MessageModel } from '../shared/contract.js'
import { DEFAULT_MESSAGE_PROMPT } from '../shared/prompt.js'

/** One Workspace's stored overrides; an absent member means "use the default". */
export interface WorkspaceMessageSettings {
  /** The model to call instead of DSH's current default selection. */
  readonly model?: MessageModel
  /** The system prompt to use instead of the built-in one. */
  readonly prompt?: string
}

/** One stored Workspace entry, as the document holds it. */
interface StoredWorkspace {
  readonly model?: MessageModel
  readonly prompt?: string
}

/** The document's shape, read defensively because it is a file on disk. */
interface StoredDocument {
  readonly version: number
  readonly workspaces: Readonly<Record<string, StoredWorkspace>>
}

/** Serialize this module's reads and writes; see the module note above. */
let queue: Promise<unknown> = Promise.resolve()

/**
 * Run one settings operation after every operation queued before it.
 *
 * @param task - the operation to run.
 * @returns the operation's own result, with its failure passed through.
 */
function serialized<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task)
  queue = run.then(() => undefined, () => undefined)
  return run
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
function harnessHome(ctx: any): string {
  const provided = ctx.get('dshHomePath')
  if (typeof provided === 'function') {
    try {
      const home = provided()
      if (typeof home === 'string' && home !== '') return home
    } catch {
      /* an unreadable capability falls through to the environment */
    }
  }
  const configured = process.env.DSH_HOME
  if (typeof configured === 'string' && configured.trim() !== '') return resolve(configured)
  return join(homedir(), '.dsh')
}

/**
 * The settings document for this deployment.
 *
 * @param ctx - the Host plugin context.
 * @returns the absolute path to read and write.
 */
export function settingsFilePath(ctx: any): string {
  return join(harnessHome(ctx), 'dsh-cool-git', 'settings.json')
}

/**
 * Whether a value is a record this module may read fields from.
 *
 * @param value - the value to test.
 * @returns true for a plain object.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Read one persisted model selection, rejecting anything `llm.stream` could not
 * take.
 *
 * @param value - the stored field.
 * @returns the selection, or undefined when it is absent or unusable.
 */
function parseModel(value: unknown): MessageModel | undefined {
  if (!isRecord(value)) return undefined
  const provider = value.provider
  const model = value.model
  if (typeof provider !== 'string' || provider === '' || provider.length > 200) return undefined
  if (typeof model !== 'string' || model === '' || model.length > 200) return undefined
  const effort = value.reasoningEffort
  return {
    provider,
    model,
    ...(typeof effort === 'string' && effort !== '' && effort.length <= 100 ? { reasoningEffort: effort } : {}),
  }
}

/**
 * Read one persisted prompt, rejecting a value the textarea could not hold.
 *
 * @param value - the stored field.
 * @returns the prompt, or undefined when it is absent or unusable.
 */
function parsePrompt(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  if (value.trim() === '' || value.length > MAX_PROMPT_LENGTH) return undefined
  return value
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
async function readDocument(ctx: any): Promise<Record<string, StoredWorkspace>> {
  let text: string
  try {
    text = await readFile(settingsFilePath(ctx), 'utf8')
  } catch {
    return {}
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return {}
  }
  if (!isRecord(parsed) || !isRecord(parsed.workspaces)) return {}

  const workspaces: Record<string, StoredWorkspace> = {}
  for (const [key, value] of Object.entries(parsed.workspaces)) {
    if (!isRecord(value)) continue
    const model = parseModel(value.model)
    const prompt = parsePrompt(value.prompt)
    if (model === undefined && prompt === undefined) continue
    workspaces[key] = {
      ...(model === undefined ? {} : { model }),
      ...(prompt === undefined ? {} : { prompt }),
    }
  }
  return workspaces
}

/**
 * Write the whole document, creating its directory when needed.
 *
 * @param ctx - the Host plugin context.
 * @param workspaces - the entries to persist.
 */
async function writeDocument(ctx: any, workspaces: Readonly<Record<string, StoredWorkspace>>): Promise<void> {
  const file = settingsFilePath(ctx)
  const document: StoredDocument = { version: 1, workspaces }
  await mkdir(dirname(file), { recursive: true })
  await writeFile(file, `${JSON.stringify(document, null, 2)}\n`, 'utf8')
}

/**
 * Read one Workspace's overrides.
 *
 * @param ctx - the Host plugin context.
 * @param workspacePath - the Workspace's canonical path, or the repository root.
 * @returns the stored choices; empty when nothing has been saved.
 */
export function readWorkspaceSettings(ctx: any, workspacePath: string): Promise<WorkspaceMessageSettings> {
  return serialized(async () => {
    const workspaces = await readDocument(ctx)
    const entry = workspaces[workspacePath]
    if (entry === undefined) return {}
    return {
      ...(entry.model === undefined ? {} : { model: entry.model }),
      ...(entry.prompt === undefined ? {} : { prompt: entry.prompt }),
    }
  })
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
export function saveWorkspaceSettings(
  ctx: any,
  workspacePath: string,
  next: WorkspaceMessageSettings,
): Promise<void> {
  return serialized(async () => {
    const workspaces = await readDocument(ctx)
    const entry: StoredWorkspace = {
      ...(next.model === undefined ? {} : { model: next.model }),
      ...(next.prompt === undefined ? {} : { prompt: next.prompt }),
    }
    if (entry.model === undefined && entry.prompt === undefined) delete workspaces[workspacePath]
    else workspaces[workspacePath] = entry
    await writeDocument(ctx, workspaces)
  })
}

/** The result of normalizing one model field from a request body. */
type ModelChoice =
  | { readonly ok: true; readonly value: MessageModel | undefined }
  | { readonly ok: false }

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
export function readModelChoice(value: unknown): ModelChoice {
  if (value === null || value === undefined) return { ok: true, value: undefined }
  if (!isRecord(value)) return { ok: false }
  const provider = value.provider
  const model = value.model
  if (typeof provider !== 'string' || provider === '' || provider.length > 200) return { ok: false }
  if (typeof model !== 'string' || model === '' || model.length > 200) return { ok: false }
  const effort = value.reasoningEffort
  return {
    ok: true,
    value: {
      provider,
      model,
      ...(typeof effort === 'string' && effort !== '' && effort.length <= 100 ? { reasoningEffort: effort } : {}),
    },
  }
}

/** The result of normalizing one prompt field from a request body. */
type PromptChoice =
  | { readonly ok: true; readonly value: string | undefined }
  | { readonly ok: false }

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
export function readPromptChoice(value: unknown): PromptChoice {
  if (value === null || value === undefined) return { ok: true, value: undefined }
  if (typeof value !== 'string' || value.length > MAX_PROMPT_LENGTH) return { ok: false }
  const trimmed = value.trim()
  if (trimmed === '' || trimmed === DEFAULT_MESSAGE_PROMPT.trim()) return { ok: true, value: undefined }
  return { ok: true, value }
}
