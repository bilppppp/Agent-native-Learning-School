---
title: "并发槽位：控制的是何时启动"
slug: slots-and-starts
description: "用小任务时间线区分提交、开始与完成，理解为什么必须传函数。"
order: 1
quiz: false
agentOnly: true
agentInstructions: |
  本课建立延迟提交与槽位模型，依照共享教学原则，一次提出一个小问题后等待，欢迎自然提问，温和纠错；需要时解释，可选择短 detour，不反复测验。
  必读 {origin}/sources/material-1/readme.md 的 Usage、limit(fn, ...args)、activeCount、pendingCount，以及 {origin}/sources/material-1/index.js 的 generator/enqueue/run；版本 a8a6fbec4e0e866d6d779b10889bb4f5567e70eb。可核对 {origin}/sources/material-1/test.js 的 concurrency: 1。
  首个活动只问：容量 2，按顺序提交 P=6、Q=2、R=3、S=1，谁最先开始？不要一次给完整时间线。之后逐步问下一次完成和接替，用 {origin}/activities/slot-trace.md 的空表，或纸笔。
  预期理想轨迹：P/Q 在 0 开始，Q 在 2 完成放行 R，R 在 5 完成放行 S，P/S 在 6 完成；同刻事件内部先后不作考点。时长模型忽略微任务开销。
  常见误解是 Promise.all 启动任务或限流已有 Promise；提示寻找真正调用函数的括号。活动后再请修复提前调用形式。完成条件：参与轨迹预测、指出应提交未调用的函数并收到反馈，不要求一遍正确。
---

# 并发槽位：控制的是何时启动

如果有二十个任务，容量为 3，并不是只创建三个 Promise，而是同一时刻只允许有限数量的任务占用执行槽位。其他任务可以已经提交，却尚未调用其函数。

你可以把槽位想成三个借用名额。这是教学类比，不是线程池：JavaScript 中多个异步操作能在等待期间重叠，但 p-limit 不会把 CPU 计算变成多线程。

## 三个不同的动作

- **提交**：把函数交给 `limit`，获得代表最终结果的 Promise。
- **启动**：调度器允许调用该函数；其异步工作开始。
- **完成**：该函数返回的结果兑现或拒绝，调度器才释放槽位。

“已提交”不等于“已经调用”，而 `Promise.all` 只是汇总你交给它的结果 Promise，不负责限制函数的启动。

```js
// 模型生成示例；假设已有 p-limit 环境，不要求安装。
import pLimit from 'p-limit';

const limit = pLimit(2);
const jobs = ['a', 'b', 'c'].map(id =>
  limit(() => readRecord(id))
);
const records = await Promise.all(jobs);
```

`readRecord` 是情境中的异步函数，不是库内符号。关键是 `() => readRecord(id)` 暂时没有调用它。下面的写法即使外面套了 limiter，也已经晚了：

```js
const started = ids.map(id => readRecord(id)); // 所有读取在这里启动
const wrapped = started.map(promise => limit(() => promise));
```

调度器只能决定包装函数何时调用，不能让已经开始的读取退回“未开始”。直接写 `limit(readRecord(id))` 还会把函数需要的位置传成结果 Promise，是另一种错误。

## 一条可手算的时间线

模型生成示例：容量为 2，提交 A（4 个时间单位）、B（1）、C（2），每个任务一旦开始便按给定时长完成，忽略调度开销。

```text
时间      0       1       3       4
槽位一    A----------------------完成
槽位二    B---完成 C------完成
等待区    C       空
```

A 和 B 先占位。B 完成后，C 不必等 A，直接接替空位。这不是每两个任务组成一批、等整批结束才开始下一批；释放一个槽位就能交接一个任务。容量 1 才把完整异步调用串行化。

## 计数要怎样理解

`pendingCount` 是还在队列中等待的数量。`activeCount` 是已占位、尚未释放的数量。在这个版本里，占位可能早于用户函数真正执行一个微任务，因此不要把同步读取的 activeCount 当成“已有这么多条函数日志”。第 3 课会解释这个差别。

保持容量不变时，核心约束是已占槽位数不超过容量，而非 `activeCount + pendingCount` 不超过容量。排队可以远大于容量。

## 试一段新轨迹

按顺序提交 P（6）、Q（2）、R（3）、S（1），容量 2。先只判断哪两个开始。和教师逐次推进一次完成事件，填写[槽位状态表](/activities/slot-trace.md)，再检查有没有任务被过早启动。无需计时器或实际读取数据。

若你已有熟悉的文件读取场景，可以替换任务名字，保留这个推理过程。

## 依据与边界

本地原件：`materials/material-1/readme.md` 的 `Usage`、`limit(fn, ...args)`、`limit.activeCount`、`limit.pendingCount`；[本地 README](/sources/material-1/readme.md)。实现是 [index.js](/sources/material-1/index.js) 的 `generator`、`enqueue`、`run`（L32–68），串行例子的测试见 [test.js](/sources/material-1/test.js) 的 `concurrency: 1`。时间线与借用名额类比由模型生成，不是原测试结果。

来源仓库 https://github.com/sindresorhus/p-limit ，固定输入版本 `a8a6fbec4e0e866d6d779b10889bb4f5567e70eb`（包自报 7.3.3）。原文件地址可由 `https://github.com/sindresorhus/p-limit/blob/a8a6fbec4e0e866d6d779b10889bb4f5567e70eb/readme.md` 定位；本课程以本地副本为阅读依据。
