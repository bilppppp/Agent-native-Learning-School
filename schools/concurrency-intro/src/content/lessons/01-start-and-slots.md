---
title: 从任务开始时刻理解并发名额
slug: start-and-slots
description: 区分提交、开始和完成，用三个任务解释并发上限与排队。
order: 1
quiz: false
agentOnly: true
agentInstructions: |
  本课建立能力：指出异步操作何时启动，并用名额与等待队列预测并发为 1 或 2 时的执行过程。
  遵循共享教学原则，一次提出一个小问题并等待；欢迎自然提问，温和纠错，按需解释，不反复测验。允许学习者选择短支线或调整节奏。只在必要时简短确认其 Promise 背景，不增加访谈课。
  必读 {origin}/sources/material-1/readme.md 的 Usage、API pLimit 与 limit(fn, ...args)、activeCount/pendingCount；{origin}/sources/material-1/index.js 的 resumeNext、enqueue、run、next；{origin}/sources/material-1/test.js 的 runs all tasks asynchronously。
  来源版本为 a8a6fbec4e0e866d6d779b10889bb4f5567e70eb（package.json 标注 7.3.3）。下面的名额比喻与时间表是生成的解释，不是原文。
  首个学生提示只让其预测直接调用 work('A') 时函数体的第一行何时发生，不一次展示整套答案。随后用 A/B/C 的纸上时间线，或 {origin}/activities/concurrency-lab.mjs 的 starts 活动比较立即调用与共享 limit(1)。无需安装或构建。
  如误认为 Promise.all 会限制并发，提示观察 Promise 数组创建时发生了什么。如疑惑提交后 activeCount 已增加但日志尚未出现，说明名额已保留，函数体稍后异步调用，不展开微任务规范。
  完成条件：参与预测和观察或纸上追踪，收到反馈后能说明并发 2 允许两个未结束任务，并指出一个必须延迟调用的函数。允许修正，不要求首次答对。接着进入共享 limiter 的用法。
---

## 核心想法：限制的是“尚未结束的任务数”

你已熟悉函数和 Promise；这里只补上容易混淆的一点：**等待一个 Promise，不等于决定它对应的操作何时开始。**

```js
async function work(id) {
  console.log('开始', id);
  await waitForIO(id); // 假设这是一个返回 Promise 的异步操作
  return id;
}

const jobs = ['A', 'B', 'C'].map(id => work(id));
const results = await Promise.all(jobs);
```

这是生成的概念示例，`waitForIO` 是占位函数，不是 p-limit 的 API。调用 `work(id)` 时，函数体会立即执行到第一个 `await`。三个任务都在创建 `jobs` 时启动了；`Promise.all` 负责汇总结果，没有设置并发上限。

并发上限为 2，可以想成两张“名额卡”：任务拿到卡才被调用，在等待 I/O 的期间仍占用卡，成功或失败后才归还。其余任务排队。这是教学比喻，不代表创建两个线程。并发意味着任务的生命周期重叠，不要求 JavaScript 同时在两个 CPU 核心执行函数体。p-limit 也不会把耗时的同步计算自动变成多线程计算。

## 小例子：不是分批等齐，而是空位立即补上

假设任务 A、B、C 按此顺序提交，耗时分别为 3、1、1 个时间单位，上限为 2。忽略调度开销：

| 时刻 | 事件 | 占用名额的任务 | 等待任务 |
| --- | --- | --- | --- |
| 0 | A、B 开始 | A、B | C |
| 1 | B 完成，C 得到空位 | A、C | 无 |
| 2 | C 完成 | A | 无 |
| 3 | A 完成 | 无 | 无 |

这里不必等 A、B 都完成才开始 C。上限为 1 时则是 A 完成后 B 开始，B 完成后 C 开始，共 5 个理想时间单位。时间表是生成的理想模型，不是实际计时或速度保证。

这个模型对应源码里的四个动作：`enqueue` 登记待执行任务（内部队列保存唤起执行的入口，而非直接存放用户函数）；`resumeNext` 在 `activeCount < concurrency` 时保留名额并取下一项；`run` 调用函数并等它结束；`next` 归还名额并尝试补上下一项。入门只需理解这条因果链，不需要重写队列。

有一个细节：当前实现会先增加 `activeCount`，再通过 Promise 回调异步进入函数体。所以“提交后已经占用名额”和“用户函数第一行已经打印”不完全是同一时刻。不要用一次同步日志推断任务已执行到哪里。

## 容易混淆的边界

- **并发限制不是每秒请求数限制。** 上限 2 指任意时刻最多两个未结束任务；任务都很快时，一秒仍可能开始很多次请求。这个结论来自名额模型，不是 p-limit 提供了限速 API。
- **等待 I/O 仍占名额。** 不然等待网络响应的请求就能无限叠加。
- **已经启动的任务不能被事后“放回队列”。** 下一课要把“调用任务的权利”交给 limiter，而不是先创建所有执行中的 Promise。

## 核心问题与活动

先选择一个问题讨论，不必一次回答全部：

1. 在 `map(id => work(id))` 里，谁启动了任务？
2. 如果 B 先完成，C 应等 A 吗？
3. 如何让 p-limit 而不是你的 `map` 决定启动时刻？

建议先画上面的三任务时间线，再把上限改成 1。若愿意观察日志，可以在学校根目录运行模型生成的活动：

```sh
node public/activities/concurrency-lab.mjs starts
```

活动调用本地复制的真实 p-limit；需 Node.js 20+ 和学校已有的 `yocto-queue` 依赖，无需安装项目。不能运行时，手动追踪代码即可。活动文件：[concurrency-lab.mjs](/activities/concurrency-lab.mjs)。

**完成标准：**参与一次预测与观察（或纸上追踪）并收到反馈，能用自己的话区分“提交、开始、完成”，解释上限为 2 的排队过程。不要求第一次预测正确。

这让你能在下一课判断：哪段代码真正控制了异步任务的开始。

## 可追溯来源

本课读取的原始材料来自 `schools/concurrency-intro/materials/material-1/`，原仓库 `https://github.com/sindresorhus/p-limit`，版本锁定到 commit `a8a6fbec4e0e866d6d779b10889bb4f5567e70eb`，`package.json` 标注 `7.3.3`。

- [readme.md 本地原文](/sources/material-1/readme.md)：Usage、API 的 `pLimit(concurrency)`、`limit(fn, ...args)`、`activeCount`、`pendingCount`。原文 URL：`https://github.com/sindresorhus/p-limit/blob/a8a6fbec4e0e866d6d779b10889bb4f5567e70eb/readme.md`。
- [index.js 本地原文](/sources/material-1/index.js)：`enqueue`、`resumeNext`、`run`、`next`。原文 URL：`https://github.com/sindresorhus/p-limit/blob/a8a6fbec4e0e866d6d779b10889bb4f5567e70eb/index.js`。
- [test.js 本地原文](/sources/material-1/test.js)：`concurrency: 1`、`runs all tasks asynchronously`。这些测试是行为证据，本课程未运行官方测试套件。原文 URL：`https://github.com/sindresorhus/p-limit/blob/a8a6fbec4e0e866d6d779b10889bb4f5567e70eb/test.js`。

名额比喻、时间线、一般 JavaScript 的调用时机解释和教学活动均为课程生成内容，不是原仓库引用。
