---
title: "路由与导航：文件路由机制与站点内链接"
slug: "pages-and-routing"
description: "理解基于文件系统的静态路由机制，掌握 pages 目录下 .astro 与 .md 文件到 URL 的映射规则，以及站内根相对路径链接规范和 404 页面。"
order: 4
quiz: false
agentOnly: true
agentInstructions: |
  教学目标：
  1. 掌握 Astro “基于文件系统的路由（File-based Routing）”模型：不需要额外的 Router 配置文件，`src/pages/` 目录结构即网站路由结构。
  2. 熟练掌握映射规则：`index.astro` 对应根目录 `/`，`about.astro` 对应 `/about/`，子目录嵌套与 Markdown 文件直接作为页面的规则。
  3. 强调站内链接规范：为什么在 Astro 中站内跳转必须使用根绝对路径（如 `href="/about/"`），而不能写相对路径（如 `href="./about"`）？
  4. 了解自定义 404 页面：`src/pages/404.astro` 会在构建时自动输出为 `dist/404.html`。
  5. 教学活动：路由表预测与排错。给出 4 个文件路径（包括一个 markdown 页面和一个 404 页面），让学员写出浏览器中对应的访问 URL，并指出如果写 `<a href="posts/1">` 在多级页面会有什么断裂风险。
  6. 完成条件：学员准确写出映射 URL 并讲清根绝对路径的必要性，收到教师反馈。
---

# 路由与导航：文件路由机制与站点内链接

在传统的后端框架或单页应用中，配置路由往往需要写一个长长的 `routes.js` 配置文件。而在 Astro 中，路由的处理方式回归到了最直观、最自然的模式：**文件即路由（File-based Routing）**。

---

## 1. 核心规则：src/pages/ 目录映射

在 Astro 项目中，`src/pages/` 目录下的每一个支持的文件，都会自动映射为一个可直接访问的 URL 路径。Astro 支持的文件类型包括：
- `.astro`（Astro 组件页面）
- `.md` / `.mdx`（Markdown / MDX 内容页面）
- `.html`（普通静态 HTML 文件）
- `.js` / `.ts`（API 静态端点或动态服务端点）

让我们看一组官方标准的静态路由映射表：

| 磁盘上的源文件路径 | 浏览器中的访问 URL | 作用说明 |
| :--- | :--- | :--- |
| `src/pages/index.astro` | `https://mysite.com/` | 网站首页 |
| `src/pages/about.astro` | `https://mysite.com/about/` | 单级页面 |
| `src/pages/about/index.astro` | `https://mysite.com/about/` | 与上一行效果等价的目录式写法 |
| `src/pages/about/me.astro` | `https://mysite.com/about/me/` | 嵌套子页面 |
| `src/pages/posts/1.md` | `https://mysite.com/posts/1/` | Markdown 文件直接作为网页 |
| `src/pages/404.astro` | `https://mysite.com/404.html` | 专属自定义 404 错误页 |

> **关键认知**：
> 在 Astro 中，任何以 `index.*` 命名的文件，都代表其所在目录的根入口。例如 `src/pages/blog/index.astro` 对应的 URL 就是 `/blog/`。

---

## 2. Markdown 直接作为页面

很多初学者会惊喜地发现：如果你只是想快速写一篇隐私协议或免责声明，你甚至不需要写任何 Astro 代码！
直接在 `src/pages/` 下新建一个 `privacy.md`：

```markdown
---
title: "隐私政策"
layout: "../layouts/BaseLayout.astro"
---

# 隐私政策

欢迎访问我们的站点。我们尊重您的隐私，承诺不收集任何个人敏感数据。
```

在构建时，Astro 会自动将这个 Markdown 文件解析为 HTML，并将其放在 `/privacy/` 路径下！

---

## 3. 页面之间的链接规范：必须使用相对于根的路径

在网页之间添加超链接时，初学者经常随手写出相对路径，例如：

```html
<!-- ❌ 存在隐患的相对路径写法 -->
<a href="./about">关于我们</a>
<a href="../posts/1">查看文章</a>
```

**为什么 Astro 官方强烈要求使用相对于根的绝对路径？**
因为当访问者处于不同深度的 URL 时（比如在 `/posts/2026/astro-guide/`），相对路径 `./about` 会被浏览器解析为 `/posts/2026/astro-guide/about`，导致 404 链接断裂！

**官方标准做法**：一律以斜杠 `/` 开头，指定从网站根目录开始的完整路径：

```html
<!-- ✅ 官方推荐的规范写法 -->
<a href="/">首页</a>
<a href="/about/">关于我们</a>
<a href="/posts/1/">阅读第一篇教程</a>
```

这样无论你的当前页面在几级子目录下，点击链接都能准确跳转到目标页面。

---

## 4. 自定义 404 错误页面

当访问者在浏览器里输入了一个不存在的网址时，默认的服务器白底黑字报错很不专业。
在 Astro 中，定制 404 页面只需要一步：在 `src/pages/` 下创建 `404.astro`：

```astro
---
// src/pages/404.astro
---

<html lang="zh-CN">
  <head>
    <title>页面未找到 - 404</title>
  </head>
  <body>
    <h1>404 - 迷路了？</h1>
    <p>抱歉，您访问的页面不存在或已被移除。</p>
    <a href="/">返回网站首页</a>
  </body>
</html>
```

当执行 `npm run build` 时，Astro 会自动将它输出为 `dist/404.html`。GitHub Pages、Vercel、Netlify 等绝大多数静态托管平台都会自动识别并使用这个文件作为 404 错误响应。

---

## 5. 学习指引与下一步

现在你已经掌握了如何用文件组织多个页面。但在制作完整网站时，每个页面都要写完整的 `<!DOCTYPE html>` 和公共导航显然很不优雅。在下一关中，我们将学习如何使用“布局（Layout）”与“插槽（Slot）”优雅解决页面外壳的复用！
