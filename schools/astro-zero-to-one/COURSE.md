# astro-zero-to-one：从零到一的 Astro 框架栈学习路线

本路线专为“完全没有接触过现代前端框架的零基础小白”量身定制，学习材料源自官方中文文档站 `https://docs.astro.build/zh-cn/getting-started/` 抓取的权威文档。课程目标是从零到一系统掌握 Astro 框架栈：从为什么需要框架与零 JS 心智模型开始，循序渐进掌握项目结构、.astro 组件与模板语法、文件路由与链接、页面布局与插槽系统、样式与静态资源优化、内容集合（Content Collections）、群岛架构与客户端水合指令，以及动态路由与生产交付闭环。

初始教学模式为 `simple`。课程深度是系统掌握该框架栈的核心机制；切换教学模式（如 `immersive`）仅改变提问和互动节奏，不删减知识点。

---

## 目标、基础与教学设计考量

- **学习者基础**：完全没有接触过 React、Vue、Next.js 等现代前端框架，仅具备基础 HTML/CSS/JavaScript 认知。因此，课程中不假设任何前端工程化黑话（如虚拟 DOM、Hooks、水合、BEM、单页应用状态管理等）；所有涉及的概念均在首次出现时以白话、类比和原生物理直觉进行解释。
- **课程深度取舍**：
  - 为什么不能偷懒只做 2~3 关？因为小白需要建立完整的“框架栈”心智：只学语法写不出真实站点，必须覆盖组件复用（Layout/Slots）、数据模型（Content Collections）、局部动态交互（Islands）、批量页面生成（Dynamic Routes）与构建发布全流程。
  - 为什么不能暴力塞进全部 398 篇抓取材料？抓取产物中包含 70+ 个边缘错误码（`reference/errors/*`）、微观解析器（`satteri`）、底层容器规范以及各类第三方 CMS（Sanity/Storyblok/WordPress）适配。将这些生硬搬给零基础小白会直接制造“认知过载”陷阱。我们精准提炼了文档中关于 Astro 核心能力、架构思想与标准用法的骨干页面，保持原汁原味的同时实现认知友好。
- **教学偏好落实**：具体官方示例驱动，直觉与机制推导结合，预测观察与动手实验，避免遗漏关键概念。不强求学员在本机安装外部沙箱，所有活动均基于代码预测、参数分类与机制推理。

---

## 十关核心路线图

| 关卡 / slug | 存在理由与教学重点 | 依赖关系与可观察产出 |
| :--- | :--- | :--- |
| **1 / server-first-mindset** | 破除对框架的陌生感，建立“内容驱动、服务端优先、默认零 JS”的核心心智模型 | 无课程内前置；能对比纯 HTML、SPA 与 Astro，对 3 种应用场景做出技术选型 |
| **2 / project-structure-and-setup** | 落地实际工程环境，弄清 Node 版本要求与四大 npm 脚本，搞懂 `src/pages` 保留目录与 `public/` 原样复制目录的根本区别 | 依赖关卡 1；能正确将 4 类静态/代码文件归入正确目录并指出理由 |
| **3 / astro-components-and-syntax** | 掌握最基础的构建块：.astro 单文件双代码块结构（Frontmatter 围栏与 HTML 模板），掌握变量插值、`class` 与 `.map()` 列表渲染 | 依赖关卡 2；能准确推导含有 frontmatter 计算和列表映射的组件最终生成的纯 HTML 结构 |
| **4 / pages-and-routing** | 掌握基于文件系统的路由映射规则，理解 Markdown 直接作为页面，以及站内根绝对路径链接规范与 404.astro | 依赖关卡 2、3；能推导多级目录的 URL 映射，并指出相对路径导致死链的隐患 |
| **5 / layouts-and-slots** | 消除 HTML 页面通用外壳的重复代码，通过 Layout 组件、Astro.props 与 `<slot />` 体系优雅复用全局骨架 | 依赖关卡 3、4；能推导包含具名插槽的页面在装配后的完整 DOM 结构 |
| **6 / scoped-styles-and-assets** | 解决样式冲突与图片体积痛点，掌握 Astro 默认作用域 CSS（`data-astro-cid-*`）、`define:vars` 与 `<Image />` 组件自动优化 | 依赖关卡 3、5；能分析样式规则的隔离边界，为图片选择最佳存放目录与标签 |
| **7 / content-collections** | 攻克现代内容驱动站点的核心支柱：通过 `src/content.config.ts`、Zod schema 校验、`getCollection()` 与 `render()` 实现类型安全的数据管理 | 依赖关卡 3、5；能识别 Markdown frontmatter 中的格式错误，推导出 `getCollection` 的查询逻辑 |
| **8 / islands-and-client-directives** | 解答“如何实现局部交互”的核心困惑，理解群岛架构（Islands）哲学与 UI 框架接入，掌握 `client:load` / `client:idle` / `client:visible` 水合机制 | 依赖关卡 1、3；能根据性能与可见度要求为 4 种典型动态组件匹配最适合的水合指令 |
| **9 / dynamic-routes-and-static-paths** | 实现“单模板批量生成海量网页”的工程飞跃，掌握 `[id].astro` 命名与 `getStaticPaths()`，打通内容集合到动态路由全链路 | 依赖关卡 4、7；能根据 3 篇集合文章的 id 推导生成静态 HTML 文件的完整路径清单 |
| **10 / dev-build-and-deploy** | 贯通软件生命周期：深刻理解 `dev` 实时监听、`build` 打包到 `dist/` 与 `preview` 静态预览的边界，掌握统一的生产发布契约 | 依赖前 9 关；能排查“preview 预览未生效”的典型问题，理清完整的开发到部署三步法 |

