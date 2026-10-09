---
title: "Explain a rerender with a causal trace"
slug: explain-a-rerender
description: "Transfer the model to a small component tree and justify one targeted adjustment."
order: 5
quiz: false
agentOnly: true
agentInstructions: |
  Build the transfer capability: for an unfamiliar small component tree, explain the trigger, input comparisons, bailout or render path, and possible DOM changes, then justify one targeted adjustment. Depends on lessons 1-4; shorten review if progress or conversation shows familiarity. GET existing progress first. Follow shared llms.txt; keep profile choices optional and allow a learner's own small example instead of this one.
  Read the generated Dashboard example in this lesson. Before explaining its mechanism, read {origin}/sources/react/packages/react-reconciler/src/ReactFiberHooks.js dispatchSetStateInternal (3629-3709), {origin}/sources/react/packages/react-reconciler/src/ReactFiberWorkLoop.js scheduleUpdateOnFiber (955-1031, markRootUpdated and ensureRootIsScheduled), {origin}/sources/react/packages/react-reconciler/src/ReactFiberBeginWork.js updateSimpleMemoComponent (540-625), updateFunctionComponent (1488-1535), bailoutOnAlreadyFinishedWork (3714-3754) and checkScheduledUpdateOrContext (3826-3847). Also read {origin}/sources/react/packages/react-reconciler/src/ReactFiberNewContext.js checkIfContextChanged (465-488). For observation limits read {origin}/sources/react-docs/render-and-commit.txt Step 3 and purity pitfall, and {origin}/sources/react/packages/react-reconciler/src/ReactFiberHooks.js renderWithHooks lines 591-627. Code v19.2.0, input commit ae74234eae6ebd62f19190731278e20bc1c37d51; official docs retrieved 2026-10-09.
  Start with a single question: which component owns the state changed by the Pulse button? Wait. Do not dump the whole route or expected table. Welcome questions, offer small source traces and requested explanations, correct errors kindly, and let the learner swap a drawing or their own small snippet for a written table. Never demand React installation or exact log counts.
  Work through Pulse, Dark and Tally independently from initial state, one row at a time. Expected reasoning: Pulse calls Dashboard, the fresh options object prevents MemoCard's props bailout, while MemoTheme and MemoTally can skip; Dark calls Dashboard and MemoCard again and invalidates MemoTheme via context, while MemoTally can skip; Tally updates only MemoTally's local state, with no need to call Dashboard, MemoCard or MemoTheme. Ancestor fibers may be traversed, so “not called” is not “not visited.” Card text remains Ada in the first two cases despite calculation. Explain one path with actual symbols, but don't require reading every branch as a quiz.
  Ask for one targeted adjustment with a counterfactual prediction. Passing a primitive name prop instead of the freshly allocated options object allows MemoCard to skip on Pulse and Dark under these assumptions; it does not stop MemoTheme's legitimate Dark update or MemoTally's local update. A constant immutable object outside Dashboard also works here; do not hoist changing values or prescribe memo everywhere. If the learner discusses logs, explain development Strict Mode's extra calls and why a render log doesn't prove a commit or DOM mutation.
  Complete after participation in the three-event causal trace, feedback, and discussion of an adjustment and its limits. It is participation, not validated mastery or a perfect score. Only then PUT /api/progress/{studentId} with {"lessonSlug":"explain-a-rerender","source":"agent","model":"actual model ID"}, replacing the model value with your actual ID and confirming success. Summarize the capability practiced and let the student choose to stop or take a short detour.
---

## A useful explanation is a chain, not a slogan

You now have the ingredients to answer “why did this component rerender?” Use this causal chain:

**request → state/context/parent path → comparison or pending work → render or bailout → output difference → DOM changes if needed**.

This is a generated diagnostic framework assembled from the cited docs and implementation, not a named React algorithm. It turns “React rerenders when props change” into a specific, testable explanation.

For one interaction, ask:

