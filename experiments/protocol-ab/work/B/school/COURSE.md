# p-limit：从任务生命周期到调度器源码

## 目标与迁移任务

目标不是记住 API，而是理解异步任务的并发限制，并能正确使用本材料版本的 p-limit。结课时，学习者为一批模拟资源任务设计一个共享并发上限为 2 的执行器：延迟启动、覆盖完整资源生命周期、保留输入顺序的成功/失败报告；再解释降低上限、清队列和嵌套调用时的行为。任务不需要网络、安装依赖或构建项目，可用代码与手工状态轨迹完成。

可观察的能力：

- 区分提交、获得槽位、调用函数、任务结束和汇总结果；预测不同耗时任务的启动/完成顺序。
- 选择 `limit(fn, ...args)`、`limit.map` 或 `limitFunction`，识别提前启动、提前返回、串行提交、多个 limiter 分割预算等错误。
- 沿 `generator → enqueue → resumeNext → run → next` 追踪计数、微任务和三个 Promise 的角色，解释为什么成功和失败都能释放槽位。
- 区分调用者收到拒绝与调度器继续工作；解释 `map` 的 mapper 错误和迭代器错误两条路径。
- 推导清队列的两种结算策略、动态升降并发的边界和同一 limiter 的嵌套等待死锁。
- 把上述推理用于一个有失败、变更和停止需求的小批处理设计，并给出可检查的证据。

## 输入约束如何改变课程

背景仅假定熟悉 JavaScript 函数与 Promise，不假定掌握微任务、Promise 吸收、同步 iterable、资源预算或死锁。第 1 课建立槽位与时间线，第 3 课就地补充微任务和 Promise 结算，第 4 课就地解释 iterable；不另开泛泛的 JavaScript 预备课程。

`depth: deep` 与“深入核心源码”使范围包含实际分支、计数时机、错误传播、迭代异常补救、运行时改并发、清队列和资源等待环；要求学习者能推导机制而非只运行 Usage 示例。深入不意味着复制整个仓库或学习全部生态。本路线不推导 JavaScript 引擎实现。

偏好“具体例子、解释和适量实践”体现在同一套 A/B/C 时间线、状态表、短源码片段和每课一个核心活动。先有现象再读机制。`teachingMode: simple` 只意味着初次解释可简短、逐步推进；不删减深度能力，不在教学备注中固化模式。背景/偏好选项不构成学习前置门槛。

## 路线与依赖

| 课 | 为什么存在 | 依赖与产出 |
| --- | --- | --- |
| 1. 槽位与任务生命周期 | 先定义限制的对象，避免把 Promise.all 当作调度器 | 只需 Promise 背景；产生可预测的时间线与预算模型 |
| 2. 把限制放在正确边界 | 从模型转为 API 使用；处理完整资源生命周期和共享实例 | 用第 1 课的槽位模型；能修复提前启动/返回并选择 API |
| 3. 沿核心源码走一遍 | 深入计数与执行的非同时性，理解内部 Promise 和微任务 | 用第 2 课的任务回调；可画出调度链与同步快照 |
| 4. 失败、汇总与 map 边界 | 区分调度和错误政策，读实际异常分支 | 用第 3 课的三种 Promise；能解释失败继续执行和迭代失败补救 |
| 5. 改上限与清队列 | 生命周期控制不是取消；检验固定上限模型的适用边界 | 用第 3–4 课的计数/结算；推导降并发与未结算 Promise |
| 6. 嵌套等待与预算边界 | 正确调用仍可能死锁或超出总资源预算 | 用第 2、3、5 课；能画等待环并比较修复方式 |
| 7. 迁移：可解释的批处理器 | 综合设计而非再讲一遍 API | 用前六课；交付短代码、轨迹和错误/停止说明并收到反馈 |

## 来源与版本

唯一输入仓库原址：<https://github.com/sindresorhus/p-limit>。输入声明的 commit/version 为 `a8a6fbec4e0e866d6d779b10889bb4f5567e70eb`；所读 `package.json` 声明包版本 `7.3.3`、ES module、Node.js `>=20`，依赖 `yocto-queue ^1.2.1`。未用 git 校验提交身份，课程版本以提供的元数据和本地文件为准，不以线上最新版为准。

原始本地根为 `materials/`。实际全文读取了以下六个文件，均原样复制，路径相对于该根保持不变。没有读完整仓库。

| 文件/本地原始路径 | 教师/读者本地副本 URL | 选择原因 |
| --- | --- | --- |
| `materials/material-1/index.js` | `/sources/material-1/index.js` | 唯一核心机制依据 |
| `materials/material-1/readme.md` | `/sources/material-1/readme.md` | API 契约与嵌套警告 |
| `materials/material-1/test.js` | `/sources/material-1/test.js` | 对照同步快照、失败、map、动态变更 |
| `materials/material-1/index.d.ts` | `/sources/material-1/index.d.ts` | 返回类型、参数、实例暴露能力 |
| `materials/material-1/recipes.md` | `/sources/material-1/recipes.md` | 资源生命周期、部分结果、停止的应用依据 |
| `materials/material-1/package.json` | `/sources/material-1/package.json` | 版本、运行环境与依赖边界 |

