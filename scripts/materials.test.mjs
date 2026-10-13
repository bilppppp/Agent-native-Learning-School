import { describe, it, before, after, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { prepareMaterials } from './materials.mjs';

const FILL = 'This paragraph exists so the HTTP HTML source has enough readable text after extraction. '.repeat(2);
const SHORT_ERROR = 'Source returned too little readable text. Provide another accessible source or an exported file.';
const originalPath = process.env.PATH;
const dirs = [];

function hint(ownerRepo) {
  const url = `https://github.com/${ownerRepo}`;
  return `提示：页面的编辑/源文件链接指向文档源码仓库 ${url}；如需多页文档，建议改用 --source ${url}。本次仍仅保存入口页。`;
}

function page(inner) {
  return `<!doctype html><html><body><p>${FILL}</p>${inner}</body></html>`;
}

function temp(prefix) {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  dirs.push(dir);
  return dir;
}

function writeBin(dir, name, body) {
  const file = join(dir, name);
  writeFileSync(file, body);
  chmodSync(file, 0o755);
  return file;
}

const bin = temp('materials-bin-');
const curlLog = join(bin, 'curl.log');
const gitLog = join(bin, 'git.log');
writeBin(bin, 'curl', `#!/usr/bin/env node
const { copyFileSync, appendFileSync } = require('fs');
const args = process.argv.slice(2);
copyFileSync(process.env.FAKE_CURL_FILE, args[args.indexOf('-o') + 1]);
if (process.env.FAKE_CURL_LOG) appendFileSync(process.env.FAKE_CURL_LOG, '1');
process.stdout.write((process.env.FAKE_CURL_TYPE || 'text/html') + '\\n' + process.env.FAKE_CURL_URL);
`);
writeBin(bin, 'git', `#!/usr/bin/env node
const { appendFileSync } = require('fs');
if (process.env.FAKE_GIT_LOG) appendFileSync(process.env.FAKE_GIT_LOG, '1');
process.stderr.write('git should not be called\\n');
process.exit(1);
`);
const failPythonBin = temp('materials-fail-python-');
writeBin(failPythonBin, 'curl', readFileSync(join(bin, 'curl')));
writeBin(failPythonBin, 'git', readFileSync(join(bin, 'git')));
writeBin(failPythonBin, 'python3', `#!/usr/bin/env node
process.stderr.write('simulated extract failure\\n');
process.exit(1);
`);

function resetLogs() {
  writeFileSync(curlLog, '');
  writeFileSync(gitLog, '');
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

async function fromHttp(html, source = 'https://docs.example.com/guide', extra = {}) {
  const { finalURL = 'https://docs.example.com/guide', contentType = 'text/html' } = extra;
  const body = join(temp('materials-body-'), 'page.html');
  writeFileSync(body, html);
  process.env.PATH = `${bin}:${originalPath}`;
  process.env.FAKE_CURL_FILE = body;
  process.env.FAKE_CURL_TYPE = contentType;
  process.env.FAKE_CURL_URL = finalURL;
  process.env.FAKE_CURL_LOG = curlLog;
  process.env.FAKE_GIT_LOG = gitLog;
  resetLogs();
  const out = temp('materials-out-');
  const { result: records, stderr } = await captureStderr(() => prepareMaterials([source], out));
  return {
    records,
    out,
    stderr,
    html,
    curlCalls: readFileSync(curlLog, 'utf8').length,
    gitCalls: readFileSync(gitLog, 'utf8').length,
  };
}

describe('prepareMaterials HTML GitHub hints', { concurrency: 1 }, () => {
  before(() => {
    process.env.PATH = `${bin}:${originalPath}`;
  });
  afterEach(() => {
    process.env.PATH = `${bin}:${originalPath}`;
  });
  after(() => {
    process.env.PATH = originalPath;
    delete process.env.FAKE_CURL_FILE;
    delete process.env.FAKE_CURL_TYPE;
    delete process.env.FAKE_CURL_URL;
    delete process.env.FAKE_CURL_LOG;
    delete process.env.FAKE_GIT_LOG;
    for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
  });

  it('emits exact hints for edit and blob links and keeps extracted text and stdout path', async () => {
    const html = page(
      '<p><a href="https://github.com/acme/handbook/edit/main/docs/intro.md">Edit this page</a></p>' +
      '<p><a href="https://github.com/octo/guide/blob/main/README.md">View source</a></p>',
    );
    const { records, out, stderr } = await fromHttp(html);
    assert.equal(stderr.trim(), [hint('acme/handbook'), hint('octo/guide')].join('\n'));
    assert.equal(records[0].readableText, 'material-1/original.html.txt');
    assert.equal(
      readFileSync(join(out, records[0].readableText), 'utf8'),
      `${FILL.trim()}\nEdit this page\nView source`,
    );
  });

  it('normalizes HTTP, HTTPS, protocol-relative, host case, query, fragment, and .git', async () => {
    const html = page([
      '<a href="http://github.com/Alpha/one/blob/main/a.md">a</a>',
      '<a href="https://github.com/Beta/two/blob/main/a.md">b</a>',
      '<a href="//github.com/Gamma/three/blob/main/a.md">c</a>',
      '<a href="https://GitHub.com/Delta/four/blob/main/a.md">d</a>',
      '<a href="https://github.com/Epsilon/five/blob/main/a.md?plain=1">e</a>',
      '<a href="https://github.com/Zeta/six/blob/main/a.md#L12">f</a>',
      '<a href="https://github.com/Eta/seven.git/blob/main/a.md">g</a>',
    ].join(''));
    const { stderr } = await fromHttp(html);
    assert.equal(stderr.trim(), [
      hint('alpha/one'),
      hint('beta/two'),
      hint('gamma/three'),
      hint('delta/four'),
      hint('epsilon/five'),
      hint('zeta/six'),
      hint('eta/seven'),
    ].join('\n'));
  });

  it('still hints a repo when the file path or query contains percent-encoding', async () => {
    const html = page(
      '<a href="https://github.com/acme/docs/blob/main/docs/getting%20started.md">encoded file</a>' +
      '<a href="https://github.com/acme/docs/blob/main/README.md?q=a%20b">encoded query</a>',
    );
    const { stderr } = await fromHttp(html);
    assert.equal(stderr.trim(), hint('acme/docs'));
  });

  it('hints repos whose names end with an underscore', async () => {
    const html = page('<a href="https://github.com/acme/docs_/blob/main/README.md">source</a>');
    const { stderr } = await fromHttp(html);
    assert.equal(stderr.trim(), hint('acme/docs_'));
  });

  it('lets HTMLParser handle attribute case, quotes, character references, and multiline tags', async () => {
    const html = page([
      '<A HREF="https://github.com/case/attr/blob/main/f.md">a</A>',
      "<a href='https://github.com/quote/single/blob/main/f.md'>b</a>",
      '<a href=https://github.com/quote/bare/blob/main/f.md>c</a>',
      '<a href="https://github.com/ch&#97;r/ref/blob/main/f.md">d</a>',
      `<a
 href="https://github.com/multi/line/blob/main/f.md">e</a>`,
    ].join(''));
    const { stderr } = await fromHttp(html);
    assert.equal(stderr.trim(), [
      hint('case/attr'),
      hint('quote/single'),
      hint('quote/bare'),
      hint('char/ref'),
      hint('multi/line'),
    ].join('\n'));
  });

  it('resolves relative hrefs against finalURL and does not treat site-root /owner/repo/blob paths as GitHub', async () => {
    const html = page(
      '<a href="/octocat/Hello-World/blob/master/README.md">looks like github</a>' +
      '<a href="https://github.com/acme/docs/blob/main/README.md">real</a>' +
      '<a href="../octocat/Hello-World/blob/master/README.md">relative</a>',
    );
    const { stderr } = await fromHttp(html, 'https://docs.example.com/guide/intro', {
      finalURL: 'https://docs.example.com/guide/intro',
    });
    assert.equal(stderr.trim(), hint('acme/docs'));
  });

  it('deduplicates the same repo across pages and case, and hints multiple repos in first-seen order', async () => {
    const html = page(
      '<a href="https://github.com/Acme/Docs/blob/main/a.md">a</a>' +
      '<a href="https://github.com/acme/docs/edit/main/b.md">b</a>' +
      '<a href="https://github.com/other/book/blob/main/c.md">c</a>' +
      '<a href="https://github.com/ACME/docs.git/blob/main/d.md?plain=1#L1">d</a>',
    );
    const { stderr } = await fromHttp(html);
    assert.equal(stderr.trim(), [hint('acme/docs'), hint('other/book')].join('\n'));
  });

  it('ignores homepages, issues, PRs, discussions, tree links, lookalike hosts, odd URLs, and missing file paths', async () => {
    const html = page([
      '<a href="https://github.com/acme">org</a>',
      '<a href="https://github.com/acme/docs">repo</a>',
      '<a href="https://github.com/acme/docs/issues/1">issue</a>',
      '<a href="https://github.com/acme/docs/pull/2">pr</a>',
      '<a href="https://github.com/acme/docs/discussions/3">discussion</a>',
      '<a href="https://github.com/acme/docs/tree/main">tree</a>',
      '<a href="https://github.com/acme/docs/releases">releases</a>',
      '<a href="https://github.com.evil.com/acme/docs/blob/main/f.md">evil</a>',
      '<a href="https://www.github.com/acme/docs/blob/main/f.md">www</a>',
      '<a href="https://gist.github.com/acme/docs/blob/main/f.md">gist</a>',
      '<a href="https://raw.githubusercontent.com/acme/docs/main/f.md">raw</a>',
      '<a href="https://github.example.com/acme/docs/blob/main/f.md">enterprise</a>',
      '<a href="ftp://github.com/acme/docs/blob/main/f.md">ftp</a>',
      '<a href="https://user:pass@github.com/acme/docs/blob/main/f.md">creds</a>',
      '<a href="https://github.com:8080/acme/docs/blob/main/f.md">port</a>',
      '<a href="https://github.com/acme/docs/blob/main">missing file</a>',
      '<a href="https://github.com/acme/docs/edit/main">missing edit file</a>',
      '<a href="https://github.com/ac%6de/docs/blob/main/f.md">percent</a>',
      '<a href="https://github.com/acme/docs/blob/../main/f.md">dotdot</a>',
    ].join(''));
    const { records, stderr } = await fromHttp(html);
    assert.equal(stderr.trim(), '');
    assert.equal(records.length, 1);
    assert.equal(records[0].path, 'material-1/original.html');
  });

  it('ignores comments, scripts, skipped regions, bare URLs, and data-href', async () => {
    const html = page([
      `<p>bare https://github.com/bare/url/blob/main/f.md in text</p>`,
      '<!-- <a href="https://github.com/comment/ed/blob/main/f.md">x</a> -->',
      '<script><a href="https://github.com/in/script/blob/main/f.md">x</a></script>',
      '<style><a href="https://github.com/in/style/blob/main/f.md">x</a></style>',
      '<noscript><a href="https://github.com/in/noscript/blob/main/f.md">x</a></noscript>',
      '<svg><a href="https://github.com/in/svg/blob/main/f.md">x</a></svg>',
      '<a data-href="https://github.com/data/href/blob/main/f.md">x</a>',
    ].join(''));
    const { stderr } = await fromHttp(html);
    assert.equal(stderr.trim(), '');
  });

  it('calls fake curl once and git never after an HTTP HTML hit, keeping original bytes and record fields', async () => {
    const source = 'https://docs.example.com/guide';
    const finalURL = 'https://docs.example.com/guide?utm=1';
    const html = page('<a href="https://github.com/acme/docs/blob/main/README.md">source</a>');
    const { records, out, html: original, curlCalls, gitCalls } = await fromHttp(html, source, { finalURL });
    assert.equal(curlCalls, 1);
    assert.equal(gitCalls, 0);
    assert.deepEqual(readFileSync(join(out, records[0].path)), Buffer.from(original));
    assert.deepEqual(records[0], {
      path: 'material-1/original.html',
      url: source,
      fetchedURL: finalURL,
      retrieved: new Date().toISOString().slice(0, 10),
      readableText: 'material-1/original.html.txt',
    });
  });

  it('still finishes with no or bad links, and does not hint for local HTML or plain text', async () => {
    const none = await fromHttp(page('<p>No repository links here.</p>'));
    assert.equal(none.stderr.trim(), '');
    assert.equal(none.records[0].readableText, 'material-1/original.html.txt');

    const bad = await fromHttp(page('<a href="not-a-url">x</a><a href="https://github.com/acme/docs/blob">short</a>'));
    assert.equal(bad.stderr.trim(), '');
    assert.equal(bad.records.length, 1);

    const localDir = temp('materials-local-');
    const localHtml = join(localDir, 'notes.html');
    writeFileSync(localHtml, page('<a href="https://github.com/local/html/blob/main/f.md">source</a>'));
    const localOut = temp('materials-local-out-');
    resetLogs();
    const local = await captureStderr(() => prepareMaterials([localHtml], localOut));
    assert.equal(local.stderr.trim(), '');
    assert.equal(local.result[0].originalPath, localHtml);
    assert.equal(readFileSync(curlLog, 'utf8').length, 0);
    assert.equal(readFileSync(gitLog, 'utf8').length, 0);

    const localTxt = join(localDir, 'notes.txt');
    writeFileSync(localTxt, `${FILL}\nhttps://github.com/local/text/blob/main/f.md\n`);
    const textOut = temp('materials-text-out-');
    const text = await captureStderr(() => prepareMaterials([localTxt], textOut));
    assert.equal(text.stderr.trim(), '');
    assert.equal(text.result[0].path, 'material-1/notes.txt');
    assert.equal(text.result[0].readableText, undefined);
  });

  it('keeps original and derived text when readable text is short, and keeps original if extraction fails', async () => {
    const shortHtml = '<p>Hi</p><a href="https://github.com/acme/docs/blob/main/x.md">x</a>';
    const shortBody = join(temp('materials-short-'), 'page.html');
    writeFileSync(shortBody, shortHtml);
    process.env.FAKE_CURL_FILE = shortBody;
    process.env.FAKE_CURL_TYPE = 'text/html';
    process.env.FAKE_CURL_URL = 'https://docs.example.com/short';
    resetLogs();
    const shortOut = temp('materials-short-out-');
    let shortErr;
    try {
      await captureStderr(() => prepareMaterials(['https://docs.example.com/short'], shortOut));
    } catch (error) {
      shortErr = error;
    }
    assert.equal(shortErr.message, SHORT_ERROR);
    assert.equal(shortErr.stderr.trim(), hint('acme/docs'));
    assert.deepEqual(readFileSync(join(shortOut, 'material-1/original.html')), Buffer.from(shortHtml));
    assert.ok(existsSync(join(shortOut, 'material-1/original.html.txt')));

    const failBody = join(temp('materials-fail-'), 'page.html');
    writeFileSync(failBody, page('<a href="https://github.com/acme/docs/blob/main/f.md">x</a>'));
    process.env.PATH = `${failPythonBin}:${originalPath}`;
    process.env.FAKE_CURL_FILE = failBody;
    process.env.FAKE_CURL_TYPE = 'text/html';
    process.env.FAKE_CURL_URL = 'https://docs.example.com/fail';
    process.env.FAKE_CURL_LOG = curlLog;
    process.env.FAKE_GIT_LOG = gitLog;
    resetLogs();
    const failOut = temp('materials-fail-out-');
    await assert.rejects(
      () => prepareMaterials(['https://docs.example.com/fail'], failOut),
      /python3 failed/,
    );
    assert.deepEqual(readFileSync(join(failOut, 'material-1/original.html')), Buffer.from(readFileSync(failBody)));
    assert.equal(existsSync(join(failOut, 'material-1/original.html.txt')), false);
  });
});
