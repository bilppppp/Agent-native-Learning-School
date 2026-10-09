---
title: 追踪源码里的占槽、微任务和补位
slug: scheduler-and-microtasks
description: 沿 generator、enqueue、resumeNext、run、next 解释计数与错误后的槽释放。
order: 3
quiz: false
agentOnly: true
agentInstructions: |
  能力是用实际实现解释同步提交时的计数与异步函数启动，并追踪一次成功或失败后的补位。依赖前两课。遵循共享教学原则：每次一小问并等待，欢迎自然提问与短暂支线，友善反馈，按需解释，不重复无必要测验。完成是参与追踪并获得反馈。
  必读 {origin}/sources/material-1/index.js 的 generator、enqueue、resumeNext、run、next（19–68 行），{origin}/sources/material-1/test.js 的 runs all tasks asynchronously、activeCount and pendingCount properties、continues after sync throw、propagates async execution context properly。固定提交 a8a6fbec4e0e866d6d779b10889bb4f5567e70eb，package 7.3.3。
  首问只展示 limit(2) 连续提交 A/B/C 的同步快照，让学生预测 activeCount 和函数体日志，不给答案。解释 Promise executor 同步而 then 回调是微任务这一必要前置，不要求掌握完整事件循环。
  用 {origin}/activities/limit-lab.mjs 的 schedule 模式，或同等纸面表，逐步释放 B、C、A。提示 activeCount 包括已占槽但函数体尚未调用的任务；resolve(result) 是采用 Promise 结果，不是提前 fulfilled，也不保证返回同一 Promise 对象。
  学生能参与一次计数追踪并解释 catch 不吞调用者错误，即满足完成；AsyncLocalStorage 只说明实现动机，无须展开 Node 上下文 API。
---

## 从使用正确走向解释正确

依赖：已经知道要把未启动的完整任务函数交给 limiter。现在要解释为什么它不会超发，以及为什么观察计数时有时“任务还没开始，active 已经非零”。

必要前置：`new Promise(executor)` 的 executor 立即执行；已结算 Promise 上的 `.then(callback)` 不立即调用 callback，而把它安排为后续微任务。微任务在当前同步调用栈结束后执行。这里不需要学习整套浏览器或 Node 事件循环阶段。

## 五个实际符号串成一条路径

固定版本 `index.js` 的调用链：

1. `generator(fn, ...args)` 创建调用者拿到的外层 Promise，立即进入 `enqueue`。
2. `enqueue` 为队列项保存外层 `reject`，创建一个内部 Promise。队列项的 `run` 实际是这个内部 Promise 的 `internalResolve`，不是用户函数。
3. `resumeNext` 检查 `activeCount < concurrency && queue.size > 0`；先 `activeCount++`，再出队并调用内部 resolve。
4. 内部 Promise 的 `.then(...)` 在微任务中进入真正的 `run`，才调用用户函数。
5. `run` 等结果成功或失败后执行 `next`：减计数，再尝试补位。

所以不要把源码中的 `queueItem.run()` 直接理解为“同步执行用户函数”。它先解除内部等待，之后才运行用户函数。

源码注释说明内部 Promise 路径用于保留异步执行上下文；测试 `propagates async execution context properly` 用 `AsyncLocalStorage` 检查这一行为。此处只认清设计动机，不需要把 Node 上下文传播当作新的必修先修课。

## 工作示例：计数领先函数体一步

下面是**生成例子**，先预测同步 `console.log`：

```js
const limit = pLimit(2);
const bodies = [];
const jobs = ['A', 'B', 'C'].map(id => limit(async () => {
  bodies.push(id);
  await waitForRelease(id); // 教学占位：一个可手动释放的 Promise
  return id;
}));
console.log(limit.activeCount, limit.pendingCount, bodies);
```

同步阶段快照是 `2, 1, []`。A/B 已出队且占槽，函数体还在微任务中等待；C 在队列里。`pendingCount` 是 `queue.size`，不是“所有函数体还没开始的数量”。README 的 running 简称在这个极短间隔应以实现为准。

