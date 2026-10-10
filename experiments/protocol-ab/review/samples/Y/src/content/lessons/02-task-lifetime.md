---
title: "把完整工作交给同一个限流器"
slug: task-lifetime
description: "明确任务的 Promise 生命周期，用共享 limit 和 map 组织有限批次。"
order: 2
quiz: false
agentOnly: true
agentInstructions: |
  能力是把需要保护的完整异步寿命放入返回链，并让竞争同一资源的入口共享 limiter。遵循共享教学原则，一次一问并等待，欢迎提问、短 detour 与改用自己的例子，温和反馈，不做重复测验。
  必读 {origin}/sources/material-1/readme.md 的 limit(fn, ...args)、limit.map，以及 {origin}/sources/material-1/index.js 的 run 与 map；参看 {origin}/sources/material-1/recipes.md 的 Error handling with partial results。版本 a8a6fbec4e0e866d6d779b10889bb4f5567e70eb。
  首问给出 limit(() => { readAndDecode(id); })，只问槽位在等什么。学生判断后再要求修复，不先展示答案。预期应 return 该 Promise 或在 async 函数里 await 完整工作，且所有入口共享同一个实例。
  随后选择一题：有单条入口与批量入口时放置 limit，或完成顺序 2/0/1 时解释结果数组；不要把全部变成连续测试。可用源码 map 的 generator(function_, value, index) 提示参数与共享范围。
  完成条件：参与修复、解释任务结束条件并获得反馈，能选择符合需求的 all/allSettled。不要求执行或安装库。
---

# 把完整工作交给同一个限流器

限制是否有效，取决于你交给调度器的函数什么时候才算结束。调度器看得见的是返回值或返回的 Promise；它看不见函数里偷偷启动却没有返回的工作。

## 定义完整任务

假设读取记录后还要异步解码，容量保护的是这两步组成的一次处理。

```js
// 模型生成示例；readBytes/decode 是场景函数。
async function readAndDecode(id) {
  const bytes = await readBytes(id);
  return await decode(bytes);
}

const limit = pLimit(2);
const pending = ids.map(id => limit(readAndDecode, id));
const records = await Promise.all(pending);
```

`limit(readAndDecode, id)` 与 `limit(() => readAndDecode(id))` 都把真正调用留给调度器。参数透传不需要你先调用函数。这里保留 `await decode` 是为了突出任务边界；直接返回它的 Promise 也能让外层等待其完成。

对比下面这个危险形式：

```js
limit(() => {
  readBytes(id).then(bytes => decode(bytes));
  return 'started';
});
```

它返回的是“已启动”的标记，不是工作完成的 Promise。调度器很快释放槽位，读取和解码却可能仍在进行。普通返回值是允许的，不是 p-limit 的错误；错误在于你把错误的生命周期当成了完整任务。

## 实例范围就是容量范围

```js
const limit = pLimit(2); // 放在这些入口共同可见的位置

const readOne = id => limit(readAndDecode, id);
const readBatch = ids => limit.map(ids, readAndDecode);
```

单条读取和批次中的每个元素都竞争同一组槽位。若把 `pLimit(2)` 放进每次调用，或者两个入口各建一个实例，每个实例会分别遵守上限，但总资源量可能超过 2。

不要把整个批次再包进同一个 `limit` 然后在内部使用它的 `map`。外层会占位并等待内层，带来第 6 课的死锁风险。

## map 做了什么，没有做什么

`limit.map(inputs, mapper)` 把值及其索引传给 mapper，并汇总为结果数组：

```js
const values = await limit.map(['x', 'y', 'z'], async (id, index) => {
  const record = await readAndDecode(id);
  return {index, record};
});
```

结果按输入顺序排列，不按完成时间排列。它不是逐个 `await` 的串行循环，也不是为批次创建新的限流器：源码调用相同的 `generator`。`map` 使用 `Array.from` 消费有限输入并收集所有结果 Promise，因此容量限制不等于流式背压；大量输入仍可能创建大量等待项。这是从实现推导的内存边界，不是内存基准结果。

本版本运行时测试还覆盖 Set、数组迭代器、类数组；但 [index.d.ts](/sources/material-1/index.d.ts) 的参数签名是 `Iterable<Input>`。不要把“JS 运行时支持”误当成“TS 签名接受所有相同输入”；本课以普通有限数组练习。

## 选择结果策略

- 全部成功才接受结果：`Promise.all` 或 `limit.map`。其中一个拒绝，汇总会拒绝。
- 要保留每项成功与失败：`Promise.allSettled(ids.map(id => limit(readAndDecode, id)))`。

`allSettled` 得到的每项带 `status`，成功项有 `value`，失败项有 `reason`。这不是重试，也不是取消其他任务；任务失败是否使队列继续运行，第 4 课从源码解释。

## 小修复

和教师检查一段 `limit(() => { readAndDecode(id); })`：这段回调到底返回了什么？先找任务结束条件，再修复它。然后任选单条/批次共享实例，或者结果顺序的一个小例子继续讨论。无需补做所有题目。

## 原件定位

原始本地路径 `materials/material-1/`： [readme.md](/sources/material-1/readme.md) 的 `limit(fn, ...args)`、`limit.map`；[index.js](/sources/material-1/index.js) 的 `run` L32–48 与 `map` L106–126；[test.js](/sources/material-1/test.js) 的 `map works when detached from the limit`、`map passes index and preserves order with concurrency`、`map accepts array-like inputs`；[recipes.md](/sources/material-1/recipes.md) 的 `Error handling with partial results`。

原仓库 https://github.com/sindresorhus/p-limit ，输入版本 `a8a6fbec4e0e866d6d779b10889bb4f5567e70eb`，包自报 7.3.3。原文件 URL 示例：https://github.com/sindresorhus/p-limit/blob/a8a6fbec4e0e866d6d779b10889bb4f5567e70eb/recipes.md 。课程片段是模型生成的，未执行真实读取。
