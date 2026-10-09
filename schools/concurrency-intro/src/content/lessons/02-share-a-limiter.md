---
title: 用同一个 limiter 控制整组任务
slug: share-a-limiter
description: 正确延迟调用并返回完整任务的 Promise，观察排队数量与结果顺序。
order: 2
quiz: false
agentOnly: true
agentInstructions: |
  本课建立能力：为一组任务创建共享 pLimit，提交尚未调用的函数，返回完整操作的 Promise 并汇总结果。
  遵循共享教学原则，一次一个小问题并等待，欢迎追问，温和反馈，按需解释并允许短支线；不要把三个错误写法变成重复考试。
  必读 {origin}/sources/material-1/readme.md 的 Usage、limit(fn, ...args)、limit.map、activeCount/pendingCount；{origin}/sources/material-1/index.js 的 generator、run、validateConcurrency、map；{origin}/sources/material-1/test.js 的 activeCount and pendingCount properties 与 map passes index and preserves order with concurrency。
  本课基于 commit a8a6fbec4e0e866d6d779b10889bb4f5567e70eb，package.json 版本 7.3.3，不推断其他版本一致。
  首次只展示输入 A/B/C/D 和上限 2，问应创建几个 limiter，等待其回答。之后用 {origin}/activities/concurrency-lab.mjs 的 batch 活动，或手动释放 B/C/D/A 的完成事件，让学习者预测一次队列变化，再观察反馈。
  重点纠错：传函数而非已经启动的 Promise；整组共享一个 limit；回调必须返回或 await 实际工作。若难以理解少了 return，可问 limiter 收到的是 undefined 还是代表工作结束的 Promise。
  在稳定观察点讨论 active/pending；不要把微任务精确排序作为达标要求。结果按提交顺序而不是完成顺序，属于 Promise.all 的汇总规则。
  完成条件：参与追踪并收到反馈后，能写出或修正共享 limiter 的核心三行，且说明为什么要返回任务 Promise。可选 limit.map 改写，不要求记忆全部 API。下一课处理失败与批处理迁移。
---

## 核心用法：传一个“稍后调用的函数”

上一课知道必须控制任务开始。现在把这个权利交给一个共享的 `limit`：

```js
import pLimit from 'p-limit';

const limit = pLimit(2);
const ids = ['A', 'B', 'C', 'D'];
const jobs = ids.map(id => limit(() => readItem(id)));
const results = await Promise.all(jobs);
```

这是生成的用法示例，假设 `readItem(id)` 返回覆盖整个读取操作的 Promise。`readItem` 不是 p-limit API；上面的片段不是独立可运行程序。

- `pLimit(2)` 创建一个有两份名额的调度器。
- `() => readItem(id)` 是尚未调用的任务函数。交给 `limit` 时，可以先排队。
- 每个 `limit(...)` 返回一个 Promise，其最终成功值或失败来自对应的任务。
- `Promise.all(jobs)` 汇总所有成功结果；若有任务失败，会拒绝，下一课再看这种情况。

源码 `run` 会把任务的结果 Promise 交给调用者的 Promise，并等待结果结束才调用 `next` 释放名额。这里不必记住 Promise 的内部术语，只需确保你交回的 Promise 真能代表任务完成。

## 一个完整的纸上追踪

A、B、C、D 按顺序提交，共享上限 2。人为安排 B、C、D、A 依次完成：

| 稳定观察点 | activeCount | pendingCount | 解释 |
| --- | --- | --- | --- |
| 提交四项后 | 2 | 2 | A、B 已获名额，C、D 等待 |
| B 完成并补位后 | 2 | 1 | A、C 占用名额 |
| C 完成并补位后 | 2 | 0 | A、D 占用名额 |
| D 完成后 | 1 | 0 | 只剩 A |
| 全部完成后 | 0 | 0 | 没有未结束任务 |

“稳定观察点”指相关异步回调处理后，不要求在任意一行日志里都立即看到同样数字。`pendingCount` 是尚未调用函数的队列长度，不是所有未完成任务数。

完成顺序可以是 B、C、D、A，而 `results` 仍对应 A、B、C、D。**输入位置用于结果排列，实际耗时决定完成顺序。**这是 `Promise.all` 的汇总语义，不是 limiter 强迫后面的任务晚完成。

## 三种常见错误，任选一种修正

### 1. 先启动，再想限制

