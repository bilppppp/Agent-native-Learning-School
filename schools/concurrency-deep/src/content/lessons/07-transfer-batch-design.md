---
title: 迁移实践：设计并验证一个可靠的受限批次
slug: transfer-batch-design
description: 将启动边界、调度、部分结果、清队列和资源预算综合到一个小型批处理方案。
order: 7
quiz: false
agentOnly: true
agentInstructions: |
  本课整合能力：为有限批次定义资源单位，使用共享 limiter、完整返回值、逐项报告，验证上限并解释失败与停止策略。依赖前六课；允许学生以口述伪代码替代运行，完成是参与设计、观察/追踪并收到反馈，不是所有断言一次通过。
  复读 {origin}/sources/material-1/recipes.md 的 Error handling with partial results、Fetch multiple URLs；{origin}/sources/material-1/index.js 的 run、clearQueue、map；{origin}/sources/material-1/test.js 的并发 running 检查和 map passes index and preserves order with concurrency。版本固定提交 a8a6fbec4e0e866d6d779b10889bb4f5567e70eb，package 7.3.3。
  阅读模型生成活动 {origin}/activities/README.md、{origin}/activities/limit-lab.mjs 的 transfer。首问只给 A/B/C/D 时长与 B 失败、限额 2、保留逐项报告的需求，问打算把启动动作放在哪里；不要先展示参考代码或全输出。按共享教学原则一次一问等待，欢迎自然问题或短暂支线，友善反馈，按需解释，不反复测验。
  让学生先设计或修复，后运行 transfer 或纸面追踪，用函数体内 running 与 finally 检查真实生命周期，不仅看 activeCount。再选清队列或共享调用方的变式，按前课提示反馈。模型可给参考片段但不是第一提示。
  完成条件：学生参与一次方案和一次验证，得到反馈后能解释峰值、结果对应关系、失败不停止队列，以及所选变式的资源/等待策略。不要把活动断言通过记作真实学习已验证或要求安装整个仓库。
---

## 迁移任务，而不是多背一个 API

你现在需要解决一个小而完整的问题：A/B/C/D 四个输入按此顺序到达，模拟处理时长为 30/5/15/10ms，B 在处理后失败。要求：

- 同时最多两个**完整输入处理**；
- 一个输入失败，不丢掉其他输入的结果；
- 每项报告保留与原输入的对应关系；
- 用观察或状态追踪检查预算，而不是只说“应该限制了”；
- 能说明如果中途丢弃待排任务，会怎样等待返回值。

这些参数是**模型生成的练习**，不代表真实服务的性能。建议先设计，再看下面的参考结构。你可以写代码、口述、画状态表；无需真实 HTTP、下载项目或更改学校配置。

## 先做三个决定

1. 预算单位：本活动是一项从开始到结束的完整处理，不是工作流内随意多个请求。
2. 共享范围：整个列表使用一份 `pLimit(2)`；如果另一调用方也访问同一资源，应该复用这一份。
3. 结果策略：需要部分成功报告，因此用 `Promise.allSettled` 观察每项受限 Promise，而不是只用 `limit.map` 的全成功聚合。

先预测：B 失败释放槽后，C 是否可以开始？A 的成功值应落在报告的第几个位置？然后选择代码结构。

## 工作示例：把资源探针放在真实处理内

下面的结构展示关键边界，不是让你第一次就照抄全部答案：

```js
const limit = pLimit({concurrency: 2, rejectOnClear: true});
let running = 0;
let peak = 0;
async function processItem(item) {
  running++;
  peak = Math.max(peak, running);
  try {
    await simulatedWork(item); // 必须返回完整模拟处理 Promise
    if (item.fail) throw new Error(`失败 ${item.id}`);
    return {id: item.id, value: item.id.toLowerCase()};
  } finally {
    running--; // 成功和失败都归还探针计数
  }
}
const report = await Promise.allSettled(
  inputs.map(item => limit(processItem, item))
);
```

`running` 是活动探针，跟踪函数体已开始且尚未结束的处理；`activeCount` 是 limiter 的已占槽计数，两者在微任务边界可能短暂不同。两者都不能观测任务未返回的隐形工作，所以探针不能修复错误的返回边界。

