// 模型生成的学习活动，不是 p-limit 原仓库文件。
// 直接调用课程中未修改的 p-limit；没有自制 limiter 或网络请求。
import assert from 'node:assert/strict';
import {setTimeout as delay} from 'node:timers/promises';
import pLimit, {limitFunction} from '../sources/material-1/index.js';

function deferred() {
  let resolve;
  const promise = new Promise(r => { resolve = r; });
  return {promise, resolve};
}
function controlled(limit, ids) {
  const gates = ids.map(() => deferred());
  const starts = ids.map(() => deferred());
  const log = [];
  const promises = ids.map((id, i) => limit(async () => {
    log.push(`start ${id}`);
    starts[i].resolve();
    await gates[i].promise;
    log.push(`end ${id}`);
    return id;
  }));
  return {gates, starts, log, promises};
}

async function schedule() {
  const limit = pLimit(2);
  const x = controlled(limit, ['A', 'B', 'C']);
  console.log('同步提交后', {active: limit.activeCount, pending: limit.pendingCount, log: [...x.log]});
  assert.equal(limit.activeCount, 2);
  assert.equal(limit.pendingCount, 1);
  assert.deepEqual(x.log, []);
  await Promise.all(x.starts.slice(0, 2).map(s => s.promise));
  x.gates[1].resolve();
  await x.starts[2].promise;
  console.log('B 完成、C 开始', [...x.log]);
  x.gates[2].resolve();
  await x.promises[2];
  x.gates[0].resolve();
  const result = await Promise.all(x.promises);
  assert.deepEqual(result, ['A', 'B', 'C']);
  assert.deepEqual(x.log, ['start A', 'start B', 'end B', 'start C', 'end C', 'end A']);
  console.log('完成顺序日志', x.log, '结果顺序', result);
}

async function errors() {
  const limit = pLimit(1);
  const log = [];
  const jobs = [
    limit(() => { log.push('A'); throw new Error('同步失败'); }),
    limit(async () => { log.push('B'); await delay(5); throw new Error('异步失败'); }),
    limit(() => { log.push('C'); return 3; }),
  ];
  const settled = Promise.allSettled(jobs); // 立即观察所有返回 promise。
  try { await Promise.all(jobs); } catch (error) { console.log('all 提前拒绝:', error.message); }
  const result = await settled;
  assert.deepEqual(log, ['A', 'B', 'C']);
  assert.deepEqual(result.map(r => r.status), ['rejected', 'rejected', 'fulfilled']);
  console.log('最终任务日志', log, '每项状态', result.map(r => r.status));
}

async function clear() {
  for (const rejectOnClear of [false, true]) {
    const limit = pLimit({concurrency: 1, rejectOnClear});
    const x = controlled(limit, ['A', 'B', 'C']);
    const observed = x.promises.map(p => p.then(
      value => ({status: 'fulfilled', value}),
      error => ({status: 'rejected', name: error.name}),
    )); // 清队列前就观察错误。
    let bSettled = false;
    void observed[1].then(() => { bSettled = true; });
    await x.starts[0].promise;
    limit.clearQueue();
    assert.equal(limit.activeCount, 1);
    assert.equal(limit.pendingCount, 0);
    x.gates[0].resolve();
    await observed[0];
    await delay(0); // 有限观察窗口，不等待默认模式下永久 pending 的 B/C。
    assert.deepEqual(x.log, ['start A', 'end A']);
    if (rejectOnClear) {
      const result = await Promise.all(observed);
      assert.deepEqual(result.map(r => r.status), ['fulfilled', 'rejected', 'rejected']);
      assert.equal(result[1].name, 'AbortError');
      console.log({rejectOnClear, result});
    } else {
      assert.equal(bSettled, false);
      console.log({rejectOnClear, bSettled, log: x.log});
    }
  }
  // 边界：已经获准占槽、尚未调用函数的任务也不在待清队列中。
  const limit = pLimit({concurrency: 1, rejectOnClear: true});
  let called = false;
  const p = limit(() => { called = true; });
  limit.clearQueue();
  assert.equal(called, false);
  await p;
  assert.equal(called, true);
  console.log('同步 clearQueue 不撤销已占槽的任务');
}

