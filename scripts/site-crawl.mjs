import { createHash } from 'node:crypto';
import { chmodSync, copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve, delimiter } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const CRAWLER_VERSION = '2.5.1';
const RELEASE_BASE = `https://github.com/janreges/siteone-crawler/releases/download/v${CRAWLER_VERSION}`;
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export const DOC_SEGMENTS = new Set([
  'docs', 'documentation', 'guide', 'guides', 'manual', 'reference',
]);
const GENERATORS = ['readthedocs', 'sphinx', 'gitbook', 'docusaurus', 'mkdocs', 'vitepress'];
const NAV_LINK_CRAWL = 8;
const NAV_LINK_HINT = 3;
const MIN_PAGES = 2;
const MIN_SUBSTANTIAL_PAGES = 2;
const MIN_PAGE_CHARS = 200;
const MIN_TOTAL_CHARS = 800;
const VOID_TAGS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
const NAV_CLASS = /(?:^|[\s_-])(?:sidebar|side-bar|toc|table-of-contents|menu|navigation|nav-menu|doc-nav|docs-nav|vp-sidebar|md-sidebar)(?:$|[\s_-])/i;

export const ASSETS = {
  'linux-x64': { file: 'siteone-crawler-v2.5.1-linux-x64.tar.gz', sha256: '09278d958d4a087fa46093805cd33b085b96618001dd31d45c448ad724c9024e' },
  'linux-arm64': { file: 'siteone-crawler-v2.5.1-linux-arm64.tar.gz', sha256: 'aa0bc9b2d7c7da5b871d2326d91183ef7c3107e005ef16dba69c78c5e406f83e' },
  'linux-x64-musl': { file: 'siteone-crawler-v2.5.1-linux-musl-x64.tar.gz', sha256: 'bd96b9502563aea2581fc248625871e69b60d7f1bb68a484f226c551c73706fd' },
  'linux-arm64-musl': { file: 'siteone-crawler-v2.5.1-linux-musl-arm64.tar.gz', sha256: 'cad85649c09a4181ae36e47269caff647fe7e2bb556dc388b5f7aede6e420e20' },
  'darwin-x64': { file: 'siteone-crawler-v2.5.1-macos-x64.tar.gz', sha256: '724639bdfca7d26514a7c3f10caa6a9172a4f2192744d9e4691bcf842b2e4609' },
  'darwin-arm64': { file: 'siteone-crawler-v2.5.1-macos-arm64.tar.gz', sha256: '6b893a15ce695a002bbe6c3d2467954fee64059216d471fae55c781936d96e2f' },
};

export function platformKey(platform = process.platform, arch = process.arch, musl = false) {
  const archName = arch === 'x64' || arch === 'arm64' ? arch : null;
  if (!archName || (platform !== 'linux' && platform !== 'darwin')) return null;
  if (platform === 'darwin' && musl) return null;
  return `${platform}-${archName}${musl ? '-musl' : ''}`;
}

export function parseVersion(text) {
  const match = String(text || '').match(/(\d+)\.(\d+)\.(\d+)/);
  return match ? `${match[1]}.${match[2]}.${match[3]}` : null;
}

export function versionAtLeast(version, minimum = CRAWLER_VERSION) {
  const left = parseVersion(version);
  const right = parseVersion(minimum);
  if (!left || !right) return false;
  const a = left.split('.').map(Number);
  const b = right.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] > b[i];
  }
  return true;
}

export function crawlPrefix(href) {
  const url = new URL(href);
  let path = decodeURIComponent(url.pathname);
  if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
  const parts = path.split('/');
  const last = parts[parts.length - 1] || '';
  if (last && /\.(?:html?|md|php|aspx|xhtml)$/i.test(last)) parts.pop();
  path = parts.join('/') || '/';
  if (!path.startsWith('/')) path = `/${path}`;
  return path || '/';
}

export function normalizePrefix(prefix) {
  if (!prefix || prefix === '/') return '/';
  let path = prefix.startsWith('/') ? prefix : `/${prefix}`;
  if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
  return path;
}

