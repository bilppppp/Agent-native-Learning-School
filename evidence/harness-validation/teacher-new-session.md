服务器记录显示你已完成第 1 关，应从第 2 关「显示与捕获是两件事」（`stdio-options`）继续。当前是 `immersive` 模式；我已读取本关、原始源码和活动脚本，尚未更改进度。

先比较活动里的两个调用：子进程都输出 `visible\n` 到 stdout、`warning\n` 到 stderr，并正常退出；区别只有选项：

```js
// inherited
{ inherit: true }

// tee
{ inherit: true, rejectOnErrorLog: true }
```

源码选择输出路径的表达式是：

```js
inherit && !rejectOnErrorLog ? 'inherit' : ['ignore', 'pipe', 'pipe']
```

你觉得这两次 `await command(...)` 得到的字符串会一样吗？先说说你的预测，我们再运行观察。