---
title: 沿核心源码走一遍：占槽位与真正执行
slug: core-scheduler
description: 追踪五个核心符号、三个 Promise 与微任务，解释同步计数和异步调用的时差。
order: 3
quiz: false
agentOnly: true
agentInstructions: |
  本课能力：沿 generator、enqueue、resumeNext、run、next 追踪一次提交；区分占槽位与调用函数；辨认内部通知 Promise、结果 Promise 和调用者 Promise。
  必须读 {origin}/sources/material-1/index.js 的 16–68、70–75 行；对照 {origin}/sources/material-1/test.js 的 runs all tasks asynchronously、activeCount and pendingCount properties、propagates async execution context properly。版本 a8a6fbec4e0e866d6d779b10889bb4f5567e70eb。
  依赖前两课，微任务和 Promise 吸收在本课就地解释。必要时使用 {origin}/activities/promise-probe.mjs，其仅探测原生 Promise，不实现 p-limit，也不验证队列依赖。
  活动：预测正文并发为 1 的三项同步提交后的计数、started、value，然后画出 A 结算后 B 获得槽位的箭头。提供源码或探针反馈，不要求安装依赖。
  预期同步快照为 active=1、pending=2、started=[]；A 读到 value=2。queueItem.run 是 internalResolve，不是用户函数；run 的 resolve(result) 不表示立即完成；next 在等待 result 后执行。
  对异步上下文只说明源码意图和 AsyncLocalStorage 测试覆盖，不推导未读的引擎机制。降低上限后 active 可超上限是第 5 课的例外。
  完成条件：学习者参与快照预测和机制追踪，收到纠正或确认；不以背出全部源码为门槛。
---

# 核心不是一个循环，而是一条接力链

打开 [原始 index.js](/sources/material-1/index.js)，关注以下路线。图是根据本版本源码生成的教学表示：

```text
limit(fn, ...args) / generator
  └─ 创建调用者 Promise P外
      └─ enqueue：创建 P通知、入队 {run: internalResolve, reject}
          └─ resumeNext：有空位？activeCount++，出队并调用 internalResolve
              └─ P通知.then(...) 的微任务：run
                  ├─ 调用 fn，形成结果 Promise P结果
                  ├─ resolve(P结果)：让 P外 跟随 P结果
                  └─ await P结果（成功/失败都等）
                      └─ next：activeCount--，尝试让下一项占位
```

这条接力链分开了两个问题：谁能开始，谁最终得到什么结果。

## 三个 Promise 各司其职

`generator` 每次创建一个新的外部 Promise：

```js
const generator = (function_, ...arguments_) => new Promise((resolve, reject) => {
  enqueue(function_, resolve, reject, arguments_);
});
```

- **P外**：返回给 `limit(...)` 调用者。成功/失败跟随用户任务；清队列时也可以通过其 `reject` 拒绝。
- **P通知**：`enqueue` 内部的 `new Promise(...)`。它不是任务结果，只通知“可以执行”。
- **P结果**：`run` 中 `(async () => function_(...arguments_))()` 得到的 Promise，承接同步返回、返回的 Promise 或同步抛错。

所以 API 文档所说“返回 fn 的 Promise”应理解为结果语义，而非对象身份保证。源码实际返回一个新 P外，不能依赖 `limit(() => originalPromise) === originalPromise`。

## 为什么同步时已 active，函数却还没调用？

Promise 构造器的 executor 同步执行；`then` 的处理函数进入微任务，不在当前同步代码中执行。

```js
new Promise(internalResolve => {
  queueItem.run = internalResolve;
  queue.enqueue(queueItem);
}).then(run.bind(undefined, function_, resolve, arguments_));
```

注意名字：`queueItem.run` 储存的是 **internalResolve**。`resumeNext` 调它只会结算 P通知，使其 `then` 有资格运行；并没有当场调用用户函数。

```js
if (activeCount < concurrency && queue.size > 0) {
  activeCount++;
  queue.dequeue().run();
}
```

先递增计数，再发执行通知，等于先保留槽位。连着同步提交很多任务时，后面的提交能看见已占用的计数，不会因为回调尚未运行就把所有任务都放行。空队列和达到上限这两个分支都会不动作。

