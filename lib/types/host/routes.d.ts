/**
 * The Host half's HTTP surface.
 *
 * The browser half has no Cordis context and no remote namespace of its own, so
 * every question it asks the Host crosses a same-origin route registered on the
 * `webServer` carrier. Each route answers JSON and never rejects: a transport or
 * sandbox failure becomes an `{ ok: false }` result the page reports in its error
 * dialog.
 *
 * The Host stays authoritative about *where* Git runs. A request may name the
 * session it belongs to, but never a directory: the directory is read from that
 * session's own header, so a page cannot point the plugin at a repository the
 * session does not own.
 *
 * It is equally authoritative about *how much* Git may write. Each request's
 * file policy is resolved from the same session and carried on every command, so
 * a write route runs under exactly the mode and workspace root that session
 * already has — never under a deployment fallback that would refuse it.
 */
/** Route table, kept in one place so the two halves cannot drift. */
export declare const ROUTES: {
    readonly status: "/dsh-cool-git/api/status";
    readonly log: "/dsh-cool-git/api/log";
    readonly diff: "/dsh-cool-git/api/diff";
    readonly commit: "/dsh-cool-git/api/commit";
    readonly branches: "/dsh-cool-git/api/branches";
    readonly checkout: "/dsh-cool-git/api/checkout";
    readonly pull: "/dsh-cool-git/api/pull";
    readonly push: "/dsh-cool-git/api/push";
};
/**
 * Serve every Git route for one plugin instance.
 *
 * @param ctx - the Host plugin context.
 * @returns a disposer that unregisters exactly these routes.
 */
export declare function registerRoutes(ctx: any): () => void;
//# sourceMappingURL=routes.d.ts.map