[生成活动脚本](/activities/limit-lab.mjs) 实现了这个手动释放；在学校根目录运行 `node public/activities/limit-lab.mjs schedule`。其状态过程为：

| 观察点 | active | pending | 解释 |
| --- | --- | --- | --- |
| 同步提交三项后 | 2 | 1 | A/B 获准，C 等槽 |
| A/B 函数体开始后 | 2 | 1 | 占槽数不变 |
| B 完成、C 已开始 | 2 | 0 | A 仍占槽，C 补位 |
| C 完成，A 未释放 | 1 | 0 | 只剩 A |
| 全部完成 | 0 | 0 | 全部槽归还 |

任务启动按队列出队次序，结束次序可不同。最终 `Promise.all(jobs)` 数组为 A/B/C 对应，例子故意让结束顺序为 B/C/A。

## `resolve(result)` 为什么不是提前完成？

`run` 里重要的几行是：

```js
const result = (async () => function_(...arguments_))();
resolve(result);
try {
  await result;
} catch {}
next();
```

外层 Promise 的 `resolve` 收到 Promise 时会采用它的结算结果：`result` 尚未完成，外层也不会因此立即 fulfilled。这个 API 返回“反映函数结果”的 Promise，而不是保证对象身份与函数返回值相同。

异步包装也使同步 `throw` 转成拒绝。内部 `catch {}` 让调度路径走到 `next()`，避免失败把槽永远占住；调用者的外层 Promise 已采用原结果，仍会拒绝。因此**内部吞掉调度路径上的错误不等于业务错误消失**。仍应处理调用者拿到的 Promise。若函数永不结算，槽也不会释放：这是生命周期规则，不是后台超时机制。

## 不变量与限定条件

令 A 表示 `activeCount`，P 表示队列大小，C 表示固定的正整数限额。初始 A=0；入队本身不增加 A；只有 `resumeNext` 在 A<C 且 P>0 时将 A 加一，因此增加后仍有 A<=C；任务结算将 A 减一，再走同一个准入检查。沿这些状态转移，就能归纳出固定限额下的 `0<=A<=C`。成功和失败都走相同归还路径。

这个计数不变量本身只约束 limiter；只有所有真实工作都被返回值覆盖，它才代表你要限制的资源。第 5 课会看到动态降低 C 时，旧任务数量可能暂时大于新 C；不要把固定限额不变量套到动态切换的瞬间。

## 核心问题、活动与完成

核心问题：`resumeNext` 启动了什么？为什么 `pendingCount=1` 时可能有三个函数体都还没运行？哪个等待控制槽的释放？

活动：运行 `schedule` 或手动追踪上述表，只先预测同步快照；然后在 B 完成这一行，沿 `run → next → resumeNext` 说明计数如何变化。可选将 B 换成拒绝，预测 C 是否仍会启动。

完成标准：参与一个同步快照和一个补位追踪，收到反馈后能说明“占槽不完全等于此刻函数体已执行”以及错误仍传给调用者。这让最终调试不依赖猜测计数。

## 源码依据

版本：package 7.3.3，固定提交 `a8a6fbec4e0e866d6d779b10889bb4f5567e70eb`；本地原始根 `schools/concurrency-deep/materials/material-1/`。

- [index.js 原件](/sources/material-1/index.js)：`resumeNext` 19–25、`next` 27–30、`run` 32–48、`enqueue` 50–64、`generator` 66–68、计数 getters 71–76；[原始地址](https://github.com/sindresorhus/p-limit/blob/a8a6fbec4e0e866d6d779b10889bb4f5567e70eb/index.js)。
- [test.js 原件](/sources/material-1/test.js)：`propagates async execution context properly`、`continues after sync throw`、`runs all tasks asynchronously`（138–153）、`activeCount and pendingCount properties`（155–182）；[原始地址](https://github.com/sindresorhus/p-limit/blob/a8a6fbec4e0e866d6d779b10889bb4f5567e70eb/test.js)。
- 表格、占槽解释及活动是从实现推导的生成材料；并未声称运行上游测试。
