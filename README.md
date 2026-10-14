# dsh-cool-git

English · [中文](./README.zh.md)

![license: MIT](https://img.shields.io/badge/license-MIT-green) ![node: >=22.19](https://img.shields.io/badge/node-%3E%3D22.19-blue)

## Description

DeepSeek Harness Git plugin — a Git tab in the session view for diffs and Git operations.

## Features

- **Git tab in the session tab bar** — one more page next to 对话 / 轨迹 / 终端, switched the same way.
- **One toolbar, in the order the work happens** — the sidebar's first row carries the Workspace, the branch it is on, and one re-read control; both names live in their hover tooltips, and the branch's tooltip is the full branch name and nothing else. That name is the first thing the row gives up when the sidebar is narrow: it shortens to an ellipsis, and then to the icon alone, and the Workspace's name only begins to shorten once the branch is down to that icon. 变更文件区 and 提交历史 stack below the row, and the Diff 查看区 takes the rest of the conversation body. The remote control is not up here: it sits at the right-hand end of 提交历史's header, opposite the pane's own name and count and beside the commits it moves.
- **Branch switching** — the branch in the first row opens a switch dialog: 当前分支 first, then the other local branches, then the remote-tracking ones, each group labelled and newest commit first inside it, with a search box over all three and the branch already checked out heading the first group and selected from the moment the dialog opens — a click moves that selection, which is filled the way a hovered row is so it stays readable while the pointer is away on the buttons, the search box narrows the three groups as it is typed, Escape closes, and the footer's button is what switches: a click on a row never does. Picking a remote branch switches to the local branch that tracks it, creating it when it does not exist yet. The dialog asks for the switch and nothing else, so Git is the judge: a refusal — a path with uncommitted changes in the way, for instance — arrives in the same error dialog as every other failure, with the paths Git names. A checkout rewrites the working tree, so the page re-reads the repository and drops the diff it was showing.
- **Both dividers drag, and both sizes are remembered** — the sidebar's right edge sets its width, and the divider between 变更文件区 and 提交历史 sets the split between them; each boundary brightens under the pointer, and while it is dragged the whole page takes that axis's cursor. The sidebar stops at 260px, where its own toolbar still fits; the Diff 查看区 keeps at least 320px whatever the sidebar asks for; and each pane keeps a header and a couple of rows (96px) however short the window gets. The width is remembered in pixels and the split as a share of the column, both under this plugin's own `localStorage` key, so the tab opens where it was left — a width saved in a wide window is capped for a narrow one rather than squeezing the Diff pane, and a split saved in a tall one is applied to whatever height the column has now.
- **同步变更** — appears at the right-hand end of 提交历史's header once the branch has an upstream, and it is the whole round trip: fast-forward from the upstream, then push what is left. Both arrows and their counts sit inside that one button (`↓` behind, `↑` ahead, always shown and zeros included), since the control that states the divergence is the one that resolves it, and the hover tooltip spells the same two numbers out as `同步变更 · 待拉取 N · 待推送 M`. Fast-forwarding first is what keeps the push from being refused for being behind, and a history that has diverged is refused rather than merged, so the button can never invent a merge commit or leave a conflicted tree behind; a refused pull stops the round trip there.
- **发布分支** — offered in the same place, as a single glyph, instead of 同步变更 while the branch has no upstream, because such a branch has no divergence to report and nothing to pull: it pushes the branch to the single configured remote, and that push records the remote as the upstream. No remote, or several, is reported rather than guessed.
- **Errors in one dialog** — every failure opens the same dialog: a refused branch switch, a commit Git turned down, a pull or push the remote turned down, and a read the Host could not answer. A directory that is not a repository is not a failure, so the panes say so in place instead. A successful operation says nothing — the re-read page is the report.
- **Changed paths** — every path `git status` reports (staged, unstaged, untracked, renamed, deleted, conflicted), with the index/worktree state of each.
- **提交** — the sidebar's own row, under the toolbar and above 变更文件区: a full-width `Commit Message` field, and a full-width `Commit` button on the row below it. The field is this plugin's own and multi-line — Enter writes a line break, and it grows with what is typed up to four lines and scrolls past that, so a subject and the note under it both fit without pushing 变更文件区 down the column — and its corner is the button's own, since the two rows are one form. ⌘/Ctrl+Enter submits from the field; the button is the plain path. Nothing is drawn between the toolbar and the field, so the two rows read as one block with the toolbar, and a single hairline closes that block above 文件变更. One click stages everything 变更文件区 is listing — tracked edits, deletions, and untracked files alike — and records it as one commit under the message, in a single request, so the page never leaves a half-staged index behind. The button is disabled until there is a message and something to commit, and while another operation is running. A commit empties the field, drops the diff it just recorded, and re-reads the tab; an unresolved conflict is refused rather than staged, and a refusal keeps the message where it is.
- **Diffs** — click a path for its patch against `HEAD` (untracked files are diffed against `/dev/null`); click a commit for its whole patch, one section per file, with line numbers on both sides and per-file `+N −M` counts.
- **History** — the newest commits with author, age, and branch/tag decorations; merge commits are diffed against their first parent.
- **Copy** — the button in the diff header copies exactly the patch on screen.
- **Theme-aware** — rendered with DSH theme variables, compatible with most theme plugins, light and dark alike.

## Installation

Use DSH's add-plugin feature and enter the package name: `dsh-cool-git`.

Reload or restart DSH after installing or updating: the browser half reloads with a page refresh, but the Host half's routes are registered when the plugin is mounted.

## Current limitations

- No per-path staging, and no creating or deleting branches: the tab commits every change it lists, in one commit, or nothing. The things it changes are the checked-out branch, a sync round trip — a fast-forward pull followed by a push — publishing a branch that has no upstream, and the one commit the sidebar's form asks for. The repository's own hooks run — `git commit` is called without `--no-verify` — so a hook that refuses is reported as the refusal it is.
- The pull half of a sync is fast-forward only: when the two sides have diverged, the page says so, stops before the push, and leaves the merge or rebase to you.
- The page never prompts for credentials (`GIT_TERMINAL_PROMPT=0`), so a remote that needs a password the machine does not already hold is reported as an authentication failure.
- The divergence counts come from `git status`, so they are as fresh as the last fetch — another machine's push is not visible until something syncs.
- Every operation that writes needs the session's own permission to write: under a `read-only` mode the branch stays where it is and the page says why.
- History is capped at the newest 60 commits, and a patch larger than 4 MiB is flagged as truncated.

## Contributing

Contributions via Issues and PRs are welcome.

Client-side icons live in `src/client/assets/*.svg` (24-unit Tabler artwork). The browser half is loaded as one JS file, so the SVG files are never fetched at runtime: `tsdown.config.ts` inlines them at build time as a name-keyed map that `src/client/icons.tsx` turns into components. Adding an icon means dropping the file in and exporting its component — no config change.

```
// Clone project
git clone https://github.com/CoolTea001/dsh-cool-git.git

// Install dependencies
cd dsh-cool-git
pnpm install

// Start local development
pnpm run dev

// Local install: use DSH's add-plugin feature and enter the local project path

// Restart DSH service
dsh web
```

## License

MIT © CoolTea
