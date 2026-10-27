![dsh-cool-git cover](https://cdn.cooltea.top/dsh-cool-git/readme-cover-v0.3.0.png)

# dsh-cool-git

English · [中文](./README.zh.md)

![license: MIT](https://img.shields.io/badge/license-MIT-green) ![node: >=22.19](https://img.shields.io/badge/node-%3E%3D22.19-blue)

## Description

DeepSeek Harness Git plugin — adds Git management to the session tab bar, covering the basics: commit | pull | push | branch | diff.

## Features

- **Workspace binding:** view and manage the code changes in the current workspace
- **Branch management:** switch, create, and delete branches
- **Sync:** one-click Pull & Push to sync changes
- **Diff view:** view per-file change diffs
- **Commit history:** browse the commit history and view the file diffs
- **Auto-generated commit message:** use DSH's current default model to generate a commit message and fill it into the Commit Message field

## Installation

Use DSH's add-plugin feature and enter the package name: `dsh-cool-git`.

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
