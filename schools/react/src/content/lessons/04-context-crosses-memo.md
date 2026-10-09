---
title: "State and context can cross a memo boundary"
slug: context-crosses-memo
description: "Separate parent props work, a component's own state, and subscribed context changes."
order: 4
quiz: false
agentOnly: true
agentInstructions: |
  Build the capability to identify a consumed context value or local state as a render cause even with equal memo props. Depends on lessons 1-3. GET existing progress and follow shared llms.txt; no mandatory interview or profile choice.
  Read {origin}/sources/react-docs/memo.txt lines 371-372 and 662-839 (state caveat, context example, splitting readers and minimizing props). Read {origin}/sources/react/packages/react-reconciler/src/ReactFiberNewContext.js: readContextForConsumer lines 529-577, propagateParentContextChanges provider comparison lines 363-404, propagateContextChanges match branch lines 208-270, and checkIfContextChanged lines 465-488. Read {origin}/sources/react/packages/react-reconciler/src/ReactFiberBeginWork.js checkScheduledUpdateOrContext lines 3826-3847 and the simple memo checks lines 550-605. Also read {origin}/sources/react/packages/react-reconciler/src/__tests__/ReactMemo-test.js lines 101-148. Code v19.2.0, input commit ae74234eae6ebd62f19190731278e20bc1c37d51; docs retrieved 2026-10-09.
  Start by explaining a provider as a shared input for components that read it, if needed. Then ask one prediction for the unrelated tick button and wait, not all answers at once. Welcome detours and questions, respond kindly, offer requested explanations and avoid repeated quizzes.
  Use three independent click scenarios in the activity. Expected reasoning: tick rerenders Controls but MemoPreview can skip because label and primitive theme match; theme changes trigger MemoPreview's context read despite matching label; likes changes rerender MemoPreview via its own state, without requiring Controls's function to run. Changed provider values are compared by Object.is; React records consumer dependencies. Not every descendant is a consumer, though ordinary parent traversal can still render nonconsumers.
  If the learner chooses the object-value detour, explicitly also change the reader to .theme: a fresh {theme} value has different identity and invalidates a consumer even if its selected theme text is unchanged. Do not imply context has automatic field selectors or that memo blocks context. Keep propagation/lane internals optional beyond matching context dependencies.
  Complete after the student participates in the three-cause trace and receives feedback distinguishing local state, parent props and context. Offer a drawing or verbal variant. Only after that PUT /api/progress/{studentId} with {"lessonSlug":"context-crosses-memo","source":"agent","model":"actual model ID"}, using the real model ID and checking success.
---

## A component has more inputs than props

`memo` is a boundary for work arriving through parent props; it doesn't freeze the component. A changed local state value or a changed context value the component reads can still require its calculation. Lesson 3's equal-props check is only one part of the decision.

**Context** supplies a value to components below a provider that read that context. `createContext` defines the shared input; a provider supplies a value; `useContext` reads the closest matching provider's value during rendering. Think of it as another input, not a magical command that rerenders every descendant. That “another input” phrase is a teaching analogy; React actually records dependencies.

For context change detection React compares provider values using `Object.is`, not a deep field comparison. A consumer is associated with the context it read, not automatically with only the particular field it later displayed.

## Worked example: same props, changed shared input

Generated example:

```jsx
const ThemeContext = createContext('light');
const ThemeLabel = memo(function ThemeLabel({ name }) {
  const theme = useContext(ThemeContext);
  return <span>{name}: {theme}</span>;
});
```

If an ancestor provider changes from `value="light"` to `value="dark"`, `ThemeLabel` has a changed input even if `name="Ada"` is unchanged. Default memo props comparison does not block the context-driven calculation. The text changes from `Ada: light` to `Ada: dark`.

If instead the provider uses an object such as `value={{theme: 'light'}}` on each parent render, each value object has new identity. In that **different version of the example**, the reader must use `useContext(ThemeContext).theme`. The reader can render again because the context object changed, while still displaying `light`. Reading one field does not make that context subscription a field-level selector.

## What the supplied code confirms

In React **v19.2.0**, `readContextForConsumer` stores the context and the value that was read in the component's dependency list. `propagateParentContextChanges` compares old and new provider values with `is` (React's `Object.is` helper). `propagateContextChanges` matches changed contexts with consumer dependencies and marks work on those consumers and their paths. `checkIfContextChanged` also compares recorded values to current context values.

