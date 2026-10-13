---
title: "复用与外壳：Layout 布局组件与 Slot 插槽体系"
slug: "layouts-and-slots"
description: "掌握组件间参数传递（Astro.props），使用 Layout 抽象全局 HTML 骨架（<!DOCTYPE>、<head>、<header>、<footer>），理解默认插槽与具名插槽。"
order: 5
quiz: false
agentOnly: true
agentInstructions: |
  教学目标：
  1. 理解 Layout 布局组件的定位：它本质上是一个约定放在 `src/layouts/` 下的特殊 Astro 组件，专门负责提供 `<!DOCTYPE html>`、`<head>`、全局导航和页脚等外壳。
  2. 深刻掌握插槽（`<slot />`）的工作原理：子内容如何通过插槽注入到布局模板中。
  3. 掌握具名插槽（Named Slots，如 `<slot name="header" />`）与插槽默认回退内容（Fallback Content）的使用场景。
  4. 教学活动：DOM 装配推导。给出一个 `BaseLayout.astro` 结构以及一个使用了具名插槽的 `about.astro` 页面，请学员推导最终生成的网页 HTML 树，并指出如果不给具名插槽传内容会发生什么。
  5. 完成条件：学员准确描述插槽分发过程，收到教师的点评与反馈。
---

# 复用与外壳：Layout 布局组件与 Slot 插槽体系

当网站页面数量增加后，每个页面都必须包含完整的 HTML 根骨架（`<!DOCTYPE html>`, `<html>`, `<head>`, `<body>`）以及站点的公共页眉和页脚。如果在每个页面里手写一遍，后期修改全局样式或标题时就会变成一场灾难。

为了解决这个问题，Astro 引入了**布局（Layout）组件**与**插槽（Slot）机制**。

---

## 1. 什么是布局组件（Layout）？

布局组件本质上就是一个普通的 `.astro` 组件，按照社区约定，通常存放在 `src/layouts/` 目录下。

布局的核心职责是**提供页面级外壳**，并通过一个特殊的占位标签——**`<slot />`（插槽）**，来接纳具体页面的独有内容。

让我们看一个最基础的 `BaseLayout.astro` 示例：

```astro
---
// src/layouts/BaseLayout.astro
interface Props {
  title: string;
}

const { title } = Astro.props;
---

<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{title} | 我的网站</title>
  </head>
  <body>
    <nav>
      <a href="/">首页</a> | <a href="/about/">关于</a>
    </nav>

    <!-- ★ 页面特有的内容将被注入到这里！ -->
    <main>
      <slot />
    </main>

    <footer>
      <p>© 2026 Astro 学习站点 保留所有权利</p>
    </footer>
  </body>
</html>
```

---

## 2. 在具体页面中使用布局

在具体页面（例如 `src/pages/about.astro`）中，我们只需要导入这个布局，并把页面的核心内容包裹在布局标签内部：

```astro
---
// src/pages/about.astro
import BaseLayout from '../layouts/BaseLayout.astro';
---

<BaseLayout title="关于我们">
  <h1>关于本站</h1>
  <p>这是一个使用 Astro 从零构建的极速静态网站！</p>
  <p>所有内容均在服务端渲染为纯 HTML。</p>
</BaseLayout>
```

当 Astro 编译 `about.astro` 时：
1. 传入的 `title="关于我们"` 会被布局中的 `Astro.props` 获取，填入 `<title>` 标签中。
2. `<BaseLayout>` 标签包裹的所有内容（`<h1>` 和两个 `<p>`）会自动注入到布局中的 `<slot />` 占位处。
3. 最终输出一份完整、严谨且不失 DRY（Don't Repeat Yourself）原则的 HTML 文件！

---

## 3. 进阶插槽：具名插槽与回退内容

有时候，页面的不同区域需要分别定制。比如某些页面想在侧边栏加额外的广告，或者定制特定的页眉。此时，**具名插槽（Named Slots）**派上了用场。

### (1) 定义具名插槽
在布局中，使用 `name` 属性给插槽命名；在插槽标签中间还可以写入“默认回退内容”：

```astro
---
// src/layouts/ComplexLayout.astro
---

<div class="layout-container">
  <header>
    <!-- 具名插槽：header。如果不传，则显示默认的通用标题 -->
    <slot name="header">
      <h2>默认通用站点标题</h2>
    </slot>
  </header>

  <main>
    <!-- 默认未命名插槽 -->
    <slot />
  </main>
</div>
```

### (2) 向具名插槽分发内容
在页面中，通过在元素上添加 `slot="header"` 属性，即可精准分发到对应位置：

```astro
---
// src/pages/special.astro
import ComplexLayout from '../layouts/ComplexLayout.astro';
---

<ComplexLayout>
  <!-- 分发到 header 插槽 -->
  <div slot="header">
    <h1 style="color: gold;">★ 专属促销页特制标题 ★</h1>
  </div>

  <!-- 未指定 slot 属性的内容，自动进入默认的 <slot /> -->
  <p>这里是促销页面的正文内容。</p>
</ComplexLayout>
```

如果页面没有传入 `<div slot="header">`，布局就会自动呈现回退内容 `<h2>默认通用站点标题</h2>`。

---

## 4. 学习指引与下一步

通过布局与插槽，你的网站已经具备了清晰的骨架抽象。但在视觉层面，一个网页还需要漂亮的样式排版。在下一关中，我们将探索 Astro 的组件作用域 CSS 与图片资源优化机制！
