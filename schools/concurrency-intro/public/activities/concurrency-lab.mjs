// 模型生成的教学活动，不是 p-limit 官方示例或官方测试。
// 调用 public/sources 中逐字复制的 p-limit，而不是自行模拟 limiter。
// 在学校根目录运行：node public/activities/concurrency-lab.mjs starts|batch|failure|clear
// Node.js >=20；使用学校已有的 yocto-queue 依赖，无需安装或构建项目。
import assert from 'node:assert/strict';
import {setTimeout as delay, setImmediate as tick} from 'node:timers/promises';
import pLimit from '../sources/material-1/index.js';

function gate() {
  let release;
  const promise = new Promise(resolve => { release = resolve; });
  return {promise, release};
}

async function starts() {
  const work = async id => {
    console.log('开始', id);
    await delay(10);
    console.log('完成', id);
    return id;
  };
  console.log('直接调用：先观察三个“开始”是否都出现在等待结果之前');
  const eager = ['A', 'B', 'C'].map(work);
  console.log('现在才等待 Promise.all');
  await Promise.all(eager);
  console.log('共享 limit(1)：每次只允许一个任务占用名额');
  const limit = pLimit(1);
  const limited = ['A', 'B', 'C'].map(id => limit(() => work(id)));
  console.log('任务已提交，函数体尚未在这个同步片段中执行');
  assert.equal(limit.activeCount, 1);
  assert.equal(limit.pendingCount, 2);
  await Promise.all(limited);
}

async function batch() {
  const ids = ['A', 'B', 'C', 'D'];
  const gates = Object.fromEntries(ids.map(id => [id, gate()]));
  const limit = pLimit(2);
  let running = 0;
  let peak = 0;
  const completed = [];
  const jobs = ids.map(id => limit(async () => {
    running++;
    peak = Math.max(peak, running);
    assert.ok(running <= 2);
    console.log('开始', id, '函数体内未结束任务数', running);
    try {
      await gates[id].promise;
      completed.push(id);
      console.log('完成', id);
      return `结果-${id}`;
    } finally {
      running--;
    }
  }));
  console.log('提交后 active/pending', limit.activeCount, limit.pendingCount);
  assert.equal(limit.activeCount, 2);
  assert.equal(limit.pendingCount, 2);
  await tick();
  for (const id of ['B', 'C', 'D', 'A']) {
    console.log('手动允许完成', id);
    gates[id].release();
    await tick();
    console.log('稳定观察点 active/pending', limit.activeCount, limit.pendingCount);
  }
  const results = await Promise.all(jobs);
  console.log('完成顺序', completed);
  console.log('结果数组', results);
  console.log('峰值', peak);
  assert.equal(peak, 2);
  assert.deepEqual(completed, ['B', 'C', 'D', 'A']);
  assert.deepEqual(results, ids.map(id => `结果-${id}`));
  assert.equal(limit.activeCount, 0);
  assert.equal(limit.pendingCount, 0);
}

async function failure() {
  const limit = pLimit(1);
  let bFinished = false;
  const jobs = [
    limit(async () => {
      console.log('A 开始');
      await delay(10);
      console.log('A 失败');
      throw new Error('教学用失败');
    }),
    limit(async () => {
      console.log('B 开始');
      await delay(20);
      bFinished = true;
      console.log('B 完成');
      return '结果-B';
    }),
  ];
  try {
    await Promise.all(jobs);
  } catch (error) {
    console.log('收到错误', error.message, '（这不是取消指令）');
  }
  const results = await Promise.allSettled(jobs);
  console.log('最终状态', results.map(item => item.status));
  assert.ok(bFinished);
  assert.deepEqual(results.map(item => item.status), ['rejected', 'fulfilled']);
  assert.equal(limit.activeCount, 0);
}

async function clear() {
  const limit = pLimit({concurrency: 1, rejectOnClear: true});
  const hold = gate();
  let bStarted = false;
  const jobs = [
    limit(async () => {
      console.log('A 开始');
      await hold.promise;
      console.log('A 完成');
      return '结果-A';
    }),
    limit(async () => {
      bStarted = true;
      console.log('B 不应开始');
      return '结果-B';
    }),
  ];
  // 在清空前注册观察者，防止拒绝无人处理。
  const settled = Promise.allSettled(jobs);
  await tick();
  console.log('清空前 active/pending', limit.activeCount, limit.pendingCount);
  limit.clearQueue();
  console.log('清空后 active/pending', limit.activeCount, limit.pendingCount);
  assert.equal(limit.activeCount, 1);
  assert.equal(limit.pendingCount, 0);
  hold.release();
  const results = await settled;
  console.log('最终状态', results.map(item => item.status));
  console.log('B 的拒绝名称', results[1].reason.name);
  assert.equal(bStarted, false);
  assert.equal(results[0].status, 'fulfilled');
  assert.equal(results[1].status, 'rejected');
  assert.equal(results[1].reason.name, 'AbortError');
}

const mode = process.argv[2] ?? 'batch';
const activities = {starts, batch, failure, clear};
if (!(mode in activities)) {
  throw new Error('请选择 starts、batch、failure 或 clear');
}
await activities[mode]();
