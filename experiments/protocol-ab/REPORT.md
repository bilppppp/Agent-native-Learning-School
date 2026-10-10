# p-limit 课程生成 Prompt A/B 实验报告

## 结论

**最终判断：基本持平。**

新版在本轮的明确收益是：`agentInstructions` 显著减少了共享教学行为的重复，且没有出现关卡独有信息被抽空的现象。但两组整体课程各有优点，不能据此认定新版总体课程质量更好；B 还遗漏了发布来源副本所需的 MIT 许可文本。

这是一次 p-limit、同模型、每版本一个完整样本的 Markdown 比较，不是协议普遍效果或真实学习成效的证明。未因结论不符合预期而重新抽样，也未修改正式提示词。

## 1. 版本与共同条件

| 条件 | 实际使用值 |
| --- | --- |
| A：修改前协议 | commit `5e69dd8702d2f4115d01689611af1e611680ed92`，即本次修改提交的父提交；[快照](protocols/A.md) |
| B：当前协议 | commit `e76bbb5740863a96248d013d5ca6d275530519d3`；当前工作树文件与提交一致；[快照](protocols/B.md) |
| 协议差异 | 仅第 5 条，见 [原始 Git diff](protocols/change.diff) |
| 生成模型 | 两组实际会话均为 `openai-codex/gpt-6.1-sol`，reasoning `high`，Pi `1.1.0` |
| 评估模型 | 同一模型、`high`，但为第三个独立会话，未继承生成上下文 |
| 学习目标 | 理解异步并发限制，并能正确使用 p-limit 控制任务执行 |
| 深度与背景 | `deep`；熟悉 JavaScript 函数与 Promise，未系统学习并发限制 |
| 学习偏好 | 具体例子、解释、适量实践；中文；初始 `simple` 模式 |
| 来源 | 复用本地干净的 p-limit 工作树，commit `a8a6fbec4e0e866d6d779b10889bb4f5567e70eb`，包声明 `7.3.3` |
| 采样 | 相同 Pi／Provider 默认配置；未设置 temperature 或 seed，不宣称确定性生成 |
| 输出要求 | 完整 COURSE.md、相同 frontmatter 格式的 Lesson、必要来源与活动材料；不预设课数 |

完整协议／输入哈希、模型配置和来源出处见 [manifest.json](manifest.json)、[共同输入](inputs/input.json)、[来源哈希](inputs/source-sha256.json)。来源复用的是原始材料，不是已有课程正文。

### 隔离与真实执行

- A、B 各有独立工作目录、独立材料副本和新建 session directory；不使用 continue、resume 或 fork。
- 两组采用相同 system prompt 与工具配置，禁用上下文文件、扩展、MCP、Skill 和 Prompt Template。提示除协议正文外完全相同，输入和来源哈希一致，见 [共同条件检查](records/control-checks.json)。
- macOS 文件访问隔离禁止读取仓库内本组目录之外的内容和全局历史会话；只放行目录元数据查询及本组会话存储。实际探针确认其他组材料和正式协议内容读取为 `EPERM`，见 [隔离探针](records/isolation-probe.txt)。正式 A/B 和评估会话均只有一条初始用户消息，无 parent session、无工具错误，见 [会话审计](records/session-audit.json)。
- 初次隔离配置误拦截了 `write` 的祖先目录元数据访问，A 实际遇到 `EPERM`；B 使用相同配置，未等同类错误发生便一并主动中止。两组均未完成课程，修正隔离后从空课程目录和新会话重新开始。未续写、未复用中止输出；完整失败记录保存在 [aborted-sandbox-attempt/](aborted-sandbox-attempt/README.md)，不纳入比较。
- 评估前随机匿名映射为 **X=B、Y=A**。映射在结果完成前保存于评估目录之外。评估者只能访问 `review/`，没有协议、版本身份、生成日志或历史结果。匿名样本与原始产物字节相同，见 [匿名化检查](records/anonymization-check.json)。

正式会话：

| 阶段 | Session ID | UTC 执行时间 |
| --- | --- | --- |
| A | `01a12393-6b5b-7053-bf1a-294ff4d2defe` | 2026-10-10 02:10:26–02:19:36 |
| B | `01a12393-6b6e-7150-82f8-954f75161bd3` | 2026-10-10 02:10:26–02:20:51 |
| 匿名评估 | `01a1239d-aea9-7574-95ee-3ebe5406e85c` | 2026-10-10 02:21:38–02:26:59 |

各阶段的准确提示、真实 JSONL 会话、工具事件和执行结果分别在 `records/A/`、`records/B/`、`records/review/`。调度复用 `scripts/pi.mjs`，实验专用入口为 [run.mjs](run.mjs)，不改正式流程。

## 2. 生成产物

