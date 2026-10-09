# Agent-native Learning School

从可访问的材料和学习目标生成一所独立 School。课程深度决定学什么，教学模式决定如何教。网站保存身份与进度；Pi 是默认生成与教学入口；具备读写文件、终端及 HTTP 工具的 Coding Agent 也可以直接生成课程并担任教师，课程与进度格式不依赖 Pi。

## 交给你的 Coding Agent

主要入口是自然语言：把下面任一段交给具备终端工具能力的 Coding Agent。无需安装或注册专用 Skill，也无需先学习 CLI 或手写 JSON。Agent 负责定位项目、准备环境、调用现有生成能力并启动网站；你在网页获取学习身份，把启动 Prompt 交给兼容教学协议的 Agent 学习。

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

来源也可以是文章、文档、本地文件或目录；自然语言可以自由描述深度与基础。课程深度影响内容范围，Simple / Immersive 影响教学节奏，并能在学习时切换。需要可访问材料和具备工具能力、已配置模型的 Agent。当前 Agent 可直接按生成协议创建课程，无需安装 Pi；默认的一键 CLI 创建和 `teach` 启动仍使用 Pi。

给 Agent 的执行流程见 [AGENT_GUIDE.md](AGENT_GUIDE.md)；修改项目实现时遵循 [AGENTS.md](AGENTS.md)。以下保留直接操作 CLI 的完整用法。

## CLI：准备与创建

需要 Node.js 22.12+（本次使用 24.16）、Python 3、Git、curl，以及可用的 Coding Agent。默认自动生成 CLI 另需已配置模型的 Pi；Agent 直接生成路径不需要 Pi。首次执行：

```sh
npm run school -- setup
# PDF 需要 pypdf；可在自己的 Python 环境安装
python3 -m pip install pypdf
```

默认 Pi 自动生成入口（自然语言，无需写 JSON 或课程文件）：

```sh
npm run school -- create "学习 https://github.com/sindresorhus/p-limit，目标是理解并发限制和核心实现。我熟悉 Promise，希望深入源码，教学先用简单模式"
```

也可明确指定，跳过请求解析：

```sh
npm run school -- create --source https://github.com/sindresorhus/p-limit \
  --goal "理解异步并发限制，并能正确使用 p-limit" --name my-school \
  --depth 深入 --background "熟悉 JavaScript 和 Promise" --mode simple
npm run school -- start my-school
```

不依赖 Pi 时，由当前 Coding Agent 将自然语言请求映射为上述参数，并加上 `--prepare-only`：

```sh
npm run school -- create --source "来源 URL 或本地绝对路径" \
  --goal "学习目标" --name my-school --depth 深入 --mode simple --prepare-only
# 当前 Agent 阅读 schools/my-school/GENERATION.md，读取来源并写入课程
npm run school -- finish my-school
npm run school -- start my-school
```

`GENERATION.md` 由同一份生成协议与实际输入组成，不是另一套 Prompt。`prepare-only` 只准备材料和网站骨架；`finish` 复用既有课程检查并构建。Agent 必须实际生成课程，不应仅因为准备命令成功就交付空 School。用户无需手写输入 JSON。

`--source` 可重复，支持 GitHub 仓库、HTTP(S) 文档、论文和本地文件/目录。`--ref` 指定仓库分支或标签；默认记录实际提交。HTML、PDF、DOCX 保留原件并提取阅读文本。普通文本直接使用。默认系统深度、基础未知按需补充、中文课程、简单教学。`--depth`、`--background`、`--style` 接受自由描述；`--language`、`--port`、`--model` 可选。无参数时只询问来源与目标。默认 Pi 路径的模型见 `scripts/pi.mjs`，可用 `SCHOOL_MODEL` 或 `--model` 改为 Pi 中已配置的模型。Agent 直接生成时使用其自身模型设置；这些 Pi 参数不会替换当前 Agent 的模型。

生成可能持续数分钟。工具保存请求、材料、可编辑课程与实际模型记录，完成后构建网站；错误会明确返回，不覆盖已有同名 School。失败后先检查错误和保留文件，再用 `npm run school -- retry NAME` 重新生成；它可能修改课程，不能当作无损续写。已有学习记录的课程优先手动编辑，保持 slug 的语义稳定。

## 开始学习

1. 打开 `start` 输出的本地网址，选择 Simple / Immersive，点击 Enroll 获取身份。
2. 进入关卡，复制启动 Prompt，交给你使用的教师 Agent。Pi 可直接粘贴到 `pi`，或执行 `npm run school -- teach NAME --student 网页身份`；其他 Harness 无需 Pi 适配文件，可用 `teach NAME --student 网页身份 --prompt-only` 获取通用续学提示词。
3. 与教师对话、预测、观察或实践。网页切换模式后，教师每轮读取最新偏好；也可直接要求教师调整模式或讲解细节，无需重新生成课程。
4. 完成活动后由教师调用进度 API；网页自动显示勾选。新教师会话使用同一身份继续，先读取服务器进度。

课程完成表示参与活动并收到反馈，不是知识认证。模式影响节奏与提问，不会删除深入课程中的知识范围。网页身份是本地轻量标识，没有账号安全或权限系统。

## 编辑、运行与迁移

`schools/NAME/COURSE.md` 说明路线、来源、深度取舍；`src/content/lessons/*.md` 是完整内容和灵活教学说明；`public/sources/` 是可通过 HTTP 读取的来源，`public/activities/` 是标明为生成内容的活动。编辑后开发服务刷新。`school.settings.json` 保存创建设置与默认模式；修改课程顺序使用 frontmatter `order`，保持已学习关卡的 `slug` 稳定。

先停止该 School 的开发服务，再执行 `npm run school -- build NAME`；构建和开发不要同时操作同一 School。每所 School 有独立缓存和本地 `.wrangler/` 进度，迁移时保留后者。端口被占用会失败；用 `start NAME --port 另一个端口`，所有 HTTP 指令会跟随当前地址。

独立使用时复制 School，移除指向本项目模板依赖的 `node_modules` 链接，在该目录 `npm ci`、`npm run dev`。源文件与锁文件已包含；根工具无需常驻。当前仅验证本地运行，未部署公网。

教师需要能够读取 HTTP 文本、调用 API、保留多轮对话，并遵循 `/llms.txt` 中的教学规则。课程和来源由课程 API 与 `/sources/` 提供，完成状态由进度 API 保存，API 格式见 `/api/openapi.json`。仅 Pi 需要读取 `/harness/pi.txt` 中的具体工具指令；不要求其他 Harness 模仿 Pi 的工具名称或会话格式。跨 Harness 的实际验证与当前限制见 [HARNESS-VALIDATION.md](HARNESS-VALIDATION.md)。