1. What requested work, and which component owns the changed state?
2. Did this component receive newly rendered parent output, its own state work, or changed consumed context?
3. If there is a boundary, what values are compared? Are objects or callbacks newly allocated?
4. Did React calculate this component, reuse it, or reuse it while continuing into pending descendants?
5. Does the resulting UI actually differ?

## Worked example: an unchanged result still took work

Generated scenario: a memoized child receives `options={{name: 'Ada'}}`. A parent changes an unrelated counter and recreates that prop. The child calculates `<span>Ada</span>` both before and after.

The causal explanation is: the parent's state update brings the child into the render path; the new `options` object fails `Object.is` equality for that prop; default memo cannot take the equal-props bailout; the child calculates the same text; no change to that text is required in the DOM. “The child rerendered because its displayed name changed” would be wrong.

You could pass `name="Ada"` instead. That primitive prop remains equal across those parent renders and, absent independent state/context work, allows the memo boundary to reuse the child. This is a counterfactual explanation, not proof that optimizing this tiny child matters for performance.

## A short mechanism bridge

In **React v19.2.0**, connect one of your explanations to actual symbols:

- State requests enter `dispatchSetStateInternal`. Same eager state can take an early bailout; otherwise an enqueued update reaches `scheduleUpdateOnFiber`.
- `scheduleUpdateOnFiber` marks root work and ensures the root is scheduled. A scheduled root does **not** imply every component function is called.
- `updateSimpleMemoComponent` compares props, checks refs and checks scheduled state/context work before reusing a simple memoized component.
- `updateFunctionComponent` calculates through `renderWithHooks`; it can bail out afterward when no received update requires child reconciliation.
- `bailoutOnAlreadyFinishedWork` can continue into pending descendants even if this component's previous work is reused.
- `checkIfContextChanged` compares a reader's recorded context values to current values.

These are selected paths, not a full model of lanes, concurrent scheduling, suspense, hydration or every React API. The transfer activity deliberately does not need those mechanisms.

## Suggested transfer activity: diagnose a small dashboard

This complete **illustrative snippet** uses public React APIs. It is model-generated, not a repository test; no execution is required. `memo` is declared outside `Dashboard` so it defines a stable component type. JSX only describes children; React calls the components.

```jsx
import { createContext, memo, useContext, useState } from 'react';

const ThemeContext = createContext('light');

const MemoCard = memo(function Card({ options }) {
  return <span>{options.name}</span>;
});

const MemoTheme = memo(function Theme({ label }) {
  const theme = useContext(ThemeContext);
  return <span>{label}: {theme}</span>;
});

const MemoTally = memo(function Tally() {
  const [total, setTotal] = useState(0);
  return <button onClick={() => setTotal(t => t + 1)}>{total} tally</button>;
});

export default function Dashboard() {
  const [pulse, setPulse] = useState(0);
  const [theme, setTheme] = useState('light');
  return (
    <ThemeContext.Provider value={theme}>
      <button onClick={() => setPulse(p => p + 1)}>{pulse} pulse</button>
      <button onClick={() => setTheme('dark')}>Dark</button>
      <MemoCard options={{ name: 'Ada' }} />
      <MemoTheme label="Theme" />
      <MemoTally />
    </ThemeContext.Provider>
  );
}
```

Assume a settled initial render with `pulse=0`, `theme='light'`, `total=0`; no compiler, Strict Mode, suspense, changing refs, remounts, or other pending work. Consider each event independently from that state:

- Increment Pulse.
- Click Dark.
- Increment Tally.

Work one event at a time with the teacher. For each component, give a short causal statement or fill a row like this:

| Event | State owner | Component considered | Changed input or comparison | Calculation or reuse? | Visible difference? |
| --- | --- | --- | --- | --- | --- |
| Your event | Your prediction | Your component | Your reason | Your prediction | Your prediction |

