---
title: "组合条件，预测真实调用"
slug: predict-a-call
description: "用统一决策顺序预测新的调用并解释观察差异。"
order: 4
quiz: false
agentOnly: true
agentInstructions: |
  能力：迁移到未见调用，给出成功/失败、值/错误依据及必要时序条件。
  阅读 {origin}/sources/material-1/materials.mjs 的 command 第 7–21 行、prepareMaterials 第 38–42、54–55 行；活动 {origin}/activities/observe.mjs。
  遵循共享教学原则，一次给一个案例并等待，欢迎自然追问，错误时温和反馈，允许短暂绕路和按需解释，避免重复测验。
  从正文迁移活动选择一个案例；不要一次抛出全部题目或先公布答案。可观察 marker-cross-stream 或重跑已有活动验证推理。
  教师参考：A 返回空串；B 退出 0 但标记触发拒绝，stderr 为 warning；C 在处理器及时安装且无标记时可成功，返回 ready；跨流拼接的标记能匹配但不证明时间顺序。
  完成条件：学习者参与一个新的组合调用预测，指出输出路径和最终判定依据，并接受反馈或修正。完成表示活动参与，不是知识认证。
---

## 从源代码建立决策顺序

预测一个调用时，先确定可执行程序是否能启动；若发生 child error，它直接拒绝。正常启动后，先用选项确定输出走直接继承还是 pipe，再累计能捕获到的字符串。最后依据 close 的 code 做判断，而不是依据终端印象：

```js
code === 0 && !(rejectOnErrorLog && /\[ERROR\]/.test(stdout + stderr))
```

条件为真，成功值是 `stdout.trim()`。否则拒绝，详情优先采用 `stderr.trim()`，为空才用 code 对应的兜底文字。若涉及超时，增加一条时序：timer 会追加 stderr 并发送 SIGTERM，但结果仍要等 child 的事件。

可以用三列笔记组织推理：可捕获的 stdout/stderr；触发的事件及 code；Promise 的状态与值或错误。这个方法比记住案例答案更容易迁移。

## 迁移活动：选一个开始

以下均为模型生成的调用情境。无需一次完成所有题目；教师可以根据你的疑问选择。

A：子进程 stdout 写 `'  ok\n'`，stderr 写 warning，退出 0；选项为 `{ inherit: true }`。预测返回值，并说明终端显示为什么不能证明返回值非空。

B：同样的退出码与 warning，但 stdout 改为 `[ERROR] demo`，选项为 `{ inherit: true, rejectOnErrorLog: true }`。预测是否出现 `failed (0)`，以及错误详情来自哪条流。

C：子进程安装 SIGTERM 处理器，收到信号退出 0；stdout 输出 ready，无日志标记，选项为 `{ timeoutMs: 600, rejectOnErrorLog: true }`。说明成功的必要时序条件，并解释为什么超时文字不必导致拒绝。

可以让教师帮助你把 B 或 C 放进一个临时 `node --input-type=module` 命令；使用本 School 保存的源码即可。不要改原始副本。

## 一个值得观察的拼接边界

活动 `marker-cross-stream` 把 `[ERR` 写到 stdout，把 `OR]` 写到 stderr，退出 0 并开启日志检查。先预测，再运行：

```sh
node public/activities/observe.mjs marker-cross-stream
```

源码检测的是 `stdout + stderr`。两条流拼接后可以形成单条流从未输出过的标记。反过来，仅看屏幕上不同流的交错顺序，也不能复原这个检测字符串。它是当前实现的边界，不必扩展成日志框架设计课。

## 回到原始项目的调用者

`prepareMaterials` 第 54 行用 `command('curl', ...)` 获取类型和最终 URL，第 55 行对成功字符串执行 `split('\n')`。这里默认 pipe，并返回裁剪后的 stdout；curl 的 stderr 不会混进解析字符串，非零退出则 await 抛错而不会进入正常解析。我们不实际访问网络，只追踪这个调用的契约。

第 38 行的 git clone 指定 `timeoutMs`，并不是传入一个硬截止 Promise。第 39–42 行则用返回字符串比较 commit。由此可见，同一个包装函数既用于拿 stdout 数据，也用于检查外部命令是否完成。你的最终解释应能分清这两种用途，并指出成功、拒绝、超时的真实条件。

本关定位：`command` 第 7–21 行及上述调用位置。达到目标不需要学习材料下载的完整流程，更不需要重建整个仓库。

## 原始依据

本关依据 `command`，原始位置为 `/Users/gravity/Desktop/AI/Agent-native Learning School /scripts/materials.mjs`。版本：本次准备的 `local file` 快照；SHA-256 为 `0b34736cdd7e6b9f4172ccc4c6b4abecd06a9d8d9001885120aca8e6907c0c8b`。未修改的网页副本：[materials.mjs](/sources/material-1/materials.mjs)。下述观察代码是模型生成活动，不是原始项目的测试。
