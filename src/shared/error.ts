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
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
