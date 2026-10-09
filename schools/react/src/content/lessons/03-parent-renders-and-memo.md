---
title: "A parent render reaches children; memo adds a boundary"
slug: parent-renders-and-memo
description: "Explain ordinary child renders, shallow props comparison and reference identity."
order: 3
quiz: false
agentOnly: true
agentInstructions: |
  Build the capability to explain a child's render via parent traversal and determine whether default memo props comparison can skip that child's function. Depends on lessons 1-2. GET progress before starting; use shared llms.txt and leave profile preferences optional.
  Read {origin}/sources/react-docs/memo.txt lines 35-135 (Reference and Skipping), 321-372 (optimization and children/local-state advice), 829-844 (Minimizing props changes), 1138-1156 (custom comparator pitfall), and 1432-1437 (object/array/function troubleshooting). Read {origin}/sources/react/packages/react-reconciler/src/ReactFiberBeginWork.js updateMemoComponent and updateSimpleMemoComponent, lines 472-625; beginWork's oldProps !== newProps branch, lines 4113-4169; and bailoutOnAlreadyFinishedWork, lines 3714-3754. Read {origin}/sources/react/packages/shared/shallowEqual.js and {origin}/sources/react/packages/react-reconciler/src/__tests__/ReactMemo-test.js lines 66-100. Code v19.2.0, input commit ae74234eae6ebd62f19190731278e20bc1c37d51; docs retrieved 2026-10-09.
  Begin with one prediction for BasicNote after the parent click, not the answers to the table. Wait after each small question, invite natural questions, give kind feedback and explanations when requested. Briefly explain that a new object/function expression creates a new reference; default memo compares each prop, not the entire props object's identity or rendered DOM.
  Use the activity's BasicNote, MemoNote and MemoAction under the stated ordinary-render assumptions. Expected reasoning: BasicNote normally renders despite its constant primitive prop; MemoNote can skip with equal label and no local/context work; MemoAction's inline onSelect is a new function and prevents default props equality. The generated {origin}/activities/equality-lab.mjs props probe is optional equality observation only, not React execution. A verbal identity comparison is equally sufficient.
  Do not say memo prevents all renders, all descendants rerender, or props changing autonomously schedules work. Explain own state/context checks, stable ref caveat if useful, and childLanes: React can skip a parent's function but still reach independently scheduled children. Offer the stable-children example as an optional short detour, not another required quiz. Do not demand useMemo/useCallback installation or custom comparator implementation.
  Complete after the learner participates in the three-child prediction, receives feedback and discusses one explanation/fix for the fresh-function prop. Perfection is unnecessary. Only then PUT /api/progress/{studentId} with {"lessonSlug":"parent-renders-and-memo","source":"agent","model":"actual model ID"}, using the actual model ID and confirming success.
---

## No local state change is required for a child to render

A parent calculating new UI normally returns new descriptions of its children. React follows those descriptions and calls ordinary child components. A child can therefore render even when its own state is unchanged and its individual prop values are the same. Props are supplied **during a parent render**; “props changed” is not a separate setter that schedules itself.

This extends lesson 1's recursive model and lesson 2's equality rule: **state equality** and **props equality** answer different questions.

`memo(Component)` returns a memoized component. For an update coming through its parent, default `memo` compares each prop with its previous value using `Object.is`. If props are equal and there is no relevant state/context update, React can reuse previous work. Treat this as an optimization, not correctness logic or an unconditional guarantee.

## Worked example: two kinds of equality

Generated examples:

```js
const a = { label: 'Ready' };
const b = { label: 'Ready' };
Object.is(a, b); // false: separate outer objects
Object.is(a.label, b.label); // true: same string value
```

Default `memo` can consider these **props** equal: their keys match and each corresponding prop is equal. It does not require `a` and `b` to be the same outer props object.

But if the prop itself is an object:

```js
const a = { options: { label: 'Ready' } };
const b = { options: { label: 'Ready' } };
Object.is(a.options, b.options); // false
```

Here `options` is a newly created object each time. Default memo comparison is shallow: it does not compare the nested `label` field to rescue equality. Fresh arrays and functions have the same identity issue. An inline function expression creates a new function, even if its text is unchanged.

## The actual boundary in this version

React **v19.2.0** implements this in `updateMemoComponent` and the simple-function fast path `updateSimpleMemoComponent`. The former uses a custom comparison if supplied, otherwise `shallowEqual`. The latter uses `shallowEqual` directly. These branches also check refs, and the simple path checks scheduled update/context work before bailing out. `shallowEqual` checks keys and uses `Object.is` for corresponding values.

An ordinary function component is not given this default shallow memo comparison. `beginWork` sees new versus previous **props-object references** before dispatching to a component-specific path; a memo path can subsequently find the individual props equal. Do not read the early `oldProps !== newProps` test as proof that every new outer props object defeats `memo`.

