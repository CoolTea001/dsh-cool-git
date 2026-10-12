# dsh-cool-git

English · [中文](./README.zh.md)

![license: MIT](https://img.shields.io/badge/license-MIT-green) ![node: >=22.19](https://img.shields.io/badge/node-%3E%3D22.19-blue)

## Description

DeepSeek Harness Git plugin — a Git tab in the session view for diffs and Git operations.

## Features

- **Git tab in the session tab bar** — one more page next to 对话 / 轨迹 / 终端, switched the same way.
- **Full-surface page** — while the Git tab is open, the composer and the transcript width handles step aside, so the page gets the whole conversation body.
- **Theme-aware** — rendered with DSH theme variables, compatible with most theme plugins.

## Installation

Use DSH's add-plugin feature and enter the package name: `dsh-cool-git`.

## Current limitations

- The Git page is a placeholder for now: no diff view and no Git operations yet. Only the tab itself works.

## Contributing

Contributions via Issues and PRs are welcome.

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
