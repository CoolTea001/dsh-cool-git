/**
 * Ambient shape of the platform-seeded primitives module.
 *
 * `@deepseek-ai/dsh-client-ui-primitives` is a module-table seed word the web
 * boot answers for every client bundle, so it is a runtime `require` this
 * package must not inline (see tsdown.config.ts). The package is not a build
 * dependency here, hence this local declaration: it covers exactly the exports
 * this plugin consumes, mirroring packages/client/ui-primitives/src/Menu.tsx.
 */

declare module '@deepseek-ai/dsh-client-ui-primitives' {
  import type { ReactElement, ReactNode } from 'react'

  /** Button visual weight (the subset this plugin uses). */
  export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'

  /** Button height (the subset this plugin uses). */
  export type ButtonSize = 'sm' | 'md' | 'lg'

  /** Button props (the subset this plugin uses). */
  export interface ButtonProps {
    /** Visual weight; `ghost` when omitted. */
    variant?: ButtonVariant
    /** Height; `md` when omitted. */
    size?: ButtonSize
    /** Leading icon element. */
    icon?: ReactNode
    className?: string
    disabled?: boolean
    type?: 'button' | 'submit' | 'reset'
    onClick?: () => void
    children?: ReactNode
  }

  /** Render the platform's button. */
  export function Button(props: ButtonProps): ReactElement

  /** Centered modal dialog props (the subset this plugin uses). */
  export interface ModalProps {
    /** Whether the dialog is showing; a closed dialog renders nothing. */
    open: boolean
    /** Application close command, Escape, or a mask click. */
    onClose: () => void
    /** Dialog heading, and the dialog's accessible name. */
    title: string
    /** Localized accessible label for the header's close button. */
    closeLabel: string
    /** Optional supporting sentence under the title. */
    description?: string
    /** Dialog body, rendered in a scrollable region under the title. */
    children?: ReactNode
    /** Action row along the bottom. */
    footer?: ReactNode
    /** Render children directly in the card, without the default chrome. */
    headless?: boolean
    /** Disable the mask blur when the caller already blurs the page. */
    backdropBlur?: boolean
  }

  /** Render a centered, body-portaled modal over a blurred mask. */
  export function Modal(props: ModalProps): ReactElement

  /** Selectable row, optionally with a nested submenu. */
  export interface MenuItem {
    id: string
    label: ReactNode
    disabled?: boolean
    /** Leading icon. */
    icon?: ReactNode
    /** Destructive row: error-colored text and a danger hover fill. */
    danger?: boolean
    /** Nested card opened to the right on hover or focus. */
    submenu?: readonly MenuItem[]
  }

  /** Hairline between item groups (not selectable). */
  export interface MenuSeparator {
    type: 'separator'
    id: string
  }

  /** Non-interactive heading row above a group of items. */
  export interface MenuLabel {
    type: 'label'
    id: string
    text: string
  }

  /** One menu entry: a row, a separator, or a heading label. */
  export type MenuEntry = MenuItem | MenuSeparator | MenuLabel

  /** Anchored dropdown menu props (the subset this plugin uses). */
  export interface MenuProps {
    /** Whether the list is showing (owner-controlled). */
    open: boolean
    /** The trigger element, rendered in place. */
    anchor: ReactNode
    /** Selectable rows and optional separators or labels. */
    items?: readonly MenuEntry[]
    /**
     * Focus the first row on open. Arrow-key navigation works either way, so
     * this decides only whether the keyboard enters the list by itself.
     */
    autoFocus?: boolean
    /** Row click callback; not called for disabled rows. */
    onSelect?: (id: string) => void
    /** Invoked on outside click, Escape, or a window blur that left the document. */
    onClose: () => void
    /** List alignment against the anchor. */
    align?: 'start' | 'end'
    /** Open below (`bottom`, default), above (`top`), or beside (`right`). */
    side?: 'bottom' | 'top' | 'right'
    /** Render into `document.body` with fixed positioning, escaping ancestor clipping. */
    portal?: boolean
    /** Row marked as the current one; how it is marked is `selection`. */
    selectedId?: string | undefined
    /** Mark the current row with a check glyph, or with the fill alone. */
    selection?: 'check' | 'fill'
    /** Extra class on the anchor wrapper (the caller positions; this draws). */
    className?: string | undefined
    /** Extra class on the list card. */
    listClassName?: string | undefined
  }

  /** Render an anchored dropdown menu. */
  export function Menu(props: MenuProps): ReactElement

  /** Placement of a tooltip bubble relative to its anchor. */
  export type TooltipSide = 'right' | 'bottom' | 'top'

  /** Anchored tooltip props (the subset this plugin uses). */
  export interface TooltipProps {
    /** Bubble text, or a resolver evaluated only while the bubble is visible. */
    label: string | (() => string)
    /** Placement relative to the anchor (default `right`). */
    side?: TooltipSide
    /** Edge alignment for a `bottom`/`top` bubble (default `center`). */
    align?: 'center' | 'end'
    /** Hover delay in milliseconds (default 0). */
    delayMs?: number
    /** Anchor-to-bubble distance for `bottom`/`top` (default 8). */
    gap?: number
    /** Suppress the bubble while true, without remounting the anchor. */
    disabled?: boolean
    /** Render the bubble under `document.body`, escaping ancestor clipping. */
    portal?: boolean
    /** Bubble width cap in pixels. */
    maxWidth?: number
    /** The single anchor element the bubble is attached to. */
    children: ReactElement
  }

  /** Attach a hover/focus tooltip to one anchor element. */
  export function Tooltip(props: TooltipProps): ReactElement
}
