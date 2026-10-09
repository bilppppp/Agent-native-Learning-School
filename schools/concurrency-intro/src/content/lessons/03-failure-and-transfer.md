---
title: 失败不会自动取消：完成一个受限批处理
slug: failure-and-transfer
description: 区分错误传播、继续调度与清队列，迁移到一个可靠的小型批处理方案。
order: 3
quiz: false
agentOnly: true
agentInstructions: |
  本课建立能力：在共享并发限制下收集批量任务结果，解释失败后仍会运行的任务，并识别清队列与取消的区别。
  遵循共享教学原则，一次一个小问题并等待；欢迎自然提问，温和纠错，按需给解释，允许短支线；不把完成变成反复测验或要求满分。
  必读 {origin}/sources/material-1/index.js 的 run/next、clearQueue 的 rejectOnClear 两个分支；{origin}/sources/material-1/readme.md 的 rejectOnClear、clearQueue 和 limit(fn, ...args) 的嵌套警告；{origin}/sources/material-1/test.js 的 does not ignore errors、continues after sync throw、clearQueue rejects pending promises when enabled。
  版本 commit a8a6fbec4e0e866d6d779b10889bb4f5567e70eb，package.json 标注 7.3.3。不要推断已发布包或其他版本必有 rejectOnClear。
  首个提示只问上限 1 时 A 失败，队列中的 B 是否仍有机会执行。随后用 {origin}/activities/concurrency-lab.mjs 的 failure 活动或纸上追踪反馈。clear 模式可选；明确默认清队列可能让对应 Promise 一直未决，绝不要求真的运行会挂起的例子。
  迁移活动给五个资源 id、上限 2、其中一个任务失败的条件，请学习者写核心代码或口述方案：共享 limiter，返回完整操作 Promise，用 allSettled 收齐状态。不要把本课参考解放进第一次提示；可逐步提示、反馈并协作修正。
  预期推理：内部 catch 为释放名额不等于对外吞错；Promise.all 拒绝不取消其他任务；allSettled 收齐状态但不改变调度。同一 limiter 的外层占名额并等待内层可能死锁，可将任务扁平化。
  完成条件：参与失败追踪和小型迁移、收到反馈后能指出调度边界并给出可用核心方案。不要求完美或执行真实网络任务，不宣称生产验证。完成后可选回顾或学习者自己选择进一步深度。
---

## 核心想法：错误传播和任务调度是两件事

正常路径已经会写。现在假设共享 `pLimit(1)` 的 A、B 两项中，A 失败：

```js
const jobs = [
  limit(() => operationA()),
  limit(() => operationB()),
];

try {
  await Promise.all(jobs);
} catch (error) {
  console.log('批量结果失败', error);
}
```

这是生成的概念片段，两个操作都应返回完整工作的 Promise。A 失败会让它对应的 Promise 拒绝，`Promise.all` 也拒绝。但是 **B 不会因为这个 `catch` 自动被取消**。

源码 `run` 在内部等待结果，用 `try/catch` 确保失败后仍能走到 `next()`，释放名额并调度下一项；与此同时，之前的 `resolve(result)` 已让对外 Promise 跟随任务的失败。内部有 `catch` 不等于对外忽略错误。

## 小例子：需要每项状态时怎么写

如果想等整组任务结束，再分别报告成功或失败：

```js
const settled = await Promise.allSettled(jobs);

settled.forEach((item, index) => {
  if (item.status === 'fulfilled') {
    console.log(index, '成功', item.value);
  } else {
    console.log(index, '失败', item.reason);
  }
});
```

`Promise.allSettled` 是 JavaScript 的结果汇总方式，不是 p-limit 的新功能，也不会重试任务。只要每项 Promise 都最终结束，它会等全部状态并按输入顺序返回。使用 `Promise.all` 加 `try/catch` 或 `allSettled` 都可以；选择取决于你需要一个整体结果，还是每项结果。

生成活动中的 A 失败、B 成功，最后状态为 `['rejected', 'fulfilled']`。不要把“收到第一个错误”当成“系统已停止工作”。

## 清队列不等于取消

`limit.clearQueue()` 只丢弃尚未开始的任务，不取消已经拿到名额的操作。在此输入版本中还有一个重要分支：

| 创建方式 | 清除后等待任务的 Promise | 已开始任务 |
| --- | --- | --- |
| `pLimit(1)`，默认 `rejectOnClear: false` | 保持未决，不会因清除自动成功或失败 | 继续运行 |
| `pLimit({concurrency: 1, rejectOnClear: true})` | 以 `AbortError` 拒绝 | 继续运行 |

如果默认清除后还对整组任务用 `Promise.allSettled`，可能一直等不到完整结果；`allSettled` 不能修复永远未决的 Promise。`Promise.all` 也不能保证等待结束，除非另有某项拒绝使它提前拒绝。

可选阅读片段：

