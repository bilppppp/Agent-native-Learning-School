---
title: "样式与资源：作用域 CSS 与图片资源优化"
slug: "scoped-styles-and-assets"
description: "掌握 Astro 内置的 CSS 作用域封装机制（scoped CSS），了解全局样式与动态变量绑定，掌握 src/assets/ 与 <Image /> 组件的自动性能优化。"
order: 6
quiz: false
agentOnly: true
agentInstructions: |
  教学目标：
  1. 理解 Astro 内置 `<style>` 标签的默认作用域机制（Scoped CSS）：编译时自动注入 `data-astro-cid-*` 属性，选择器仅作用于当前组件，不会泄漏到外部或子组件。
  2. 掌握全局样式的生效途径：`<style is:global>`、`:global(...)` 选择器以及外部 CSS 文件导入。
  3. 掌握动态 CSS 变量注入：使用 `define:vars` 指令将 frontmatter 变量直接暴露给 CSS `var(...)`。
  4. 搞清静态资源的双轨通道：什么时候放 `public/`（原样静态文件，如 favicon），什么时候放 `src/assets/`（通过 `<Image />` 组件进行格式转换、尺寸裁剪、防 CLS 布局偏移优化）。
  5. 教学活动：样式边界与图片选型预测。给出一份父组件和子组件的代码片段，让学员判断父组件中定义的样式规则是否会污染子组件，以及对于一张 4MB 的高清摄影封面图，应该放在哪里、用什么标签引用以保证最佳加载速度。
  6. 完成条件：学员准确分析样式隔离效果和图片优化策略，并收到教师针对机制理解的反馈。
---

# 样式与资源：作用域 CSS 与图片资源优化

在传统的纯 HTML/CSS 开发中，随着样式代码越来越多，最让人头疼的问题莫过于**类名冲突与样式互相污染**：你在 A 页面给 `h2` 设置了红色，结果 B 页面的 `h2` 也莫名其妙变红了。

Astro 在样式与多媒体资源处理上，提供了现代、极简且极其强悍的解决方案。

---

## 1. 自动作用域样式（Scoped CSS）

在任何 `.astro` 文件中，你可以直接编写 `<style>` 标签。
**Astro 里的样式规则默认会自动进行作用域隔离（Scoped by default）**！

看一个具体的例子：

```astro
---
// src/components/Card.astro
---

<div class="card">
  <h2>卡片标题</h2>
  <p class="description">卡片正文描述</p>
</div>

<style>
  /* 这些样式只属于当前 Card 组件！ */
  h2 {
    color: #4f46e5;
  }
  .description {
    font-size: 0.875rem;
  }
</style>
```

当 Astro 编译这个组件时，它会自动在底层给当前组件的所有 HTML 元素打上独一无二的哈希属性（例如 `data-astro-cid-hhnqfkh6`），并将 CSS 规则改写为：

```css
h2[data-astro-cid-hhnqfkh6] {
  color: #4f46e5;
}
.description[data-astro-cid-hhnqfkh6] {
  font-size: 0.875rem;
}
```

### 作用域带来的巨大优势：
1. **无需绞尽脑汁起复杂的类名**（再也不需要写 `my-component__header--active` 这种冗长的 BEM 命名）。
2. **零样式泄漏**：你在该组件里随便写 `p { color: gray; }` 或 `h2 {}`，绝对不会影响外部页面或其他组件！
3. **也不会污染子组件**：即使该组件内部引用了 `<ChildComponent />`，父组件的作用域样式也不会穿透到子组件内部。

---

## 2. 何时使用全局样式（Global Styles）？

有时候，你确实需要定义全站通用的基础样式（比如统一的 `body` 字体、重置边距，或者为 Markdown 渲染出的博客文章设置排版）。Astro 提供了两种方式：

### (1) `<style is:global>` 指令
在 `<style>` 标签上添加 `is:global` 属性，Astro 就会取消作用域哈希，原样输出给全局：

```astro
<style is:global>
  /* 全局生效，作用于整个页面的所有 h1 */
  body {
    margin: 0;
    font-family: system-ui, sans-serif;
  }
</style>
```

### (2) 混合使用 `:global()` 选择器
如果你只想让某条特定规则穿透到子元素，可以在局部 `<style>` 中使用 `:global()`：

```astro
<style>
  /* 仅针对当前组件中的 article 内部的所有 h1（无论 h1 是否属于子组件） */
  article :global(h1) {
    color: #2563eb;
  }
</style>
```

---

## 3. 在 CSS 中使用 JS 变量：define:vars

有时候，你想根据组件参数动态改变背景色或主题。Astro 提供了 `define:vars` 指令，让你能把 frontmatter 中的 JavaScript 变量直接注入到 CSS 的 `var()` 变量中：

```astro
---
// src/components/Badge.astro
const { themeColor = "#10b981" } = Astro.props;
---

<span class="badge"><slot /></span>

<style define:vars={{ themeColor }}>
  .badge {
    background-color: var(--themeColor);
    color: white;
    padding: 0.25rem 0.5rem;
    border-radius: 9999px;
  }
</style>
```

---

## 4. 静态资源双轨通道：public/ vs src/assets/

在网页中展示图片有两种典型途径，初学者必须明确区分：

| 维度 | `public/` 目录 | `src/assets/` 目录 |
| :--- | :--- | :--- |
| **文件处理方式** | **原样复制**，Astro 不做任何处理 | **深度优化**（自动转 WebP/AVIF、自动缩放裁剪） |
| **最佳适用场景** | `favicon.ico`, `robots.txt`, 固定的 PDF | 文章插图、摄影大图、UI 图标、横幅 Banner |
| **引用方式** | 直接通过根路径字符串（`/logo.png`） | 在 frontmatter 中 `import` 导入，传给 `<Image />` 组件 |

### 使用官方 `<Image />` 组件优化图片
现代网页对性能要求极高。如果直接上传一张 4MB 的 PNG 图片，用户的手机加载会非常痛苦，还会因为图片加载前后的排版跳动引起累积布局偏移（CLS）。

Astro 提供了强大的内置图片优化：

```astro
---
// src/pages/blog.astro
import { Image } from 'astro:assets';
// 导入存放在 src/assets/ 中的本地高清图片
import myCover from '../assets/cover.png';
---

<article>
  <h1>我的旅行日志</h1>
  <!-- Astro 会自动：
       1. 转换为更小体积的 WebP 格式
       2. 自动注入 width/height 防止页面跳动
       3. 自动生成响应式尺寸
  -->
  <Image src={myCover} alt="旅行封面插图" width={800} />
</article>
```

---

## 5. 学习指引与下一步

通过掌握作用域 CSS 与图片优化，你已经能够编写视觉精美且性能超群的页面了。在下一关中，我们将迈入 Astro 最核心、最令人惊艳的内容处理武器——内容集合（Content Collections）！
