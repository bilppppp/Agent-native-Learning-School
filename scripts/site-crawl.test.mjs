import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { chmodSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { command, prepareMaterials } from './materials.mjs';
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
