---
title: 嵌套等待与共享预算：识别死锁
slug: deadlocks-and-budget
description: 用等待图分析同一 limiter 的嵌套调用，并比较不破坏资源预算的修复方法。
order: 6
quiz: false
agentOnly: true
agentInstructions: |
  本课能力：画出同一 limiter 的等待环；说明提高上限为什么不是一般修复；比较直接执行内层、扁平化和独立 limiter 的预算意义。
  阅读 {origin}/sources/material-1/readme.md 的 limit(fn, ...args) 嵌套警告；{origin}/sources/material-1/index.js 的 resumeNext、run、next（19–47）、limitFunction（133–142）；{origin}/sources/material-1/index.d.ts 的相同警告。版本 a8a6fbec4e0e866d6d779b10889bb4f5567e70eb。
  依赖第 2 课资源边界、第 3 课的结算后释放。死锁例子可手工追踪，不执行一个会永久等待的脚本。
  活动把上限为 1 的等待图推广到上限 2、两个父任务都 await 同池子任务；选择一个修复方案并解释它是否保留总预算。
  预期两个父任务占满槽位，两个子任务排队，父等子、子等父释放；独立 limiter 只消除本例同池等待，不自动保证全局资源上限。直接执行内层时必须纳入父回调的返回/等待链，不创建不受控的并行子工作。
  完成条件：学习者给出等待关系和一个带预算解释的修复，并获得反馈。不要以成功运行挂起示例作为完成条件。
---

# 正确地 await，也可能永远等不到

下面是生成的反例，不要运行它来等待结果：

```js
const limit = pLimit(1);
const result = await limit(async () => {
  return await limit(() => readRecord('A'));
});
```

每处都延迟启动、都正确返回 Promise，但它仍会死锁。我们只需要源码中的两个事实：内层提交需要槽位；外层回调只有在返回值结算后才释放槽位。

## 画出等待关系

```text
父任务：已占唯一槽位
  └─ await 子任务的 P外
        └─ 子任务排队，等待可用槽位
              └─ 必须由父任务结束后释放
                    └─ 父任务仍在等待子任务
```

没有哪个节点能先前进。这里不是 JavaScript 线程被同步阻塞，而是两个异步等待条件互相依赖。微任务可以继续执行别的工作，但无法凭空制造一个空槽位。

此时常见快照是 active=1、pending=1。计数只表明状态，不足以证明死锁；一个长任务也可能显示相同数字。需要结合等待关系才能判断。

## 上限改成 2 就好了吗？

对“一个父任务、一个子任务”的例子，两个槽位可能让它运行。但这不是一般修复。假如两个父任务同时获得槽位：

```js
const limit = pLimit(2);
const parents = ['A', 'B'].map(id => limit(async () => {
  return await limit(() => readRecord(id));
}));
await Promise.all(parents);
```

父 A、父 B 都占位，又都提交并等待子任务。结果 active=2、pending=2，两个槽位再次全被等待者占满。增加上限只能推迟在某个负载下出现问题，不能消除结构性的等待环。

## 根据资源边界修复，而不是随手加一个池

### 方式一：在一个受限任务内直接完成内层工作

```js
const results = await Promise.all(ids.map(id => limit(async () => {
  const record = await readRecord(id);
  return transform(record);
})));
```

这是把一条完整处理链当作一个任务。`readRecord` 不重新申请同一 limiter；整个返回链结束时再释放槽位。若 transform 返回 Promise，也被纳入生命周期。

注意，如果把内层改成不受限的 `Promise.all` 同时启动很多资源操作，一个父槽位就可能代表多个真实资源。只有任务边界与预算对象一致时，这种修复才保持资源上限。

### 方式二：把编排移到槽位之外

```js
const records = await Promise.all(ids.map(id => limit(() => readRecord(id))));
const results = records.map(record => transform(record));
```

编排层本身不占一个槽位等另一个槽位。这里限制范围只覆盖读取，不覆盖后续 transform；是否合适取决于你要限制什么。若 transform 也消耗同一受限资源，仍应按那个操作的生命周期提交，而不是让整个编排层占位。

### 方式三：为真正不同的资源使用独立池

README 建议内层使用独立 limiter。它能消除本例对同一个池的等待，但不能自动保护总资源预算。例如父任务限制为 2、子任务限制为 2，若双方同时消耗同一资源，总数可能达到 4。

若父工作是读取、子工作使用另一类独立资源，两个池可能合理；仍要说明各自限制的对象。不要把“两个池”当成所有跨资源死锁的保证，复杂依赖仍可能形成等待环。

## clearQueue 不是预算设计的替代

若内层还在队列且开启 rejectOnClear，清队列会使子 Promise 拒绝，可能让等待它的父任务退出。默认选项却只移除子任务，父任务继续等一个永不结算的 Promise。前一种是外部中止策略，不是正确任务结构；它丢弃了原本要做的工作。

`limitFunction` 也能出现类似问题：一个包装器的回调递归调用并等待这个同一包装器，就可能复用同一内部池。包装名字换了，不改变等待关系。

## 活动：解释，而不是试着等

对上限 2 的两个父任务例子，画出父 A、父 B、子 A、子 B 与槽位之间的关系。然后选择上面的一个修复，说明：

1. 哪个等待环消失了？
2. 一个槽位究竟对应哪种资源操作？
3. 原本的总预算有没有被拆成两个独立预算？

把图或口述解释交给教师，收到反馈即可。最关键的证据是等待关系，不是“我把并发调大后某次跑通了”。

## 来源定位

版本 `a8a6fbec4e0e866d6d779b10889bb4f5567e70eb`。原址：[固定版本 README](https://github.com/sindresorhus/p-limit/blob/a8a6fbec4e0e866d6d779b10889bb4f5567e70eb/readme.md)，原始 `materials/material-1/readme.md`，副本 [README](/sources/material-1/readme.md) 的 limit(fn, ...args) 警告；同样警告见原始 `materials/material-1/index.d.ts`：[类型原文](/sources/material-1/index.d.ts)。

等待环从原始 `materials/material-1/index.js` 的 `resumeNext`、`next`、`run`（19–47）和 `limitFunction`（133–142）推导：[本地源码](/sources/material-1/index.js)。本课代码、图及修复比较均为生成的机制推演，不是上游现成死锁测试，也未执行挂起例子。
