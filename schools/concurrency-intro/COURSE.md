# concurrency-intro：理解并正确使用 p-limit

## 目标与可观察能力

依据用户给定的 JSON 与原始自然语言请求设计：学习 `https://github.com/sindresorhus/p-limit`，理解异步任务并发限制，并能正确使用 p-limit。课程是生成的学习材料，尚未进行真实教学或学习进度验证。

最终的小型迁移任务是：处理五个资源 id，最多两个操作同时未结束，其中一项失败，最后保留每项的成功值或失败原因。由这项任务倒推，学习者需要能：

1. 指出任务的提交、开始和完成，解释“等待 Promise”与“控制启动”的不同。
2. 用共享名额与等待队列，预测空位出现后下一项如何开始。
3. 创建一个共享 `pLimit(2)`，提交尚未调用的函数，返回覆盖完整操作的 Promise。
4. 区分完成顺序与结果排列顺序，解释 `activeCount` 与 `pendingCount`。
5. 处理任务拒绝，知道错误传播不等于取消；识别清队列和同一 limiter 嵌套等待的风险。
6. 给出受限批处理的可用核心方案，不要求真实网络环境、安装仓库或掌握所有导出。

## 输入约束如何影响设计

- **深度：introductory / 入门。** 选择名额模型、四个调度动作和最小正确调用模式；不推导微任务规范，不重写 limiter，不展开队列内部数据结构。边界只保留会造成错误使用的项目：提前启动、独立 limiter、漏 return、失败不取消、清除后未决、同一 limiter 嵌套等待。预期产出是能解释并写出基础批处理，而非审计库实现。
- **背景：熟悉 JavaScript 函数和 Promise，未系统学习并发限制。** 不复教函数语法或 Promise 全套 API。把 async 首次 await 前的执行、返回值关联任务生命周期、`allSettled` 状态形式就地补足。不假定具备线程、事件循环、网络取消或队列算法知识。
- **learningStyle 未指定。** 采用系统概念路线：调用时机 → 名额模型 → 用法 → 错误路径与迁移。每课有小例子、预测与反馈；可选纸上追踪或本地观察，不把某种学习偏好强加给学习者。
- **teachingMode：simple。** 通过教师备注采用一次一个小问题、等待回答、按需解释。它影响教学呈现，不改变课程深度；未来模式变化无需重建路线。
- **语言与原请求。** 正文、活动说明与教师备注使用中文，保留 `Promise`、`pLimit` 等技术标识。原请求要学会“使用”，所以可用核心代码与迁移活动比遍历仓库文件更重要。
- **选项保持可选。** 不增加必须完成的背景访谈、profile 配置或独立练习页；教师可在必要时简短确认背景，欢迎自然问题和短支线。

## 路线与依赖

| 顺序 / 文件 | 为什么存在 | 依赖 | 活动与预期结果 |
| --- | --- | --- | --- |
| 1 `01-start-and-slots.md` | 没有启动时机的直觉，就会误把 Promise.all 当限流器 | 已知函数和 Promise；其余就地解释 | 三任务时间线或 starts 日志；能分清提交、开始、完成 |
| 2 `02-share-a-limiter.md` | 把名额模型变成真正的共享并发限制 | 第 1 课的生命周期与排队 | 四任务手动释放或纸上追踪；修正提前调用、各自建 limiter 或漏 return 的一个例子 |
| 3 `03-failure-and-transfer.md` | 正确使用不能只覆盖全成功路径 | 第 2 课的共享调用与结果汇总 | 失败追踪，再完成五项受限批处理方案；清队列演示可选 |

没有按 README 标题或源目录排课，也没有必须安装/构建整个项目的任务。教师应遵循共享教学原则：一次一问、等待、友善反馈、欢迎提问和节奏调整。完成指参与活动并获得反馈、在协作修正后表现目标能力，而不是满分或重复测验。

## 已读材料、版本与本地原件

