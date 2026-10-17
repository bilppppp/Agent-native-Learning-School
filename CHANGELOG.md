# 更新日志

这里只记使用方式上的变化。格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)。

## [2026-10-17]

### 新增

- 新学校可以用 `npm run school -- deploy-cloudflare NAME` 部署到 Cloudflare Workers。每个学生一份 JSON，放在该校的私有 R2 桶里。
- 七年级语文、数学、英语可以分别在 [yuwen.learnislands.com](https://yuwen.learnislands.com)、[shuxue.learnislands.com](https://shuxue.learnislands.com)、[yingyu.learnislands.com](https://yingyu.learnislands.com) 打开。

### 变更

- 已打开的页面不再每秒读取进度。进入已注册页面时读一次，从后台回到前台时再读一次。当前页面写入成功后，这个页面自己更新。
- Vercel 部署仍连接私有 Blob。存储因用量被暂停时，部署脚本会停下来，不会把一次无法注册的发布当成成功。

### 移除

- 公开课程不再使用 `math.gravityai.top`。仓库里的 [schools/math-grade7](schools/math-grade7/) 仍保留较早的页面。

## [2026-10-16]

### 新增

- 岛屿首页可以拖动火箭。页头使用课程的公开名称。

## [2026-10-15]

### 新增

- 新建学校默认使用岛屿页面。注册时先选战士、巫师、牧师或游侠，再领取学习身份。角色只改变身份卡的样子。

## [2026-10-14]

### 变更

- README 改为面向建校的说明。仓库里的 Astro 示例和较早的七年级数学页面保持原样。

### 修复

- 浏览器里留下的学习身份在服务器上已经不存在时，教学模式仍按页面上的选择保存。

## [2026-10-13]

### 新增

- 同一份学校目录可以在本机、自有服务器和 Vercel 上运行。
- 多页文档站在准备材料时跟随同站链接抓取。
- 关卡里的数学公式用 KaTeX 排版。

### 变更

- 能看图的模型在写课前需要查看页面图像，避免只根据抽取文本写课程。

## [2026-10-10]

### 变更

- 收紧关卡说明，以及随教学模式变化的教学指引。

## [2026-10-09]

### 新增

- 仓库成为可复用的建校工具。Agent 阅读 README、AGENT_GUIDE 和 AGENTS 后，用现有命令创建并启动 School。界面语言跟随课程配置。
