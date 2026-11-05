/**
 * The plugin page's update row.
 *
 * The native Plugins panel draws this bundle's page, and that page's own facts
 * list — the install source and the current version — is the page owner's to
 * render: no slot reaches inside it. What the page does offer is
 * `plugins.detail.section`, a list slot rendered under its own content, whose
 * entries are handed the page's `subject`. This module registers one entry there
 * and draws the two things the native page has no room for: the plugin's npm and
 * GitHub links, and — when the registry publishes something newer than the
 * installed version — a capsule saying so, with the text button that installs it.
 *
 * The capsule is the row's only announcement, and it appears only when there is
 * something to announce: a page that is up to date shows the two links and
 * nothing else, so the row never states "up to date" as if it were a result the
 * reader asked for.
 *
 * Nothing here is a second Plugins panel. The row appears only on this bundle's
 * own page (`subject.kind === 'bundle'` and the package's own name), and the two
 * questions it asks the Host are its own routes: which version is published, and
 * install that one. Every other page sees `null` from this entry.
 */

import { useCallback, useEffect, useState, type ReactElement, type ReactNode } from 'react'
import {
  PACKAGE_NAME,
  PACKAGE_NPM_PAGE,
  PACKAGE_REPOSITORY,
  type UpdateApplyPayload,
} from '../shared/contract.js'
import { applyUpdate, checkUpdate } from './api.js'
import { IconGithub, IconNpm } from './icons.js'
import type { Translate } from './locales.js'

/** What this bundle's page hands the section: the page's subject and its `t`. */
export interface UpdateSectionProps {
  readonly t: Translate
  /** The page's subject, which is `{ kind: 'bundle', pkg }` on a bundle page. */
  readonly subject: unknown
}

/** Where the row's own conversation with the Host stands. */
type Phase = 'checking' | 'ready' | 'confirm' | 'applying' | 'done' | 'failed'

/** One render's worth of state: the phase, the answers, and the sentence it draws. */
interface RowState {
  readonly phase: Phase
  /** The published version, once the Host has named one. */
  readonly latest?: string
  /** How the profile installs this bundle, as the manager recorded it. */
  readonly source?: string
  /** The manager's answer after a successful install. */
  readonly application?: UpdateApplyPayload['application']
  /** Which step failed: reading the registry, or installing. */
  readonly failedAt?: 'check' | 'install'
  /** The reason that step failed, carried as the capsule's tooltip. */
  readonly reason?: string
}

/**
 * Read the subject as this bundle's own page.
 *
 * A bundle page hands `{ kind: 'bundle', pkg }`, where `pkg` names the package
 * and its version; a row's page and an official plugin's page hand a different
 * shape, and another bundle's page names another package. All of those are "not
 * mine" and render nothing.
 *
 * @param subject - the page's subject, as the framework passed it.
 * @returns the installed version the page states, when the page is this bundle's.
 */
function ownVersion(subject: unknown): { readonly version?: string } | undefined {
  if (subject === null || typeof subject !== 'object') return undefined
  const value = subject as { kind?: unknown; pkg?: unknown }
  if (value.kind !== 'bundle' || value.pkg === null || typeof value.pkg !== 'object') return undefined
  const pkg = value.pkg as { name?: unknown; version?: unknown }
  if (pkg.name !== PACKAGE_NAME) return undefined
  return { ...(typeof pkg.version === 'string' ? { version: pkg.version } : {}) }
}

/**
 * One version as its numeric parts, prerelease suffix ignored.
 *
 * The comparison only has to answer "is the published one newer than the
 * installed one", and both sides are npm release versions; a prerelease suffix
 * compares as equal to the release it names, which is the conservative answer —
 * the row offers nothing for `0.6.0-rc.1` published beside `0.6.0`.
 *
 * @param version - a version string.
 * @returns its three numbers, or undefined when it is not a plain version.
 */
function versionParts(version: string): readonly [number, number, number] | undefined {
  const match = /^(\d+)\.(\d+)\.(\d+)/.exec(version)
  if (match === null) return undefined
  return [Number(match[1]), Number(match[2]), Number(match[3])]
}