Then propose **one** adjustment for an unnecessary calculation, predict which events it affects, and identify which legitimate updates it should not block. A sketch or verbal explanation is equally good. Cite one actual implementation branch or original test in support of one explanation. the teacher can help find and explain that passage rather than testing your memory of symbol names.

## Common misconception: counting logs settles the cause

A console message inside a component establishes a function call, not a DOM mutation. In development Strict Mode, `renderWithHooks` has an explicit extra-invocation path. In other circumstances React may also repeat or discard calculations; this route doesn't model every circumstance. Don't infer exact committed-update counts from raw render logs.

For a real app, check the environment and the update origin before optimizing: was the compiler enabled, did a context value change, did an effect or subscription request state work, or did the component type/key change? These are diagnostic leads that require separate investigation, not mechanisms this course fully establishes. Questions about keys, types and instance identity belong in an optional follow-up; this activity assumes fixed identity.

## Core questions

- Can you name both the trigger and the branch that permits or blocks reuse?
- Can you explain a calculation that produces no visible difference?
- Does your adjustment preserve local-state and context-driven updates?
- Which assumptions would you check before applying this prediction to an unfamiliar app?

## Completion criterion

Participate in the three-event causal trace, receive feedback, and discuss one adjustment and its limits. This practices transfer; it is not a claim of independently measured mastery or real-world progress validation.

## Traceable sources

All code below is **React v19.2.0**, input commit **ae74234eae6ebd62f19190731278e20bc1c37d51**. Official docs are separately dated supplied snapshots retrieved **2026-10-09**.

- [Original ReactFiberHooks.js](https://github.com/facebook/react/blob/ae74234eae6ebd62f19190731278e20bc1c37d51/packages/react-reconciler/src/ReactFiberHooks.js) / [local file](/sources/react/packages/react-reconciler/src/ReactFiberHooks.js): `dispatchSetStateInternal` (3629-3709); `renderWithHooks` development Strict Mode condition, component call and repeat (591-627).
- [Original ReactFiberWorkLoop.js](https://github.com/facebook/react/blob/ae74234eae6ebd62f19190731278e20bc1c37d51/packages/react-reconciler/src/ReactFiberWorkLoop.js#L955-L1031) / [local file](/sources/react/packages/react-reconciler/src/ReactFiberWorkLoop.js): `scheduleUpdateOnFiber`, `markRootUpdated` and `ensureRootIsScheduled` in the normal update path.
- [Original ReactFiberBeginWork.js](https://github.com/facebook/react/blob/ae74234eae6ebd62f19190731278e20bc1c37d51/packages/react-reconciler/src/ReactFiberBeginWork.js) / [local file](/sources/react/packages/react-reconciler/src/ReactFiberBeginWork.js): `updateSimpleMemoComponent` (540-625), `updateFunctionComponent` (1488-1535), `bailoutOnAlreadyFinishedWork` (3714-3754), and `checkScheduledUpdateOrContext` (3826-3847).
- [Original ReactFiberNewContext.js](https://github.com/facebook/react/blob/ae74234eae6ebd62f19190731278e20bc1c37d51/packages/react-reconciler/src/ReactFiberNewContext.js#L465-L488) / [local file](/sources/react/packages/react-reconciler/src/ReactFiberNewContext.js): `checkIfContextChanged`.
- [Official Render and Commit](https://react.dev/learn/render-and-commit) / [local text](/sources/react-docs/render-and-commit.txt): **Step 2** purity pitfall and **Step 3** minimal DOM changes. Docs teach why function calculations and DOM mutations differ; the Dashboard predictions are our conditional inferences, not observations of an executed React app.
- Optional compiler caveat: [Official memo](https://react.dev/reference/react/memo) / [local text](/sources/react-docs/memo.txt), **Do I still need React.memo if I use React Compiler?**, especially lines 1292-1429 (reused JSX). Compiler implementation and remount rules are not established by this route's selected implementation reads.
