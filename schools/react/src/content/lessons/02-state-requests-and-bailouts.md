---
title: "State setters request work; equality can skip it"
slug: state-requests-and-bailouts
description: "Predict queued state, batching and Object.is bailouts without counting setter calls as renders."
order: 2
quiz: false
agentOnly: true
agentInstructions: |
  Build the capability to predict a state update's result and explain why same-state requests can bail out, without promising zero component calls. Depends on render-is-a-calculation. GET existing progress before beginning and honor shared llms.txt.
  Read {origin}/sources/react-docs/useState.txt lines 104-229 (Returns and setter Caveats), 423-554 (Updating state based on previous state), and 1696-1737 (screen doesn't update). Read {origin}/sources/react/packages/react-reconciler/src/ReactFiberHooks.js, dispatchSetStateInternal lines 3629-3709 and updateReducerImpl's equality branch lines 1533-1564; {origin}/sources/react/packages/react-reconciler/src/ReactFiberBeginWork.js updateFunctionComponent's renderWithHooks then !didReceiveUpdate bailout, lines 1488-1535; {origin}/sources/react/packages/shared/objectIs.js; and {origin}/sources/react/packages/react-reconciler/src/__tests__/ReactHooks-test.internal.js lines 378-454. Code is v19.2.0, input commit ae74234eae6ebd62f19190731278e20bc1c37d51; docs retrieved 2026-10-09. Read only these necessary passages, not the whole implementation.
  Ask one prediction at a time and wait, welcome questions, correct kindly, and explain on request. Briefly scaffold arrow functions and object reference identity as needed. The first student prompt should ask about one next value, not reveal the activity solutions.
  Use the paired handlers activity. Starting at 0, two setCount(count + 1) calls request 1 twice; two setCount(c => c + 1) calls compute 2. Explain snapshots and queue processing, not “the setter is ignored because it is asynchronous.” Ordinary event updates are batched; do not equate setter count with render count. Then compare one same-value update and an object mutation/replacement. Equality is Object.is; a replacement object can trigger work even if fields match, and mutation retains identity. Do not suggest mutation as an optimization.
  Optional generated probe: {origin}/activities/equality-lab.mjs (download and run node equality-lab.mjs state), or work through its expressions verbally. It only tests JavaScript comparisons, not React rendering. Contrast the original test: first same-state request after an update logs Parent but not Child; another same-state request can log nothing. Pending work prevents eager bailout, so “always zero calls” is wrong. Give no installation task.
  Complete after participation in the paired-handler calculation and equality discussion with feedback, not a perfect score or test pass. Offer a shorter verbal variant or detour. Only then PUT /api/progress/{studentId} with {"lessonSlug":"state-requests-and-bailouts","source":"agent","model":"actual model ID"}, using the real model ID and verifying success.
---

## Setters are requests, not immediate assignments

Lesson 1 separated calculations from DOM changes. Now separate **requesting an update** from **actually rendering**.

`const [count, setCount] = useState(0)` gives the current render's `count` and a setter. Calling `setCount` does not change that local `count` variable in code that is already running. It supplies work for a later render. You can pass either a next value, such as `setCount(5)`, or an updater function, such as `setCount(c => c + 1)`.

An arrow function `c => c + 1` takes a number and returns that number plus one. React applies queued updater functions to the pending state in order. Ordinary updates during an event are batched, so three setter calls do not imply three separate screen updates or three component calls.

## Worked example: a queue is not three assignments

Generated example, starting with `score=10` in one event handler:

```js
setScore(s => s + 2);
setScore(s => s * 3);
```

The first updater computes `12`; the second receives that pending value and computes `36`. The code's old `score` variable is still `10` inside this handler. The queued result for the next render is `36`. This follows the official useState queue explanation, not a simulated React scheduler.

## Equality decides whether the state changed

React compares next and previous state using `Object.is`. A **bailout** means React can reuse previous work instead of performing all the usual render work. Same-state requests can bail out without calling the component, but in some cases React calls the component and then skips rendering its children. This is an optimization, not a promise about exact function-call counts.

For ordinary numbers, `Object.is(4, 4)` is true. For objects, identity matters: two separately created `{x: 4}` objects are different, even with identical fields. An object reference points to one particular object; changing one of its fields doesn't make it a new object.

Generated illustration of a bug and repair:

```js
// Wrong: this changes an existing state object and keeps its identity.
position.x = 4;
setPosition(position);

// Instead, create a replacement, preserving other fields.
setPosition(p => ({ ...p, x: 4 }));
```

`...p` copies fields into a new object. The repair preserves state as an immutable input rather than mutating a previous render's data. Even if `x` was already `4`, the new object has new identity; React does not deeply inspect its fields to decide state equality. Do not deliberately mutate to suppress renders: that breaks the model and can leave the display stale.

## A small source trace

In React **v19.2.0**:

- `dispatchSetStateInternal` can eagerly compute next state when neither the current fiber nor its alternate has pending lanes. A **fiber** is React's internal work record for a component; a **lane** is a work/priority marker. You need no bit arithmetic here.
- If that eager result is `Object.is`-equal to current state, the function takes the eager bailout branch instead of scheduling a render.
- Otherwise it enqueues the update and calls `scheduleUpdateOnFiber` when it finds a root.
- During queue processing, `updateReducerImpl` marks a received update only when computed state differs. `updateFunctionComponent` can then bail out after the component calculation.

The original test named **can bail out without calling render phase (as an optimization) if queue is known to be empty** shows a normal change to `1`, a same-state request that still logs `Parent: 1` without `Child`, then another same-state request that logs nothing. Read this as evidence of two bailout opportunities, not a universal transcript for every application.

## Common misconception

“Every setter call rerenders,” and “same state means the component can never be called” are both too strong. A request may be batched, skipped early, or evaluated before React realizes that children can be skipped. Other changed inputs can still require a render.

## Suggested activity: two handlers, then equality

These snippets are generated. Start each independently at `count=0` and run it in a single click handler:

```js
// Handler A
setCount(count + 1);
setCount(count + 1);
```

```js
// Handler B
setCount(c => c + 1);
setCount(c => c + 1);
```

With the teacher, predict the next state of A first, then B. Explain why call counts are not enough to count renders. Next, consider a request to set the current count again, and compare passing back the same object with passing a newly created object containing the same fields. Reconcile the original test's `Parent`-only log with the equality rule.

Optional observation: download the [generated equality probe](/activities/equality-lab.mjs) and run `node equality-lab.mjs state`. It runs ordinary JavaScript assertions and prints comparisons; **it does not run React or count rerenders**. No Node available? the teacher can show the expressions for a pencil-and-paper comparison. `NaN` and signed zero cases are optional edge-case detours, not prerequisites.

## Core questions

- Which value does the running handler read, and which value does a queued updater receive?
- What exactly does `Object.is` compare for an object?
- Why can the component be called even when its children are skipped?

## Completion criterion

Participate in the two-handler calculation and equality discussion, then receive feedback. No installation, perfect answer or exact render-count prediction is required.

## Traceable sources

Docs are supplied snapshots retrieved **2026-10-09**. Code and tests are **React v19.2.0**, input commit **ae74234eae6ebd62f19190731278e20bc1c37d51**.

- [Official useState](https://react.dev/reference/react/useState) / [local text](/sources/react-docs/useState.txt): setter **Caveats**, lines 183-229; **Updating state based on the previous state**, lines 423-554; **I've updated the state, but the screen doesn't update**, lines 1696-1737.
- [Original ReactFiberHooks.js](https://github.com/facebook/react/blob/ae74234eae6ebd62f19190731278e20bc1c37d51/packages/react-reconciler/src/ReactFiberHooks.js#L3629-L3709) / [local file](/sources/react/packages/react-reconciler/src/ReactFiberHooks.js): `dispatchSetStateInternal`, lines 3629-3709; `updateReducerImpl`, equality branch at lines 1537-1564.
- [Original objectIs.js](https://github.com/facebook/react/blob/ae74234eae6ebd62f19190731278e20bc1c37d51/packages/shared/objectIs.js) / [local file](/sources/react/packages/shared/objectIs.js): `objectIs` selects native `Object.is` or its SameValue polyfill.
- [Original ReactFiberBeginWork.js](https://github.com/facebook/react/blob/ae74234eae6ebd62f19190731278e20bc1c37d51/packages/react-reconciler/src/ReactFiberBeginWork.js#L1488-L1535) / [local file](/sources/react/packages/react-reconciler/src/ReactFiberBeginWork.js): `updateFunctionComponent`, `renderWithHooks` followed by `!didReceiveUpdate` bailout.
- [Original ReactHooks-test.internal.js](https://github.com/facebook/react/blob/ae74234eae6ebd62f19190731278e20bc1c37d51/packages/react-reconciler/src/__tests__/ReactHooks-test.internal.js#L378-L454) / [local test](/sources/react/packages/react-reconciler/src/__tests__/ReactHooks-test.internal.js): **can bail out without calling render phase (as an optimization) if queue is known to be empty**. Tests were read, not run in this course build.
