import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
const targets = process.argv.slice(2);
if (!targets.length) targets.push('schools/react:4321', 'schools/transformer:4322');
const children = targets.map(target => {
  const colon = target.lastIndexOf(':');
  const folder = target.slice(0, colon), port = target.slice(colon + 1);
  if (!folder || !/^\d+$/.test(port)) throw new Error('Expected SCHOOL_DIRECTORY:PORT');
  const child = spawn('npm', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', port],
    { cwd: resolve(folder), stdio: 'inherit' });
  child.on('error', error => { console.error(error.message); process.exitCode = 1; });
  return child;
});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => {
  for (const child of children) child.kill(signal);
});
