import { describe, it, after, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { chmodSync, existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { command, prepareMaterials } from './materials.mjs';
const extractor = fileURLToPath(new URL('./extract-material.py', import.meta.url));
const originalPath = process.env.PATH;
const realPython = execFileSync('which', ['python3'], { encoding: 'utf8' }).trim();
import {
  ASSETS, CRAWLER_VERSION, buildCrawlArgs, choosePrefix, crawlIsUseful, crawlPrefix, decideCrawl,
  ensureCrawler, includeRegex, pagesFromCrawlJson, platformKey, proxyEndpoint, stripCopiedMarkers,
  versionAtLeast,
} from './site-crawl.mjs';

function nav(count, prefix = '/learn') {
  const links = Array.from({ length: count }, (_, index) => `<a href="${prefix}/page-${index}">${index}</a>`).join('');
  return `<html><body><nav>${links}</nav><main>${Array.from({ length: 12 }, (_, index) => `<a href="/blog/${index}">b</a>`).join('')}</main></body></html>`;
}

describe('docs crawl decision', () => {
  it('treats documentation path segments as a docs section', () => {
    const decision = decideCrawl({ href: 'https://pi.dev/docs/latest' });
    assert.equal(decision.crawl, true);
    assert.equal(decision.reason, 'url-segment');
    assert.equal(decision.prefix, '/docs/latest');
    assert.equal(decideCrawl({ href: 'https://vuejs.org/guide/introduction.html' }).prefix, '/guide');
    assert.equal(decideCrawl({ href: 'https://example.com/api/reference' }).reason, 'url-segment');
    assert.equal(decideCrawl({ href: 'https://example.com/guides/start' }).detail.includes('guides'), true);
  });

  it('does not treat a plain /api/ page as a docs section', () => {
    const decision = decideCrawl({ href: 'https://example.com/api/status', html: '<html><body><p>status ok</p></body></html>' });
    assert.equal(decision.crawl, false);
    assert.equal(decision.reason, 'single-page');
    const reference = decideCrawl({ href: 'https://example.com/api/reference' });
    assert.equal(reference.crawl, true);
    assert.equal(reference.reason, 'url-segment');
    assert.equal(reference.detail.includes('reference'), true);
    assert.equal(decideCrawl({ href: 'https://example.com/api/status', html: '<meta name="generator" content="mkdocs-1.6">' }).reason, 'generator');
    assert.equal(decideCrawl({ href: 'https://example.com/api/status', override: 'force' }).reason, 'override-on');
  });

  it('recognizes docs hosts and generator or framework markers', () => {
    assert.equal(decideCrawl({ href: 'https://docs.python.org/3/library/functions.html' }).reason, 'docs-host');
    assert.equal(crawlPrefix('https://docs.python.org/3/library/functions.html'), '/3/library');
    assert.equal(decideCrawl({ href: 'https://project.readthedocs.io/en/stable/' }).reason, 'docs-host');
    assert.equal(decideCrawl({ href: 'https://example.com/intro', html: '<meta content="VitePress 1.0" name="generator">' }).reason, 'generator');
    assert.equal(decideCrawl({ href: 'https://example.com/intro', html: '<meta name="generator" content="mkdocs-1.6">' }).reason, 'generator');
    assert.equal(decideCrawl({ href: 'https://example.com/intro', html: '<div id="__docusaurus">' }).reason, 'framework-marker');
    assert.equal(decideCrawl({ href: 'https://example.com/intro', html: '<script>window.__VP_HASH_MAP__={}</script>' }).reason, 'framework-marker');
  });

  it('uses the navigation only when it contains many same-prefix links', () => {
    const many = decideCrawl({ href: 'https://example.com/learn', html: nav(8) });
    assert.equal(many.crawl, true);
    assert.equal(many.reason, 'nav-links');
    const few = decideCrawl({ href: 'https://example.com/learn', html: nav(5) });
    assert.equal(few.crawl, false);
    assert.equal(few.reason, 'ambiguous-nav');
    assert.match(few.hint, /--crawl/);
    const outside = decideCrawl({ href: 'https://example.com/learn', html: '<main><div class="menu">' + Array.from({ length: 10 }, (_, i) => `<a href="/blog/${i}">${i}</a>`).join('') + '</div></main>' });
    assert.equal(outside.reason, 'single-page');
  });

  it('does not crawl a site root from a large menu, and honors overrides', () => {
    const root = decideCrawl({ href: 'https://example.com/', html: nav(10, '') });
    assert.equal(root.crawl, false);
    assert.equal(root.reason, 'ambiguous-root');
    assert.equal(decideCrawl({ href: 'https://pi.dev/docs/latest', override: 'off' }).crawl, false);
    assert.equal(decideCrawl({ href: 'https://example.com/about', override: 'force' }).crawl, true);
    assert.equal(decideCrawl({ href: 'https://example.com/about', html: '<p>Hello</p>' }).reason, 'single-page');
  });
});

describe('crawl scope and output cleanup', () => {
  it('keeps the requested prefix unless a redirect leaves it', () => {
    assert.equal(choosePrefix('https://pi.dev/docs/latest', 'https://pi.dev/docs/latest/', undefined), '/docs/latest');
    assert.equal(choosePrefix('https://example.com/docs', 'https://example.com/docs/latest/install.html', undefined), '/docs');
    assert.equal(choosePrefix('https://example.com/', 'https://example.com/docs/latest', undefined), '/docs/latest');
    assert.equal(choosePrefix('https://example.com/start', 'https://example.com/docs/latest', '/manual'), '/manual');
  });

  it('builds an include regex that stops at the prefix boundary', () => {
    const pattern = includeRegex('/docs/latest');
    const expression = new RegExp(pattern.slice(1, -1));
    assert.equal(expression.test('https://pi.dev/docs/latest'), true);
    assert.equal(expression.test('https://pi.dev/docs/latest/install'), true);
    assert.equal(expression.test('https://pi.dev/docs/latest?x=1'), true);
    assert.equal(expression.test('https://pi.dev/docs/latest-old'), false);
    assert.equal(includeRegex('/'), '/');
  });

  it('removes copied-heading markers and rejects thin crawls', () => {
    const cleaned = stripCopiedMarkers('## Install\n\n[Copied](#install)\n\nRun it.\n');
    assert.equal(cleaned.includes('[Copied]'), false);
    assert.match(cleaned, /## Install\n\nRun it\./);
    assert.equal(crawlIsUseful([{ chars: 500 }, { chars: 400 }]), true);
    assert.equal(crawlIsUseful([{ chars: 50 }, { chars: 50 }]), false);
    assert.equal(crawlIsUseful([{ chars: 2000 }]), false);
  });

  it('reads successful markdown paths from crawler JSON', () => {
    const parsed = pagesFromCrawlJson({
      crawler: { version: 'siteone-crawler 2.5.1' },
      results: [
        { url: 'https://pi.dev/docs/latest', status: '200', markdownFilePath: 'docs/latest.md' },
        { url: 'https://pi.dev/missing', status: '404', markdownFilePath: 'missing.md' },
        { url: 'https://pi.dev/bad', status: '200', markdownFilePath: '../bad.md' },
      ],
    });
    assert.equal(parsed.version, '2.5.1');
    assert.deepEqual(parsed.pages, [{ file: 'docs/latest.md', url: 'https://pi.dev/docs/latest' }]);
  });

  it('forwards proxy host and port, and pins platform archives', () => {
    assert.equal(proxyEndpoint({ HTTPS_PROXY: 'http://user:secret@127.0.0.1:8888', HTTP_PROXY: 'http://other:80' }).endpoint, '127.0.0.1:8888');
    assert.equal(proxyEndpoint({ https_proxy: 'proxy.example:3128' }).endpoint, 'proxy.example:3128');
    assert.equal(proxyEndpoint({ HTTP_PROXY: 'http://[::1]:8080' }).endpoint, '[::1]:8080');
    assert.equal(proxyEndpoint({}), null);
    assert.equal(platformKey('linux', 'x64'), 'linux-x64');
    assert.equal(platformKey('darwin', 'arm64'), 'darwin-arm64');
    assert.equal(platformKey('linux', 'arm64', true), 'linux-arm64-musl');
    assert.equal(platformKey('win32', 'x64'), null);
    for (const asset of Object.values(ASSETS)) assert.match(asset.sha256, /^[a-f0-9]{64}$/);
    assert.equal(versionAtLeast('2.6.0', CRAWLER_VERSION), true);
    assert.equal(versionAtLeast('2.5.0', CRAWLER_VERSION), false);
    const args = buildCrawlArgs({ url: 'https://pi.dev/docs/latest', markdownDir: 'markdown', jsonFile: 'crawl.json', prefix: '/docs/latest', maxPages: 500, workers: 2 });
    assert.equal(args.some(arg => arg.includes('exclude-selector=header')), false);
    assert.equal(args.some(arg => arg === '--markdown-exclude-selector=nav'), true);
    assert.equal(args.some(arg => arg.startsWith('--include-regex=')), true);
    assert.equal(args.some(arg => arg === '--disable-all-assets'), true);
  });
});

describe('crawler binary selection', () => {
  it('uses a new enough binary on PATH and a cached binary otherwise', async () => {
    const root = mkdtempSync(join(tmpdir(), 'crawl-path-'));
    const binDir = join(root, 'bin');
    mkdirSync(binDir);
    const installed = join(binDir, 'siteone-crawler');
    writeFileSync(installed, '#!/bin/sh\necho "siteone-crawler 2.5.1"\n');
    chmodSync(installed, 0o755);
    const logs = [];
    const found = await ensureCrawler({ run: command, root, env: { PATH: binDir }, log: message => logs.push(message) });
    assert.equal(found.source, 'path');
    assert.equal(found.version, '2.5.1');
    assert.match(logs[0], /PATH/);
    const cacheRoot = mkdtempSync(join(tmpdir(), 'crawl-cache-'));
    const cached = join(cacheRoot, 'tools', 'cache', 'siteone-crawler', '2.5.1', 'linux-x64');
    mkdirSync(cached, { recursive: true });
    const binary = join(cached, 'siteone-crawler');
    writeFileSync(binary, '#!/bin/sh\necho "siteone-crawler 2.5.1"\n');
    chmodSync(binary, 0o755);
    const cachedLogs = [];
    const reused = await ensureCrawler({
      run: command, root: cacheRoot, env: { PATH: '' }, platform: 'linux', arch: 'x64',
      log: message => cachedLogs.push(message),
    });
    assert.equal(reused.source, 'cache');
    assert.match(cachedLogs[0], /已缓存/);
    rmSync(root, { recursive: true, force: true });
    rmSync(cacheRoot, { recursive: true, force: true });
  });

  it('reports an old PATH binary and surfaces download failure', async () => {
    const root = mkdtempSync(join(tmpdir(), 'crawl-old-'));
    const binDir = join(root, 'bin');
    mkdirSync(binDir);
    const old = join(binDir, 'siteone-crawler');
    writeFileSync(old, '#!/bin/sh\necho "siteone-crawler 2.4.0"\nexit 2\n');
    chmodSync(old, 0o755);
    const logs = [];
    await assert.rejects(() => ensureCrawler({
      run: async () => { throw new Error('network down'); },
      root, env: { PATH: binDir }, log: message => logs.push(message),
    }), /network down/);
    assert.match(logs.join('\n'), /2\.4\.0/);
    rmSync(root, { recursive: true, force: true });
  });
});

describe('existing material paths', () => {
  it('still copies a local file without crawling', async () => {
    const root = mkdtempSync(join(tmpdir(), 'materials-'));
    const source = join(root, 'notes.txt');
    writeFileSync(source, 'local notes\n');
    const records = await prepareMaterials([source], join(root, 'out'));
    assert.equal(records[0].version, 'local file');
    assert.equal(records[0].crawl, undefined);
    assert.equal(readFileSync(join(root, 'out', records[0].path), 'utf8'), 'local notes\n');
    rmSync(root, { recursive: true, force: true });
  });
});

const FILL = 'This paragraph exists so the HTTP HTML source has enough readable text after extraction. '.repeat(2);
const SINGLE_HINT = repo => `提示：页面的编辑/源文件链接指向文档源码仓库 https://github.com/${repo}；如需多页文档，建议改用 --source https://github.com/${repo}。本次仍仅保存入口页。`;
const MULTI_HINT = repo => `提示：入口页的编辑/源文件链接指向文档源码仓库 https://github.com/${repo}。`;
const HINTS_FAIL_WARN = '警告：无法检查入口页的文档源码仓库链接；已保存的多页文档仍可使用。';
const crawlDirs = [];
function htmlPage(inner) {
  return `<!doctype html><html><body><p>${FILL}</p>${inner}</body></html>`;
}
function substantial(title) {
  return `# ${title}\n\n${'This is documentation used by the offline crawl fixture. '.repeat(12)}\n`;
}
function fixturePages(origin) {
  const base = origin.replace(/\/$/, '');
  return [
    { file: 'guide.md', url: base, body: substantial('Guide') },
    { file: 'guide/install.md', url: `${base}/install`, body: substantial('Install') },
  ];
}
function tempCrawl(prefix) {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  crawlDirs.push(dir);
  return dir;
}
function writeBin(dir, name, body) {
  const file = join(dir, name);
  writeFileSync(file, body);
  chmodSync(file, 0o755);
  return file;
}
async function captureStderr(fn) {
  const chunks = [];
  const orig = process.stderr.write;
  process.stderr.write = (...args) => {
    chunks.push(String(args[0]));
    return orig.apply(process.stderr, args);
  };
  try {
    const result = await fn();
    return { result, stderr: chunks.join('') };
  } catch (error) {
    error.stderr = chunks.join('');
    throw error;
  } finally {
    process.stderr.write = orig;
  }
}

const crawlBin = tempCrawl('crawl-bin-');
const curlLog = join(crawlBin, 'curl.log');
const crawlerLog = join(crawlBin, 'crawler.log');
writeFileSync(curlLog, '');
writeFileSync(crawlerLog, '');
writeBin(crawlBin, 'curl', `#!/usr/bin/env node
const { copyFileSync, appendFileSync } = require('fs');
const args = process.argv.slice(2);
const url = args[args.length - 1];
const allowed = process.env.FAKE_CURL_ALLOW;
if (!allowed || url !== allowed) {
  process.stderr.write('unexpected curl request: ' + url + '\\n');
  process.exit(1);
}
const outIdx = args.indexOf('-o');
if (outIdx < 0) {
  process.stderr.write('curl -o required\\n');
  process.exit(1);
}
copyFileSync(process.env.FAKE_CURL_FILE, args[outIdx + 1]);
if (process.env.FAKE_CURL_LOG) appendFileSync(process.env.FAKE_CURL_LOG, url + '\\n');
process.stdout.write((process.env.FAKE_CURL_TYPE || 'text/html') + '\\n' + (process.env.FAKE_CURL_URL || url));
`);
writeBin(crawlBin, 'siteone-crawler', `#!/usr/bin/env node
const { mkdirSync, writeFileSync, appendFileSync } = require('fs');
const { dirname, join } = require('path');
const args = process.argv.slice(2);
if (args.includes('--version')) {
  process.stdout.write('siteone-crawler 2.5.1\\n');
  process.exit(0);
}
if (process.env.FAKE_CRAWLER_LOG) appendFileSync(process.env.FAKE_CRAWLER_LOG, args.join('\\n') + '\\n');
if (process.env.FAKE_CRAWLER_MODE === 'fail') {
  process.stderr.write('crawler boom\\n');
  process.exit(1);
}
function arg(prefix) {
  const hit = args.find(a => a.startsWith(prefix));
  if (!hit) {
    process.stderr.write('missing ' + prefix + '\\n');
    process.exit(1);
  }
  return hit.slice(prefix.length);
}
const markdownDir = arg('--markdown-export-dir=');
const jsonFile = arg('--output-json-file=');
const pages = JSON.parse(process.env.FAKE_CRAWL_PAGES || '[]');
const results = [];
for (const page of pages) {
  const file = join(markdownDir, page.file);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, page.body);
  results.push({ url: page.url, status: '200', markdownFilePath: page.file });
}
mkdirSync(dirname(jsonFile), { recursive: true });
writeFileSync(jsonFile, JSON.stringify({ crawler: { version: 'siteone-crawler 2.5.1' }, results }));
if (process.env.FAKE_CRAWLER_MODE === 'nonzero') {
  process.stderr.write('partial failure\\n');
  process.exit(2);
}
`);
const failHintsBin = tempCrawl('crawl-fail-python-');
writeBin(failHintsBin, 'python3', `#!/usr/bin/env node
const { spawnSync } = require('child_process');
if (process.argv.includes('--github-hints-only')) {
  process.stderr.write('hints-only boom\\n');
  process.exit(1);
}
const result = spawnSync(process.env.REAL_PYTHON, process.argv.slice(2));
if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
process.exit(result.status === null ? 1 : result.status);
`);

async function fromCrawl(html, source, extra = {}) {
  const finalURL = extra.finalURL || source;
  const body = join(tempCrawl('crawl-body-'), 'page.html');
  writeFileSync(body, html);
  writeFileSync(crawlerLog, '');
  writeFileSync(curlLog, '');
  process.env.PATH = extra.pythonPath ? `${extra.pythonPath}:${crawlBin}:${originalPath}` : `${crawlBin}:${originalPath}`;
  process.env.FAKE_CURL_FILE = body;
  process.env.FAKE_CURL_TYPE = extra.contentType || 'text/html';
  process.env.FAKE_CURL_URL = finalURL;
  process.env.FAKE_CURL_ALLOW = new URL(source).href;
  process.env.FAKE_CURL_LOG = curlLog;
  process.env.FAKE_CRAWLER_LOG = crawlerLog;
  process.env.FAKE_CRAWLER_MODE = extra.crawlerMode || '';
  process.env.FAKE_CRAWL_PAGES = JSON.stringify(extra.pages || fixturePages(finalURL));
  process.env.REAL_PYTHON = realPython;
  const out = tempCrawl('crawl-out-');
  const { result: records, stderr } = await captureStderr(() => prepareMaterials([source], out, extra.options || {}));
  return {
    records, out, stderr, html,
    crawlerArgs: readFileSync(crawlerLog, 'utf8'),
    curlCalls: readFileSync(curlLog, 'utf8').trim() ? readFileSync(curlLog, 'utf8').trim().split('\n').length : 0,
  };
}

describe('offline crawl integration', { concurrency: 1 }, () => {
  afterEach(() => {
    process.env.PATH = originalPath;
  });
  after(() => {
    process.env.PATH = originalPath;
    for (const key of ['FAKE_CURL_FILE', 'FAKE_CURL_TYPE', 'FAKE_CURL_URL', 'FAKE_CURL_ALLOW', 'FAKE_CURL_LOG', 'FAKE_CRAWLER_LOG', 'FAKE_CRAWLER_MODE', 'FAKE_CRAWL_PAGES', 'REAL_PYTHON']) {
      delete process.env[key];
    }
    for (const dir of crawlDirs) rmSync(dir, { recursive: true, force: true });
  });

  it('calls the fake crawler with default auto limits and keeps multi-page output', async () => {
    const source = 'https://docs.example.com/guide';
    const html = htmlPage('<p>Docs home</p>');
    const { records, out, html: original, crawlerArgs, stderr } = await fromCrawl(html, source);
    assert.match(crawlerArgs, /--max-visited-urls=500/);
    assert.match(crawlerArgs, /--workers=2/);
    assert.match(crawlerArgs, /--url=https:\/\/docs\.example\.com\/guide/);
    assert.match(crawlerArgs, /--include-regex=.*guide/);
    assert.equal(records[0].path, 'material-1');
    assert.equal(records[0].readableText, undefined);
    assert.equal(records[0].crawl.pageCount, 2);
    assert.equal(records[0].crawl.maxPages, 500);
    assert.equal(records[0].crawl.workers, 2);
    assert.equal(records[0].crawl.prefix, '/guide');
    assert.deepEqual(readFileSync(join(out, 'material-1/entry.html')), Buffer.from(original));
    const provenance = JSON.parse(readFileSync(join(out, records[0].provenance), 'utf8'));
    assert.equal(provenance.source, source);
    assert.equal(provenance.fetchedURL, source);
    assert.equal(provenance.entryHtml, 'entry.html');
    assert.equal(provenance.pages.length, 2);
    assert.ok(existsSync(join(out, 'material-1', provenance.pages[0].file)));
    assert.ok(existsSync(join(out, 'material-1', provenance.pages[1].file)));
    assert.equal(existsSync(join(out, 'material-1/original.html')), false);
    assert.equal(existsSync(join(out, 'material-1/.crawl-tmp')), false);
    assert.equal(stderr.includes('本次仍仅保存入口页'), false);
  });

  it('prints multi-page GitHub hints once per repo and not the single-page advice', async () => {
    const html = htmlPage(
      '<a href="https://github.com/acme/handbook/edit/main/docs/intro.md">Edit</a>' +
      '<a href="https://github.com/acme/handbook/blob/main/docs/intro.md">Blob</a>' +
      '<a href="https://github.com/octo/guide/blob/main/README.md">Other</a>',
    );
    const { stderr, records } = await fromCrawl(html, 'https://docs.example.com/guide');
    assert.equal(records[0].crawl.pageCount, 2);
    assert.equal(stderr.trim(), [MULTI_HINT('acme/handbook'), MULTI_HINT('octo/guide')].join('\n'));
    assert.equal(stderr.includes('本次仍仅保存入口页'), false);
    assert.equal(stderr.includes('建议改用 --source'), false);
  });

  it('resolves relative GitHub links against finalURL after a redirect', async () => {
    const source = 'https://example.com/intro';
    const finalURL = 'https://github.com/orgs/handbook/';
    const html = htmlPage('<a href="/acme/docs/edit/main/README.md">Edit</a>');
    const { stderr, records } = await fromCrawl(html, source, { finalURL, options: { crawl: 'force' } });
    assert.equal(records[0].fetchedURL, finalURL);
    assert.equal(records[0].url, source);
    assert.equal(stderr.trim(), MULTI_HINT('acme/docs'));
    assert.equal(stderr.includes(SINGLE_HINT('acme/docs')), false);
  });

  it('still hints when the GitHub link sits after the 2 MB auto-decision sample', async () => {
    const html = `<!doctype html><html><body><p>${FILL}</p>${'a'.repeat(2_000_000)}<a href="https://github.com/acme/docs/blob/main/README.md">source</a></body></html>`;
    const { stderr, records } = await fromCrawl(html, 'https://docs.example.com/guide');
    assert.equal(records[0].crawl.pageCount, 2);
    assert.equal(stderr.trim(), MULTI_HINT('acme/docs'));
  });

  it('returns a multi-page record with no repo hint when the entry has no valid GitHub links', async () => {
    const html = htmlPage('<p>No repository links here.</p><a href="https://github.com/acme/docs">homepage</a>');
    const { stderr, records, out } = await fromCrawl(html, 'https://docs.example.com/guide');
    assert.equal(records[0].crawl.pageCount, 2);
    assert.equal(stderr.includes('文档源码仓库'), false);
    assert.ok(existsSync(join(out, 'material-1/provenance.json')));
  });

  it('keeps crawled pages when the hints-only Python process fails', async () => {
    const html = htmlPage('<a href="https://github.com/acme/handbook/edit/main/docs/intro.md">Edit</a>');
    const { stderr, records, out } = await fromCrawl(html, 'https://docs.example.com/guide', { pythonPath: failHintsBin });
    assert.equal(stderr.includes(HINTS_FAIL_WARN), true);
    assert.equal(records[0].crawl.pageCount, 2);
    assert.ok(existsSync(join(out, 'material-1/pages')));
    assert.ok(existsSync(join(out, 'material-1/provenance.json')));
    assert.ok(existsSync(join(out, 'material-1/entry.html')));
    assert.equal(existsSync(join(out, 'material-1/original.html')), false);
    assert.equal(records[0].readableText, undefined);
  });

  it('does not call the crawler when navigation is too thin, and still prints the single-page hint', async () => {
    const links = Array.from({ length: 5 }, (_, index) => `<a href="/learn/page-${index}">${index}</a>`).join('');
    const html = `<!doctype html><html><body><nav>${links}</nav><p>${FILL}</p><a href="https://github.com/acme/handbook/edit/main/docs/intro.md">Edit</a></body></html>`;
    const { stderr, records, out, crawlerArgs } = await fromCrawl(html, 'https://example.com/learn');
    assert.equal(crawlerArgs, '');
    assert.equal(records[0].path, 'material-1/original.html');
    assert.equal(records[0].readableText, 'material-1/original.html.txt');
    assert.equal(records[0].crawl, undefined);
    assert.match(stderr, /--crawl/);
    assert.equal(stderr.includes(SINGLE_HINT('acme/handbook')), true);
    assert.equal(existsSync(join(out, 'material-1/pages')), false);
  });

  it('falls back to the single page when the crawler fails with no useful output', async () => {
    const source = 'https://docs.example.com/guide';
    const finalURL = 'https://docs.example.com/guide?utm=1';
    const html = htmlPage('<a href="https://github.com/acme/docs/blob/main/README.md">source</a>');
    const { stderr, records, out, html: original } = await fromCrawl(html, source, { finalURL, crawlerMode: 'fail' });
    assert.equal(records[0].path, 'material-1/original.html');
    assert.equal(records[0].fetchedURL, finalURL);
    assert.equal(records[0].readableText, 'material-1/original.html.txt');
    assert.equal(records[0].crawl, undefined);
    assert.deepEqual(readFileSync(join(out, records[0].path)), Buffer.from(original));
    assert.equal(stderr.includes(SINGLE_HINT('acme/docs')), true);
    assert.equal(stderr.includes('本次仍仅保存入口页'), true);
    assert.match(stderr, /已改为只保存入口页/);
    assert.equal(existsSync(join(out, 'material-1/pages')), false);
    assert.equal(existsSync(join(out, 'material-1/provenance.json')), false);
    assert.equal(existsSync(join(out, 'material-1/.crawl-tmp')), false);
    assert.equal(existsSync(join(out, 'material-1/entry.html')), false);
  });

  it('falls back to the single page when crawled text is too thin, keeping the entry bytes', async () => {
    const source = 'https://docs.example.com/guide';
    const html = htmlPage('<p>thin crawl</p>');
    const pages = [
      { file: 'guide.md', url: source, body: 'short\n' },
      { file: 'guide/a.md', url: `${source}/a`, body: 'also short\n' },
    ];
    const { records, out, html: original, stderr } = await fromCrawl(html, source, { pages });
    assert.equal(records[0].path, 'material-1/original.html');
    assert.deepEqual(readFileSync(join(out, 'material-1/original.html')), Buffer.from(original));
    assert.match(stderr, /已改为只保存入口页/);
    assert.equal(existsSync(join(out, 'material-1/pages')), false);
    assert.equal(existsSync(join(out, 'material-1/provenance.json')), false);
  });

  it('keeps a useful crawl after a non-zero crawler exit and prints the multi-page hint', async () => {
    const html = htmlPage('<a href="https://github.com/acme/handbook/edit/main/docs/intro.md">Edit</a>');
    const { stderr, records, out } = await fromCrawl(html, 'https://docs.example.com/guide', { crawlerMode: 'nonzero' });
    assert.equal(records[0].crawl.pageCount, 2);
    assert.ok(existsSync(join(out, 'material-1/pages')));
    assert.match(stderr, /爬虫退出异常/);
    assert.equal(stderr.includes(MULTI_HINT('acme/handbook')), true);
    assert.equal(stderr.includes('本次仍仅保存入口页'), false);
    assert.equal(stderr.includes(SINGLE_HINT('acme/handbook')), false);
  });

  it('prints only the multi-page hint in --github-hints-only mode and writes no extracted text', async () => {
    const dir = tempCrawl('hints-only-');
    const file = join(dir, 'entry.html');
    writeFileSync(file, htmlPage(
      '<a href="https://github.com/acme/handbook/edit/main/docs/intro.md">Edit</a>' +
      '<a href="https://github.com/acme/handbook/blob/main/docs/intro.md">Blob</a>',
    ));
    const { result, stderr } = await captureStderr(() => command(
      'python3',
      [extractor, file, '.html', 'https://docs.example.com/guide', '--github-hints-only'],
      { forwardStderr: true },
    ));
    assert.equal(result, '');
    assert.equal(existsSync(`${file}.txt`), false);
    assert.equal(stderr.trim(), MULTI_HINT('acme/handbook'));
  });
});
