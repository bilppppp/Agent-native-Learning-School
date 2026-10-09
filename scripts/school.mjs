#!/usr/bin/env node
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname, join, relative, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline/promises';
import { spawn } from 'node:child_process';
import { command, prepareMaterials } from './materials.mjs';
import { piPrint, defaultModel } from './pi.mjs';
import { generate } from './generate.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const originalCwd = process.cwd();
const args = process.argv.slice(2);
const operation = args.shift();
const options = {}, positionals = [];
const allowed = new Set(['source', 'goal', 'name', 'depth', 'background', 'style', 'mode', 'language', 'model', 'port', 'ref', 'student', 'lesson', 'help']);
function parse() {
  while (args.length) {
    const arg = args.shift();
    if (!arg.startsWith('--')) { positionals.push(arg); continue; }
    const [key, inline] = arg.slice(2).split(/=(.*)/s);
    if (!allowed.has(key)) throw new Error(`Unknown option --${key}. Use --help.`);
    if (key === 'help') { options.help = true; continue; }
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
  可多次 --source；默认深度系统、基础未知并按需补充、教学simple、语言zh。
  不带描述/参数时，只询问来源和目标。

运行与学习：
  npm run school -- list
  npm run school -- start NAME [--port 4323]
  npm run school -- teach NAME --student STUDENT_ID [--mode immersive] [--lesson SLUG]
  npm run school -- build NAME
  npm run school -- retry NAME       # 检查保留文件后重新生成；可能修改课程，不重置进度
  npm run school -- setup            # 安装模板依赖；PDF提取还需要pypdf

网页可选择教学模式、复制Pi启动Prompt。课程和进度属于School；Pi接入独立于课程。
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
  spec.materials = await prepareMaterials(sources, join(output, 'materials'), { ref: options.ref });
  writeFileSync(inputPath, JSON.stringify(spec, null, 2) + '\n');
  writeFileSync(join(output, 'school.settings.json'), JSON.stringify(spec, null, 2) + '\n');
  await command('python3', ['scripts/apply-school-kit.py', spec.output], { inherit: true });
  const count = await generate(inputPath, { model: options.model });
  await command('npm', ['run', 'build'], { cwd: output, inherit: true, rejectOnErrorLog: true });
  console.log(`\nSchool 已生成并构建：${name}（${count} 关）。\n启动：npm run school -- start ${name}\n网页：http://localhost:${spec.port}\n课程可在该目录编辑；真实教学尚未进行。`);
}
async function main() {
  parse();
  if (!operation || options.help || ['help', '--help', '-h'].includes(operation)) { help(); return; }
  if (!['setup', 'create', 'list', 'start', 'build', 'retry', 'teach'].includes(operation)) throw new Error(`Unknown command ${operation}. Use --help.`);
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
    await command('npm', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', String(chosen)], { cwd: path, inherit: true });
  } else if (operation === 'build') {
    await command('npm', ['run', 'build'], { cwd: path, inherit: true, rejectOnErrorLog: true });
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
      spec.materials = await prepareMaterials(spec.sources, join(path, 'materials'), { ref: spec.ref });
      writeFileSync(inputPath, JSON.stringify(spec, null, 2) + '\n');
      writeFileSync(join(path, 'school.settings.json'), JSON.stringify(spec, null, 2) + '\n');
    }
    await command('python3', ['scripts/apply-school-kit.py', relative(root, path)], { inherit: true });
    await generate(inputPath, { model: options.model });
    await command('npm', ['run', 'build'], { cwd: path, inherit: true, rejectOnErrorLog: true });
  } else if (operation === 'teach') {
    const student = options.student || await ask('网页显示的学习身份：');
    if (!/^[a-z]+-[a-z]+-\d{4}$/.test(student)) throw new Error('Invalid student ID. Copy the identity from the website.');
    const origin = `http://localhost:${port(options.port || s.port)}`;
    let progress;
    try { const r = await fetch(`${origin}/api/progress/${student}`); if (!r.ok) throw new Error(`HTTP ${r.status}`); progress = await r.json(); }
    catch (error) { throw new Error(`Cannot access this student: ${error.message}. Start the School and enroll on its website first.`); }
    if (options.mode) {
      const response = await fetch(`${origin}/api/profile/${student}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ teachingMode: mode(options.mode) }) });
      if (!response.ok) throw new Error(`Could not save teaching mode: HTTP ${response.status}`);
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