/**
 * Whether one published version is newer than another.
 *
 * @param latest - the version the registry named.
 * @param current - the installed version, when the page stated one.
 * @returns true when `latest` is strictly newer, or when no installed version is known.
 */
function isNewer(latest: string, current: string | undefined): boolean {
  if (current === undefined) return true
  const left = versionParts(latest)
  const right = versionParts(current)
  if (left === undefined || right === undefined) return latest !== current
  for (let index = 0; index < 3; index += 1) {
    if (left[index] !== right[index]) return left[index] > right[index]
  }
  return false
}

/**
 * Whether the profile installs this bundle from a working copy rather than a
 * registry.
 *
 * `link:` and `file:` are the two specs pnpm keeps a development checkout under;
 * installing a published version replaces that record instead of updating the
 * checkout, which is the one consequence the confirm sentence has to say.
 *
 * @param source - the recorded spec, as the manager reports it.
 * @returns true when the install is a development one.
 */
function isDevelopmentInstall(source: string | undefined): boolean {
  if (source === undefined) return false
  return source.startsWith('link:') || source.startsWith('file:') || source.startsWith('.')
}

/**
 * Word one coded refusal with the page's dictionary.
 *
 * @param failure - the coded refusal an `ok: false` answer carried.
 * @param t - the page's translate seat.
 * @returns the sentence, or undefined when the answer named no code.
 */
function refusalText(
  failure: UpdateApplyPayload['failure'],
  t: Translate,
): string | undefined {
  if (failure === undefined) return undefined
  return t(`error.${failure.code}`, failure.params)
}

/**
 * One link to a place this plugin lives, carrying its own mark.
 *
 * An anchor rather than a button: both destinations are pages in a browser, and a
 * new tab keeps the plugin page where the reader left it. The accessible name is
 * the destination's, because a 16px mark names nothing to a screen reader.
 *
 * @param props - the destination, its label, and the mark to draw.
 * @returns the link.
 */
function PluginLink(
  { href, label, children }: { readonly href: string; readonly label: string; readonly children: ReactNode },
): ReactElement {
  return (
    <a
      className="dsh-cg-update-link"
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      title={label}
      aria-label={label}
    >
      {children}
    </a>
  )
}

/** What the capsule may do, one callback per control it can offer. */
interface CapsuleActions {
  readonly confirm: () => void
  readonly cancel: () => void
  readonly install: () => void
  readonly retry: () => void
}

/**
 * The capsule, for the phase that has one.
 *
 * A phase with nothing to say draws nothing rather than an empty pill: the page's
 * default state is "no news", and only a published version, a step in flight, or
 * a failure is news.
 *
 * @param state - the row's current state.
 * @param t - the page's translate seat.
 * @param newer - whether the published version is newer than the installed one.
 * @param actions - the controls the capsule's buttons run.
 * @returns the capsule, or null when the row has nothing to announce.
 */
function capsule(
  state: RowState,
  t: Translate,
  newer: boolean,
  actions: CapsuleActions,
): ReactElement | null {
  if (state.phase === 'checking') return null

  if (state.phase === 'failed' && state.failedAt === 'check') {
    return (
      <div className="dsh-cg-update-quiet" title={state.reason}>
        {t('update.unavailable')}
        <button type="button" className="dsh-cg-update-action" onClick={actions.retry}>
          {t('update.retry')}
        </button>
      </div>
    )
  }

  if (state.phase === 'ready' && !newer) return null

  let text: string
  let controls: ReactNode = null
  let tone: 'accent' | 'muted' | 'error' = 'accent'

  switch (state.phase) {
    case 'ready':
      text = t('update.published', { version: state.latest ?? '' })
      controls = (
        <button type="button" className="dsh-cg-update-action" onClick={actions.confirm}>
          {t('update.upgrade')}
        </button>
      )
      break
    case 'confirm':
      text = t(isDevelopmentInstall(state.source) ? 'update.confirmLink' : 'update.confirm', {
        version: state.latest ?? '',
      })
      tone = 'muted'
      controls = (
        <>
          <button type="button" className="dsh-cg-update-action" onClick={actions.install}>
            {t('update.confirmYes')}
          </button>
          <button type="button" className="dsh-cg-update-action" onClick={actions.cancel}>
            {t('update.cancel')}
          </button>
        </>
      )
      break
    case 'applying':
      text = t('update.applying')
      tone = 'muted'
      break
    case 'done':
      text = state.application === 'restart-required'
        ? t('update.restart', { version: state.latest ?? '' })
        : t('update.done', { version: state.latest ?? '' })
      tone = 'muted'
      break
    default:
      // The install itself failed: say so, and leave the retry beside it.
      text = t('update.failed')
      tone = 'error'
      controls = (
        <button type="button" className="dsh-cg-update-action" onClick={actions.retry}>
          {t('update.retry')}
        </button>
      )
  }

  return (
    <div className="dsh-cg-update-pill" data-tone={tone} title={state.reason}>
      <span className="dsh-cg-update-pill-text">{text}</span>
      {controls}
    </div>
  )
}