| 产物 | A | B |
| --- | --- | --- |
| 课程规划 | [work/A/school/COURSE.md](work/A/school/COURSE.md) | [work/B/school/COURSE.md](work/B/school/COURSE.md) |
| 完整关卡 | [src/content/lessons/](work/A/school/src/content/lessons/)：7 篇 | [src/content/lessons/](work/B/school/src/content/lessons/)：7 篇 |
| 原件副本 | [public/sources/material-1/](work/A/school/public/sources/material-1/)：7 文件，含 license | [public/sources/material-1/](work/B/school/public/sources/material-1/)：6 文件，缺 license |
| 活动材料 | Promise 语义实验与槽位状态表 | Promise 语义探针；其他状态表／活动在正文中 |

两组 frontmatter 均包含所需字段、连续 order 和独立 slug，正文非空；已经复制的来源文件均与输入原件字节一致。静态交付检查与最终产物哈希见 [artifact-checks.json](records/artifact-checks.json)。未用字数、Token 或关键词数量衡量质量。

## 3. 共享规则重复：新版有明确收益，但不是零重复

**实际观察：**A 的 7 篇 Lesson 第 9 行都在能力说明后复述通用教学行为。B 不再逐关复述这一组行为。

具体例子：

- [A 第 1 关](work/A/school/src/content/lessons/01-slots-and-starts.md):9：“一次提出一个小问题后等待，欢迎自然提问，温和纠错……不反复测验。”
- [A 第 3 关](work/A/school/src/content/lessons/03-core-scheduler.md):9：“一次提出一个小问题后等待……解释错误而不责备……不……反复测验。”
- [A 第 7 关](work/A/school/src/content/lessons/07-transfer-pipeline.md):9 再次规定等待、欢迎问题、反馈和提示。

这些行为已由共同的 [共享教学契约](inputs/shared-contract.md):9 规定，不是当关独有信息。匿名评估逐关列出了可移除片段，也明确区分了应保留的具体首问、状态预测和误解提示。

相对地，[B 第 3 关](work/B/school/src/content/lessons/03-core-scheduler.md):9–15 直接提供五个符号、三个 Promise、源段、同步快照、预期推理和完成产物。删除的是职责重复，而非教学内容。

**两组都没有发现进度 GET/PUT、模型 ID 或 Harness 专属工具／传输指令。**这几项本轮没有形成新版相对收益。

B 仍有少量共享原则重复，例如第 1 关:14“无需一次全部正确”、第 2 关:14“没有要求一次无误”、第 7 关:14“完成不以零错误为条件”。不应把明确的关卡活动及反馈产物一起删掉，也不能把“有反馈”一词自动当作冗余。

**评价：**新版将共享行为交还运行契约，减少了维护冲突及固化旧教学节奏的机会。这是文档职责边界的收益，尚未验证真实教师执行是否因此改善。

## 4. 关卡独有信息与路线完整性

两组均覆盖：槽位与延迟启动 → 完整返回链和共享资源 → 源码调度 → 错误和 map → 动态并发／清队列 → 嵌套死锁 → 组合迁移。

| 关卡 | 两组都保留的关键教学信息 | 本轮差异 |
| --- | --- | --- |
| 1 | 来源、时间线、提交与启动误解、预测活动和反馈 | A 提供 P/Q/R/S 分步活动；B 提供改时长后的轨迹及耗时下界 |
| 2 | 提前启动／漏返 Promise 反例、完整寿命、共享 limiter、修复活动 | B 较早集中讲三种 API；A 把 limitFunction 深读放到第 6 关 |
| 3 | generator/enqueue/resumeNext/run/next、微任务、计数、预期快照 | A 有固定容量不变量证明和状态表；B 对三个 Promise 的角色更清晰 |
| 4 | 任务失败与遍历失败、源段和真实测试、错误观察、比较活动 | B 就地解释同步 iterable；A 的“await result 是第三个对象”措辞需修正 |
| 5 | 降额非抢占、两种 clearQueue 结算、误解和停止策略 | B 更突出同步立即清队列时“已获准但未调用”的边界；A 也覆盖该窗口 |
| 6 | 等待环、容量 2 推广、共享预算、不会突破上限的修复 | B 正文比较多种修复；A 对 limitFunction 工厂范围的展开较集中 |
| 7 | 组合设计、失败报告、状态预测、来源理由、可观察完成条件 | A 是双入口缺陷修复及后续提交观察；B 是共享批处理器及控制变体 |

详细逐关完整性证据见 [匿名评估](evaluation.md)第四节。没有发现 B 因去掉通用行为而丢失来源、机制、误解、活动或可观察完成条件。两组均为完整正文，不是占位提纲；7 关具有不同目标，没有明显按原仓库文件机械拆课。

**评价而非实测：**A 的不变量推导与双入口任务有更强的组合推理支架；B 的 Promise 分类、iterable 铺垫和正文参考方案更自足。这些设计取舍无法仅凭单次生成判定高下。

两组没有要求答对全部问题才完成。但 A 第 2–6 关完成条件常把“参与并获反馈”和“能解释／能定位”等目标并置，存在被误读为掌握门槛的风险；B 较明确地把完成描述为尝试／产物及反馈。未进行教学，不能声称实际通关被阻塞。

