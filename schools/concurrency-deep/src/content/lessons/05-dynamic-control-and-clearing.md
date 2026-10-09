---
title: 动态限额与清队列的准确语义
slug: dynamic-control-and-clearing
description: 解释降额不抢占、升额微任务补位，以及 clearQueue 两种 Promise 结算策略。
order: 5
quiz: false
agentOnly: true
agentInstructions: |
  能力是预测动态调整和清队列后的 active/pending/返回 Promise 状态，制定不会等待默认已清任务的策略。依赖第 3、4 课。遵循共享教学原则：一次一问、等待、欢迎自然提问和短暂支线，友善反馈，按需解释，避免重复测验；参与活动并获反馈即可完成。
  阅读 {origin}/sources/material-1/index.js 的 clearQueue、concurrency setter（77–104）；{origin}/sources/material-1/readme.md 的 rejectOnClear、clearQueue；{origin}/sources/material-1/test.js 的 change concurrency to smaller value、change concurrency to bigger value、clearQueue、clearQueue rejects pending promises when enabled、limitFunction exposes clearQueue；{origin}/sources/material-1/recipes.md 的 Graceful shutdown、Dynamic concurrency。固定提交 a8a6fbec4e0e866d6d779b10889bb4f5567e70eb，package 7.3.3。
  首问只给 active=3、pending=2，限额从 3 改 1，问是否会终止两个任务。接着每完成一项只推进一步，最后比较清队列默认模式与 rejectOnClear=true。用 {origin}/activities/limit-lab.mjs 的 dynamic、clear，或纸面表。
  关键提示：降低不抢占，active 可以暂时超过新限额；clear 只处理 queue 内任务，已占槽但未调用的任务也不在其中；默认被清任务的返回 Promise 无结算路径。AbortError 是待排任务的拒绝，不是正在运行的 fetch 被取消。
  完成条件：学生参与一个降额追踪和一个安全等待策略选择，得到反馈后能区分清队列、拒绝等待项和取消执行中的工作。提醒上游 Node 20 的相关 AVA 测试有 skip，不声称所有平台测试已通过。
---

## 改变准入规则，不是抢走旧任务的槽

依赖：知道 `next` 会减计数、`resumeNext` 只在小于限额时准入。

假设 A/B/C 运行，D/E 等待，限额从 3 改为 1。setter 先验证值、保存新限额，再通过 `queueMicrotask` 尝试填槽。没有任何一行去终止 A/B/C。

**生成的状态推导**，先预测第一项结束后会发生什么：

| 事件 | active | pending | 是否准入等待项 |
| --- | --- | --- | --- |
| 3 降到 1 | 3 | 2 | 否，旧任务继续 |
| A 完成 | 2 | 2 | 否，2 不小于 1 |
| B 完成 | 1 | 2 | 否，1 不小于 1 |
| C 完成 | 1 | 1 | 先减到 0，再让 D 占槽 |

因此“active 永远不大于 concurrency”只适合固定额度的正常准入场景，不能用来断言动态降额有 bug。

若之后 D 占槽时把限额从 1 改为 2，setter 的微任务会填补 E。同步赋值的下一行未必已看到新任务占槽，更不能假定函数体已执行。使用源码事件路径或明确的启动信号观察，比猜某个计时器耗时可靠。

原 `Dynamic concurrency` recipe 根据 HTTP 状态调额度，这是调用模式，不是经过证明的最优调节算法。降额也不是重试或固定窗口限流；429 对应的重试和时间策略需要另行设计，本课不借一个短例子承诺生产级自适应控制。

## 清队列：区分三件事

1. 删除待启动队列项。
2. 让这些项对应的返回 Promise 拒绝。
3. 取消正在执行的实际操作。

`clearQueue()` 总是做第一件。默认 `rejectOnClear=false`，它不做第二件；设为 true 才将待排项拒绝为 `AbortError`。它从不负责第三件。要取消实际 I/O，需要任务操作支持的取消协议；p-limit 本身没有替你向运行中的任务发送取消信号。

**生成的工作示例**，A 已开始、B/C 待排：

| 配置与动作 | A | B/C 的函数体 | B/C 返回 Promise |
| --- | --- | --- | --- |
| 默认 clearQueue | 继续 | 不调用 | 保持 pending |
| rejectOnClear=true 后 clearQueue | 继续 | 不调用 | 拒绝，name 为 AbortError |

