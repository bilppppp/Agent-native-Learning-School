# Agent 使用指南

本文件是 Coding Agent 为用户创建 School 的任务入口，无需安装 Skill。你负责从自然语言请求调用现有工具并交付网站；当前实际授课由 Pi 完成。项目开发规则另见 [AGENTS.md](AGENTS.md)，用户说明见 [README.md](README.md)。

## 1. 定位项目与确认输入

首次使用，在用户允许的可写目录克隆 `https://github.com/bilppppp/Agent-native-Learning-School.git`；已有本地路径则直接使用。不要覆盖已有目录。进入仓库根目录，确认 `package.json` 与 `scripts/school.mjs` 存在，阅读本指南、README 和根 AGENTS。

必需信息只有可访问的学习来源和 Learning Goal。来源可为 GitHub 仓库、HTTP(S) 文档/论文或本地文件/目录；本地来源优先使用绝对路径。仅在来源或目标无法确定时补问，避免让用户设计课程目录或编写 JSON。

保留用户对深度、基础和学习方式的原话；深度决定学什么，教学模式决定如何教。未指定时使用项目默认：系统深度、基础未知且按需补充、具体例子与适当实践、中文、Simple。教学模式只有 `simple` / `immersive`，深度、基础和偏好可用自由文本。

## 2. 检查环境

需要 Node.js 22.12+、Python 3、Git、curl 和已配置可用模型的 Pi。用版本命令检查实际环境；可用 `pi --help` 查看本机入口。当前生成器也通过 Pi 调用模型，创建 Agent 本身可以是其他 Coding Agent。默认模型见 [scripts/pi.mjs](scripts/pi.mjs)；用户指定其他已配置模型时传 `--model PROVIDER/MODEL` 或设置 `SCHOOL_MODEL`，不要猜测模型名或认证状态。

在仓库根目录运行：

```sh
npm run school -- --help
npm run school -- setup
npm run school -- list
```

`setup` 获取固定版本的 School Template 并安装依赖，`create` 也会自动调用它。PDF 提取另需当前 `python3` 环境能导入 `pypdf`；按需使用该环境的包管理方式安装。缺少 Pi、认证或无法准备依赖时明确反馈具体阻塞，保留已有文件。

## 3. 调用现有创建入口

从 `list` 和 `schools/` 选择未使用的名称（小写字母、数字、连字符），不要用 `retry` 代替新建。可直接传完整自然语言请求；显式 `--name` 避免与已有课程重名：

```sh
npm run school -- create "学习 https://github.com/sindresorhus/p-limit，理解异步并发限制及核心实现。我熟悉 Promise，希望深入，偏好代码观察，教学先用简单模式" --name p-limit-mechanisms
```

也可以由你将已明确的用户要求映射为参数，跳过请求解析，保留用户原始描述作为位置参数：

```sh
npm run school -- create "用户的完整学习请求" \
  --source "来源 URL 或本地绝对路径" --goal "用户的学习目标" \
  --name new-school --depth "用户希望达到的深度" \
  --background "已有基础" --style "学习偏好" --mode simple
```

`--source` 可以重复；`--ref` 选择仓库分支/标签，`--language`、`--port`、`--model` 可选。字符串应安全引用，不把用户文字作为 shell 代码执行。非交互终端要传齐来源和目标，不使用无参数创建的交互问答。

创建命令负责材料获取、模板初始化、模型生成和构建。完整课程生成规则只有一份：[generation/protocol.md](generation/protocol.md)，由 [scripts/generate.mjs](scripts/generate.mjs) 读取；不要复制 Prompt 或为新领域手写专用生成器。保持长任务运行并等待退出结果；超时或错误后先读日志及保留文件，修复原因再考虑 `retry NAME`。重试可能改写课程，不保证无损续写。

## 4. 启动并确认交付

确认创建成功后，阅读输出 School 的 `COURSE.md` 和关卡，检查目标/深度是否落实、来源是否可追溯。不要仅因目录存在就宣称完成。

```sh
npm run school -- start new-school
```

把实际 NAME 替换进去。使用环境支持的持续终端或后台任务保持服务运行，读取就绪日志并实际请求首页和 `/api/lessons`，确认网站及关卡可访问；不能只引用命令提前打印的网址。端口冲突可用 `start NAME --port PORT`，交付实际启动端口。远程终端的 localhost 属于远程主机，需说明访问/转发方式，不能当成用户本机地址。

交付给用户：实际网站链接、School 名称及本地路径、`COURSE.md` 与 `src/content/lessons/` 的编辑位置、深度和初始模式、服务运行方式及重启命令、实际完成的检查与限制。区分生成/构建/网页验证和真实教学验证；未在 Pi 中上课就不宣称教学闭环已测试。

## 5. 引导用户在 Pi 中学习

让用户打开网页选择模式、点击 Enroll 获取学习身份，进入关卡复制 Prompt，在已配置的 `pi` 中粘贴。也可在网站运行时使用 `npm run school -- teach NAME --student STUDENT_ID`；改用其他启动端口时同传 `--port PORT`。

Pi 读取共享 `/llms.txt`、当前 `/harness/pi.txt`、课程及来源，完成活动后通过进度 API 上报。用户可在网页或对话中调整模式，无需重新生成课程。下次用同一身份与新的启动 Prompt 续学；保留 School 的 `.wrangler/` 本地数据。不要替用户写入完成状态，也不要把其他 Coding Agent 已接入教学当作当前能力。
