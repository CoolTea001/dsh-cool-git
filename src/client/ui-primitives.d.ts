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
  import type { InputHTMLAttributes, ReactElement, ReactNode, RefObject } from 'react'

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

  /** One selectable row of a {@link Menu}'s list. */
  export interface MenuItem {
    /** Stable id, handed back to the menu's `onSelect`. */
    id: string
    /** Visible row label. */
    label: ReactNode
    /** Leading icon, rendered in the row's own gutter. */
    icon?: ReactNode
    /** Whether the row cannot be activated. */
    disabled?: boolean
  }

  /** A hairline between two runs of rows; not selectable. */
  export interface MenuSeparator {
    type: 'separator'
    id: string
  }

  /** One primary-menu entry: a row or a separator. */
  export type MenuEntry = MenuItem | MenuSeparator

  /** Anchored dropdown menu props (the subset this plugin uses). */
  export interface MenuProps {
    /** Whether the list is showing (owner-controlled). */
    open: boolean
    /** The trigger element, rendered in place inside the menu's own wrapper. */
    anchor: ReactNode
    /** Selectable rows and separators, in the order the list draws them. */
    items?: readonly MenuEntry[]
    /** Row activation; closing the list stays the owner's decision. */
    onSelect?: (id: string) => void
    /** Outside click, Escape, or a blur that moved focus into an iframe. */
    onClose: () => void
    /** List alignment against the anchor (default `start`). */
    align?: 'start' | 'end'
    /** Open below (`bottom`, default) or above (`top`) the anchor. */
    side?: 'bottom' | 'top' | 'right'
    /** Render the list into `document.body`, escaping ancestor clipping. */
    portal?: boolean
    /** Extra class on the anchor wrapper span. */
    className?: string
    /** Extra class on the dropdown card; the only hook that reaches a portaled list. */
    listClassName?: string
  }

  /** Render an anchored dropdown menu with its own keyboard walk. */
  export function Menu(props: MenuProps): ReactElement

  /** Where an anchored panel sits, as a viewport corner. */
  export interface AnchoredPosition {
    readonly left: number
    readonly top: number
  }

  /** Inputs of {@link useAnchoredPosition}. */
  export interface AnchoredPositionOptions {
    /** Whether the panel is showing; a closed panel measures nothing. */
    open: boolean
    /** The control the panel hangs from. */
    anchorRef: RefObject<HTMLElement | null>
    /** The panel itself, measured so it can be clamped inside the viewport. */
    panelRef: RefObject<HTMLElement | null>
    /** Open below (`bottom`, default) or above (`top`) the anchor. */
    side?: 'bottom' | 'top'
    /** Align the panel's left edge with the anchor's (`start`, default) or right edge (`end`). */
    align?: 'start' | 'end'
    /** Anchor-to-panel distance in pixels. */
    gap?: number
    /** Distance the panel keeps from the viewport's edges. */
    margin?: number
  }

  /**
   * Track the viewport position of a panel anchored to a control.
   *
   * The answer moves with the page: it follows scrolling and resizing, and
   * re-clamps whenever the panel's own size changes. It is null while closed.
   */
  export function useAnchoredPosition(options: AnchoredPositionOptions): AnchoredPosition | null

  /**
   * Dismiss an open panel when the pointer goes down outside it.
   *
   * The anchor and the panel are both "inside", so a click on the control that
   * opened the panel is left to that control. `dismiss` is called with false
   * when the pointer landed anywhere else.
   */
  export function useDismissOnOutsidePointer(
    anchorRef: RefObject<HTMLElement | null>,
    open: boolean,
    dismiss: (open: boolean) => void,
    panelRef?: RefObject<HTMLElement | null>,
  ): void

  /**
   * Register one element as the topmost layer of the page.
   *
   * The platform's layer stack owns Escape, Tab cycling within the element, and
   * returning focus where it came from when the layer closes. DSH's own dialogs
   * register through this hook, which is why an open layer above a dialog
   * answers Escape first instead of closing the dialog underneath it.
   */
  export function useModalLayer(
    ref: RefObject<HTMLElement | null>,
    open: boolean,
    onClose: () => void,
  ): void
}