```js
const started = ids.map(id => readItem(id));
// 此时已经晚了：这些操作已启动。
const jobs = started.map(promise => limit(() => promise));
```

这可能限制“多少个回调在等待已有 Promise”，却无法限制之前启动的读取。直接 `limit(readItem(id))` 也不对：API 要函数，不是执行中的 Promise。

### 2. 每个任务各建一个 limiter

```js
const jobs = ids.map(id => {
  const limit = pLimit(2);
  return limit(() => readItem(id));
});
```

四个独立调度器不会共同维护两份名额。应把 `const limit = pLimit(2)` 放到 `map` 外面，同一个资源预算使用同一个 limiter。

### 3. 忘记返回真正的工作

```js
const jobs = ids.map(id => limit(() => {
  readItem(id); // 没有 return：回调马上返回 undefined
}));
```

读取虽然启动了，但 limiter 无法知道它还在进行，会过早归还名额。改为 `return readItem(id)`，或使用 `async` 回调并 `await readItem(id)`。如果异步函数内部又启动了不等待的后台操作，同样无法覆盖那些操作的生命周期。

## 两个可选的便利写法

```js
const jobs = ids.map(id => limit(readItem, id));
const results = await Promise.all(jobs);
```

`limit(fn, ...args)` 会将参数传给函数。这和回调包装的写法服务于同一个目标，不必为了优化而优先使用它。

此版本还提供：

```js
const results = await limit.map(ids, id => readItem(id));
```

`limit.map` 是把输入映射成共享限制下的任务并汇总结果的便利方法。入门掌握一种主写法即可；不是另一套并发原理。

本课使用固定正整数 2。源码 `validateConcurrency` 接受正整数或 `Infinity`，拒绝 0、负数和小数；`Infinity` 不提供有限并发保护。不要把“暂停”写成 `pLimit(0)`。

## 核心问题与活动

1. 哪个函数必须在所有任务之间共享？
2. 返回 `undefined` 为什么会破坏对真实操作数量的限制？
3. D 先于 A 完成，会让结果数组里 D 排在 A 前面吗？

建议活动：先预测 B 完成后谁开始，再观察模型生成的活动：

```sh
node public/activities/concurrency-lab.mjs batch
```

它调用复制的真实 p-limit，用手动可释放的 Promise 模拟不同完成时刻，不用真实网络或精确计时。活动会打印开始、完成、稳定计数和结果数组，并检查峰值不超过 2。Node.js 20+ 与已有 `yocto-queue` 足够，无需构建或安装。无法运行时，用表格追踪同样事件。

活动源文件：[concurrency-lab.mjs](/activities/concurrency-lab.mjs)。完成观察后，任选一种错误写法修正。**完成标准：**参与活动并收到反馈，能写出共享 `limit`、延迟调用、返回工作 Promise 的核心代码，并解释至少一次名额释放。不要求背 API 或把三种错误全部测试一遍。

这已经覆盖正常路径的正确使用；下一课增加失败路径，完成可迁移的批处理方案。

## 可追溯来源

原始本地目录：`schools/concurrency-intro/materials/material-1/`；原仓库：`https://github.com/sindresorhus/p-limit`；commit：`a8a6fbec4e0e866d6d779b10889bb4f5567e70eb`；`package.json` 标注 `7.3.3`。

- [readme.md](/sources/material-1/readme.md)：Usage、`limit(fn, ...args)`、`limit.map`、`activeCount`、`pendingCount`。原文：`https://github.com/sindresorhus/p-limit/blob/a8a6fbec4e0e866d6d779b10889bb4f5567e70eb/readme.md`。
- [index.js](/sources/material-1/index.js)：`generator`、`run`、`next`、`map`、`validateConcurrency`。原文：`https://github.com/sindresorhus/p-limit/blob/a8a6fbec4e0e866d6d779b10889bb4f5567e70eb/index.js`。
- [test.js](/sources/material-1/test.js)：`activeCount and pendingCount properties`、`accepts additional arguments`、`map passes index and preserves order with concurrency`、`throws on invalid concurrency argument`。原文：`https://github.com/sindresorhus/p-limit/blob/a8a6fbec4e0e866d6d779b10889bb4f5567e70eb/test.js`。

四任务表格、错误代码和活动是生成的例子；关于错误代码为何失效的解释是依据调用时机与源码做出的推理，不是声称原仓库包含这些示例。
