---
title: "失败不是停机：两条 Promise 通道"
slug: errors-and-map
description: "解释 result 的状态采纳、失败后的槽位释放，以及 map 的迭代异常分支。"
order: 4
quiz: false
agentOnly: true
agentInstructions: |
  能力是区分调用者结果与内部调度等待，分析任务失败和输入遍历失败。遵循共享教学原则，一次一问并等待，欢迎自然问题与短 detour，错误后给解释和提示，不追加无必要测试。
  必读 {origin}/sources/material-1/index.js 的 run L32–48 和 map L106–126；{origin}/sources/material-1/test.js 的 continues after sync throw、does not ignore errors、map does not leave unhandled rejections when the iterable throws、map rejects immediately with the iterable error and still runs already scheduled tasks。版本 a8a6fbec4e0e866d6d779b10889bb4f5567e70eb。
  首问活动：容量 1，先提交同步抛错的 T，再提交成功的 W，T 拒绝是否使 W 永久排队？等待学生解释后沿 result/resolve/await/next 给反馈。不要先给完整答案。预期 T 外层拒绝但 next 仍释放并让 W 获准。
  深度活动随后用生成器 yield 'm'、yield 'n' 后抛错，mapper 也可能拒绝；只逐步问 map 返回错误、已提交工作、catch 的用途。预期外层报告迭代错误，已提交项不被取消，给每个已提交 promise 挂 catch 避免无人观察的拒绝，而非返回部分结果。
  提示：内部 catch{} 只包住 await，调用者通道已经 resolve(result) 采纳原拒绝。完成条件：参与两类失败的比较并获反馈，能区分错误传播、队列推进与取消，不要求逐条背测试。
---

# 失败不是停机：两条 Promise 通道

“库捕获了错误”不一定意味着“调用者看不到错误”。要看捕获发生在哪条 Promise 链上。

## 三个对象，两个用途

[index.js](/sources/material-1/index.js) 的 `run` 中有：

1. `generator` 创建、返回给调用者的外层 Promise。
2. 执行用户函数所得的 `result` Promise。
3. 调度器内部的 `await result`，用于决定何时释放槽位。

内部启动许可 Promise 属于上一课的队列交接；这里聚焦结果与收尾。

```js
const result = (async () => function_(...arguments_))();
resolve(result);
try {
  await result;
} catch {}
next();
```

异步包装有两个用处：普通返回值变成可等待的结果，同步抛错也变成拒绝的 Promise。同步抛错不会跳过创建 `result` 后的收尾控制流。

## resolve 不等于“已经完成”

`resolve(result)` 不会把 Promise 当普通值立即交给调用者，而是让外层 Promise **采纳**它的最终状态。如果 result 还在等待，外层也等待；如果 result 拒绝，外层拒绝同样的原因。

```text
模型生成的状态关系图

用户函数 ──→ result ──→ 外层 Promise（成功值或拒绝原因）
                    └─→ 内部 await → catch（仅失败时）→ next
```

内部捕获的目的，是让调度器的等待链正常走到 `next()`，避免这个内部等待产生未处理拒绝；它没有把 result 改成成功，也没有改变已采纳它的调用者 Promise。调用者仍需要 `await` 的 try/catch、`allSettled` 等适当错误处理。

## 汇总失败和任务取消是两回事

模型生成例子：容量 2，任务 A 成功，B 拒绝，C 排队。B 释放槽位后，C 仍可运行。`Promise.all` 会在观察到拒绝时拒绝，但不命令限流器取消 C，也不会撤销已经进行的 A。

若你需要知道每项结果，用 `Promise.allSettled`。若业务要求失败后停止**尚未启动**的工作，需要显式设计清队列与结果收尾；第 5 课会说明为什么默认清队列后 `allSettled` 也可能一直等不到结果。

先和教师追踪容量 1 下“同步抛错 T、随后成功 W”的轨迹，再看相关测试：`continues after sync throw` 和 `does not ignore errors`。这些是原测试的断言，不是本次运行报告。

## map 的另一种失败：输入本身坏了

mapper 失败发生在已提交任务中；迭代失败发生在 `Array.from` 消费输入时。这两种异常不是一个阶段。

```js
// 模型生成活动输入，不是原测试的复制。
function* inputs() {
  yield 'm';
  yield 'n';
  throw new Error('input failed');
}
```

本版本 `map` 会一边遍历一边调用 `generator`，并把产生的 Promise 保存到 `promises`。如果上面的输入在途中抛错，`Promise.all(promises)` 那行还没到达。

源码的补救分支是：

```js
catch (error) {
  for (const promise of promises) {
    promise.catch(() => {});
  }
  throw error;
}
```

它给已经提交的 Promise 安装拒绝处理器，否则这些任务稍后失败时，原本负责观察它们的 `Promise.all` 没有创建，可能产生未处理拒绝。随后重新抛出**遍历错误**，让 map 返回的 Promise 拒绝。它没有清队列，没有等待这些工作结束，也没有返回已经处理的部分结果。

因此“map 的结果已拒绝”不意味着系统已无任务。空输入正常得到空数组；若第一项之前就抛错，没有 mapper 被提交。这些边界均有本版本测试。

## 活动的第二步

用上述两项输入，与教师逐步判断：map 的调用者首先得到哪类错误？已经提交的两项是否仍可能启动？如果其中一项随后也拒绝，源码在哪一行观察它？先尝试一个判断，再读对应分支；无需运行可能制造未处理拒绝的坏示例。

## 原件与版本

原始本地路径 `materials/material-1/index.js` 的 `run` L32–48、`map` L106–126；[本地实现](/sources/material-1/index.js)。[readme.md](/sources/material-1/readme.md) 的 `limit.map` 与 [test.js](/sources/material-1/test.js) 的 `non-promise returning function`、`continues after sync throw`、`does not ignore errors`、`map rejects with the mapper error`、`map does not leave unhandled rejections when the iterable throws`、`map rejects immediately with the iterable error and still runs already scheduled tasks` 支持上述行为。

原仓库 https://github.com/sindresorhus/p-limit ，固定输入版本 `a8a6fbec4e0e866d6d779b10889bb4f5567e70eb`（7.3.3）。测试原 URL：https://github.com/sindresorhus/p-limit/blob/a8a6fbec4e0e866d6d779b10889bb4f5567e70eb/test.js 。状态图和活动为模型生成，未执行上游测试。
