---
title: 避免嵌套死锁，守住资源与队列边界
slug: deadlocks-and-resource-scope
description: 用等待关系解释同一 limiter 嵌套的死锁，区分完整任务、实际资源与生产背压。
order: 6
quiz: false
agentOnly: true
agentInstructions: |
  能力是识别等待环和隐形外部工作，选择不破坏总资源预算的修复。依赖第 2、3、5 课。遵循共享教学原则：一次一问并等待，欢迎提问或短暂支线，友善反馈，按需解释，避免无必要重复测验；参与活动并得到反馈即可完成。
  阅读 {origin}/sources/material-1/readme.md 的 limit(fn, ...args) 嵌套警告和 FAQ；{origin}/sources/material-1/index.js 的 run、resumeNext、map、limitFunction。固定提交 a8a6fbec4e0e866d6d779b10889bb4f5567e70eb，package 7.3.3。没有已读上游死锁专项测试，区分文档警告、实现推理与生成例子。
  首问只给 concurrency=1 的外任务 await 同一 limit 的内任务，问哪个事件才能释放外槽。不要要求运行永不结束的代码。用纸面等待图活动，学生提出一个修复后，讨论是否改变全局预算。
  提示：加大限额不根治全部外任务占满时的循环；独立内 limiter 解除该等待环但并不自动共享总额度。优先只给真正占资源的叶任务加限额，让编排在外部执行。任务中 Promise.race 超时若未取消底层操作也可能提前释放槽；这是推论不是本包超时 API。
  完成条件：学生参与画等待关系、选择修复并得到反馈，能说出至少一个 p-limit 不保证的边界，如队列容量、速率或 CPU 并行。
---

## “限制得更严”为什么反而不动了？

依赖：知道槽只有在任务返回结果结算后释放。以下是**生成的反例**，请手动分析，不要无期限运行：

```js
const limit = pLimit(1);
await limit(async () => {
  return await limit(() => work());
});
```

逐步追踪：外任务占唯一槽；它提交内任务并等待内任务结果；内任务在队列里等空槽；外任务必须结束才能归还槽，但它又在等内任务。等待关系构成环：

```text
外任务完成 → 需要内任务完成
内任务启动 → 需要空槽
空槽出现   → 需要外任务完成
```

没有事件能打破这个环，这就是此例的死锁。README 明确警告不要在已被某 `limit` 限制的函数中再调用同一个 `limit` 并等待。

把 1 改成 2 不代表安全：若两个外任务都占槽且各等自己的内任务，仍无空槽。问题是等待结构，不只是数字小。

## 修复先问“哪个步骤真正占资源”

若限制的是外部服务请求，而编排函数仅等待子请求，可把 limiter 放到叶操作上：

```js
const resourceLimit = pLimit(2);
async function workflow(item) {
  const first = await resourceLimit(loadPart, item);
  const second = await resourceLimit(savePart, first);
  return second;
}
const result = await Promise.all(items.map(workflow));
```

这是**生成的修复示例**。`workflow` 不占资源槽等待子任务；`loadPart` 与 `savePart` 共享同一预算。每个叶操作必须返回覆盖其资源占用的完整 Promise。

另一种修复是已经在受限任务内时直接调用必要子操作，让外任务的返回值覆盖它。这要求子操作是外任务预算的一部分；若一个外任务同时启动五个实际请求，一个槽就不再等于一个请求预算。

README 也建议内任务用独立 limiter。它解除同一槽集合上的上述环，但两份额度并不会自动共享全局资源预算，其他等待关系也需检查。选修复不能只看“不挂了”，还要看限制的到底是工作流数、单请求数，还是某资源会话数。

## 一个槽不等于所有隐形工作

第 2 课的“忘记 return”让任务外面的工作不受计数覆盖。一个更隐蔽的例子是：

```js
limit(() => Promise.race([slowOperation(), timeoutPromise]));
```

若超时先发生，而底层 `slowOperation` 没被真正取消，返回的竞赛结果已经结算，p-limit 会释放槽；底层操作仍可继续，此时 limiter 的 `activeCount` 不再代表真实资源活动数。这是**根据返回值边界推导的反例**，不是 p-limit 自带超时机制。不能只给等待加超时就宣称资源已取消。若需要超时，应该让底层操作支持取消，并明确其终止/清理完成的生命周期。

## 执行限额不是队列容量，也不是背压

`limit.map` 用 `Array.from` 枚举输入，快速创建每项 Promise。给 100 万个输入设 `C=2`，只意味着最多两个获准执行，不意味着只分配两个队列项或只保留两个 Promise。有限队列的内存、输入生产速度、结果保存仍需独立设计。

背压可以简单理解为“下游忙时，上游也减慢或暂停生产”。p-limit 的这个批处理 API 没有让输入生产者等空槽再产出下一项。对真正无限的同步可迭代输入，枚举甚至不会正常结束；不应把它直接交给 `limit.map`。对于有限大批次，可以按业务分段处理，避免一次保留所有项；这会引入批次边界，未必让槽始终最忙。课程不在未读取其他库的情况下承诺某个外部流式方案。

## 常见误解与目标联系

“activeCount=2，所以只有两个真实请求；没有死锁，所以预算正确。”都不一定。计数只追踪你交给它的函数结果。最终迁移任务必须同时保证：正确启动边界、完整生命周期、共享作用域、无循环等待，才是有意义的并发限制。

## 核心问题、活动与完成

核心问题：谁等待谁？哪种操作才算一个预算单位？在不改 limiter 的前提下，有什么工作会逃出返回值的边界？

活动：画 `C=2`、两个外任务各等一个内任务的等待图；提出一种修复，再用两句话说明它是否仍让所有叶请求共享最多两个槽。接着审查上述 `Promise.race`，指出“等待超时”与“操作停止”间缺的条件。

完成标准：参与画图并选择修复，得到反馈后能解释为什么仅增大限额不根治嵌套等待，并指出队列容量/速率/CPU 并行至少一个非保证。无需实现新的限流库或运行死锁例子。

## 可追溯来源与推理边界

版本：package 7.3.3，固定提交 `a8a6fbec4e0e866d6d779b10889bb4f5567e70eb`；本地原始根 `schools/concurrency-deep/materials/material-1/`。

- [readme.md 原件](/sources/material-1/readme.md)：API `limit(fn, ...args)` 中同一 limiter 嵌套警告；FAQ 与 p-queue 的定位对比；[原始地址](https://github.com/sindresorhus/p-limit/blob/a8a6fbec4e0e866d6d779b10889bb4f5567e70eb/readme.md)。没有读取其中链接的其他项目。
- [index.js 原件](/sources/material-1/index.js)：`resumeNext` 19–25、`run` 32–48、`map` 106–127、`limitFunction` 133–142；[原始地址](https://github.com/sindresorhus/p-limit/blob/a8a6fbec4e0e866d6d779b10889bb4f5567e70eb/index.js)。
- 等待环、资源预算分析、超时反例与背压解释是根据这些源码位置生成的推理；未发现或宣称运行上游死锁/超时专项测试。
