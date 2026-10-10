---
title: "核心源码：从入队到交接槽位"
slug: core-scheduler
description: "逐步追踪 generator、enqueue、resumeNext、run 和 next，解释占位与微任务边界。"
order: 3
quiz: false
agentOnly: true
agentInstructions: |
  能力是沿真实控制流解释占位、延迟调用和交接，不要求背函数名。按共享教学原则一次提出一个小问题后等待；允许学生用自己的图或短 detour，解释错误而不责备，不用整组问题反复测验。
  必读 {origin}/sources/material-1/index.js L16–68，及 {origin}/sources/material-1/test.js 的 runs all tasks asynchronously、activeCount and pendingCount properties。版本 a8a6fbec4e0e866d6d779b10889bb4f5567e70eb。上下文 detour 才读 propagates async execution context properly。
  用 {origin}/activities/slot-trace.md 的源码空表。容量 1，提交受门控的 U 与返回当前变量的 V，提交后同步修改变量；首问只问同步提交结束时两个计数，不给后续轨迹。预期 active=1、pending=1，两函数都未调用；U 开始仍是 1/1；U 的 next 交接后 1/0 而 V 的用户函数尚待微任务；最后 0/0。
  若学生把 queueItem.run 当成用户函数，提示 L56 赋值是 internalResolve，真正调用在 L34。可选运行 {origin}/activities/promise-boundaries.mjs，只把它作为 Promise 前置语义实验，不冒充 p-limit 运行。
  完成条件：参与状态轨迹并收到反馈，能定位递增、调用与递减，说明计数可先于用户函数日志。无需数精确微任务轮数或安装依赖。
---

# 核心源码：从入队到交接槽位

这一课把“借一个槽位”翻译成真实代码。先抓五个函数的职责，而不是逐行背诵。

打开 [index.js](/sources/material-1/index.js) L16–68。`queue` 保存等待项，`activeCount` 保存已占用槽位数；队列依赖源码未提供，我们只依据这里使用的接口讨论它，不猜内部数据结构。

## 从调用者到队列

```js
const generator = (function_, ...arguments_) => new Promise((resolve, reject) => {
  enqueue(function_, resolve, reject, arguments_);
});
```

这个 Promise 是返回给调用者的结果通道。其 executor 同步执行，所以 `enqueue` 在 `limit(fn)` 调用期间就运行。但用户函数不在此处调用。

`enqueue` 又创建一个内部 Promise：

```js
const queueItem = {reject};
new Promise(internalResolve => {
  queueItem.run = internalResolve;
  queue.enqueue(queueItem);
}).then(run.bind(undefined, function_, resolve, arguments_));
```

注意两个不同的 `run`：属性 `queueItem.run` 存的是**内部 Promise 的 resolve 函数**；真正执行用户函数的是后面 `.then(...)` 的 `run`。`bind` 只是提前绑定将来要传的参数，不是现在调用。

## 槽位先占住，用户函数后执行

`resumeNext` 的关键三行：

```js
if (activeCount < concurrency && queue.size > 0) {
  activeCount++;
  queue.dequeue().run();
}
```

队列项被取走，槽位立即加一，内部 Promise 被兑现。其 `.then` 回调必须等当前同步代码结束后，在微任务中执行。微任务可以先理解成 Promise 安排的短后续工作：它不插入正在运行的同步函数中间。

即使函数尚未调用，槽位也必须先占住。否则在一次同步提交许多项时，每项都可能看到“还有空位”并获准，随后一起执行就超限。这是由代码推导的设计理由。

```text
模型生成的控制流图（箭头对应实际调用或 Promise 后续）

limit(fn, args) = generator
  └─ 同步 enqueue
       ├─ 队列项 {reject, run: internalResolve}
       └─ 若有空位 → resumeNext
                         ├─ activeCount++
                         └─ 出队、internalResolve()
                                  ↓ 微任务
                                run
                                  ├─ 调用 fn(...args)，得到 result
                                  ├─ 外层 resolve(result)
                                  └─ 等待 result 完成
                                           ↓
                                         next
                                           ├─ activeCount--
                                           └─ resumeNext（再交接一项）
```

## 一次交接为何只取一项

`next` 先递减再调用 `resumeNext`。在容量固定且没有其他控制操作的普通轨迹中，一个任务完成释放一个槽位，因此接替一项即可。容量被上调时需要一次补充多项，第 5 课的 setter 使用循环完成。

`pendingCount` 读 `queue.size`；已经出队、获准等待微任务的项不再 pending。源码测试 `runs all tasks asynchronously` 就在同步提交后先检查 activeCount，再修改变量，最终函数读到修改后的值。这是异步调用边界的证据，不是说计数等于函数实际已进入的数量。

### 从代码推出固定容量的不变量

设有限容量为 `c`，占位数为 `a`。初始 `a=0`；唯一加一的位置先检查 `a<c`，整数加一后仍有 `a<=c`。每个获准项进入一次 run，等待结果后进入一次 next，递减一次；等待项不会凭空释放槽位。因此在固定容量的普通轨迹中有 `0<=a<=c`。关键检查和递增之间没有 await，不会让其他提交插入这两步中间；不需要想象一个隐藏的锁。

这是基于源码的简短归纳，不是压测结果。降额会改变 `c`，不能直接套用固定容量结论；永久不结算的任务会一直占位，也不违反上限，却影响队列能否向前推进。并发安全与任务最终完成是不同问题。

## Promise 前提不熟悉时

可以先猜测再运行 [promise-boundaries.mjs](/activities/promise-boundaries.mjs)：

```sh
node school/public/activities/promise-boundaries.mjs
```

这是独立的、模型生成的原生 Promise 实验，不使用也不模拟 p-limit。它展示 executor 同步、then 延后，以及用另一个 Promise resolve 时的状态采纳。没有本地 Node 时，用代码逐步分析即可，下一课会解释采纳。

## 活动：记录四个边界

容量 1，先提交等待手动开关的 U，再提交返回变量值的 V；同步提交后立刻修改变量。与教师一起用[空表](/activities/slot-trace.md)只分析四个边界。先回答同步提交结束时的计数，再找用户函数第一次被调用的位置。不必猜确切有几个微任务。

源码 L53–58 的注释说，排入内部 resolve 而非直接排入执行函数是为了保留异步执行上下文。可选深入：[test.js](/sources/material-1/test.js) 的 `propagates async execution context properly` 用 AsyncLocalStorage 检查各任务的 id。这支持该版本的设计意图与测试覆盖；本课不推断所有平台的上下文机制，也不要求学习 Node 异步钩子。

## 来源定位

原始本地路径 `materials/material-1/index.js` 的 `generator` L66–68、`enqueue` L50–64、`resumeNext` L19–25、`run` L32–48、`next` L27–30；本地 [index.js](/sources/material-1/index.js) 与 [test.js](/sources/material-1/test.js) 是未修改原件。

原始 URL：https://github.com/sindresorhus/p-limit/blob/a8a6fbec4e0e866d6d779b10889bb4f5567e70eb/index.js 。版本固定为输入 commit `a8a6fbec4e0e866d6d779b10889bb4f5567e70eb`，包自报 7.3.3。图与门控活动是模型生成的源码阅读辅助。
