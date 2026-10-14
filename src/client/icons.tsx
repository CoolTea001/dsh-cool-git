/**
 * The plugin's own icon set, rendered from the SVG artwork under
 * `src/client/assets/`.
 *
 * The client bundle is one JS file the platform's module loader evaluates, so
 * sibling asset files would never be fetched; tsdown.config.ts reads the artwork
 * at build time and exposes it as the `__DSH_CG_ICONS__` string map this module
 * consumes, keyed by asset filename stem.
 *
 * The artwork is 24-unit stroke markup riding `currentColor`, so every glyph
 * tints with the surrounding CSS, and none of it carries a size of its own: the
 * seat that wraps the glyph decides that, which is what lets the same refresh
 * mark sit at 13px in a toolbar button (see `.dsh-cg-icon svg` in `styles.ts`)
 * and at 12px beside the branch (`…-branch-icon svg`).
 *
 * Every component here takes no props: a caller places it inside the span whose
 * class owns the size, the color, and the spin.
 */

import { createElement, type ReactElement } from 'react'

/** Build-time define from tsdown.config.ts: raw SVG text per asset stem. */
declare const __DSH_CG_ICONS__: Record<string, string>

/** One asset's parsed artwork: the root viewBox, and the markup inside `<svg>`. */
interface IconArtwork {
  readonly viewBox: string
  readonly inner: string
}

/**
 * Parse one asset's raw SVG into the artwork its component renders.
 *
 * The root element is dropped rather than copied: its `width`/`height` belong to
 * the asset, not to this seat, and the root's `xmlns` would be redundant once the
 * markup is part of a larger document.
 *
 * @param name - the asset filename stem, e.g. `pull` for `assets/pull.svg`.
 * @returns the viewBox and inner markup to render.
 */
function iconArtwork(name: string): IconArtwork {
  const raw = __DSH_CG_ICONS__[name]
  if (raw === undefined) {
    throw new Error(`dsh-cool-git: missing icon asset '${name}.svg'`)
  }
  return {
    viewBox: /viewBox="([^"]+)"/.exec(raw)?.[1] ?? '0 0 24 24',
    inner: /<svg[^>]*>([\s\S]*)<\/svg>/.exec(raw)?.[1] ?? '',
  }
}

/**
 * Build one icon component from an asset's raw SVG markup.
 *
 * @param name - the asset filename stem.
 * @returns a component rendering exactly that artwork.
 */
function svgIcon(name: string) {
  const { viewBox, inner } = iconArtwork(name)
  return (): ReactElement =>
    createElement('svg', {
      viewBox,
      'aria-hidden': 'true',
      focusable: 'false',
      dangerouslySetInnerHTML: { __html: inner },
    })
}

/** The Workspace glyph: the project directory the session's repository lives in (assets/folder.svg). */
export const IconFolder = svgIcon('folder')

/** The branch glyph beside the branch name (assets/branch.svg). */
export const IconBranch = svgIcon('branch')

/**
 * The Pull glyph: an arrow pointing at this working tree (assets/pull.svg).
 *
 * Pull and push are one picture with the arrow reversed, which is what makes the
 * pair readable at 13px beside their counts.
 */
export const IconPull = svgIcon('pull')

/** The Push glyph: the same arrow leaving this working tree (assets/push.svg). */
export const IconPush = svgIcon('push')

/**
 * Publish this branch: send it to the remote and record the remote as its
 * upstream (assets/publish.svg).
 *
 * A cloud with an arrow into it rather than the push arrow, because this is not
 * the same act: Push sends what a branch and its upstream have between them,
 * Publish decides that the two are related at all.
 */
export const IconPublish = svgIcon('publish')

/** Re-read the repository (assets/refresh.svg). */
export const IconRefresh = svgIcon('refresh')

/**
 * Copy the patch on screen: the Diff 查看区 header's copy control
 * (assets/copy.svg).
 */
export const IconCopy = svgIcon('copy')

/**
 * The mark the copy control swaps to while it reports success (assets/check.svg).
 *
 * A state rather than a subject, and the one asset here that is: it is drawn from
 * the same 24-unit set as the mark it replaces, which is what keeps the swap from
 * changing the button's stroke weight.
 */
export const IconCheck = svgIcon('check')
