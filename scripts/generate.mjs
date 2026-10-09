import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, basename, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { piPrint } from './pi.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export function generationPrompt(inputPath) {
  const input = JSON.parse(readFileSync(inputPath, 'utf8'));
  const output = resolve(root, input.output);
  if (!existsSync(join(output, 'school.config.ts'))) throw new Error('School must be scaffolded before generation.');
  const protocol = readFileSync(join(root, 'generation/protocol.md'), 'utf8');
  return `${protocol}\n\nRepository working directory: ${root}\nInput:\n${JSON.stringify(input, null, 2)}\nRead the sources and write the actual curriculum files now.`;
}

export function validateGeneration(inputPath) {
  const input = JSON.parse(readFileSync(inputPath, 'utf8'));
  const output = resolve(root, input.output);
  const lessons = readdirSync(join(output, 'src/content/lessons')).filter(n => /\.mdx?$/.test(n));
  if (!lessons.length || !existsSync(join(output, 'COURSE.md'))) throw new Error('Generation did not produce a complete route and lessons. Files are preserved for inspection.');
  for (const name of lessons) {
    const text = readFileSync(join(output, 'src/content/lessons', name), 'utf8');
    if (!text.startsWith('---\n') || !/agentInstructions:\s*\|/.test(text) || /\bTODO\b|Coming soon\./.test(text)) {
      throw new Error(`Incomplete lesson: ${name}. Generated files have been preserved.`);
    }
    if (/Use the bash tool|Pi is the only|Pi should teach|--mode rpc/.test(text.split('\n---')[0])) throw new Error(`Harness-specific teaching notes in ${name}; revise before using the School.`);
  }
  return lessons.length;
}

export async function generate(inputPath, { model } = {}) {
  const input = JSON.parse(readFileSync(inputPath, 'utf8'));
  const output = resolve(root, input.output);
  const summary = await piPrint(generationPrompt(inputPath), {
    model, cwd: root, tools: 'read,bash,write,edit',
    logPath: join(root, `evidence/generation/${basename(output)}.jsonl`),
    sessionDir: join(root, 'evidence/generation/sessions'),
    onTool: name => console.log(`生成中：${name}`)
  });
  const count = validateGeneration(inputPath);
  console.log(summary);
  return count;
}
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  if (!process.argv[2]) { console.error('Use: node scripts/generate.mjs INPUT.json (or npm run school -- create)'); process.exitCode = 1; }
  else generate(resolve(process.argv[2])).catch(error => { console.error(error.message); process.exitCode = 1; });
}
