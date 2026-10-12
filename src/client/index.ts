/**
 * Client entry for dsh-cool-git.
 *
 * Contributes exactly one 'conversation.view' entry, which is what turns into
 * a tab in the session's tab bar. The page reads the session's repository over
 * this package's own same-origin routes (see the Host half), so there are no
 * optional collaborators here. The shell's composer seat and transcript width
 * handles step aside while this tab is mounted — the handles through the root's
 * composer-overlay hook, the seat through the View itself plus the stylesheet
 * below.
 */

import { GitView } from './git.js'
import { insertGitStyles } from './styles.js'

export const name = 'dsh-cool-git/client'

export const inject = ['slots']

export function apply(ctx: any) {
  const slots = ctx.get('slots')
  if (slots === undefined) return

  ctx.effect(() => insertGitStyles(), 'dsh-cool-git: styles')

  // `conversation.view` is a list slot, and a list slot sorts by `order`
  // first (chat 0, trajectory 10, 终端 11), so `order: 12` puts Git last in
  // the tab bar.
  //
  // Do NOT pass `priority`: a dynamic plugin cannot win a priority contest
  // against the shipped entries, which would hide this tab entirely.
  //
  // Contributing through `slots.inject` ties the registration's lifetime to
  // the owner's declaration, so unloading this plugin (reload or HMR) removes
  // the tab with it.
  slots.inject('conversation.view', () =>
    slots.register({ name: 'conversation.view', id: 'git', order: 12, label: 'Git' }, GitView),
  )
}
