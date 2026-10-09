# concurrency-deep：理解并正确使用 p-limit

## 目标与倒推的迁移任务

原始请求与目标一致：“理解异步任务的并发限制如何工作，并能正确使用 p-limit 控制任务执行”。课程不是仓库导览，也不是学生已经接受过的教学记录。

终点是一项小型迁移任务：为四个不同耗时、其中一个失败的输入设计完整处理，使用共享的最多两个槽，保留逐项结果与输入对应关系，通过任务体内计数或手动状态表验证；再选择清队列、共享调用方或动态降额的一项变式，并解释其资源/等待策略。任务完全可在本地或纸面完成，无需 HTTP 服务、安装上游项目或修改基础设施。

可观察能力：

1. 从函数调用找出真实启动时刻，区分提交、占槽、函数体开始与完成。
2. 手算固定额度时间线，推导耗时下界，区分并发、速率与 CPU 并行。
3. 正确使用 `limit(fn, ...args)`、`limit.map`、`limitFunction`，使返回 Promise 覆盖完整资源工作，选择共享作用域。
4. 沿 `generator → enqueue → resumeNext → run → next` 解释微任务、计数、成功/失败补位和 Promise 结果采用。
5. 选择 `all` / `allSettled`，区分聚合拒绝、任务继续与输入迭代异常。
6. 预测升降额度、默认清队列与 `rejectOnClear=true` 的行为，避免等待默认已丢弃项，区分清队列与实际取消。
7. 画出同一 limiter 嵌套等待环，提出不破坏资源预算的修复，并指出队列容量、超时与背压边界。
8. 在综合活动中参与设计与验证，解释结果与一个变式，接受反馈后改进方案。

“完成”意味着参加活动并获得反馈，不是满分、一次写对或网站进度已被验证。

## 输入约束如何实际改变设计

- **depth = deep**：不止会套 `pLimit(2)`。增加耗时下界推导、固定额度准入不变量、微任务占槽窗口、同步 throw/异步 reject 的两条观察路径、map 枚举异常、动态降额暂时超额、清队列两种结算策略、等待环和隐形资源工作的分析。最终任务要求任务内计数与源码解释，且选择一个边界变式。深度体现为机制和迁移要求，不是把初级材料写长。
- **background**：仅假设熟悉 JavaScript 函数与 Promise，不默认熟悉队列调度、事件循环、背压、生成器或取消协议。依次在使用处补充：队列/槽类比、Promise executor 与 then 的微任务差别、allSettled 数据结构、生成器“逐项产出后报错”、等待环与背压。`AsyncLocalStorage` 仅作为源测试所证明的实现动机，不作为新先修知识；不要求 TypeScript。
- **learningStyle**：每课先用一个小具体问题，再给解释与完整小示例。采用可手动释放的 Promise，避免让学生只看随机耗时图；活动含预测、运行/手动追踪、反馈，练习与 lesson 绑定，不另建练习填充栏目。
- **language = zh**：中文讲解和活动说明，保留代码符号、库名与源测试名称。
- **teachingMode = simple**：不改变 deep 的机制范围。教师可用简单对话、短问题和纸面表实现深度要求；以后模式变化也无需重写课程。依共享教学原则，一次一个小问题并等待，欢迎自然问题，友善反馈，按需解释，少做重复测验，允许短暂支线或调整。
- **request** 没有要求开发一个并发库或部署服务：终点是正确使用和解释 p-limit，不编写假 limiter，不扩成分布式调度项目。身份、设置、可选 profile、教学公共路由与进度数据保持原样；不安排强制访谈课。

## 最小先修与依赖路线

必要先修仅为函数/参数、基本 `async`/`await`、Promise 成功与拒绝、数组映射（后者在例子中解释）。不要求构建、线程、操作系统调度、Node 专项 API 或高级数学。

| 顺序与 lesson | 为什么存在 | 依赖 | 活动与预期表现 |
| --- | --- | --- | --- |
| 1. 从任务时间线理解并发槽 | 定义预算单位，先排除 Promise.all 和每秒限流的误解 | 已有函数/Promise 背景 | 两槽时间线、下界；能预测补位和区分速率 |
| 2. 把尚未启动的完整任务交给 p-limit | 把直觉落实为正确启动、返回与共享范围 | 1 | 修复已启动/忘 return 代码；解释限制哪个资源 |
| 3. 追踪源码里的占槽、微任务和补位 | 回答“如何工作”，而不是只会调用；解释计数窗口 | 1、2 | 同步快照和 B 完成后的源码追踪；不混淆占槽与函数体日志 |
| 4. 失败不等于停队列 | 定义部分成功与异常输入的报告语义 | 2、3 | 对比 all/allSettled；解释已提交 mapper 在输入异常后继续 |
| 5. 动态限额与清队列 | 能安全调整和停止待排工作，避免永久等待 | 3、4 | 降额状态表、两种 clear 策略；区分拒绝与取消 |
| 6. 嵌套死锁与资源边界 | 防止能跑但预算错误，或因嵌套永不完成 | 2、3、5 | 等待图、叶资源修复、超时/背压边界；不运行无限等待例子 |
| 7. 可靠受限批次迁移 | 将前面知识用于未见过的具体输入和变化 | 1–6 | 设计、计数验证、逐项报告、任选一个边界变式 |

