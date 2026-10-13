<!-- source: https://docs.astro.build/zh-cn/develop-and-build/ -->
<!-- retrieved: 2026-10-13; tool: siteone-crawler 2.5.1; prefix: /zh-cn -->

# 开发与构建

一旦你有了一个 Astro 项目，那么你现在就可以使用 Astro 进行构建了！🚀

## 编辑你的项目

要对项目进行更改，请在代码编辑器中打开项目文件夹。在开发模式下运行开发服务器，能让你在编辑代码时查看站点的更新。

你还可以 [自定义开发环境的各个方面](#%E9%85%8D%E7%BD%AE%E4%BD%A0%E7%9A%84%E5%BC%80%E5%8F%91%E7%8E%AF%E5%A2%83) ，例如配置 TypeScript 或者安装官方 Astro 编辑器扩展。

[Section titled “启动 Astro 开发服务器”](#启动-astro-开发服务器)

Astro 自带了一个内置的开发服务器，它包含了项目开发所需的一切。`astro dev` CLI 命令将启动本地开发服务器，让你第一次看到你的新网站。

每个起始模板都预配置了一个脚本，该脚本将为你运行 `astro dev`。在进入你的项目目录后，使用你喜欢的包管理器运行此命令并启动 Astro 开发服务器。

- [npm](#tab-panel-0-0)
- [pnpm](#tab-panel-0-1)
- [Yarn](#tab-panel-0-2)

终端窗口

```
npm run dev
```
终端窗口

```
pnpm run dev
```
终端窗口

```
yarn run dev
```
如果一切顺利，Astro 将在 [http://localhost/](http://localhost/) 上为你的项目提供服务。在浏览器中访问该链接，查看你的新网站！

### 开发模式工作

Astro 将监听你的 `src/` 目录中的实时文件更改，并在你构建时更新你的网站预览，因此在开发过程中你无需重启服务器。当开发服务器运行时，你总能在浏览器中看到你网站的最新版本。

在浏览器中查看你的网站时，你将能够访问 [Astro 开发工具栏](../../zh-cn/guides/dev-toolbar/index.md)。在你构建时，它将帮助你检查你的 [群岛](../../zh-cn/concepts/islands/index.md)，发现无障碍问题等。

如果在启动开发服务器后无法在浏览器中打开你的项目，请返回运行 `dev` 命令的终端并检查显示的消息。它应该会告诉你是否发生了错误，或者你的项目是否在不同的 URL [http://localhost/](http://localhost/) 上提供服务。

## 构建并预览你的网站

[Section titled “构建并预览你的网站”](#构建并预览你的网站)

若要检查将在构建时创建的网站版本，请退出开发服务器（Ctrl \+ C）并在你的终端中运行适用于你的包管理器的相应构建命令：

- [npm](#tab-panel-1-0)
- [pnpm](#tab-panel-1-1)
- [Yarn](#tab-panel-1-2)

终端窗口

```
npm run build
```
终端窗口

```
pnpm build
```
终端窗口

```
yarn run build
```
Astro 将在一个单独的文件夹（默认为 `dist/`）中构建你的网站的可部署版本，并且你可以在终端中看到其进度。这将在你部署到生产环境之前提醒你项目中的任何构建错误。如果 TypeScript 配置为 `strict` 或 `strictest`，`build` 脚本还将检查你的项目中的类型错误。

当构建完成后，在你的终端中运行适当的 `preview` 命令（例如 `npm run preview`），你就可以在同一个浏览器预览窗口中本地查看你的网站的构建版本。

请注意，这将预览你在最后一次运行构建命令时的代码状态。这旨在让你预览你的网站在部署到网络时的样子。在构建后对代码进行的任何更改都**不会**在你预览网站时反映出来，直到你再次运行构建命令。

使用（Ctrl \+ C）退出预览并在终端中运行另一个命令，例如重新启动开发服务器以返回 [开发模式工作](#%E5%BC%80%E5%8F%91%E6%A8%A1%E5%BC%8F%E5%B7%A5%E4%BD%9C)，它会随着你的编辑更新以显示你的代码更改的实时预览。

阅读更多关于 [Astro CLI](../../zh-cn/reference/cli-reference/index.md) 和你在使用 Astro 构建时将使用的终端命令。

在你开始添加或更改太多代码之前，你可能希望 [立即部署你的新网站](../../zh-cn/guides/deploy/index.md)。这有助于发布你的网站的最小工作版本，并可以节省你以后排查部署问题的时间和精力。

## 接下来

以下是我们建议接下来探索的几个主题，你可以按任何顺序阅读它们。你甚至可以暂时离开我们的文档去玩转你的新 Astro 项目代码库，当你遇到麻烦或有疑问时，欢迎你随时返回这里。

### 配置你的开发环境

探索以下指南来定制你的开发体验。

[编辑器设置](../../zh-cn/editor-setup/index.md)自定义你的代码编辑器以改善 Astro 开发者体验并解锁新功能。

[开发工具栏](../../zh-cn/guides/dev-toolbar/index.md)探索开发工具栏中好用的功能。

[TypeScript 配置](../../zh-cn/guides/typescript/index.md)配置类型检查、代码补全等选项。

[了解你的代码库](../../zh-cn/basics/project-structure/index.md)在我们的项目结构指南中了解 Astro 的文件结构。

[创建内容集合](../../zh-cn/guides/content-collections/index.md)通过 frontmatter 验证和自动类型安全向你的新网站添加内容。

[添加视图过渡](../../zh-cn/guides/view-transitions/index.md)创建无缝页面过渡和动画。

[了解群岛](../../zh-cn/concepts/islands/index.md)阅读关于 Astro 的群岛结构。

### 学习入门教程

在我们的[入门教程](../../zh-cn/tutorial/0-introduction/index.md)中，从一个空白页面开始构建一个完全功能的 Astro 博客。

这是一个了解 Astro 工作原理的好方法，它会引导你了解页面、布局、组件、路由、群岛等基础知识。对于那些对 Web 开发概念比较陌生的人，它还包括一个可选的、适合初学者的单元，将指导你在你的计算机上安装必要的应用程序、创建一个 GitHub 账户，并部署你的网站。

Learn

| [贡献](../../zh-cn/contribute/index.md) | [社区](https://astro.build/chat) | [赞助](https://opencollective.com/astrodotbuild) |

---

[跳转到内容](#_top)

[Astro](https://astro.build/)
[Docs](../../zh-cn/getting-started/index.md)

| [GitHub](https://github.com/withastro/astro) | [Discord](https://astro.build/chat) |

![Scrimba](data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==)

![](data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==)

## Learn Astro with James Q Quick

Build your first site with 35 interactive Scrimba lessons

[Get 20% off](https://scrimba.com/intro-to-astro-c00ar0fi5u?via=astro)
