# 双托管实施方案

日期：2026-10-13

DEPLOY_TARGET 只取 dev、node、vercel。未设置时默认 dev。非法值报错。不用 VERCEL 环境变量推断目标，也不靠有没有 Blob 令牌选存储。

## 1. 改哪些文件

共享源放在 school-kit/overlay/，由 scripts/apply-school-kit.py 套到学校。generation/protocol.md 不动。

- src/lib/store.ts 及 Node、Vercel、本地三个后端：统一 getProgressStore()，按 DEPLOY_TARGET 选后端。
- astro.config.mjs：按目标选 Cloudflare、Node standalone 或 Vercel 适配器。
- src/lib/public-origin.ts：新增 publicOrigin(request)。
- enroll、progress、profile、lessons、exercises、llms.txt、harness/pi.txt、openapi.json：全部改走统一存储和公开地址。
- script/serve、DEPLOYMENT.md、.env.example：自有服务器的安装、构建、启动说明。
- scripts/scaffold.py：去掉 node_modules 软链接。复制模板后套用下面的依赖补丁，再在学校目录执行 npm install，得到真实 node_modules。
- scripts/school.mjs：start 固定传 DEPLOY_TARGET=dev；teach 增加 --origin。
- 依赖不进 overlay 的整份清单。upstream 模板不入 Git，也不能假设它已经带这些包。套用 kit 时合并进该学校已有的 package.json，并保留 @astrojs/cloudflare。增加 @astrojs/node@10.0.2、@astrojs/vercel@^10.0.8、@vercel/blob@^2.8.1。Node 适配器精确钉在 10.0.2。10.0.3 及以上会引用当前 Astro 6.0.4 没有的 getAbortControllerCleanup，^10.0.6 还会装到要求 Astro ^6.3 的 10.1。学校根目录写入 .npmrc，内容只有 legacy-peer-deps=true。然后立刻 npm install，重写这所学校自己的 package-lock.json。school-kit 不另存一份完整锁文件。锁文件还没重写时禁止 npm ci。script/serve 和 Vercel 的 npm ci 只用重写之后的锁文件。react 回写同样处理，不删模板自己的 node_modules。math-grade7 已有 Vercel 适配器、Blob 和这份 .npmrc，补上 @astrojs/node 并重写锁文件。
- school-kit/README.md、根 README.md：写明 kit 现在也管运行底座。

AgentPrompt.astro 继续用 window.location.origin。页面上的相对路径请求和打勾刷新不改。

现有两所学校要回写，不能只改共享源。react 只拆掉自己的 node_modules 软链接再独立安装，不删模板依赖。math-grade7 保留真实安装，去掉被统一实现取代的 blob-kv.ts、cf-workers-stub.ts 和旧的按令牌选存储的分支。课文、学号词表、来源和 .wrangler 都留着，旧进度不迁移。

## 2. 三条运行路径

| 路径 | 怎么跑 |
|---|---|
| 本机开发 | npm run school -- start react，传入 DEPLOY_TARGET=dev，继续用 Cloudflare 适配器和原来的本地 KV，仍听 127.0.0.1 |
| 自有服务器 | 在学校目录执行 ./script/serve。脚本固定 DEPLOY_TARGET=node，依次 npm ci、npm run build，再 exec node dist/server/entry.mjs |
| Vercel | 项目根目录指向这所学校。安装命令 npm ci，构建命令 npm run build。平台上配置 DEPLOY_TARGET=vercel 和 Blob 令牌 |

script/serve 默认 HOST=0.0.0.0、PORT=4321，可以覆盖。遇到 node_modules 软链接就失败。任一步失败就退出。--start-only 只启动已有产物，不删数据目录，也不再拉起第二个实例。

## 3. 存储

```typescript
interface ProgressStore { get(key: string): Promise<string | null>; get<T>(key: string, format: "json"): Promise<T | null>; put(key: string, value: string): Promise<void>; withLock<T>(key: string, operation: () => Promise<T>): Promise<T>; }
```

