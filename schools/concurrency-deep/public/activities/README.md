# 本地活动说明

`limit-lab.mjs` 是模型生成的教学例子，不是原仓库测试，也不是 p-limit 的替代实现。它导入 `../sources/material-1/index.js` 的未修改源码，用可手动释放的 Promise 和少量本地计时器代替网络请求。

在输出学校根目录运行（Node.js >=20）：

```sh
node public/activities/limit-lab.mjs schedule
node public/activities/limit-lab.mjs errors
node public/activities/limit-lab.mjs map-edge
node public/activities/limit-lab.mjs clear
node public/activities/limit-lab.mjs dynamic
node public/activities/limit-lab.mjs transfer
```

当前预配置环境已有 `yocto-queue` 1.2.2，满足原源码 package.json 的 `^1.2.1`。活动依赖学校现有模块解析，不要求安装、构建原仓库或联网。若别处没有该依赖，不必安装：用课程中的状态表和代码手动追踪即可。HTTP 路径 `/activities/limit-lab.mjs` 用于读取/下载，不能直接在浏览器中执行含 Node 内置模块的脚本。

运行前先预测一个事件，运行后对照；不要把整个脚本输出作为首个教学问题。`clear` 的默认模式只做有限时间观察，不等待被清除任务的 promise。源码中没有使这些 promise 结算的路径，是它们会保持 pending 的依据，不能仅用一次短观察来证明永久状态。`transfer` 的计时器只保证示例中的受限重叠，不把实际耗时或特定结束顺序作为性能结论。

这些断言检验生成示例在当前本地环境的行为，不取代上游测试套件，更不代表学生已经学会。
