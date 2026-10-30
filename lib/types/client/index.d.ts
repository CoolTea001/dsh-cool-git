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
 *
 * The tab's copy enters through the locale service, which owns the active
 * language and re-renders this entry when it changes: the dictionaries are
 * registered here, the slot entry declares the namespace it reads, and the
 * framework hands the rendered View the `t` seat bound to it. Nothing here
 * reads a sentence the View will not draw afterwards, so the whole page follows
 * a language switch without a reload.
 */
export declare const name = "dsh-cool-git/client";
/**
 * The locale service is a required collaborator rather than an optional one.
 *
 * The tab is worded entirely from its dictionaries, so a composition without
 * the service could only draw the wrong language: declaring the dependency is
 * what makes the framework apply this plugin once the service is there, and
 * what makes `ctx.get('locale')` below answer. DSH mounts the service with the
 * web client tree itself (`@deepseek-ai/dsh-web-app`), so nothing a Git tab can
 * run in is without it.
 */
export declare const inject: string[];
export declare function apply(ctx: any): void;
//# sourceMappingURL=index.d.ts.map