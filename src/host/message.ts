/**
 * The Host half's commit-message writer.
 *
 * The commit form's Generate control asks the Host for a message, and the Host
 * writes one with DSH's *current default model* rather than with a route of this
 * plugin's own: `agentDefaultModel` is where the deployment records which
 * provider, model, and reasoning effort a new conversation would run on, so the
 * message is written by the model the user is already paying for and switching
 * that default switches this too. Nothing here caches the selection — it is read
 * per request, exactly as the model picker reads it.
 *
 * The material is the repository itself, read once through `readChangeDigest`:
 * the changed paths, the tracked patch with its `--stat`, and the untracked files
 * no patch against HEAD can reach. That is what makes the model's rule 2 check
 * mean anything — `.env` is on the list because it is on disk, and an oversized
 * binary file is visible through the `--stat` line that carries its byte size.
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
 * The prompt is the project's commit rules, carried by `AGENTS.md` and repeated
 * here as constants: the rules are what the model is asked to follow, so they are
 * the one piece of copy this half owns rather than a sentence the page words in
 * the active locale.
 */

import type { ChangedFile, MessagePayload } from '../shared/contract.js'
import { readChangeDigest, type ChangeDigest, type GitTarget } from './git.js'
import { coded, type Refusal } from './refusal.js'

/**
 * The project's commit rules, as the model is told them.
 *
 * Verbatim, and kept that way: these are the rules a contributor reads before
 * committing, so the generator must answer to the same ones rather than to a
 * paraphrase that would drift from them.
 */
const COMMIT_RULES: readonly string[] = [
  '1. Commit messages must be in English and kept concise.',
  '2. Before commit, check for temp files, large files, and sensitive content (keys, tokens, .env).',
  '3. Commit messages must be prefixed with a tag such as feat | refactor | fix | chore.',
]

/**
 * What the model is told before it is shown the changes.
 *
 * Rule 2 is a pre-commit check rather than a shape for the message, so the model
 * needs somewhere to put what it finds: the answer is split into the message and
 * the `WARNING:` lines that follow it (see `splitAnswer`), which is what keeps a
 * finding out of the commit message and still in front of the person about to
 * commit.
 */
const SYSTEM_PROMPT: string = [
  'You write the Git commit message for a working tree from the changes you are shown.',
  'The commit rules for this project:',
  ...COMMIT_RULES,
  'Answer with the commit message alone: one subject line in the imperative mood, at most 72 characters, and — only when the change needs one — a blank line followed by a short body.',
  'Apply rule 2 before you write. When the check finds something the committer must look at first, put one line per finding after the message, each beginning with "WARNING: " and naming the path and what is wrong with it.',
  'Do not use Markdown, code fences, or quotation marks around the message, and add no commentary of your own.',
].join('\n')

/**
 * Longest answer the model may write.
 *
 * A message is a subject and a few lines; the cap is not a length this plugin
 * wants to reach, it is what keeps a model that ignored the instructions from
 * spending a whole context window on one commit message.
 */
const MAX_OUTPUT_TOKENS = 512

/**
 * How long one generation may take, end to end.
 *
 * The default selection can name a high reasoning effort, and a large change set
 * is slow to read, so the bound is generous; it exists for the request that would
 * otherwise never answer at all, holding the page's Generate control disabled and
 * a connection open behind it.
 */
const GENERATE_TIMEOUT_MS = 120_000

/**
 * The shape a finding line takes, and the prefix that is stripped from it.
 *
 * A model that follows the instruction writes `WARNING: <finding>`; the ones that
 * do not write a warning glyph, a localized word, or nothing at all. The pattern
 * accepts the spellings worth accepting and nothing else, because a line wrongly
 * taken for a warning is a line dropped from the commit message.
 */
const WARNING_LINE = /^\s{0,4}(?:warnings?|注意|警告|⚠)\s*[:：]\s*/iu

/** One model route, as `agentDefaultModel` reports and `llm.stream` takes it. */
interface ModelSelection {
  readonly provider: string
  readonly model: string
  readonly reasoningEffort?: string
}

