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
export declare const name = "dsh-cool-git/client";
export declare const inject: string[];
export declare function apply(ctx: any): void;
//# sourceMappingURL=index.d.ts.map