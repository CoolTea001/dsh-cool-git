/**
 * Ambient shape of the platform-seeded primitives module.
 *
 * `@deepseek-ai/dsh-client-ui-primitives` is a module-table seed word the web
 * boot answers for every client bundle, so it is a runtime `require` this
 * package must not inline (see tsdown.config.ts). The package is not a build
 * dependency here, hence this local declaration: it covers exactly the exports
 * this plugin consumes.
 */

declare module '@deepseek-ai/dsh-client-ui-primitives' {
  import type { InputHTMLAttributes, ReactElement, ReactNode } from 'react'

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

  /**
   * Single-line text entry props (the subset this plugin uses).
   *
   * Native input attributes pass through to the field itself, `data-modal-autofocus`
   * included; `className` is the one exception, and lands on the frame around it.
   */
  export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> {
    /** Optional 16px leading icon node, rendered inside the frame before the field. */
    icon?: ReactNode
    /** Extra class for the frame element that carries the field's border and fill. */
    className?: string
  }

  /** Render the platform's single-line text field. */
  export function Input(props: InputProps): ReactElement

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
    /** Extra class for the dialog card; how a caller sizes it. */
    className?: string
    /** Render children directly in the card, without the default chrome. */
    headless?: boolean
    /** Disable the mask blur when the caller already blurs the page. */
    backdropBlur?: boolean
  }

  /** Render a centered, body-portaled modal over a blurred mask. */
  export function Modal(props: ModalProps): ReactElement

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
