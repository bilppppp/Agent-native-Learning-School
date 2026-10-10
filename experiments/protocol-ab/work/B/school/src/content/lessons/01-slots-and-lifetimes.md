---
title: 槽位与任务生命周期
slug: slots-and-lifetimes
description: 用时间线区分提交、启动与完成，建立并发限制而非限速的模型。
order: 1
quiz: false
agentOnly: true
agentInstructions: |
  本课能力：区分提交、占槽位、调用任务、结束和结果汇总；用耗时数据预测并发时间线。
  阅读 {origin}/sources/material-1/readme.md 的 Usage、limit.activeCount、limit.pendingCount；{origin}/sources/material-1/index.js 的 resumeNext、next、run（19–47 行）；对照 {origin}/sources/material-1/test.js 的 concurrency: 1。版本 a8a6fbec4e0e866d6d779b10889bb4f5567e70eb。
  前提仅是函数和 Promise。若需要，说明回调函数尚未被调用时没有启动其工作；Promise.all 接收的是已经创建的 Promise。
  活动把正文 B 的耗时改为 80，上限保持 2，让学习者预测启动/完成时间，再给出时间线反馈。重点追问谁最早释放槽位，以及结果数组为何仍按输入顺序。
  槽位模型是教学表示，不是线程实现；activeCount 与回调调用的细微时差留给第 3 课。不要把定时器的理论时间宣称为真实运行精确耗时。
  完成条件：学习者提交或口述一条时间线，解释限制对象，并收到针对预测的反馈；无需一次全部正确。
---

# 限制的不是 Promise 数量，而是未结束的任务

假设要处理三个独立任务。我们熟悉 `Promise.all`：它把多个结果汇总起来。但谁决定何时启动任务？

```js
const promises = items.map(item => processItem(item));
const results = await Promise.all(promises);
```

这里 `map` 已经调用每一个 `processItem`。如果函数一调用就开始请求，等待 `Promise.all` 时它们已经启动了。`Promise.all` 不是开工许可证，只是结果汇总器。

p-limit 的办法是先交出一个**尚未调用的函数**。当有可用槽位时才调用它，等它返回的结果结算后再让出槽位。

```js
import pLimit from 'p-limit';

const limit = pLimit(2);
const promises = items.map(item => limit(() => processItem(item)));
const results = await Promise.all(promises);
```

一次调用 `limit` 是提交工作，不等于工作已经结束。可以有很多提交，但最多两个任务占用槽位。这里的“槽位”是计数模型，不是两个专用线程。

## 一个能算清楚的时间线

以下是生成的理想化教学例子，不是上游性能测试：A 耗时 60，B 耗时 20，C 耗时 30；按 A、B、C 提交，无启动开销，各任务耗时互不影响。

上限为 2：

```text
时间    0          20              50       60
槽位甲  [---------------- A ----------------]
槽位乙  [--- B ----][--------- C --------]
```

| 时刻 | 事件 | 尚未结束的任务 | 等待槽位 |
| --- | --- | --- | --- |
| 0 | A、B 启动 | A、B | C |
| 20 | B 结束，C 补位 | A、C | 无 |
| 50 | C 结束 | A | 无 |
| 60 | A 结束 | 无 | 无 |

C 不需要等 A，因为许可证属于这个共享池，不属于固定批次。“每批两个，等整批结束再处理下一批”则会让 C 等到 60，白白闲置一个槽位。

上限为 1 时，A 在 0–60，B 在 60–80，C 在 80–110；总时间为 110。上限为 3 时，三者都在 0 启动，总时间仍为 60。并发并不总能进一步缩短时间：任务 A 已经是这个例子的最长瓶颈。

在简化的独立任务模型里，总耗时至少为 `max(最长单项耗时, 所有耗时之和 / concurrency)`。这是教学推导的下界，不是 p-limit 的耗时保证；调度、资源竞争或远端限制会改变实际运行时间。

## 三种顺序不要混淆

这个例子中：

- 提交顺序：A、B、C。
- 启动顺序：A、B、C，但前两个可以重叠。
- 完成顺序：B、C、A。
- `Promise.all([promiseA, promiseB, promiseC])` 的结果数组仍对应 A、B、C，而不是按完成时间排序。

“顺序汇总”与“并发执行”完全可以同时存在。

## 并发数不是每秒次数

并发为 2，意思是同时占用的槽位最多两个。在 2 个任务很快完成时，下一组会立即补位。因此它不保证“一秒只发两个请求”。若任务永久不结算，它也不会自动超时回收槽位。

JavaScript 异步 I/O 可以等待期间重叠；p-limit 本身不会把 CPU 密集的同步循环搬到其他线程。这是限制器机制的边界，不是它的性能缺陷。

## 试着改变一个条件

把 B 耗时从 20 改成 80，其他不变，上限仍为 2。先画时间线，再看解释。

A 在 60 结束后，C 从 60 开始，90 结束；B 在 80 结束。总耗时为 90，完成顺序变为 A、B、C。判断方法不是背顺序，而是找到“最早释放的槽位”。向教师说明你的预测并接受反馈即可；无需计时器或运行环境。

## 来源定位

本课使用版本 `a8a6fbec4e0e866d6d779b10889bb4f5567e70eb`（本地包声明 `7.3.3`）。原址：[p-limit 固定版本 README](https://github.com/sindresorhus/p-limit/blob/a8a6fbec4e0e866d6d779b10889bb4f5567e70eb/readme.md)，本地原始路径 `materials/material-1/readme.md`，副本：[readme.md](/sources/material-1/readme.md) 的 Usage 与计数 API。

机制见原始 `materials/material-1/index.js` 的 `resumeNext`、`next`、`run`，19–47 行：[本地源码](/sources/material-1/index.js)。验证意图见原始 `materials/material-1/test.js` 的 `concurrency: 1`：[本地测试](/sources/material-1/test.js)。时间线和下界是生成的解释，不是读取到的实测结论。
