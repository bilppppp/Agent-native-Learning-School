#!/usr/bin/env node
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname, join, relative, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline/promises';
import { spawn } from 'node:child_process';
import { command, prepareMaterials, supplementMaterials } from './materials.mjs';
import { piPrint, defaultModel } from './pi.mjs';
import { generate, generationPrompt, validateGeneration } from './generate.mjs';
import { resolveTeachOrigin, teachAccessError, teachModeWriteError } from './teach-origin.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const originalCwd = process.cwd();
const args = process.argv.slice(2);
const operation = args.shift();
const options = {}, positionals = [];
const allowed = new Set(['source', 'goal', 'name', 'depth', 'background', 'style', 'mode', 'language', 'model', 'port', 'origin', 'ref', 'student', 'lesson', 'help', 'prepare-only', 'prompt-only', 'crawl', 'no-crawl', 'max-pages', 'crawl-prefix', 'crawl-workers']);
function parse() {
  while (args.length) {
    const arg = args.shift();
    if (!arg.startsWith('--')) { positionals.push(arg); continue; }
    const [key, inline] = arg.slice(2).split(/=(.*)/s);
    if (!allowed.has(key)) throw new Error(`Unknown option --${key}. Use --help.`);
    if (['help', 'prepare-only', 'prompt-only', 'crawl', 'no-crawl'].includes(key)) {
      if (inline !== undefined) throw new Error(`--${key} does not take a value.`);
      options[key] = true; continue;
    }
    const value = inline ?? args.shift();
    if (!value || value.startsWith('--')) throw new Error(`--${key} needs a value.`);
    if (key === 'source') (options.source ||= []).push(value); else options[key] = value;
  }
}
function help() {
  console.log(`Agent-native Learning School

创建（自然语言，未提供的信息使用合理默认值）：
  npm run school -- create "学习 https://github.com/sindresorhus/p-limit，理解异步并发限制，深入源码，教学先用简单模式"
创建（明确参数，无需模型解析请求）：
  npm run school -- create --source URL_OR_PATH --goal "学习目标" --depth "入门/系统/深入或自由描述" --mode simple
  可选：--name NAME --background "已有基础" --style "偏好" --language zh --model PROVIDER/MODEL --ref TAG
  --prepare-only：不调用 Pi，准备材料和 GENERATION.md，交由当前 Coding Agent 生成，再运行 finish NAME。
  可多次 --source；默认深度系统、基础未知并按需补充、教学simple、语言zh。
  多页文档会自动判断。默认按 siteone-crawler 自己的同站链接跟随抓取，最多 500 页；--crawl-prefix /docs/latest 才把范围限制在该路径。
  --crawl 强制抓取；--no-crawl 只保存入口页。--max-pages N（1–10000）--crawl-workers N（1–8）
  npm run school -- supplement NAME：材料不够时，用同样的同站跟随补齐已保存的 HTTP HTML 来源。
  未安装 siteone-crawler v2.5.1+ 时自动下载到 tools/cache（不入库）。下载或抓取失败则退回单页。
  不带描述/参数时，只询问来源和目标。

运行与学习：
  npm run school -- list
  npm run school -- start NAME [--port 4323]
  npm run school -- teach NAME --student STUDENT_ID [--mode immersive] [--lesson SLUG] [--origin https://school.example.com]
  --origin 指定学校公开地址，进度预检、模式写入和提示词都用它；不能与 --port 同时使用。没传时仍用本机端口。
  添加 --prompt-only 输出通用教师提示词，不启动 Pi。
  npm run school -- finish NAME      # 检查 Agent 生成的课程并构建，不调用 Pi
  npm run school -- build NAME
  npm run school -- retry NAME       # 检查保留文件后重新生成；可能修改课程，不重置进度
  npm run school -- setup            # 安装模板依赖；PDF提取还需要pypdf

网页可选择教学模式、复制通用教师启动Prompt。teach 默认启动 Pi。课程和进度属于School；Pi接入独立于课程。
失败时返回错误，保留材料和可审查文件，不宣称生成或教学成功。`);
}
async function ask(label) {
  if (!process.stdin.isTTY) throw new Error(`${label} Provide --source/--goal, or use an interactive terminal.`);
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try { return (await rl.question(label)).trim(); } finally { rl.close(); }
}
const modes = { simple: 'simple', '简单': 'simple', immersive: 'immersive', '沉浸': 'immersive' };
const depths = { '入门': 'introductory', '系统': 'systematic', '深入': 'deep' };
function mode(value = 'simple') {
  if (!modes[value]) throw new Error('教学模式须为 simple/immersive（简单/沉浸）。深度可用自由文本。');
  return modes[value];
}
function schoolPath(name) {
  if (!name || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(name)) throw new Error('School name must be a lowercase directory name (letters, numbers, hyphens).');
  const path = join(root, 'schools', name);
  if (!existsSync(join(path, 'school.settings.json'))) throw new Error(`Unknown School ${name}. Run list.`);
  return path;
}
function settings(path) { return JSON.parse(readFileSync(join(path, 'school.settings.json'), 'utf8')); }
function pickPort() {
  const used = new Set([4321, 4322]);
  if (existsSync(join(root, 'schools'))) for (const name of readdirSync(join(root, 'schools'))) {
    try { used.add(settings(join(root, 'schools', name)).port); } catch {}
  }
  let port = 4323; while (used.has(port)) port++; return port;
}
function port(value) { const n = Number(value); if (!Number.isInteger(n) || n < 1024 || n > 65535) throw new Error('Port must be an integer from 1024 to 65535.'); return n; }
function boundedInt(value, name, min, max, fallback) {
  if (value === undefined) return fallback;
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) throw new Error(`${name} must be an integer from ${min} to ${max}.`);
  return n;
}
function crawlPrefixOption(value) {
  if (!value) return undefined;
  if (!value.startsWith('/') || value.includes('..') || /[\s?#]/.test(value)) throw new Error('--crawl-prefix must be an absolute path such as /docs/latest.');
  return value.length > 1 && value.endsWith('/') ? value.slice(0, -1) : value;
}
function crawlOptions() {
  if (options.crawl && options['no-crawl']) throw new Error('--crawl and --no-crawl cannot be used together.');
  if (options['no-crawl'] && options['crawl-prefix']) throw new Error('--crawl-prefix cannot be used with --no-crawl.');
  return {
    crawl: options.crawl || options['crawl-prefix'] ? 'force' : options['no-crawl'] ? 'off' : 'auto',
    maxPages: boundedInt(options['max-pages'], '--max-pages', 1, 10000, 500),
    crawlWorkers: boundedInt(options['crawl-workers'], '--crawl-workers', 1, 8, 2),
    ...(options['crawl-prefix'] ? { crawlPrefix: crawlPrefixOption(options['crawl-prefix']) } : {}),
  };
}
async function intake(description) {
  console.log('正在理解学习请求…');
  const text = await piPrint(`Extract a School creation request from the user description. Return ONLY a JSON object with sources (array of actual public HTTP URLs or EXACT local paths supplied by the user), goal, name, slug (lowercase English directory name), depth (free text), background, learningStyle, teachingMode (simple or immersive), language. Preserve all depth/goal/background nuances. Default systematic depth, unknown background, simple teaching, Chinese language. Never fabricate a local path. For an unmistakably named well-known public work/repo you may give its canonical URL as a candidate; acquisition will verify it. For ambiguous or unknown sources use an empty sources array. Do not generate a curriculum. User request:\n${description}`, { model: options.model, thinking: 'medium' });
  const candidate = text.replace(/^```(?:json)?\s*|\s*```$/g, '').trim();
  let result; try { result = JSON.parse(candidate); } catch { throw new Error('Request interpretation did not return valid JSON. Use --source and --goal to avoid this step.'); }
  if (!Array.isArray(result.sources) || result.sources.some(s => typeof s !== 'string')) throw new Error('Cannot identify materials. Supply --source URL_OR_PATH.');
  return result;
}
async function setup() {
  if (!existsSync(join(root, 'upstream/school-template/package.json'))) {
    const target = join(root, 'upstream/school-template');
    if (existsSync(target)) throw new Error('Template directory is incomplete. Restore or move it aside before setup; existing files were not overwritten.');
    mkdirSync(dirname(target), { recursive: true });
    console.log('获取已验证的 School Template 版本…');
    await command('git', ['clone', '--depth', '1', 'https://github.com/agentschools/school-template.git', target]);
    const ref = 'f5a1682f111e4992a2e9cb0e194d0f1c747f5d63';
    await command('git', ['fetch', '--depth', '1', 'origin', ref], { cwd: target });
    await command('git', ['checkout', '--detach', ref], { cwd: target });
  }
  if (!existsSync(join(root, 'upstream/school-template/node_modules/astro'))) {
    console.log('安装已有模板工具链…');
    await command('npm', ['ci'], { cwd: join(root, 'upstream/school-template'), inherit: true });
  }
}
async function create() {
  const description = positionals.join(' ');
  const limits = crawlOptions();
  if (options['prepare-only'] && !(options.source?.length && options.goal)) throw new Error('--prepare-only requires --source and --goal. Let your Coding Agent map the request to these parameters; no Pi request parser is used.');
  const interpreted = description && !(options.source?.length && options.goal) ? await intake(description) : {};
  let sources = options.source || interpreted.sources;
  if (!sources?.length) sources = [await ask('学习来源（URL 或本地路径）：')];
  const goal = options.goal || interpreted.goal || await ask('Learning Goal：');
  if (!goal.trim() || sources.some(s => !s.trim())) throw new Error('来源和学习目标不能为空。');
  sources = sources.map(s => /^https?:\/\//i.test(s) ? s : resolve(originalCwd, s));
  for (const source of sources) if (!/^https?:\/\//i.test(source) && !existsSync(source)) throw new Error(`Material is not an accessible local path: ${source}`);
  const proposed = options.name || interpreted.slug || basename(sources[0]).replace(/\.git$/, '') + '-school';
  const name = proposed.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 64) || `school-${Date.now()}`;
  const output = join(root, 'schools', name);
  if (existsSync(output)) throw new Error(`${name} already exists. Choose --name or use retry; existing courses and progress were not changed.`);
  const spec = {
    name: options.name || interpreted.name || `${name} School`, goal,
    depth: depths[options.depth] || options.depth || interpreted.depth || 'systematic',
    background: options.background || interpreted.background || 'Unknown; introduce necessary prerequisites in place.',
    learningStyle: options.style || interpreted.learningStyle || 'Concrete examples with explanations and appropriate practice.',
    teachingMode: mode(options.mode || interpreted.teachingMode || 'simple'),
    language: options.language || interpreted.language || 'zh',
    port: port(options.port || pickPort()),
    request: description || goal, sources, ref: options.ref,
    ...limits,
    output: relative(root, output), sourceRoot: relative(root, join(output, 'materials'))
  };
  await setup();
  process.chdir(root);
  const inputPath = join(root, 'inputs', `${name}.json`);
  mkdirSync(dirname(inputPath), { recursive: true });
  writeFileSync(inputPath, JSON.stringify(spec, null, 2) + '\n');
  await command('python3', ['scripts/scaffold.py', relative(root, inputPath)], { inherit: true });
  writeFileSync(join(output, 'school.settings.json'), JSON.stringify(spec, null, 2) + '\n');
  const configPath = join(output, 'school.config.ts');
  let config = readFileSync(configPath, 'utf8');
  config = config.replace(/name: "My School"/, `name: ${JSON.stringify(spec.name)}`).replace(/description: "An interactive course about your subject\."/, `description: ${JSON.stringify(goal)}`);
  writeFileSync(configPath, config);
  console.log(`准备材料；课程深度：${spec.depth}；初始教学模式：${spec.teachingMode}`);
  spec.materials = await prepareMaterials(sources, join(output, 'materials'), { ref: options.ref, crawl: spec.crawl, maxPages: spec.maxPages, crawlPrefix: spec.crawlPrefix, crawlWorkers: spec.crawlWorkers });
  writeFileSync(inputPath, JSON.stringify(spec, null, 2) + '\n');
  writeFileSync(join(output, 'school.settings.json'), JSON.stringify(spec, null, 2) + '\n');
  await command('python3', ['scripts/apply-school-kit.py', spec.output], { inherit: true });
  if (options['prepare-only']) {
    const promptPath = join(output, 'GENERATION.md');
    writeFileSync(promptPath, generationPrompt(inputPath) + '\n');
    console.log(`\n材料和网站骨架已准备，尚未生成课程。当前 Coding Agent 请阅读 ${relative(root, promptPath)}，按该指令生成课程，然后运行：npm run school -- finish ${name}。此路径未调用 Pi。`);
    return;
  }
  const count = await generate(inputPath, { model: options.model });
  await command('npm', ['run', 'build'], { cwd: output, inherit: true, rejectOnErrorLog: true });
  console.log(`\nSchool 已生成并构建：${name}（${count} 关）。\n启动：npm run school -- start ${name}\n网页：http://localhost:${spec.port}\n课程可在该目录编辑；真实教学尚未进行。`);
}
async function main() {
  parse();
  if (!operation || options.help || ['help', '--help', '-h'].includes(operation)) { help(); return; }
  if (options['prepare-only'] && operation !== 'create') throw new Error('--prepare-only is only valid with create.');
  if (options['prompt-only'] && operation !== 'teach') throw new Error('--prompt-only is only valid with teach.');
  if (!['setup', 'create', 'list', 'start', 'build', 'retry', 'teach', 'finish', 'supplement'].includes(operation)) throw new Error(`Unknown command ${operation}. Use --help.`);
  if (operation === 'setup') { await setup(); return; }
  if (operation === 'create') { await create(); return; }
  process.chdir(root);
  if (operation === 'list') {
    for (const name of readdirSync('schools')) {
      try {
        const p = join(root, 'schools', name), s = settings(p);
        const state = existsSync(join(p, 'COURSE.md')) ? '课程已生成' : '尚未完成';
        console.log(`${name}\t${s.name}\t${s.depth}\t${state}\thttp://localhost:${s.port}`);
      } catch {}
    }
    return;
  }
  const path = schoolPath(positionals[0]);
  const s = settings(path);
  if (operation === 'start') {
    const chosen = port(options.port || s.port);
    console.log(`打开 http://localhost:${chosen}；Ctrl+C 停止。`);
    await command('npm', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', String(chosen)], { cwd: path, inherit: true, env: { DEPLOY_TARGET: 'dev' } });
  } else if (operation === 'build') {
    await command('npm', ['run', 'build'], { cwd: path, inherit: true, rejectOnErrorLog: true });
  } else if (operation === 'finish') {
    const count = validateGeneration(join(root, 'inputs', basename(path) + '.json'));
    await command('npm', ['run', 'build'], { cwd: path, inherit: true, rejectOnErrorLog: true });
    console.log(`School 已检查并构建：${basename(path)}（${count} 关）。启动：npm run school -- start ${basename(path)}。真实教学尚未验证。`);
  } else if (operation === 'supplement') {
    if (options['no-crawl']) throw new Error('--no-crawl cannot be used with supplement.');
    const opts = crawlOptions();
    s.materials = await supplementMaterials(s.materials, join(path, 'materials'), {
      maxPages: options['max-pages'] ? opts.maxPages : s.maxPages || 500,
      crawlWorkers: options['crawl-workers'] ? opts.crawlWorkers : s.crawlWorkers || 2,
      ...(options['crawl-prefix'] ? { crawlPrefix: opts.crawlPrefix } : {}),
    });
    writeFileSync(join(path, 'school.settings.json'), JSON.stringify(s, null, 2) + '\n');
    const inputPath = join(root, 'inputs', `${basename(path)}.json`);
    if (existsSync(inputPath)) {
      const input = JSON.parse(readFileSync(inputPath, 'utf8'));
      input.materials = s.materials;
      writeFileSync(inputPath, JSON.stringify(input, null, 2) + '\n');
    }
    const counts = (s.materials || []).map(item => item.crawl?.pageCount).filter(count => Number.isInteger(count));
    console.log(`已用 siteone-crawler 的同站跟随补齐 ${basename(path)}。${counts.length ? `抓取页数：${counts.join('、')}。` : ''}`);
  } else if (operation === 'retry') {
    const inputPath = join(root, 'inputs', basename(path) + '.json');
    if (!existsSync(inputPath)) throw new Error('No saved creation input. Existing School was not modified.');
    const spec = JSON.parse(readFileSync(inputPath, 'utf8'));
    for (const material of spec.materials || []) {
      for (const item of [material.path, material.readableText].filter(Boolean)) {
        if (!existsSync(resolve(root, spec.sourceRoot, item))) throw new Error(`Saved material missing: ${item}. Restore it or create a new School.`);
      }
      if (material.commit) {
        const actual = await command('git', ['rev-parse', 'HEAD'], { cwd: resolve(root, spec.sourceRoot, material.path) });
        if (actual !== material.commit) throw new Error('Saved source version changed; create a new School rather than mislabeling provenance.');
      }
    }
    if (!spec.materials?.length) {
      if (!spec.sources?.length) throw new Error('No saved material request. Existing files remain for inspection.');
      spec.materials = await prepareMaterials(spec.sources, join(path, 'materials'), { ref: spec.ref, crawl: spec.crawl || 'auto', maxPages: spec.maxPages || 500, crawlPrefix: spec.crawlPrefix, crawlWorkers: spec.crawlWorkers || 2 });
      writeFileSync(inputPath, JSON.stringify(spec, null, 2) + '\n');
      writeFileSync(join(path, 'school.settings.json'), JSON.stringify(spec, null, 2) + '\n');
    }
    await command('python3', ['scripts/apply-school-kit.py', relative(root, path)], { inherit: true });
    await generate(inputPath, { model: options.model });
    await command('npm', ['run', 'build'], { cwd: path, inherit: true, rejectOnErrorLog: true });
  } else if (operation === 'teach') {
    const student = options.student || await ask('网页显示的学习身份：');
    if (!/^[a-z]+-[a-z]+-\d{4}$/.test(student)) throw new Error('Invalid student ID. Copy the identity from the website.');
    const origin = resolveTeachOrigin(options, s, port);
    let progress;
    try {
      const response = await fetch(`${origin}/api/progress/${student}`);
      if (!response.ok) throw teachAccessError({ origin, student, status: response.status });
      progress = await response.json();
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Cannot access this student at ')) throw error;
      throw teachAccessError({ origin, student, cause: error });
    }
    if (options.mode) {
      try {
        const response = await fetch(`${origin}/api/profile/${student}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ teachingMode: mode(options.mode) }) });
        if (!response.ok) throw teachModeWriteError({ origin, student, status: response.status });
      } catch (error) {
        if (error instanceof Error && error.message.startsWith('Could not save teaching mode at ')) throw error;
        throw teachModeWriteError({ origin, student, cause: error });
      }
    }
    if (options['prompt-only']) {
      console.log(`我是 ${s.name} 的学生，ID 是 ${student}。请读取 ${origin}/llms.txt 和 ${origin}/api/openapi.json，然后按服务器进度${options.lesson ? `学习 ${options.lesson}` : '继续课程'}。使用你当前的 HTTP/终端工具读取课程和来源，在实际活动完成后通过进度 API 上报并确认成功。不要重新生成课程。`);
      return;
    }
    const model = options.model || defaultModel();
    const prompt = `我是 ${s.name} 的学生，ID 是 ${student}。请读取 ${origin}/harness/pi.txt，然后按服务器进度${options.lesson ? `学习 ${options.lesson}` : '继续课程'}。不要重新生成课程。`;
    await new Promise((accept, reject) => {
      const child = spawn('pi', ['--model', model, '--no-extensions', '--no-mcp', '--no-skills', '--no-prompt-templates', '--no-context-files', '--tools', 'read,bash',
        '--system-prompt', `You are a teacher. Your configured model is ${model}. Read the School harness instructions and shared teaching policy.`, prompt], { stdio: 'inherit', cwd: path });
      child.on('error', reject); child.on('close', code => code === 0 ? accept() : reject(new Error(`Pi exited ${code}`)));
    });
  } else throw new Error(`Unknown command ${operation}. Use --help.`);
}
main().catch(error => { console.error(`\n未完成：${error.message}`); process.exitCode = 1; });
