/**
 * Composer-seat suppression for the Git tab.
 *
 * The Conversation shell mounts its composer seat — the input card plus the
 * `conversation.input.dock` rows above it — for every View. It also publishes
 * the hook a View uses to take the whole body for itself: the View root
 * declares `data-conversation-composer-overlay`, and the shell then drops the
 * transcript width handles and floats the seat over the page
 * (`.scrollBody:has([data-conversation-composer-overlay])`, see
 * `ConversationRoot.module.css`). That hook repositions the seat; it never
 * removes it, so a page with no input of its own — this one — has to take the
 * seat out itself.
 *
 * The removal is a DOM write on the seat element instead of only a stylesheet
 * rule. Both are presentation, but the write depends on nothing beyond the
 * rendered tree: not on this plugin's sheet being inserted, not on the shell
 * ranking our selector above its own, not on the attribute names this version
 * of the shell happens to use. The declarative twin in `styles.ts` states the
 * same fact for the frames the shell paints before this runs.
 */
/**
 * Hide the composer seat of the Conversation hosting `view`.
 *
 * The seat is a sibling of the View inside the same body, rendered
 * unconditionally by the same component that renders the View: when that body
 * is replaced the View remounts with it, so one write per mount reaches every
 * seat this page can coexist with.
 *
 * @param view - the mounted View root, or null before React attaches it.
 * @returns disposer restoring exactly the inline display it replaced.
 */
export declare function suppressComposerSeat(view: Element | null): () => void;
//# sourceMappingURL=chrome.d.ts.map