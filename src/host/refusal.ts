/**
 * How one Host answer refuses, in the two forms the payloads carry.
 *
 * A refusal this plugin can name travels as a code, because the page is what
 * knows the language to word it in: `shared/contract.ts` defines the code and
 * its params, and `client/locales.ts` owns the sentences. Anything else is text
 * another program wrote — Git's own diagnosis above all — which no dictionary can
 * own, so it travels verbatim.
 *
 * The Git reader (`git.ts`) and the route table (`routes.ts`) are what produce
 * these, and every `ok: false` payload they answer with spreads one of them, so
 * the union and the builder live here rather than in either of them.
 */

import type { Failure, FailureCode } from '../shared/contract.js'

/** One refusal, as an `ok: false` payload carries it. */
export type Refusal =
  | { readonly failure: Failure }
  | { readonly error: string }

/**
 * One coded refusal, shaped as a payload carries it.
 *
 * @param code - the refusal, whose sentence the page owns.
 * @param params - the values that sentence interpolates, when it has any.
 * @returns the payload fragment to spread into an `ok: false` answer.
 */
export function coded(code: FailureCode, params?: Readonly<Record<string, string | number>>): Refusal {
  return { failure: params === undefined ? { code } : { code, params } }
}