/** What the model answered, once its stream has been assembled. */
interface ModelAnswer {
  readonly text: string
}

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
function defaultSelection(ctx: any): ModelSelection | undefined {
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
function describeFile(file: ChangedFile): string {
  const flags: string[] = [file.kind]
  if (file.origPath !== undefined) flags.push(`renamed from ${file.origPath}`)
  if (file.untracked) flags.push('untracked, so not in the index')
  else if (file.conflicted) flags.push('unresolved conflict')
  else flags.push(file.staged ? (file.unstaged ? 'staged in part' : 'staged') : 'not staged')
  return `${file.index}${file.worktree} ${file.path} (${flags.join(', ')})`
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
 * @param digest - the repository read.
 * @returns the user message's text.
 */
function promptText(digest: Extract<ChangeDigest, { ok: true }>): string {
  const lines: string[] = []
  lines.push(`This working tree has ${digest.files.length} changed path(s).`)
  lines.push('')
  lines.push('Changed paths (git status --porcelain, XY then path):')
  for (const file of digest.files) lines.push(`  ${describeFile(file)}`)

  lines.push('')
  lines.push('Tracked changes (git diff --stat):')
  lines.push(digest.stat === '' ? '  (none)' : digest.stat)

  lines.push('')
  lines.push('Tracked changes (git diff, staged and unstaged):')
  if (digest.patch === '') lines.push('  (none)')
  else {
    lines.push(digest.patch)
    if (digest.patchTruncated) lines.push('[the patch above was cut at the read limit]')
  }

  lines.push('')
  if (digest.untracked.length === 0) {
    lines.push('Untracked files: none.')
  } else {
    lines.push('Untracked files (git diff --no-index --stat -p against /dev/null):')
    for (const preview of digest.untracked) {
      lines.push(`--- ${preview.path}${preview.truncated ? ' (cut at the read limit)' : ''}`)
      lines.push(preview.text)
    }
  }
  return lines.join('\n')
}

/**
 * Assemble the model's streamed answer into one string.
 *
 * Only text deltas are kept: the plugin asks for no tools, so a tool call would
 * be an answer it cannot use, and reasoning deltas are the model's own working
 * and are not the message. A terminal `error` or `aborted` finish is the only
 * thing that turns the stream into a refusal, because those are the two finishes
 * that carry no usable answer at all.
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
 * @returns the assembled answer, or the refusal to report.
 */
async function askModel(
  llm: any,
  selection: ModelSelection,
  prompt: string,
  sessionId: string | undefined,
): Promise<ModelAnswer | { readonly refusal: Refusal }> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), GENERATE_TIMEOUT_MS)
  let text = ''
  try {
    const options = {
      provider: selection.provider,
      model: selection.model,
      ...(selection.reasoningEffort === undefined ? {} : { reasoningEffort: selection.reasoningEffort }),
      maxTokens: MAX_OUTPUT_TOKENS,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: [{ type: 'text', text: prompt }] }],
      signal: controller.signal,
      ...(sessionId === undefined || sessionId === '' ? {} : { sessionId }),
    }
    for await (const chunk of llm.stream(options)) {
      if (chunk?.type !== 'finish') {
        if (chunk?.type === 'text-delta' && typeof chunk.text === 'string') text += chunk.text
        continue
      }
      const reason = chunk.reason
      if (reason?.kind === 'error') return { refusal: { error: failureText(reason.failure) } }
      if (reason?.kind === 'aborted') {
        return {
          refusal: controller.signal.aborted
            ? coded('model-timeout')
            : { error: failureText(reason.failure) },
        }
      }
    }
  } catch (error) {
    return { refusal: { error: error instanceof Error ? error.message : String(error) } }
  } finally {
    clearTimeout(timer)
  }
  return { text }
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
function failureText(failure: unknown): string {
  const message = (failure as { message?: unknown } | undefined)?.message
  const code = (failure as { code?: unknown } | undefined)?.code
  const text = typeof message === 'string' && message !== '' ? message : 'the model call failed'
  return typeof code === 'string' && code !== '' ? `${text} (${code})` : text
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
function splitAnswer(raw: string): { readonly message: string; readonly warnings: readonly string[] } {
  // A model that wrapped its answer in a code fence has still written the
  // message; the fence is the model's formatting, not part of any subject line.
  const cleaned = raw.replace(/^\s*```[a-zA-Z]*\s*\n?/u, '').replace(/\n?```\s*$/u, '').trim()
  const lines = cleaned.split(/\r?\n/u)
  const cut = lines.findIndex(line => WARNING_LINE.test(line))
  if (cut <= 0) return { message: cleaned, warnings: [] }
  const message = lines.slice(0, cut).join('\n').trim()
  if (message === '') return { message: cleaned, warnings: [] }
  const warnings = lines
    .slice(cut)
    .filter(line => WARNING_LINE.test(line))
    .map(line => line.replace(WARNING_LINE, '').trim())
    .filter(line => line !== '')
  return { message, warnings }
}

/**
 * Write one commit message for the changes this working tree holds.
 *
 * The order of the checks is the order the page can act on them: a working tree
 * with nothing changed is refused before any model is looked for, because a
 * missing model is not what the user needs to hear about a clean tree.
 *
 * @param ctx - the Host plugin context.
 * @param target - the shell seam, the session's directory, and the file policy.
 * @param sessionId - the session the request named, for the model call's own
 * attribution; the repository is resolved from it already, never from a path.
 * @returns the payload the page fills its form from.
 */
export async function generateCommitMessage(
  ctx: any,
  target: GitTarget,
  sessionId?: string,
): Promise<MessagePayload> {
  const digest = await readChangeDigest(target)
  if (digest.ok !== true) return { ok: false, ...digest.refusal, reason: digest.reason }
  if (digest.files.length === 0) return { ok: false, ...coded('commit-clean'), reason: 'clean' }

  const llm = ctx.get('llm')
  if (llm === undefined || typeof llm.stream !== 'function') return { ok: false, ...coded('no-llm') }
  const selection = defaultSelection(ctx)
  if (selection === undefined) return { ok: false, ...coded('no-model') }

  const answer = await askModel(llm, selection, promptText(digest), sessionId)
  if ('refusal' in answer) return { ok: false, ...answer.refusal }

  const { message, warnings } = splitAnswer(answer.text)
  if (message === '') return { ok: false, ...coded('empty-message') }
  return {
    ok: true,
    message,
    ...(warnings.length === 0 ? {} : { warnings }),
  }
}
