// 模型生成的教学观察活动；调用原始源码，不是 command 的替代实现。
import { command } from '../sources/material-1/materials.mjs';
const cases = {
  streams: { code: "process.stdout.write('  hello\\n'); process.stderr.write('warning\\n')" },
  failure: { code: "process.stdout.write('partial\\n'); process.stderr.write('bad\\n'); process.exitCode = 7" },
  'empty-failure': { code: "process.stdout.write('partial'); process.exitCode = 7" },
  inherited: { code: "process.stdout.write('visible\\n'); process.stderr.write('warning\\n')", options: { inherit: true } },
  tee: { code: "process.stdout.write('visible\\n'); process.stderr.write('warning\\n')", options: { inherit: true, rejectOnErrorLog: true } },
  marker: { code: "process.stdout.write('[ERROR] demo\\n')", options: { rejectOnErrorLog: true } },
  'marker-default': { code: "process.stdout.write('[ERROR] demo\\n')" },
  'marker-stderr': { code: "process.stderr.write('[ERROR] demo\\n')", options: { rejectOnErrorLog: true } },
  'marker-cross-stream': { code: "process.stdout.write('[ERR'); process.stderr.write('OR]')", options: { rejectOnErrorLog: true } },
  timeout: { code: "process.stdout.write('ready\\n'); setInterval(() => {}, 100)", options: { timeoutMs: 600 } },
  'timeout-zero': { code: "process.on('SIGTERM', () => process.exit(0)); process.stdout.write('ready\\n'); setInterval(() => {}, 100)", options: { timeoutMs: 600 } },
  missing: { executable: '/__process_results_missing_executable__', args: [] },
};
const selected = process.argv[2];
if (!selected || (selected !== 'all' && !cases[selected])) {
  console.log('选择一个案例，先预测再运行：\n' + Object.keys(cases).join('\n') + '\nall');
  if (selected) process.exitCode = 1;
} else {
  for (const name of selected === 'all' ? Object.keys(cases) : [selected]) {
    const item = cases[name];
    console.log('\nCASE ' + name);
    try {
      const result = await command(item.executable || process.execPath, item.args || ['-e', item.code], item.options);
      console.log('PROMISE fulfilled ' + JSON.stringify(result));
    } catch (error) {
      console.log('PROMISE rejected ' + JSON.stringify({ name: error.name, code: error.code, message: error.message }));
    }
  }
}
