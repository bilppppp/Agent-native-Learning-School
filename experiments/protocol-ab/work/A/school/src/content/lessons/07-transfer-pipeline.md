---
title: "迁移：修复双入口处理流水线"
slug: transfer-pipeline
description: "组合共享容量、完整任务寿命、失败汇总与收尾，给出可解释的并发控制方案。"
order: 7
quiz: false
agentOnly: true
agentInstructions: |
  本课整合正确用法、源码解释和边界判断，不是重新测验每课。按共享教学原则一次提出一个小问题后等待，欢迎问题和路线调整，对错误先给反馈与提示，允许逐块修复或用伪代码，不要求安装或构建。
  必读 {origin}/sources/material-1/index.js 的 generator/enqueue/run/next、map、clearQueue；{origin}/sources/material-1/readme.md 的 limit(fn, ...args)、rejectOnClear 和 clearQueue；{origin}/sources/material-1/recipes.md 的 Error handling with partial results。版本 a8a6fbec4e0e866d6d779b10889bb4f5567e70eb。
  首问只让学生指出题面中读取真正开始的那一行，先不给全部修复答案。随后选择一块修复：共享实例、完整返回链或错误观察；再逐步组合收尾和轨迹。手算使用 {origin}/activities/slot-trace.md，不要求真实执行。
  预期方案在入口外创建 pLimit({concurrency: 2, rejectOnClear: true})；job 返回读取加解码的完整 Promise；批次与单条都调用同一 limit，不外包同池批次。收集所有提交 Promise 并及时安装结果观察（可把每项 allSettled([p]) 转为单项报告），停止先拒绝新提交，再 clearQueue，等待已观察的报告集合。单条后续提交需要自己的观察，不能误用旧 Promise.allSettled 数组快照。
  可用如下紧凑参考，仅在学生尝试后提供：let accepting=true; const reports=[]; async function job(id){const bytes=await readBytes(id); return decode(bytes);} function submit(id){if(!accepting) throw new Error('stopped'); const p=limit(job,id); const report=Promise.allSettled([p]).then(([r])=>({id,...r})); reports.push(report); return report;} function submitBatch(ids){return ids.map(submit);} async function stop(){accepting=false; limit.clearQueue(); return Promise.all(reports);} 这里不需要重复限制 job 内部步骤。
  门控轨迹预期：提交 a/b/c/d 后同步 active=2、pending=2、用户函数尚未执行；让 a/b 开始但不放行，c/d 排队，额外单条 e 也排队；stop 拒绝 c/d/e，a/b 继续；a 成功、b 失败后最后 active=0、pending=0。避免依赖反应微任务的精确数量。
  完成条件：学生参与修复、预测至少一次交接或清队列状态、指出源码理由并获得反馈。可以有错误和更正；不要声称验证了真实教学、生产吞吐或进度。最后邀请一句目标回顾，不强制追加测验。
---

# 迁移：修复双入口处理流水线

你接手一个记录处理模块。它有“批量读取”和“单条重试”两个入口，都使用同一个资源。目标不是写一个新限流库，而是正确使用当前版本的 p-limit，并能向同事解释为什么有效。

## 业务要求

这是模型生成情境，不是真实系统或上游示例：

- 任意时刻最多两个完整处理任务占位；读取之后的异步解码也属于任务寿命。
- 批次与单条重试竞争同一组槽位。
- 某项失败后仍收集每项成功或失败，能够对应原始 id。
- 停止时不接受新任务，拒绝尚未启动的等待项；已占位任务自然结束。
- 调用者可以等到所有已提交任务的报告。前提是运行中的读取和解码最终会结算。

## 有缺陷的现状

下列代码只供阅读和修复，不要执行含悬空 Promise 的版本。`readBytes` 和 `decode` 均是返回 Promise 的情境函数。

```js
import pLimit from 'p-limit';

let latestLimit;

function readBatch(ids) {
  latestLimit = pLimit(2);
  const started = ids.map(id => readBytes(id));
  return Promise.all(started.map(promise =>
    latestLimit(() => {
      promise.then(bytes => decode(bytes));
    })
  ));
}

function retryOne(id) {
  const local = pLimit(2);
  return local(() => readBytes(id).then(bytes => decode(bytes)));
}

function stop() {
  latestLimit.clearQueue();
}
```

