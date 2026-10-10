// 模型生成的 JavaScript 语义实验，不是 p-limit 的实现或测试。
// 仅使用原生 Promise；可用 node promise-layers.mjs 运行。
const events = [];
let release;
const result = new Promise(resolve => { release = resolve; });
const outer = new Promise(resolve => {
  resolve(result);
  events.push('outer adopted result');
});
outer.then(value => events.push(`caller received ${value}`));
events.push('before release');
release('OK');
events.push('after release, still synchronous');
await outer;
await Promise.resolve();
console.log('Promise adoption:');
console.log(events.join('\n'));

const context = [];
let state = 1;
const deferred = Promise.resolve().then(() => context.push(`then saw ${state}`));
context.push('synchronous submission');
state = 2;
await deferred;
console.log('\nDeferred callback:');
console.log(context.join('\n'));

const failure = new Error('example failure');
const rejectedResult = (async () => { throw failure; })();
const returned = new Promise(resolve => resolve(rejectedResult));
// 先为调用者返回的 Promise 注册观察者。
const callerOutcome = returned.then(
  () => 'unexpected fulfillment',
  error => `caller observed: ${error.message}`,
);
try { await rejectedResult; } catch { /* 内部观察不修改原 Promise */ }
console.log('\nTwo observers:');
console.log(await callerOutcome);