export function choosePrefix(requestedHref, finalHref, override) {
  if (override) return normalizePrefix(override);
  const requested = crawlPrefix(requestedHref);
  let finalPrefix = requested;
  try {
    const original = new URL(requestedHref);
    const finalUrl = new URL(finalHref);
    if (original.hostname === finalUrl.hostname) finalPrefix = crawlPrefix(finalHref);
  } catch { /* keep the requested prefix */ }
  if (requested === '/') return finalPrefix;
  if (finalPrefix === requested || finalPrefix.startsWith(`${requested}/`)) return requested;
  return finalPrefix;
}

export function includeRegex(prefix) {
  const path = normalizePrefix(prefix);
  if (path === '/') return '/';
  const escaped = path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\//g, '\\/');
  return `/${escaped}(?:\\/|$|\\?|#)/`;
}

export function proxyEndpoint(env = process.env) {
  const raw = env.HTTPS_PROXY || env.https_proxy || env.HTTP_PROXY || env.http_proxy || '';
  if (!String(raw).trim()) return null;
  try {
    const value = String(raw).trim();
    const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : `http://${value}`;
    const url = new URL(withScheme);
    if (!url.hostname) return { error: '无法解析代理 URL，爬虫将不使用 --proxy。' };
    const port = url.port || (url.protocol === 'https:' ? '443' : '80');
    const host = url.hostname.includes(':') && !url.hostname.startsWith('[') ? `[${url.hostname}]` : url.hostname;
    return { endpoint: `${host}:${port}`, hasAuth: Boolean(url.username || url.password) };
  } catch {
    return { error: '无法解析代理 URL，爬虫将不使用 --proxy。' };
  }
}

