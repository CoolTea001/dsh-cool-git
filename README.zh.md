![dsh-cool-git 封面](https://cdn.cooltea.top/dsh-cool-git/readme-cover-v0.3.0.png)

# dsh-cool-git

[English](./README.md) · 中文

![license: MIT](https://img.shields.io/badge/license-MIT-green) ![node: >=22.19](https://img.shields.io/badge/node-%3E%3D22.19-blue)

## 描述

DeepSeek Harness Git 插件 —— 会话 Tab 栏添加 Git 管理功能，支持 commit | pull | push | branch | diff 等基础功能。

## 功能介绍

- **工作区绑定：** 查看并管理当前工作区的代码变更
- **分支管理：** 支持分支切换/分支创建/分支删除
- **变更同步：** 支持一键 Pull & Push 同步代码变更
- **Diff 查看：** 支持查看文件变更 Diff
- **提交历史：** 支持查看提交历史并查看文件变更 Diff
- **自动生成提交信息：** 使用 DSH 当前默认模型，自动生成提交信息并填入 Commit Message 框中；

## 安装教程

使用 DSH 的新增插件功能，输入包名：dsh-cool-git 即可。

## 参与贡献

欢迎提交 Issue 和 PR。

```
// 克隆项目
git clone https://github.com/CoolTea001/dsh-cool-git.git

// 安装依赖
cd dsh-cool-git
pnpm install

// 启动本地开发
pnpm run dev

// 本地安装：使用 DSH 的新增插件功能，输入本地项目路径即可

// 重启 DSH 服务
dsh web
```

## 开源协议

MIT © CoolTea
