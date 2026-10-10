---
title: 迁移：设计一个可解释的批处理器
slug: transfer-batch-runner
description: 综合资源边界、错误报告与停止策略，用代码和状态轨迹说明并发限制真的覆盖了目标任务。
order: 7
quiz: false
agentOnly: true
agentInstructions: |
  本课能力：为一批有限任务设计共享并发执行器，给出延迟启动、生命周期、失败结算、控制边界的证据；迁移到新的 processItem 函数。
  按学习者方案需要读取 {origin}/sources/material-1/index.js 的 run、generator、clearQueue、concurrency setter；{origin}/sources/material-1/recipes.md 的 Error handling with partial results、Fetch multiple URLs；{origin}/sources/material-1/readme.md 的 limit(fn, ...args) 警告。版本 a8a6fbec4e0e866d6d779b10889bb4f5567e70eb。
  前提为前六课。活动提供 A/B/C/D 的有限批次与 B 的预定失败，请先让学习者提出实现和原始时间线；参考实现用于随后反馈，不要求逐行复制。再从降并发、停止、同步立即清队列中选一个变体讨论，保持适量实践。
  预期原始轨迹为 A/B 在 0 启动，B 在 20 拒绝后 C 启动，C 在 50 完成后 D 启动，D 在 55 完成，A 在 60 完成；allSettled 按 A/B/C/D 报告。反馈关注 limiter 共享、回调完整返回、成功/失败都释放与 clearQueue 不取消已占槽位项。
  可用代码阅读与手工轨迹完成；若已有适配本版本的运行环境，可用真实 p-limit 做可选验证，不要求安装，不用手写假 limiter 替代。正文参考实现未在本次生成环境执行。
  完成条件：学习者提交或口述批处理设计、一个原始轨迹与一个控制变体解释，收到针对证据与遗漏的反馈。完成不以零错误为条件，不宣称真实部署或教学进度验证。
---

# 把机制用于自己的函数

现在你不只是认识 p-limit 的名字，而应该能回答：限制了什么、何时开工、何时让出槽位、失败是否被观察、停止后谁还在工作。

本课的任务是一个生成的有限批处理案例。无须网络、文件读写或依赖安装；先写代码和画轨迹即可。

## 场景

`processItem(item)` 表示一个从开始到结束都需要占用某种资源的操作，返回 Promise。它可能成功，也可能拒绝。输入是一个有限数组，id 各不相同：

| 输入项 | 理想耗时 | 结果 |
| --- | --- | --- |
| A | 60 | 成功，返回 a |
| B | 20 | 拒绝 Error('B failed') |
| C | 30 | 成功，返回 c |
| D | 5 | 成功，返回 d |

所有耗时只用于手工模型，不是定时器精度要求。执行器共享上限为 2，输出每项的结算报告并保留输入顺序。可以在运行中调整上限；停止时丢弃未获准的工作、停止接受新批次，但不冒充取消已获准工作。

先提出你自己的短实现，并给出原始情景的启动/完成轨迹。需要解释的不是代码长度，而是为什么实际资源操作受到了保护。

## 一种参考实现

以下是模型生成的实现，用真实 `pLimit` 函数作为参数，便于阅读和替换业务函数；它没有实现一个假的 limiter。输入材料未附 `yocto-queue` 运行依赖，本示例未执行。若已有适配材料版本的环境，可传入实际模块的 default export；否则手工追踪即可。

```js
function createBatchRunner(pLimit, processItem) {
  const limit = pLimit({concurrency: 2, rejectOnClear: true});
  let accepting = true;
  let running = 0;
  let peak = 0;
  const trace = [];

  return {
    run(items) {
      if (!accepting) {
        throw new Error('Runner stopped');
      }

      const promises = items.map(item => limit(async () => {
        running++;
        peak = Math.max(peak, running);
        trace.push({event: 'start', id: item.id, running});

        try {
          const value = await processItem(item);
          trace.push({event: 'fulfilled', id: item.id});
          return value;
        } catch (error) {
          trace.push({event: 'rejected', id: item.id});
          throw error;
        } finally {
          running--;
          trace.push({event: 'end', id: item.id, running});
        }
      }));

      return Promise.allSettled(promises);
    },

    setConcurrency(value) {
      limit.concurrency = value;
    },

    stop() {
      accepting = false;
      limit.clearQueue();
    },

    get snapshot() {
      return {
        active: limit.activeCount,
        pending: limit.pendingCount,
        running,
        peak,
        trace: trace.slice()
      };
    }
  };
}
```

