# Agent-native Learning School

把学习材料和学习目标做成一所独立网站（School）。网站发给学生一串身份并记住进度；关卡上的提示词交给 Coding Agent，就可以按课程讲解、问答和练习，下次用同一身份接着学。课程深度决定学什么，教学模式决定互动节奏。Pi 是默认的生成和教学入口；具备文件读写、终端和 HTTP 访问能力的 Coding Agent 也可以建校或授课。各 Harness 的验证范围见 [HARNESS-VALIDATION.md](HARNESS-VALIDATION.md)。

七年级数学可以在 [https://math.gravityai.top](https://math.gravityai.top) 直接试用：不用注册，打开后领取一串「形容词-名词-四位数字」的身份，复制页面上的提示词即可学习。进度写在服务器上。这个地址是自定义域名；`*.vercel.app` 在中国大陆可能打不开。

## 核心能力

- **材料直接变成课程网站。** 来源可以是 GitHub 仓库、公开网页或文档、论文 PDF，以及本地文件或目录。深度、已有基础和学习偏好可以用自然语言说明。
- **用 Agent 创建，也用 Agent 上课。** 把下面的提示词交给支持终端工具的 Coding Agent 即可。当前 Agent 按协议写课程时不必安装 Pi；默认 CLI 的自动生成和 `teach` 会调用 Pi。
- **进度留在网站上。** 完成当关互动后，教师通过进度 API 记下进度。教学模式可以在网页或对话里切换，不必重新生成课程。关卡完成表示参与了当关互动并得到反馈。学生身份是轻量标识，没有账号和权限系统。
- **文档站可以一次取多页。** HTTP(S) HTML 文档会自动判断是否抓取，默认跟随同站链接，最多 500 页。写入课程的仍是生成时选中的页面。数学公式会在关卡页面中排版显示。
- **同一份学校目录可以三处运行：** 本机、自有服务器、Vercel。

## 快速开始

复制下面任意一段，发给支持终端工具的 Coding Agent。无需先记 CLI，也无需手写配置或安装 Skill。Agent 会定位项目、检查环境并启动网站。你在网页领取身份后，把关卡上的启动 Prompt 交给教师 Agent。

### 首次使用：让 Agent 克隆项目

按需替换学习来源、目标和偏好：

```text
请在当前可写工作区克隆 https://github.com/bilppppp/Agent-native-Learning-School.git；如果已有该仓库，请复用它，不要覆盖现有文件。
阅读仓库的 README.md、AGENT_GUIDE.md 和 AGENTS.md，按照现有工具创建并启动一所新的独立 School。
学习来源：https://github.com/facebook/react
学习目标：理解组件为什么会重新渲染，能解释状态更新与父子组件的关系，并用小例子检验理解。
我熟悉 JavaScript，但不熟悉 React 源码。希望从基础直觉逐步深入到相关实现机制；教学先用简单模式，偏好预测与代码观察。
请选择一个未占用的 School 名称，保留已有课程和进度。完成后给我实际可访问的网站地址、课程文件位置，以及在我使用的 Agent 中开始学习和下次续学的方法。
如果缺少运行环境、模型认证或来源不可访问，请明确说明需要我补充什么；不要声称未完成的生成或教学已经成功。
```

### 已克隆：让 Agent 使用本地项目

把 `<本地仓库绝对路径>` 换成你的路径（路径里可以有空格）：

```text
请使用本地仓库 <本地仓库绝对路径> 中的 Agent-native Learning School，先阅读 README.md、AGENT_GUIDE.md 和 AGENTS.md。
利用现有工具为 https://arxiv.org/abs/1706.03762 创建并启动一所新的独立 School，不要覆盖已有 School。
我的目标是理解 Transformer 架构和 Attention 的关键计算。我已熟悉基础神经网络，希望深入理解组件关系、公式推导与简单数值实验；教学先用沉浸模式，允许中途调整节奏。
完成后给我实际可访问的网站地址、可编辑的课程位置，以及在我使用的 Agent 中开始学习和恢复进度的步骤。未指定的设置使用项目默认值。
```

未说明的设置使用默认值：系统深度、基础按需了解、中文、简单（Simple）模式。沉浸（Immersive）模式只改变提问节奏，不删减课程内容。

执行细节见 [AGENT_GUIDE.md](AGENT_GUIDE.md)。修改仓库代码见 [AGENTS.md](AGENTS.md)。

### 打开网站学习

1. 打开启动后的网址，选择 Simple 或 Immersive，领取学习身份。
2. 进入关卡，复制启动 Prompt 交给教师 Agent。使用 Pi 时，可粘贴进会话，或运行 `npm run school -- teach NAME --student 网页身份`。其他 Agent 加 `--prompt-only`，只生成通用提示词。已部署的学校加上 `--origin https://学校地址`（不能与 `--port` 同时使用）。
3. 按提示问答、推演或做实验。在网页上切换模式后，教师下一轮会读到新设置；对话里也可以直接要求放慢或展开推导。
4. 教师上报进度后，网页会记下完成情况。新对话带上同一身份即可续学。

教师需要能读取 HTTP、调用 REST，并遵守站点 `/llms.txt`。课程和材料通过关卡 API 与 `/sources/` 访问，进度接口见 `/api/openapi.json`。只有 Pi 需要阅读 `/harness/pi.txt`。

## CLI

需要 Node.js 22.12+（开发测试使用 24.16）、Python 3、Git、curl。PDF 还需当前 Python 能导入 `pypdf`。

```sh
npm run school -- setup
python3 -m pip install pypdf
```

默认由 Pi 根据自然语言创建并生成课程：

```sh
npm run school -- create "学习 https://github.com/sindresorhus/p-limit，目标是理解并发限制和核心实现。我熟悉 Promise，希望深入源码，教学先用简单模式"
npm run school -- start my-school
```

也可以直接传参数，跳过对自然语言的解析：

```sh
npm run school -- create --source https://github.com/sindresorhus/p-limit \
  --goal "理解异步并发限制，并能正确使用 p-limit" --name my-school \
  --depth 深入 --background "熟悉 JavaScript 和 Promise" --mode simple
```

由当前 Agent 写课程时加上 `--prepare-only`。它只准备材料、网站骨架和 `schools/my-school/GENERATION.md`（通用生成协议加上这次的输入）。Agent 读完材料并写入课程后：

```sh
npm run school -- finish my-school
npm run school -- start my-school
```

`--source` 可重复。`--ref` 指定 Git 分支或 Tag，并记录解析到的 commit。`--depth`、`--background`、`--style` 可用自然语言。`--language`、`--port`、`--model` 可选。不带参数执行 `create` 时，交互终端会询问来源和目标。Pi 模型定义在 `scripts/pi.mjs`，可用环境变量 `SCHOOL_MODEL` 或 `--model` 切换，只影响 Pi 这条路径。

同名 School 已存在时会报错退出，不会覆盖。生成通常需要数分钟。中断后可查看保留的材料再运行 `npm run school -- retry NAME`；`retry` 会重写课程。已有学习进度时，直接改课程文件，并保持关卡 `slug` 不变。

| 命令 | 作用 |
| --- | --- |
| `list` | 列出已有 School |
| `start NAME [--port 端口]` | 本机启动。换端口后，页面中的 API 和提示词会使用新地址 |
| `teach NAME --student 身份` | 用 Pi 授课。可选 `--mode`、`--lesson` |
| `teach ... --prompt-only` | 只输出通用教师提示词 |
| `finish NAME` | 检查 Agent 写的课程并构建 |
| `build NAME` | 构建。先停止该 School 的开发服务；不要同时开发并构建 |
| `supplement NAME` | 补齐已保存的网页文档 |
| `retry NAME` | 用 Pi 重新生成课程 |
| `setup` | 准备模板依赖 |

### 多页文档站

GitHub 仓库、论文、PDF、DOCX、纯文本和本地路径按单份来源准备。HTTP(S) HTML 文档站会自动判断是否抓取，一般不必额外加参数。默认从入口页跟随同一域名下的链接，最多 500 页。没有明确的文档站信号时只保存入口页。导航信号不足，或给出的地址是站点首页时，会提示改用文档区地址或加上 `--crawl`。

- `--crawl` 强制抓取；`--no-crawl` 只保存入口页。二者不能同时使用，也不能把 `--no-crawl` 用于 `supplement`。
- `--crawl-prefix /docs/latest` 把范围限制在该路径。
- `--max-pages` 为 1–10000，默认 500。`--crawl-workers` 为 1–8，默认 2。
- `npm run school -- supplement NAME` 用同样的同站跟随，补齐已保存的 HTTP HTML 来源。仓库克隆和本地文件不动。
- 抓取失败或正文太少时退回入口页，建校继续。未安装抓取工具时会下载到 `tools/cache`（不纳入 Git）。
- 入口页若有 GitHub 编辑或源文件链接，会提示对应仓库。只保存了入口页时，会建议改用该仓库作为 `--source`。

单页来源保留原件和提取文本。多页抓取还会保存各页文本和来源记录，供生成课程时选读。

### 课程文件

- `schools/NAME/COURSE.md`：路线、来源和深度取舍。
- `src/content/lessons/*.md`：关卡正文和教学指引。调整顺序时改 frontmatter 的 `order`。
- `public/sources/`、`public/activities/`：供 HTTP 读取的参考材料、标明身份的派生文本，以及练习代码。
- `school.settings.json`：创建时的配置和默认模式。

开发服务会在课程修改后自动刷新。

## 部署

同一份 `schools/NAME`：

| 位置 | 运行方式 |
| --- | --- |
| 本机 | `npm run school -- start NAME`，使用 `DEPLOY_TARGET=dev`。进度在 `.wrangler/` |
| 自有服务器 | 在学校目录执行 `./script/serve`，使用 `DEPLOY_TARGET=node`。进度在 `.school-data/` |
| Vercel | 项目根目录指向该学校，配置 `DEPLOY_TARGET=vercel` 和 `BLOB_READ_WRITE_TOKEN` |

迁移或备份时保留 `.wrangler/`。环境变量和域名见该学校的 `DEPLOYMENT.md`。

要脱离本仓库运行：复制整个 `schools/NAME`，在该目录执行 `npm ci`。本机用 `npm run dev`，自有服务器用 `./script/serve`。`node_modules` 必须是真实目录。

## 参考与致谢

- [School Template](https://github.com/agentschools/school-template)：网站模板的直接来源。本项目复用其课程页面、学生 Profile、课程获取和基于本地 KV 的进度接口，并在 `scripts/school.mjs` 的 `setup` 中固定了特定版本。
- [Pi School](https://github.com/agentschools/pi-school)：学习体验的主要参考，包括对话授课、问题引导，以及网站与进度的配合。本项目网站代码派生自 School Template。
- [OpenCode School](https://github.com/agentschools/opencode.school)：早期 Agent 学习网站参考。School Template 上游文档注明其架构源自该项目。
- [Pi](https://github.com/badlogic/pi-mono)（现重定向至 [earendil-works/pi](https://github.com/earendil-works/pi)）：默认的生成与教学 Harness。课程与教学协议保持 Harness 中立。
- [siteone-crawler](https://github.com/janreges/siteone-crawler)（MIT）：多页文档站的抓取工具。未安装时从官方 GitHub Release 下载到 `tools/cache`，不作为仓库文件提交。
- 课程化组织还参考了 [codebase-to-course](https://github.com/zarazhangrui/codebase-to-course)、[Repo2NotebookLM](https://github.com/bilppppp/Repo2NotebookLM) 和 [archify](https://github.com/tt-a1i/archify)。这些项目提供了方向，没有作为运行依赖集成。
