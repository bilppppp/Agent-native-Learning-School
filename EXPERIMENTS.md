# Agent-native Learning School 实验结论

2026-10-09（Asia/Shanghai）。结论：**两个对象都通过了代表关卡的真实 Pi 教学与网站进度闭环，值得继续发展为通用的小型学习工具。** 这次证明的是同一生成协议能处理源码和论文，并产生可上课的内容；尚不能证明任意材料都能稳定生成正确课程，也没有测量真人学习收益。

## 1. 课程生成质量

两门课都由本机真实 Pi、`openai-codex/gpt-6.1-sol`、`thinking=high` 执行同一份 `generation/protocol.md` 生成，输入差异只有材料、目标和输出目录。没有给模型预设逐关课程，也没有由我手工编写两套教学内容。模型先搜索/读取原始文件，再写完整 Markdown、教学活动、引用和路线说明，并进行自身检查。基础网站的共用修改由我实现。

- **React，五关**：从渲染/DOM 区别，到状态请求与 bailout、父子/memo、context/自身状态，最后迁移到陌生小组件树。它围绕“如何给一次重新渲染写因果解释”组织；源码符号服务于解释，不成为目录导航。排除了构建系统、开发工具、完整调度器、SSR/hydration、Compiler 实现等。活动限定普通渲染条件，避免“父组件永远重渲染所有后代”等绝对说法。
- **Transformer，五关**：从 Attention 数值混合出发，再补充位置/多头，构建 encoder，理解 decoder 的移位/遮罩，最后串起整体。不是从论文摘要、相关工作和实验表格开始。排除了优化器、训练配置、BLEU 复现及现代变体；保留了理解原始架构必需的 post-norm、FFN、残差、cross-attention。

每关的存在理由、能力关系、来源、排除项和未确认内容分别在 `schools/*/COURSE.md` 中。五关这个数量是模型各自选择的结果，协议没有固定关卡数量。课程正文、教学备注和路线都可编辑。

## 2. 真实教学体验

验收使用**真实 Pi RPC 进程**，不是另一个模型模拟 Pi，也不是预写对话。`scripts/pi-dialogue.mjs` 只传递逐轮输入、显示 Pi 输出和保存记录。学习者由 Codex 主 Agent 担任，回答和追问根据实际上一轮输出决定；不是人类试课或学习效果测量。教师使用 `thinking=medium`。

**React 第一关**：Pi 先问对 rerender 的直觉。我故意把它解释成屏幕变化，Pi 纠正后，逐步引导 Meter/StableLabel 的点击追踪：state 属于谁、哪些函数运行、哪些文字需要 DOM 修改。我自然追问两条日志是否等于两次页面更新；Pi 读取官方 Strict Mode 段落后解释区别，再上报完成。记录：`evidence/teaching/react.md`。

**Transformer 第一关**：先预测哪个 key 权重大。我给出“差异意味着更多新信息”的错误解释，Pi 用点积反馈，再引导值向量加权和。我追问除以 √维度是否为了归一化；Pi 区分缩放与 softmax，随后让我预测只改变 V 的结果。应我的请求，它实际下载并运行生成的 Python 程序，结果权重不变、第二输出坐标翻倍，再上报完成。记录：`evidence/teaching/transformer.md`。

两次均每轮围绕一个小问题，没有整套选择题、完美分数门槛或错误后卡关；追问没有被当作偏离剧本。React 的代表活动是代码推理，Transformer 是数值预测加执行观察。未逐关试完全部十关，因此不能把这种体验推广为已验证的全课程一致性。

## 3. 来源可靠性

React 实现固定为 **v19.2.0 / `ae74234eae6ebd62f19190731278e20bc1c37d51`**，另有 2026-10-09 获取的官方文档文本；课程明确区分源码版本与可变化的文档。抽查了 `dispatchSetStateInternal` 的 eager equality 分支、memo 的 shallow props/state/context 检查及相关原始测试。Transformer 使用 **arXiv:1706.03762v7**；抽查 Eq. (1)、第 3.1–3.2 节的原始 block 布局、mask 和移位说明。例子、类比和数学推论被标为生成内容。

实际工具记录显示，Pi 在 React 教学中获取 Render and Commit/useState 原文，在 Transformer 教学中获取论文相应段落，并运行数值活动。所有十个课程 API/页面返回成功；React 引用的 12 个、Transformer 引用的 3 个本地 HTTP 资源均可获取。React 13 个原始文件副本（包括许可证）及 Transformer 两个材料副本与本地来源逐字节一致。这里没有复杂事实审核器，也未穷尽审核每个解释。

React 的 equality probe 仅执行 JavaScript 比较，**没有执行 React 运行时**；仓库原始 React 测试是读取证据，并未运行完整测试套件。Transformer Python 示例真实执行，但不是训练模型、翻译复现或论文实验。

## 4. 复用与实际新增

