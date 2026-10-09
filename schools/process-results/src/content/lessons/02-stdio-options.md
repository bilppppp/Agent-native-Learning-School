---
title: "显示与捕获是两件事"
slug: stdio-options
description: "解释 inherit 与 rejectOnErrorLog 如何共同决定输出路径。"
order: 2
quiz: false
agentOnly: true
agentInstructions: |
  能力：解释四种选项组合如何影响 stdio、终端显示和 Promise 成功值。
  阅读 {origin}/sources/material-1/materials.mjs 的 command，第 9、14–17 行；活动 {origin}/activities/observe.mjs 的 inherited、tee、marker、marker-default、marker-stderr。
  遵循共享教学原则，一次只问一个小问题并等待，欢迎追问，按需解释，温和纠正，避免重复测验。
  首先比较 inherited 与 tee 的返回值预测，不提前公布结果；如已有把握，再讨论日志标记。
  提示：inherit 为真并不总是直接继承；rejectOnErrorLog 为真时仍用 pipe，回调转写到父输出。
  完成条件：参与两种 inherit 路径的比较，并就显示、捕获、日志检查之间的关系收到反馈。允许跳过已理解的基础回顾。
---

## 先看决定 stdio 的表达式

源码第 9 行不是简单判断 `inherit`：

```js
inherit && !rejectOnErrorLog ? 'inherit' : ['ignore', 'pipe', 'pipe']
```

`'inherit'` 让子进程使用父进程的标准流，包括 stdin。pipe 路径则忽略 stdin，并让父进程收集 stdout/stderr。直接继承时，这里的 `child.stdout`、`child.stderr` 没有可监听的 pipe；`?.on` 跳过监听，因此内部字符串保持空串。终端可能显示很多文字，但成功结果仍是 `''`。

| inherit | rejectOnErrorLog | 输出路径 | 父进程转写 | 可检查捕获日志 |
| --- | --- | --- | --- | --- |
| false | false | pipe | 否 | 收集但不检查标记 |
| true | false | 直接继承 | 不经 data 回调转写 | 无捕获日志 |
| false | true | pipe | 否 | 是 |
| true | true | pipe | 是 | 是 |

最后一行值得停一下：`inherit` 为真但没有选择直接继承。第 14–15 行在收集数据的同时调用父进程的 `process.stdout.write` / `process.stderr.write`。这条路径同时显示和捕获，成功时也可以返回 stdout。

## 用同一个输出比较两种调用

模型生成的 `inherited` 和 `tee` 都写出 `'visible\n'` 和一条 warning。只改变选项。预测两个 Promise 的成功值，然后分别运行：

```sh
node public/activities/observe.mjs inherited
node public/activities/observe.mjs tee
```

把“屏幕是否看到 visible”和“返回值是否包含 visible”分开记录。如果失败分支采用直接继承，屏幕出现 stderr 也不意味着 Error 会包含它，因为内部 stderr 没有捕获到。

## 退出 0 也可能被拒绝

`rejectOnErrorLog` 开启后，成功要求退出码 0 且 `stdout + stderr` 不匹配 `/\[ERROR\]/`。这是大小写敏感的字面标记检查，不是对日志语义的理解：普通 warning 不触发；`[error]` 不等于 `[ERROR]`；说明文字中的 `[ERROR]` 也会触发。

模型生成的 `marker-default` 和 `marker` 都在 stdout 写 `[ERROR] demo` 并退出 0。比较选项后再运行，关注 `failed (0)`：它表示子进程正常退出，但包装层拒绝了这次调用。标记只在 stdout 时，错误详情可能采用 rendering error 兜底文字；`marker-stderr` 则显示实际 stderr。

这不是所有构建工具都应采用的通用规则，而是当前源码的选择。预测时按表达式计算，不能把“退出 0”或“有 stderr”当作唯一判断标准。

本关定位：`command` 第 9、14–17 行。下一关加入时间与信号，但仍由同一个最终分支决定结果。

## 原始依据

本关依据 `command`，原始位置为 `/Users/gravity/Desktop/AI/Agent-native Learning School /scripts/materials.mjs`。版本：本次准备的 `local file` 快照；SHA-256 为 `0b34736cdd7e6b9f4172ccc4c6b4abecd06a9d8d9001885120aca8e6907c0c8b`。未修改的网页副本：[materials.mjs](/sources/material-1/materials.mjs)。下述观察代码是模型生成活动，不是原始项目的测试。