async function dynamic() {
  const limit = pLimit(3);
  const x = controlled(limit, ['A', 'B', 'C', 'D', 'E']);
  await Promise.all(x.starts.slice(0, 3).map(s => s.promise));
  limit.concurrency = 1;
  console.log('3 降到 1，旧任务不被中断', {active: limit.activeCount, pending: limit.pendingCount});
  assert.equal(limit.activeCount, 3);
  x.gates[0].resolve();
  await x.promises[0];
  assert.equal(limit.activeCount, 2);
  x.gates[1].resolve();
  await x.promises[1];
  assert.equal(limit.activeCount, 1);
  assert.equal(limit.pendingCount, 2);
  x.gates[2].resolve();
  await x.starts[3].promise;
  assert.equal(limit.activeCount, 1);
  assert.equal(limit.pendingCount, 1);
  limit.concurrency = 2;
  assert.equal(limit.activeCount, 1); // setter 填槽发生在微任务中。
  await x.starts[4].promise;
  assert.equal(limit.activeCount, 2);
  x.gates[3].resolve();
  x.gates[4].resolve();
  await Promise.all(x.promises);
  console.log('升到 2 后，D/E 重叠', x.log);
}

async function mapEdge() {
  const limit = pLimit(1);
  const log = [];
  const gate = deferred();
  function* inputs() {
    yield 'A';
    yield 'B';
    throw new Error('输入迭代失败');
  }
  try {
    await limit.map(inputs(), async id => {
      await gate.promise;
      log.push(id);
      throw new Error(`mapper ${id} 失败`);
    });
    assert.fail('应拒绝');
  } catch (error) {
    assert.equal(error.message, '输入迭代失败');
    assert.deepEqual(log, []);
    console.log('map 已拒绝，先前任务尚未结束');
  }
  gate.resolve();
  await limit(() => {}); // 排在已提交任务之后，观察它们确实继续运行。
  assert.deepEqual(log, ['A', 'B']);
  console.log('拒绝之后仍执行', log);
}

async function transfer() {
  const limit = pLimit({concurrency: 2, rejectOnClear: true});
  const inputs = [
    {id: 'A', ms: 30}, {id: 'B', ms: 5, fail: true},
    {id: 'C', ms: 15}, {id: 'D', ms: 10},
  ];
  let running = 0;
  let peak = 0;
  const completed = [];
  async function processItem(item) {
    running++;
    peak = Math.max(peak, running);
    assert.ok(running <= 2);
    try {
      await delay(item.ms);
      if (item.fail) { throw new Error(`失败 ${item.id}`); }
      return {id: item.id, value: item.id.toLowerCase()};
    } finally {
      completed.push(item.id);
      running--;
    }
  }
  const result = await Promise.allSettled(inputs.map(item => limit(processItem, item)));
  assert.equal(peak, 2);
  assert.equal(running, 0);
  assert.equal(limit.pendingCount, 0);
  assert.deepEqual(result.map(r => r.status), ['fulfilled', 'rejected', 'fulfilled', 'fulfilled']);
  console.log('峰值', peak, '结束日志（不是结果索引）', completed);
  console.log(result.map((r, i) => ({id: inputs[i].id, status: r.status,
    detail: r.status === 'fulfilled' ? r.value : r.reason.message})));
  // 独立包装函数只共享自己的槽，演示公共单函数入口。
  const limited = limitFunction(async x => x * 2, {concurrency: 1});
  assert.deepEqual(await Promise.all([limited(1), limited(2)]), [2, 4]);
}

const modes = {schedule, errors, clear, dynamic, 'map-edge': mapEdge, transfer};
const mode = process.argv[2] ?? 'schedule';
if (!Object.hasOwn(modes, mode)) {
  console.error(`可选模式: ${Object.keys(modes).join(', ')}`);
  process.exitCode = 1;
} else {
  await modes[mode]();
  console.log(`活动断言通过: ${mode}`);
}
