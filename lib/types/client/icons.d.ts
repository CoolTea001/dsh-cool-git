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
import { type ReactElement } from 'react';
/** The Workspace glyph: the project directory the session's repository lives in (assets/folder.svg). */
export declare const IconFolder: () => ReactElement;
/** The branch glyph beside the branch name (assets/branch.svg). */
export declare const IconBranch: () => ReactElement;
/**
 * The Pull glyph: an arrow pointing at this working tree (assets/pull.svg).
 *
 * Pull and push are one picture with the arrow reversed, which is what makes the
 * pair readable at 13px beside their counts.
 */
export declare const IconPull: () => ReactElement;
/** The Push glyph: the same arrow leaving this working tree (assets/push.svg). */
export declare const IconPush: () => ReactElement;
/**
 * Publish this branch: send it to the remote and record the remote as its
 * upstream (assets/publish.svg).
 *
 * A cloud with an arrow into it rather than the push arrow, because this is not
 * the same act: Push sends what a branch and its upstream have between them,
 * Publish decides that the two are related at all.
 */
export declare const IconPublish: () => ReactElement;
/** Re-read the repository (assets/refresh.svg). */
export declare const IconRefresh: () => ReactElement;
/**
 * Copy the patch on screen: the Diff pane header's copy control
 * (assets/copy.svg).
 */
export declare const IconCopy: () => ReactElement;
/**
 * The mark the copy control swaps to while it reports success (assets/check.svg).
 *
 * A state rather than a subject, and the one asset here that is: it is drawn from
 * the same 24-unit set as the mark it replaces, which is what keeps the swap from
 * changing the button's stroke weight.
 */
export declare const IconCheck: () => ReactElement;
/**
 * The disclosure mark on a file's title in a multi-file patch
 * (assets/arrow-right.svg).
 *
 * Drawn pointing right — at the code when the file is closed — and turned a
 * quarter by the stylesheet once the file is open, so one asset covers both
 * states and the glyph reads as the same control either way.
 */
export declare const IconArrowRight: () => ReactElement;
/**
 * The commit form's Generate control: the model writes the message that the
 * Commit button beside it would otherwise be handed (assets/generate.svg).
 *
 * A spark rather than a pen or a wand, because what it asks for is not an edit
 * of the text in the field but a reading of the changes behind it. It is the one
 * glyph on the page that stands for a model call, and it sits at the field's own
 * left edge so the pair reads as "write this, then commit it".
 */
export declare const IconGenerate: () => ReactElement;
//# sourceMappingURL=icons.d.ts.map