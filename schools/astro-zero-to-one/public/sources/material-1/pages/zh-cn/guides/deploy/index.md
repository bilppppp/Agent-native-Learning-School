<!-- source: https://docs.astro.build/zh-cn/guides/deploy/ -->
<!-- retrieved: 2026-10-13; tool: siteone-crawler 2.5.1; prefix: /zh-cn -->

# 部署你的 Astro 站点

**准备好构建并部署你的 Astro 站点了吗？** 按照我们的指南之一来了解不同的部署服务，或者向下滚动以获取有关部署 Astro 站点的一般指南。

## 部署指南

### AWS(../../../zh-cn/guides/deploy/aws/index.html)

SSR 静态
- ![](data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==)

### AWS via Flightcontrol(../../../zh-cn/guides/deploy/aws-via-flightcontrol/index.html)

### AWS via SST(../../../zh-cn/guides/deploy/aws-via-sst/index.html)

### Azion(../../../zh-cn/guides/deploy/azion/index.html)

### Buddy(../../../zh-cn/guides/deploy/buddy/index.html)

静态
- ![](data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==)

### Cleavr(../../../zh-cn/guides/deploy/cleavr/index.html)

### Clever Cloud(../../../zh-cn/guides/deploy/clever-cloud/index.html)

### Cloudflare(../../../zh-cn/guides/deploy/cloudflare/index.html)

### CloudRay(../../../zh-cn/guides/deploy/cloudray/index.html)

### Deno Deploy(../../../zh-cn/guides/deploy/deno/index.html)

### DeployHQ(../../../zh-cn/guides/deploy/deployhq/index.html)

### EdgeOne Pages(../../../zh-cn/guides/deploy/edgeone-pages/index.html)

### Firebase(../../../zh-cn/guides/deploy/firebase/index.html)

### Fleek(../../../zh-cn/guides/deploy/fleek/index.html)

### Fly.io(../../../zh-cn/guides/deploy/flyio/index.html)

### GitHub Pages(../../../zh-cn/guides/deploy/github/index.html)

### GitLab Pages(../../../zh-cn/guides/deploy/gitlab/index.html)

### Google Cloud(../../../zh-cn/guides/deploy/google-cloud/index.html)

### Heroku(../../../zh-cn/guides/deploy/heroku/index.html)

### Hostinger(../../../zh-cn/guides/deploy/hostinger/index.html)

### is\hosting(../../../zh-cn/guides/deploy/ishosting/index.html)

### Microsoft Azure(../../../zh-cn/guides/deploy/microsoft-azure/index.html)

### Netlify(../../../zh-cn/guides/deploy/netlify/index.html)

### Railway(../../../zh-cn/guides/deploy/railway/index.html)

### Render(../../../zh-cn/guides/deploy/render/index.html)

### Seenode(../../../zh-cn/guides/deploy/seenode/index.html)

### Sevalla(../../../zh-cn/guides/deploy/sevalla/index.html)

### Stormkit(../../../zh-cn/guides/deploy/stormkit/index.html)

### Surge(../../../zh-cn/guides/deploy/surge/index.html)

### Vercel(../../../zh-cn/guides/deploy/vercel/index.html)

### Zeabur(../../../zh-cn/guides/deploy/zeabur/index.html)

### Zephyr Cloud(../../../zh-cn/guides/deploy/zephyr/index.html)

### Zerops(../../../zh-cn/guides/deploy/zerops/index.html)

SSR 静态

## 快速部署选项

许多服务商都可以使用网站控制台或 CLI 快速构建并部署 Astro 站点。

### 网站控制台

你可以在服务商中连接 Astro 项目的在线 Git 仓库（如 GitHub、GitLab、Bitbucket）并利用 Git 的持续部署快速部署。