Node 用 PROGRESS_DIR，默认学校根目录下的 .school-data/progress。逻辑键 student:<id> 写成 student/<id>.json。完成课程、改 profile、重置和注册都走同一把进程内锁，覆盖读、改、写回。写入先落临时文件再改名替换。文件不存在才返回空；损坏或权限错误不能当成没有这个学生。只保证单进程安全。

Vercel 沿用现有 private Blob 路径：student:curious-explorer-2019 对应 kv/student/curious-explorer-2019.json。一所学校一个 Blob store。Blob 的 withLock 不提供跨实例互斥，并发覆盖本轮接受。

缺配置时：DEPLOY_TARGET=vercel 但没有 BLOB_READ_WRITE_TOKEN，构建直接失败，只报变量名。运行期缺令牌或存储不可用，相关接口返回 503，带 CORS，并设置 Cache-Control: no-store。不带学生参数的课程列表仍可返回。带学生参数时不能用默认教学模式掩盖 503。令牌不进浏览器代码。

## 4. 公开地址

publicOrigin(request) 的顺序是：PUBLIC_ORIGIN，然后在 TRUST_PROXY=true 时读转发头，最后才用 request.url。PUBLIC_ORIGIN 只接受 http 或 https 的源，拒绝路径、查询和片段。TRUST_PROXY 默认关闭。要换掉的是 llms.txt、harness/pi.txt、OpenAPI、课程和练习接口里的 origin。查询参数仍从 request.url 取。浏览器提示词继续用学生看到的地址。

## 5. teach --origin

```sh
npm run school -- teach NAME --student STUDENT_ID --origin https://school.example.com
```

传了 --origin 之后，进度预检、模式写入和提示词都用这个地址。它和 --port 不能同时出现。没传时仍走现在的 localhost。连接失败要报出实际地址和状态码，部署端的 503 不能说成“请启动本机 School”。不自动开本地服务，不创建学生，不改学号。

## 6. 实施顺序

1. 先做统一存储和 dev 后端，回写 react，跑现有测试，确认原来的身份和进度还能读。
2. 接入 Node 文件存储和写锁，补并发测试：同一学生同时完成不同课、更新 profile，结果都要留下。
3. 接入 Vercel 后端。确认 node 和 vercel 产物里没有 Cloudflare 导入。缺令牌时构建失败。带 Blob 令牌启动 dev 时，仍走本地 KV。
4. 换公开地址。测显式配置、可信代理、伪造转发头和回退。本机提示词仍指向 localhost。
5. 完成 kit 应用和 script/serve。先在临时学校上连续套两次，确认第二次不再改锁文件，再回写两所现有学校。
6. 加 teach --origin，再做部署验收。

每次构建前先停掉同一所学校的开发服务。

## 7. 验收

请求就能证明的：新学校的 node_modules 是真实目录；复制到仓库外、去掉依赖和构建缓存后能重新安装并构建；Node 重启后进度还在；Vercel 上接口可用，缺令牌时构建失败、运行返回 503；react 的本机 start 仍听 127.0.0.1，旧 .wrangler 记录还能用。

必须由真实 Agent 对话完成的，自有服务器和 Vercel 各一次：浏览器领身份；用 teach --origin 启动真实 Pi，或写明另一个实际 Harness；Agent 读协议、进度、带学生参数的课程和来源；学生完成规定活动并收到反馈；Agent 用 source: "agent" 和真实模型 ID 写回；浏览器出现勾，刷新后还在。用请求伪造 source: "agent" 只证明接口，不算教学闭环。

重套 kit 之后再用请求确认：旧学号的进度还在，带学生参数的课程接口返回正确模式和地址，改教学模式后立即生效，没有退回 cloudflare:workers 直连。

## 8. 不做

不改生成协议、课文、关卡 slug、完成条件和学号格式。不加账号、子路径、第三种云和数据库。不解决 Blob 跨实例并发覆盖，也不做 Node 多进程文件锁。不迁移旧进度，不预先处理教材体积，不把本机 start 改成公网入口。
