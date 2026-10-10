---
title: 改上限与清队列：控制不是取消
slug: changing-and-clearing
description: 推导动态并发的非抢占行为与清队列后的 Promise 结算，设计不会悬挂的停止策略。
order: 5
quiz: false
agentOnly: true
agentInstructions: |
  本课能力：预测升降 concurrency 的计数；区分清队列、拒绝排队 Promise 与取消运行工作；选择结算策略。
  阅读 {origin}/sources/material-1/index.js 的 clearQueue（77–89）、concurrency setter（91–104）、validateConcurrency（144–148）；{origin}/sources/material-1/readme.md 的 rejectOnClear、limit.clearQueue、limit.concurrency；{origin}/sources/material-1/recipes.md 的 Graceful shutdown、Dynamic concurrency。对照 {origin}/sources/material-1/test.js 的两项 change concurrency、clearQueue、clearQueue rejects pending promises when enabled。版本 a8a6fbec4e0e866d6d779b10889bb4f5567e70eb。
  依赖第 3 课的先占位和第 4 课的汇总。纠正 active 永远不大于最新 concurrency、AbortError 意味着真的中断 I/O、allSettled 能自动解决 pending 的误解。
  活动推演 A 已占槽位但回调尚未运行、B/C 排队时马上 clearQueue 的两种选项；给出计数、A 是否运行、B/C 如何结算、何时汇总能返回的反馈。
  预期 active=1、pending=0，A 后续仍运行；默认 B/C 不结算，开启选项则拒绝。停止还应停止新提交并让运行工作最终结算；清队列本身不关闭 limiter。
  完成条件：参与状态表预测，提出一种不会误把清队列当取消的等待策略并收到反馈。可手工完成，不运行进程退出示例。
---

# 更新上限不会倒转已经发生的启动

固定上限时，槽位数不应超过上限。但如果正在运行 4 个任务，把上限改为 2 呢？

```js
limit.concurrency = 2;
```

p-limit 不会终止其中两个任务，也不会把 activeCount 伪造为 2。源码只验证并赋值，然后安排一个微任务检查是否可以补位。

生成的状态推演，初始 active=4、pending=3，假设四项依次结束：

| 事件 | 结束后、检查前 active | 是否启动等待项 | 检查后 active / pending |
| --- | --- | --- | --- |
| 设置上限 2 | 4 | 否 | 4 / 3 |
| 第一个结束 | 3 | 否，3 不小于 2 | 3 / 3 |
| 第二个结束 | 2 | 否，2 不小于 2 | 2 / 3 |
| 第三个结束 | 1 | 是，一项补位 | 2 / 2 |

所以“active 永远 ≤ 当前 concurrency”需要限定：稳定的固定上限可这样想；降上限后的过渡期可能暂时超过。真正的准入规则是**只有 active < 最新上限时才放行新项**。

## 升上限为什么有一个微任务？

假设 active=1、pending=3，将上限从 1 改为 3。setter 同步更新 concurrency，但原队列的补位发生在 `queueMicrotask` 中：

```js
queueMicrotask(() => {
  while (activeCount < concurrency && queue.size > 0) {
    resumeNext();
  }
});
```

在没有其他事件干扰时，赋值刚结束的同步快照仍为 active=1、pending=3；补位微任务后为 active=3、pending=1。用户函数又通过第 3 课的 Promise reaction 调用，不必与 setter 同步执行。

while 是为了一次补足新空位；普通 `next()` 每次只尝试放行一个，因为只释放了一个槽位。微任务读取的是当时的 concurrency，而非捕获每次赋值的旧数值。非法 setter 值先验证后赋值，抛错时不会更新原上限。

降并发可以缓解资源压力，但不是每秒次数控制。recipes 的 Dynamic concurrency 片段展示调整的想法，不包含通用重试、退避等待或稳定性保证。

## clearQueue 的两个分支

`clearQueue()` 只处理还在队列中的项，对 active 不做减计数。

