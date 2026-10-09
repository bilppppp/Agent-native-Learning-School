# Agent-native Learning School

本项目可以根据给定的学习材料与学习目标，生成独立的互动学习网站（School）。课程深度影响涉及的知识范围、理解深度与学习路线，教学模式决定互动节奏。网站负责维护学生身份和进度；Pi 是当前的默认生成与教学入口，但课程与进度协议与具体 Harness 解耦，具备文件读写、终端和 HTTP 访问能力的 Coding Agent 也可以直接生成课程或担任教师。

## 交给你的 Coding Agent

最省心的方式是直接使用自然语言：把下面任意一段提示词发给支持终端工具的 Coding Agent，无需提前学习 CLI 命令、无需手写配置文件，也不必安装特定 Skill。Agent 会自动定位项目、检查环境、调用现有工具并启动网站。启动后，你在网页中领取学习身份，把关卡提供的启动 Prompt 发给兼容教学协议的 Agent 即可开始互动。

### 首次使用：让 Agent 克隆项目

复制下面的指令，按需替换学习来源、目标和偏好：

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

将 `<本地仓库绝对路径>` 替换成你的路径（含空格的路径也可），然后复制：

```text
请使用本地仓库 <本地仓库绝对路径> 中的 Agent-native Learning School，先阅读 README.md、AGENT_GUIDE.md 和 AGENTS.md。
利用现有工具为 https://arxiv.org/abs/1706.03762 创建并启动一所新的独立 School，不要覆盖已有 School。
我的目标是理解 Transformer 架构和 Attention 的关键计算。我已熟悉基础神经网络，希望深入理解组件关系、公式推导与简单数值实验；教学先用沉浸模式，允许中途调整节奏。
完成后给我实际可访问的网站地址、可编辑的课程位置，以及在我使用的 Agent 中开始学习和恢复进度的步骤。未指定的设置使用项目默认值。
```

学习来源支持 GitHub 仓库、公开网页/文档、论文 PDF 以及本地文件或目录。你可以直接在提示词中说明想学的深度和已有基础。课程深度决定知识范围、理解深度与学习路线，教学模式（Simple / Immersive）调节交互节奏，学习过程中可以随时切换。如果由当前 Coding Agent 直接按协议生成课程，不需要安装 Pi；如果使用默认的一键 CLI 创建或运行 `teach`，则会调用 Pi。

供 Agent 阅读的详细执行指引见 [AGENT_GUIDE.md](AGENT_GUIDE.md)；维护或修改仓库代码请参考 [AGENTS.md](AGENTS.md)。如果你习惯在终端中直接操作，也可以参考下面的 CLI 用法。

## CLI：准备与创建

环境要求：Node.js 22.12+（开发测试使用的是 24.16）、Python 3、Git、curl，以及可调用的 Coding Agent。若使用默认 CLI 自动生成，需要本地安装并配置好模型的 Pi；若由 Agent 直接读取协议生成，则无需安装 Pi。首次使用前先初始化：

```sh
npm run school -- setup
# PDF 需要 pypdf；可在自己的 Python 环境安装
python3 -m pip install pypdf
```

默认 Pi 自动生成入口（直接传入自然语言描述，无需手写配置文件）：

```sh
npm run school -- create "学习 https://github.com/sindresorhus/p-limit，目标是理解并发限制和核心实现。我熟悉 Promise，希望深入源码，教学先用简单模式"
```

也可以直接传入明确参数，跳过模型对自然语言请求的解析：

```sh
npm run school -- create --source https://github.com/sindresorhus/p-limit \
  --goal "理解异步并发限制，并能正确使用 p-limit" --name my-school \
  --depth 深入 --background "熟悉 JavaScript 和 Promise" --mode simple
npm run school -- start my-school
```

如果不依赖 Pi，可以让当前 Coding Agent 将自然语言请求映射为上述参数，并加上 `--prepare-only`：

```sh
npm run school -- create --source "来源 URL 或本地绝对路径" \
  --goal "学习目标" --name my-school --depth 深入 --mode simple --prepare-only
# 当前 Agent 阅读 schools/my-school/GENERATION.md，读取来源并写入课程
npm run school -- finish my-school
npm run school -- start my-school
```

`GENERATION.md` 将通用生成协议与用户的具体输入组装在一起，并非另一套提示词。`--prepare-only` 负责拉取材料并搭建网站骨架，之后的课程正文需要 Agent 实际读取材料并撰写；写完后执行 `finish` 进行校验并完成构建。整个过程无需用户手动编写输入 JSON。

`--source` 可重复传入，支持 GitHub 仓库、HTTP(S) 网页或文档、论文以及本地文件/目录。`--ref` 用于指定 Git 仓库的分支或 Tag；默认会记录当前解析出的具体 commit。对于 HTML、PDF、DOCX 等文件，工具会保存原始文件并提取纯文本供模型阅读，普通纯文本则直接读取。默认配置为：系统深度、基础未知（教学中按需了解）、中文课程、简单（Simple）教学模式。`--depth`、`--background`、`--style` 均支持自然语言自由描述；`--language`、`--port`、`--model` 为可选参数。若在终端执行 `create` 且未提供参数，会以交互形式询问来源与目标。默认 Pi 路径使用的模型定义在 `scripts/pi.mjs` 中，可以通过环境变量 `SCHOOL_MODEL` 或 `--model` 切换为已配置的其他模型。如果由外部 Agent 直接生成，则使用该 Agent 自带的模型，这些 Pi 参数不会影响外部 Agent。

