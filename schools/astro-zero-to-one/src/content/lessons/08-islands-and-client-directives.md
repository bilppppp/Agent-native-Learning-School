---
title: "群岛架构：UI 框架接入与客户端水合指令"
slug: "islands-and-client-directives"
description: "揭秘 Astro 开创的群岛架构（Islands Architecture）。掌握在 Astro 中集成 React/Vue/Svelte 组件的方法，理解默认 0 JS 与 client:load / client:idle / client:visible 等客户端指令。"
order: 8
quiz: false
agentOnly: true
agentInstructions: |
  教学目标：
  1. 帮助学员掌握 Astro 标志性的架构创新——群岛架构（Islands Architecture）：静态 HTML 的海洋中点缀局部交互的 JavaScript 小岛。
  2. 澄清 UI 框架接入机制：Astro 支持直接使用 React、Vue、Svelte、Solid 等组件，但默认情况下会将它们在服务端静态渲染为纯 HTML，客户端 0 字节 JS！
  3. 掌握核心客户端水合指令（Client Directives）：`client:load`（立即水合）、`client:idle`（空闲水合）、`client:visible`（进入视口水合）、`client:media`（媒体查询匹配水合）。
  4. 教学活动：场景选型与性能权衡。给出 4 个常见页面功能（全屏首屏导航抽屉、页面最下方的评论组件、静态图文展示卡片、用户交互搜索浮层），让学员为每个组件挑选最合适的水合指令（或完全不需要水合），并阐述理由。
  5. 完成条件：学员能够根据交互紧急程度合理选择指令，理解选择性水合带来的巨大性能收益，并收到教师的反馈。
---

# 群岛架构：UI 框架接入与客户端水合指令

学到这里，你可能会提出一个非常敏锐的问题：
> “Astro 默认零 JavaScript，所有东西都是静态 HTML。但如果我的网站确实需要一些动态交互——比如一个可以点击加减的计数器、一个搜索浮层、或者一个图片轮播图，该怎么办？”

传统 SPA 框架的解决方式是：把整个网站都打包成庞大的 JavaScript 发送给浏览器。
而 Astro 给出了前端发展史上极具划时代意义的创新回答：**群岛架构（Islands Architecture）**与**选择性水合（Partial Hydration）**！

---

## 1. 什么是群岛架构？

将你的整个网页想象成一片**广袤、平缓、由纯静态 HTML 构成的海洋**。在绝大多数地方（文章正文、标题、页脚、静态侧边栏），根本不需要任何 JavaScript。

只有在个别确实需要用户点击、输入交互的特定区域（比如一个登录状态指示器、一个评论框），我们才在海洋中放置一个**独立的“JavaScript 小岛”**。

```text
┌────────────────────────────────────────────────────────┐
│  网页顶部导航 (包含静态标题 + 一个可交互搜索按钮 🏝️)       │
├────────────────────────────────────────────────────────┤
│                                                        │
│  静态 HTML 文章内容海洋 (纯文本、静态排版、0 字节 JS)      │
│                                                        │
├────────────────────────────────────────────────────────┤
│  页面底部评论框 (仅在用户滚动到这里时激活的交互小岛 🏝️)    │
└────────────────────────────────────────────────────────┘
```

### 群岛架构的核心特性：
1. **独立运行**：每个小岛在各自的沙盒中独立激活，一个小岛加载失败或报错，绝对不会拖垮整个网页的其他部分。
2. **多框架混用**：Astro 是 **UI 无关（UI-agnostic）** 的！你可以在一个页面里用 React 写搜索框，用 Svelte 写计数器，用 Vue 写轮播图，甚至与团队不同技术栈的成员无缝协作。
3. **并行加载**：不需要等一个沉重的轮播图下载完毕，页面上的搜索按钮就已经可以响应点击了。

---

## 2. 颠覆认知的默认行为：UI 组件默认也是 0 JS！

假设你通过 `npx astro add react` 添加了 React 支持，并写了一个 React 计数器组件 `InteractiveCounter.jsx`：

```jsx
// src/components/InteractiveCounter.jsx
import { useState } from 'react';

export default function InteractiveCounter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>点击了 {count} 次</button>;
}
```

