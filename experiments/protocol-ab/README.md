# protocol.md 轻量 A/B 实验

本轮仅比较 p-limit 课程 Markdown，不构建、渲染、部署或进行真实教学。

- `REPORT.md`：最终结论与可复核证据。
- `manifest.json`：协议版本、SHA-256、模型、推理配置与来源版本。
- `protocols/`：修改前后协议快照及原始 Git diff。
- `inputs/`：共同请求、原始材料、来源哈希及共享教学契约维护源/提取文本。
- `work/A/school/`、`work/B/school/`：正式两组原始产物；各自 `materials/` 是独立材料副本。
- `records/A/`、`records/B/`：准确提示、真实 Pi 会话、工具事件、执行结果与最终生成摘要。
- `review/`：匿名评估工作目录；只有匿名样本、共同输入和来源，没有协议或身份映射。
- `evaluation.md`：独立会话的匿名评估原文。
- `records/review/`：匿名评估提示、真实会话和工具记录。
- `records/blind-mapping.json`：匿名身份映射，评估者无读取权限。
- `records/control-checks.json`、`records/isolation-probe.txt`：共同条件一致性与访问隔离探针。
- `aborted-sandbox-attempt/`：不纳入比较的隔离启动错误及完整记录，详见其 README。

`run.mjs` 复用正式 `scripts/pi.mjs` 调度 Pi；`runtime/bin/pi` 仅加上 macOS 文件访问隔离。全部 Agent 都从新会话开始，禁用上下文文件、扩展、MCP、Skill 和 Prompt Template。隔离允许元数据查询，但禁止读取仓库内当前工作目录之外的文件内容与全局历史会话；生成器只能访问本组目录，评估者只能访问 `review/`。

记录包含完整会话与模型推理/工具输出；分享前请自行检查。请勿对本目录直接重跑 `prepare` 或 A/B 命令，以免混入已有产物。复现实验应使用另一空目录及新会话，不应续写已有会话，也不应以 `finish`/`retry`/网站构建验证代替 Markdown 评估。
