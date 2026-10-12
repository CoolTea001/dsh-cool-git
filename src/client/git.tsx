/**
 * The Git conversation view.
 *
 * A placeholder page: the tab exists so the session tab bar can switch to a
 * Git surface, and nothing is implemented yet. It deliberately renders no
 * data, owns no store, and talks to no route — diff viewing and Git
 * operations are a later step.
 */

import type { CSSProperties, ReactElement } from 'react'

/** Container style: fill the conversation body and centre the placeholder. */
const PAGE: CSSProperties = {
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  // `currentColor` follows the active theme in both light and dark modes.
  color: 'currentColor',
  opacity: 0.55,
  userSelect: 'none',
}

/** One placeholder line. */
const LINE: CSSProperties = {
  margin: 0,
  fontSize: 14,
  lineHeight: 1.5,
}

/**
 * Render the Git tab's body.
 * @returns the placeholder page element.
 */
export function GitView(): ReactElement {
  return (
    <div data-dsh-cool-git="view" style={PAGE}>
      <p style={{ ...LINE, fontSize: 18, fontWeight: 600 }}>Git</p>
      <p style={LINE}>页面建设中</p>
    </div>
  )
}