示意调用中的 `processItem` 是业务函数，不应在提交前调用：

```js
const runner = createBatchRunner(pLimit, processItem);
const reportsPromise = runner.run(items);
// 有需要时调用 runner.setConcurrency(...) 或 runner.stop()
const reports = await reportsPromise;
```

`run` 对停止后的批次同步抛错；调用者需要处理它。实现只约定正常有限数组，不处理输入读取中途抛错或无限流。它也没有重试、超时或真实 I/O 取消。这些是明确范围，不是隐藏功能。

## 用证据检查设计

同一个 `limit` 建立在执行器闭包内，所有 `run` 调用都共享预算，而不是每项或每次 run 创建一个新池。提交回调时没有调用 `processItem`；真正启动发生在受限回调里。回调一直 await 到操作结束，finally 维护业务计数，随后调度器自己的 next 释放槽位。

`running` 数的是已经进入回调的业务任务；`active` 数的是已占槽位项。刚提交后可能 active=2、running=0，这不是计数错误。trace 只记录已经进入回调的项，被清掉的排队项没有 start/end 记录，但 allSettled 中有拒绝报告。

固定上限 2 的原始情景中，应该看到：

```text
0:   A、B 启动；C、D 等待
20:  B 拒绝并结束；C 补位
50:  C 成功并结束；D 补位
55:  D 成功并结束
60:  A 成功并结束；整批报告齐全
```

输入顺序报告对应：A fulfilled(a)、B rejected(Error)、C fulfilled(c)、D fulfilled(d)。失败 B 不阻止 C/D。实际执行时只核对顺序关系、峰值和结算，不要求日志时间等于理想数字。

## 选择一个控制变体

不要一次堆很多练习。选一个变体，预测后和教师比较：

- **时刻 10 降到 1**：A、B 不会被中断。B 在 20 结束后 active 仍为 1，没有补位；A 在 60 结束后 C 才启动，90 后 D 启动，95 结束。过渡期 running 可以高于新上限。
- **时刻 10 停止**：C、D 被拒绝为 AbortError；A、B 继续到结算。报告在 A 的 60 时刻齐全，而不是 stop 当场齐全。之后 run 抛错。
- **提交后同一同步片段立刻停止**：A、B 已占槽位，尽管 running 仍可能是 0，它们随后依然启动。只有 C、D 被丢弃。由此解释为什么只记录“回调已经开始的 Promise 集合”可能漏掉已获准工作。

如果选择不同的实现，也可以完成任务，但必须说明它的结算与停止政策。默认清队列且继续等整批 allSettled 会悬挂；只把同步不抛错当作成功也不够。

## 迁移到真实业务时问一句关键问题

如果 `processItem` 改成“请求响应，然后解析并保存”，你希望一个槽位覆盖到哪个步骤？让它返回/等待完整操作。如果改成一个任务内并行启动五个请求，一个槽位不再代表一个请求，原预算需要重设计。如果改成在回调里 await 同一个 runner 提交的批次，重新检查第 6 课的等待环。

把你的实现、原始轨迹以及一个变体解释交给教师并收到反馈，即完成这一迁移活动。代码可以有待修正之处；反馈后能够解释修正的理由，比照抄参考实现更重要。

## 来源定位

版本 `a8a6fbec4e0e866d6d779b10889bb4f5567e70eb`。原址：[固定版本 index.js](https://github.com/sindresorhus/p-limit/blob/a8a6fbec4e0e866d6d779b10889bb4f5567e70eb/index.js)；原始 `materials/material-1/index.js`，副本 [源码](/sources/material-1/index.js)：`run`（32–47）、`generator`（66–68）、`clearQueue`（77–89）、concurrency setter（91–104）。

原始 `materials/material-1/recipes.md` 的 Error handling with partial results、Fetch multiple URLs：[recipes](/sources/material-1/recipes.md)；原始 `materials/material-1/readme.md` 的嵌套警告：[README](/sources/material-1/readme.md)。案例、执行器、轨迹和控制变体都是生成的教学内容，不是上游示例或已执行的 p-limit 测试。
