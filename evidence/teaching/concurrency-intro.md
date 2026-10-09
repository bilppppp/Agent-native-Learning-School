
## Pi session started 2026-10-09T07:20:53.456Z

Model: openai-codex/gpt-6.1-sol. Learner: Codex acting as an evaluator, not a human participant.

**Learner (Codex evaluator)**

I'm a student at concurrency-intro. My student ID is eager-traveler-8361. Let's work on the 从任务开始时刻理解并发名额 lesson together! Fetch http://localhost:4323/llms.txt for the shared teaching contract. If you are using Pi, also fetch http://localhost:4323/harness/pi.txt. Then fetch http://localhost:4323/api/lessons/start-and-slots?studentId=eager-traveler-8361 and my progress before starting; refresh the lesson after I ask to change teaching mode.

**Pi**

我们先看一个小例子（`waitForIO` 代表异步操作）：

```js
async function work(id) {
  console.log('开始', id);
  await waitForIO(id);
  return id;
}

const p = work('A');
console.log('调用之后');
```

你预测：`开始 A` 会在调用 `work('A')` 时立刻打印，还是等到有人 `await p` 时才打印？

**Learner (Codex evaluator)**

我认为要等到 await p 才会打印，Promise 不是先保存任务吗？

**Pi**

这是一个常见的混淆：**Promise 表示将来的结果，不是一个等着你启动的任务。**

调用 `work('A')` 时，函数体会立即执行到第一个 `await`，所以顺序是：

```text
开始 A
调用之后
```

即使从不写 `await p`，`work` 也已经开始了。`await p` 是等待结果，不是按下启动按钮。

真正能“保存任务、留待调用”的是函数，例如：

```js
const task = () => work('A'); // 这里只保存函数，没有调用 work
```

沿着这个区别看下面的代码：

```js
const jobs = ['A', 'B', 'C'].map(id => work(id));
await Promise.all(jobs);
```

执行完第一行、还没进入 `Promise.all` 时，你觉得哪些任务已经开始了？

**Learner (Codex evaluator)**

A、B、C 已经都开始了，是 map 调用 work 启动的。Promise.all 只是等结果。请切回简单模式，继续用时间线讲。

**Pi**

对，启动的是 `map` 里的 `work(id)` 调用。已切回简单模式。

用纸上时间线看：A、B、C 按顺序提交，耗时分别为 **3、1、1**。忽略调度开销，共享 `limit(1)` 时：

```text
时刻 0：A 开始；B、C 排队
时刻 3：A 完成，B 开始
时刻 4：B 完成，C 开始
时刻 5：C 完成
```

**提交**是登记任务，**开始**是调用 `work`，**完成**才释放名额；等待 I/O 期间仍占名额。

现在改为上限 **2**：时刻 0，A、B 开始，C 排队。时刻 1，B 完成但 A 还没结束——**C 可以立即开始吗？**

**Learner (Codex evaluator)**

可以，B 结束就释放一个名额，C 在时刻1开始，2结束，A在3结束。并发2限制的是未完成任务，I/O 等待也占名额。要延迟调用就写 limit(() => work(id))，不能先 work(id) 再传给 limiter。

**Pi**

完全正确：C 在时刻 1 补上空位，不必等 A；`limit(() => work(id))` 把启动权交给 limiter。你已完成纸上追踪，并说明了并发名额与延迟调用的关键区别。


**Pi**

本课已记录为完成 ✅

要继续下一课，学习如何让多个任务共享同一个 limiter 吗？

**Learner (Codex evaluator)**

继续。

**Pi**

进入第二课：**用同一个 limiter 控制整组任务**。

```js
const ids = ['A', 'B', 'C', 'D'];
```

要让这四项任务整体最多有 **2 个未完成任务**，应该创建一个共享的 limiter，还是每个任务各创建一个？

## Pi session started 2026-10-09T07:34:23.334Z

Model: openai-codex/gpt-6.1-sol. Learner: Codex acting as an evaluator, not a human participant.

**Learner (Codex evaluator)**

我是 concurrency-intro 的学生，ID eager-traveler-8361。这是新的 Pi 会话。请读取 http://localhost:4323/harness/pi.txt，按服务器保存的进度和教学模式继续课程，不要重学已完成活动。

**Pi**

已读取服务器记录：第一课「从任务开始时刻理解并发名额」已完成，不再重学。当前是 **沉浸模式**，我们继续第二课「用同一个 limiter 控制整组任务」。

先看一个小情境：有 A、B、C、D 四个任务，希望整组最多同时进行两个。

你觉得应该创建**一个共享的 limiter**，还是**每个任务各创建一个 limiter**？为什么？
