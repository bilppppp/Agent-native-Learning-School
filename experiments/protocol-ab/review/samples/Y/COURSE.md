# p-limit：从任务入口到调度与收尾

## 目标与最终迁移任务

面向熟悉 JavaScript 函数与 Promise、尚未系统学习并发限制的学习者。学完应能把一个“多个入口共享异步资源”的批处理改成正确的 p-limit 调度：只在获准时启动完整任务，汇总成功与失败，解释计数变化，安全丢弃待执行任务，并识别嵌套等待造成的死锁。

最终活动不是重写库，而是修复一个小型“读取记录并解码”的流水线：批量入口和单条重试共享容量 2；一次任务失败不阻止收集其他结果；停止时拒绝排队任务、允许已启动任务结束。学习者交付短代码或伪代码、状态轨迹和一段基于源码的解释。无需网络、安装、构建或性能测试。

可观察能力：

- 区分提交、占用槽位、实际调用与完成，识别提前启动和漏返 Promise。
- 用共享 `limit`、参数透传与 `limit.map` 正确组织有限批次，区分结果顺序与完成顺序。
- 沿 `generator → enqueue → resumeNext → run → next` 追踪任务，解释微任务边界、占位计数和 Promise 状态采纳。
- 从两个错误路径解释“内部捕获不吞掉调用者错误”，以及 map 迭代失败为何不会取消已提交工作。
- 推导动态并发变更与两种 clearQueue 分支的结果，区分拒绝、丢弃和取消。
- 画等待关系，避免同一限流器的嵌套死锁，选择共享限流器或 `limitFunction`。
- 说明 p-limit 不保证每秒请求数、不提供 CPU 并行、也不自动约束排队内存。

## 设计约束如何改变课程

`depth: deep` 与“深入核心源码”共同决定：不仅会调用 API，还要阅读实际分支、推导调度不变量、解释同步抛错与异步拒绝、遍历失败、动态降额和死锁边界。深度体现在这些能力和组合迁移任务，不是加长 API 列表。

已知背景仅为函数和 Promise。无需 TypeScript、Node 异步上下文、队列实现或事件循环专家知识；微任务、Promise 采纳、队列与资源等待在用到的地方解释。已有 Promise 基础不等于已掌握调度语义。

具体例子与适量实践的偏好决定：先给任务时间线，再读实现；用手动放行任务替代不稳定的计时竞猜；每课一个主活动，源码阅读为解释服务。两份小辅助材料提供状态表和无需依赖的 Promise 实验。`teachingMode: simple` 只影响初始互动节奏：一次一个小问题、短反馈，不删减深度目标，也不固定未来教学方式。中文为课程语言，保留真实技术标识符。

## 路线与依赖

| 课 | 为什么存在 | 依赖与完成证据 |
| --- | --- | --- |
| 1. 槽位与任务入口 | 建立限制“尚未完成的调用”而非 Promise 数量的模型 | 使用既有 Promise 基础；能预测一组任务开始/结束次序并修复提前启动 |
| 2. 把完整工作交给限流器 | 将模型用于批处理、参数透传与共享入口，定义资源寿命 | 依赖 1；能把读取和解码放进同一返回链，选择 all/allSettled |
| 3. 沿源码追踪一次交接 | 解释 API 背后的占位、队列和微任务，不把同步计数当作函数已执行 | 依赖 1–2；完成逐步状态表，指出递增/递减及真正调用位置 |
| 4. 失败如何穿过调度器 | 区分调用者状态与槽位释放；深读 map 的第二条错误路径 | 依赖 3；分别解释任务失败和迭代失败，收到轨迹反馈 |
| 5. 改容量与清队列 | 处理生产代码常见收尾与动态配置，避免悬空等待 | 依赖 3–4；推导降额、清队列后的任务和 Promise 状态 |
| 6. 共享范围与死锁 | 理解容量属于哪个实例，避免把受限任务再次排在自己后面 | 依赖 2–5；画等待环并提出不偷偷突破资源上限的修复 |
| 7. 迁移：修复双入口流水线 | 把用法、机制和边界组合到一个新情境 | 依赖全部；参与代码修复与轨迹解释并获得反馈，不要求零错误 |

没有单独的访谈课；必要时教师用一个简短问题校准 Promise 基础。课 1–2 可快速通过已有经验，课 3–6 应围绕真实实现，不把每行都变成测验。想换例子可以把读取记录换成文件或 API；不引入未经读取的新库。想短暂走实用路线可先浏览第 7 课题面，再返回缺失机制，但最终深度目标不变。异步上下文细节是第 3 课可选短 detour，不要求掌握 AsyncLocalStorage。

## 来源与版本

唯一外部来源是输入中已提供的本地快照 `materials/material-1/`，原仓库 https://github.com/sindresorhus/p-limit 。所有技术引用固定于输入标注的 commit `a8a6fbec4e0e866d6d779b10889bb4f5567e70eb`；`package.json` 自报版本 `7.3.3`。未运行 git，未独立核验快照和 commit 的对应关系。

