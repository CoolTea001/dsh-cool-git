# dsh-cool-git

[English](./README.md) · 中文

![license: MIT](https://img.shields.io/badge/license-MIT-green) ![node: >=22.19](https://img.shields.io/badge/node-%3E%3D22.19-blue)

## 描述

DeepSeek Harness Git 插件 —— 在会话视图里提供 Git 页，用于查看 diff 与执行 Git 操作。

## 功能介绍

- **会话 Tab 栏新增 Git 页** —— 在 对话 / 轨迹 / 终端 之后多一页，切换方式完全一致。
- **整页展示** —— Git 页激活时输入对话框与正文宽度拖拽手柄会隐藏，把整个会话区域让给页面。
- **主题自动适配** —— 基于 DSH 主题变量渲染，兼容大多数主题插件。

## 安装教程

使用 DSH 的新增插件功能，输入包名：dsh-cool-git 即可。

## 目前存在的几个限制

- Git 页面目前是占位页：还没有 diff 查看与 Git 操作，能用的只有 Tab 切换本身。

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
