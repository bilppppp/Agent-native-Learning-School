# Harness 解耦验证

2026-10-09：Codex CLI 已独立创建 School，并作为教师完成一关真实多轮对话、来源读取、实践反馈、进度上报及新会话续学。Pi 是保留的默认入口，不再是创建或授课的必要运行依赖；不能据此声称所有 Harness 均已验证。

## 最小实现

- `create --prepare-only`：当前 Coding Agent 将用户请求映射为明确参数，复用材料获取与模板初始化，得到 `GENERATION.md`，再由自身模型生成课程。用户不用写 JSON。
- `finish NAME`：复用与 Pi 生成相同的课程文件检查并构建。生成协议、输入/输出契约保持一致。
- `teach NAME --student ID --prompt-only`：读取网站状态并返回通用续学提示词，不启动 Pi。网页提示词和固定文案改为通用教师表述，Pi 适配文件仅作为条件链接。
- README、AGENT_GUIDE、开发指南和 School Kit 说明更新。没有新增其他 Harness 适配器、会话转换层或进度格式。

## 实际运行

| 环节 | 结果与证据 |
|---|---|
| 独立创建 | Codex 从自然语言请求自行映射参数，读取 `scripts/materials.mjs`、同一生成协议与实际准备材料，生成 `process-results` 四关课程并构建。除环境版本检查外，没有调用 Pi。见 [创建记录](evidence/harness-validation/codex-create.jsonl)、[结果](evidence/harness-validation/codex-create-final.md)。 |
| Pi 不可用时的入口 | 登录 shell 曾恢复 PATH，因此首次屏蔽未生效，不能声称 Codex 在未安装 Pi 的机器上运行。随后在命令环境明确令 `pi` 返回 127，`prepare-only` 材料准备、`finish` 构建及 `teach --prompt-only` 均成功。[构建记录](evidence/harness-validation/no-pi-finish.log)。没有卸载或修改用户的 Pi。 |
| 真实教学 | 全新 Codex 教师通过 HTTP 读取 `/llms.txt`、OpenAPI、课程、进度及原始来源；提出成功案例预测、回答 stderr 追问、实际运行观察，再反馈失败案例预测。[首轮](evidence/harness-validation/teacher-turn-1.md)、[追问](evidence/harness-validation/teacher-turn-2.md)、[完成反馈](evidence/harness-validation/teacher-turn-3.md)。对应 JSONL 保留实际工具调用，[实际学习输入](evidence/harness-validation/learner-inputs.md) 保留发送的回答和请求。 |
| 模式与进度 | 网页注册身份 `bright-learner-4097`，由 simple 切为 immersive；教师下一轮重新读取并使用新模式。活动完成后教师自行 PUT 进度，服务器记录 `output-to-result`、`source: agent`、`model: gpt-6.1-sol`。网页自动勾选并进入第二关，没有直接写入完成状态。 |
| 继续与恢复 | 回答“继续下一关”后教师进入 `stdio-options`。[继续记录](evidence/harness-validation/teacher-turn-4.md)。另一场全新 Codex 会话没有读取旧对话，仅通过网站进度恢复第二关及 immersive 模式，并读取来源开始教学。[新会话](evidence/harness-validation/teacher-new-session.md)。 |

测试学习者由主 Agent 担任，答案实际发送给独立 CLI 教师，记录来自真实运行，不是手写模拟对话；这不是人类学员的完整体验研究。只完成第一关，其余关卡没有标记完成。原始源码 HTTP 副本与输入文件逐字节一致。既有 React / Transformer 课程检查通过；现有 43 项测试通过。没有重新评估这两门课的生成质量。

## 使用与边界

当前 Agent 按 [AGENT_GUIDE.md](AGENT_GUIDE.md) 使用 `create --prepare-only`，读取产生的指令、实际生成文件，再 `finish` / `start`。教师需能读取 HTTP 文本、调用 JSON API、保留多轮对话、执行适当活动并遵守共享规则。进度属于 School；续学只需同一身份和网站地址，不需要 Pi 或 Codex 内部会话文件。

仍依赖 Pi：默认自然语言 CLI 请求解析、默认自动生成、`retry` 重新生成、未加 `--prompt-only` 的交互式 `teach`，以及 `/harness/pi.txt` 的工具指令。直接 Agent 路径使用自身模型配置；`--model` / `SCHOOL_MODEL` 仍只配置默认 Pi 路径。

本次实测非 Pi Harness 只有 Codex CLI；没有运行 AGY、Claude Code、OpenCode 等教师，也没有验证它们的认证、工具权限或教学质量。通用协议可复用，不等于所有运行环境已经兼容。Pi 默认路径保留，本次未重新进行 Pi 教学。仅验证本机 HTTP，没有公网部署。

验证 School：`npm run school -- start process-results`，默认端口 4414。课程可在 [COURSE.md](schools/process-results/COURSE.md) 和 `src/content/lessons/` 编辑；本地进度留在该 School 的 `.wrangler/`，不纳入 Git。历史身份仅用于复现本次本地验证，新用户可在网页注册自己的身份。
