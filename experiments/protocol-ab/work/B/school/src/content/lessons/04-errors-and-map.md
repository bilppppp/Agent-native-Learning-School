---
title: 失败仍会释放槽位：汇总与 map 的异常边界
slug: errors-and-map
description: 区分任务拒绝、汇总失败和迭代失败，解释为何内部 catch 不吞调用者错误。
order: 4
quiz: false
agentOnly: true
agentInstructions: |
  本课能力：解释失败后的继续调度；选择 all 或 allSettled；追踪 map 在 mapper 失败与 iterable 失败时的不同路径。
  阅读 {origin}/sources/material-1/index.js 的 run（32–47）和 map（106–126）；{origin}/sources/material-1/readme.md 的 limit.map；{origin}/sources/material-1/recipes.md 的 Error handling with partial results。对照 {origin}/sources/material-1/test.js 的 continues after sync throw、does not ignore errors、map rejects with the mapper error、map does not leave unhandled rejections when the iterable throws、map rejects immediately with the iterable error and still runs already scheduled tasks。版本 a8a6fbec4e0e866d6d779b10889bb4f5567e70eb。
  依赖第 3 课 Promise 分工；就地说明同步 iterable 是用迭代器逐项提供值，Array.from 同步遍历，不是流式逐项 await。
  活动比较正文的 mapper 失败与生成器失败：说出外部得到哪个错误、已提交任务是否继续、哪个 catch 保护了哪个 Promise。可用表格推演，不运行项目测试。
  预期 P结果 的内部 await/catch 维持 next，P外 仍可拒绝；迭代失败在 Promise.all 未注册前退出，所以给已提交 P外 补 catch。继续执行不等于保留结果；allSettled 不会解决清队列的未结算问题。
  完成条件：参与两种失败路径比较并收到反馈，不要求准确记忆所有测试名。
---

# 调度器的“继续”与调用者的“失败”可以同时发生

本课沿用上限 1，按 A、B、C 提交。生成的情景是：A 成功，B 抛错，C 成功。

```text
A 成功 → 释放槽位 → B 启动
B 拒绝 → 释放槽位 → C 仍能启动
调用者的 B Promise 拒绝；Promise.all 也可先拒绝
```

这不是“吞错继续成功”，而是两种职责分离：调度器继续分配资源；调用者决定如何处理失败。

## 内部 catch 到底处理了谁？

回看 `run`：先 `resolve(result)` 让 P外 跟随 P结果，再 `await result` 并 catch，最后 `next()`。catch 只处理调度器等待 P结果 的路径，未把 P外 改成成功。

如果用户函数同步 `throw`，async 包装使它进入同一拒绝路径；如果异步拒绝，也一样释放槽位。`continues after sync throw` 与 `does not ignore errors` 测试分别验证继续与错误传播这两个方面。

调用者仍要观察返回的 Promise：

```js
const promises = items.map(item => limit(() => processItem(item)));
try {
  const values = await Promise.all(promises);
  // 使用完整成功结果
} catch (error) {
  // 汇总失败，不代表其他任务被取消
}
```

`Promise.all` 遇拒绝可以提前拒绝；它既不让 p-limit 停止，也不取消正在执行或排队的任务。不要把 catch 后的时刻当作“所有副作用已经结束”。如果需要所有任务的结算报告，选 `Promise.allSettled`：

```js
const reports = await Promise.allSettled(
  items.map(item => limit(() => processItem(item)))
);
```

结果仍与输入顺序对应，每项有 `fulfilled/value` 或 `rejected/reason`。前提是所有 Promise 最终都会结算；它不是超时或停止方案。

## map 是提交与汇总的便利封装

源码先建立 `promises=[]`，用 `Array.from` 遍历输入，将每项通过 `generator(function_, value, index)` 提交，再 `Promise.all(promises)`。

```js
const values = await limit.map([10, 20, 30], async (value, index) => {
  return transform(value, index);
});
```

