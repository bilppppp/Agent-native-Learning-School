---
title: "组件基础：.astro 双代码块剖析与模板表达式"
slug: "astro-components-and-syntax"
description: "深入 .astro 单文件组件结构，理解 Frontmatter 代码围栏（---）的构建时运行机制，掌握 JSX 风格插值、属性传递与列表渲染。"
order: 3
quiz: false
agentOnly: true
agentInstructions: |
  教学目标：
  1. 帮助学员掌握 .astro 文件的“双代码块”设计：Frontmatter 组件脚本（代码围栏 ---）与组件模板（HTML + 类 JSX 表达式）。
  2. 深刻理解 Frontmatter 代码的执行时机：它是在服务器端/构建时运行一次，所有敏感逻辑、数据请求与变量都不会泄漏到客户端浏览器。
  3. 掌握核心模板语法：变量表达式 `{}`、HTML 属性绑定（使用标准的 `class` 而非 React 的 `className`）、条件渲染与数组列表渲染 `.map()`。
  4. 教学活动：输出结果预测。给出一个包含数据解构、数组遍历与条件渲染的 .astro 组件代码，请学员推导当传入指定数据时，最终生成的 HTML 标签结构，并指出 frontmatter 中的 JavaScript 代码是否会出现在浏览器 DevTools 的 Sources 面板中。
  5. 完成条件：学员准确预测 HTML 结构并解释 frontmatter 的服务端边界，收到教师的详细反馈。
---

# 组件基础：.astro 双代码块剖析与模板表达式

在 Astro 中，**Astro 组件（`.astro` 文件）**是构建网站的最基本单元。无论是整个页面、通用的导航条、还是小到一个小按钮，都可以写成一个 `.astro` 组件。

Astro 组件最美妙的一点是：**它是纯 HTML 的超集**。这意味着任何合法的 HTML 代码，直接存为 `.astro` 文件，都是一个完全合法的 Astro 组件！

---

## 1. 结构解密：双代码块结构

一个标准的 `.astro` 组件由上下两个互补的部分组成：

```astro
---
// 1. 组件脚本 Component Script (JavaScript / TypeScript)
// 运行在服务端或构建时
const pageTitle = "我的第一篇 Astro 文章";
const items = ["轻量", "极速", "无客户端 JS 开销"];
---

<!-- 2. 组件模板 Component Template (HTML + 表达式) -->
<article>
  <h1>{pageTitle}</h1>
  <ul>
    {items.map((item) => <li>{item}</li>)}
  </ul>
</article>
```

### (1) 代码围栏（Frontmatter / 组件脚本）
顶部由三个减号（`---`）包裹的区域称为**代码围栏（Code Fence）**或 **Frontmatter**。
- **运行环境与时机**：这里的代码**只在服务器端渲染或构建阶段执行一次**。
- **安全与零泄漏**：你在代码围栏里定义的任何局部变量、导入的敏感 API 密钥、数据库连接语句，在渲染结束后**都会被彻底剔除**，绝对不会作为 JS 发送到用户的浏览器中！
- **功能职责**：在围栏内，你可以导入其他组件、从远程 API `fetch()` 获取数据、解构传入的组件参数等。

### (2) 组件模板
在第二个 `---` 围栏下方的内容就是**组件模板**。
- 模板决定了组件最终输出的 HTML 结构。
- 可以在模板中直接使用 HTML 标签，并混合使用大括号 `{}` 嵌入 JavaScript 表达式。

---

## 2. 常用模板语法与类 JSX 表达式

Astro 借鉴了 React 的 JSX 语法，但去除了许多令人烦躁的限制，使它更贴近原生 HTML 标准。

### (1) 变量插值与动态属性
使用单个大括号 `{}` 嵌入变量或表达式：

```astro
---
const siteName = "Astro 官方中文学习站";
const logoUrl = "/favicon.ico";
const isVisible = true;
---

<header>
  <img src={logoUrl} alt={siteName} />
  <h2>{siteName.toUpperCase()}</h2>
</header>
```

### (2) 标准属性名称：使用 `class` 而非 `className`
在 React 中，因为 class 是 JavaScript 保留字，开发者必须别扭地写成 `className`。而在 Astro 模板中：
- 你可以直接使用原生 HTML 的 **`class`** 属性！
- Astro 还提供了非常便捷的 `class:list` 指令，用于条件组合多个类名：

```astro
---
const isActive = true;
const isSpecial = false;
---

<!-- 最终渲染为: <div class="btn active"> -->
<div class:list={['btn', { active: isActive, special: isSpecial }]}>按钮</div>
```

### (3) 条件渲染
在模板中，你可以使用 JavaScript 的三元运算符（`? :`）或逻辑与运算符（`&&`）来按需展示内容：

```astro
---
const user = { name: "小明", isVip: true };
---

<div>
  <p>欢迎回来，{user.name}！</p>
  {user.isVip ? <span>👑 VIP 会员</span> : <span>普通用户</span>}
</div>
```

### (4) 列表渲染（`.map()`）
当需要渲染列表数据时，在模板大括号内使用数组的原生 `.map()` 方法：

```astro
---
const tags = ["前端", "Astro", "静态网站"];
---

<ul>
  {tags.map((tag) => <li class="tag-item">{tag}</li>)}
</ul>
```

---

## 3. 组件参数：Astro.props

组件如果只能写死数据，就谈不上复用。Astro 提供了全局内置的 `Astro.props` 对象，用于接收父级传入的参数。

看一个具体的例子：定义一个问候语组件 `GreetingHeadline.astro`：

```astro
---
// src/components/GreetingHeadline.astro
// 定义期望接收的参数类型
interface Props {
  greeting: string;
  name: string;
}

// 从全局 Astro.props 中解构参数
const { greeting, name } = Astro.props;
---

<h2>{greeting}，{name}！</h2>
```

在另一个页面中使用它：

```astro
---
// src/pages/index.astro
import GreetingHeadline from '../components/GreetingHeadline.astro';
---

<div>
  <GreetingHeadline greeting="你好" name="探索者" />
  <GreetingHeadline greeting="欢迎学习" name="Astro 框架" />
</div>
```

最终浏览器收到的纯 HTML 就是干净利落的两行 `<h2>`：

```html
<div>
  <h2>你好，探索者！</h2>
  <h2>欢迎学习，Astro 框架！</h2>
</div>
```

---

## 4. 学习指引与下一步

通过本关，你已经能写出具备动态数据组合能力的 `.astro` 组件了。在下一关中，我们将学习如何把组件组织为真正的多页面网站，探索 Astro 的文件路由系统与页面跳转规范！
