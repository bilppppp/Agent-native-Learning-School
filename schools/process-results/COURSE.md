# process-results：从子进程事件到 Promise 结果

这条中文路线只服务一个目标：理解当前 `scripts/materials.mjs` 的 `command`，能预测 stdout/stderr、退出码、输出选项与超时共同产生的 Promise 结果。初始教学模式为 simple；课程本身系统覆盖所需机制，切换模式不会改变知识范围。

## 目标、基础与范围

学习者已有 JavaScript 和 Promise 基础，所以不重教语法或 Promise 入门。事件回调、pipe 与直接继承、close 的 code、信号与计时器在使用处解释。系统深度体现在能追踪分支、处理退出 0 但拒绝的例外、说明超时成功与可能继续等待的条件，而不是扩大到完整进程管理。

完成路线后，学习者应能区分“子进程写过”“终端看见”“函数捕获”和“Promise 返回”；按 stdio 分支计算成功字符串；按 code 与日志标记判断拒绝；区分 child error 与包装 Error；解释超时不等于硬截止，并对一个新的组合调用给出带条件的预测。

代码预测和小型 Node 观察决定了活动形式：先预测一个具体案例，直接调用来源快照，再比较输出并接受反馈。不安装项目、不使用远程沙盒。完成条件是参与与反馈，不是每道题正确。Simple 模式建议教师一次只推进一个问题，允许解释、追问和短暂绕路。

## 四关路线

| 顺序 / slug | 为什么存在 | 前置依赖与可观察产出 |
| --- | --- | --- |
| 1 / output-to-result | 建立 data 累积到 close 判定的基本链条 | Promise 基础；比较成功值与非零错误信息 |
| 2 / stdio-options | 解释显示与捕获分离，以及退出 0 的日志拒绝 | 第一关的缓冲字符串；预测两种 inherit 路径 |
| 3 / errors-and-timeouts | 加入启动错误、信号退出及超时边界 | 前两关的判定公式；解释 timeout 与 timeout-zero 的差异 |
| 4 / predict-a-call | 组合机制并迁移回原始调用者 | 前三关；预测新组合并指出时序条件 |

最终迁移活动是第四关的 A/B/C 情境，选一项开始。无需单独的背景访谈关。已理解某个基础点时缩短说明；若误把 stderr 当作失败，回第一关；若误把 timeout 当作 reject，回第三关的回调动作。不要用增加无关课题来调整节奏。

## 来源与版本账本

唯一学习来源原始绝对路径：`/Users/gravity/Desktop/AI/Agent-native Learning School /scripts/materials.mjs`（仓库目录末尾确有空格）。CLI 准备副本：`materials/material-1/materials.mjs`；未修改的网页副本：`/sources/material-1/materials.mjs`。其路径相对 CLI 的材料根保留为 `material-1/materials.mjs`。

版本是 CLI 记录的 `local file`，不是发布版本或 Git commit。本次快照 SHA-256：`0b34736cdd7e6b9f4172ccc4c6b4abecd06a9d8d9001885120aca8e6907c0c8b`。未改写原件，也未额外声明授权许可。

| 主要论断 | 实际源码位置 |
| --- | --- |
| stdio 由两个选项共同决定 | command，第 7–9 行 |
| 分别累计输出，成功 trim，失败优先 stderr | command，第 10、14–17 行 |
| 日志检查匹配 stdout + stderr，可拒绝退出 0 | command，第 17 行 |
| timer 只追加 stderr 并发 SIGTERM，close 清理 | command，第 11–13 行 |
| child error 直接拒绝，SIGINT 转发与监听清理 | command，第 16、18–19 行 |
| clone 超时、commit 返回值比较、curl 输出解析 | prepareMaterials，第 38–42、54–55 行 |

实际阅读：根 README.md、AGENT_GUIDE.md、AGENTS.md、scripts/school.mjs、generation/protocol.md、scripts/generate.mjs、scripts/materials.mjs，以及 CLI 保存的 inputs/process-results.json、本 School 的 GENERATION.md 和原始材料副本。原始文件全文已读取，课程主张仅使用上述相关位置；没有读取整个仓库，也没有引用未读的测试或外部文档。

## 活动、排除与不确定性

`public/activities/observe.mjs` 是模型生成的教学活动，导入公开的原始源码，不是假实现，也不是新增验证框架。从 School 目录运行 `node public/activities/observe.mjs CASE`；不带参数只列案例。`all` 用于创建阶段观察，实际教学应先展示单个案例的代码并等待预测。

排除下载、HTML/PDF 提取、Git 工作流、shell 引号、完整事件循环、进程树终止策略、编码与超大输出流治理，因为它们不是预测本函数当前分支的必要前提。保留输出块不等于行与跨流无全局顺序的提醒，以避免错误预测；不展开一般流编程教程。

创建阶段在 macOS、Node v24.16.0 实际运行了 12 个案例：streams、failure、empty-failure、inherited、tee、marker、marker-default、marker-stderr、marker-cross-stream、timeout、timeout-zero、missing。观察到默认警告仍成功、直接继承返回空串、pipe 转写保留返回值、退出 0 的日志拒绝、超时的 null code 拒绝、处理 SIGTERM 后退出 0 的成功，以及 ENOENT 的直接拒绝。观察脚本自身退出 0，因为它捕获并展示预期拒绝。

超时案例的信号行为有平台与调度条件；600ms 不是严格执行时刻。忽略 SIGTERM 后可能继续等待属于源码推断，未运行无限挂起活动。SIGINT 转发和其他平台没有实测；构建不能证明这些边界在所有环境一致。来源未提供独立的测试材料，本次没有假称项目测试覆盖。

创建、课程检查、Node 活动与网站构建是本次验证范围。尚未启动网站、验证 HTTP 读取、进行真实教学、创建学习身份或验证进度同步；本课程不包含伪造的学习完成状态。
