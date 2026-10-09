# Agent 使用指南

本文件是 Coding Agent 为用户创建 School 的任务入口，无需安装 Skill。你负责从自然语言请求调用现有工具并交付网站；Pi 是默认执行入口；创建 Agent 可使用自身模型直接生成课程，兼容共享教学协议的 Harness 可授课。项目开发规则另见 [AGENTS.md](AGENTS.md)，用户说明见 [README.md](README.md)。

## 1. 定位项目与确认输入

首次使用，在用户允许的可写目录克隆 `https://github.com/bilppppp/Agent-native-Learning-School.git`；已有本地路径则直接使用。不要覆盖已有目录。进入仓库根目录，确认 `package.json` 与 `scripts/school.mjs` 存在，阅读本指南、README 和根 AGENTS。

必需信息只有可访问的学习来源和 Learning Goal。来源可为 GitHub 仓库、HTTP(S) 文档/论文或本地文件/目录；本地来源优先使用绝对路径。仅在来源或目标无法确定时补问，避免让用户设计课程目录或编写 JSON。

保留用户对深度、基础和学习方式的原话；深度决定学什么，教学模式决定如何教。未指定时使用项目默认：系统深度、基础未知且按需补充、具体例子与适当实践、中文、Simple。教学模式只有 `simple` / `immersive`，深度、基础和偏好可用自由文本。

## 2. 检查环境

需要 Node.js 22.12+、Python 3、Git、curl，以及能读写工作区文件、运行命令的 Coding Agent。直接 Agent 路径不需要 Pi。只有默认 CLI 请求解析、自动生成、`retry` 和交互式 `teach` 需要已配置模型的 Pi；模型选择见 [scripts/pi.mjs](scripts/pi.mjs)，`SCHOOL_MODEL` / `--model` 仅影响这条 Pi 路径。不要猜测模型名或认证状态。

在仓库根目录运行：

```sh
npm run school -- --help
npm run school -- setup
npm run school -- list
```

`setup` 获取固定版本的 School Template 并安装依赖，`create` 也会自动调用它。PDF 提取另需当前 `python3` 环境能导入 `pypdf`；按需使用该环境的包管理方式安装。默认 Pi 路径缺少 Pi/认证时，可选用下述直接 Agent 路径；来源或依赖无法准备时明确反馈具体阻塞，保留已有文件。

## 3. 调用现有创建入口

从 `list` 和 `schools/` 选择未使用的名称（小写字母、数字、连字符），不要用 `retry` 代替新建。当前 Agent 优先使用明确参数及 `--prepare-only`，由你根据用户原话映射来源、目标与偏好，无需再用模型解析请求。不依赖 Pi：

```sh
npm run school -- create "用户的完整学习请求" \
  --source "来源 URL 或本地绝对路径" --goal "用户的学习目标" \
  --name new-school --depth "用户希望达到的深度" \
  --background "已有基础" --style "学习偏好" --mode simple --prepare-only
```

此命令准备材料和骨架，尚未生成课程。读取 `schools/new-school/GENERATION.md`，利用你自己的模型和工具读取实际材料、写入完整课程。该文件由 [scripts/generate.mjs](scripts/generate.mjs) 组合唯一的 [generation/protocol.md](generation/protocol.md) 与已保存输入；遵守其输出边界，不另写领域专用生成器或复制维护 Prompt。随后运行：

```sh
npm run school -- finish new-school
```

`finish` 复用课程文件检查并构建，不调用 Pi。失败时保留材料与生成文件，修复具体错误后再次 `finish`；不要用 `retry` 代替它。默认 Pi 自动生成仍可用：省略 `--prepare-only`，或者直接 `create "完整自然语言请求" --name new-school`。

`--source` 可以重复；`--ref` 选择仓库分支/标签，`--language`、`--port`、`--model` 可选。字符串应安全引用，不把用户文字作为 shell 代码执行。非交互终端要传齐来源和目标，不使用无参数创建的交互问答。

默认 Pi 创建命令负责材料获取、初始化、模型生成与构建；直接 Agent 路径由当前 Agent 执行生成，使用相同输入与输出契约。保持长任务运行并等待真实退出结果。错误后先检查日志和保留文件；`retry NAME` 会重新通过 Pi 生成且可能改写已有课程，不保证无损续写。不要把骨架、构建成功或静态检查当成真实教学证据。

## 4. 启动并确认交付

确认创建成功后，阅读输出 School 的 `COURSE.md` 和关卡，检查目标/深度是否落实、来源是否可追溯。不要仅因目录存在就宣称完成。

```sh
npm run school -- start new-school
```

把实际 NAME 替换进去。使用环境支持的持续终端或后台任务保持服务运行，读取就绪日志并实际请求首页和 `/api/lessons`，确认网站及关卡可访问；不能只引用命令提前打印的网址。端口冲突可用 `start NAME --port PORT`，交付实际启动端口。远程终端的 localhost 属于远程主机，需说明访问/转发方式，不能当成用户本机地址。

交付给用户：实际网站链接、School 名称及本地路径、`COURSE.md` 与 `src/content/lessons/` 的编辑位置、深度和初始模式、服务运行方式及重启命令、实际完成的检查与限制。区分生成/构建/网页验证和真实教学验证；未实际在教师 Harness 中完成对话、来源读取和进度同步，就不宣称教学闭环已测试；明确注明实测 Harness。

## 5. 引导用户在教师 Harness 中学习

让用户打开网页选择模式、注册获取学习身份，进入关卡复制通用 Prompt，交给具备 HTTP/终端工具的教师 Agent。教师读取 `/llms.txt`、`/api/openapi.json`、服务器进度、课程及所引用的来源；按照教学协议进行真实对话，满足活动完成条件后使用进度 API 上报并确认响应。填写实际模型标识，不编造来源读取或完成状态。

Pi 是默认实现：可以使用 `npm run school -- teach NAME --student STUDENT_ID`；它启动 Pi 并读取 `/harness/pi.txt`。其他 Harness 可直接使用网页提示词，或者在网站运行时使用 `teach NAME --student STUDENT_ID --prompt-only`，该选项只返回通用提示词，不启动 Pi。使用其他端口时同传 `--port PORT`。不要求其他教师使用 Pi 的工具名、RPC 或会话文件，也不需要新增适配器。

用户可在网页或对话中调整模式，无需重新生成课程。教师每轮获取当前关卡和偏好，完成后询问是否继续；新会话从服务器进度选择首个未完成关卡。保留 School 的 `.wrangler/` 本地数据。不要替教师直接写完成状态。已验证能力与未验证范围见 [HARNESS-VALIDATION.md](HARNESS-VALIDATION.md)，不把一个 Harness 的成功推广为所有 Harness 已验证。