只使用给定 sourceRoot 中 `material-1` 的材料。供应方给定的版本为 commit `a8a6fbec4e0e866d6d779b10889bb4f5567e70eb`；读取的 `package.json` 标注包版本 `7.3.3`，Node.js `>=20`，ESM，以及 `yocto-queue` 依赖。课程按此快照解释，不声称当前 npm 发布版本或 GitHub 默认分支必然一致。未运行 git 命令，也未独立认证提交身份。

实际完整读取了以下五个原始文件，均逐字复制到 `public/sources/material-1/`，保留其相对 sourceRoot 路径：

| 已读文件 | 原始本地路径 | 原始 URL | 本地 HTTP 路径 |
| --- | --- | --- | --- |
| `readme.md` | `schools/concurrency-intro/materials/material-1/readme.md` | `https://github.com/sindresorhus/p-limit/blob/a8a6fbec4e0e866d6d779b10889bb4f5567e70eb/readme.md` | `/sources/material-1/readme.md` |
| `index.js` | `schools/concurrency-intro/materials/material-1/index.js` | `https://github.com/sindresorhus/p-limit/blob/a8a6fbec4e0e866d6d779b10889bb4f5567e70eb/index.js` | `/sources/material-1/index.js` |
| `test.js` | `schools/concurrency-intro/materials/material-1/test.js` | `https://github.com/sindresorhus/p-limit/blob/a8a6fbec4e0e866d6d779b10889bb4f5567e70eb/test.js` | `/sources/material-1/test.js` |
| `package.json` | `schools/concurrency-intro/materials/material-1/package.json` | `https://github.com/sindresorhus/p-limit/blob/a8a6fbec4e0e866d6d779b10889bb4f5567e70eb/package.json` | `/sources/material-1/package.json` |
| `license` | `schools/concurrency-intro/materials/material-1/license` | `https://github.com/sindresorhus/p-limit/blob/a8a6fbec4e0e866d6d779b10889bb4f5567e70eb/license` | `/sources/material-1/license` |

`license` 随源码副本保留 MIT 声明。教师备注使用 `{origin}/sources/...` 访问原件。输入文件已经是可读 Markdown/JavaScript，无需提取 PDF 文本。不把 URL 列表当作远程读取记录：实际读的是给定本地文件，没有重新获取网络内容。

未读 `recipes.md`、`index.d.ts`、`index.test-d.ts`、benchmark、scripts 或其他仓库文件正文；未读取整个仓库。未引入外部教程或扩展文档。

## 主要主张的来源账本

| 主张 | 已读原文位置 | 课程使用与证据边界 |
| --- | --- | --- |
| 接受待调用函数，按并发数调度 | README Usage、API `pLimit`、`limit(fn, ...args)`；`index.js` 的 `generator`、`enqueue`、`resumeNext` | 第 1–2 课。名额卡是生成的比喻，不是官方原文 |
| 排队、占用名额、结束补位 | `resumeNext`、`run`、`next`；测试 `concurrency: 1`、`activeCount and pendingCount properties` | 四任务表格是根据实现生成的追踪，不是官方计时结果 |
| 已保留名额时函数体可能尚未运行 | `enqueue` 的 `.then(run.bind(...))`；测试 `runs all tasks asynchronously` | 只解释异步调用的可见差别，不教授完整微任务排序 |
| 结果按输入顺序汇总 | README `limit.map` 的 Promise.all 等价式；测试 `map passes index and preserves order with concurrency` | 第 2 课。Promise.all 的一般语义作为已有背景的补充 |
| 正整数或 Infinity；0 与小数非法 | `validateConcurrency`；测试 `throws on invalid concurrency argument` | 固定 2 为主，Infinity 不提供有限保护是直接推论 |
| 失败传播，失败后仍释放名额 | `run` 的 `resolve(result)`、`await result`、catch 与 `next`；测试 `does not ignore errors`、`continues after sync throw` | 第 3 课。allSettled 是生成的汇总建议，不冒称 README 给出该方案 |
| 清队列不取消已开始任务，默认被清项未决，可选 AbortError | README `rejectOnClear`、`clearQueue`；实现对应两个分支；测试 `clearQueue`、`clearQueue rejects pending promises when enabled` | 清队列为防坑/可选活动，不当作主路线必需操作 |
| 同一 limiter 嵌套等待可能死锁 | README `limit(fn, ...args)` 警告；`resumeNext` 的名额条件 | 单名额事件链是生成解释，不运行挂起代码 |
| 并发上限不是每秒次数，也不是多线程 | README 包目标与 FAQ 的范围，结合 `resumeNext`/`run` 的控制条件 | 概念推论与一般 JavaScript 知识；不是对未读 p-throttle、p-queue 等库的实现声明 |
| 运行环境与依赖 | `package.json` 的 `type`、`engines`、`dependencies` | 只用于活动的运行条件，不把 package 文件改成学校配置 |

