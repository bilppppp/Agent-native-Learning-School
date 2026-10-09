// Model-generated teaching example, NOT original React source.
// Only observes JavaScript equality; does not emulate scheduling or rendering.
// Comparison rule grounded in React v19.2.0 packages/shared/shallowEqual.js
// and objectIs.js (local originals at /sources/react/packages/shared/).
// Download this file, then: node equality-lab.mjs state | props | all
import assert from 'node:assert/strict';

// JavaScript adaptation for this comparison lab. No React dependency.
// Object.keys uses enumerable own string keys, just as the cited source does.
function equalProps(a, b) {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) {
    return false;
  }
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  return keysA.length === keysB.length && keysA.every(key =>
    Object.prototype.hasOwnProperty.call(b, key) && Object.is(a[key], b[key]));
}

const shared = { x: 4 };
const beforeMutation = shared;
shared.x = 5;
const stateCases = [
  ['same number', 4, 4, true],
  ['different number', 4, 5, false],
  ['same object after mutation (not a safe state update)', beforeMutation, shared, true],
  ['separate objects, same fields', { x: 4 }, { x: 4 }, false],
  ['optional: NaN and NaN', NaN, NaN, true],
  ['optional: positive and negative zero', 0, -0, false],
];
const handler = () => 'Ready';
const propsCases = [
  ['same primitive prop, new outer props objects', { label: 'Ready' }, { label: 'Ready' }, true],
  ['changed primitive prop', { label: 'Ready' }, { label: 'Done' }, false],
  ['fresh nested objects with equal fields', { options: { x: 4 } }, { options: { x: 4 } }, false],
  ['stable nested object reference', { options: shared }, { options: shared }, true],
  ['fresh functions', { onClick: () => 'Ready' }, { onClick: () => 'Ready' }, false],
  ['stable function reference', { onClick: handler }, { onClick: handler }, true],
  ['added prop whose value is undefined', {}, { extra: undefined }, false],
];

// Assertions check the generated example, not React's runtime behavior.
for (const [, a, b, expected] of stateCases) assert.equal(Object.is(a, b), expected);
for (const [, a, b, expected] of propsCases) assert.equal(equalProps(a, b), expected);
assert.equal(equalProps(null, {}), false);
assert.equal(equalProps({ n: NaN }, { n: NaN }), true);
assert.equal(equalProps({ n: 0 }, { n: -0 }), false);
assert.equal(equalProps({ inherited: 1 }, Object.create({ inherited: 1 })), false);

const mode = process.argv[2] ?? 'all';
if (!['state', 'props', 'all'].includes(mode)) {
  console.error('Usage: node equality-lab.mjs [state|props|all]');
  process.exitCode = 1;
} else {
  console.log('GENERATED comparison lab: equality only, NOT React render counts.');
  if (mode !== 'props') {
    console.log('\nState comparisons (Object.is):');
    for (const [label, a, b] of stateCases) console.log(`${label}: ${Object.is(a, b)}`);
  }
  if (mode !== 'state') {
    console.log('\nDefault memo-style props comparisons (equalProps):');
    for (const [label, a, b] of propsCases) console.log(`${label}: ${equalProps(a, b)}`);
    console.log('Equal props alone do not establish a bailout: state/context/ref work can matter.');
  }
  console.log('\nGenerated comparison assertions passed. React itself was not executed.');
}
