---
title: "输出怎样变成 Promise 的值"
slug: output-to-result
description: "区分子进程输出、缓冲字符串与 Promise 成功值。"
order: 1
quiz: false
agentOnly: true
agentInstructions: |
  能力：从 data 到 close 追踪 stdout/stderr，预测成功值与失败信息。
  阅读 {origin}/sources/material-1/materials.mjs 的 command，第 7–17 行；活动 {origin}/activities/observe.mjs 的 streams、failure、empty-failure。
  遵循共享教学原则，每次只提出一个小预测并等待；欢迎追问，错误时温和反馈，按需解释，不反复测验。
  首次只问 streams 的 Promise 会得到什么，不先提供答案；再按学习者节奏观察 failure 或 empty-failure。
  提示：看到 stderr 不等于失败；stdout.trim() 只在成功分支返回，拒绝消息优先使用 stderr。
  完成条件：学习者参与至少一个成功和一个失败案例的预测或追踪，并收到有关返回值与输出差异的反馈；不要求全对。允许短暂回顾事件回调。
---

## 两个输出通道，一个最终值

你已经了解 Promise。这里的新内容是：子进程并不会直接返回一个字符串；`command` 用事件回调把一段时间内的输出收集起来，再决定 Promise 的结果。

`spawn(executable, args, ...)` 启动程序。默认使用 pipe：父进程可以从 `child.stdout` 和 `child.stderr` 接收 `data`。每次回调把数据追加到对应字符串中，直到 `close` 回调做最终判断。一个 `data` 块不是一行，也不保证一次 `write` 对应一次回调；因此读代码时关注累计字符串，不依赖块数。

```text
stdout data → stdout 累积 ─┐
                          ├→ close(code) → 判定 → fulfilled / rejected
stderr data → stderr 累积 ─┘
```

这个图表达源码的数据依赖，不表示两条流共享全局顺序。`stdout + stderr` 是两个最终字符串的拼接，不是按时间合并的日志。

成功分支调用 `accept(stdout.trim())`：结果是去掉首尾空白的 stdout，不是 `{ stdout, stderr, code }`。stderr 可以包含警告，默认并不因此拒绝。内部换行不会被 `trim()` 删除。若 stdout 没有内容，成功值就是空字符串。

## 先预测，再观察

模型生成案例：子进程输出 stdout 为 `'  hello\n'`，stderr 为 `'warning\n'`，正常退出。先写下你认为 `await command(...)` 得到的值，以及 stderr 是否会改变成功判断，然后运行：

```sh
node public/activities/observe.mjs streams
```

所有本课程命令都从 School 目录执行；脚本直接导入保存的原始 `command`，仅启动小型 Node 子进程。不需要安装来源项目。若教师负责执行，可先让教师展示案例代码、等待你的预测，再展示输出。

## 非零退出怎样拒绝

`close` 收到的退出码不是 0 时，源码调用 `reject(new Error(...))`。错误文字包含 executable、code 和 `stderr.trim()`；stderr 空白时使用通用提示。它不把已有 stdout 作为错误详情返回，也没有结构化的退出码字段。

例如 stdout 为 `'partial\n'`，stderr 为 `'bad\n'`，退出码 7。你需要分开回答：子进程写过什么？调用者拿到什么？运行 `failure`，再把 stderr 去掉并运行 `empty-failure`，比较错误尾部。终端看到的 `PROMISE rejected` 是活动脚本的 catch 输出，并不代表观察脚本自身以非零码退出。

源码的 “files were preserved” 是固定兜底文字；`command` 没有在这个分支检查或保留文件。不要从提示词推导不存在的文件操作。

本关定位：`command` 第 9–10、14–17 行。下一关会改变 stdio 配置，检验“终端能看到”是否意味着“父进程捕获到了”。

## 原始依据

本关依据 `command`，原始位置为 `/Users/gravity/Desktop/AI/Agent-native Learning School /scripts/materials.mjs`。版本：本次准备的 `local file` 快照；SHA-256 为 `0b34736cdd7e6b9f4172ccc4c6b4abecd06a9d8d9001885120aca8e6907c0c8b`。未修改的网页副本：[materials.mjs](/sources/material-1/materials.mjs)。下述观察代码是模型生成活动，不是原始项目的测试。
