---
title: 把尚未启动的完整任务交给 p-limit
slug: correct-task-boundary
description: 正确使用 limit、map 与共享 limiter，让返回的 Promise 覆盖完整资源生命周期。
order: 2
quiz: false
agentOnly: true
agentInstructions: |
  能力是把真实启动动作放进受限函数，返回完整工作的 Promise，并选择正确共享范围。依赖第 1 课的槽模型。遵循共享教学原则：一次一个小问题、等待回应、欢迎提问、友善反馈、按需解释、避免不必要的重复测验；学生可选择短暂支线。完成是参与活动并收到反馈，不是满分。
  阅读 {origin}/sources/material-1/readme.md 的 limit(fn, ...args)、limit.map、limitFunction；{origin}/sources/material-1/recipes.md 的 Fetch multiple URLs、Error handling with partial results、Reusable limited function；{origin}/sources/material-1/index.js 的 generator、limitFunction、validateConcurrency。固定提交 a8a6fbec4e0e866d6d779b10889bb4f5567e70eb，package 7.3.3。
  首问只给先 fetch 再 limit(() => p) 的反例，让学生指出真正启动在哪里。随后让其修复一个忘记 return 的任务，再决定两个调用方是否该共享同一个 limiter。不要在首问附上所有修复。
  提示：返回值 undefined 会使槽很快释放；为每个输入新建 limiter 无法形成批次总限额；逐个 await 会把单一生产者串行化。可读 {origin}/activities/limit-lab.mjs 的 transfer 函数，或手动追踪。
  完成条件：学生参与改写，并能指出启动、返回与共享范围三个边界，经反馈后可解释自己限制的是哪种资源。
---

## 一个任务是“函数加它的完整结果”

依赖：你已能画并发槽时间线。本课将把槽与代码连接起来。

```js
import pLimit from 'p-limit';
const limit = pLimit(2);
const jobs = inputs.map(item => limit(processItem, item));
const results = await Promise.all(jobs);
```

`limit(processItem, item)` 把函数和参数交给 limiter；有槽后才调用 `processItem(item)`。等价的常用形式是 `limit(() => processItem(item))`。不需要先学闭包优化：把函数传进去，而不是传入已经启动的工作，是重点。

限额一般选正整数；固定提交的 `validateConcurrency` 也接受 `Infinity`，相当于不施加有限上限。0、负数、分数会抛 `TypeError`，设置 `limit.concurrency` 时也检查。配置对象可写 `pLimit({concurrency: 2, rejectOnClear: true})`，清队列选项到第 5 课再用。

## 工作示例：从请求开始到解析结束

以下是**生成的调用示例**，不必发真实请求：

```js
async function load(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}
const limit = pLimit(2);
const results = await limit.map(urls, load);
```

`load` 返回的 Promise 包含请求和 JSON 解析：`async` 返回时会采用 `response.json()` 的 Promise 结果，所以无需为了延长生命周期再写一次 `await`。`limit.map` 给 mapper 传输入和索引，并在成功时返回输入顺序的数组；它和同一个 `limit` 的直接调用共用槽。

若只写 `limit(() => fetch(url))`，而把 `response.json()` 放到 limiter 外，限额只覆盖 `fetch` 的 Promise 生命周期，不覆盖之后的解析。这未必是错误，但必须符合你想限制的资源。课程最终活动限制“一个输入的完整处理”，所以要把整段都纳入。

## 常见误解：只要包进 limit 就会被限制

```js
// 错误边界：提交给 limit 前，工作已经开始。
const p = fetch(url);
const job = limit(() => p);

// 错误边界：函数没有返回 fetch 的结果。
const job2 = limit(() => { fetch(url); });
```

第一个只能控制何时观察已有 Promise，不能倒退并阻止请求启动。第二个函数返回 `undefined`，p-limit 会认为这个任务很快成功结束，虽然请求仍在外面进行。修复分别是 `limit(() => fetch(url))` 和 `limit(() => { return fetch(url); })`。不应把“所有请求最终成功了”当作并发限制生效的证明。

另一个常见写法：

```js
for (const item of inputs) {
  await limit(processItem, item);
}
```

它在下一次提交前等待上一次结束。对于这个单一循环，实际最多一个任务在执行，即使配置为 5。若想让批次共享限额，先提交多个受限任务，再聚合等待。不要因此无条件大量入队；第 6 课会讨论队列容量边界。

## 谁共享同一组槽？

`const limit = pLimit(2)` 创建一份独立队列和计数。两个调用方若共用它，就共同竞争两个槽；若各有一份 `pLimit(2)`，合计可能有四个任务。这是配置作用域，不是全局魔法。

- 多种操作共用一个资源：把同一个 `limit` 传给各调用方。
- 一个函数需要公开受限入口：`limitFunction(load, {concurrency: 2})`。返回的函数每次调用都复用其内部 limiter。
- 两个分别构造的 `limitFunction` 不共享额度；该包装函数只公开 `clearQueue`，不公开 `activeCount`、`map`、动态 `concurrency`。
- `inputs.map(item => pLimit(2)(processItem, item))` 为每个输入创建独立队列，不能形成整个列表的上限。

## 核心问题与活动

1. 哪一行真正开始占用外部资源？
2. 返回的 Promise 是否直到资源工作结束才结算？
3. 限额应该属于单个函数、一个调用方，还是共享资源？

活动：把 `items.map(item => limit(() => { processItem(item); }))` 修成最多两个完整处理的批次；接着画“两个调用方各提交三项、共享限额为 2”的状态图。你可以用字符串任务或阅读 `/activities/limit-lab.mjs` 的 `transfer`，不需要网络。

完成标准：参与修复启动/返回边界和共享范围，得到反馈后能解释选择；这直接支持最终目标中的正确调用，而非仅会背 API。

## 可追溯来源

版本：package 7.3.3，固定提交 `a8a6fbec4e0e866d6d779b10889bb4f5567e70eb`；本地原始根 `schools/concurrency-deep/materials/material-1/`。

- [readme.md 原件](/sources/material-1/readme.md)，API `limit(fn, ...args)`、`limit.map`、`limitFunction`；[原始地址](https://github.com/sindresorhus/p-limit/blob/a8a6fbec4e0e866d6d779b10889bb4f5567e70eb/readme.md)。
- [recipes.md 原件](/sources/material-1/recipes.md)，`Fetch multiple URLs`、`Error handling with partial results`、`Reusable limited function`；[原始地址](https://github.com/sindresorhus/p-limit/blob/a8a6fbec4e0e866d6d779b10889bb4f5567e70eb/recipes.md)。
- [index.js 原件](/sources/material-1/index.js)，`generator`（66–68）、`limitFunction`（133–142）、`validateConcurrency`（144–148）；[原始地址](https://github.com/sindresorhus/p-limit/blob/a8a6fbec4e0e866d6d779b10889bb4f5567e70eb/index.js)。
- 反例、作用域分析和资源边界建议是由实现推导的生成示例，不是原仓库测试。
