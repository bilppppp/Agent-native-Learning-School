<!-- source: https://docs.astro.build/zh-cn/guides/styling/ -->
<!-- retrieved: 2026-10-13; tool: siteone-crawler 2.5.1; prefix: /zh-cn -->

## Learn Astro with James Q Quick

Build your first site with 35 interactive Scrimba lessons

[Get 20% off](https://scrimba.com/intro-to-astro-c00ar0fi5u?via=astro)

Astro 的设计为了使设计和编写 CSS 变得轻而易举。直接在 Astro 组件中编写你自己的 CSS，或者导入你最喜欢的 CSS 库，如 [Tailwind](https://tailwindcss.com/docs/installation/framework-guides/astro) 外。也支持高级样式设计语言，如 [Sass](https://sass-lang.com/) 和 [Less](https://lesscss.org/)。

[Section titled “在 Astro 进行设计”](#在-astro-进行设计)

为 Astro 组件设计样式，就像在你的组件或页面模板上添加 `<style>` 标签一样容易。当你在 Astro 组件内置了 `<style>` 标签时，Astro 就会自动检测 CSS 并开始为你处理样式。

src/components/MyComponent.astro

```css
<style>  h1 { color: red; }</style>
```
### 作用域样式

Astro `<style>` 标签内的 CSS 规则**默认自动限定范围**。作用域样式在幕后编译，只适用于写在同一组件内的 HTML。你在 Astro 组件中编写的 CSS 会自动封装在该组件中。

src/pages/index.astro

```css
<style>  h1 {    color: red;  }
  .text {    color: blue;  }</style>
```
编译为：

```css
<style>  h1[data-astro-cid-hhnqfkh6] {     color: red;  }
  .text[data-astro-cid-hhnqfkh6] {    color: blue;  }</style>
```
作用域样式不会泄漏，也不会影响你网站的其他部分。在 Astro 中，可以使用像 `h1 {}` 或 `p {}` 这样的低特定性选择器，因为在最终输出中它们与作用域一起被编译。

作用域样式也不适用于模板内的其他 Astro 组件。如果你需要修改子组件的样式，可以考虑将该组件包裹在 `<div>`（或其他元素）中，然后你就可以对其编写样式了。

作用域样式的特定性被保留，允许它们与其他 CSS 文件或 CSS 库一起工作，同时仍然保留防止样式应用于组件之外的独特边界。

### 全局样式

虽然我们推荐大多数组件使用范围化的样式，但有时你可能有必要使用全局的、非限定范围的 CSS。你可以通过 `<style is:global>` 属性选择不自动限定 CSS 范围。

src/components/GlobalStyles.astro

```html
<style is:global>  /* 无作用域，直接传递给浏览器。     适用于网站上的所有 <h1> 标签。 */  h1 { color: red; }</style>
```
你也可以使用 `:global()` 选择器在同一个 `<style>` 标签中混合全局和作用域 CSS 规则。这可以将 CSS 样式应用于子组件。

src/components/MixedStyles.astro

```html
<style>  /* 仅限于此组件。 */  h1 { color: red; }  /* 混合：仅限于子组件的 <h1> 标签。 */  article :global(h1) {    color: blue;  }</style><h1>Title</h1><article><slot /></article>
```
它适合用于像博客文章，或由 CMS 驱动的内容文档，这些内容在 Astro 之外的样式。但要注意会因为某个父级组件有无而导致样式不同会使得很难进行错误排查。

应尽可能多的使用作用域样式，而仅在必要时使用全局样式。

### 用 class:list 组合类名

[Section titled “用 class:list 组合类名”](#用-classlist-组合类名)

如果你需要在元素上动态组合类名，你可以在 `.astro` 文件中使用 `class:list` 工具属性。

src/components/ClassList.astro

```css
---const { isRed } = Astro.props;---<!-- 如果 `isRed` 是真值，class 将是 "box red"。 --><!-- 如果 `isRed` 是假值，class 将是 "box"。 --><div class:list={['box', { red: isRed }]}><slot /></div>
<style>  .box { border: 1px solid blue; }  .red { border-color: red; }</style>
```
参见 [指令参考](../../../zh-cn/reference/directives-reference/index.md#classlist) 页面，了解更多关于 `class:list` 的信息。

**添加于：**
`astro@0.21.0`

Astro `<style>` 可以引用页面上任何可用的 CSS 变量。你也可以在组件的 frontmatter 中直接使用 `define:vars` 指令来传递 CSS 变量。

src/components/DefineVars.astro

```javascript
---const foregroundColor = "rgb(221 243 228)";const backgroundColor = "rgb(24 121 78)";---<style define:vars={{ foregroundColor, backgroundColor }}>  h1 {    background-color: var(--backgroundColor);    color: var(--foregroundColor);  }</style><h1>Hello</h1>
```
参见 [指令参考](../../../zh-cn/reference/directives-reference/index.md#definevars) 页面，了解更多关于 `define:vars` 的信息。

### 传递 class 给子组件

[Section titled “传递 class 给子组件”](#传递-class-给子组件)

在 Astro 中，像 `class` 这样的 HTML 属性不会自动传递给子组件。

相反，你需要在子组件中接受一个 `class` 属性，并将其应用到根元素上。在解构时，你必须重命名它，因为 `class` 是 JavaScript 中的[保留字](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Lexical_grammar#reserved_words)。

使用默认的作用域样式策略时，你还必须传递 `data-astro-cid-*` 属性。你可以通过将剩余的属性 `...rest` 传递给组件来实现这一点。如果你将 `scopedStyleStrategy` 更改为 `'class'` 或 `'where'`，则不需要 `...rest` 属性。

```
---const { class: className, ...rest } = Astro.props;---<div class={className} {...rest}>  <slot/></div>
```
```jsx
---import MyComponent from "../components/MyComponent.astro"---<style>  .red {    color: red;  }</style><MyComponent class="red">这将是红色！</MyComponent>
```
由于 `data-astro-cid-*` 属性包含了子组件在父组件的作用域中，因此父组件的样式可以传递到子组件中。为了避免这种情况，确保在子组件中使用唯一的类名。

### 内联样式

你可以使用 `style` 属性将 HTML 元素设置为内联样式。这可以是 CSS 字符串或 CSS 属性的对象：

```css
// 这两种写法是等价的：<p style={{ color: "brown", textDecoration: "underline" }}>My text</p><p style="color: brown; text-decoration: underline;">My text</p>
```
## 外部样式

有两种使用外部全局样式表的方法：项目源文件中使用 ESM 导入；使用绝对链接引用 `public/` 目录中的文件或托管于别处的文件。

阅读更多关于使用位于 `public/` 或 `src/` 的 [静态资源](../../../zh-cn/guides/imports/index.md) 的内容。

### 导入本地样式表

[Section titled “导入本地样式表”](#导入本地样式表)

想要导入 npm 包，你可能需要更新 `astro.config` 文件。参见下面的[“从 npm 包中导入样式表”部分](#%E4%BB%8E-npm-%E5%8C%85%E4%B8%AD%E5%AF%BC%E5%85%A5%E6%A0%B7%E5%BC%8F%E8%A1%A8)。

你可以在 Astro 组件中使用 ESM 导入语法显式导入样式表。CSS 导入方式与 [Astro 组件中的其他 ESM 导入](../../../zh-cn/basics/astro-components/index.md#组件脚本)一样，它应该**基于组件**进行引用，并且与其他导入一样必须位于组件脚本**顶层**：

```html
---// Astro 会自动为你捆绑和优化这些CSS。// 这也适用于预处理器文件，如 .scss、.styl 等。import '../styles/utils.css';---<html><!-- 你的页面在这 --></html>
```
任何 JavaScript 文件都支持通过 ESM `import`导入 CSS，包括像 React 和 Preact 这样的 JSX 组件。这有助于为 React 组件编写细化的，具有针对性的样式

### 从 npm 包中导入样式表

[Section titled “从 npm 包中导入样式表”](#从-npm-包中导入样式表)

你也可能需要从外部 npm 包中加载样式表。它常用于像导入 [Open Props](https://open-props.style/) 这样的工具类。如果你的包**建议使用文件扩展名**（即 `package-name/styles.css` 而不是 `package-name/styles`），那么它的行为应该与本地样式表一致：

src/pages/random-page.astro

```html
---import 'package-name/styles.css';---<html><!-- 你的页面在这 --></html>
```
如果你所用的包**不建议使用文件扩展名**（即 `包名/样式`），那么你就需要先更新 Astro 配置！

假设你从 `package-name` 导入名为 `normalize` 的 CSS 文件（省略文件扩展名）。为了确保我们能正确地预渲染你的页面，需要把`package-name` 添加到 [`vite.ssr.noExternal` 数组](https://cn.vite.dev/config/ssr-options.md#ssr-noexternal)中。

astro.config.mjs

```jsx
import { defineConfig } from 'astro/config';
export default defineConfig({  vite: {    ssr: {      noExternal: ['package-name'],    }  }})
```
这是[针对 Vite 的设置](https://cn.vite.dev/config/#ssr-noexternal) 与 [Astro SSR](../../../zh-cn/guides/on-demand-rendering/index.md) 无关。

现在，你可以导入 `package-name/normalize` 了。Astro 将对其进行捆绑和优化，就像任何其他本地样式表一样。

```html
---import 'package-name/normalize';---<html><!-- 你的页面在这 --></html>
```
### 通过 link 标签加载静态样式表

[Section titled “通过 link 标签加载静态样式表”](#通过-link-标签加载静态样式表)

你也可以使用 `<link>` 元素在页面上加载样式表。它是应该位于 `/public` 目录下的 CSS 文件的绝对路径，或者是外部网站的链接。不支持使用相对路径的 `<link>` href 值。

```html
<head>  <!-- 本地：/public/styles/global.css -->  <link rel="stylesheet" href="/styles/global.css" />  <!-- 外部 -->  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/prismjs@1.24.1/themes/prism-tomorrow.css"></head>
```
因为这种方法使用 `public/` 目录，它跳过了 Astro 提供的 CSS 处理、捆绑和压缩。如果你需要这些转换，请使用上面的[导入样式表](#%E5%AF%BC%E5%85%A5%E6%9C%AC%E5%9C%B0%E6%A0%B7%E5%BC%8F%E8%A1%A8)方法。

## 级联顺序

Astro 组件有时需要评估多个 CSS 源。例如，你的组件可能会导入 CSS 样式表，包含自己的 `<style>` 标签，*并且*被渲染在导入 CSS 的布局中。

当冲突的 CSS 规则应用于同一元素时，浏览器首先使用 *特异性* 和 *出现顺序* 来确定要显示哪个值。

```html
<style>  h1 { color: red }  div > h1 {    color: purple  }</style><div>  <h1>    这个 header 将会是紫色的！  </h1></div>
```
如果两个规则具有相同的特异性，那么将评估 *出现顺序*，并且最后一个规则的值将具有优先权：

```html
<style>  h1 { color: purple }  h1 { color: red }</style><div>  <h1>    这个 header 将会是红色的！  </h1></div>
```
- **`<link>` 标签在 head 中**（最低优先级）
- **导入的样式**
- **作用域样式**（最高优先级）

### 作用域样式

[Section titled “作用域样式”](#作用域样式-1)

在作用域样式中的 [类样式特异性](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_cascade/Specificity#class_column) 会基于你在 [`scopedStyleStrategy`](../../../zh-cn/reference/configuration-reference/index.md#scopedstylestrategy) 中选定的值，进行增加或不进行增加。

但是，[作用域样式](#%E4%BD%9C%E7%94%A8%E5%9F%9F%E6%A0%B7%E5%BC%8F) 始终是最后才出现的。也因此，它们将优先于其他具有相同特异性的样式。例如，如果你导入了与作用域样式冲突的样式表，作用域样式的值将被应用：

src/components/make-it-purple.css

```css
h1 {  color: purple;}
```
```html
---import "./make-it-purple.css"---<style>  h1 { color: red }</style><div>  <h1>    这个 header 将会是红色的！  </h1></div>
```
如果导入的样式更具特异性，则作用域样式仍会被覆盖。具有更高特异性的样式将优先于作用域样式：

```css
#intro {  color: purple;}
```
```html
---import "./make-it-purple.css"---<style>  h1 { color: red }</style><div>  <h1 id="intro">    这个 header 将会是紫色的！  </h1></div>
```
### 导入顺序

当在 Astro 组件中导入多个样式表时，将按导入的顺序评估 CSS 规则。无论何时评估 CSS，特异性总是决定要显示哪些样式。但是，当冲突的样式具有相同的特异性时，*最后导入的* 样式将获胜：

```css
div > h1 {  color: purple;}
```
src/components/make-it-green.css

```css
div > h1 {  color: green;}
```
```html
---import "./make-it-green.css"import "./make-it-purple.css"---<style>  h1 { color: red }</style><div>  <h1>    这个 header 将会是紫色的！  </h1></div>
```
虽然 `<style>` 标签是作用域的，并且只适用于声明它们的组件，但 *导入的* CSS 可以“泄漏”。导入组件会应用它导入的任何 CSS，即使该组件从未使用：

src/components/PurpleComponent.astro

```html
---import "./make-it-purple.css"---<div>  <h1>我导入紫色的 CSS。</h1></div>
```
MyComponent.astro

```html
---import "./make-it-green.css"import PurpleComponent from "./PurpleComponent.astro";---<style>  h1 { color: red }</style><div>  <h1>    这个 header 将会是紫色的！  </h1></div>
```
在 Astro 中，一个常见的模式是在 [Layout 组件](../../../zh-cn/basics/layouts/index.md) 中导入全局 CSS。请确保在其他导入之前导入 Layout 组件，以便它具有最低的优先级。

通过 [link 标签](#%E9%80%9A%E8%BF%87-link-%E6%A0%87%E7%AD%BE%E5%8A%A0%E8%BD%BD%E9%9D%99%E6%80%81%E6%A0%B7%E5%BC%8F%E8%A1%A8) 加载的样式表按顺序评估，优先于 Astro 文件中的任何其他样式。因此，这些样式将具有低于导入样式表和作用域样式的优先级：

```html
---import "../components/make-it-purple.css"---
<html lang="en">  <head>    <meta charset="utf-8" />    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />    <meta name="viewport" content="width=device-width" />    <meta name="generator" content={Astro.generator} />    <title>Astro</title>    <link rel="stylesheet" href="/styles/make-it-blue.css" />  </head>  <body>    <div>      <h1>这将是紫色的</h1>    </div>  </body></html>
```
## Tailwind

[Section titled “Tailwind”](#tailwind)

Astro 支持在项目中添加流行的 CSS 库、工具和框架，如 [Tailwind](https://tailwindcss.com/) 和其他库！

Astro 同时支持 Tailwind 3 和 4。你可以通过 CLI 命令 [添加 Vite 插件](#%E4%BB%8E-tailwind-3-%E5%8D%87%E7%BA%A7%E5%88%B0-4) 到你的项目以添加 Tailwind 4 支持，或者手动安装旧版依赖项来添加 [Tailwind 3 支持](#%E6%97%A7%E7%89%88-tailwind-3-%E6%94%AF%E6%8C%81)。

如果你要将你现有 Astro 项目的 [Tailwind 3 升级到 4](#%E4%BB%8E-tailwind-3-%E5%8D%87%E7%BA%A7%E5%88%B0-4)，你需要在添加 Tailwind 4 相关依赖的同时，删除旧版 Tailwind 3 相关依赖。

### 添加 Tailwind 4 支持

[Section titled “添加 Tailwind 4 支持”](#添加-tailwind-4-支持)

在 Astro `>=5.2.0` 中，使用 `astro add tailwind` 命令来安装 Tailwind 官方的 Vite 插件。如果要在早期版本的 Astro 中添加 Tailwind 4 支持，请按照 [Tailwind 文档中的指引](https://tailwindcss.com/docs/installation/framework-guides/astro) 手动添加 `@tailwindcss/vite` Vite 插件。

- [npm](#tab-panel-0-0)
- [pnpm](#tab-panel-0-1)
- [Yarn](#tab-panel-0-2)

终端窗口

```
npx astro add tailwind
```
终端窗口

```
pnpm astro add tailwind
```
终端窗口

```
yarn astro add tailwind
```
然后，将 `tailwindcss` 导入到 `src/styles/global.css`（或你选择的其他 CSS 文件）中，使 Tailwind 类对你的 Astro 项目可用。如果你使用 `astro add tailwind` 命令来安装 Vite 插件，那么这个包含导入语句的文件将被默认创建。

src/styles/global.css

```perl
@import "tailwindcss";
```
将此文件导入到你希望 Tailwind 应用的页面中。这一步骤通常是在布局组件中完成的，以便 Tailwind 样式可以在共享该布局的所有页面上使用：

src/layouts/Layout.astro

```
---import "../styles/global.css";---
```
### 从 Tailwind 3 升级到 4

[Section titled “从 Tailwind 3 升级到 4”](#从-tailwind-3-升级到-4)

请遵循以下步骤，将现有的使用 Tailwind v3 的 Astro 项目（使用 `@astrojs/tailwind` 集成）升级到 Tailwind 4（使用 [Vite 插件 `@tailwindcss/vite`](https://tailwindcss.com/docs/installation/framework-guides/astro)）。
1. 如果是最新版本的 Astro，你可以通过 CLI 命令 [将 Tailwind 4 支持添加到你的项目](#%E4%BB%8E-tailwind-3-%E5%8D%87%E7%BA%A7%E5%88%B0-4) ，否则，你可以手动添加 Vite 插件。
2. 将 `@astrojs/tailwind` 集成从你的项目中卸载：

   - [npm](#tab-panel-1-0)
   - [pnpm](#tab-panel-1-1)
   - [Yarn](#tab-panel-1-2)

终端窗口
```
npm uninstall @astrojs/tailwind
```
终端窗口
```
pnpm remove @astrojs/tailwind
```
终端窗口
```
yarn remove @astrojs/tailwind
```
3. 将 `@astrojs/tailwind` 集成从 `astro.config.mjs` 中删除：
astro.config.mjs
```
import { defineConfig } from 'astro/config';import tailwind from '@astrojs/tailwind';
export default defineConfig({ // ... integrations: [tailwind()], // ...});
```
4. 然后，根据 [Tailwind 官方的升级指南](https://tailwindcss.com/docs/upgrade-guide#changes-from-v3) 升级你的项目。

#### 旧版 Tailwind 3 支持

[Section titled “旧版 Tailwind 3 支持”](#旧版-tailwind-3-支持)

要添加（或保留）对 Tailwind 3 的支持，你将需要同时安装 `tailwindcss@3` 和官方的 Astro Tailwind 集成 `@astrojs/tailwind`。手动安装这些依赖，仅用于旧版 Tailwind 3 的兼容性，对于 Tailwind 4 并不做如此要求。你还可能会需要 [旧版 Tailwind 配置](https://v3.tailwindcss.com/docs/configuration#creating-your-configuration-file)：
1. 使用你首选的包管理工具，将 Tailwind 和 Astro Tailwind 集成安装至项目依赖项中：

   - [npm](#tab-panel-2-0)
   - [pnpm](#tab-panel-2-1)
   - [Yarn](#tab-panel-2-2)

终端窗口
```
npm install tailwindcss@3 @astrojs/tailwind
```
终端窗口
```
pnpm add tailwindcss@3 @astrojs/tailwind
```
终端窗口
```
yarn add tailwindcss@3 @astrojs/tailwind
```
2. 导入集成至 `astro.config.mjs` 文件中，并将其添加到 `integrations[]` 数组中：
astro.config.mjs
```
import { defineConfig } from 'astro/config';import tailwind from '@astrojs/tailwind';
export default defineConfig({ // ... integrations: [tailwind()], // ...});
```
3. 在项目根目录下，创建一个 `tailwind.config.mjs` 文件。你可以使用以下命令，来为自己生成一个基础配置文件：

   - [npm](#tab-panel-3-0)
   - [pnpm](#tab-panel-3-1)
   - [Yarn](#tab-panel-3-2)

终端窗口
```
npx tailwindcss init
```
终端窗口
```
pnpm dlx tailwindcss init
```
终端窗口
```
yarn dlx tailwindcss init
```
4. 将以下基础配置添加至你的 `tailwind.config.mjs` 文件中：
tailwind.config.mjs
```
/** @type {import('tailwindcss').Config} */export default { content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'], theme: { extend: {}, }, plugins: [],};
```
**相关操作指南：**
[使用 Tailwind Typography 美化渲染后的 Markdown](../../../zh-cn/recipes/tailwind-rendered-markdown/index.md)

[Section titled “CSS 预处理器”](#css-预处理器)

Astro 支持通过 [Vite](https://cn.vite.dev/guide/features.md#css-pre-processors) 使用 CSS 预处理器，如 [Sass](https://sass-lang.com/)、[Stylus](https://stylus-lang.com/) 和 [Less](https://lesscss.org/)。

### Sass 和 SCSS

[Section titled “Sass 和 SCSS”](#sass-和-scss)

终端窗口

```
npm install sass
```html
在 `.astro` 文件中使用 `<style lang="scss">` 或 `<style lang="sass">`。

### Stylus

[Section titled “Stylus”](#stylus)

终端窗口

```
npm install stylus
```html
在 `.astro` 文件中使用 `<style lang="styl">` 或 `<style lang="stylus">`。

### Less

[Section titled “Less”](#less)

终端窗口

```
npm install less
```html
在`.astro` 文件中使用 `<style lang="less">`。

### LightningCSS

[Section titled “LightningCSS”](#lightningcss)

终端窗口

```
npm install lightningcss
```
在 `astro.config.mjs` 中更新你的 `vite` 配置：

```
import { defineConfig } from 'astro/config'
export default defineConfig({  vite: {    css: {      transformer: "lightningcss",    },  },})
```html
### 在框架组件中

你也可以在 JS 框架内使用上述所有的 CSS 预处理程序！请务必遵循每个框架推荐的模式。
- **React** / **Preact**: `import Styles from './styles.module.scss';`
- **Vue**: `<style lang="scss">`
- **Svelte**: `<style lang="scss">`

## PostCSS

[Section titled “PostCSS”](#postcss)

Astro 内置了 PostCSS，作为 [Vite](https://cn.vite.dev/guide/features.md#postcss) 的一部分。要为你的项目配置 PostCSS，在项目根部创建 `postcss.config.cjs` 文件。然后你就可以在安装插件后使用 `require()` 导入插件（例如 `npm install autoprefixer`）。

postcss.config.cjs

```
module.exports = {  plugins: [    require('autoprefixer'),    require('cssnano'),  ],};
```
* * *

## 框架和库

### 📘 React / Preact

[Section titled “📘 React / Preact”](#-react--preact)

`.jsx` 文件同时支持全局 CSS 和 CSS 模块。要启用后者，请使用 `.module.css` 扩展名（如果使用 Sass 则是 `.module.scss`/`.module.sass` ）。

src/components/MyReactComponent.jsx

```
import './global.css'; // 包括全局 CSSimport Styles from './styles.module.css'; // 使用 CSS 模块（必须以 `.module.css`、`.module.scss` 或 `.module.sass` 结尾！)
```html
### 📗 Vue

[Section titled “📗 Vue”](#-vue)

Astro 中的 Vue 支持与 `vue-loader` 一样的方法。
- [vue-loader - Scoped CSS](https://vue-loader.vuejs.org/guide/scoped-css.md)
- [vue-loader - CSS Modules](https://vue-loader.vuejs.org/guide/css-modules.md)

### 📕 Svelte

[Section titled “📕 Svelte”](#-svelte)

Astro 中的 Svelte 也完全按照预期工作。[Svelte Styling Docs](https://svelte.dev/docs#component-format-style)。

## Markdown 样式

[Section titled “Markdown 样式”](#markdown-样式)

任何 Astro 样式方法都可以用于 [Markdown 布局组件](../../../zh-cn/basics/layouts/index.md#markdown-布局)。但是不同的方式可能会对你的页面产生不同的样式效果。

你可以通过向包装页面内容的布局中添加 [导入的样式表](#%E5%A4%96%E9%83%A8%E6%A0%B7%E5%BC%8F) 来将全局样式应用于 Markdown 内容。你还可以在布局组件中使用 [`<style is:global>` 标签](#%E5%85%A8%E5%B1%80%E6%A0%B7%E5%BC%8F) 来为你的 Markdown 格式设置样式。请注意，添加的任何样式都会受到 [Astro 的级联顺序](#%E7%BA%A7%E8%81%94%E9%A1%BA%E5%BA%8F)的影响，因此你应该仔细检查渲染后的页面，确保你的样式能够按照预期生效。

你也可以添加包括 [Tailwind](../../../zh-cn/recipes/tailwind-rendered-markdown/index.md) 在内的 CSS 集成。如果你使用 Tailwind，[typography 插件](https://tailwindcss.com/docs/typography-plugin) 可以用于样式化 Markdown。

## 生产

### 打包控制

当 Astro 为你的网站构建生产部署时，它会将你的 CSS 压缩并合并到 chunks 中。你网站上的每个页面都有自己的 chunk，此外，多个页面之间共享的 CSS 还会被进一步拆分为自己的 chunk 以供重用。

然而，当你有多个页面共享样式时，一些共享的 chunks 可能会变得非常小。如果它们都被单独发送，那么将会导致许多样式表请求，并影响网站的性能。因此，默认情况下，Astro 仅将 HTML 中大小超过 4kB 的样式表链接为 `<link rel="stylesheet">` 标签，而将较小的样式表内联到 `<style type="text/css">` 中。这种方法在额外请求的数量和可以在页面之间缓存的 CSS 量之间提供了一个平衡。

你可以使用 `assetsInlineLimit` vite 构建选项来配置样式表在多大的情况下会被链接到外部（以字节为单位）。请注意，此选项也会影响内联的脚本和图像。

```
import { defineConfig } from 'astro/config';
export default defineConfig({  vite: {    build: {      assetsInlineLimit: 1024,    }  };});
```
如果你希望所有项目样式都保持外部样式表，可以配置 `inlineStylesheets` 构建选项。

```
import { defineConfig } from 'astro/config';
export default defineConfig({  build: {    inlineStylesheets: 'never'  }});
```
你也可以将该选项设置为 `'always'` ，这样就可以内联所有的样式表了。

## 高级

绕过 Astro 内置的 CSS 捆绑时要小心！样式不会自动包含在构建的输出中，你有责任确保引用的文件被正确地包含在最终的页面输出中。

### 导入 ?raw CSS

[Section titled “导入 ?raw CSS”](#导入-raw-css)

对于高级用例，CSS 可以直接从磁盘上读取，而 Astro 不进行捆绑或压缩。当你需要完全控制某些 CSS 片段，并需要绕过 Astro 的自动 CSS 处理时，这可能有用的。

对于大多数用户来说，不建议这样做：

src/components/RawInlineStyles.astro

```
---// 高级用例! 不建议大多数用户使用import rawStylesCSS from '../styles/main.css?raw';---<style is:inline set:html={rawStylesCSS}></style>
```
完整的细节见 [Vite 的文档](https://cn.vite.dev/guide/assets.md#importing-asset-as-string)。

### 导入 ?url CSS

[Section titled “导入 ?url CSS”](#导入-url-css)

一个高级用例，你可以在你的项目 `src/` 目录中直接导入 CSS 文件链接。当你需要完全控制 CSS 文件在页面上的加载方式时可能有用。然而，这将阻止该 CSS 文件和你的页面上的其他 CSS 进行优化。

对于大多数用户来说，不建议这样做。相反，将 CSS 文件放在 `public/` 内，你可以获得一致的链接。

用 `?url` 导入较小的 CSS 文件，可能会在最终构建时将 CSS 文件的 base64 编码内容作为数据链接返回值。你可以编写代码以支持经编码的数据链接（`data:text/css;base64,...`），或者将 [`vite.build.assetsInlineLimit`](https://cn.vite.dev/config/#build-assetsinlinelimit) 配置选项设为 `0` 以禁用这一功能。

src/components/RawStylesUrl.astro

```
---// 高级用例! 不建议大多数用户使用import stylesUrl from '../styles/main.css?url';---<link rel="preload" href={stylesUrl} as="style"><link rel="stylesheet" href={stylesUrl}>
```
完整的细节见 [Vite 文档](https://cn.vite.dev/guide/assets.md#importing-asset-as-url)。

Learn

| [贡献](../../../zh-cn/contribute/index.md) | [社区](https://astro.build/chat) | [赞助](https://opencollective.com/astrodotbuild) |

---

[跳转到内容](#_top)

[Astro](https://astro.build/)
[Docs](../../../zh-cn/getting-started/index.md)

| [GitHub](https://github.com/withastro/astro) | [Discord](https://astro.build/chat) |

![Scrimba](data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==)

![](data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==)
