# 部署

同一所学校目录可以用三种方式运行。适配器和进度存储由 `DEPLOY_TARGET` 选择：`dev`、`node` 或 `vercel`。未设置时默认 `dev`。

## 本机开发

在仓库根目录：

```sh
npm run school -- start NAME
```

会传入 `DEPLOY_TARGET=dev`，继续用 Cloudflare 适配器和本地 KV，监听 `127.0.0.1`。

## 自有服务器

在学校目录：

```sh
./script/serve
```

脚本固定 `DEPLOY_TARGET=node`，依次执行 `npm ci`、`npm run build`，再启动 `node dist/server/entry.mjs`。默认 `HOST=0.0.0.0`、`PORT=4321`，可用环境变量覆盖。

`./script/serve --start-only` 只启动已有构建产物，不重新安装或构建，也不删除 `.school-data` 或 `PROGRESS_DIR`。

`node_modules` 必须是真实目录。如果是软链接，脚本会失败退出。`npm ci` 需要一份已经套用 School Kit 后重写过的 `package-lock.json`。

公开地址可设置 `PUBLIC_ORIGIN`（只接受 http 或 https 的源）。只有前面有可信反代时才设置 `TRUST_PROXY=true`。

## Vercel

在学校目录执行：

```sh
./script/deploy-vercel
```

仓库里也可以运行 `npm run school -- deploy NAME`。脚本会关联当前目录的 Vercel 项目，写入 `DEPLOY_TARGET=vercel`，并在还没有 `BLOB_STORE_ID` 时创建一个私有 Blob 存储再部署到生产环境。平台上的 `VERCEL_OIDC_TOKEN` 由 Vercel 自动提供，不需要写进仓库。

已有自定义域名时，可以另外设置 `PUBLIC_ORIGIN`。没有这份变量时，接口使用请求自己的来源。

构建在 `DEPLOY_TARGET=vercel` 时需要 `BLOB_STORE_ID` 或 `BLOB_READ_WRITE_TOKEN` 至少有一项。都没有时构建失败，只报 `BLOB_STORE_ID`。运行时两者都没有，进度接口返回 503。不要把令牌写进仓库或浏览器代码。

已连接的 Blob 存储如果因用量上限被暂停，脚本会停下来并说明，不会把它当成部署成功。需要先在 Vercel 控制台恢复该存储。
