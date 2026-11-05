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
import { type ReactElement } from 'react';
import type { Translate } from './locales.js';
/** What this bundle's page hands the section: the page's subject and its `t`. */
export interface UpdateSectionProps {
    readonly t: Translate;
    /** The page's subject, which is `{ kind: 'bundle', pkg }` on a bundle page. */
    readonly subject: unknown;
}
/**
 * The section entry itself: this bundle's page gets the row, every other page
 * gets nothing.
 *
 * @param props - the page's subject and its translate seat.
 * @returns the row, or null when the page is not this bundle's.
 */
export declare function UpdateSection({ t, subject }: UpdateSectionProps): ReactElement | null;
//# sourceMappingURL=update.d.ts.map