value 是输入项，index 是遍历的序号。完成先后可以不同，结果顺序仍由 Promise.all 保持。这一点有上游 `map passes index and preserves order with concurrency` 测试。

需要部分结果时不要误认为 `limit.map` 自带 allSettled；用上面的手动提交写法即可。

## 为什么 map 中还有另一个 catch？

同步 iterable 是能逐项提供值的对象，例如数组、Set 或生成器。下面是生成的异常例子：

```js
function* inputs() {
  yield 'A';
  yield 'B';
  throw new Error('iterator failed');
}

await limit.map(inputs(), async value => {
  throw new Error(`mapper failed: ${value}`);
});
```

`Array.from` 同步拿到 A、B 并提交，然后取下一项时生成器抛错。问题发生在**输入的读取**，不是 mapper 内。代码还没走到 `Promise.all(promises)`，因此那两项 P外 尚未被汇总器观察。

即便 `run` 对各自 P结果 有内部 catch，P外 仍会拒绝；如果没人处理 P外，就可能有未处理拒绝。因此 `map` 的 catch 对已创建的 P外 补上：

```js
for (const promise of promises) {
  promise.catch(() => {});
}
throw error;
```

这只观察已提交项的拒绝，避免无人处理；不重试，不撤销工作，也不让 `map` 成功。`map` 返回的 Promise 拒绝为迭代器错误，已提交 mapper 仍会运行，其结果不再通过这个 map 调用交付。

反过来，若输入遍历正常、某个 mapper 拒绝，所有项已提交且到达 `Promise.all`，外部收到 mapper 错误。两者不能混为一个“map 出错”。

## 比较两条路径

| 情景 | 本次 map 的拒绝原因 | 已提交的其他项 | 对外部任务 Promise 的观察 |
| --- | --- | --- | --- |
| 输入正常，B mapper 拒绝 | mapper 错误 | 继续执行 | Promise.all 注册处理 |
| 输入给出 A、B 后抛错 | iterable 错误 | A、B 仍执行；后续项未提交 | catch 给已提交 Promise 补处理 |
| 输入一开始就抛错 | iterable 错误 | 没有工作 | 空列表，无需补处理 |

请选第二行解释“为什么 run 里已有 catch 还不够”。再把 mapper 改为成功，判断 iterable 失败是否仍会拒绝。答案仍是拒绝：输入协议失败是独立问题。向教师给出这两条路径的解释并接收反馈即可。

## 深度边界：限执行数不等于限提交数

`Array.from` 会一次性遍历/提交有限输入；mapper 被限制，遍历本身没有逐项等待槽位。大批输入仍会创建大量 Promise 与队列项。无限生成器会让这个同步遍历无法正常结束；`limit.map` 不是消费无限流的工具，也不是 async iterable 的流式 API。运行时 Array.from 能接受一些 array-like 对象，测试也覆盖这一点；但 `index.d.ts` 的公开 map 参数声明是 `Iterable<Input>`，不要把运行时宽容当作类型保证。

## 来源定位

版本 `a8a6fbec4e0e866d6d779b10889bb4f5567e70eb`。原址：[固定版本 index.js](https://github.com/sindresorhus/p-limit/blob/a8a6fbec4e0e866d6d779b10889bb4f5567e70eb/index.js)，原始 `materials/material-1/index.js`，副本 [源码](/sources/material-1/index.js) 的 `run`（32–47）、`map`（106–126）。

原始 `materials/material-1/test.js` 的上述具名测试：[测试](/sources/material-1/test.js)；原始 `materials/material-1/readme.md` 的 limit.map：[README](/sources/material-1/readme.md)；原始 `materials/material-1/recipes.md` 的 Error handling with partial results：[recipes](/sources/material-1/recipes.md)；类型边界见 [index.d.ts](/sources/material-1/index.d.ts)。失败情景和比较表为生成的推演，未运行上游测试。