默认分支只 `queue.clear(); return`，没有 `resolve` 或 `reject` 已清项的路径。于是 `await Promise.allSettled([a,b,c])` 也可能永远等不到结算；`allSettled` 不是逃离 pending 的办法。

推荐显式等待已提交 Promise 的场景使用此版本的选项：

```js
const limit = pLimit({concurrency: 1, rejectOnClear: true});
const jobs = inputs.map(item => limit(processItem, item));
const reportPromise = Promise.allSettled(jobs); // 先附加观察，再可能清除
// 在业务决定停止提交、丢弃待排项时调用：
limit.clearQueue();
const report = await reportPromise;
```

这只保证待排项有结算策略；已运行的任务仍须自己结束，若永不结算，整个报告仍会等待。若用 `Promise.all` 而非 `allSettled`，会收到拒绝而不是逐项报告。

## 常见误解：没看到函数日志，就一定能清掉

```js
const p = limit(processItem, item);
limit.clearQueue();
```

若提交时有空槽，这一项已在 `resumeNext` 出队，虽然函数体要到微任务才执行，也已经不属于可清队列。它仍会执行。这一细节承接第 3 课的同步快照；不要把 `clearQueue` 当作“阻止一切尚未看到日志的工作”。

清队列也不是永久关闭 limiter。以后新调用仍可以入队执行；关闭期间不再接受输入，是调用方的策略。

## 原文 recipe 的适用范围

`Graceful shutdown` 使用默认清除模式、跟踪运行中的请求并仅等待它们。这里必须保留版本区别：它的“被丢弃 Promise 不结算”针对默认配置，不覆盖新选项 true。recipe 是模式示例，不是所有生命周期细节都可直接照抄的通用方案：如果紧贴同步提交就清队列，第 3 课指出有任务可能已经占槽但还没登记进任务体中的运行集合。课程采用 `rejectOnClear=true` 并观察所有提交 Promise 的示例来减少这类等待集合遗漏，且不执行 recipe 中的进程退出操作。

## 核心问题、活动、完成

核心问题：降低限额约束旧任务还是新的准入？哪个 Promise 会得到 AbortError？为什么清队列后不应默认等待整批？

活动：读 `/activities/limit-lab.mjs` 后运行 `dynamic`、`clear`，每次先预测一个状态。`clear` 的默认模式刻意只短时观察，不等待 B/C；永久 pending 的结论由源码无结算路径支持，不由一次短观察证明。不能运行就按两张表追踪。

完成标准：参与一次降额追踪和一次清队列策略选择，获得反馈后能说明运行中工作仍需结束、默认被清项不能作为必等对象。最终活动的停队列变式依赖这些能力。

## 可追溯来源

版本：package 7.3.3，固定提交 `a8a6fbec4e0e866d6d779b10889bb4f5567e70eb`；本地原始根 `schools/concurrency-deep/materials/material-1/`。

- [index.js 原件](/sources/material-1/index.js)：`clearQueue` 77–90、`concurrency` 91–104；[原始地址](https://github.com/sindresorhus/p-limit/blob/a8a6fbec4e0e866d6d779b10889bb4f5567e70eb/index.js)。
- [readme.md 原件](/sources/material-1/readme.md)：`rejectOnClear`、`limit.clearQueue()`、`limitedFunction.clearQueue()`；[原始地址](https://github.com/sindresorhus/p-limit/blob/a8a6fbec4e0e866d6d779b10889bb4f5567e70eb/readme.md)。
- [test.js 原件](/sources/material-1/test.js)：`clearQueue`、`clearQueue rejects pending promises when enabled`、`limitFunction exposes clearQueue`、`change concurrency to smaller value`、`change concurrency to bigger value`；[原始地址](https://github.com/sindresorhus/p-limit/blob/a8a6fbec4e0e866d6d779b10889bb4f5567e70eb/test.js)。Node 20 的相关 AVA DOMException 断言被条件跳过（196–197 行），不能据此说全部环境已验证。
- [recipes.md 原件](/sources/material-1/recipes.md)：`Graceful shutdown`、`Dynamic concurrency`；[原始地址](https://github.com/sindresorhus/p-limit/blob/a8a6fbec4e0e866d6d779b10889bb4f5567e70eb/recipes.md)。
- 边界分析、状态表与安全等待建议是课程根据实现生成的推理。
