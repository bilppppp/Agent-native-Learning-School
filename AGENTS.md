# Repository Guidelines

## 适用范围与必读文档

本文件指导项目开发与维护。普通用户请求创建 School 时，先按 [AGENT_GUIDE.md](AGENT_GUIDE.md) 执行现有流程；用户入口与 CLI 参数见 [README.md](README.md)。课程生成的唯一协议是 [generation/protocol.md](generation/protocol.md)。验证历史见 [TOOL-REPORT.md](TOOL-REPORT.md) 与 [EXPERIMENTS.md](EXPERIMENTS.md)，不要将历史结果当成新修改的验证。

## 项目结构与修改边界

- `scripts/school.mjs` 是 CLI；`materials.mjs` / `extract-material.py` 准备来源，`scaffold.py` 初始化，`generate.mjs` 读取生成协议，`pi.mjs` 集中默认 Pi 模型运行细节；直接 Agent 生成路径使用同一协议及课程检查。
- `school-kit/overlay/` 是共享网站增量的维护源，行为见 [school-kit/README.md](school-kit/README.md)。修改共享文件后，用 `python3 scripts/apply-school-kit.py schools/NAME` 应用到目标 School；不要只修改某个派生副本。
- `schools/NAME/` 包含独立网站、`COURSE.md`、`src/content/lessons/`、`public/sources/` 和 `public/activities/`。`inputs/` 保存生成请求，`evidence/` 保存实际记录。`upstream/`、生成用 `materials/`、依赖和运行缓存不纳入 Git。

课程与共享教学原则保持 Harness 中立；Pi 工具指令属于 `/harness/pi.txt` 接入部分。沿用现有 Profile、进度 API 和模板机制，不为创建课程重新开发平台。保留既有 School 的关卡 slug、完成条件语义及 `.wrangler/` 进度；`retry` 可能修改课程，不能作为无损续写。生成与教学记录只能来自实际运行，不手工伪造完成状态或改写历史证据。来源副本保留原件、许可和版本依据。

## 命令与验证

根目录入口：`npm run school -- --help`、`setup`、`list`、`create`（直接 Agent 路径加 `--prepare-only`）、`finish NAME`、`start NAME`、`build NAME`、`teach NAME --student STUDENT_ID`。完整参数查 README 或 CLI 帮助，不编写新的输入格式。`npm run dev` 启动既有 React / Transformer。

先停止目标 School 的开发服务再构建；同一 School 不并行运行开发与构建。刚克隆时运行既有 School 需在其目录 `npm ci`，新建流程则准备模板依赖链接。复用各 School 的 Biome 配置与现有风格：所配置 TypeScript 使用 tab，根 JavaScript/Python 跟随相邻文件。

按修改范围检查：文档修改核对链接和 CLI 参数；脚本修改运行相应语法检查与必要功能检查；共享 API/进度改动在已安装依赖的 `schools/react` 运行 `npx vitest run`（测试位于 `src/lib/*.test.ts`），并验证受影响网站。没有既定覆盖率门槛。只有真实教师 Harness 对话及网页进度同步才能证明该 Harness 的教学闭环，报告须注明实际 Harness；构建通过不能代替；无需为文档修改重做模型能力实验。