报告与输入顺序对应。不要把每个结束事件追加进日志的顺序直接当成结果索引。参考活动在打印报告时用 `inputs[i].id` 配对，并在失败项打印 `reason.message`。`finally` 也确保失败时探针递减，不会误把失败当作还在运行。

## 本地活动：预测、观察、解释

[活动说明](/activities/README.md)，[生成脚本](/activities/limit-lab.mjs)。在学校根目录运行：

```sh
node public/activities/limit-lab.mjs transfer
```

脚本实际调用复制的未修改 p-limit，而不是模仿实现。当前学校已存在它所需的队列依赖；若迁移环境缺依赖，使用手工状态表即可，不要求安装。

检查三点：

- 任务体内 `running` 从未超过 2，示例峰值为 2，最终为 0。
- 输入 B 的报告为 rejected，其余为 fulfilled；错误不使后面的任务消失。
- 报告数组按输入顺序对应，不依赖计时器的实际完成顺序。

计时器只模拟等待，不用这个脚本给真实系统做吞吐量结论。即使示例断言通过，也只支持当前样例行为，不证明所有业务调用正确。

## 选择一个短变式，加深而不扩张项目

**变式 A：停止接收并清掉待排项。** 先给全部返回 Promise 附上 `allSettled` 观察，再选停止时刻调用 `clearQueue()`；保留 `rejectOnClear=true`。解释待排项如何被报告，哪些任务仍会运行。最好借用 `clear` 模式的手动门，避免靠“几毫秒后一定谁在队列里”猜测。注意已获准占槽者也不会被清；这不是取消运行操作或关闭入口。

**变式 B：两个调用方共用一个服务。** 每方各提交三项，画出共享一份 `pLimit(2)` 与各自一份的预算差异。选择预算属于服务而非调用方时的设计，并检查没有同一 limiter 内嵌套等待。

**变式 C：把限额从 2 动态降到 1。** 说明为什么旧任务可能仍有两个，在哪次完成后下一项才会准入；不再使用固定额度的 `running<=1` 断言检查切换瞬间。

## 常见误解与自查

“打印出正确结果，限制一定有效。”不成立：全部先启动再交给 limiter，也可能返回同样数组。真正要检查的是启动时刻、返回值覆盖的生命周期、共享作用域和失败后调度。

核心问题：能否沿源码解释一次补位？能否区分结果失败与队列停止？方案有没有把任务永远等在自己的槽后面？对很大或无限输入是否需要单独的生产策略？

完成标准：参与设计/修复一次受限批次，运行或手动追踪一次并收到反馈；解释预算、部分结果、输入对应和所选变式的等待策略即可。不要求零错误，也不将脚本成功等同于真实教学进度验证。

## 可追溯来源

版本：package 7.3.3，固定提交 `a8a6fbec4e0e866d6d779b10889bb4f5567e70eb`；本地原始根 `schools/concurrency-deep/materials/material-1/`。

- [recipes.md 原件](/sources/material-1/recipes.md)：`Fetch multiple URLs`、`Error handling with partial results`；[原始地址](https://github.com/sindresorhus/p-limit/blob/a8a6fbec4e0e866d6d779b10889bb4f5567e70eb/recipes.md)。
- [index.js 原件](/sources/material-1/index.js)：`run` 32–48、`clearQueue` 77–90、`map` 106–127；[原始地址](https://github.com/sindresorhus/p-limit/blob/a8a6fbec4e0e866d6d779b10889bb4f5567e70eb/index.js)。
- [test.js 原件](/sources/material-1/test.js)：`concurrency: 4` 的函数体 `running` 检查（标题为 4、变量实际为 5），`map passes index and preserves order with concurrency`；[原始地址](https://github.com/sindresorhus/p-limit/blob/a8a6fbec4e0e866d6d779b10889bb4f5567e70eb/test.js)。
- 批处理场景、资源探针、参考结构及变式由模型生成；不是仓库原有教学或评测，不包含真实学生进度。
