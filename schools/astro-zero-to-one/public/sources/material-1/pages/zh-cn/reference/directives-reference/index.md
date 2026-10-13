<!-- source: https://docs.astro.build/zh-cn/reference/directives-reference/ -->
<!-- retrieved: 2026-10-13; tool: siteone-crawler 2.5.1; prefix: /zh-cn -->

# 模板指令参考

**模板指令**是特殊的 HTML 属性，它可以在任一 Astro 组件模板（`.astro` 文件）中使用，也可以在 `.mdx` 文件中使用。

模板指令用某种方式控制元素或组件行为。模板指令可以启用一些编译器功能，使你的生活更轻松（比如使用 `class:list` 而不是 `class`）。指令也可以让 Astro 编译器对该组件进行特殊处理（比如使用 `client:load` 激活组件）。

本页描述了 Astro 中所有可用的模板指令及其工作方式。

## 规则

有效的模板指令需要:
- 在其名称中包括冒号 `:`，使用 `X:Y` 的形式（例如：`client:load`）。
- 对编译器可见（例如：`<X {...attr}>`，如果 `attr` 包含了指令，则不会工作）。

部分模板指令，可以传递自定义值：
- `<X client:load />`（无法传递值）
- `<X class:list={['some-css-class']} />`（传递数组）

模板指令永远不会直接包含在组件的最终 HTML 输出中。

## 通用指令

[Section titled “通用指令”](#通用指令)

[Section titled “class:list”](#classlist)

`class:list={...}` 接收 class 数组，并将其转换为 class 字符串。这是受流行的 @lukeed [clsx](https://github.com/lukeed/clsx) 辅助库的启发。

`class:list` 接收数组，其中有几种不同的可能值：
- `string`：添加到 `class` 元素
- `Object`：添加到键值对到 `class` 元素
- `Array`：扁平化
- `false`, `null`, or `undefined`: 跳过

```
<!-- 原先 --><span class:list={[ 'hello goodbye', { world: true }, [ 'friend' ] ]} /><!-- 输出 --><span class="hello goodbye world friend"></span>
```
### set:html

[Section titled “set:html”](#sethtml)

`set:html={string}` 将 HTML 字符串注入元素中，类似于设置 `el.innerHTML`。

**该值不会被 Astro 自动转义**！请确保你信任该值，或者在传递给模板前对其进行手动转义。忘记这样做可能会使你受到[跨网站脚本（XSS）攻击](https://owasp.org/www-community/attacks/xss/)。

```html
---const rawHTMLString = "Hello <strong>World</strong>"---<h1>{rawHTMLString}</h1>  <!-- 输出：<h1>Hello &lt;strong&gt;World&lt;/strong&gt;</h1> --><h1 set:html={rawHTMLString} />  <!-- 输出：<h1>Hello <strong>World</strong></h1> -->
```
你也可以在 `<Fragment>` 上使用 `set:html` 来避免添加不必要的封装元素。这在从 CMS 获取 HTML 时特别有用。

```javascript
---const cmsContent = await fetchHTMLFromMyCMS();---<Fragment set:html={cmsContent}>
```
`set:html={Promise<string>}` 将封装在 Promise 中的 HTML 字符串注入到元素中。

```jsx
---import api from '../db/api.js';---<article set:html={api.getArticle(Astro.props.id)}></article>
```
`set:html={Promise<Response>}`将一个[Response 响应](https://developer.mozilla.org/zh-CN/docs/Web/API/Response)注入到元素中。

这在使用 `fetch()` 时最有用。 例如，从以前的静态站点生成器中获取旧的文章。

```html
<article set:html={fetch('http://example/old-posts/making-soup.html')}></article>
```
`set:html` 可以用在任何标签上，不必包含 HTML。例如，在 `<script>` 标签上使用 [`JSON.stringify()`](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify) 将 [JSON-LD](https://json-ld.org/) 模式添加到你的页面。

```perl
<script type="application/ld+json" set:html={JSON.stringify({  "@context": "https://schema.org/",  "@type": "Person",  name: "Houston",  hasOccupation: {    "@type": "Occupation",    name: "Astronaut"  }})}/>
```
查看 [客户端脚本](../../../zh-cn/guides/client-side-scripts/index.md) 如何在 Astro 组件中工作。

### define:vars

[Section titled “define:vars”](#definevars)

`define:vars={...}` 可以将服务器端的变量从组件 frontmatter 传递给客户端的 `<script>` 或 `<style>` 标签。支持任何 **JSON 可序列化的** frontmatter 变量，包括通过 `Astro.props` 传递给组件的 `props`。值可以使用 [`JSON.stringify()`](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify) 进行序列化。

```javascript
---const foregroundColor = "rgb(221 243 228)";const backgroundColor = "rgb(24 121 78)";const message = "Astro is awesome!";---<style define:vars={{ textColor: foregroundColor, backgroundColor }}>  h1 {    background-color: var(--backgroundColor);    color: var(--textColor);  }</style>
<script define:vars={{ message }}>  alert(message);</script>
```
在 `<script>` 标签上使用 `define:vars` 相当于使用 [`is:inline` 指令](#isinline)，这意味着脚本不会被打包，将直接内联到 HTML 中。

这是因为当 Astro 打包一个脚本时，即使你在一个页面上多次包含了包含脚本的组件，它也会包含并运行该脚本一次。`define：vars` 需要一个脚本来重新运行每组值，所以 Astro 创建了一个内联脚本来代替。

对于脚本，请尝试[手动将变量传递给脚本](../../../zh-cn/guides/client-side-scripts/index.md#将-frontmatter-变量传递给脚本)。

## 高级指令

### is:raw

[Section titled “is:raw”](#israw)

`is:raw` 会让 Astro 编译器将该元素的任何子项都视为文本。这意味着该组件中所有特殊的 Astro 模板语法都不会生效。

例如，如果你有一个自定义的 Katex 组件，它将一些文本转换为 HTML，你可以这样做：

```jsx
---import Katex from '../components/Katex.astro';---<Katex is:raw>Some conflicting {syntax} here</Katex>
```
Reference

| [贡献](../../../zh-cn/contribute/index.md) | [社区](https://astro.build/chat) | [赞助](https://opencollective.com/astrodotbuild) |

---

[跳转到内容](#_top)

[Astro](https://astro.build/)
[Docs](../../../zh-cn/getting-started/index.md)

| [GitHub](https://github.com/withastro/astro) | [Discord](https://astro.build/chat) |

![Scrimba](data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==)

![](data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==)

## Learn Astro with James Q Quick

Build your first site with 35 interactive Scrimba lessons

[Get 20% off](https://scrimba.com/intro-to-astro-c00ar0fi5u?via=astro)