这些服务商会自动检测到你所推送 Astro 项目的源码库，构建站点并将其部署到自定义 URL 或你的个人域名上。通常情况下，在这些平台上设置部署将遵循类似以下的步骤。
1. 将你的仓库添加到在线 Git 提供商（如 GitHub、GitLab、Bitbucket）。
2. 选择支持**持续集成**的服务商（例如 [Netlify](../../../zh-cn/guides/deploy/netlify/index.md) 或 [Vercel](../../../zh-cn/guides/deploy/vercel/index.md)），将你的 Git 仓库作为一个新站点/项目导入。
许多常见服务商会识别你的项目为 Astro 网站，并应选择适当的配置设置来构建和部署你的网站，如下所示。（如果不是，那么这些设置也可以进行修改）
   - **构建命令：** `astro build` 或 `npm run build`。
   - **发布目录：** `dist`。
3. 点击 `Deploy`，你的新网站将在该服务商所提供的唯一链接上创建好了（例如：`new-astro-site.netlify.app`）。

该主服务商会自动监控 Git 供应商上 main 分支的变化，并在每次有新的提交时重建并重新发布你的网站。这些设置通常可以在服务商的供应商控制台上进行配置。

### CLI 部署

[Section titled “CLI 部署”](#cli-部署)

一些服务商有它们自己的命令行界面（CLI），你可以用 npm 在自己的机器上全局安装它们。通常使用 CLI 部署会看起来像下面这样：
1. 全局安装你的服务器 CLI，比如：

   - [npm](#tab-panel-0-0)
   - [pnpm](#tab-panel-0-1)
   - [Yarn](#tab-panel-0-2)

终端窗口
```
npm install --global netlify-cli
```
终端窗口
```
pnpm add --global netlify-cli
```
终端窗口
```
yarn global add netlify-cli
```
2. 运行 CLI 并跟随指引进行验证和设置等操作。
3. 构建站点并部署到服务商
许多服务商会帮你构建和部署站点。它们通常也能识别出你的项目是 Astro 站点，会选择相应的配置设置进行构建和部署，就像下面一样。（如果不是，那么这些设置也可以进行修改）
   - **构建命令：** `astro build` 或 `npm run build`。
   - **发布目录：** `dist`。
其他服务商会要求你在[在本地构建站点](#%E5%9C%A8%E6%9C%AC%E5%9C%B0%E6%9E%84%E5%BB%BA%E7%AB%99%E7%82%B9)并用命令行节目部署。

## 在本地构建站点

许多服务商如 Netlify 和 Vercel 都会构建并将构建输出发布到网上。但是一些站点需要在本地构建并运行部署命令或上传你的构建输出。

你可能也会想要在本地构建并预览你的站点或在自有环境中排查潜在错误和警告。

运行 `npm run build` 命令即可构建 Astro 站点。

- [npm](#tab-panel-1-0)
- [pnpm](#tab-panel-1-1)
- [Yarn](#tab-panel-1-2)

终端窗口

```
npm run build
```
终端窗口

```
pnpm run build
```
终端窗口

```
yarn run build
```
默认情况下，构建输出将会被放在 `dist/`。你可以修改 [`outDir` 配置项](../../../zh-cn/reference/configuration-reference/index.md#outdir)改变存储位置。

## 为按需渲染添加一个适配器

[Section titled “为按需渲染添加一个适配器”](#为按需渲染添加一个适配器)

在使用 [按需渲染](../../../zh-cn/guides/on-demand-rendering/index.md) 部署你的 Astro 站点前，请确保：
- 在项目依赖中安装[合适的适配器](../../../zh-cn/guides/on-demand-rendering/index.md)（手动安装，或者使用适配器的 `astro add` 命令，例如，`npx astro add netlify`）。
- 手动安装时，需要在你的 `astro.config.mjs` 文件导入和默认导出中[加上适配器](../../../zh-cn/reference/configuration-reference/index.md#integrations)。（`astro add` 命令将为你处理此步骤！）

Recipes

| [贡献](../../../zh-cn/contribute/index.md) | [社区](https://astro.build/chat) | [赞助](https://opencollective.com/astrodotbuild) |

---

[跳转到内容](#_top)

[Astro](https://astro.build/)
[Docs](../../../zh-cn/getting-started/index.md)

| [GitHub](https://github.com/withastro/astro) | [Discord](https://astro.build/chat) |

![Scrimba](data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==)

## Learn Astro with James Q Quick

Build your first site with 35 interactive Scrimba lessons

[Get 20% off](https://scrimba.com/intro-to-astro-c00ar0fi5u?via=astro)
