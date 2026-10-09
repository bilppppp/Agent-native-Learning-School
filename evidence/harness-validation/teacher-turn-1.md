已读取规则、原始源码和你的进度：本关尚未完成，当前是简洁模式（`simple`）。

先看教学活动 `streams` 中的子进程代码，暂不运行：

```js
process.stdout.write('  hello\n');
process.stderr.write('warning\n');
// 正常退出，退出码为 0
```

你预测：调用者执行 `await command(...)` 后，会得到什么结果？