每个文件的上游固定版本地址为 `https://github.com/sindresorhus/p-limit/blob/a8a6fbec4e0e866d6d779b10889bb4f5567e70eb/<文件名>`。教师备注使用 `{origin}/sources/material-1/...`，正文用相对站点 URL。本材料没有 PDF，不需要提取文本；复制的都是原文，未改写。

### 精简主张账本

| 主张 | 实际源码/文档位置与交叉证据 |
| --- | --- |
| 接受正整数或 Infinity；rejectOnClear 必须是布尔值 | `index.js:3–14,144–148`；`test.js` 的 `throws on invalid concurrency argument` |
| 先占槽位，函数在 Promise reaction 中调用；pending 是队列大小 | `index.js:19–29,50–75`；测试 `runs all tasks asynchronously`、`activeCount and pendingCount properties` |
| 函数完成/失败后释放槽位，拒绝仍传给调用者 | `index.js:32–47,66–68`；测试 `continues after sync throw`、`does not ignore errors` |
| 内部入队方式意在保留异步上下文 | `index.js:53–58` 的注释；测试 `propagates async execution context properly`；不推导 Node 引擎内部机制 |
| map 收集输入并 Promise.all；迭代失败补挂 catch | `index.js:106–126`；测试 `map passes index and preserves order with concurrency`、`map does not leave unhandled rejections when the iterable throws`、`map rejects immediately with the iterable error and still runs already scheduled tasks` |
| 清队列不终止已占槽位的工作；默认丢弃不结算，选项开启则拒绝 | `index.js:77–89`；README `limit.clearQueue()`；测试 `clearQueue rejects pending promises when enabled` |
| 改并发不抢占，升高在微任务中补位 | `index.js:91–104`；测试 `change concurrency to smaller value`、`change concurrency to bigger value` |
| limitFunction 自建 limiter，额外仅暴露 clearQueue | `index.js:133–142`；`index.d.ts` 的 `limitFunction` 返回类型；测试 `limitFunction exposes clearQueue` |
| 同一 limiter 内嵌套 await 可死锁 | README `limit(fn, ...args)` 警告；结合 `index.js:19–47` 作等待环推导 |
| 部分结果与完整 fetch/json 生命周期 | recipes 的 `Error handling with partial results`、`Fetch multiple URLs`；README 的 Usage |

## 取舍、推论与不确定性

- 所有时间线、等待环、资源计数、迁移样例均为模型生成的教学例子；不是上游测试原样输出。JavaScript 的 Promise.all/allSettled、微任务与 Promise 吸收作为就地语言解释，不伪称是 p-limit 独有能力。原生 Promise 探针可验证其中一部分。
- 没有 `yocto-queue` 源码，不讲其内部存储/复杂度。队列顺序按入队/出队接口和使用预期推理，不宣称做过依赖源码审计。
- AsyncLocalStorage 只解释为什么保留内部 Promise 接力以及存在验证测试；不教授 Node async_hooks 细节。测试名 `concurrency: 4` 的实际变量是 5，不把名称当上限证据。
- recipes 的默认清队列停止示例使用 `rejectOnClear: false`，最终 allSettled 可能一直等待；同时未解决所有“已占槽位但回调尚未调用”的快照问题。本课采用显式结算政策，不照搬 `process.exit` 作为一般停止方案。Dynamic concurrency recipe 仅作应用想法，不声称它是完备限速、重试或稳定控制算法。
- `Infinity` 会取消有效的有限槽位约束；大批 `map` 会一次性遍历/提交，不等于流式背压。限并发不保证每秒请求数、不制造 CPU 并行；后两项是从机制边界得出的解释，不是性能实验结论。
- 排除 benchmark、基准脚本、CI、安装发布、生态库源码和完整 TypeScript 教程：不服务当前迁移任务。未读取外部链接；不教授未读取的 p-map/p-queue 实现。大规模流式队列、公平性保证、真实网络取消和生产重试系统留作后续。

## 调整路线与验证范围

若学习者对延迟回调已熟悉，可快速完成前两课活动后进入源码，但不跳过生命周期边界的反馈。若微任务困难，第 3 课先做原生探针，再将三种 Promise 逐一映射；不强迫先学整套事件循环。若偏向应用，先按轨迹完成最终任务，再回看第 4–6 课定位错误；深度的完成能力仍不变。若未来目标包含真实请求取消或海量输入，需要额外读取对应来源后扩课，不凭本课程推测其他库。

生成时核对了完整路线、所有 lesson frontmatter、本地引用、代码围栏和源副本字节一致性，并修正了活动备注与正文边界不一致的表述。31 个 JavaScript 正文片段通过 Node 仅语法检查，这不代表执行验证。`public/activities/promise-probe.mjs` 是无依赖、模型生成的原生 Promise 活动，已在本地 Node 执行；具体输出和适用范围见第 3 课。p-limit 示例未执行：当前输入没有其运行依赖，本任务不安装、不构建、不运行全套上游测试。源码测试是阅读的证据，不是本次执行结果。未进行真实教学、浏览器渲染或学习进度验证。
