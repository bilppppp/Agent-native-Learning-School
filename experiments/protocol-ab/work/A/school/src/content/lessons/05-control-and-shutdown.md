---
title: "改容量与清队列：控制不等于取消"
slug: control-and-shutdown
description: "推导动态并发变更与 clearQueue 两个分支，避免等待被丢弃但不结算的 Promise。"
order: 5
quiz: false
agentOnly: true
agentInstructions: |
  本课能力是依据实际分支预测动态容量和停止提交后的结果状态。按共享教学原则每次一个小问题并等待，可选择调额或收尾例子作主线再短比较另一机制，温和反馈，欢迎问题与 detour，不要求完美作答。
  必读 {origin}/sources/material-1/index.js L3–14、L77–104、validateConcurrency L144–148；{origin}/sources/material-1/readme.md 的 rejectOnClear、clearQueue、concurrency；{origin}/sources/material-1/test.js 的 change concurrency to smaller value、change concurrency to bigger value、clearQueue rejects pending promises when enabled。版本 a8a6fbec4e0e866d6d779b10889bb4f5567e70eb。
  首问：三个任务已占位，把容量 3 改成 1，是否会有两个被终止？不提前给整张表。随后令 A/B/C 依次完成；预期 active 从 3 到 2 到 1 时不启动排队项，降到 0 后才获准启动一项。用 {origin}/activities/slot-trace.md 辅助。
  清队列活动让学生比较 active=1、pending=2 时两种配置：默认只丢队列项，两个外层 promise 永久 pending；rejectOnClear true 拒绝它们并保留活动任务。提示 queueItem.reject 是外层 reject，不是传给用户工作的 AbortSignal。
  完成条件：参与调额与清队列比较并获反馈，能解释为何停止后等待所有任务应使用明确拒绝策略，不把 clearQueue 当成关闭或取消运行中工作。源码测试 Node 20/AVA 跳过仅作测试环境备注。
---

# 改容量与清队列：控制不等于取消

真实程序不只需要“开始多少个”，还要考虑容量调整和退出时等待什么。先把三个概念分开：

- **降额**：减少未来能获准的槽位。
- **丢弃等待项**：让它不再启动。
- **取消运行中工作**：让已经开始的实际操作中止。

p-limit 的 setter 做第一种，`clearQueue` 做第二种并可选拒绝其结果 Promise；这两个操作都不实现第三种。

## 容量是规则，不是强制中断

合法容量是正整数或正无穷。`validateConcurrency` 在创建和 setter 中检查；`0`、负数、小数、`NaN` 和字符串都不能当作容量。`Infinity` 合法但不提供有限上限。选项对象中的 `rejectOnClear` 必须是布尔值，默认 `false`。

setter 先同步验证、更新 `concurrency`，再安排一个微任务：

```js
queueMicrotask(() => {
  while (activeCount < concurrency && queue.size > 0) {
    resumeNext();
  }
});
```

提高容量时，在没有新提交干扰的轨迹里，这个微任务填充新增空位。设置属性不是同步执行新任务的按钮。降低容量时，已经占位的任务不会被撤销；等它们自然完成，`resumeNext` 每次重新检查新的上限。

例如两项正在运行，降到 1：第一项完成后，activeCount 降到 1，条件 `1 < 1` 不成立，不接替；第二项完成后降到 0，才可以接替一项。

所以第 1 课的 `activeCount <= concurrency` 只适用于容量固定的普通轨迹。降额之后暂时大于新容量是预期状态，不是额外启动超限。新的启动许可仍受 `activeCount < concurrency` 保护。

## clearQueue 的两种结果

从 [index.js](/sources/material-1/index.js) L77–89 看：

| 调用 clearQueue 时的项 | 默认 rejectOnClear: false | rejectOnClear: true |
| --- | --- | --- |
| 已出队且占位的项 | 不受影响，即便函数微任务尚未执行 | 同样不受影响 |
| 尚在队列里的项 | 被丢弃，不会启动；其外层 Promise 不会结算 | 被取出并以 AbortError 拒绝，不会启动 |
| 稍后新提交的项 | 仍能正常提交 | 仍能正常提交 |

默认分支只有 `queue.clear()`，没有 resolve 或 reject 被丢弃项的外层 Promise。`Promise.allSettled` 也要等每项结算，因此不是解决永久 pending 的万能方法。

另一分支取得 `AbortSignal.abort().reason`，逐个调用队列项中保存的 `reject`。这是在**拒绝返回的结果**，不是向已执行函数传递信号；源码没有给用户函数自动注入 AbortSignal。

若需终止实际读取，应由该操作自身支持的取消机制负责。此课只要求认清边界，不要求引入新的库或实现完整取消系统。

## 一种可以等完的收尾策略

```js
// 模型生成示例；runJob 是完整返回 Promise 的场景函数。
const limit = pLimit({concurrency: 2, rejectOnClear: true});
let accepting = true;
const submitted = [];

function submit(job) {
  if (!accepting) throw new Error('not accepting new work');
  const promise = limit(runJob, job);
  submitted.push(promise);
  return promise;
}

// 有限批次：先安装每项的结果观察，再执行停止操作。
for (const job of batch) submit(job);
const summary = Promise.allSettled(submitted);

function stop() {
  accepting = false; // 这是应用逻辑，不是 clearQueue 自带功能
  limit.clearQueue();
}

// 当应用选择停止时调用 stop()；最终可 await summary。
```

这里可以收集排队项的拒绝和活动项的最终结果，前提是活动任务自身最终会结束。若活动任务永久不结算，p-limit 并不能替你制造完成。本例不是通用实时任务管理器：后续动态提交若被允许，需要另外安排结果观察，不能靠已经创建的数组快照。

## 逐步推导

使用[状态表](/activities/slot-trace.md)：容量 3，A/B/C 已占位，D/E 排队，降到 1。先只问是否会终止任务，再依次放行 A/B/C。另取 active=1、pending=2 的状态，比较两种 clearQueue 配置下结果 Promise 的去向。教师反馈后，可尝试说出为何 `clearQueue` 不等于永久关闭入口。

## 来源与注意事项

原始本地路径 `materials/material-1/index.js` 的选项解析 L3–14、`clearQueue` L77–89、`concurrency` setter L91–104、`validateConcurrency` L144–148；本地 [实现](/sources/material-1/index.js)。[readme.md](/sources/material-1/readme.md) 的 `rejectOnClear`、`limit.clearQueue()` 与 [test.js](/sources/material-1/test.js) 的 `change concurrency to smaller value`、`change concurrency to bigger value`、`clearQueue`、`clearQueue rejects pending promises when enabled` 支持结论。

[recipes.md](/sources/material-1/recipes.md) 的 `Graceful shutdown` 描述默认丢弃后不结算，而不是本课拒绝策略的验证结果。测试有 Node 20 下 AVA/DOMException 的跳过备注；不要把测试兼容问题说成所有 Node 20 都没有 AbortError。

原仓库 https://github.com/sindresorhus/p-limit ，输入版本 `a8a6fbec4e0e866d6d779b10889bb4f5567e70eb`（7.3.3）；原文件 URL 示例：https://github.com/sindresorhus/p-limit/blob/a8a6fbec4e0e866d6d779b10889bb4f5567e70eb/index.js 。表与收尾示例是模型生成，未执行 p-limit。
