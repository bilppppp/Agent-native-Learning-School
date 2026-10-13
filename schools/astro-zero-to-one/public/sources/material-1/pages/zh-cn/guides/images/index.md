<!-- source: https://docs.astro.build/zh-cn/guides/images/ -->
<!-- retrieved: 2026-10-13; tool: siteone-crawler 2.5.1; prefix: /zh-cn -->

# 图像

Astro 为你提供了多种在网站上使用图像的方法，无论它们是本地存储在你的项目内，还是链接到外部 URL，或者在 CMS 或 CDN 中管理的。

Astro 提供内置的 [`<Image />`](#image-) 和 [`<Picture />`](#picture-) Astro 组件，[Markdown 图像语法](#markdown-%E6%96%87%E4%BB%B6%E4%B8%AD%E7%9A%84%E5%9B%BE%E5%83%8F)（`!`）处理，[SVG 组件](#svg-%E7%BB%84%E4%BB%B6)，以及 [图像生成函数](#%E4%BD%BF%E7%94%A8-getimage-%E7%94%9F%E6%88%90%E5%9B%BE%E5%83%8F) 来优化和/或转换你的图像。此外，你可以默认配置[自动调整响应式图像](#%E5%93%8D%E5%BA%94%E5%BC%8F%E5%9B%BE%E5%83%8F%E8%A1%8C%E4%B8%BA)，或在单个图像和图片组件上设置响应式属性。

在 `.astro` 或 Markdown 文件中，你可以选择使用原生 HTML 元素或 SVG 文件来引用图片，或者根据文件类型使用标准方式（例如在 MDX 和 JSX 中使用 `<img />`）。然而，Astro 不会对这些图片进行任何处理或优化。

Astro 中没有原生的视频支持，我们建议选择一个 [托管视频服务](../../../zh-cn/guides/media/index.md) 来处理优化和流式传输视频内容的需求。

## 在哪里存储图像

### src/ vs public/

[Section titled “src/ vs public/”](#src-vs-public)

我们建议尽可能将本地图像保存在 `src/` 中，以便 Astro 可以对其进行转换、优化和打包。`/public` 目录中的文件始终按原样服务或复制到构建文件夹中，不进行任何处理。

你在 `src/` 中存储的本地图像可以被项目中的所有文件使用：`.astro`、`.md`、`.mdx`、`.mdoc` 和其他 UI 框架。图像可以存储在任何文件夹中，包括与你的内容一起。

如果你想要避免对图像做任何处理，请将图像存储在 `public/` 文件夹中。这些图像可以作为你网站域上的 URL 路径供你的项目文件使用，并允许你拥有指向它们的直接公共链接。例如，你的网站图标通常会放在此文件夹的根目录中，以便浏览器可以识别它。

### 远程图像

你还可以选择将图像远程存储在 [内容管理系统（CMS）](../../../zh-cn/guides/cms/index.md) 或 [数字资产管理（DAM）](../../../zh-cn/guides/media/index.md) 平台中。Astro 可以使用 API 远程获取数据，或者从完整 URL 路径显示图像。

在处理外部来源时，为了提供额外的保护，只有在配置中指定的 [授权图像源](#%E6%8E%88%E6%9D%83%E8%BF%9C%E7%A8%8B%E5%9B%BE%E5%83%8F) 才会被 Astro 的图像组件和辅助函数处理（例如优化、转换）。来自其他来源的远程图像将不经处理地显示。

**选项：** `<Image />`, `<Picture />`, `<img>`, `<svg>`, SVG 组件

Astro 的模板语言允许你使用 Astro [`<Image />`](../../../zh-cn/reference/modules/astro-assets/index.md#image-) 组件渲染优化后的图像，并使用 Astro [`<Picture />`](../../../zh-cn/reference/modules/astro-assets/index.md#picture-) 组件生成多种尺寸和格式。这两个组件还接受[响应式图像属性](#%E5%93%8D%E5%BA%94%E5%BC%8F%E5%9B%BE%E5%83%8F%E8%A1%8C%E4%B8%BA)，用于根据容器大小调整大小并响应设备屏幕尺寸和分辨率。

此外，你可以在 `.astro` 组件中导入和使用 [SVG 文件作为 Astro 组件](#svg-%E7%BB%84%E4%BB%B6)。

所有原生 HTML 标签，包括 `<img>` 和 `<svg>`，在 `.astro` 组件中也可用。[使用 HTML 标签渲染的图像](#%E4%BD%BF%E7%94%A8-html-img-%E6%A0%87%E7%AD%BE%E6%98%BE%E7%A4%BA%E6%9C%AA%E5%A4%84%E7%90%86%E7%9A%84%E5%9B%BE%E5%83%8F) 不会经过处理（例如优化、转换），并将按原样复制到你的构建文件夹中。
- 项目 `src/` 文件夹中的本地图像使用来自文件相对路径的导入。
图像和图片组件直接使用命名导入（例如 `src={rocket}`），而 `<img>` 标签使用导入的 `src` 对象属性（例如 `src={rocket.src}`）。
- 远程和 `public/` 图像使用 URL 路径。
为远程图像提供完整的 URL（例如 `src="https://www.example.com/images/my-remote-image.jpg"`），或你网站上与 `public/` 文件夹中文件位置对应的相对 URL 路径（例如 `src="/images/my-public-image.jpg"` 用于位于 `public/images/my-public-image.jpg` 的图像）。

src/pages/blog/my-images.astro

```html
---import { Image } from 'astro:assets';import localBirdImage from '../../images/subfolder/localBirdImage.png';---<Image src={localBirdImage} alt="一只鸟坐在蛋窝上。" /><Image src="/images/bird-in-public-folder.jpg" alt="一只鸟。" width="50" height="50" /><Image src="https://example.com/remote-bird.jpg" alt="一只鸟。" width="50" height="50" />
<img src={localBirdImage.src} alt="一只鸟坐在蛋窝上。"><img src="/images/bird-in-public-folder.jpg" alt="一只鸟。"><img src="https://example.com/remote-bird.jpg" alt="一只鸟。">
```
请参阅 [`<Image />`](../../../zh-cn/reference/modules/astro-assets/index.md#image-) 和 [`<Picture />`](../../../zh-cn/reference/modules/astro-assets/index.md#picture-) 组件的完整 API 参考，包括必需和可选属性。

**相关操作指南：**
[动态导入图片](../../../zh-cn/recipes/dynamically-importing-images/index.md)

## Markdown 文件中的图像

[Section titled “Markdown 文件中的图像”](#markdown-文件中的图像)

**选项：** `!`，`<img>`（使用 public 或远程图像）

在你的 `.md` 文件中使用标准的 Markdown `![alt](src)` 语法。你在 `src/` 中存储的本地图像和远程图像将被处理和优化。当你[全局配置响应式图像](../../../zh-cn/reference/configuration-reference/index.md#imagelayout)时，这些图像也将是[响应式的](#%E5%93%8D%E5%BA%94%E5%BC%8F%E5%9B%BE%E5%83%8F%E8%A1%8C%E4%B8%BA)。

src/pages/post-1.md

```
# 我的 Markdown 页面
<!-- 存储在 src/assets/ 中的本地图像 --><!-- 使用相对文件路径或导入别名 -->![繁星点点的夜空。](../assets/stars.png)
<!-- 存储在 public/images/ 中的图像 --><!-- 使用相对于 public/ 的文件路径 -->![繁星点点的夜空。](/images/stars.png)
<!-- 其他服务器上的远程图像 --><!-- 使用图像的完整 URL -->![Astro](https://example.com/images/remote-image.png)
```
HTML `<img>` 标签也可用于显示存储在 `public/` 或远程的图像，而无需任何图像优化或处理。但是，`<img>` 不支持你在 `src` 中的本地图像。

`<Image />` 和 `<Picture />` 组件在 `.md` 文件中不可用。如果你需要对图像属性进行更多控制，我们建议使用 [Astro 的 MDX 集成](../../../zh-cn/guides/integrations-guide/mdx/index.md) 来添加对 `.mdx` 文件格式的支持。MDX 允许[在 MDX 中可用的其他图像选项](#mdx-%E6%96%87%E4%BB%B6%E4%B8%AD%E7%9A%84%E5%9B%BE%E5%83%8F)，包括将组件与 Markdown 语法结合使用。

## MDX 文件中的图像

[Section titled “MDX 文件中的图像”](#mdx-文件中的图像)

**选项：** `<Image />`, `<Picture />`, `<img />`, `!`, SVG 组件

你可以通过导入组件和你的图像，在 `.mdx` 文件中使用 Astro 的 `<Image />` 和 `<Picture />` 组件。像[在 `.astro` 文件中使用](#astro-%E6%96%87%E4%BB%B6%E4%B8%AD%E7%9A%84%E5%9B%BE%E5%83%8F)一样使用它们。JSX `<img />` 标签也支持未处理的图像，并[使用与 HTML `<img>` 标签相同的图像导入](#%E4%BD%BF%E7%94%A8-html-img-%E6%A0%87%E7%AD%BE%E6%98%BE%E7%A4%BA%E6%9C%AA%E5%A4%84%E7%90%86%E7%9A%84%E5%9B%BE%E5%83%8F)。

此外，还支持[标准的 Markdown `![alt](src)` 语法](#markdown-%E6%96%87%E4%BB%B6%E4%B8%AD%E7%9A%84%E5%9B%BE%E5%83%8F)，无需导入。

src/pages/post-1.mdx

```html
---title: 我的页面标题---import { Image } from 'astro:assets';import rocket from '../assets/rocket.png';
# 我的 MDX 页面
// 存储在同一文件夹中的本地图像![休斯顿在野外](houston.png)
// 存储在 src/assets/ 中的本地图像<Image src={rocket} alt="太空中的火箭飞船。" /><img src={rocket.src} alt="太空中的火箭飞船。" />![太空中的火箭飞船](../assets/rocket.png)
// 存储在 public/images/ 中的图像<Image src="/images/stars.png" alt="繁星点点的夜空。" /><img src="/images/stars.png" alt="繁星点点的夜空。" />![繁星点点的夜空。](/images/stars.png)
// 其他服务器上的远程图像<Image src="https://example.com/images/remote-image.png" /><img src="https://example.com/images/remote-image.png" />![Astro](https://example.com/images/remote-image.png)
```
## UI 框架组件中的图像

[Section titled “UI 框架组件中的图像”](#ui-框架组件中的图像)

**图像选项：** 框架自己的图像语法（例如 JSX 中的 `<img />`，Svelte 中的 `<img>`）

[必须首先导入本地图像](#%E4%BD%BF%E7%94%A8-html-img-%E6%A0%87%E7%AD%BE%E6%98%BE%E7%A4%BA%E6%9C%AA%E5%A4%84%E7%90%86%E7%9A%84%E5%9B%BE%E5%83%8F)才能访问其图像属性，例如 `src`。然后，你可以像在该框架自己的图像语法中通常那样渲染它们：

src/components/ReactImage.jsx

```jsx
import stars from "../assets/stars.png";
export default function ReactImage() {  return (    <img src={stars.src} alt="繁星点点的夜空。" />  )}
```
src/components/SvelteImage.svelte

```html
<script>  import stars from '../assets/stars.png';</script>
<img src={stars.src} alt="繁星点点的夜空。" />
```
Astro 组件（例如 `<Image />`、`<Picture />`、SVG 组件）在 UI 框架组件中不可用，因为[客户端岛必须只包含其自身框架的有效代码](../../../zh-cn/guides/framework-components/index.md#我可以在我的框架组件中使用-astro-组件吗)。

但是，你可以将这些组件生成的静态内容[作为子项](../../../zh-cn/guides/framework-components/index.md#向框架组件传递子组件)传递给 `.astro` 文件内的框架组件，或使用[命名的 `<slot/>`](../../../zh-cn/guides/framework-components/index.md#我可以在我的框架组件中使用-astro-组件吗)：

src/components/ImageWrapper.astro

```jsx
---import ReactComponent from './ReactComponent.jsx';import { Image } from 'astro:assets';import stars from '~/stars/docline.png';---
<ReactComponent>  <Image src={stars} alt="繁星点点的夜空。" /></ReactComponent>
```
## 用于图像的 Astro 组件

[Section titled “用于图像的 Astro 组件”](#用于图像的-astro-组件)

Astro 提供了两个内置的 Astro 图像组件（`<Image />` 和 `<Picture />`），还允许你导入 SVG 文件并将其用作 Astro 组件。这些组件可以在任何可以导入和渲染 `.astro` 组件的文件中使用。

### <Image />

[Section titled “<Image />”](#image-)

使用内置的 `<Image />` Astro 组件显示以下内容的优化版本：
- 位于 `src/` 文件夹中的本地图像
- 来自授权来源的[配置的远程图像](#%E6%8E%88%E6%9D%83%E8%BF%9C%E7%A8%8B%E5%9B%BE%E5%83%8F)

`<Image />` 可以转换本地或授权的远程图像的尺寸、文件类型和质量，以便控制显示的图像。对于预渲染页面来说，这种转换发生在构建时。当你的页面按需渲染时，这种转换将在查看页面时动态发生。生成的 `<img>` 标签包括 `alt`、`loading` 和 `decoding` 属性，并推断图像尺寸以避免累积布局偏移（CLS）。

[累积布局偏移 \(CLS\)](https://web.dev/cls/) 是一个核心 Web 指标，用于衡量页面加载期间内容移动的程度。`<Image />` 组件通过自动为你的图像设置正确的 `width` 和 `height` 来优化 CLS。

src/components/MyComponent.astro

```jsx
---// 导入 Image 组件和图像import { Image } from 'astro:assets';import myImage from '../assets/my_image.png'; // 图像是 1600x900---
<!-- `alt` 在 Image 组件上是必需的 --><Image src={myImage} alt="我的图像描述。" />
```
```html
<!-- 预渲染输出 --><!-- 图像已优化，强制执行适当的属性 --><img  src="/_astro/my_image.hash.webp"  width="1600"  height="900"  decoding="async"  loading="lazy"  alt="我的图像描述。"/>
<!-- 按需渲染输出--><!-- src 将使用按需生成的端点--><img  src="/_image?href=%2F_astro%2Fmy_image.hash.webp&amp;w=1600&amp;h=900&amp;f=webp"  <!-- ... -->/>
```
`<Image />` 组件接受[多个组件属性](../../../zh-cn/reference/modules/astro-assets/index.md#image-)以及 HTML `<img>` 标签接受的任何属性。

以下示例为图像组件提供了一个 `class`，该 `class` 将应用于最终的 `<img>` 元素。

src/pages/index.astro

```jsx
---import { Image } from 'astro:assets';import myImage from '../assets/my_image.png';---
<!-- `alt` 在 Image 组件上是必需的 --><Image src={myImage} alt="" class="my-class" />
```
```html
<!-- 预渲染输出 --><img  src="/_astro/my_image.hash.webp"  width="1600"  height="900"  decoding="async"  loading="lazy"  class="my-class"  alt=""/>
```
你还可以对 `public/` 文件夹中的图像或未在项目中特别配置的远程图像使用 `<Image />` 组件，即使这些图像不会被优化或处理。其生成的图像与使用 HTML `<img>` 相同。

但是，对所有图像使用 Image 组件可以提供连贯的创作体验，并且即使对于未优化的图像也可以防止累积布局偏移 \(CLS\)。

### <Picture />

[Section titled “<Picture />”](#picture-)

**添加于：**
`astro@3.3.0`

使用内置的 `<Picture />` Astro 组件生成一个带有多种格式和尺寸图像的 `<picture>` 标签。这允许你指定首选的文件格式来显示，同时提供一个备用格式。就像 [`<Image />` 组件](#image-)一样，对于预渲染页面来说，图像将在构建时处理。当你的页面按需渲染时，处理将在查看页面时动态发生。

以下示例使用 `<Picture />` 组件将本地 `.png` 文件转换为网络友好的 `avif` 和 `webp` 格式，以及在需要时可以作为备用显示的 `.png` `<img>`：

```jsx
---import { Picture } from 'astro:assets';import myImage from '../assets/my_image.png'; // 图像是 1600x900---
<!-- `alt` 在 Picture 组件上是必需的 --><Picture src={myImage} formats={['avif', 'webp']} alt="我的图像描述。" />
```
```html
<!-- 预渲染输出 --><picture>  <source srcset="/_astro/my_image.hash.avif" type="image/avif" />  <source srcset="/_astro/my_image.hash.webp" type="image/webp" />  <img    src="/_astro/my_image.hash.png"    width="1600"    height="900"    decoding="async"    loading="lazy"    alt="我的图像描述。"  /></picture>
```
有关 [`<Picture />` 组件属性](../../../zh-cn/reference/modules/astro-assets/index.md#picture-) 的详细信息，请参阅 `astro:assets` 参考。

### 响应式图像行为

**添加于：**
`astro@5.10.0`

响应式图像是为在不同设备上提高性能而调整的图像。这些图像可以调整大小以适应其容器，并且可以根据访问者的屏幕尺寸和分辨率以不同的大小提供。

通过将[响应式图像属性](../../../zh-cn/reference/modules/astro-assets/index.md#响应式图片属性)应用于 `<Image />` 或 `<Picture />` 组件，Astro 将自动为你的图像生成所需的 `srcset` 和 `sizes` 值，并应用必要的[样式以确保它们正确调整大小](#%E5%93%8D%E5%BA%94%E5%BC%8F%E5%9B%BE%E5%83%8F%E6%A0%B7%E5%BC%8F)。

当此响应式行为 [使用 `image.layout` 来进行全局配置](../../../zh-cn/reference/configuration-reference/index.md#imagelayout) 时，它将应用于所有图像组件，以及使用 ` 语法](../../../zh-cn/guides/images/index.html#markdown-文件中的图像) 的任何本地和远程图像。

`public/` 文件夹中的图像永远不会被优化，并且不支持响应式图像。

单个响应式图像将生成多个不同大小的图像，以便浏览器可以向你的访问者显示最佳的一个。

对于预渲染页面，这发生在构建期间，可能会增加项目的构建时间，特别是如果你有大量图像。

对于按需渲染的页面，图像在访问页面时按需生成。这对构建时间没有影响，但可能会增加显示图像时执行的图像转换次数。根据你的图像服务，这可能会产生额外费用。

在 [MDN Web 文档上阅读有关响应式图像的更多信息](https://developer.mozilla.org/zh-CN/docs/Web/HTML/Guides/Responsive_images)。

#### 响应式图像的生成 HTML 输出

[Section titled “响应式图像的生成 HTML 输出”](#响应式图像的生成-html-输出)

当设置布局时，无论是默认设置还是在单个组件上设置，图像都会根据图像的尺寸和布局类型自动生成 `srcset` 和 `sizes` 属性。具有 `constrained` 和 `full-width` 布局的图像将应用样式以确保它们根据其容器调整大小。

```jsx
---import { Image } from 'astro:assets';import myImage from '../assets/my_image.png';---<Image src={myImage} alt="我的图像描述。" layout='constrained' width={800} height={600} />
```
此 `<Image />` 组件将在预渲染页面上生成以下 HTML 输出：

```bash
<img  src="/_astro/my_image.hash3.webp"  srcset="/_astro/my_image.hash1.webp 640w,      /_astro/my_image.hash2.webp 750w,      /_astro/my_image.hash3.webp 800w,      /_astro/my_image.hash4.webp 828w,      /_astro/my_image.hash5.webp 1080w,      /_astro/my_image.hash6.webp 1280w,      /_astro/my_image.hash7.webp 1600w"  alt="我的图像描述"  sizes="(min-width: 800px) 800px, 100vw"  loading="lazy"  decoding="async"  fetchpriority="auto"  width="800"  height="600"  style="--fit: cover; --pos: center;"  data-astro-image="constrained">
```
#### 响应式图像样式

设置 [`image.responsiveStyles: true`](../../../zh-cn/reference/configuration-reference/index.md#imageresponsivestyles) 会应用少量全局样式，以确保你的图像正确调整大小。在大多数情况下，你会希望默认启用这些样式；没有其他样式，你的图像将不会是响应式的。

但是，如果你更喜欢自己处理响应式图像样式，或者需要[在使用 Tailwind 4 时覆盖这些默认值](#%E4%BD%BF%E7%94%A8-tailwind-4-%E7%9A%84%E5%93%8D%E5%BA%94%E5%BC%8F%E5%9B%BE%E5%83%8F)，请将默认的 `false` 值保持配置。

Astro 应用的全局样式将取决于布局类型，旨在为生成的 `srcset` 和 `sizes` 属性产生最佳结果。这些是默认样式：

响应式图像样式

```
:where([data-astro-image]) {  object-fit: var(--fit);  object-position: var(--pos);}:where([data-astro-image='full-width']) {  width: 100%;}:where([data-astro-image='constrained']) {  max-width: 100%;}
```
这些样式使用 [`:where()` 伪类](https://developer.mozilla.org/zh-CN/docs/Web/CSS/:where)，其[优先级](https://developer.mozilla.org/zh-CN/docs/Web/CSS/CSS_cascade/Specificity)为 0，这意味着很容易用你自己的样式覆盖它。任何 CSS 选择器的优先级都将高于 `:where()`，因此你可以通过添加自己的样式来轻松覆盖这些样式以定位图像。

你可以通过在 `<Image />` 或 `<Picture />` 组件上设置 `fit` 和 `position` 属性来逐个覆盖 `object-fit` 和 `object-position` 样式。

#### 使用 Tailwind 4 的响应式图像

[Section titled “使用 Tailwind 4 的响应式图像”](#使用-tailwind-4-的响应式图像)

Tailwind 4 与 Astro 的默认响应式样式兼容。但是，Tailwind 使用[级联层](https://developer.mozilla.org/zh-CN/docs/Web/CSS/@layer)，这意味着其规则的特异性总是低于不使用层的规则，包括 Astro 的响应式样式。因此，Astro 的样式将优先于 Tailwind 的样式。要使用 Tailwind 规则而不是 Astro 的默认样式，请不要启用 [Astro 的默认响应式样式](../../../zh-cn/reference/configuration-reference/index.md#imageresponsivestyles)。

**添加于：**
`astro@5.7.0`

Astro 允许你导入 SVG 文件并将其用作 Astro 组件。Astro 会将 SVG 内容内联到你的 HTML 输出中。

引用任何本地 `.svg` 文件的默认导入。由于此导入被视为 Astro 组件，因此你必须使用与[使用动态标签](../../../zh-cn/reference/astro-syntax/index.md#动态标签)时相同的约定（例如大写）。

src/components/MyAstroComponent.astro

```jsx
---import Logo from './path/to/svg/file.svg';---
<Logo />
```
你的 SVG 组件，就像 `<Image />` 或任何其他 Astro 组件一样，在 UI 框架组件中不可用，但可以[在 `.astro` 组件中传递给框架组件](#ui-%E6%A1%86%E6%9E%B6%E7%BB%84%E4%BB%B6%E4%B8%AD%E7%9A%84%E5%9B%BE%E5%83%8F)。

#### SVG 组件属性

[Section titled “SVG 组件属性”](#svg-组件属性)

你可以传递诸如 `width`、`height`、`fill`、`stroke` 等属性，以及[原生 `<svg>` 元素](https://developer.mozilla.org/zh-CN/docs/Web/SVG/Element/svg)接受的任何其他属性。这些属性将自动应用于底层的 `<svg>` 元素。如果原始 `.svg` 文件中存在某个属性，并且该属性被传递给组件，则传递给组件的值将覆盖原始值。

```jsx
---import Logo from '../assets/logo.svg';---
<Logo width={64} height={64} fill="currentColor" />
```
#### SvgComponent 类型

[Section titled “SvgComponent 类型”](#svgcomponent-类型)

**添加于：**
`astro@5.14.0`

你也可以使用 `SvgComponent` 类型对 `.svg` 资源强制实施类型安全：

src/components/Logo.astro

```typescript
---import type { SvgComponent } from "astro/types";import HomeIcon from './Home.svg'
interface Link {  url: string  text: string  icon: SvgComponent}
const links: Link[] = [  {    url: '/',    text: 'Home',    icon: HomeIcon  }]---
```
### 创建自定义图像组件

[Section titled “创建自定义图像组件”](#创建自定义图像组件)

你可以通过将 `<Image />` 或 `<Picture/>` 组件包装在另一个 Astro 组件中来创建自定义、可重用的图像组件。这允许你只设置一次默认属性和样式。

例如，你可以为你的博客文章图像创建一个组件，该组件接收属性作为 props 并对每个图像应用一致的样式：

src/components/BlogPostImage.astro

```jsx
---import { Image } from 'astro:assets';
const { src, ...attrs } = Astro.props;---<Image src={src} {...attrs} />
<style>  img {    margin-block: 2.5rem;    border-radius: 0.75rem;  }</style>
```
## 使用 HTML <img> 标签显示未处理的图像

[Section titled “使用 HTML <img> 标签显示未处理的图像”](#使用-html-img-标签显示未处理的图像)

[Astro 模板语法](../../../zh-cn/reference/astro-syntax/index.md) 还支持直接编写 `<img>` 标签，并完全控制其最终输出。这些图像将不会被处理和优化。它接受所有 HTML `<img>` 标签属性，唯一必需的属性是 `src`。但是，强烈建议包含[`alt` 属性以实现可访问性](#alt-%E6%96%87%E6%9C%AC)。

### src/ 中的图像

[Section titled “src/ 中的图像”](#src-中的图像)

本地图像必须从现有 `.astro` 文件的相对路径导入，或者你可以配置和使用[导入别名](../../../zh-cn/guides/imports/index.md#别名)。然后，你可以访问图像的 `src` 和其他属性以在 `<img>` 标签中使用。

导入的图像资源需符合 [`ImageMetadata` 类型](../../../zh-cn/reference/modules/astro-assets/index.md#imagemetadata-1)，并有以下签名：

```typescript
interface ImageMetadata {  src: string;  width: number;  height: number;  format: string;}
```
以下示例使用图像自身的 `height` 和 `width` 属性来避免累积布局偏移 \(CLS\) 并改进核心 Web 指标：

src/pages/posts/post-1.astro

```jsx
---// 导入本地图像import myDog from '../../images/pets/local-dog.jpg';---// 访问图像属性<img src={myDog.src} width={myDog.width} height={myDog.height} alt="一只狂吠的狗。" />
```
[Section titled “public/ 中的图像”](#public-中的图像)

对于位于 `public/` 中的图像，请使用图像相对于 public 文件夹的文件路径作为 `src` 值：

```html
<img src="/images/public-cat.jpg" alt="一只睡觉的猫。" >
```
### 远程图像

[Section titled “远程图像”](#远程图像-1)

对于远程图像，请使用图像的完整 URL 作为 `src` 值：

```html
<img src="https://example.com/remote-cat.jpg" alt="一只睡觉的猫。" >
```
### 选择 <Image /> 还是 <img>

[Section titled “选择 <Image /> 还是 <img>”](#选择-image--还是-img)

`<Image />` 组件会优化你的图像，并根据原始宽高比推断宽度和高度（对于它可以处理的图像），以避免 CLS。这是尽可能在 `.astro` 文件中使用图像的首选方式。

当你不能使用 `<Image />` 组件时，请使用 HTML `<img>` 元素，例如：
- 不支持的图像格式
- 当你不想让 Astro 优化你的图像时
- 为了在客户端动态访问和更改 `src` 属性

## 使用 CMS 或 CDN 中的图像

[Section titled “使用 CMS 或 CDN 中的图像”](#使用-cms-或-cdn-中的图像)

图像 CDN 与[所有 Astro 图像选项](#astro-%E6%96%87%E4%BB%B6%E4%B8%AD%E7%9A%84%E5%9B%BE%E5%83%8F)兼容。在 `<Image />` 组件、`<img>` 标签或 Markdown 语法中，使用图像的完整 URL 作为 `src` 属性。对于远程图像的图像优化，还需要[配置你的授权域或 URL 模式](#%E6%8E%88%E6%9D%83%E8%BF%9C%E7%A8%8B%E5%9B%BE%E5%83%8F)。

或者，CDN 可以提供自己的 SDK，以便更轻松地集成到 Astro 项目中。例如，Cloudinary 支持 [Astro SDK](https://astro.cloudinary.dev/)，它允许你轻松地使用其 `CldImage` 组件来放入图像；又或者是 [Node.js SDK](https://cloudinary.com/documentation/node_integration)，它可以生成 URL 以与 Node.js 环境中的 `<img>` 标签一起使用。

## 授权远程图像

你可以使用 [`image.domains`](../../../zh-cn/reference/configuration-reference/index.md#imagedomains) 和 [`image.remotePatterns`](../../../zh-cn/reference/configuration-reference/index.md#imageremotepatterns) 配置授权图像源 URL 域和模式列表，以进行图像优化。这个配置是一个额外的安全层，用于在显示来自外部源的图像时保护你的站点。

例如，以下配置将只允许来自 `astro.build` 的远程图像进行优化：

astro.config.mjs

```jsx
export default defineConfig({  image: {    domains: ["astro.build"],  }});
```
以下配置将只允许来自 HTTPS 主机的远程图像：

```jsx
export default defineConfig({  image: {    remotePatterns: [{ protocol: "https" }],  }});
```
## 内容集合中的图像

你可以在 frontmatter 中为内容集合条目声明一个关联图像，例如博客文章的封面图像，使用其相对于当前文件夹的路径：

src/content/blog/my-post.md

```
---title: "我的第一篇博客文章"cover: "./firstpostcover.jpeg" # 将解析为 "src/content/blog/firstblogcover.jpeg"coverAlt: "一张山脉后面的日落照片。"---
这是一篇博客文章
```
内容集合 schema 中的 `image` 助手允许你验证并导入图像。

src/content.config.ts

```jsx
import { defineCollection } from "astro:content";import { z } from "astro/zod";
const blogCollection = defineCollection({  schema: ({ image }) => z.object({    title: z.string(),    cover: image(),    coverAlt: z.string(),  }),});
export const collections = {  blog: blogCollection,};
```
图像将被导入并转换为元数据，允许你将其作为 `src` 传递给 `<Image/>`、`<img>` 或 `getImage()`。

下面的示例显示了一个博客索引页面，该页面从上面的模式中呈现了每篇博客文章的封面照片和标题：

src/pages/blog.astro

```jsx
---import { Image } from "astro:assets";import { getCollection } from "astro:content";const allBlogPosts = await getCollection("blog");---
{  allBlogPosts.map((post) => (    <div>      <Image src={post.data.cover} alt={post.data.coverAlt} />      <h2>        <a href={"/blog/" + post.slug}>{post.data.title}</a>      </h2>    </div>  ))}
```
 \)\)\}">

## 使用 getImage() 生成图像

[Section titled “使用 getImage\(\) 生成图像”](#使用-getimage-生成图像)

`getImage()` 函数旨在生成要在其他地方使用的图像，而不是直接在 HTML 中使用，例如在 [API 路由](../../../zh-cn/guides/endpoints/index.md#服务器端点api-路由) 中。当你需要 `<Picture>` 和 `<Image>` 组件当前不支持的选项时，你可以使用 `getImage()` 函数创建你自己的自定义 `<Image />` 组件。

请参阅 [`getImage()` 参考](../../../zh-cn/reference/modules/astro-assets/index.md#getimage) 以了解更多信息。

**相关操作指南：**
[构建自定义图像组件](../../../zh-cn/recipes/build-custom-img-component/index.md)

[Section titled “Alt 文本”](#alt-文本)

不是所有用户都能以相同的方式看到图像，因此在使用图像时，无障碍性尤为重要。使用 `alt` 属性为图像提供 [描述性的 alt 文本](https://www.w3.org/WAI/tutorials/images/)。

这个属性对于 `<Image />` 和 `<Picture />` 组件都是必需的。如果没有提供 alt 文本，将提供一个有用的错误消息，提醒你包含 `alt` 属性。

如果图像仅仅是装饰性的（即不会对页面的理解有所贡献），请设置 `alt=""` 以便屏幕阅读器知道忽略该图像。

## 默认图像服务

[Sharp](https://github.com/lovell/sharp) 是 `astro:assets` 使用的默认图像服务。你可以使用 [`image.service`](../../../zh-cn/reference/configuration-reference/index.md#imageservice) 选项进一步配置图像服务。

当使用像 `pnpm` 这样的[严格包管理器](https://pnpm.io/pnpm-vs-npm#npms-flat-tree)时，即使 Sharp 已经是 Astro 的依赖项，你也可能需要手动安装 Sharp 到你的项目中：

终端窗口

```
pnpm add sharp
```
### 配置 no-op 透传服务

[Section titled “配置 no-op 透传服务”](#配置-no-op-透传服务)

如果你的 [适配器](https://astro.build/integrations/?search=&categories%5B%5D=adapters) 不支持 Astro 内置的 Sharp 图片优化（如 Deno、Cloudflare），你可以配置一个 no-op 图像服务来使你可以使用 `<Image />` 和 `<Picture />` 组件。注意 Astro 在这些环境中不会执行任何图像转换和处理。不过你依旧可以享受使用 `astro:assets` 的其他好处，比如没有累积布局移位（CLS）、强制执行的 `alt` 属性和一致的创作体验。

配置 `passthroughImageService()` 来避免 Sharp 图像处理：

```jsx
import { defineConfig, passthroughImageService } from 'astro/config';
export default defineConfig({  image: {    service: passthroughImageService()  }});
```
## 资源缓存

在站点构建期间，Astro 将本地和 [来自授权来源的远程图像](#%E6%8E%88%E6%9D%83%E8%BF%9C%E7%A8%8B%E5%9B%BE%E5%83%8F) 的已处理的图像资源存储在缓存目录中。通过在构建之间保留缓存目录，可以复用已处理的资源，从而缩短构建时间并减少带宽使用。

默认缓存目录是 `./node_modules/.astro`，但是可以使用 [`cacheDir`](../../../zh-cn/reference/configuration-reference/index.md#cachedir) 配置设置来更改它。

### 远程图像

[Section titled “远程图像”](#远程图像-2)

资源缓存中的远程图像基于 [HTTP 缓存](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Caching) 进行管理，并遵循 [Cache-Control 标头](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Headers/Cache-Control) 由远程服务器返回。
如果 Cache-Control 标头允许，图像将被缓存，并且将被使用，直到它们不再 [fresh](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Caching#%E5%9F%BA%E4%BA%8E_age_%E7%9A%84%E7%BC%93%E5%AD%98%E7%AD%96%E7%95%A5)。

#### 重新验证

**添加于：**
`astro@5.1.0`

[重新验证](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Caching#%E9%AA%8C%E8%AF%81%E5%93%8D%E5%BA%94) 通过检查远程服务器之前缓存的过期图像是否有效来减少带宽使用和构建时间。如果服务器指示图像仍然是有效（fresh）的，则重新使用缓存的版本，否则重新下载图像。

重新验证要求远程服务器发送 [Last-Modified](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Headers/Last-Modified) 和/或 [Etag（实体标签）](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Headers/ETag) 标头及其响应。此功能适用于支持 [If-Modified-Since](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Headers/If-Modified-Since) 和 [If-None-Match](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Headers/If-None-Match) 标头的远程服务器。

## 社区集成

这里有几个第三方 [社区图像集成](https://astro.build/integrations?search=images)，用于优化和处理 Astro 项目中的图像。

Learn

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
