// Minimal terminal bridge to the installed Pi RPC harness. No teaching logic or answers.
import { spawn } from 'node:child_process';
import { mkdirSync, createWriteStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { resolve } from 'node:path';

const [school, port, studentId] = process.argv.slice(2);
if (!school || !port || !studentId) throw new Error('Usage: node scripts/pi-dialogue.mjs SCHOOL PORT STUDENT_ID');
mkdirSync('evidence/teaching', { recursive: true });
const transcript = createWriteStream(`evidence/teaching/${school}.md`, { flags: 'a' });
const events = createWriteStream(`evidence/teaching/${school}.jsonl`, { flags: 'a' });
const model = process.env.SCHOOL_MODEL || 'openai-codex/gpt-6.1-sol';
let child, busy = false, pending = '', turn = 0;

function launch() {
  pending = ''; busy = false;
  child = spawn('pi', ['--model', model, '--thinking', 'medium', '--mode', 'rpc',
    '--no-extensions', '--no-mcp', '--no-skills', '--no-prompt-templates', '--no-context-files',
    '--tools', 'read,bash', '--session-dir', resolve('evidence/teaching/sessions'),
    '--system-prompt', `You are Pi, the conversational teacher for this School. Your actual configured model ID is ${model}. Fetch its llms.txt and follow the teaching notes. Teach one small question at a time and wait for the learner. Use bash/curl to access sources and report progress only after a real activity. You have no built-in webfetch.`,],
    { stdio: ['pipe', 'pipe', 'pipe'] });
  child.stderr.on('data', data => process.stderr.write(data));
  child.stdout.on('data', chunk => {
    pending += chunk;
    let i;
    while ((i = pending.indexOf('\n')) >= 0) {
      const line = pending.slice(0, i); pending = pending.slice(i + 1);
      try {
        const event = JSON.parse(line);
        if (['message_end', 'tool_execution_start', 'tool_execution_end', 'agent_settled', 'response', 'auto_retry_start', 'auto_retry_end'].includes(event.type)) events.write(line + '\n');
        if (event.type === 'message_end' && event.message?.role === 'assistant') {
          const text = (event.message.content || []).filter(c => c.type === 'text').map(c => c.text).join('\n');
          if (text) { console.log(`\nPi: ${text}\n`); transcript.write(`\n**Pi**\n\n${text}\n`); }
          if (event.message.errorMessage) console.error(event.message.errorMessage);
        }
        if (event.type === 'tool_execution_start') console.log(`[Pi tool: ${event.toolName}]`);
        if (event.type === 'response' && !event.success) { console.error(event.error); busy = false; }
        if (event.type === 'agent_settled') { busy = false; console.log('[Ready for learner reply]'); }
      } catch {}
    }
  });
  child.on('error', error => console.error(error.message));
  child.on('close', () => console.log('[Pi process closed]'));
  transcript.write(`\n## Pi session started ${new Date().toISOString()}\n\nModel: ${model}. Learner: Codex acting as an evaluator, not a human participant.\n`);
  console.log(`Pi ready for ${school}. Paste the website prompt. /restart starts a fresh Pi session; /quit exits.`);
}
launch();
const rl = createInterface({ input: process.stdin });
rl.on('line', line => {
  if (line === '/quit') { child.stdin.end(); rl.close(); transcript.end(); events.end(); return; }
  if (line === '/restart') {
    if (busy) return console.log('Wait for the current turn to finish.');
    child.stdin.end(); launch(); return;
  }
  if (busy) return console.log('Pi is still responding; reply after the current turn.');
  if (!line.trim()) return;
  busy = true;
  transcript.write(`\n**Learner (Codex evaluator)**\n\n${line}\n`);
  child.stdin.write(JSON.stringify({ id: String(++turn), type: 'prompt', message: line }) + '\n');
});
