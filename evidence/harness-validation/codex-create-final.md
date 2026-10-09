已通过非 Pi 路径创建 `process-results`，中文、初始 `simple`、配置端口 `4414`。`finish` 校验与构建成功，退出码 0。

实际创建命令（首个位置参数为你的完整学习请求）：

```sh
npm run school -- create '以当前仓库 scripts/materials.mjs 作为原始学习来源，目标是理解 command 函数如何把子进程的 stdout/stderr、退出码和超时转换为 Promise 结果，并能预测调用行为。已有 JavaScript、Promise 的基础，希望系统理解机制但只选对目标有用的内容，偏好代码预测和小型 Node 观察，教学先用 simple，中文。' \
  --prepare-only \
  --source '/Users/gravity/Desktop/AI/Agent-native Learning School /scripts/materials.mjs' \
  --goal '理解 command 函数如何把子进程的 stdout/stderr、退出码和超时转换为 Promise 结果，并能预测调用行为' \
  --name process-results --port 4414 \
  --depth '系统理解机制但只选对目标有用的内容' \
  --background '已有 JavaScript、Promise 的基础' \
  --style '代码预测和小型 Node 观察' --mode simple --language zh

node schools/process-results/public/activities/observe.mjs all
npm run school -- finish process-results
```

生成了四关：

- `output-to-result`：输出累积与 Promise 结果。
- `stdio-options`：显示、捕获与日志检查。
- `errors-and-timeouts`：启动错误、信号和超时。
- `predict-a-call`：组合预测与原始调用迁移。

课程路线见 [COURSE.md](</Users/gravity/Desktop/AI/Agent-native Learning School /schools/process-results/COURSE.md>)。来源保存在 `materials/material-1/materials.mjs` 和 `public/sources/material-1/materials.mjs`，两份均与原文件逐字节一致。12 个 Node 案例实际运行完成，活动语法检查通过。

Pi 检查与预期不同：入口存在，`pi --version` 返回 `1.1.0`、退出码 0；不能声称 Pi 不可用。除指定版本检查外，创建和构建未调用 Pi。

未启动长期服务，未验证 HTTP、真实教学或进度同步，不代表教学闭环成功。未修改共享代码、文档或其他 School，未 commit/push。