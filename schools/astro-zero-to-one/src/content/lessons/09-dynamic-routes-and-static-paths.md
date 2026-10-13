---
title: "动态路由：模板驱动批量页面生成（getStaticPaths）"
slug: "dynamic-routes-and-static-paths"
description: "掌握动态路由文件命名（[id].astro），学习在构建阶段通过 getStaticPaths() 批量生成成百上千篇博客文章或产品详情页，完成数据到路由的完整贯通。"
order: 9
quiz: false
agentOnly: true
agentInstructions: |
  教学目标：
  1. 理解动态路由解决的核心问题：用单份通用页面模板批量生成数十甚至数万个独立的静态内容页面（如博客文章详情页 `/posts/[id]`）。
  2. 掌握动态路由文件命名语法：使用中括号 `[id].astro` 或剩余参数 `[...slug].astro`。
  3. 掌握静态生成模式下的核心引擎——`getStaticPaths()` 函数：它在构建阶段执行，返回一个包含 `params`（URL 参数）和 `props`（页面数据）的对象数组。
  4. 能够将第七关学到的“内容集合（Content Collections）”与动态路由打通，形成完整的数据驱动网站闭环。
  5. 教学活动：路径矩阵推导。假设学员的内容集合中有 3 篇 Markdown 文章（id 分别为 `"first-post"`, `"why-astro"`, `"advanced-tips"`），请学员推导 `getStaticPaths` 的返回值结构，并写出最终打包在 `dist/` 中生成的 HTML 文件的具体路径。
  6. 完成条件：学员能够清晰推导出动态页面映射全流程，并收到教师的点评反馈。
---

# 动态路由：模板驱动批量页面生成（getStaticPaths）

在前面的关卡中，我们学习了如何在 `src/pages/` 中创建静态页面（如 `index.astro`, `about.astro`）。
但想象一下：如果你的博客有 500 篇文章，或者你的电商站点有 2000 个商品，你难道要在 `src/pages/` 下手动创建 500 个或 2000 个 `.astro` 文件吗？

显然不能！我们需要一种能力：**编写一个通用的详情页模板，并在构建时根据数据动态、批量生成所有独立的网页**。
在 Astro 中，这个功能通过**动态路由（Dynamic Routing）**和 **`getStaticPaths()`** 实现。

---

## 1. 动态路由的文件命名：中括号语法

在 `src/pages/` 中，如果你在文件名两侧加上中括号 `[]`，Astro 就会将它识别为一个**动态路由参数**。

例如：
- `src/pages/posts/[id].astro`
- `src/pages/authors/[authorName].astro`

这里的 `[id]` 是一个占位符。当构建网站时，Astro 会用真实的数据（比如 `"first-post"`, `"learn-astro"`）替换它，最终生成 `/posts/first-post/` 和 `/posts/learn-astro/`。

---

## 2. 批量生成的引擎：getStaticPaths() 函数

因为 Astro 默认是预渲染的静态网站生成器，它必须在打包时清楚地知道：“你的网站到底要生成哪几个 URL 页面？”

为此，在动态路由页面的 frontmatter 中，你必须导出一个特殊的异步函数：**`getStaticPaths()`**。
这个函数必须返回一个数组，数组里的每一个对象包含两个关键属性：
1. **`params`**：必填。决定了最终生成的 URL 路径参数（必须与文件名中的中括号名字一致，比如 `{ id: 'first-post' }`）。
2. **`props`**：可选但极其常用。用于将具体的数据对象直接传递给当前页面的模板！

看一个基础的静态示例：

```astro
---
// src/pages/dogs/[dogName].astro
export async function getStaticPaths() {
  return [
    { params: { dogName: "spot" }, props: { color: "黑白相间" } },
    { params: { dogName: "rover" }, props: { color: "金黄色" } },
    { params: { dogName: "bingo" }, props: { color: "纯白色" } },
  ];
}

// 1. 获取 URL 参数
const { dogName } = Astro.params;
// 2. 获取传递过来的页面数据
const { color } = Astro.props;
---

<html>
  <head><title>{dogName} 的主页</title></head>
  <body>
    <h1>狗狗名字：{dogName}</h1>
    <p>毛色：{color}</p>
  </body>
</html>
```

当执行 `npm run build` 时，Astro 会自动为你生成 3 个完全静态的网页：
- `/dogs/spot/index.html`
- `/dogs/rover/index.html`
- `/dogs/bingo/index.html`

---

## 3. 强强联合：内容集合 + 动态路由

在真实项目中，最常见的场景是将我们在第七关学到的**内容集合**与动态路由结合。

假设我们在 `src/data/blog/` 下写了十几篇 Markdown 文章，如何在 `src/pages/posts/[id].astro` 中一次性为它们生成所有详情页？

只需要 10 行优雅的代码：

```astro
---
// src/pages/posts/[id].astro
import BaseLayout from '../../layouts/BaseLayout.astro';
import { getCollection, render } from 'astro:content';

// 1. 在构建时，查询所有 blog 集合文章，并为每篇文章映射一个动态路由
export async function getStaticPaths() {
  const blogEntries = await getCollection('blog');
  return blogEntries.map(entry => ({
    params: { id: entry.id },
    props: { entry },
  }));
}

// 2. 对于具体生成的每一页，直接从 Astro.props 取出对应的文章对象
const { entry } = Astro.props;

// 3. 渲染该文章的 Markdown 正文内容
const { Content } = await render(entry);
---

<BaseLayout title={entry.data.title}>
  <article>
    <h1>{entry.data.title}</h1>
    <p class="date">发布于：{entry.data.pubDate.toLocaleDateString('zh-CN')}</p>
    <hr />
    <Content />
  </article>
</BaseLayout>
```

### 这个流程有多么强大？
1. **纯自动化**：你只需要在 `src/data/blog/` 目录下添加一篇新的 `my-new-post.md`，执行构建后，就会自动多出一个漂亮的静态页面 `/posts/my-new-post/`！
2. **强类型保护**：如果文章缺少了必填字段，构建会立刻阻断并报警。
3. **零运行时开销**：所有 500 篇文章在构建完成那一刻全部变成了现成的 HTML 文件，放到服务器上没有任何数据库查询压力，加载只需几毫秒！

---

## 4. 学习指引与下一步

至此，你已经完整掌握了从数据定义、组件封装、路由映射到页面批量生成的整套开发工作流！
只剩下最后一步：如何真正地在本地进行生产测试，并把做好的网站发布到互联网让全世界访问？

在最后一关中，我们将学习 Astro 的构建、预览与全平台部署流程！