function attr(source, name) {
  const match = String(source).match(new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'=<>]+))`, 'i'));
  return match ? (match[1] ?? match[2] ?? match[3] ?? '') : '';
}

function generatorContent(html) {
  const tags = String(html).match(/<meta\b[^>]*>/gi) || [];
  for (const tag of tags) {
    const name = (attr(tag, 'name') || attr(tag, 'property')).toLowerCase();
    if (name === 'generator') return attr(tag, 'content');
  }
  return '';
}

function frameworkMarker(html) {
  const text = String(html);
  if (/id=["']__docusaurus["']|data-docusaurus\b/i.test(text)) return 'Docusaurus';
  if (/__VP_HASH_MAP__|id=["']VPContent["']/i.test(text)) return 'VitePress';
  return '';
}

function pathSegments(href) {
  return decodeURIComponent(new URL(href).pathname).split('/').filter(Boolean).map(segment => segment.toLowerCase());
}

function docsHost(hostname) {
  const host = hostname.toLowerCase().replace(/\.$/, '');
  const label = host.split('.')[0];
  if (label === 'docs' || label === 'documentation') return true;
  return host.endsWith('.readthedocs.io') || host.endsWith('.readthedocs.org') || host === 'readthedocs.io'
    || host.endsWith('.gitbook.io') || host === 'gitbook.io';
}

function prepareHtml(html) {
  return String(html)
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '');
}

function linkPath(href, pageUrl) {
  if (!href) return null;
  const value = href.replace(/&amp;/g, '&').trim();
  if (!value || /^(?:#|mailto:|javascript:|tel:|data:)/i.test(value)) return null;
  let url;
  try { url = new URL(value, pageUrl); } catch { return null; }
  if (!['http:', 'https:'].includes(url.protocol)) return null;
  if (url.hostname !== new URL(pageUrl).hostname) return null;
  let path = decodeURIComponent(url.pathname);
  if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
  return path || '/';
}

function underPrefix(path, prefix) {
  const root = normalizePrefix(prefix);
  if (root === '/') return path.startsWith('/');
  return path === root || path.startsWith(`${root}/`);
}

export function countScopedLinks(html, pageUrl, prefix) {
  const source = prepareHtml(html);
  const stack = [];
  const found = new Set();
  const re = /<\/?([a-zA-Z][a-zA-Z0-9:-]*)\b([^>]*)>/g;
  let match;
  while ((match = re.exec(source))) {
    const name = match[1].toLowerCase();
    const closing = match[0].startsWith('</');
    const selfClosing = /\/>$/.test(match[0]) || VOID_TAGS.has(name);
    if (closing) {
      for (let i = stack.length - 1; i >= 0; i--) {
        if (stack[i].name === name) { stack.splice(i, 1); break; }
      }
      continue;
    }
    const scoped = name === 'nav' || name === 'aside' || NAV_CLASS.test(`${attr(match[2], 'class')} ${attr(match[2], 'id')}`);
    if (name === 'a' && stack.some(frame => frame.scoped)) {
      const path = linkPath(attr(match[2], 'href'), pageUrl);
      if (path && underPrefix(path, prefix)) found.add(path);
    }
    if (!selfClosing) stack.push({ name, scoped });
    if (stack.length > 200) stack.splice(0, stack.length - 200);
  }
  return found.size;
}

export function decideCrawl({ href, html = '', override = 'auto' }) {
  const prefix = crawlPrefix(href);
  if (override === 'off') return { crawl: false, reason: 'override-off', prefix, hint: null, detail: '已指定 --no-crawl' };
  if (override === 'force') return { crawl: true, reason: 'override-on', prefix, hint: null, detail: '已指定 --crawl' };
  const url = new URL(href);
  if (docsHost(url.hostname)) {
    return { crawl: true, reason: 'docs-host', prefix, hint: null, detail: `主机 ${url.hostname} 是文档站` };
  }
  const segment = pathSegments(href).find(item => DOC_SEGMENTS.has(item));
  if (segment) return { crawl: true, reason: 'url-segment', prefix, hint: null, detail: `路径段 ${segment}` };
  const generator = generatorContent(html);
  const generatorHit = GENERATORS.find(name => generator.toLowerCase().includes(name));
  if (generatorHit) {
    return { crawl: true, reason: 'generator', prefix, hint: null, detail: `generator 含 ${generatorHit}` };
  }
  const marker = frameworkMarker(html);
  if (marker) return { crawl: true, reason: 'framework-marker', prefix, hint: null, detail: `页面含 ${marker} 标记` };
  const links = countScopedLinks(html, href, prefix);
  if (prefix === '/' && links >= NAV_LINK_HINT) {
    return {
      crawl: false, reason: 'ambiguous-root', prefix, links, detail: `根路径导航有 ${links} 个站内链接`,
      hint: '入口是站点根路径，未自动整站抓取。请改用文档区 URL，或加上 --crawl / --crawl-prefix。',
    };
  }
  if (links >= NAV_LINK_CRAWL) {
    return { crawl: true, reason: 'nav-links', prefix, links, hint: null, detail: `导航中 ${links} 个同前缀链接` };
  }
  if (links >= NAV_LINK_HINT) {
    return {
      crawl: false, reason: 'ambiguous-nav', prefix, links, detail: `导航中 ${links} 个同前缀链接`,
      hint: `入口页导航里有 ${links} 个同一路径前缀的链接，不足以判定为文档站。本次只保存入口页。若要抓取 ${prefix} 下的页面，请加上 --crawl。`,
    };
  }
  return { crawl: false, reason: 'single-page', prefix, links, hint: null, detail: '没有多页文档信号' };
}

export function stripCopiedMarkers(markdown) {
  const without = String(markdown).replace(/[ \t]*\[Copied\]\(#[^)\r\n]*\)[ \t]*/g, '');
  return `${without.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()}\n`;
}

export function crawlIsUseful(pages) {
  const lengths = pages.map(page => page.chars || 0);
  const total = lengths.reduce((sum, value) => sum + value, 0);
  const substantial = lengths.filter(value => value >= MIN_PAGE_CHARS).length;
  return pages.length >= MIN_PAGES && substantial >= MIN_SUBSTANTIAL_PAGES && total >= MIN_TOTAL_CHARS;
}

export function pagesFromCrawlJson(json) {
  const results = Array.isArray(json?.results) ? json.results : [];
  const pages = [];
  for (const row of results) {
    if (!row || typeof row.markdownFilePath !== 'string' || typeof row.url !== 'string') continue;
    const status = String(row.status ?? '');
    if (status && !status.startsWith('2')) continue;
    const file = row.markdownFilePath.replace(/\\/g, '/').replace(/^\.\//, '');
    if (!file.endsWith('.md') || file.split('/').includes('..')) continue;
    pages.push({ file, url: row.url });
  }
  return { version: parseVersion(json?.crawler?.version), pages };
}

export function guessPageUrl(file, origin) {
  let path = String(file).replace(/\\/g, '/').replace(/^\.\//, '');
  if (path.endsWith('/index.md')) path = path.slice(0, -'/index.md'.length);
  else if (path.endsWith('.md')) path = path.slice(0, -3);
  const url = new URL(origin);
  url.pathname = `/${path.replace(/^\/+/, '')}`;
  url.search = '';
  url.hash = '';
  return url.href;
}

export function buildCrawlArgs({ url, markdownDir, jsonFile, prefix, maxPages, workers, proxy }) {
  const args = [
    `--url=${url}`,
    ...(prefix ? [`--include-regex=${includeRegex(prefix)}`] : []),
    `--workers=${workers}`,
    `--max-visited-urls=${maxPages}`,
    '--disable-all-assets',
    `--markdown-export-dir=${markdownDir}`,
    '--markdown-move-content-before-h1-to-end',
    '--markdown-exclude-selector=nav',
    '--markdown-exclude-selector=footer',
    '--markdown-replace-content=/\\[Copied\\]\\(#[^)]*\\)/ -> ',
    '--timeout=20',
    '--no-color',
    '--hide-progress-bar',
    '--console-width=100',
    '--no-cache',
    `--output-json-file=${jsonFile}`,
  ];
  if (proxy) args.push(`--proxy=${proxy}`);
  return args;
}

function findOnPath(env) {
  for (const dir of String(env.PATH || '').split(delimiter)) {
    if (!dir) continue;
    const candidate = join(dir, 'siteone-crawler');
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

function cachePath(root, key) {
  return join(root, 'tools', 'cache', 'siteone-crawler', CRAWLER_VERSION, key, 'siteone-crawler');
}

function relativeCache(root, file) {
  return relative(root, file).split('\\').join('/');
}

function captureOutput(executable, args, { timeoutMs = 20000 } = {}) {
  return new Promise((accept, reject) => {
    const child = spawn(executable, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '', stderr = '';
    const timer = setTimeout(() => { stderr += `\nTimed out after ${timeoutMs}ms`; child.kill('SIGTERM'); }, timeoutMs);
    child.stdout.on('data', data => { stdout += data; });
    child.stderr.on('data', data => { stderr += data; });
    child.on('error', reject);
    child.on('close', code => { clearTimeout(timer); accept({ code, stdout, stderr }); });
  });
}
async function probeVersion(_run, executable) {
  try {
    const { stdout, stderr } = await captureOutput(executable, ['--version']);
    const version = parseVersion(stdout) || parseVersion(stderr);
    if (version) return { version, output: stdout || stderr };
    return { error: `${stderr || stdout || '无法识别 siteone-crawler 版本'}`.trim() };
  } catch (error) {
    return { error: error.message };
  }
}

function findBinary(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      const found = findBinary(path);
      if (found) return found;
    } else if (entry.name === 'siteone-crawler') return path;
  }
  return null;
}

async function downloadAsset(run, root, key) {
  const asset = ASSETS[key];
  if (!asset) throw new Error(`没有适用于 ${key} 的 siteone-crawler ${CRAWLER_VERSION} 官方构建。`);
  const work = join(tmpdir(), `siteone-crawler-${key}-${process.pid}`);
  rmSync(work, { recursive: true, force: true });
  mkdirSync(work, { recursive: true });
  const archive = join(work, asset.file);
  try {
    await run('curl', ['-fL', '--retry', '3', '--retry-delay', '2', '--max-time', '180', '-o', archive, `${RELEASE_BASE}/${asset.file}`], { timeoutMs: 200000 });
    const digest = createHash('sha256').update(readFileSync(archive)).digest('hex');
    if (digest !== asset.sha256) throw new Error(`siteone-crawler 压缩包校验失败（${key}）。`);
    await run('tar', ['-xzf', archive, '-C', work], { timeoutMs: 60000 });
    const binary = findBinary(work);
    if (!binary) throw new Error(`压缩包中没有 siteone-crawler 可执行文件（${key}）。`);
    const dest = cachePath(root, key);
    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(binary, dest);
    chmodSync(dest, 0o755);
    if (process.platform === 'darwin') await run('xattr', ['-d', 'com.apple.quarantine', dest], { timeoutMs: 10000 }).catch(() => {});
    return dest;
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

export async function ensureCrawler({ run, root = repoRoot, log = console.log, env = process.env, platform = process.platform, arch = process.arch } = {}) {
  if (!run) throw new Error('缺少运行命令的函数。');
  const installed = findOnPath(env);
  if (installed) {
    const probed = await probeVersion(run, installed);
    if (probed.version && versionAtLeast(probed.version)) {
      log(`使用 PATH 中的 siteone-crawler ${probed.version}：${installed}`);
      return { executable: installed, version: probed.version, source: 'path' };
    }
    if (probed.version) log(`PATH 中的 siteone-crawler 是 ${probed.version}，低于 ${CRAWLER_VERSION}，将改用自动下载的版本。`);
  }
  const key = platformKey(platform, arch);
  if (!key || !ASSETS[key]) throw new Error(`当前系统 ${platform}/${arch} 没有对应的 siteone-crawler 构建（支持 Linux 与 macOS 的 x64/arm64）。`);
  const preferMusl = platform === 'linux' && existsSync(join(root, 'tools', 'cache', 'siteone-crawler', CRAWLER_VERSION, 'prefer-musl'));
  const cachedKey = preferMusl ? platformKey(platform, arch, true) : key;
  const cached = cachePath(root, cachedKey);
  if (existsSync(cached)) {
    const probed = await probeVersion(run, cached);
    if (probed.version && versionAtLeast(probed.version)) {
      log(`使用已缓存的 siteone-crawler ${probed.version}：${relativeCache(root, cached)}`);
      return { executable: cached, version: probed.version, source: 'cache' };
    }
    rmSync(cached, { force: true });
  }
  let executable;
  let usedKey = key;
  try {
    executable = await downloadAsset(run, root, key);
    const probed = await probeVersion(run, executable);
    if (!probed.version || !versionAtLeast(probed.version)) {
      const glibc = /GLIBC|libc\.so/.test(probed.error || '');
      rmSync(executable, { force: true });
      if (!glibc || !platformKey(platform, arch, true)) throw new Error(probed.error || '下载的 siteone-crawler 无法运行。');
      usedKey = platformKey(platform, arch, true);
      log(`系统 glibc 无法运行默认构建，改为下载 musl 静态构建（${usedKey}）。`);
      executable = await downloadAsset(run, root, usedKey);
      const muslProbe = await probeVersion(run, executable);
      if (!muslProbe.version) throw new Error(muslProbe.error || 'musl 构建无法运行。');
      writeFileSync(join(root, 'tools', 'cache', 'siteone-crawler', CRAWLER_VERSION, 'prefer-musl'), `${usedKey}\n`);
    }
  } catch (error) {
    if (executable && existsSync(executable)) rmSync(executable, { force: true });
    throw error;
  }
  const where = relativeCache(root, executable);
  log(`未找到可用的 siteone-crawler ${CRAWLER_VERSION}+，已自动下载 v${CRAWLER_VERSION}（${usedKey}）到 ${where}。`);
  const probed = await probeVersion(run, executable);
  return { executable, version: probed.version || CRAWLER_VERSION, source: 'downloaded' };
}

function listMarkdown(dir, base = dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) listMarkdown(path, base, out);
    else if (entry.isFile() && entry.name.endsWith('.md')) {
      const file = relative(base, path).split('\\').join('/');
      if (!file.split('/').includes('..')) out.push(file);
    }
  }
  return out;
}

export function finalizePages({ markdownDir, manifest, origin, retrieved, version, prefix }) {
  const known = new Map((manifest || []).map(page => [page.file, page.url]));
  const files = listMarkdown(markdownDir);
  const pages = [];
  for (const file of files) {
    const sourcePath = join(markdownDir, file);
    const body = stripCopiedMarkers(readFileSync(sourcePath, 'utf8'));
    const chars = body.trim().length;
    const url = known.get(file) || guessPageUrl(file, origin);
    const scope = prefix ? `prefix: ${prefix}` : 'scope: siteone-domain';
    const stamped = `<!-- source: ${url} -->\n<!-- retrieved: ${retrieved}; tool: siteone-crawler ${version}; ${scope} -->\n\n${body}`;
    pages.push({ file: `pages/${file}`, url, chars, text: stamped });
  }
  pages.sort((a, b) => a.file.localeCompare(b.file));
  return pages;
}

export async function runCrawl({ run, executable, url, directory, prefix, maxPages, workers, env = process.env }) {
  const scratch = join(directory, '.crawl-tmp');
  rmSync(scratch, { recursive: true, force: true });
  const markdownDir = join(scratch, 'markdown');
  mkdirSync(markdownDir, { recursive: true });
  const jsonFile = join(scratch, 'crawl.json');
  const proxy = proxyEndpoint(env);
  if (proxy?.error) console.warn(`警告：${proxy.error}`);
  if (proxy?.hasAuth) console.warn('警告：代理 URL 含有用户信息。siteone-crawler 的 --proxy 只接受 host:port，认证不会传给爬虫；curl 下载仍使用完整代理环境变量。');
  const args = buildCrawlArgs({
    url, markdownDir, jsonFile, prefix, maxPages, workers,
    proxy: proxy?.endpoint,
  });
  let failure = null;
  try {
    await run(executable, args, { cwd: scratch, timeoutMs: 15 * 60 * 1000 });
  } catch (error) {
    failure = error;
  }
  let manifest = [];
  let version = null;
  if (existsSync(jsonFile)) {
    try {
      const parsed = pagesFromCrawlJson(JSON.parse(readFileSync(jsonFile, 'utf8')));
      manifest = parsed.pages;
      version = parsed.version;
    } catch { /* markdown files remain usable without the JSON index */ }
  }
  const pages = existsSync(markdownDir) ? finalizePages({ markdownDir, manifest, origin: url, retrieved: new Date().toISOString().slice(0, 10), version: version || CRAWLER_VERSION, prefix }) : [];
  rmSync(scratch, { recursive: true, force: true });
  if (!crawlIsUseful(pages)) {
    const chars = pages.reduce((sum, page) => sum + page.chars, 0);
    const reason = failure ? `爬虫未成功结束（${failure.message.split('\n')[0]}）` : `抓取结果过少（${pages.length} 页，约 ${chars} 字）`;
    throw new Error(`${reason}。可能是需要 JavaScript 渲染的站点，或同站没有足够的 HTML 页面。`);
  }
  if (failure) console.warn(`警告：爬虫退出异常，但已得到 ${pages.length} 页，仍保存这些页面。${failure.message.split('\n')[0]}`);
  return { pages, version: version || CRAWLER_VERSION };
}

export function writePages(directory, pages) {
  const dest = join(directory, 'pages');
  rmSync(dest, { recursive: true, force: true });
  for (const page of pages) {
    const file = join(directory, page.file);
    if (page.file.split('/').includes('..')) continue;
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, page.text);
  }
}