---

## 来源账本（Source Ledger）

本课程所基于的材料于 2026-10-13 由 siteone-crawler 2.5.1 工具抓取自入口 `https://docs.astro.build/zh-cn/getting-started/`，设定范围限制在 `/zh-cn` 官方中文文档前缀，共抓取 398 个文档页面。
- `entry.html`：入口页原始响应保留文件。
- `provenance.json`：完整的抓取依据与源 URL 映射记录。
- `pages/`：爬虫导出的派生阅读 Markdown 文本（非原始 HTML）。
- 本课程实际引用并复制至 `public/sources/material-1/` 的核心派生文档清单如下：

| 教学主张 / 核心机制 | 官方文档原始位置 | 对应本地副本文件路径 |
| :--- | :--- | :--- |
| 内容驱动定义、服务器优先设计原则、默认零 JS、MPA 心智模型 | `concepts/why-astro/` | `pages/zh-cn/concepts/why-astro/index.md` |
| Node.js v22.12.0+ 环境要求、CLI 向导与手动安装命令、核心脚本 | `install-and-setup/` | `pages/zh-cn/install-and-setup/index.md` |
| `src/pages/` 唯一约定目录、`src/` 自由子目录、`public/` 原样复制规范 | `basics/project-structure/` | `pages/zh-cn/basics/project-structure/index.md` |
| .astro 单文件结构、代码围栏（`---`）服务端执行、Astro.props 参数通信 | `basics/astro-components/` | `pages/zh-cn/basics/astro-components/index.md` |
| 类 JSX 模板表达式、`class` 属性原生支持、`class:list` 指令 | `reference/astro-syntax/` | `pages/zh-cn/reference/astro-syntax/index.md` |
| 基于文件系统的静态路由映射、Markdown 直接成页、站内绝对路径规范 | `basics/astro-pages/`, `guides/routing/` | `pages/zh-cn/basics/astro-pages/index.md`, `pages/zh-cn/guides/routing/index.md` |
| 布局（Layout）组件封装、`<slot />` 默认插槽与具名插槽体系 | `basics/layouts/` | `pages/zh-cn/basics/layouts/index.md` |
| 作用域 CSS 原理（`data-astro-cid-*`）、全局样式指令、`define:vars` | `guides/styling/` | `pages/zh-cn/guides/styling/index.md` |
| 静态资源双轨制、`<Image />` 组件防 CLS 布局偏移与格式转换 | `guides/images/` | `pages/zh-cn/guides/images/index.md` |
| 内容集合（Content Collections）、`src/content.config.ts`、Zod 模式校验、`getCollection()` 与 `render()` | `guides/content-collections/` | `pages/zh-cn/guides/content-collections/index.md` |
| 群岛架构（Islands Architecture）定义、UI 组件默认 0 JS、`client:*` 客户端水合指令 | `concepts/islands/`, `guides/framework-components/`, `reference/directives-reference/` | `pages/zh-cn/concepts/islands/index.md`, `pages/zh-cn/guides/framework-components/index.md`, `pages/zh-cn/reference/directives-reference/index.md` |
| `astro dev` 开发监听、`astro build` 打包输出到 `dist/`、`astro preview` 静态预览机制与通用静态部署 | `develop-and-build/`, `guides/deploy/` | `pages/zh-cn/develop-and-build/index.md`, `pages/zh-cn/guides/deploy/index.md` |

所有上述派生文档均已保存在 `public/sources/material-1/` 下，教师 Agent 可通过 `{origin}/sources/material-1/...` 直接以 HTTP 方式随时读取原始上下文。

---

## 排除说明与边界声明

1. **排除的内容**：
   - 排除了约 70 种内部底层错误代码详细参考（`reference/errors/*`），这些错误属于日常排错参考字典，不属于零基础框架入门主干。
   - 排除了特定 CMS（如 Contentful, Strapi, Sanity）与媒体云（Cloudinary, Imagekit）的定制插件文档，保持框架核心的纯粹性。
   - 排除了服务端渲染（SSR）适配器的高级边缘计算特性（如 Vercel Edge Middleware, Node Standalone Cluster），优先固化静态多页（SSG）与群岛架构的基础心智。
2. **代码格式修复**：
   - 官方抓取生成的派生 Markdown 文本中存在少量将相邻代码行压缩合并的问题（如 `---import SomeComponent...`）。本课程的所有代码块均已恢复标准多行缩进与整洁语法格式。
3. **视觉元素确认**：
   - 在抓取的原始页面与派生文本中，部分架构图与展示图被标记为文本描述或占位图。本课程使用纯 ASCII / 结构化文本图表对群岛架构、生命周期流水线与目录树进行直观建模，保证在无视觉界面的纯文本终端与 Agent 对话环境中完全可读、可理解。
4. **验证范围声明**：
   - 本校区已通过 `validateGeneration` 静态结构与数学公式合法性校验，并通过 `npm run build` 完成静态站点生成与路由构建验证。
   - 网站服务在本地端口运行，首页及 `/api/lessons` 接口均已通过 HTTP GET 实测验证。
   - 真实教学对话、学生身份颁发与学习进度同步需由实际接入的教师 Harness 在交互中完成。
