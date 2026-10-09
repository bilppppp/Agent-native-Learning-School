---
title: "超时发信号，close 才判结果"
slug: errors-and-timeouts
description: "区分启动错误、信号退出和超时后的 Promise 结果。"
order: 3
quiz: false
agentOnly: true
agentInstructions: |
  能力：区分 error 直接拒绝与 close 按 code 判定，解释超时不等于必然拒绝或硬截止。
  阅读 {origin}/sources/material-1/materials.mjs 的 command，第 11–19 行；活动 {origin}/activities/observe.mjs 的 missing、timeout、timeout-zero。
  遵循共享教学原则，一次提出一个预测并等待，欢迎追问，温和反馈，按需解释，不重复测验。
  先让学习者追踪 timeout 回调里有哪些动作、有没有 reject，再逐个预测 timeout 和 timeout-zero。不要首次就给出答案。
  提示：timeout 回调追加 stderr 并 kill；关闭时 code 仍控制成功。unref 不是取消计时器。
  完成条件：学习者参与一个正常超时案例和一个退出 0 的反例，或解释二者差异，并收到反馈；无需正确背出所有错误文字。允许调整活动节奏。
---

## 启动失败不走同一种错误包装

`child.on('error', reject)` 把子进程对象的 error 直接交给 Promise。模型生成的 `missing` 使用不存在的绝对可执行路径；本次 Node 观察得到 `ENOENT`，错误文字来自 spawn，而不是第 17 行构造的 `failed (...)`。

```sh
node public/activities/observe.mjs missing
```

多个回调有机会尝试结算同一个 Promise，但 Promise 的状态只接受首次结算，后续 accept/reject 不会替换它。这可以解释启动失败后即使又发生 close，调用者也不会得到第二个结果。源码并没有记录每一次结算尝试。

## 超时回调做了什么

第 11 行在 `timeoutMs` 为真值时设置计时器。到点后它只做两件事：追加 `Timed out after ...ms` 到内部 stderr，然后尝试 `child.kill('SIGTERM')`。它没有调用 reject，也没有设置 `timedOut` 标志。

```text
到达 timeoutMs
  → 内部 stderr 增加超时文字
  → 尝试发送 SIGTERM
  → 等待 close
  → 仍按 code 与日志标记判断 Promise
```

`timer?.unref()` 表示计时器本身不会单独维持父进程存活，不表示取消计时器，也不保证在指定毫秒精确执行。第 13 行在 close 时清理计时器。计时从创建 timer 开始，并非从子进程输出 ready 开始。

## 两个小型 Node 观察

`timeout` 案例输出 ready 后保持活动。`timeout-zero` 增加 SIGTERM 处理器，在收到信号时主动退出 0。先分别预测结果，再运行：

```sh
node public/activities/observe.mjs timeout
node public/activities/observe.mjs timeout-zero
```

在本次 macOS / Node v24.16.0 观察中，前者 close 的 code 为 null，Promise 拒绝并包含超时文字；后者 fulfilled 为 `'ready'`。这是后者处理器已安装、能够收到信号并退出 0 时的行为，不应推导为任何机器上的无条件结果。若资源负载导致子进程还没安装处理器就收到信号，观察可能不同；先检查是否出现 ready。

为什么超时之后仍能成功？成功条件不检查“是否发生过超时”，也不把普通 stderr 当作失败；超时文字本身不含 `[ERROR]`。因此即使开启日志检查，只要最终退出 0 且日志无标记，也可成功。

## 这不是硬截止时间

若子进程忽略 SIGTERM 并继续存活，源码没有第二次强制终止或超时 reject，Promise 可能继续等待。我们用源码推断这个边界，不运行无限挂起案例。不要把 `timeoutMs` 描述成一定在该时间内返回；也不要把 null 当作 0。第 17 行只用 close 的第一个参数 code，没有把 signal 名加入 Error。

父进程收到 SIGINT 时，第 18 行尝试向 child 转发 SIGINT；close 时移除这个监听器。这是资源与信号管理，不改变最终判定公式。本课程不要求实际中断父进程。

本关定位：`command` 第 11–19 行。现在可以把输出、选项、退出状态和时序结合成完整预测。

## 原始依据

本关依据 `command`，原始位置为 `/Users/gravity/Desktop/AI/Agent-native Learning School /scripts/materials.mjs`。版本：本次准备的 `local file` 快照；SHA-256 为 `0b34736cdd7e6b9f4172ccc4c6b4abecd06a9d8d9001885120aca8e6907c0c8b`。未修改的网页副本：[materials.mjs](/sources/material-1/materials.mjs)。下述观察代码是模型生成活动，不是原始项目的测试。
