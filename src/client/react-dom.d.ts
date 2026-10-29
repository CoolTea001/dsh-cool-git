/**
 * Ambient shape of the platform-seeded `react-dom` module.
 *
 * The web boot answers `react-dom` as a seed word for every client bundle — it
 * is listed beside `react` and the primitives module in the bundle's
 * `neverBundle` set — so this package must not inline it and has no build
 * dependency on its types. This declaration covers exactly the export the
 * Settings picker uses: a popover has to escape the modal's scrollport, which is
 * what a portal is for.
 */

declare module 'react-dom' {
  import type { ReactElement, ReactNode } from 'react'

  /**
   * Render one element under another DOM node instead of under its parent.
   *
   * @param children - the element to render.
   * @param container - the DOM node to render it into.
   * @returns the portal element.
   */
  export function createPortal(children: ReactNode, container: Element | DocumentFragment): ReactElement
}
