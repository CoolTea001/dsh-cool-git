/**
 * Package-owned stylesheet for the Git tab.
 *
 * The Conversation shell keeps two pieces of chrome mounted for every View:
 * the composer seat (the input card plus the todo dock above it) and the two
 * transcript width handles. The Git View uses neither, so both are suppressed
 * here instead of being unmounted — a pure CSS opt-out.
 *
 * Every rule is scoped by `:has()` over this plugin's own view root, which
 * exists only while the Git tab is mounted: Chat, 轨迹 and 终端 keep their
 * composer and handles untouched, and the rules disappear with the View.
 */

/** CSS rules, one selector per line. */
const GIT_CSS = [
  // `[data-conversation-content]` is the Conversation body; `[data-composer-seat]`
  // is the sticky seat holding the input card and the `conversation.input.dock`
  // rows (the todo panel). Hidden, not removed: the draft mirror and the input
  // store keep running for the Chat tab underneath.
  '[data-conversation-content]:has([data-dsh-cool-git="view"]) [data-composer-seat]{display:none}',
  // The two pointer-captured width handles (`[data-width-handle]`, left and
  // right) render as children of the same body, outside the scrollport — so
  // this selector cannot ride the composer's rule.
  '[data-conversation-content]:has([data-dsh-cool-git="view"]) [data-width-handle]{display:none}',
].join('\n')

/**
 * Insert the stylesheet once for the plugin lifetime.
 *
 * @returns disposer that removes exactly this element.
 */
export function insertGitStyles(): () => void {
  const element = document.createElement('style')
  element.setAttribute('data-dsh-cool-git', 'styles')
  element.textContent = GIT_CSS
  document.head.appendChild(element)
  return () => {
    element.remove()
  }
}
