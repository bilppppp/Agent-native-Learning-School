---
title: "共享范围与嵌套死锁"
slug: scope-and-deadlock
description: "画出等待关系，选择共享 limit 或 limitFunction，并避免重入同一容量池。"
order: 6
quiz: false
agentOnly: true
agentInstructions: |
  能力是识别容量实例的边界和等待环，修复时不偷偷突破需要保护的全局上限。遵循共享教学原则每次一个小问题后等待，欢迎问为什么和短 detour，温和提示，不要求执行会挂住的例子。
  必读 {origin}/sources/material-1/readme.md 的 limit(fn, ...args) 嵌套警告与 limitFunction；{origin}/sources/material-1/index.js 的 limitFunction L133–142、run/next/resumeNext；{origin}/sources/material-1/index.d.ts 的 limitFunction 返回签名。版本 a8a6fbec4e0e866d6d779b10889bb4f5567e70eb。
  活动容量 2，两父任务各占一槽，都 await 同一个 limit 提交的子任务；首问只问两个子任务此刻在哪里。预期均排队、父任务等待子任务完成、子任务等待父任务释放，形成等待环。再问只提高容量是否是稳健修复。
  修复优先把完整单任务只包一次，在受限函数内部直接调用子步骤；若用独立 inner limiter，要说明两个池不自动形成共享全局上限，且外层占槽而不使用资源可能浪费容量。
  用 limitFunction 源码检查它闭包里一个 limit 对应一个容量池，且当前返回对象只额外暴露 clearQueue；不要捏造 activeCount/concurrency 接口。完成条件：参与等待图和一个符合资源边界的修复并获反馈，能说清实例共享范围。
---

# 共享范围与嵌套死锁

容量不是整个应用的全局属性。它属于创建 `pLimit(...)` 时闭包里的 `queue` 与 `activeCount`。这个范围决定了谁和谁竞争，也决定了嵌套等待会不会卡住。

## 先看一个最小等待环

```js
// 模型生成反例，供阅读分析；不要运行后一直等待。
const limit = pLimit(1);
await limit(async () => {
  return await limit(() => readRecord('a'));
});
```

外层先占唯一槽位，然后等待内层的结果。内层只能进入同一队列，要等空位才能调用。可外层只有等内层结束，才会结束自己的 `result`，走到 `next` 释放槽位。

```text
模型生成等待图（箭头表示左边必须等待右边）
外层完成 ──等待──> 内层完成
内层开始 ──等待──> 空槽位出现
空槽位出现 ──等待──> 外层完成并释放

内层必须先开始才能完成，因此这些依赖闭合成环。
```

更直接地说：外层持有槽位等内层，内层需要外层的槽位才能开始。这是死锁，不是任务本来耗时很长。JavaScript 线程可以是空闲的，Promise 也不必报错，系统却没有可推进的任务。

容量大于 1 不是自动安全：只要所有槽位都被等待内层的父任务占满，就仍然会卡住。不要用“多加一个容量”当作普遍修复，因为父任务数量变化后可以再次填满。

## 为什么平铺完整任务更清楚

如果读取、校验和解码属于一次完整任务，就只在外面限流一次：

```js
async function processRecord(id) {
  const record = await readRecord(id); // 这里直接调用子步骤
  return decodeRecord(record);
}
const scheduled = ids.map(id => limit(processRecord, id));
```

任务的返回链仍覆盖子步骤，但子步骤不再排进自己正在占用的同一容量池。

README 建议内层需要独立限制时使用另一个 limiter。这能打断同一个池的循环等待，却不保证两个池合起来仍满足一个全局资源上限。必须明确资源边界：如果父子都实际使用同一个稀缺资源，随意另建池可能让总执行数超过目标；如果父只是协调者，长时间占一个外层槽位等待子任务也可能浪费容量。先决定保护哪段工作，再选择池。

## limitFunction 解决的是复用范围

`limitFunction(fn, options)` 适合单个函数被许多入口重复调用：

```js
import {limitFunction} from 'p-limit';

const limitedRead = limitFunction(readRecord, {
  concurrency: 2,
  rejectOnClear: true,
});
const promises = ids.map(id => limitedRead(id));
```

真实实现不是每次调用都创建 limiter：

```js
const limit = pLimit(options);
const limitedFunction = (...arguments_) => limit(() => function_(...arguments_));
```

这个 `limit` 在工厂调用时只创建一次，被返回函数的所有调用共享。创建两个 `limitFunction` 包装器则是两个独立的池。

在当前版本，它给返回函数额外附加 `clearQueue`，没有公开 `activeCount`、`pendingCount` 或可写 `concurrency`。需要这些控制，或多种函数共享同一容量时，直接持有 `pLimit` 返回的 limit 更合适。不要把两种返回值当成完全相同的 API。

包装器同样不能修好自己递归提交并等待自己造成的占位等待；重要的是等待关系，而不是换一个 API 名称。

## 活动：画出更大的环

容量为 2，两个父任务都已获准；每个父任务都 `await` 同一个 limit 提交的子任务。先只问：子任务现在是在执行还是排队？之后用箭头标出各自等待谁，再提出一种不会破坏资源上限的修复。不要运行挂起程序，也不要求设计超时器。

如果你的业务确实有两个独立资源，可以选一个短 detour：给每个池命名，说明每个池到底限制谁，避免把“独立池”当成魔法解法。

## 来源与推论

原始本地路径 `materials/material-1/readme.md` 的 `limit(fn, ...args)` 警告与 `limitFunction`；[本地 README](/sources/material-1/readme.md)。[index.js](/sources/material-1/index.js) `limitFunction` L133–142、`run` L32–48、`next` L27–30 与 [index.d.ts](/sources/material-1/index.d.ts) 的返回签名支持范围与接口分析。[test.js](/sources/material-1/test.js) 的 `limitFunction()` 和 `limitFunction exposes clearQueue` 提供相关行为检查。

原始 URL：https://github.com/sindresorhus/p-limit/blob/a8a6fbec4e0e866d6d779b10889bb4f5567e70eb/readme.md 。输入版本 `a8a6fbec4e0e866d6d779b10889bb4f5567e70eb`（包自报 7.3.3）。等待图、容量 2 的饱和推论和代码反例由模型生成并据源码分析；本次未运行死锁程序。