| 配置 | 等待项从队列移除后，其返回的 Promise | 已占槽位的工作 |
| --- | --- | --- |
| 默认 `rejectOnClear: false` | 保持未结算 | 不受影响 |
| `rejectOnClear: true` | 用 AbortError 拒绝 | 不受影响 |

默认分支是 `queue.clear(); return;`，没有调用那些项的 resolve 或 reject。清空队列不等于让它们成功为 `undefined`。如果把这些 Promise 放进 `Promise.allSettled`，它仍会等待未结算项。`Promise.all` 也不能保证结束，除非别的项使它拒绝。

开启选项的分支用 `AbortSignal.abort().reason` 生成错误，再逐项出队并调用外部 reject。这里没有把信号传进任务，因此 **AbortError 表示排队工作被丢弃，不表示运行中的请求已被取消**。

## 清队列边界不是“回调已经开始了吗”

下面是生成的预测活动：

```js
const limit = pLimit({concurrency: 1, rejectOnClear: true});
const a = limit(jobA);
const b = limit(jobB);
const c = limit(jobC);
const report = Promise.allSettled([a, b, c]);
limit.clearQueue();
```

所有代码都在同一同步片段中，`jobA` 尚未调用。请预测：

- 清队列后 active 与 pending 是多少？
- A 会不会在微任务中开始？
- B、C 的 Promise 如何结束？
- 改成默认选项后，report 能否在 A 结束后正常返回？

根据第 3 课，A 已出队占位，不能被 clearQueue 清掉。因此 active=1、pending=0，A 随后仍开始；B、C 拒绝为 AbortError。只要 A 最终结算，report 就能结束。默认选项下 B、C 不结算，report 不会正常完成。参与预测并与教师比较原因，比记住“清空了”更重要。

## 一个明确的停止策略

对于要等待整批报告的有限任务，通常更容易使用：

```js
const limit = pLimit({concurrency: 2, rejectOnClear: true});
let accepting = true;

function submit(fn) {
  if (!accepting) {
    return Promise.reject(new Error('Not accepting new work'));
  }
  return limit(fn);
}

function stop() {
  accepting = false;
  limit.clearQueue();
}
```

调用方应观察每次 submit 返回的 Promise，例如先收集并注册 allSettled。停止新提交是你自己的政策：`clearQueue` 本身不关闭 limiter，之后仍可提交新工作。若运行中的工作不结算，启用 rejectOnClear 也不能让整个等待结束。

若坚持默认清队列，则要另行管理只等待实际已获准工作的集合，不能再等待含有被丢弃项的整批列表。recipes 的 Graceful shutdown 使用默认设置与运行中集合；本课不照搬进程退出示例，其集合按回调开始记录也需要考虑“已获准尚未调用”的窗口。真实资源取消必须由业务函数协作，本课不教授未读取来源的取消系统。

## 来源定位

版本 `a8a6fbec4e0e866d6d779b10889bb4f5567e70eb`。原址：[固定版本 index.js](https://github.com/sindresorhus/p-limit/blob/a8a6fbec4e0e866d6d779b10889bb4f5567e70eb/index.js)，原始 `materials/material-1/index.js`，副本 [源码](/sources/material-1/index.js)：77–89、91–104、144–148 行。

原始 `materials/material-1/readme.md` 的对应 API：[README](/sources/material-1/readme.md)；原始 `materials/material-1/test.js` 的 `change concurrency to smaller value`、`change concurrency to bigger value`、`clearQueue`、`clearQueue rejects pending promises when enabled`：[测试](/sources/material-1/test.js)。其中 `clearQueue rejects pending promises when enabled` 以及另一个 `limitFunction exposes clearQueue` 测试在 Node 20 上有 AVA 的跳过注释，属于 AbortError 测试环境说明，不证明功能不可用。原始 `materials/material-1/recipes.md` 的 Graceful shutdown、Dynamic concurrency：[recipes](/sources/material-1/recipes.md)。状态表与停止示例为生成推演，未执行 p-limit 示例。