生成过程通常需要数分钟。生成器会保存原始输入、材料、生成的 Markdown 课程文件以及模型的运行记录，并在生成结束后构建网站。如果遇到错误会直接报错退出，不会覆盖已存在的同名 School。若生成中断或失败，可在检查错误信息和保留的文件后，通过 `npm run school -- retry NAME` 重新尝试；需要注意 `retry` 会重新生成课程，并非无损断点续写。对于已有学习进度的课程，建议直接手动调整文件，以保持各关卡 `slug` 的稳定。

## 开始学习

1. 打开 `start` 命令输出的本地网址，选择教学模式（Simple / Immersive），点击 Enroll 领取学习身份。
2. 进入具体关卡，复制页面上的启动 Prompt 交给你的教师 Agent。如果使用 Pi，可直接粘贴进会话，或运行 `npm run school -- teach NAME --student 网页身份`；如果使用其他 Agent 或 Harness，无需加载 Pi 适配文件，运行 `npm run school -- teach NAME --student 网页身份 --prompt-only` 即可生成通用续学提示词。
3. 按照提示与教师展开问答、推演或动手实验。如果在网页上切换了教学模式，教师在下一轮对话时会自动读取最新设置；你也可以在对话中直接让教师放慢节奏或展开推导，无需重新生成课程。
4. 完成关卡活动后，教师 Agent 会调用本地进度 API，网页会自动记录完成并可继续下一关。开启新的对话时，带上相同的学生身份即可继续上一次的进度。

说明：这里的“关卡完成”代表你参与了当关的教学互动并获得了反馈，并非正式考试。教学模式只改变互动节奏与提问方式，不会删减深入课程中的知识点。网页中的学生身份是本地轻量标识，没有账号安全或权限系统。

## 编辑、运行与迁移

课程与网站文件结构如下：

- `schools/NAME/COURSE.md`：记录课程路线规划、材料来源与深度取舍。
- `src/content/lessons/*.md`：包含各关卡的完整正文与教学指引。
- `public/sources/` 与 `public/activities/`：分别存放供 HTTP 读取的原始参考材料，以及标记为模型生成的实验/练习代码。
- `school.settings.json`：保存创建时的配置与默认模式。

修改课程后，开发服务会自动刷新。若需要调整关卡顺序，修改 frontmatter 中的 `order` 即可，建议不要修改已有进度关卡的 `slug`。

构建时，请先停止该 School 的开发服务，再运行 `npm run school -- build NAME`（同一 School 不应同时执行开发与构建）。每所 School 拥有独立的缓存目录以及位于 `.wrangler/` 的本地进度数据库，迁移或备份时请保留 `.wrangler/`。如果遇到端口冲突，可以通过 `start NAME --port 新端口` 指定端口，网站内的所有 API 和提示词链接会自动适配新地址。

如需脱离本仓库独立运行某所 School：将对应的 `schools/NAME` 目录完整复制出去，移除指向本项目模板依赖的 `node_modules` 链接，在该目录下执行 `npm ci` 与 `npm run dev` 即可。各 School 均内置了完整的源码与依赖锁定文件，无需依赖根目录脚本。当前所有测试与验证均在本地环境完成，尚未进行公网部署验证。

教学协议要求教师 Agent 能够读取 HTTP 内容、调用 REST API、保持多轮上下文，并遵循站点 `/llms.txt` 约定的教学规则。课程与参考材料通过关卡 API 及 `/sources/` 访问，学习进度由进度 API 维护（接口定义见 `/api/openapi.json`）。只有使用 Pi 时才需要读取 `/harness/pi.txt` 里的专用工具说明；其他教师 Harness 无需遵循 Pi 的工具命名或交互格式。关于不同 Harness 的验证情况与已知边界，可参考 [HARNESS-VALIDATION.md](HARNESS-VALIDATION.md)。

## 参考与致谢

本项目参考或复用了以下开源项目：

- [School Template](https://github.com/agentschools/school-template)：网站模板的直接来源。本项目派生自该模板，复用了课程页面、学生 Profile、课程获取以及基于本地 KV 的进度接口，并在 `scripts/school.mjs` 的 `setup` 中固定了特定版本。
- [Pi School](https://github.com/agentschools/pi-school)：学习体验的主要参考，包括对话授课、问题引导以及网站与进度配合的交互方式。本项目网站代码派生自 School Template，而非 Pi School。
- [OpenCode School](https://github.com/agentschools/opencode.school)：早期 Agent 学习网站参考；School Template 上游文档注明其架构源自该项目。
- [Pi](https://github.com/badlogic/pi-mono)（现重定向至 [earendil-works/pi](https://github.com/earendil-works/pi)）：当前默认的生成与教学 Harness。本项目课程与教学协议保持 Harness 中立，Pi 不是唯一教师，也不是必须安装的依赖。
- 此外，项目在课程化组织与材料整理思路上，参考了 [codebase-to-course](https://github.com/zarazhangrui/codebase-to-course)（将代码库组织为课程的 Claude Code Skill）、[Repo2NotebookLM](https://github.com/bilppppp/Repo2NotebookLM)（仓库材料提取）以及 [archify](https://github.com/tt-a1i/archify)（交互图解释代码与概念）。这些项目仅作为方向参考，未作为运行依赖集成。