主要复用 [School Template](https://github.com/agentschools/school-template) 的 Astro 内容系统、课程导航、注册/颜色/身份、profile API、进度 API、本地 Cloudflare KV、`?sid=` 恢复、轮询勾选、自动下一关、Prompt 复制、`llms.txt` 和 OpenAPI。未因模板更新较早而弃用。其原流程依赖作者协作、统一四题测验，不能直接证明陌生材料自动课程生成。

参考 [Pi School](https://github.com/agentschools/pi-school) 的 Pi `bash`/`curl` 发现机制、逐个问题推进和自然反馈。新增内容只包括共享生成 Prompt、两个输入文件、scaffold/generate/start 小脚本、生成课程与来源副本，以及验收用 RPC 桥和记录。通用 scaffold 改了配置品牌、Pi 文案、共享教学策略、空栏目显示和各 School 的 Vite 缓存目录；KV 和进度逻辑没有重写。

[OpenCode School](https://github.com/agentschools/opencode.school) 是这些学校的体验/架构参考。[Codebase to Course](https://github.com/zarazhangrui/codebase-to-course) 的行为导向源码讲解可借鉴，但其输出是 HTML 课程，未提供本次 Pi 进度闭环。[Repo2NotebookLM](https://github.com/bilppppp/Repo2NotebookLM) 处理仓库打包与 Notebook 同步；[Archify](https://github.com/tt-a1i/archify) 生成图示。后三者未加入实现，因为本次精选原文和小活动已经足够，无须引入另一个平台或强制可视化。

第三份材料可以原样复用生成协议、脚本、网站和 Pi 教学发现/进度机制；必须重新生成能力拆解、知识取舍、证据选择、路线和活动。源材料下载/提取仍需准备，本次没有构建任意 URL 的自动摄取系统。

## 5. 最明显的困难和真实限制

- **生成机制**：模板本身只解决承载和协作写课。陌生材料自动课程必须明确从最终能力反推，要求读取来源、排除无关知识，并将完成定义为活动参与。否则容易退化为完整仓库/论文介绍。
- **材料理解**：React 的“状态相同”“memo”“父子关系”都需要说明边界；论文需区分原始 post-norm 与后来流行的实现。抽取文本的公式布局不佳，课程用对应公式和小算例重新表达，并保留 PDF。
- **教学指令**：React 首次完成记录中 Pi 把 `model` 写成 `unknown`，没有编造身份；进度本身正确。验收桥后来增加显式模型 ID 注入，在下述连续教学补测中，Transformer 第二关的真实完成记录正确保存了 `openai-codex/gpt-6.1-sol`。React 原始记录仍保留，未重写完成状态。普通 `pi` 的模型自知能力不能假定可靠。
- **网站运行**：两站最初共享 node_modules 下的 Vite 缓存，导致依赖预优化冲突；改成各站 `.vite` 后恢复。最终并行构建又暴露调试端口选择竞态；依据已安装 adapter 的类型定义设置 `inspectorPort: false`。同一 School 的开发/构建进程仍共用缓存，并发配置热重载曾失败；已重启服务，并在 README 明确先停止开发服务再构建。Cloudflare adapter 可以直接使用本地 KV，未创建远端 namespace。Chrome 一次自动导航显示客户端屏蔽，刷新恢复，后续可见完成状态。
- **运行条件**：模型网络曾出现 `fetch failed`，Pi 的有限自动重试后继续；不是课程读取失败。本地模板依赖安装报告存在已知依赖漏洞；没有做安全升级或生产部署评估。当前服务仅用于本地实验。

## 6. 验证状态与是否继续

| 项目 | 真实状态 |
| --- | --- |
| 两套完整课程和同一生成协议 | 已由同一真实 Pi 模型生成；文件可读可改 |
| 十个课程网页、API、本地来源 | 已逐个通过实际 HTTP 检查 |
| 两站构建 | 均已成功构建 |
| 模板核心身份/进度/内容工具测试 | 复用测试 43 项通过；不等价于教学验证 |
| 代表关卡教学 | 两站第一关、Transformer 第二关已真实逐轮完成；Codex 代测 |
| 完成上报与网页状态 | 由 Pi 调用 PUT，浏览器实际看到勾选和下一关 |
| 新 Pi 会话续学 | 两站均关闭旧 Pi、启动新进程；重新读取服务器进度并从第二关开始 |
| 浏览器刷新及本地服务重启恢复 | 最终两站 HTTP 200；原有完成记录保留，浏览器刷新后仍显示第一关勾选 |
| 全部关卡教学、真人收益、第三种材料 | 尚未验证 |
| 更新后的模型元数据上报 | Transformer 第二关已通过真实上报验证；原 React 记录保留 unknown |
| 生产安全/部署 | 尚未验证 |

值得继续。主要基础已经存在：无需新的 Harness、数据库或 Renderer，就能把目标驱动内容交给 Pi 自然教学，并使用原有网站同步进度。下一步最有价值的是让真实学习者试用这些已有课程，检查长程衔接和困难点，以及用第三种材料检验协议的稳定性；增加架构不能替代这些证据。

## 补测：完课后直接回复“继续”

之前记录证明了完课询问和新会话恢复，但没有实际回答完课后的“继续”。因此按用户要求，仅补测缺少的连续流程，使用原测试身份 `nimble-builder-9936`，没有重做已完成的第一关。

实际完成第二关 **Tokens, order, and multiple heads** 的顺序比较、位置向量相加与多头宽度追踪后，Pi 自行 PUT 上报完成，并询问：**“要继续下一课 Building an encoder block（构建编码器块）吗？”** 测试学习者只回复 **“继续”**，未另外提供第三关标题或启动 Prompt。Pi 随后读取第三关资料并开始教学，询问 attention 和 FFN 哪一个能让 `bird` 获得 `small` 的信息。补测在这个问题处停止，第三关没有标记完成。

浏览器在第二关页面实际看到自动更新：侧栏第二关显示勾选，当前 URL 变为 `/lessons/building-an-encoder`，页面标题为 **Building an encoder block**。API 记录保留前两关完成，第二关 `source: agent`、`model: openai-codex/gpt-6.1-sol`。全部对话及工具调用追加在 `evidence/teaching/transformer.md`、同名 `.jsonl` 中。

结论：**Pi 会在单关完成后询问是否继续；直接回复继续可以衔接下一关，网页能够同步已经完成的关卡。** 网页自动导航由完成进度上报触发，因此可能早于学习者回复继续；进入下一关本身不会将该关标记完成，也不保存题目级进度。
