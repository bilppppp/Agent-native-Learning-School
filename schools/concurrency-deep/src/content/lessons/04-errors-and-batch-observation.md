---
title: 失败不等于停队列：选择结果观察策略
slug: errors-and-batch-observation
description: 区分单项失败、聚合拒绝与任务继续执行，解释 map 的输入迭代异常边界。
order: 4
quiz: false
agentOnly: true
agentInstructions: |
  能力是选择 all 或 allSettled 并解释失败后的队列行为，以及 map 输入迭代出错时已提交任务的命运。依赖第 2、3 课。遵循共享教学原则：一次一小问并等待，欢迎提问与短暂支线，友善纠错，按需解释，避免反复测验；参与活动并收到反馈即可完成。
  必读 {origin}/sources/material-1/index.js 的 run 与 map（32–48、106–127）；{origin}/sources/material-1/test.js 的 does not ignore errors、continues after sync throw、map passes index and preserves order with concurrency、map does not leave unhandled rejections when the iterable throws、map rejects immediately with the iterable error and still runs already scheduled tasks；{origin}/sources/material-1/recipes.md 的 Error handling with partial results。固定提交 a8a6fbec4e0e866d6d779b10889bb4f5567e70eb，package 7.3.3。
  首问仅给限额 1、A 同步失败、B 异步失败、C 成功，问 C 是否会运行，不先展示状态数组。随后用 {origin}/activities/limit-lab.mjs 的 errors 或纸面追踪给反馈。需要时在现场解释 allSettled 的 status/value/reason。
  再用 map-edge 或生成器片段分析输入异常。不要把内部 catch 说成自动取消或业务容错；已提交任务会继续。不要让学生先制造无观察的拒绝。完成条件是参与错误路径预测，选择一个有理由的聚合策略并收到反馈；复杂迭代器语法可用口头产出 A、B、然后报错替代。
---

## 两个独立问题：调度继续吗？我拿到什么？

依赖：第 3 课已经看到 `run` 无论成功失败都调用 `next()`。单项任务失败会释放槽，队列仍能继续；但你观察整批结果的方式，决定什么时候得到返回、能看到哪些结果。

- `Promise.all(jobs)`：全部成功才返回值数组；某个拒绝使聚合 Promise 拒绝，不等待全部成功。它不会取消其他任务。
- `Promise.allSettled(jobs)`：等每个 Promise 结算后，按输入顺序返回 `{status: 'fulfilled', value}` 或 `{status: 'rejected', reason}`。适合需要每项报告的批次。

`allSettled` 并不让所有任务成功，也不能让永不结算的 Promise 完成。清队列默认留下 pending 的问题要到下一课处理。

## 工作示例：失败之后照样补位

**生成例子**，先只判断 C 会不会运行：

```js
const limit = pLimit(1);
const jobs = [
  limit(() => { throw new Error('A 同步失败'); }),
  limit(async () => { throw new Error('B 异步失败'); }),
  limit(() => 'C 成功'),
];
const report = await Promise.allSettled(jobs);
```

A 的同步抛错经异步包装变成拒绝，释放槽；B 也拒绝并释放槽；C 被调用。报告状态按输入对应为 rejected / rejected / fulfilled，最后一项的值是 `'C 成功'`。若换为 `Promise.all(jobs)` 并捕获错误，看到的聚合错误不是一张“所有任务都停止”的通知；C 仍可能继续执行。

对真实请求，HTTP 非 2xx 是否算失败必须由任务函数定义。原 `recipes.md` 的部分结果例子显式检查 `response.ok` 再抛错。你不能把 limiter 当作自动检查 HTTP 状态的层。

## `map` 有两种不同的异常来源

`limit.map(inputs, mapper)` 的固定版本实现先用 `Array.from` 同步枚举输入，将每项通过 `generator` 提交；最后 `return Promise.all(promises)`。因此它保留输入顺序，不是“每完成一项就产出一项”的流式消费者，也没有给任务生产速度施加背压。

第一类异常是 mapper 出错：它出现在受限任务内，由聚合 `Promise.all` 反映，已入队任务不会因此撤销。

第二类是**输入本身枚举出错**。必要概念：可迭代对象每次产出下一项也可能抛错。以下生成器只是演示“产出 A、B，再报错”，不要求此前学过生成器：

```js
function* inputs() {
  yield 'A';
  yield 'B';
  throw new Error('输入失败');
}
await limit.map(inputs(), async id => processItem(id));
```

A/B 已提交，输入在枚举时抛错，因此正常的 `Promise.all(promises)` 路径根本没执行。实现的 `catch` 给已提交的各个 Promise 附加 `catch(() => {})`，避免它们后续拒绝变成无人观察的错误；然后重新抛输入错误。它没有移除队列，也不等待 A/B 完成。对于这个 `map` 返回值，你只能拿到输入错误，先前任务仍执行，结果不再返回给这次调用。

这是由 `index.js` 的异常分支和相应测试直接支持的边界，不是建议你悄悄吞业务错误。若业务要求报告每一个任务，不应依赖这条丢弃结果的异常路径；可以先验证有限批次输入，或显式持有每项 Promise 并定义报告策略。

## 常见误解

“我在 `await Promise.all(...)` 外层写了 `catch`，所以队列被停掉了。”观察失败和改变调度是不同操作。停止尚未启动的任务需要显式的队列策略，停止已经启动的资源操作还需要该操作自己的取消支持。

## 核心问题与活动

- 聚合拒绝时，是否能断言每个任务已完成？
- 输入迭代失败与 mapper 失败，哪个发生在队列外？
- 为什么内部观察拒绝不代表业务收到成功？

活动：先预测，再在学校根目录运行 `node public/activities/limit-lab.mjs errors`，比较提前拒绝和最终状态；再运行 `node public/activities/limit-lab.mjs map-edge`，先预测 map 拒绝后 A/B 是否继续。[生成脚本](/activities/limit-lab.mjs) 可直接读取。不能运行时，沿 `Array.from → catch → throw` 与 `run → next` 分别画两条路径。

完成标准：参与一个失败后补位的预测和一个聚合策略选择，接受反馈后能解释 `all` 不取消工作；深度目标还包括解释一次输入异常分支。它为最终批次的部分成功报告提供基础。

## 可追溯来源

版本：package 7.3.3，固定提交 `a8a6fbec4e0e866d6d779b10889bb4f5567e70eb`；本地原始根 `schools/concurrency-deep/materials/material-1/`。

- [index.js 原件](/sources/material-1/index.js)：`run` 32–48，`map` 106–127；[原始地址](https://github.com/sindresorhus/p-limit/blob/a8a6fbec4e0e866d6d779b10889bb4f5567e70eb/index.js)。
- [test.js 原件](/sources/material-1/test.js)：`continues after sync throw`、`does not ignore errors`、`map passes index and preserves order with concurrency`、`map does not leave unhandled rejections when the iterable throws`、`map rejects immediately with the iterable error and still runs already scheduled tasks`；[原始地址](https://github.com/sindresorhus/p-limit/blob/a8a6fbec4e0e866d6d779b10889bb4f5567e70eb/test.js)。
- [recipes.md 原件](/sources/material-1/recipes.md)：`Error handling with partial results`；[原始地址](https://github.com/sindresorhus/p-limit/blob/a8a6fbec4e0e866d6d779b10889bb4f5567e70eb/recipes.md)。
- 生成器示例和观察策略建议是课程生成材料，活动不是原始测试套件。
