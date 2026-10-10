// 模型生成的原生 Promise 小实验，不是 p-limit 的模拟实现。
// 只演示同步 executor、异步 then，以及 resolve(promise) 的状态采纳。
// 无依赖：node school/public/activities/promise-boundaries.mjs
const events = [];
let release;
const gate = new Promise(resolve => {
  events.push('executor');
  release = resolve;
});
let value = 1;
const observed = gate.then(() => {
  events.push(`then reads ${value}`);
  return value;
});
value = 7;
events.push('sync end');
console.log('before release:', events.join(' | '));
release();
console.log('observed value:', await observed);
console.log('after release:', events.join(' | '));

let finish;
const inner = new Promise(resolve => { finish = resolve; });
let resolveOuter;
const outer = new Promise(resolve => { resolveOuter = resolve; });
let settled = false;
outer.then(() => { settled = true; });
resolveOuter(inner);
await Promise.resolve();
console.log('outer settled before inner:', settled);
finish('done');
console.log('outer result:', await outer);
console.log('outer settled after inner:', settled);