先只找“读取真正开始的那一行”。不要急着把所有问题列成清单；修好一个机制，再观察另一个入口是否还满足相同要求。

可以用代码，也可以用伪代码交付；教师会按你选的方式逐步讨论。没有已可用的 p-limit 环境时，以源码追踪和状态表完成，不要求安装。

## 用门控任务检验，而不是猜计时

构想每项读取都等一个由你放行的开关。解码也等另一个开关；其中 b 的解码最终拒绝。门控是教学用的生成例子，不改变 p-limit 本身。

先按 a、b、c、d 提交批次，然后让调度微任务发生，保持 a、b 的开关未放行。再从单条入口提交 e，接着停止。

与教师一步步讨论：

- 在同步提交结束和用户函数开始之后，计数是否代表同样的事情？
- 停止时，哪些项还会实际处理，哪些项应收到报告而不启动？
- 若其中一个正在运行的任务在解码失败，另一个能否正常完成？

这些是可选择的后续讨论，不是必须一次回答完的测验。把你的一次状态预测画在[槽位表](/activities/slot-trace.md)中，再用源码验证它。

## 交付一个可解释的方案

你的修复应清楚表达共享实例的位置、完整任务如何返回 Promise、怎样观察每项结果，以及停止如何阻止新提交并处理等待项。请保留一个失败报告，避免“没有抛出错误就都成功”的假象。

若要把入口封成函数，特别注意批次返回什么、单条返回什么，以及提交后何时安装拒绝处理。不要只创建一次 `Promise.allSettled(oldArray)` 就以为它会自动包含之后提交的 Promise；普通汇总只观察创建时消费的输入。

解释不必长。选择一处关键控制流即可，例如：是谁获得槽位、是谁真正调用用户函数、是谁在失败后释放槽位，或者是谁拒绝等待项。教师会根据解释补充反馈，不要求背所有函数。

## 深入理解后的边界

以下是根据已读实现的推论，不是额外库功能或性能测量：

- **容量不等于每秒配额**：任务很快结束时，每秒可能启动很多项。源码只检查 activeCount，没有按时间窗口计数。遇到每秒请求限制，p-limit 单独不保证满足它。
- **槽位不等于 CPU 并行**：用户函数仍在当前 JavaScript 环境执行，长同步计算会阻塞后续工作；库没有创建工作线程。
- **并发上限不等于等待区上限**：map 消费完整批次，pendingCount 可以很大。巨大或持续输入需要额外分批/供给控制，本课不实现流式调度器。
- **拒绝不等于取消**：AbortError 报告可以来自队列清理；活动任务是否可中止取决于任务自身，而非错误名称。
- **加容量不自动解决等待关系**：嵌套同池且全部占位等待时，仍可能死锁。

因此，正确使用包括能说明“这个方案没有保证什么”。最终向教师或同事用一两句话解释：为何两个入口共享同一上限，以及为何停止之后等待报告不会被丢弃的待执行项卡住。可以先说自己的推理，听反馈后修正。

## 阅读证据与版本

原始本地路径 `materials/material-1/index.js` 的 `enqueue/generator` L50–68、`run/next/resumeNext` L19–48、`map` L106–126、`clearQueue` L77–89；[本地实现](/sources/material-1/index.js)。[readme.md](/sources/material-1/readme.md) 的 `limit(fn, ...args)`、`rejectOnClear`、`limit.clearQueue()` 和 [recipes.md](/sources/material-1/recipes.md) 的 `Error handling with partial results` 是用法依据。Node 环境要求可查 [package.json](/sources/material-1/package.json) 的 `engines`（>=20）和 `type`（module），不需要为本课安装环境。

原仓库 https://github.com/sindresorhus/p-limit ，输入版本 `a8a6fbec4e0e866d6d779b10889bb4f5567e70eb`，包自报 7.3.3。原件 URL 示例：https://github.com/sindresorhus/p-limit/blob/a8a6fbec4e0e866d6d779b10889bb4f5567e70eb/index.js 。缺陷代码、门控情境和修复活动全部由模型生成；没有执行真实 p-limit 流水线，也没有做真实学习效果或进度验证。
