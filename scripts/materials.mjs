import { cpSync, existsSync, mkdirSync, readFileSync, lstatSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { basename, extname, join, relative, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { choosePrefix, decideCrawl, ensureCrawler, runCrawl, writePages } from './site-crawl.mjs';
const extractor = fileURLToPath(new URL('./extract-material.py', import.meta.url));

export function command(executable, args, { cwd, inherit = false, rejectOnErrorLog = false, timeoutMs = 0, env, forwardStderr = false } = {}) {
  return new Promise((accept, reject) => {
    const child = spawn(executable, args, { cwd, env: env ? { ...process.env, ...env } : undefined, stdio: inherit && !rejectOnErrorLog ? 'inherit' : ['ignore', 'pipe', 'pipe'] });
    let stdout = '', stderr = '';
    const timer = timeoutMs ? setTimeout(() => { stderr += `\nTimed out after ${timeoutMs}ms`; child.kill('SIGTERM'); }, timeoutMs) : undefined;
    timer?.unref();
    child.once('close', () => clearTimeout(timer));
    child.stdout?.on('data', data => { stdout += data; if (inherit) process.stdout.write(data); });
    child.stderr?.on('data', data => { stderr += data; if (inherit || forwardStderr) process.stderr.write(data); });
    child.on('error', reject);
    child.on('close', code => code === 0 && !(rejectOnErrorLog && /\[ERROR\]/.test(stdout + stderr)) ? accept(stdout.trim()) : reject(new Error(`${executable} failed (${code}): ${stderr.trim() || (code === 0 ? 'Build output contains a rendering error; files were preserved.' : 'Command did not complete successfully; files were preserved.')}`)));
    const stop = () => child.kill('SIGINT'); process.once('SIGINT', stop);
    child.once('close', () => process.removeListener('SIGINT', stop));
  });
}
function safeURL(value) {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Only HTTP(S) sources are supported.');
  if (url.username || url.password) throw new Error('Do not put credentials in material URLs. Supply a local exported copy instead.');
  return url;
}
function readSample(file, max = 2_000_000) {
  const data = readFileSync(file);
  return data.subarray(0, Math.min(data.length, max)).toString('utf8');
}
function looksLikeHtml(file) {
  const sample = readFileSync(file).subarray(0, 512).toString('utf8').trim().toLowerCase();
  return sample.startsWith('<!doctype html') || sample.startsWith('<html') || sample.startsWith('<head');
}
async function saveSinglePage(download, extension, target, directory, value, finalURL) {
  const file = join(target, `original${extension}`);
  renameSync(download, file);
  const record = { path: relative(directory, file), url: value, fetchedURL: finalURL, retrieved: new Date().toISOString().slice(0, 10) };
  if (['.pdf', '.docx', '.html', '.htm'].includes(extension)) {
    const html = ['.html', '.htm'].includes(extension);
    const text = await command(
      'python3',
      [extractor, file, extension, ...(html ? [finalURL] : [])],
      { forwardStderr: html },
    );
    record.readableText = relative(directory, text);
    if (readFileSync(text, 'utf8').trim().length < 100) throw new Error('Source returned too little readable text. Provide another accessible source or an exported file.');
  }
  return record;
}
async function saveCrawledSite({ download, target, directory, value, finalURL, prefix, decision, maxPages, workers }) {
  const scope = prefix ? `只抓取 ${prefix} 下的页面` : '按 siteone-crawler 自己的同站链接跟随抓取';
  console.log(`判定为多页文档（${decision.detail}）。${scope}，最多 ${maxPages} 页。`);
  const crawler = await ensureCrawler({ run: command });
  const crawled = await runCrawl({
    run: command, executable: crawler.executable, url: finalURL, directory: target,
    prefix, maxPages, workers,
  });
  writePages(target, crawled.pages);
  rmSync(join(target, 'original.html'), { force: true });
  rmSync(join(target, 'original.html.txt'), { force: true });
  renameSync(download, join(target, 'entry.html'));
  const retrieved = new Date().toISOString().slice(0, 10);
  const provenance = {
    source: value, fetchedURL: finalURL, retrieved, tool: 'siteone-crawler', version: crawled.version,
    prefix, maxPages, workers, decision: decision.reason, detail: decision.detail,
    entryHtml: 'entry.html',
    pages: crawled.pages.map(({ file, url, chars }) => ({ file, url, chars })),
  };
  writeFileSync(join(target, 'provenance.json'), `${JSON.stringify(provenance, null, 2)}\n`);
  const record = {
    path: relative(directory, target), url: value, fetchedURL: finalURL, retrieved,
    version: `siteone-crawler ${crawled.version}`, provenance: relative(directory, join(target, 'provenance.json')),
    pages: relative(directory, join(target, 'pages')),
    crawl: {
      tool: 'siteone-crawler', version: crawled.version, prefix, maxPages, workers,
      pageCount: crawled.pages.length, decision: decision.reason,
    },
  };
  const where = prefix ? `前缀 ${prefix}` : '同站跟随';
  console.log(`已保存 ${crawled.pages.length} 个文档页面到 ${record.pages}（${where}，siteone-crawler ${crawled.version}，${retrieved}）。`);
  try {
    await command(
      'python3',
      [extractor, join(target, 'entry.html'), '.html', finalURL, '--github-hints-only'],
      { forwardStderr: true },
    );
  } catch {
    console.warn('警告：无法检查入口页的文档源码仓库链接；已保存的多页文档仍可使用。');
  }
  return record;
}
export async function prepareMaterials(sources, directory, { ref, crawl = 'auto', maxPages = 500, crawlPrefix: prefixOverride, crawlWorkers = 2, targetNames = null } = {}) {
  mkdirSync(directory, { recursive: true });
  const records = [];
  for (let i = 0; i < sources.length; i++) {
    const value = sources[i], target = join(directory, targetNames?.[i] || `material-${i + 1}`);
    if (/^https?:\/\//i.test(value)) {
      const url = safeURL(value);
      const repo = url.hostname === 'github.com' && url.pathname.match(/^\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/);
      if (repo) {
        const canonical = `https://github.com/${repo[1]}/${repo[2]}`;
        if (!existsSync(join(target, '.git'))) await command('git', ['clone', '--depth', '1', ...(ref ? ['--branch', ref] : []), canonical + '.git', target], { timeoutMs: 10 * 60 * 1000 });
        const commit = await command('git', ['rev-parse', 'HEAD'], { cwd: target });
        if (ref) {
          const expected = await command('git', ['rev-parse', ref], { cwd: target });
          if (expected !== commit) throw new Error('Saved repository does not match requested ref; use a new School name.');
        }
        records.push({ path: relative(directory, target), url: canonical, commit, version: ref || commit });
        continue;
      }
      let fetchURL = url.href;
      if (url.hostname === 'arxiv.org' && url.pathname.startsWith('/abs/')) fetchURL = `https://arxiv.org/pdf/${url.pathname.slice(5)}`;
      if (url.hostname === 'github.com' && url.pathname.includes('/blob/')) {
        fetchURL = 'https://raw.githubusercontent.com' + url.pathname.replace('/blob/', '/');
      }
      mkdirSync(target, { recursive: true });
      const download = join(target, 'download');
      const info = await command('curl', ['-fsSL', '--max-time', '120', '-o', download, '-w', '%{content_type}\n%{url_effective}', fetchURL]);
      const [type, finalURL] = info.split('\n');
      let extension = extname(new URL(finalURL).pathname).toLowerCase();
      const header = readFileSync(download).subarray(0, 5).toString();
      if (header === '%PDF-' || type?.includes('application/pdf')) extension = '.pdf';
      else if (type?.includes('html') || ['.html', '.htm', '.xhtml'].includes(extension) || (!extension && looksLikeHtml(download))) extension = '.html';
      else if (!extension || extension.length > 10) extension = '.txt';
      const htmlLike = extension === '.html';
      const mode = crawl === true ? 'force' : crawl === false ? 'off' : crawl;
      if (htmlLike && mode !== 'off') {
        const sample = readSample(download);
        const decision = decideCrawl({ href: finalURL, html: sample, override: mode === 'force' ? 'force' : 'auto' });
        const prefix = prefixOverride ? choosePrefix(value, finalURL, prefixOverride) : null;
        if (mode === 'force' || decision.crawl) {
          try {
            records.push(await saveCrawledSite({ download, target, directory, value, finalURL, prefix, decision, maxPages, workers: crawlWorkers }));
            continue;
          } catch (error) {
            console.warn(`警告：${error.message} 已改为只保存入口页。`);
            rmSync(join(target, '.crawl-tmp'), { recursive: true, force: true });
            rmSync(join(target, 'pages'), { recursive: true, force: true });
            rmSync(join(target, 'provenance.json'), { force: true });
            if (!existsSync(download) && existsSync(join(target, 'entry.html'))) renameSync(join(target, 'entry.html'), download);
          }
        } else if (decision.hint) console.warn(`提示：${decision.hint}`);
      } else if (!htmlLike && mode === 'force') console.warn('警告：该来源不是 HTML，无法整站抓取，已按单页保存。');
      records.push(await saveSinglePage(download, extension, target, directory, value, finalURL));
    } else {
      const path = resolve(value);
      if (!existsSync(path)) throw new Error(`Material is not a URL or accessible local path: ${value}`);
      if (lstatSync(path).isSymbolicLink()) throw new Error('Provide the actual material path rather than a symlink.');
      if (lstatSync(path).isDirectory()) {
        const ignored = new Set(['.git', 'node_modules', '.wrangler', '.astro', '.vite', 'dist', '__pycache__', '.pi', '.aws']);
        if (resolve(directory).startsWith(path + '/')) throw new Error('Output materials cannot be nested inside the supplied source directory. Choose a narrower source.');
        cpSync(path, target, { recursive: true, dereference: false, filter: p => {
          const name = basename(p);
          return !ignored.has(name) && !/^\.env(?:\.|$)/.test(name) && !lstatSync(p).isSymbolicLink();
        }});
        records.push({ path: relative(directory, target), originalPath: path, version: 'local working files' });
      } else {
        mkdirSync(target, { recursive: true });
        const file = join(target, basename(path)); cpSync(path, file);
        const record = { path: relative(directory, file), originalPath: path, version: 'local file' };
        if (['.pdf', '.docx', '.html', '.htm'].includes(extname(file).toLowerCase())) {
          record.readableText = relative(directory, await command('python3', [extractor, file]));
        }
        records.push(record);
      }
    }
  }
  return records;
}

export async function supplementMaterials(records, directory, { maxPages = 500, crawlPrefix, crawlWorkers = 2 } = {}) {
  const next = [];
  for (const record of records || []) {
    const folder = typeof record?.path === 'string' ? record.path.split('/')[0] : '';
    if (record?.commit || !/^material-\d+$/.test(folder) || !/^https?:\/\//i.test(record.url || '')) {
      next.push(record);
      continue;
    }
    const [saved] = await prepareMaterials([record.url], directory, {
      crawl: 'force', maxPages, crawlWorkers,
      ...(crawlPrefix ? { crawlPrefix } : {}),
      targetNames: [folder],
    });
    next.push(saved);
  }
  return next;
}