Before an early bailout, `checkScheduledUpdateOrContext` checks both pending work and these context dependencies. `updateSimpleMemoComponent` uses that check after equal props. So equal props do not mean there is no relevant work.

The original `ReactMemo-test.js` test **does not bail out if there's a context change** changes a count context while a memoized consumer's `label` remains the same. Its expected log includes the new count. The test uses internal context reading; our learning examples use the public `useContext` API. Do not copy React's private dispatcher access into an app.

## Common misconception

“Memoized means it only rerenders when props change.” It can rerender for its own state or consumed context. Conversely, a context update is not proof that every node below the provider subscribed to it. Nonconsumers can still render through ordinary parent traversal; identify the path rather than guessing from position in the tree.

A practical boundary, when needed: let an outer component read context and pass just a primitive value to a memoized inner component. The outer reader still responds to context, but the inner component can reuse work when that selected prop stays equal. This is an optional explanation, not a requirement to optimize every reader.

## Suggested activity: three different causes

Generated example using public APIs. Assume no compiler, Strict Mode, suspension, changing refs or other pending work:

```jsx
const ThemeContext = createContext('light');

const MemoPreview = memo(function Preview({ label }) {
  const theme = useContext(ThemeContext);
  const [likes, setLikes] = useState(0);
  return (
    <section>
      <span>{label}: {theme}</span>
      <button onClick={() => setLikes(n => n + 1)}>{likes} likes</button>
    </section>
  );
});

function Controls() {
  const [tick, setTick] = useState(0);
  const [theme, setTheme] = useState('light');
  return (
    <ThemeContext.Provider value={theme}>
      <button onClick={() => setTick(t => t + 1)}>{tick} ticks</button>
      <button onClick={() => setTheme('dark')}>Dark</button>
      <MemoPreview label="Ready" />
    </ThemeContext.Provider>
  );
}
```

Start each scenario independently after a settled initial render (`tick=0`, `likes=0`, `theme='light'`). First predict an unrelated tick increment. Next predict clicking Dark. Finally predict clicking the likes button inside the preview.

For each, say which component owns the changed state, whether the preview's prop values changed, whether its context input changed, and why its calculation runs or can skip. Distinguish an ancestor's internal work record being visited from its function being called. the teacher will work through one scenario at a time and give feedback.

## Core questions

- What input changed: local state, parent-supplied prop, or consumed context?
- Which component actually reads this context?
- Can a changed context identity lead to a render with unchanged visible output?

This closes the main gap in answering “why did my memoized component render?”

## Completion criterion

Participate in the three scenarios and receive feedback on the three update paths. No perfect predictions, private API usage or project setup is required.

## Traceable sources

Code and tests: **v19.2.0**, input commit **ae74234eae6ebd62f19190731278e20bc1c37d51**. Docs: supplied snapshot retrieved **2026-10-09**. Examples are generated.

- [Official memo](https://react.dev/reference/react/memo) / [local text](/sources/react-docs/memo.txt): **Updating a memoized component using state**, opening lines 371-372; **Updating a memoized component using a context** and splitting-reader advice, lines 665-827; **Minimizing props changes**, lines 829-839.
- [Original ReactFiberNewContext.js](https://github.com/facebook/react/blob/ae74234eae6ebd62f19190731278e20bc1c37d51/packages/react-reconciler/src/ReactFiberNewContext.js) / [local file](/sources/react/packages/react-reconciler/src/ReactFiberNewContext.js): `readContextForConsumer` (529-577), `propagateParentContextChanges` provider comparison (363-404), `propagateContextChanges` dependency match (208-270), and `checkIfContextChanged` (465-488).
- [Original ReactFiberBeginWork.js](https://github.com/facebook/react/blob/ae74234eae6ebd62f19190731278e20bc1c37d51/packages/react-reconciler/src/ReactFiberBeginWork.js) / [local file](/sources/react/packages/react-reconciler/src/ReactFiberBeginWork.js): `checkScheduledUpdateOrContext` (3826-3847), `updateSimpleMemoComponent` (550-605).
- [Original ReactMemo-test.js](https://github.com/facebook/react/blob/ae74234eae6ebd62f19190731278e20bc1c37d51/packages/react-reconciler/src/__tests__/ReactMemo-test.js#L101-L148) / [local test](/sources/react/packages/react-reconciler/src/__tests__/ReactMemo-test.js): **does not bail out if there's a context change**. Read, not executed here.
