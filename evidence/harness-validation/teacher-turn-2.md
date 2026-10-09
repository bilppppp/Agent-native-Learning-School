你的预测正确，实际运行结果是：

```text
CASE streams
PROMISE fulfilled "hello"
```

网页已切换为沉浸模式。`warning` 没有进入返回值，也没有让这次调用失败。

根据已读取的[原始源码](http://localhost:4414/sources/material-1/materials.mjs)，两个通道分别累积：

| 通道 | 累积的字符串 | 本次的作用 |
|---|---|---|
| stdout | `"  hello\n"` | 成功时通过 `accept(stdout.trim())` 成为 Promise 的值 |
| stderr | `"warning\n"` | 被收集，但本次没有作为结果返回 |

可以把过程理解为：`data` 回调负责收集，`close` 回调负责决定结果。这里使用默认选项，退出码为 `0`，所以进入成功分支；**stderr 有内容本身不代表失败**。终端中的 `PROMISE fulfilled` 是观察脚本打印的标签，真正的成功值只有 `"hello"`。

接着看活动中的失败案例，先不运行：

```js
process.stdout.write('partial\n');
process.stderr.write('bad\n');
process.exitCode = 7;
```

这次你预测 `await command(...)` 会返回 `"partial"`，还是抛出错误？