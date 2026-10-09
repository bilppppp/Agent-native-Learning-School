你的预测完全符合实际结果：

```text
PROMISE rejected {"name":"Error","message":"/opt/homebrew/Cellar/node/26.0.0/bin/node failed (7): bad"}
```

子进程写出了 `"partial\n"` 和 `"bad\n"`，但调用者的 `await` 抛出了 `Error`：消息包含退出码 `7` 和去掉首尾空白的 stderr，没有返回 stdout，也没有单独的 `error.code` 字段。

关键区别是：**输出先被收集，Promise 的结果随后由 `close` 分支决定。** 成功时返回 `stdout.trim()`；本次失败时用 stderr 构造错误。观察脚本捕获并打印了错误，所以脚本自身仍以 `0` 退出。

本关已通过 HTTP API 标记完成。你想继续观察 stderr 为空的 `empty-failure` 案例吗？