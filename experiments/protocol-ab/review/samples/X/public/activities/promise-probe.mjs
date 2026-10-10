// 模型生成的学习活动：只探测原生 Promise 语义，不实现 p-limit。
// 无依赖；可用已有 Node 执行，也可按日志顺序手工推演。
import assert from 'node:assert/strict';

let value = 1;
const reaction = Promise.resolve().then(() => {
  console.log(`then: value=${value}`);
  assert.equal(value, 2);
});
value = 2;
console.log(`sync: value=${value}`);
await reaction;

let release;
const result = new Promise(resolve => { release = resolve; });
const outer = new Promise(resolve => { resolve(result); });
let settled = false;
const observation = outer.then(answer => {
  settled = true;
  assert.equal(answer, 'done');
  console.log(`outer: ${answer}`);
});
// 让原生 Promise 的吸收过程前进，但 result 尚未被 release。
await Promise.resolve();
await Promise.resolve();
console.log(`before release: settled=${settled}`);
assert.equal(settled, false);
release('done');
await observation;
assert.equal(settled, true);

function throwingFunction() { throw new Error('boom'); }
const wrapped = (async () => throwingFunction())();
try {
  await wrapped;
  assert.fail('Expected a rejection');
} catch (error) {
  assert.equal(error.message, 'boom');
  console.log(`sync throw becomes rejection: ${error.message}`);
}
