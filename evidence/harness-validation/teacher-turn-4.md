下一关是「显示与捕获是两件事」，当前仍为沉浸模式。我们用相同的子进程输出，只改变选项：

```js
process.stdout.write('visible\n');
process.stderr.write('warning\n');
// 退出码为 0
```

两个教学案例分别使用：

```js
// inherited
{ inherit: true }

// tee
{ inherit: true, rejectOnErrorLog: true }
```

先看已通过 HTTP 读取的[原始源码](http://localhost:4414/sources/material-1/materials.mjs)中选择输出路径的表达式：

```js
inherit && !rejectOnErrorLog
  ? 'inherit'
  : ['ignore', 'pipe', 'pipe']
```

你预测：这两个案例的 Promise 成功值会相同吗，分别是什么？我们等你预测后再实际运行比较。