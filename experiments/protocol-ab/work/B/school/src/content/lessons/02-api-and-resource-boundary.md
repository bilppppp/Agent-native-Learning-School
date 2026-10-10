---
title: 把限制放在正确的资源边界
slug: api-and-resource-boundary
description: 选择合适的 API，避免提前启动、提前释放和拆散共享并发预算。
order: 2
quiz: false
agentOnly: true
agentInstructions: |
  本课能力：把完整资源操作放进延迟函数；选择 limit、map 或 limitFunction，并保持一个共享预算。
  阅读 {origin}/sources/material-1/readme.md 的 limit(fn, ...args)、limit.map、limitFunction；{origin}/sources/material-1/index.js 的 generator、map、limitFunction、validateConcurrency（66–68、106–148 行）；{origin}/sources/material-1/recipes.md 的 Fetch multiple URLs 和 Reusable limited function；{origin}/sources/material-1/index.d.ts 的 limitFunction 返回类型。版本 a8a6fbec4e0e866d6d779b10889bb4f5567e70eb。
  依赖第 1 课槽位模型。提醒 async 函数若没有 return 或 await 子工作，会提前完成；不限于网络场景。
  活动是修复正文 brokenBatch，要求说明回调何时启动、何时结算以及谁共享预算。可口述代码；不要求安装 p-limit 或访问网络。
  预期指出两层错误：map(fetchRecord) 提前启动，回调中遗漏返回值又会提前释放槽位。修复应为输入值映射到同一 limit 的 async 回调，await fetchRecord(value) 后 return saveResult(record)，覆盖请求与保存。
  完成条件：提交修复方案并收到资源生命周期与 API 选择的反馈。没有要求一次无误或完成额外练习。
---

# 一个槽位应该覆盖什么？

上一课用“任务未结束”定义槽位的占用。现在必须把这个定义落实到代码：p-limit 能观察的不是你心中的业务状态，而是**回调返回值的结算**。

## 交函数，不交已经开工的 Promise

以下是生成的反例：

```js
const started = items.map(item => fetchRecord(item));
const results = await Promise.all(
  started.map(promise => limit(() => promise))
);
```

它可能限制等待这些 Promise 的回调数量，却没有限制请求启动。所有请求早在第一行就开始了。

正确边界：

```js
const results = await Promise.all(
  items.map(item => limit(() => fetchRecord(item)))
);
```

p-limit 得到的是可延迟调用的函数。`limit(fetchRecord, item)` 也可以直接转发参数；不是 `limit(fetchRecord(item))`。参数转发避免某些闭包，但本课程优先清晰，不把它当作必要优化。

## 回调返回值就是槽位的生命周期

另一个生成的反例：

```js
limit(async () => {
  fetchRecord('A'); // 没有 await，也没有 return
});
```

`async` 回调很快完成为 `undefined`，请求却可能仍在进行。调度器看到任务结束，就允许下一项启动，实际请求数因而可能超过上限。

以下两种写法都使槽位覆盖 `fetchRecord` 的完成：

```js
limit(() => fetchRecord('A'));
limit(async () => {
  const record = await fetchRecord('A');
  return record;
});
```

若资源预算包含解析响应，应把读取响应体也包含在任务里：

```js
const results = await limit.map(urls, async url => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json();
});
```

`async` 返回一个 Promise 时会等待/吸收其最终状态；所以 `return response.json()` 覆盖解析完成。如果只 `return response`，限制范围到拿到响应为止，而不是读取完内容。哪种边界适合业务需要明确决定；p-limit 不会替你猜测。

## 三种入口，两个预算选择

| 入口 | 使用场景 | 预算在哪儿 |
| --- | --- | --- |
| `limit(fn, ...args)` | 不同类型任务共享资源池，或需自行选汇总方式 | 这个 `limit` 实例 |
| `limit.map(inputs, mapper)` | 一批输入，各项传入 value 和 index | 同一个 `limit`，也与直接调用共享 |
| `limitFunction(fn, {concurrency: 2})` | 封装单个可反复调用的受限函数 | 每次创建包装器时自建的 limiter |

```js
import pLimit, {limitFunction} from 'p-limit';

const shared = pLimit(2);
const first = shared(readMetadata, 'A');
const second = shared(readBody, 'B');
const records = shared.map(['C', 'D'], readRecord);

const limitedRead = limitFunction(readRecord, {concurrency: 2});
const more = ['E', 'F'].map(key => limitedRead(key));
```

`shared` 的三个入口使用同一个池；`limitedRead` 是另一个池。假如所有操作都使用同一远端资源，两个上限为 2 的池可能一起占用 4 个资源，不是全局 2。把两个独立 `limitFunction` 当作共享预算会犯同样错误。

在这个版本，`limitedRead` 额外暴露 `clearQueue`，不是完整 `limit` 的 `activeCount`、`pendingCount`、`concurrency` 或 `map` 接口。以实际源码和类型为准。

## 一个容易忽略的串行化

```js
for (const item of items) {
  await limit(() => fetchRecord(item));
}
```

没有错误，但提交下一项前总在等待上一项，上限为 10 也只有一项工作。独立任务通常先提交，再汇总等待。提交数和并发数是不同维度：一次提交大量任务可以让队列很大，第 4 课会解释 `map` 的边界。

初始化接受正整数或 `Infinity`；0、负数、小数等会抛错。`Infinity` 合法但不给出有限资源保护。`rejectOnClear` 仅接受布尔值，它的意义留到第 5 课。

## 修复一个批处理

生成的错误示例，假定 `fetchRecord` 一调用就启动资源工作：

```js
function brokenBatch(items, limit) {
  const requests = items.map(fetchRecord);
  return Promise.all(requests.map(request => limit(async () => {
    request.then(record => saveResult(record));
  })));
}
```

它同时提前启动请求，并且让受限回调提前结束。请修复成“请求与保存都属于同一槽位”的版本，并指出这个 `limit` 是否应该在每项循环中重新创建。

一种修复：

```js
function batch(items, limit) {
  return Promise.all(items.map(item => limit(async () => {
    const record = await fetchRecord(item);
    return saveResult(record);
  })));
}
```

`saveResult` 若返回 Promise，也纳入生命周期。`limit` 应复用而不是每项新建。与教师讨论边界是否包含保存并收到反馈；代码阅读即可，无须访问真实资源。

## 来源定位

版本 `a8a6fbec4e0e866d6d779b10889bb4f5567e70eb`。原址：[固定版本 index.js](https://github.com/sindresorhus/p-limit/blob/a8a6fbec4e0e866d6d779b10889bb4f5567e70eb/index.js)；原始路径 `materials/material-1/index.js`，副本 [index.js](/sources/material-1/index.js)，`generator`（66–68）、`map`（106–126）、`limitFunction`（133–142）、`validateConcurrency`（144–148）。

原始 `materials/material-1/readme.md` 的对应 API：[README](/sources/material-1/readme.md)；`materials/material-1/recipes.md` 的 Fetch multiple URLs、Reusable limited function：[recipes](/sources/material-1/recipes.md)；`materials/material-1/index.d.ts` 的返回类型：[类型原文](/sources/material-1/index.d.ts)。本课的 brokenBatch、修复及共享预算例子为生成示例，未执行 p-limit 示例。