```js
const limit = pLimit({concurrency: 1, rejectOnClear: true});
const jobs = ids.map(id => limit(() => readItem(id)));
const report = Promise.allSettled(jobs); // 先注册结果观察者
limit.clearQueue();
const results = await report;
```

这是生成的用法片段，不承诺清除时每项的开始时刻。已保留名额的任务继续运行；只有仍在等待队列的任务被清除。错误名称是 `AbortError`，并不意味着运行中的网络请求真的被中止。真正取消需要任务本身支持取消，本入门课不展开取消协议，也不把清队列作为正常批处理的必需步骤。

## 另一个小陷阱：占着名额等自己的队列

```js
const limit = pLimit(1);
await limit(async () => {
  return await limit(() => readItem('inner'));
});
```

外层占着唯一名额，等内层完成；内层排队，等外层释放名额，双方都无法继续。这个生成片段用于纸上分析，不建议执行。README 也明确警告避免同一个 limiter 的受限任务再次等待同一个 limiter 的调用。

初学时优先把任务扁平化：让批处理层统一调度实际操作。独立内层 limiter 是文档提示的一种选择，但其资源预算不等同于一个全局上限，不必在入门活动中引入它。

## 核心问题与建议活动

先预测：上限为 1，A 失败后 B 会发生什么？然后观察：

```sh
node public/activities/concurrency-lab.mjs failure
```

可选对比清除队列：

```sh
node public/activities/concurrency-lab.mjs clear
```

活动源文件：[concurrency-lab.mjs](/activities/concurrency-lab.mjs)。这些是模型生成的活动，使用真实复制的 p-limit；需 Node.js 20+ 与学校已有依赖，不安装、不访问网络。不能运行时，画出“A 结束、归还名额、B 开始”的事件链和清队列表即可。

讨论一个问题即可起步：`catch` 到错误与取消任务有什么差别？然后按需要讨论 `clearQueue` 的两个分支，或为什么同一个 limiter 的嵌套等待会卡住。

## 小型迁移：五项资源的受限处理

情境：有五个资源 id；假设业务方提供 `processItem(id)`，返回覆盖完整处理过程的 Promise，其中一个 id 会失败。这里只练调度代码，不实现该业务函数。要求：

- 同时未结束的处理最多两个；
- 全部结束后，每个 id 都有成功值或失败原因；
- 不因为一个失败而假定其他项被取消。

先尝试写核心代码或口述方案，不需要实现网络请求。

### 活动后可对照的参考方案

```js
import pLimit from 'p-limit';

const ids = ['r1', 'r2', 'r3', 'r4', 'r5'];
const limit = pLimit(2);
const jobs = ids.map(id => limit(() => processItem(id)));
const settled = await Promise.allSettled(jobs);
const report = settled.map((item, index) => ({
  id: ids[index],
  ...item,
}));
```

这是生成的参考方案，`processItem` 是情境中给定的函数，不是 p-limit 的导出。`report` 中每项有 `status`，成功时有 `value`，失败时有 `reason`。若任务本身永不结束，方案也不能保证收齐结果；超时策略不在本课范围。

**完成标准：**参与一次失败追踪及迁移方案讨论并收到反馈，能解释共享名额、延迟调用、返回 Promise、收齐状态这四件事，并区分错误与取消。可边讨论边修正，不要求一次写对或运行生产请求。

到这里，你可以正确使用 p-limit 的基础批处理模式，而不只是复述 API 名称。

## 可追溯来源

原始本地目录：`schools/concurrency-intro/materials/material-1/`；原仓库：`https://github.com/sindresorhus/p-limit`；commit：`a8a6fbec4e0e866d6d779b10889bb4f5567e70eb`；`package.json` 标注 `7.3.3`。

- [index.js](/sources/material-1/index.js)：`run` 的 `resolve(result)`、`try/await/catch`、`next()`；`clearQueue` 的默认分支与 `rejectOnClear` 分支。原文：`https://github.com/sindresorhus/p-limit/blob/a8a6fbec4e0e866d6d779b10889bb4f5567e70eb/index.js`。
- [readme.md](/sources/material-1/readme.md)：`rejectOnClear`、`limit.clearQueue()`；`limit(fn, ...args)` 中同一 limiter 的嵌套警告。原文：`https://github.com/sindresorhus/p-limit/blob/a8a6fbec4e0e866d6d779b10889bb4f5567e70eb/readme.md`。
- [test.js](/sources/material-1/test.js)：`does not ignore errors`、`continues after sync throw`、`clearQueue`、`clearQueue rejects pending promises when enabled`。最后一项在源码中有 Node.js 20 的 AVA 跳过条件；未运行官方测试套件。原文：`https://github.com/sindresorhus/p-limit/blob/a8a6fbec4e0e866d6d779b10889bb4f5567e70eb/test.js`。

`allSettled` 汇总解释属于一般 JavaScript 前置知识的就地补充；死锁事件链、迁移例子和活动是根据已读实现与警告生成的解释，不是官方示例。