## 排除内容与理由

- 不教 `yocto-queue` 内部实现、异步上下文传播、完整事件循环与 Promise 规范：入门目标只需观察调度因果链。
- 不深入动态修改 `concurrency`、`limitFunction`、复杂 iterable 错误分支、类型声明：它们不影响当前迁移任务。前三项在已读实现与测试中可见，但不把看过等同于必须教；类型声明文件未读。
- 不讲性能基准、闭包优化、全功能队列、重试、限速、超时和网络取消：会将“正确控制开始”扩展成资源治理课程。仅说明必要区别。
- 不复制整个仓库，不创建填充式习题、安装教程或新验证框架；原有学校配置、基础设施、教学路由、package manifests 与进度数据不改动。`public/sources/material-1/package.json` 仅是原始来源副本。

## 活动与实际验证

模型生成的 `public/activities/concurrency-lab.mjs` 提供四种模式，导入逐字复制的 `index.js`，不是伪造 limiter：

- `starts`：比较直接启动与共享上限 1。
- `batch`：手动释放 B/C/D/A，检查共享上限 2、计数与输入顺序结果。
- `failure`：A 拒绝而 B 仍完成，观察整体拒绝与最终每项状态。
- `clear`：启用 `rejectOnClear`，检查等待任务 AbortError 与已开始任务继续。

在 Node.js `v24.16.0`、学校已存在的 `yocto-queue` 依赖环境中，实际运行四个模式均正常结束，内置断言通过；batch 观察峰值为 2，结果按 A/B/C/D 排列；clear 观察 A 成功、B 拒绝。用 `cmp` 比较五个来源副本，均与输入原件一致。没有安装依赖或运行官方 AVA 套件；官方清队列测试包含 Node.js 20 的 AVA 跳过条件，不能以此声称官方测试全通过。

活动通过本地 Node 运行；HTTP 文件供阅读，不承诺在浏览器直接执行。不能运行时，课程保留等价纸上事件追踪，不要求额外安装。没有执行实际网络任务、部署学校或验证网页呈现；也没有验证真实学习效果、进度记录或教学完成流程。

## 自查与可调整路线

已自查全路线：每个最终能力有前置解释和活动；来源与生成比喻/推论区分；结果 Promise 生命周期、内部 catch 不吞外部错误、清除不取消和未决风险已明确；正常路径活动使用真实库，不靠假实现。没有把短课长度当作入门深度，也没有为了覆盖文件目录增加课程。

可调整：

- 学习者已懂名额模型：第 1 课用一次短预测确认后加速，但不跳过“调用已启动”的区别。
- 对 Promise 仍不稳：就地用函数调用和 return 做短支线，暂不加新课。
- 偏好动手：运行活动后改自己的业务伪代码；偏好图示：使用表格与名额卡，不运行程序。
- 时间紧：保留主调用模式、失败追踪与最终迁移；`limit.map`、clear 演示和额外错误写法只做可选参考。
- 请求更深时：重新定义产出为能分析动态并发调节、嵌套预算、iterable 错误路径与实现不变量，再补充相应推导和复杂活动；不是仅拉长当前三课。新增材料须先实际读取并登记。

版本来源是输入方提供的快照标签，其他版本行为、远程最新发布、网页呈现、真实教学与进度验证均保持未验证。