因此 `activeCount` 更精确的理解是“已获准、尚未释放的槽位数”，短暂包括回调尚未调用的项。`pendingCount` 是仍在队列里的项数，不是所有“用户函数还没被调用”的项数。

## 一个同步快照

生成的源码推演例子，假定 `holdA` 是一个可稍后结算的 Promise：

```js
const limit = pLimit(1);
const started = [];
let value = 1;

const a = limit(() => {
  started.push(`A:${value}`);
  return holdA;
});
const b = limit(() => { started.push('B'); return 'b'; });
const c = limit(() => { started.push('C'); return 'c'; });

console.log(limit.activeCount, limit.pendingCount, started);
value = 2;
```

同步打印时 `activeCount=1`、`pendingCount=2`、`started=[]`。A 出了队列且占了槽位；B、C 仍在队列；A 的 `run` 等待微任务。随后 A 读到 2，不是 1。这与上游 `runs all tasks asynchronously` 测试里先改变 value、再等待结果的意图一致。

当 A 结束，`next` 先把 active 从 1 减到 0，`resumeNext` 再给 B 占位到 1；B 的用户函数依然通过微任务开始。不是 A 把返回值传给 B，它们只交接槽位。

## resolve(Promise) 不等于已经成功

`run` 的两条路线必须分开看：

```js
const result = (async () => function_(...arguments_))();
resolve(result);
try {
  await result;
} catch {}
next();
```

`resolve(result)` 让 P外 吸收/跟随 P结果 的状态。如果 P结果 仍 pending，P外 也不能立刻把结果交给调用者。若 P结果 拒绝，P外 仍拒绝；内部 catch 只使调度器能继续到 `next()`。

另一方面，调度器必须自己 `await result` 才知道何时释放槽位。把 `next()` 移到 await 前会提前释放，破坏第 2 课的生命周期边界；把它只放在成功分支则会让失败永久占位。

同步函数返回值也被 async 包装为 Promise；同步抛错也成为拒绝，沿同一释放路径处理。这里没有必要使用不同的“同步调度器”。

## 为什么保留内部 Promise 接力？

源码 53–58 行注释说明，入队内部 resolver 而不是直接入队用户 `run`，意在保留异步执行上下文。`propagates async execution context properly` 测试用 AsyncLocalStorage 检查各任务仍看到自己的 id。

我们可以据此理解设计意图，但没有阅读 Node 引擎或依赖源码，不进一步声称所有环境如何传播上下文。不要为了缩短源码就把 `.then(run...)` 改成由前一任务直接调用用户函数：这不只是风格变化。

## 预测与反馈

请解释同步快照的三个值，并画出“A 结束 → 减计数 → B 出队/占位 → 微任务调用 B”。如果微任务还不直观，可以阅读或用已有 Node 运行 [原生 Promise 探针](/activities/promise-probe.mjs)：

```sh
node school/public/activities/promise-probe.mjs
```

探针为模型生成的独立例子，不是 p-limit 实现。生成时在 Node `v24.16.0` 观察到：

```text
sync: value=2
then: value=2
before release: settled=false
outer: done
sync throw becomes rejection: boom
```

它验证了 `then` 延后读取 value、外部 resolve 跟随未完成 Promise、async 包装转化同步错误；不证明 p-limit 测试已运行。不运行时按源码推演也可完成活动。

## 来源定位

版本 `a8a6fbec4e0e866d6d779b10889bb4f5567e70eb`。原址：[固定版本 index.js](https://github.com/sindresorhus/p-limit/blob/a8a6fbec4e0e866d6d779b10889bb4f5567e70eb/index.js)，原始路径 `materials/material-1/index.js`，本地 [源码](/sources/material-1/index.js)：16–68 行核心链、70–75 行计数 getter。

原始 `materials/material-1/test.js`，副本 [测试](/sources/material-1/test.js)：`runs all tasks asynchronously`、`activeCount and pendingCount properties`、`propagates async execution context properly`。三 Promise 图、快照和探针是生成的教学材料。