## 5. 正文、来源与活动质量

### 实际观察

两组关键机制均能由同版本原件支持：

- 占位先于用户函数调用：`index.js:19–25,50–68`；测试 `runs all tasks asynchronously`。
- `resolve(result)` 采纳状态，内部 catch 不吞调用者拒绝：`index.js:32–47`；测试 `continues after sync throw`、`does not ignore errors`。
- map 遍历失败会补挂拒绝处理但不取消已提交任务：`index.js:106–126`；相应具名测试真实存在。
- clearQueue 默认不结算被丢弃项，开启选项后拒绝；不取消已占位工作：`index.js:77–89`。
- 改并发非抢占，升额微任务补位：`index.js:91–104`。
- 同池嵌套死锁是 README 明示警告及控制流推导，不是捏造测试。

原件统一在 [inputs/materials/material-1/](inputs/materials/material-1/)。两组都提供固定 commit、上游原始 URL、本地来源 URL 和符号／测试定位，区分生成例子、类比和推论；没有把时间线当作性能实测。

活动只探测原生 Promise，没有用假 limiter 冒充 p-limit。调度者在真实工具记录中核实：两份 Promise 活动均实际执行成功，A 显示延后读取及状态采纳，B 还观察同步抛错转拒绝。见 [原始活动执行摘录](records/observed-activity-executions.json)。**这不是 p-limit 代码、上游测试、网站或教学验证。**

### 确认的问题

1. **B 缺少 license。**原件 [license](inputs/materials/material-1/license):3–7 包含版权和许可保留要求。A 发布副本保留了该文件，B 发布副本没有。实验材料根中保存许可，不等同于 B 的课程来源发布包保留许可；独立分发前必须补齐。本轮未修补产物，也不能将单次遗漏直接归因于第 5 条修改。
2. **A 的概念分类局部不严谨。**[第 4 关](work/A/school/src/content/lessons/04-errors-and-map.md):20–26 将 `await result` 列为“三个对象”之一。它是观察／等待操作，不是第三个结果对象；核心错误传播解释仍正确。
3. **两组完成条件有少量通用原则重复；A 还存在目标与完成门槛混写的措辞风险。**不是已发生的教学问题。

没有发现足以推翻核心机制的事实错误，或不存在的引用文件／符号。未验证外部原始 URL 的在线可达性；本地文件对应关系检查不能冒充 HTTP 验证。

## 6. 匿名结论与证据复核

[匿名评估原文](evaluation.md)保持不变，评估者结论为：

> “四选一结论：基本持平。”
>
> “降低共享指令重复：X 更好，静态证据置信较高。”
>
> “总体课程质量：基本持平，置信中等。”

揭盲后 X=B、Y=A。因此不能把“新版去重复成功”扩写成“新版整体课程胜出”。

评估者完整阅读了两组 COURSE、14 篇 Lesson、所有发布来源及活动，并核对原始源码和测试；路径、行号、短引文和阅读清单均在原文中。评估者没有收到生成器自述或执行日志，不以其自我评价计分。

**调度者对评估边界的两点补充，不改匿名原文：**

- 评估原文不把课程自述的活动执行／字节比较当成自己观察到的成功，这是正确边界。本报告通过独立保留的工具记录和字节检查补充了实际证据，仍不宣称真实库示例运行成功。
- 原文第七节第 6 项指出匿名样本中没有 `school/` 层。匿名包装把课程根放在 `samples/X/`／`samples/Y/`；实际生成工作目录内有 `school/`，且 `node school/public/activities/...` 已成功执行。因此这是导出后应说明工作目录的建议，**不是当前原始产物命令失效，也不是协议差异引入的问题**。

课程结构、推理支架、自足性及潜在误读属于静态专家评价；文件存在、原件一致、重复引文、许可缺失和实际工具返回属于可直接复核的观察。两者未混为教学实测。

## 7. 后续建议与未做事项

本轮已经清楚显示去重复的效果，**不扩大到 Transformer，也不立即追加生成**。

若要判断新版是否在总体课程质量上稳定更优，先增加一至两对同条件 p-limit 独立重复运行，检查不变量支架、迁移任务及许可遗漏是否只是随机差异；再考虑跨领域 Transformer。不是因为本轮失败就默认扩展评测。

必要后续仅是：发布课程前确保来源许可随副本保留；将能力目标与参与式完成条件分开；避免在逐关备注复制共享教学行为。此处是建议，未直接修改正式协议或实验课程。

本实验没有运行 Astro 构建、网页渲染、部署、真实教学、进度 GET/PUT 或完整上游测试；未安装依赖、未新增 Grader／优化循环，也未调用 finish/retry。已有 `schools/`、School Kit、正式生成协议及脚本没有修改；所有新增产物、记录和报告均在 `experiments/protocol-ab/`。
