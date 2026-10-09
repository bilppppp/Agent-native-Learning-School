# Agent-native Learning School

从可访问的材料和学习目标生成一所独立 School。课程深度决定学什么，教学模式决定如何教。网站保存身份与进度；当前使用 Pi 教师，课程与进度格式不依赖 Pi。

## 准备与创建

需要 Node.js 22.12+（本次使用 24.16）、Python 3、Git、curl，以及已安装并配置可用强模型的 Pi。首次执行：

```sh
npm run school -- setup
# PDF 需要 pypdf；可在自己的 Python 环境安装
python3 -m pip install pypdf
```

自然语言创建，无需写 JSON 或课程文件：

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

`--source` 可重复，支持 GitHub 仓库、HTTP(S) 文档、论文和本地文件/目录。`--ref` 指定仓库分支或标签；默认记录实际提交。HTML、PDF、DOCX 保留原件并提取阅读文本。普通文本直接使用。默认系统深度、基础未知按需补充、中文课程、简单教学。`--depth`、`--background`、`--style` 接受自由描述；`--language`、`--port`、`--model` 可选。无参数时只询问来源与目标。模型默认 `openai-codex/gpt-6.1-sol`，可用 `SCHOOL_MODEL` 或 `--model` 改为 Pi 中已配置的模型。

生成可能持续数分钟。工具保存请求、材料、可编辑课程与实际模型记录，完成后构建网站；错误会明确返回，不覆盖已有同名 School。失败后先检查错误和保留文件，再用 `npm run school -- retry NAME` 重新生成；它可能修改课程，不能当作无损续写。已有学习记录的课程优先手动编辑，保持 slug 的语义稳定。

## 开始学习

1. 打开 `start` 输出的本地网址，选择 Simple / Immersive，点击 Enroll 获取身份。
2. 进入关卡，复制启动 Prompt，在 `pi` 中粘贴。也可执行 `npm run school -- teach NAME --student 网页身份`。
3. 与 Pi 对话、预测、观察或实践。网页切换模式后，教师每轮读取最新偏好；也可直接要求教师调整模式或讲解细节，无需重新生成课程。
4. 完成活动后由教师调用进度 API；网页自动显示勾选。新 Pi 会话使用同一身份继续，先读取服务器进度。

课程完成表示参与活动并收到反馈，不是知识认证。模式影响节奏与提问，不会删除深入课程中的知识范围。网页身份是本地轻量标识，没有账号安全或权限系统。

## 现有可体验 School

| School | 启动命令 | 默认地址 |
| --- | --- | --- |
| React | `npm run school -- start react` | http://localhost:4321 |
| Transformer | `npm run school -- start transformer` | http://localhost:4322 |
| p-limit 入门（三关） | `npm run school -- start concurrency-intro` | http://localhost:4323 |
| p-limit 深入（七关） | `npm run school -- start concurrency-deep` | http://localhost:4324 |

`npm run school -- list` 查看所有 School。旧 `npm run dev` 同时启动 React 和 Transformer。原实验身份 React `radiant-builder-9136`、Transformer `nimble-builder-9936` 保留；新学习者另行注册。网址添加 `?sid=身份` 可恢复身份。

## 编辑、运行与迁移

`schools/NAME/COURSE.md` 说明路线、来源、深度取舍；`src/content/lessons/*.md` 是完整内容和灵活教学说明；`public/sources/` 是可通过 HTTP 读取的来源，`public/activities/` 是标明为生成内容的活动。编辑后开发服务刷新。`school.settings.json` 保存创建设置与默认模式；修改课程顺序使用 frontmatter `order`，保持已学习关卡的 `slug` 稳定。

先停止该 School 的开发服务，再执行 `npm run school -- build NAME`；构建和开发不要同时操作同一 School。每所 School 有独立缓存和本地 `.wrangler/` 进度，迁移时保留后者。端口被占用会失败；用 `start NAME --port 另一个端口`，所有 HTTP 指令会跟随当前地址。

独立使用时复制 School，移除指向本项目模板依赖的 `node_modules` 链接，在该目录 `npm ci`、`npm run dev`。源文件与锁文件已包含；根工具无需常驻。当前仅验证本地运行，未部署公网。

## 复用边界与限制

`generation/protocol.md`、课程 Markdown、共享 `/llms.txt`、Profile 和进度 API 属于通用层。`/harness/pi.txt` 集中当前 Pi 工具说明；`scripts/pi.mjs` 是生成模型运行入口，`teach` 与验收桥是 Pi 启动部分。未来替换教师只需替换启动/工具说明，不必重新生成课程或改进度结构；本次没有实现第二个 Harness。

优先复用 School Template 的 Astro 网站、身份、KV 与 API。新增轻量 CLI、材料获取/提取、深度参数与模式控制，以及共享教学/当前 Pi 边界。未加入 RAG、SDK、插件框架或考试系统。生成依赖模型质量和上下文容量；不可访问、需登录、扫描 PDF 或复杂二进制材料须提供可读导出，不能保证任意来源全自动处理。生成器按提示约束写入范围，不是额外安全沙箱；敏感本地材料请先选择合适的公开子集。

实际结果见 [TOOL-REPORT.md](TOOL-REPORT.md)，原始实验见 [EXPERIMENTS.md](EXPERIMENTS.md)，真实记录位于 `evidence/generation/` 和 `evidence/teaching/`。验收由 Codex 作为学习者操作真实 Pi，不等同真人学习效果研究。

网站派生自 [School Template](https://github.com/agentschools/school-template)，commit `f5a1682f111e4992a2e9cb0e194d0f1c747f5d63`，Apache-2.0；保留版权头。体验参考 [Pi School](https://github.com/agentschools/pi-school)。来源副本保留原始许可和归属。
