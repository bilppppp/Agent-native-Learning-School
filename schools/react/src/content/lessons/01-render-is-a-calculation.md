---
title: "A rerender is a calculation, not a screen change"
slug: render-is-a-calculation
description: "Separate update triggers, component calls, DOM commits and browser paint."
order: 1
quiz: false
agentOnly: true
agentInstructions: |
  Build the capability to distinguish a trigger, a component render, and a DOM mutation, and to predict the ordinary parent-to-child render path. Follow shared llms.txt guidance; GET /api/progress/{studentId} before starting. Profile choices are optional, not an entry requirement.
  Read {origin}/sources/react-docs/render-and-commit.txt, sections Step 1, Step 2, Step 3 and the purity pitfall. For the Strict Mode caveat read {origin}/sources/react-docs/useState.txt, “My initializer or updater function runs twice” (lines 1798-1905). These are supplied official-doc snapshots retrieved 2026-10-09, not frozen v19.2.0 documentation.
  Start with one small question about what “render” might mean and wait. If needed, explain that a function computes a result, JSX describes desired UI, and props are named inputs. Do not present all worked-example reasoning as the first prompt. Welcome natural questions; give explanations on request and kind corrective feedback. Offer a shorter trace or a detour into JSX.
  Use the lesson's Meter activity: ask first which state changes, then which component functions normally run, then whether StableLabel needs a DOM change, one question at a time. Assume no compiler, memo, Strict Mode, suspension or remount, and normal fresh child JSX. Expected reasoning: Meter's tick update causes Meter and StableLabel to render; button text changes but the constant span text does not. No upward call of an unchanged ancestor is implied. If asked about duplicate logs, explain development Strict Mode separately without promising an exact universal call count.
  Complete after the student participates in the trace and receives feedback on render versus DOM change; perfection is not required. Read progress again on a new session. Only after the activity, PUT /api/progress/{studentId} with {"lessonSlug":"render-is-a-calculation","source":"agent","model":"actual model ID"}; substitute your real model ID and confirm success before reporting completion.
---

## The central distinction

React rendering means **calling components to calculate what the UI should be**. It is not the same as changing pixels, and it does not necessarily change the DOM. The DOM is the browser's tree of elements such as buttons and spans.

Keep four events separate:

1. **Trigger:** an initial root render or an update requests work.
2. **Render:** React calls component functions to compute the desired UI.
3. **Commit:** React applies necessary changes to the DOM. A render with unchanged output needs no DOM mutation for that output.
4. **Paint:** the browser displays the result. This is not React's component rendering.

The official *Render and Commit* page gives the beginner model: a state update renders its component and, recursively, the components it returns. Later lessons add same-state and memoization bailouts, plus context. Here, assume ordinary function components with freshly created child JSX, no compiler, no memoization, no Strict Mode and no suspension. These assumptions prevent a useful default rule from becoming an absolute claim.

## A little code background

A function returns a result. A React function component returns a UI description, commonly written as JSX. `<Badge label="Ready" />` describes a component with a named input, or **prop**, called `label`; it is not a direct call you should perform yourself. React calls `Badge` during rendering. Curly braces in JSX insert a JavaScript value. `useState` gives a stored value and a setter that requests an update; we investigate that setter next.

## Worked example: calculation without a text change

This is a model-generated teaching example, not repository code:

```jsx
function Badge({ label }) {
  return <span>{label.toUpperCase()}</span>;
}
```

Suppose a parent first passes `label="ready"`, then passes `label="READY"`. React normally calls `Badge` again because the parent renders it with new inputs. Both calls describe `<span>READY</span>`. Assuming the same element type and position, the span's displayed text needs no change. A function call happened; a change to this text did not.

Rendering should be a pure calculation: the same props, state and context should yield the same output, without changing pre-existing objects during rendering. This makes repeated calculations safe. Development Strict Mode can call components an extra time to expose impure code; two console messages do not establish two DOM updates.

## Common misconception

“Nothing changed on screen, so the component didn't render.” A calculation can reproduce an existing result. The opposite mistake is treating every console log as a committed screen update. A log inside a component only tells you that the component function ran.

## Suggested activity: follow one click

This is another generated example. Read it without installing React:

```jsx
function StableLabel() {
  return <span>Ready</span>;
}

function Meter() {
  const [tick, setTick] = useState(0);
  return (
    <section>
      <button onClick={() => setTick(t => t + 1)}>{tick}</button>
      <StableLabel />
    </section>
  );
}
```

`onClick` receives a function to run on a click. `t => t + 1` computes the next state from the pending state. Start with `tick=0`; consider one click after the initial display has settled.

Trace the update with the teacher one step at a time: name the trigger, predict the component functions called under our assumptions, and identify which displayed text needs to change. Discuss whether the unchanged `Ready` text proves that `StableLabel` was skipped. You may draw boxes and arrows rather than write code.

## Core questions

- What evidence distinguishes a function call from a DOM mutation?
- Why can a child with no state render again?
- What does keeping rendering pure buy us when calculations repeat?

This distinction is the foundation for explaining **why** a rerender happens rather than counting screen flashes.

## Completion criterion

Participate in the click trace and receive feedback distinguishing rendering from DOM changes. You do not need to get the initial prediction right.

## Traceable sources

- Official [Render and Commit](https://react.dev/learn/render-and-commit), supplied snapshot retrieved **2026-10-09**; [local original text](/sources/react-docs/render-and-commit.txt). Relevant sections: **Step 1: Trigger a render**, **Step 2: React renders your components**, its purity pitfall, **Step 3: React commits changes to the DOM**, and **Epilogue: Browser paint**. The snapshot includes the Trigger/Render/Commit illustration labels and the Clock/input example.
- Official [useState](https://react.dev/reference/react/useState), supplied snapshot retrieved **2026-10-09**; [local original text](/sources/react-docs/useState.txt), **My initializer or updater function runs twice**, lines 1798-1905: development-only checks, ignored duplicate results, and event handlers not double-called by these checks.
- All code examples and the activity here are generated. Source implementation used in later lessons is **React v19.2.0**, input commit **ae74234eae6ebd62f19190731278e20bc1c37d51**; the current documentation snapshot is a separately dated source, not evidence that every version behaves identically.
