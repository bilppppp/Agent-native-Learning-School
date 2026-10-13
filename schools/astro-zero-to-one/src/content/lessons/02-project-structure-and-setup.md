---
title: "起步与骨架：创建项目与理解文件结构规范"
slug: "project-structure-and-setup"
description: "掌握 Node.js 环境前提，通过官方 CLI 向导或手动方式初始化 Astro 项目，理解 package.json 核心脚本与 src/、public/ 的约定划分。"
order: 2
quiz: false
agentOnly: true
agentInstructions: |
  教学目标：
  1. 确保学员明确运行 Astro 所必需的 Node.js 运行时版本要求（Node.js v22.12.0+ 或其他被支持的现代活跃 LTS 版本，奇数非稳定版本如 v23 官方不推荐）。
  2. 掌握官方 CLI 命令 `npm create astro@latest` 与最小项目的四个基础 npm 脚本（dev, build, preview, astro）。
  3. 彻底厘清 Astro 项目的目录角色：为什么 `src/pages/` 是唯一的保留/特殊约定目录？为什么 `src/` 下的其他目录可以自由组织？为什么 `public/` 的文件不被打包、直接原样复制？
  4. 教学活动：路径归位判断。给出 4 个文件（站点 favicon.ico 图标、导航栏 Header.astro、关于我们页面 about.astro、文章插图），让学员指出它们分别应放入哪个目录，并给出判定理由。
  5. 完成条件：学员能够准确区分保留目录与静态资源目录，阐述 `dev` 与 `build` 的用途，并获得教师针对分类回答的反馈。
---

# 起步与骨架：创建项目与理解文件结构规范

在上一关中，我们理解了 Astro “服务器优先、默认零 JS” 的核心理念。现在，让我们脚踏实地，看看如何在本地搭建一个 Astro 项目，并彻底摸清它的目录结构。

---

## 1. 环境准备：Node.js 前提条件

Astro 是一个运行在 Node.js 环境中的现代构建工具。官方文档对开发环境有明确的要求：
- **Node.js**：必需版本为 **v22.12.0+**（或受支持的活跃 LTS 版本）。Astro 官方明确建议避免使用奇数非长期维护版本（如 v23），推荐使用稳定偶数 LTS。
- **包管理器**：可以使用 `npm`、`pnpm` 或 `yarn`。对于初学者，Node.js 自带的 `npm` 即可完全胜任。

---

## 2. 创建你的第一个 Astro 项目

创建 Astro 项目有极简的官方 CLI 命令：

```sh
npm create astro@latest
```

运行这个命令后，官方向导会友好地询问你几个选项：
1. **项目目录名称**（如 `my-astro-site`）。
2. **选择初始模板**（初学者建议选择 `Empty` 空模板以保持骨架干净，或选择带有示例博客的模板）。
3. **是否使用 TypeScript**（推荐选择，Astro 开箱即用支持完整的类型推导）。
4. **是否立即安装依赖**（选择 Yes）。

向导执行完毕后，进入项目目录并启动本地开发服务器：

```sh
cd my-astro-site
npm run dev
```

终端会输出类似下面的就绪信息：

```text
 astro  v5.x.x ready in 120 ms

┃ Local    http://localhost:4321/
┃ Network  use --host to expose
```

打开浏览器访问该地址，你的新网站就已经在本地跑起来了！

---

## 3. 认识 package.json 中的四大核心脚本

打开项目根目录下的 `package.json`，在 `"scripts"` 字段中，你会看到四个标准命令：

```json
{
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "astro": "astro"
  }
}
```

- **`npm run dev`**：启动本地开发服务器。它会监听你的代码变动，修改文件后浏览器会瞬间热重载。
- **`npm run build`**：执行生产打包。Astro 会读取你所有的页面和数据，编译生成完全静态的 HTML、CSS 和优化后的资源，输出到默认的 `dist/` 文件夹。
- **`npm run preview`**：在本地模拟一个生产 Web 服务器，直接运行 `dist/` 中的打包产物，供你在上线前验证最终效果。
- **`npm run astro`**：运行 Astro 自身的 CLI 工具（例如添加官方集成插件：`npx astro add react`）。

---

## 4. 深入剖析项目目录结构

一个标准的 Astro 项目目录非常清晰、优雅：

```text
my-astro-site/
├── public/                 # 原样静态资源（不被打包处理）
│   ├── favicon.ico
│   └── robots.txt
├── src/                    # 项目源码目录
│   ├── components/         # 可复用组件（自由组织）
│   │   └── Header.astro
│   ├── layouts/            # 页面整体外壳布局（自由组织）
│   │   └── BaseLayout.astro
│   └── pages/              # ★ 唯一的约定保留目录（路由入口）
│       ├── index.astro
│       └── about.astro
├── astro.config.mjs        # Astro 配置文件
├── package.json            # 依赖与脚本定义
└── tsconfig.json           # TypeScript 配置文件
```

### (1) `src/pages/` —— 唯一的保留目录
在整个项目中，**只有 `src/pages/` 具有特殊的框架约定意义**。
- Astro 使用“基于文件系统的路由”（File-based Routing）。放在 `src/pages/` 里面的每一个文件都会直接对应网站上的一个 URL 路径！
- 例如：`src/pages/index.astro` 对应网站首页 `/`，`src/pages/about.astro` 对应 `/about/`。
- 你不能把这个文件夹重命名为其他名字，也不能用它存放非页面的零散组件。

### (2) `src/` 下的其他目录 —— 自由设计
除 `pages/` 外，`src/` 内的所有其他子目录命名都是**完全自由**的：
- 你可以按照社区惯例创建 `src/components/` 存放按钮、卡片、导航栏；
- 创建 `src/layouts/` 存放页面全局外壳；
- 创建 `src/styles/` 存放通用 CSS 文件。
- Astro 会智能地处理这些文件中的代码引用、样式打包与依赖优化。

### (3) `public/` —— 原样静态资源
`public/` 目录专门存放**不需要 Astro 做任何编译、打包、哈希处理的文件**：
- 比如网站的 `favicon.ico` 图标、搜索引擎爬虫规则 `robots.txt`、固定的站点地图 `sitemap.xml`。
- 存放在 `public/` 里的文件在构建时会被**直接原样复制**到最终网站的根路径！
- 例如：`public/favicon.ico` 在浏览器中直接通过访问 `https://mysite.com/favicon.ico` 获得。在代码中引用它们时，使用根路径 `/favicon.ico` 即可。

---

## 5. 学习指引与下一步

现在你已经掌握了项目的起步方式与清晰的目录骨架。在下一关中，我们将真正开始编写代码，深入探索核心构建块——`.astro` 单文件组件的独特语法与运行机制！