这是按能力依赖选择的七课，不沿源文件目录或 README 标题分课。每课都含完整解释、小示例、误解、核心问题、活动、完成条件与原始/本地来源。agentInstructions 使用 `{origin}/sources/...`，教师可以直接读原件；只引用共享原则，不绑定工具、传输或内部会话。

## 选源、读取范围与原件保存

输入源根：`schools/concurrency-deep/materials/`；材料根：`material-1/`；仓库来源 `https://github.com/sindresorhus/p-limit`。版本标识是输入指定提交 `a8a6fbec4e0e866d6d779b10889bb4f5567e70eb`，原始 `package.json` 标示 package `7.3.3`、ESM、Node `>=20` 和 `yocto-queue ^1.2.1`。提交号来自输入元数据；没有执行 git 或独立通过远端核验 checkout。

实际完整读取的输入原文件为：`material-1/index.js`、`readme.md`、`test.js`、`recipes.md`、`package.json`、`index.d.ts`、`license`。还读取/检查了学校已有 package 配置和本地队列依赖 package 信息，仅用于确认 ESM 与可执行性，未修改它们，也不将其列为概念证据。没有读取整个仓库；目录列举不等于源码阅读。

上述七个输入文件均未修改地复制到 `public/sources/material-1/`，保持相对于输入源根的路径。原始 URL 规则为 `https://github.com/sindresorhus/p-limit/blob/a8a6fbec4e0e866d6d779b10889bb4f5567e70eb/{文件名}`；对应本地 HTTP 为 `/sources/material-1/{文件名}`，教师访问用 `{origin}/sources/material-1/{文件名}`。本课程无 PDF/HTML 材料、无派生提取文本；保存的 Markdown 和 JS 是输入原件，生成活动另在 `/activities/`，不会伪装成上游来源。

## 精简来源账本

以下行号针对固定输入原件；符号和测试名称可作为稳健定位方式。链接指向已复制本地原件，以上 URL 规则提供原始出处。

| 主要论断 | 源码/文档位置 | 对照测试与用于哪课 |
| --- | --- | --- |
| 接收未调用函数及参数；标准受限批次形式 | [readme.md](/sources/material-1/readme.md) Usage、limit(fn, ...args)；[index.js](/sources/material-1/index.js) generator 66–68 | [test.js](/sources/material-1/test.js) accepts additional arguments、concurrency: 1；1、2 |
| 额度正整数或 Infinity；配置对象与 rejectOnClear 类型检查 | index.js 3–14、validateConcurrency 144–148；[package.json](/sources/material-1/package.json) version、engines | test.js accepts options object、throws on invalid concurrency argument；2、5。Infinity 来自实现，并未宣称相应测试已运行 |
| 准入先占槽，再由内部 Promise then 启动；计数含已获准窗口 | index.js resumeNext 19–25、enqueue 50–64、getters 71–76 | test.js runs all tasks asynchronously 138–153、activeCount and pendingCount properties 155–182；3 |
| 用内部 Promise 保留异步执行上下文 | index.js enqueue 注释 53–58 | test.js propagates async execution context properly 45–58；3，只讲动机 |
| 成功失败都释放槽，调用者仍获原拒绝 | index.js run 32–48、next 27–30 | test.js continues after sync throw 67–85、does not ignore errors 118–136；3、4 |
| map 输入顺序结果、索引、与直接调用共享额度；枚举异常已提交任务继续 | index.js map 106–127；readme.md limit.map | test.js map works when detached from the limit、map passes index and preserves order with concurrency、map does not leave unhandled rejections when the iterable throws、map rejects immediately with the iterable error and still runs already scheduled tasks；2、4 |
| 部分结果与 HTTP 状态判断由调用方负责 | [recipes.md](/sources/material-1/recipes.md) Error handling with partial results | 原 recipe 使用 allSettled、response.ok；4、7。失败不取消工作另由 run/next 路径支持 |
| 默认清除不结算待排 Promise，选项 true 拒绝 AbortError；不取消执行中任务 | index.js clearQueue 77–90；readme.md rejectOnClear、clearQueue；recipes.md Graceful shutdown（默认配置） | test.js clearQueue、clearQueue rejects pending promises when enabled、limitFunction exposes clearQueue；5 |
| 动态降额不抢占；升额微任务填槽 | index.js concurrency setter 91–104；recipes.md Dynamic concurrency | test.js change concurrency to smaller value 443–460、change concurrency to bigger value 462–479；5 |
| limitFunction 自有 limiter，仅公开 clearQueue | index.js limitFunction 133–142；readme.md limitFunction；[index.d.ts](/sources/material-1/index.d.ts) limitFunction 返回签名 | test.js limitFunction()、limitFunction exposes clearQueue；2、7。类型文件作参考，不要求学生学习 TypeScript |
| 同一 limiter 嵌套等待可能死锁 | readme.md limit(fn, ...args) 警告；index.js run/准入规则 | 本次已读测试没有专门的死锁测试；6 的等待环是实现推理 |
| 队列容量/生产背压与执行额度不同；超时不必等于资源取消 | index.js map 的 Array.from、run 等待返回结果；readme.md FAQ 包定位 | 6 的边界分析为课程推理，不声称上游专项测试支持 |
| 版本、运行前提、原件复用许可 | package.json version/engines/dependencies；[license](/sources/material-1/license) MIT | 原件含许可；可执行活动另验证，不需上游安装 |