原文件未改动，按 sourceRoot 内相对路径复制到 `public/sources/material-1/`。例如原始 URL 为 `https://github.com/sindresorhus/p-limit/blob/a8a6fbec4e0e866d6d779b10889bb4f5567e70eb/index.js`，本地阅读 URL 为 `/sources/material-1/index.js`；教师注使用 `{origin}/sources/material-1/index.js`。同一 URL 模式适用于下表全部文件。本课程没有 PDF、外部补充文献或提取文本。

实际完整读取文件：`index.js`、`readme.md`、`test.js`（分两段读完）、`index.d.ts`、`package.json`、`recipes.md`、`license`。这些文件均已复制；license 用于保留原版权许可。只列举了其他文件路径，未阅读 benchmark、CI、安全说明、类型测试或队列依赖实现，不声称读过整个仓库。

### 简明来源账本

| 主要结论 | 原文件中的精确位置 | 本地 URL |
| --- | --- | --- |
| 延迟调用、共享 limiter、参数透传 | readme.md `Usage`、`limit(fn, ...args)`；index.js L50–68；test.js `accepts additional arguments`、`shared context with a limited provider helper` | `/sources/material-1/readme.md`、`/sources/material-1/index.js`、`/sources/material-1/test.js` |
| 计数先占位，函数异步运行 | index.js `resumeNext` L19–25、`enqueue` L50–64、`run` L32–48；test.js `runs all tasks asynchronously`、`activeCount and pendingCount properties` | `/sources/material-1/index.js`、`/sources/material-1/test.js` |
| 异步执行上下文设计意图与检查 | index.js L53–58 注释；test.js `propagates async execution context properly` | `/sources/material-1/index.js`、`/sources/material-1/test.js` |
| 状态采纳、同步抛错后继续、错误传播 | index.js `run` L32–48；test.js `continues after sync throw`、`does not ignore errors`、`non-promise returning function` | `/sources/material-1/index.js`、`/sources/material-1/test.js` |
| map 顺序、参数、迭代失败仍运行已提交任务 | index.js `map` L106–126；readme.md `limit.map`；test.js `map passes index and preserves order with concurrency`、`map does not leave unhandled rejections when the iterable throws`、`map rejects immediately with the iterable error and still runs already scheduled tasks` | `/sources/material-1/index.js`、`/sources/material-1/readme.md`、`/sources/material-1/test.js` |
| 动态容量、合法值、清队列两分支 | index.js L77–104、`validateConcurrency` L144–148；test.js `change concurrency to smaller value`、`change concurrency to bigger value`、`clearQueue`、`clearQueue rejects pending promises when enabled` | `/sources/material-1/index.js`、`/sources/material-1/test.js` |
| 单函数范围、清理方法、同实例嵌套警告 | index.js `limitFunction` L133–142；readme.md `limitFunction`、`limit(fn, ...args)`；index.d.ts `LimitFunction`、`limitFunction` 签名 | `/sources/material-1/index.js`、`/sources/material-1/readme.md`、`/sources/material-1/index.d.ts` |
| 部分结果与批次用法、默认清队列的悬空风险 | recipes.md `Error handling with partial results`、`Graceful shutdown`；readme.md `rejectOnClear`、`limit.clearQueue()` | `/sources/material-1/recipes.md`、`/sources/material-1/readme.md` |
| ESM、Node 要求、队列依赖版本范围 | package.json `type`、`engines`、`dependencies` | `/sources/material-1/package.json` |

所有任务时长、记录、门控实验与状态表是模型生成示例，不是上游测试输出。并发非速率限制、批次内存与等待环分析是根据已读实现所作推论，会在课内明示。通用 Promise 小实验不是 p-limit 替身。

## 取舍、风险与验证边界

保留核心 148 行实现的关键控制流，但不讲 yocto-queue 链表内部（依赖源码未提供）、完整事件循环各阶段、TypeScript 推导、性能基准、复杂流式背压、自动自适应并发或其他库实现。它们不直接服务当前迁移任务，且部分无可读证据。队列只按此实现使用的 enqueue/dequeue/size/clear 接口讨论。

`recipes.md` 的 `Graceful shutdown` 讲默认清队列行为，不等同于推荐的 rejectOnClear 收尾；`Dynamic concurrency` 只是示例，不证明自动控制策略稳定，不保证每秒配额。教师不要直接把它们当作生产最佳实践。测试标题 `concurrency: 4` 的正文实际设为 5；以代码为准。测试含 Node 20 的 DOMException/AVA 跳过分支，不能据此否定库在该环境的 AbortError 行为。

已执行并检查 `/activities/promise-boundaries.mjs` 的纯 Promise 输出；复制文件通过字节比较。课程内使用 p-limit 的片段已按当前源码人工审查，但未执行：本地没有提供 yocto-queue/AVA 等依赖，也没有安装、跑上游测试、构建或浏览器验证。源码测试是行为证据，不是本次执行结果。真实教学、进度记录与学习效果尚未验证，由后续流程负责。

自审关注：目标有对应活动；各课对象不同，避免重复 API 清单；每项源码主张可定位；先补必要概念再推导边界；不把拒绝说成取消；不把 resolve(result) 说成任务已完成；活动完成意味着参与并获得反馈，不要求答对所有问题。
