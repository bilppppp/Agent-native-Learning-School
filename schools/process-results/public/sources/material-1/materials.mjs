import { cpSync, existsSync, mkdirSync, readFileSync, lstatSync, renameSync } from 'node:fs';
import { basename, extname, join, relative, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const extractor = fileURLToPath(new URL('./extract-material.py', import.meta.url));

export function command(executable, args, { cwd, inherit = false, rejectOnErrorLog = false, timeoutMs = 0 } = {}) {
  return new Promise((accept, reject) => {
    const child = spawn(executable, args, { cwd, stdio: inherit && !rejectOnErrorLog ? 'inherit' : ['ignore', 'pipe', 'pipe'] });
    let stdout = '', stderr = '';
    const timer = timeoutMs ? setTimeout(() => { stderr += `\nTimed out after ${timeoutMs}ms`; child.kill('SIGTERM'); }, timeoutMs) : undefined;
    timer?.unref();
    child.once('close', () => clearTimeout(timer));
    child.stdout?.on('data', data => { stdout += data; if (inherit) process.stdout.write(data); });
    child.stderr?.on('data', data => { stderr += data; if (inherit) process.stderr.write(data); });
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
export async function prepareMaterials(sources, directory, { ref } = {}) {
  mkdirSync(directory, { recursive: true });
  const records = [];
  for (let i = 0; i < sources.length; i++) {
    const value = sources[i], target = join(directory, `material-${i + 1}`);
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
      else if (type?.includes('text/html')) extension = '.html';
      else if (!extension || extension.length > 10) extension = '.txt';
      const file = join(target, 'original' + extension); renameSync(download, file);
      const record = { path: relative(directory, file), url: value, fetchedURL: finalURL, retrieved: new Date().toISOString().slice(0, 10) };
      if (['.pdf', '.docx', '.html', '.htm'].includes(extension)) {
        const text = await command('python3', [extractor, file, extension]);
        record.readableText = relative(directory, text);
        if (readFileSync(text, 'utf8').trim().length < 100) throw new Error('Source returned too little readable text. Provide another accessible source or an exported file.');
      }
      records.push(record);
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
