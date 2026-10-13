#!/usr/bin/env node
// 路由映射推导校验工具（模型生成的活动辅助脚本）
// 用途：帮助学员核对 src/pages 路径到浏览器 URL 的映射关系

const table = new Map([
  ['src/pages/index.astro', '/'],
  ['src/pages/about.astro', '/about/'],
  ['src/pages/about/index.astro', '/about/'],
  ['src/pages/about/me.astro', '/about/me/'],
  ['src/pages/posts/1.md', '/posts/1/'],
  ['src/pages/404.astro', '/404.html'],
  ['src/pages/posts/[id].astro', '/posts/:id/'],
]);

const query = process.argv[2];

if (!query || query === '--list') {
  console.log('--- 官方静态路由对照表 ---');
  for (const [file, url] of table.entries()) {
    console.log(`${file} => ${url}`);
  }
  process.exit(0);
}

if (table.has(query)) {
  console.log(`[匹配成功] ${query} => ${table.get(query)}`);
} else if (query.startsWith('src/components/') || query.startsWith('src/layouts/')) {
  console.log(`[非路由文件] ${query} 位于组件或布局目录，不会生成独立 URL 路由！`);
} else if (query.startsWith('public/')) {
  const rel = query.slice('public/'.length);
  console.log(`[静态资源] ${query} 会被原样复制为静态文件 => /${rel}`);
} else {
  console.log(`[未收录] ${query} 未在预设典型示例中，请检查文件命名格式。`);
}