Also, visiting React's internal record is not the same as calling that component function. `bailoutOnAlreadyFinishedWork` checks `childLanes`: React can reuse a parent's result and still proceed to a descendant with its own pending work. A child's local state update does not automatically require its ancestors' component functions to rerun.

## Common misconception

“Unchanged props mean any child must be skipped.” That is not the ordinary default. The reverse, “a parent always calls every descendant,” is also too strong: memoization, reused child descriptions and independent work change the path.

Don't fix correctness with a comparator that always returns true. A custom comparator must cover every prop, including callbacks: a callback can retain values from the render that created it. Ignoring changed callbacks can leave old behavior behind. Deep comparisons and callback memoization APIs are not prerequisites for understanding this boundary.

## Suggested activity: predict a parent click

Generated example. Assume a settled initial render, no compiler, no Strict Mode, no suspension, unchanged refs and no other pending work:

```jsx
function BasicNote({ label }) {
  return <span>{label}</span>;
}
const MemoNote = memo(BasicNote);
const MemoAction = memo(function Action({ onSelect }) {
  return <button onClick={onSelect}>Select</button>;
});

function Panel() {
  const [count, setCount] = useState(0);
  return (
    <section>
      <button onClick={() => setCount(c => c + 1)}>{count}</button>
      <BasicNote label="Ready" />
      <MemoNote label="Ready" />
      <MemoAction onSelect={() => console.log('selected')} />
    </section>
  );
}
```

Predict each child's component calculation after one click on the count button. For each, explain the update path, the compared prop values if relevant, and whether unchanged visible text is enough evidence of a skip. Then propose one way to stop creating a new `onSelect` reference without changing its behavior. You can move this particular callback outside `Panel` because it doesn't use `Panel`'s state or props; discuss why that is not safe for every callback.

Optional observation: [generated equality probe](/activities/equality-lab.mjs), `node equality-lab.mjs props`. It prints primitive, nested-object and callback comparisons. It does not execute React or prove a component skipped.

## Optional detour: reused children

Generated example:

```jsx
function Frame({ children }) {
  const [tick, setTick] = useState(0);
  return <section><button onClick={() => setTick(t => t + 1)}>{tick}</button>{children}</section>;
}
function Page() {
  return <Frame><BasicNote label="Ready" /></Frame>;
}
```

When only `Frame`'s state changes, `Page` need not be called. `Frame` receives the same `children` description from that earlier `Page` render. With no independent work or context changes, React can reuse the child without requiring `memo`. If `Page` renders again and creates new child JSX, the situation changes. This explains why the beginner recursion rule needs qualifications, not why every wrapper is automatically optimized.

## Core questions

- Who scheduled work, and how did the child become part of it?
- Are we comparing the outer props object or each prop value?
- Does skipping one component function mean ignoring its pending descendants?

## Completion criterion

Participate in the three-child prediction and receive feedback; explain or discuss one adjustment for the fresh callback. A correct first answer or executable React project is not required.

## Traceable sources

Code and tests: **v19.2.0**, input commit **ae74234eae6ebd62f19190731278e20bc1c37d51**. Docs: supplied snapshots retrieved **2026-10-09**. Examples are generated, not original tests.

- [Official memo](https://react.dev/reference/react/memo) / [local text](/sources/react-docs/memo.txt): **Reference**, **Skipping re-rendering when props are unchanged**, **Should you add memo everywhere?** (children/local-state advice), **Minimizing props changes**, custom-comparison pitfall, and object/array/function troubleshooting; lines 35-135, 321-372, 829-844, 1138-1156, 1432-1437.
- [Original ReactFiberBeginWork.js](https://github.com/facebook/react/blob/ae74234eae6ebd62f19190731278e20bc1c37d51/packages/react-reconciler/src/ReactFiberBeginWork.js) / [local file](/sources/react/packages/react-reconciler/src/ReactFiberBeginWork.js): `updateMemoComponent` (472-538), `updateSimpleMemoComponent` (540-625), `bailoutOnAlreadyFinishedWork` (3714-3754), and `beginWork` early props/work checks (4113-4169).
- [Original shallowEqual.js](https://github.com/facebook/react/blob/ae74234eae6ebd62f19190731278e20bc1c37d51/packages/shared/shallowEqual.js) / [local file](/sources/react/packages/shared/shallowEqual.js): `shallowEqual`, keys and corresponding values.
- [Original ReactMemo-test.js](https://github.com/facebook/react/blob/ae74234eae6ebd62f19190731278e20bc1c37d51/packages/react-reconciler/src/__tests__/ReactMemo-test.js#L66-L100) / [local test](/sources/react/packages/react-reconciler/src/__tests__/ReactMemo-test.js): **bails out on props equality**. This test was read, not executed here.