如果你在 Astro 页面中直接引用并使用它：

```astro
---
// src/pages/index.astro
import InteractiveCounter from '../components/InteractiveCounter.jsx';
---

<h1>计数器测试</h1>
<InteractiveCounter />
```

**你会发现惊人的一幕：页面上确实渲染出了这个按钮，但点击它毫无反应！**

为什么？因为 **Astro 默认会把所有 UI 框架组件在服务端渲染为纯 HTML，并彻底剥离掉其底层的 React 运行时和客户端 JavaScript！**
这样做保证了即使开发者无意中引入了沉重的组件库，也不会在不经意间拖慢网站。

---

## 3. 激活小岛：客户端指令（Client Directives）

想要让这个组件“活过来”、能在浏览器中响应点击，你只需要在组件上添加一个特殊的 **客户端指令（`client:*`）**。
这个将静态 HTML “重新赋予交互生命”的过程，在前端术语中称为**水合（Hydration）**。

Astro 提供了非常精准、符合不同性能诉求的客户端指令：

### (1) `client:load` —— 立即加载
- **行为**：页面一旦开始加载，立即下载并执行该组件的 JavaScript。
- **最佳场景**：首屏关键交互组件，比如移动端顶部的主导航抽屉、即时生效的用户登录状态。

```astro
<InteractiveCounter client:load />
```

### (2) `client:idle` —— 空闲加载
- **行为**：页面关键渲染完成后，等待浏览器主线程进入空闲状态（利用 `requestIdleCallback`）再加载该组件。
- **最佳场景**：不需要首屏立即可交互的次要小组件，比如侧边栏标签切换、通知提示。

```astro
<InteractiveCounter client:idle />
```

### (3) `client:visible` —— 进入视口加载（极力推荐！）
- **行为**：组件在页面初始状态下只是一段普通的 HTML。只有当用户向下滚动页面、该组件真正进入用户的屏幕视野时（利用 `IntersectionObserver`），浏览器才会开始下载其 JS 代码！
- **最佳场景**：位于页面中下部的耗资源组件，比如底部的评论区、图片轮播、复杂的图表展示。如果用户看一眼就关掉了页面，这些 JS 永远不会被下载，节省了大量流量！

```astro
<InteractiveCounter client:visible />
```

### (4) `client:media="(条件)"` —— 媒体查询匹配时加载
- **行为**：只有当当前屏幕尺寸满足 CSS 媒体查询时才加载。
- **最佳场景**：只在手机端出现的折叠菜单（`client:media="(max-width: 50em)"`）。

### (5) `client:only="react"` —— 跳过服务端渲染
- **行为**：不在服务器端预渲染初始 HTML，直接在客户端纯浏览器环境中渲染（类似纯 SPA）。
- **最佳场景**：强依赖浏览器特有 API（如 `window`、`localStorage`、Canvas、WebGL）的组件。

---

## 4. 客户端指令选型对照表

| 指令 | 触发时机 | 典型适用场景 | 性能影响 |
| :--- | :--- | :--- | :--- |
| **无指令**（默认） | 仅在服务器渲染为 HTML | 纯展示型 UI 组件 | **最佳（0 字节客户端 JS）** |
| `client:load` | 页面初次加载时立即执行 | 首屏核心交互（如顶部导航开关） | 会占用首屏主线程 |
| `client:idle` | 浏览器空闲时执行 | 次要交互组件（如通知气泡） | 不阻塞首屏关键绘制 |
| `client:visible` | 元素滚动到可见区域时执行 | 底部评论区、轮播图、互动图表 | **极优（按需延时加载）** |
| `client:media` | CSS 媒体查询满足时执行 | 仅移动端需要的交互组件 | 桌面端完全不加载 |

---

## 5. 学习指引与下一步

通过群岛架构，你彻底攻克了“静态极速”与“动态交互”之间的矛盾。现在，我们把视野转回到多页面网站的自动化生成：如果网站有 100 篇博客，如何用一套模板自动批量生成 100 个页面？

在下一关中，我们将学习 Astro 的动态路由与 `getStaticPaths()`！