/**
 * The row itself, mounted only for this bundle's page.
 *
 * The check runs once on mount: it is a consequence of opening the page rather
 * than a control. A failed read shows the quiet "could not read" capsule rather
 * than opening the Git tab's error dialog, which belongs to a page that is not
 * even mounted here — and its retry is what recovers once the network, or a Host
 * that has not picked up its new half yet, is back.
 *
 * @param props - the installed version, and the page's translate seat.
 * @returns the links row and, when there is one, the update capsule.
 */
function UpdateFooter({ t, current }: { readonly t: Translate; readonly current?: string }): ReactElement {
  const [state, setState] = useState<RowState>({ phase: 'checking' })

  /**
   * Ask the Host which version is published.
   *
   * Also what the row's own retry runs: the route is served by this bundle's Host
   * half, so a page opened before the Host picked that half up answers with a
   * transport failure — and a retry after the restart recovers without the reader
   * closing the page.
   */
  const check = useCallback(() => {
    setState({ phase: 'checking' })
    void checkUpdate().then(answer => {
      if (answer.ok !== true || answer.latest === undefined) {
        setState({ phase: 'failed', failedAt: 'check', ...(answer.error === undefined ? {} : { reason: answer.error }) })
        return
      }
      setState({
        phase: 'ready',
        latest: answer.latest,
        ...(answer.source === undefined ? {} : { source: answer.source }),
      })
    })
  }, [])

  useEffect(() => {
    check()
  }, [check])

  const newer = state.latest !== undefined && isNewer(state.latest, current)

  /**
   * Install the version the capsule is showing.
   *
   * The request names the version the Host itself named for this row, never one
   * the reader typed: there is no field here, and the Host refuses anything that
   * is not a plain version in any case.
   */
  const install = (): void => {
    const version = state.latest
    if (version === undefined) return
    setState(previous => ({ ...previous, phase: 'applying', reason: undefined }))
    void applyUpdate(version).then(answer => {
      if (answer.ok !== true) {
        setState(previous => ({
          ...previous,
          phase: 'failed',
          failedAt: 'install',
          reason: answer.error ?? refusalText(answer.failure, t),
        }))
        return
      }
      setState(previous => ({
        ...previous,
        phase: 'done',
        ...(answer.application === undefined ? {} : { application: answer.application }),
      }))
    })
  }

  return (
    <div className="dsh-cg-update-footer">
      <div className="dsh-cg-update-links">
        <PluginLink href={PACKAGE_REPOSITORY} label={t('update.github')}>
          <IconGithub />
        </PluginLink>
        <PluginLink href={PACKAGE_NPM_PAGE} label={t('update.npm')}>
          <IconNpm />
        </PluginLink>
      </div>
      {capsule(state, t, newer, {
        confirm: () => setState({ ...state, phase: 'confirm' }),
        cancel: () => setState({ ...state, phase: 'ready' }),
        install,
        retry: check,
      })}
    </div>
  )
}

/**
 * The section entry itself: this bundle's page gets the row, every other page
 * gets nothing.
 *
 * @param props - the page's subject and its translate seat.
 * @returns the row, or null when the page is not this bundle's.
 */
export function UpdateSection({ t, subject }: UpdateSectionProps): ReactElement | null {
  const own = ownVersion(subject)
  if (own === undefined) return null
  return <UpdateFooter t={t} current={own.version} />
}