第 1 课的时间线、耗时下界/吞吐量估算，第 2 课的反例，第 5 课的准入窗口，第 6 课的修复和超时例子，第 7 课的场景与探针，均显式标注为生成例子/实现推理。没有给其他链接项目杜撰结论或引用。

## 排除项与不确定性

- 不按整个 API 和目录铺课：排除 benchmark、脚本、CI、开发工具、发布、包安装、完整 TypeScript 类型推导、队列依赖内部实现；这些对正确调用和理解当前调度路径不是必要。
- 不读取/引用 p-map、p-queue、p-throttle 等链接项目的内部机制；仅保留原 FAQ 的定位与自身实现的非保证。也不展开分布式限流、线程池、优先级、公平性跨生产者证明、生产级重试或自适应控制算法。
- 不把“响应 429 调低限额”的 recipe 当作可靠速率限制或最优算法；不直接运行 shutdown recipe 中的退出进程/信号操作。
- 源 README 的 activeCount 简称 running，本实现中它包含已经出队占槽、函数体尚未调用的短窗口；按源码和相应测试解释，不悄悄忽略。
- `test.js` 标题 `concurrency: 4` 实际设 `concurrency = 5`；教学按代码值，不把标题误当证据。
- 上游 Node 20 的部分 DOMException/AVA 断言被条件跳过。本次没有运行 AVA/tsd/静态检查的原始全套测试，不能据此声称跨平台通过。
- 输入提交号未远端核验；未验证浏览器运行、真实网络负载、生产服务性能或取消协议。数据规模建议来自 Array.from 和队列保留路径，不是内存测量。
- 死锁与超时示例以手动推理教学，避免无期限进程；没有宣称运行它们证明一般正确性。

## 活动与实际自检

生成文件：`public/activities/limit-lab.mjs` 和中文 `README.md`。活动调用 `public/sources/material-1/index.js` 原件，使用现有 `yocto-queue 1.2.2`，不是假实现。Node 模式为 `schedule`、`errors`、`map-edge`、`clear`、`dynamic`、`transfer`；无浏览器专属依赖，没有网络请求，缺本地依赖时可用手工表替代。

已观察：在当前 Node `v24.16.0` 环境运行全部六个模式，其内置活动断言均通过。观察到了同步 `active=2,pending=1,log=[]`、B/C/A 结束但 A/B/C 结果顺序、失败后 C 继续、输入异常后 A/B 继续、两种清队列状态、动态降额不抢占、综合活动峰值为 2 与逐项失败报告。七份原件复制逐个进行二进制一致性检查；另用现有 `js-yaml` 解析七课 frontmatter，并检查必需字段、顺序、slug 唯一性与本地引用文件存在，均通过。未新增验证脚本文件。这不是原仓库全套测试、学校构建、HTTP 可用性或真实学习效果验证。

全路自审关注：启动边界有没有遗漏、任务返回是否完整、调度/错误是否混淆、深度是否包含边界与推理、练习是否促进目标而非填栏目、生成例子是否与原件分离。特别澄清了默认 shutdown recipe 的配置范围、同步准入后 clear 的窗口、降额瞬间不变量的适用条件。没有更改身份、settings、基础设施、清单、共享教学路由或任何进度记录。

## 如何调整路线

所有 profile 选择均可选，不设置前置门槛。教师可以在实际需要处短问学生已有经验。

- Promise 基础有缺口：在第 2/3/4 课就地补函数返回、采用结果和 allSettled，不新增强制采访课。
- 已会基本调用：快速完成第 1/2 课的具体活动，仍保留第 3–6 课机制与边界；只背 API 不满足 deep 目标。
- 无代码运行环境：用相同输入、受控释放顺序与状态表完成活动；不要求安装。
- 更偏实际案例：将模拟任务换成自己业务中的叶操作，明确单位与返回边界，但不要跳过错误/清队列的等待策略。
- 愿意更深入：选第 7 课第二个变式或仔细分析 map 枚举异常；不盲目扩充到未读取的外部库。若改成大数据/服务取消目标，应另行读取必要原始来源再扩展。
- 时间短：把每课提问压缩为一次预测与反馈，避免重复测验，仍覆盖关键能力；不是将 deep 悄悄改成入门。

课程文件已生成，不表示任何学生已完成。真实教学、网站访问与进度验证由后续流程进行。
