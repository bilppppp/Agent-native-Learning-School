# React School

## Goal and backward design

**Goal:** Understand why React components rerender.

The endpoint is a small transfer task, not a tour of React's directories: given a Dashboard with memoized children, local state, context and a freshly allocated object prop, explain three independent interactions, distinguish calculations from DOM changes, and justify one narrow adjustment without blocking legitimate updates. No creator-authored review, expert sign-off, installation or React repository build is needed to use the route.

Observable capabilities practiced:

1. Distinguish an update request, component calculation, DOM commit/mutation and browser paint.
2. Identify the state owner and trace the ordinary parent-to-child update path; avoid assuming a child needs its own state change or that an unchanged ancestor function must be called.
3. Calculate a small queued state update and explain batching, snapshot values and `Object.is` equality, including early versus after-calculation bailout.
4. Predict default memo props comparison for primitives, nested object references and callbacks, without confusing outer props-object identity with each prop's identity.
5. Explain why own state and consumed context work can cross a memo boundary, and why reuse at one component need not suppress pending descendants.
6. Combine these into a conditional causal explanation for an unfamiliar small tree, grounded in actual symbols/tests, and identify the limits of one proposed adjustment.

The activity is participation plus feedback, **not** an independent assessment of mastery, real teaching outcomes or validated student progress.

## Prerequisites selected for those capabilities

No React expertise or mathematical background is assumed. Basic reading is enough to begin; the teacher can scaffold these concepts inside the activity where they are needed:

- Lesson 1: a function returns a result, props are named inputs, JSX describes UI, and the DOM is a tree of browser elements.
- Lesson 2: array destructuring for `[value, setter]`, arrow functions, simple arithmetic, pending state versus a running handler's value, object reference identity and spread for replacement. No promises/event-loop course is needed.
- Lesson 3: object keys, primitive versus reference equality, and callbacks as function values. A closure explanation is optional when discussing stale callback comparisons.
- Lesson 4: provider/readers as shared inputs. Fiber and lane vocabulary is introduced only to read a narrow branch; bitwise arithmetic and scheduler mastery are excluded.

Profile fields and the shared identity vocabulary are retained. Preferences are optional. There is no separate interview lesson, mandatory profile step, empty exercise section or homework invented to fill a template. All activities live in lessons.

## Compact dependency-aware route

| Order and lesson | Why it exists | Dependency | Observable activity |
| --- | --- | --- | --- |
| 1. `render-is-a-calculation` | Prevents “no visual change means no render” before investigating causes. Establishes the ordinary recursive render path. | None; introduces minimal JSX/function vocabulary. | Trace one Meter click and separate component calculations from changed button/span text. |
| 2. `state-requests-and-bailouts` | Identifies update requests, snapshots and equality; avoids counting setters as renders or promising zero calls for same state. | 1's trigger/render/commit distinction. | Calculate two paired handlers, compare state identities, reconcile a Parent-only original-test log. |
| 3. `parent-renders-and-memo` | Explains renders without local state changes and the actual scope of shallow memo boundaries. | 1 for recursion; 2 for `Object.is` and state bailouts. | Predict plain, primitive-prop memoized and fresh-callback memoized children; discuss one adjustment. |
| 4. `context-crosses-memo` | Adds the missing shared-input path and reinforces that memo doesn't freeze local state. | 2 for identity; 3 for equal-props reuse. | Distinguish unrelated parent state, changed context and a child's local state in three independent scenarios. |
| 5. `explain-a-rerender` | Transfers the model to new code and tests the causal reasoning, not symbol recall. | 1-4; no new React API to master. | Explain Pulse/Dark/Tally paths and visible output, use one implementation branch, propose an adjustment and its limits. |

The route is selected from capabilities, not file structure or document headings. Optional detours (stable children, signed zero/NaN, splitting a context reader, compiler assumptions) are short and do not gate completion. The causal model covers all three ordinary pathways under the activity assumptions: a component's state request, participation in parent rendering, and consumed context change. Initial rendering is distinguished from rerendering in lesson 1.

## Teaching and progress contract

Lessons are complete plain Markdown files in `src/content/lessons/`; each has the requested YAML fields, including `quiz: false`, `agentOnly: true`, and a literal `agentInstructions` block. Notes provide capability, necessary local reads, activity, likely misconception, expected reasoning and observable completion. Expected answers are teacher guidance, not the first student prompt. Bodies include usable explanations, worked examples, pitfalls, questions, activities and sources, not just outlines.

the teacher receives the existing shared guidance via `llms.txt`. Read existing progress with **GET `/api/progress/{studentId}`** before starting (again on returning sessions). Read cited local passages through `{origin}/sources/...` before explaining their mechanisms. Ask one small question and wait; welcome natural questions and short detours, explain when asked, and correct kindly. Completion requires participating in the specified activity and receiving feedback, not a perfect score or unnecessary repeated quizzes.

Only after the activity, use **PUT `/api/progress/{studentId}`** with `{"lessonSlug":"the-actual-slug","source":"agent","model":"the-actual-model-ID"}` and check success. The literal model placeholders in notes must be replaced with the running model's ID. No progress was seeded during generation. Profile choices remain optional.

## Source scope and provenance

Implementation source: supplied `sources/react`, identified by the input as **v19.2.0**, commit **ae74234eae6ebd62f19190731278e20bc1c37d51**, original project <https://github.com/facebook/react>. `ReactVersions.js` lines 1-45 locally confirm `ReactVersion = '19.2.0'`. The commit identity is supplied provenance, not a claim of executing Git verification; no git commands were run.

Documentation source: the three supplied text snapshots under `sources/react-docs`, retrieved **2026-10-09** from the official URLs below. These are already extracted text suitable for the teacher. They are not assumed to be version-frozen v19.2.0 docs; the memo snapshot includes current React Compiler advice. The route uses the implementation for version-specific branches and states compiler-off assumptions for predictions.

Only the selected files below were copied, **byte-for-byte unmodified**, under `public/sources/` preserving their path relative to `sources`. Originals are local HTTP-readable as `/sources/react/...` or `/sources/react-docs/...`. No entire repository, `.git` data, PDF or unrelated material was copied. The React license accompanies implementation copies. The generated comparison activity is separately labeled and stored in `public/activities/`, not presented as original source.

### Source catalogue: original and local URLs

| Selected file | Original URL | Local HTTP URL |
| --- | --- | --- |
| `react-docs/render-and-commit.txt` | <https://react.dev/learn/render-and-commit> | [/sources/react-docs/render-and-commit.txt](/sources/react-docs/render-and-commit.txt) |
| `react-docs/useState.txt` | <https://react.dev/reference/react/useState> | [/sources/react-docs/useState.txt](/sources/react-docs/useState.txt) |
| `react-docs/memo.txt` | <https://react.dev/reference/react/memo> | [/sources/react-docs/memo.txt](/sources/react-docs/memo.txt) |
| `ReactFiberHooks.js` | [Pinned original](https://github.com/facebook/react/blob/ae74234eae6ebd62f19190731278e20bc1c37d51/packages/react-reconciler/src/ReactFiberHooks.js) | [/sources/react/packages/react-reconciler/src/ReactFiberHooks.js](/sources/react/packages/react-reconciler/src/ReactFiberHooks.js) |
| `ReactFiberBeginWork.js` | [Pinned original](https://github.com/facebook/react/blob/ae74234eae6ebd62f19190731278e20bc1c37d51/packages/react-reconciler/src/ReactFiberBeginWork.js) | [/sources/react/packages/react-reconciler/src/ReactFiberBeginWork.js](/sources/react/packages/react-reconciler/src/ReactFiberBeginWork.js) |
| `ReactFiberNewContext.js` | [Pinned original](https://github.com/facebook/react/blob/ae74234eae6ebd62f19190731278e20bc1c37d51/packages/react-reconciler/src/ReactFiberNewContext.js) | [/sources/react/packages/react-reconciler/src/ReactFiberNewContext.js](/sources/react/packages/react-reconciler/src/ReactFiberNewContext.js) |
| `ReactFiberWorkLoop.js` | [Pinned original](https://github.com/facebook/react/blob/ae74234eae6ebd62f19190731278e20bc1c37d51/packages/react-reconciler/src/ReactFiberWorkLoop.js) | [/sources/react/packages/react-reconciler/src/ReactFiberWorkLoop.js](/sources/react/packages/react-reconciler/src/ReactFiberWorkLoop.js) |
| `shallowEqual.js` | [Pinned original](https://github.com/facebook/react/blob/ae74234eae6ebd62f19190731278e20bc1c37d51/packages/shared/shallowEqual.js) | [/sources/react/packages/shared/shallowEqual.js](/sources/react/packages/shared/shallowEqual.js) |
| `objectIs.js` | [Pinned original](https://github.com/facebook/react/blob/ae74234eae6ebd62f19190731278e20bc1c37d51/packages/shared/objectIs.js) | [/sources/react/packages/shared/objectIs.js](/sources/react/packages/shared/objectIs.js) |
| `ReactHooks-test.internal.js` | [Pinned original](https://github.com/facebook/react/blob/ae74234eae6ebd62f19190731278e20bc1c37d51/packages/react-reconciler/src/__tests__/ReactHooks-test.internal.js) | [/sources/react/packages/react-reconciler/src/__tests__/ReactHooks-test.internal.js](/sources/react/packages/react-reconciler/src/__tests__/ReactHooks-test.internal.js) |
| `ReactMemo-test.js` | [Pinned original](https://github.com/facebook/react/blob/ae74234eae6ebd62f19190731278e20bc1c37d51/packages/react-reconciler/src/__tests__/ReactMemo-test.js) | [/sources/react/packages/react-reconciler/src/__tests__/ReactMemo-test.js](/sources/react/packages/react-reconciler/src/__tests__/ReactMemo-test.js) |
| `ReactVersions.js` | [Pinned original](https://github.com/facebook/react/blob/ae74234eae6ebd62f19190731278e20bc1c37d51/ReactVersions.js) | [/sources/react/ReactVersions.js](/sources/react/ReactVersions.js) |
| `LICENSE` | [Pinned original](https://github.com/facebook/react/blob/ae74234eae6ebd62f19190731278e20bc1c37d51/LICENSE) | [/sources/react/LICENSE](/sources/react/LICENSE) |

### Concise source ledger: claims to passages

Line numbers refer to supplied local files (copies preserve them); section names are included because extracted docs have unusual code line wrapping.

| Major claim | Source location | Used in |
| --- | --- | --- |
| Render is calling components; state updates recursively reach returned children; DOM changes only where output differs. | `render-and-commit.txt`: **Steps 1-3**, purity pitfall, **Epilogue: Browser paint**; includes Trigger/Render/Commit figure labels and Clock/input explanation. | 1, 5 |
| Setters don't alter the running render's value; updates are queued/batched; updater functions process pending state. | `useState.txt`: **setter Caveats**, 183-229; **Updating state based on the previous state**, 423-554. | 2 |
| Same state uses `Object.is`; mutation retains identity; extra component call can precede skipping children. | `useState.txt`: 197-203, **screen doesn't update**, 1696-1737; `objectIs.js`: native/polyfill helper; `ReactFiberHooks.js`: `dispatchSetStateInternal`, 3629-3709, `updateReducerImpl` equality branch 1537-1564; `ReactFiberBeginWork.js`: `updateFunctionComponent`, 1488-1535. | 2, 5 |
| Eager and after-render bailouts are distinct observed test cases. | `ReactHooks-test.internal.js`: **bails out in the render phase if all of the state is the same**, 67-154; **can bail out without calling render phase (as an optimization) if queue is known to be empty**, 378-454. | 2 |
| A scheduled root isn't a promise that every component function is called. | `ReactFiberWorkLoop.js`: `scheduleUpdateOnFiber`, `markRootUpdated` at 956 and `ensureRootIsScheduled` at 1022; `ReactFiberBeginWork.js` bailout paths below. | 5 |
| Default memo compares each prop shallowly; fresh nested objects/functions fail equality; custom comparisons must include callbacks. | `memo.txt`: **Reference/Skipping**, 35-135, **Minimizing props changes**, 829-844, comparator pitfall 1138-1156, troubleshooting 1432-1437; `shallowEqual.js`; `ReactFiberBeginWork.js`: `updateMemoComponent` 472-538, `updateSimpleMemoComponent` 540-625; `ReactMemo-test.js`: **bails out on props equality**, 66-100. | 3, 5 |
| Ordinary early checks use outer props identity; reuse can still descend into pending child work. | `ReactFiberBeginWork.js`: `beginWork` 4113-4169; `bailoutOnAlreadyFinishedWork` 3714-3754. `memo.txt`: children reuse advice, 351-353. | 3, 5 |
| Memo does not block changed own state or consumed context. | `memo.txt`: 371-372, 662-827; `ReactFiberBeginWork.js`: `checkScheduledUpdateOrContext` 3826-3847, simple memo checks 550-605; `ReactMemo-test.js`: **does not bail out if there's a context change**, 101-148. | 4, 5 |
| Context reader dependencies and changed provider values use identity/value comparisons, not automatic field selectors. | `ReactFiberNewContext.js`: `readContextForConsumer` 529-577; `propagateParentContextChanges` provider compare 363-404; `propagateContextChanges` match branch 208-270; `checkIfContextChanged` 465-488. | 4, 5 |
| Development Strict Mode extra calls aren't evidence of multiple DOM changes. | `useState.txt`: **My initializer or updater function runs twice**, 1798-1905; `render-and-commit.txt` purity pitfall and Step 3; `ReactFiberHooks.js`: `renderWithHooks` condition/call/repeat, 591-627. | 1, 5 |
| Compiler-enabled apps may reuse JSX and differ from these compiler-off predictions. | `memo.txt`: **Do I still need React.memo if I use React Compiler?**, 1157 onward, especially 1292-1429. Documentation-only caveat, no compiler implementation claim. | 5, assumptions throughout |

### Files actually read, and extent

Original local text was read before writing knowledge claims. **I did not read the entire repository or even all of the large copied implementation files.** Targeted `rg` searches located symbols/tests; the following original passages were returned by reads:

- `react-docs/render-and-commit.txt`: entire 292-line supplied extraction, including figure labels and Clock example. There were no separate figure images inspected.
- `react-docs/useState.txt`: 70-233 (initial state/returns/setter caveats), 418-573 (queue explanation), 1696-1905 (mutation, render-loop troubleshooting, development checks). Other locations were searched, not fully read.
- `react-docs/memo.txt`: 1-145, 318-387, 658-862, 1138-1177, 1292-1448. These cover reference, optimization advice, state/context, identities, comparator pitfall and compiler reused-JSX example. The entire snapshot was not read.
- `react/packages/react-reconciler/src/ReactFiberHooks.js`: 573-676, 1522-1569, 3599-3730. Other function names were searched. No full hook-queue or scheduler audit is claimed.
- `react/packages/react-reconciler/src/ReactFiberBeginWork.js`: 472-634, 1423-1455, 1480-1548, 3714-3768, 3826-3848, 4091-4225. These include the memo fast paths, render/bailout sequence, child work checks and ordinary early checks.
- `react/packages/react-reconciler/src/ReactFiberNewContext.js`: 208-277, 342-433, 438-503, 519-577. These include provider identity checks, dependency creation, consumer matching and fallback checks.
- `react/packages/react-reconciler/src/ReactFiberWorkLoop.js`: 916-951 and 955-1046; only the relevant scheduling function excerpts, not the work loop as a whole.
- `react/packages/react-reconciler/src/__tests__/ReactHooks-test.internal.js`: 24-224 and 295-454, including setup, same-state and context cases and empty-queue optimization. Test names elsewhere were searched. Tests were not executed.
- `react/packages/react-reconciler/src/__tests__/ReactMemo-test.js`: 1-152, including setup and the props/context cases. Other names were searched, not fully read. Tests were not executed.
- `react/packages/shared/shallowEqual.js`, `react/packages/shared/objectIs.js`, and `react/LICENSE`: complete files.
- `react/ReactVersions.js`: first 45 lines, version declaration and package entries.

Template/config/API files were also inspected for compatibility; they are infrastructure context, not evidence of React behavior. No other materials (including the transformer sources) were used.

## Generated examples and verification scope

All lesson snippets, analogies, causal tables and Dashboard predictions are model-generated teaching material. The worked examples are conditional inferences from the selected sources; they are **not** reports from an executed React app. The official tests provide independently authored expected logs, but those tests were only read.

`public/activities/equality-lab.mjs` is a small dependency-free Node comparison lab, with a clearly labeled JavaScript adaptation of the default shallow props comparison rule. It tests object identities, primitive values, fresh/stable callbacks, key presence and optional signed-zero/NaN cases. It does not implement hooks, scheduling, reconciliation, a fake renderer or a remote sandbox. the teacher can use a verbal/pencil alternative, so Node is optional for learning. The commands are `node equality-lab.mjs state`, `node equality-lab.mjs props`, or `node equality-lab.mjs all` after downloading the file.

Generation validation results are recorded in `VALIDATION.md`. Byte equality of source copies, frontmatter/ordering/links, Markdown processing, JSX snippet syntax, preservation through the existing lesson API's prose conversion, config syntax and comparison assertions are local structural checks, not learning-outcome validation. No React tests, real browser app, server HTTP integration, full site build, deployment or student progress validation are claimed.

## Exclusions and uncertainties

- **No React directory tour, class-component API course, or full Fiber/scheduler/lane curriculum.** Narrow symbols explain the selected decisions; full internals do not enable this small transfer task.
- **Effects, external stores, reducers, suspense/concurrency, hydration, server components and remount/identity rules are excluded as mechanisms.** They can introduce work or complicate observations, but covering them all would obscure the ordinary state/parent/context model. Investigate separately if a learner's real example needs them.
- **No automatic “memo everywhere,” deep-comparison exercise or full useMemo/useCallback course.** Passing a primitive or a genuinely constant callback suffices to explain identity. Optimization is optional and should preserve correctness.
- **Compiler behavior is a dated documentation caveat.** The supplied memo docs describe JSX reuse; no compiler source was inspected. Every main prediction assumes compiler off, no Strict Mode, no suspension/remount, stable refs, a settled initial render, independent events and no other pending work. Strict Mode is explained separately, never as a universal multiplier.
- **Exact call counts are not promised.** State queue conditions, development checks, unrelated work and unsupported environments can change observations. A source test transcript describes its setup, not every possible runtime.
- **Documentation extraction limits:** the supplied text preserves section names, code tokens and figure labels, but layout/styling and separate illustrations were not inspected. The docs' simple recursion rule is qualified using version-specific bailout code, not silently treated as exhaustive.
- **Provenance limits:** copied code is attributed to the input's commit/version; no network retrieval, Git verification, React repository execution or package installation was performed.

## Adjusting the route

For a total beginner, add a two-minute function/JSX or object-reference detour inside the relevant activity, not a mandatory interview. For a learner fluent in React, shorten the worked examples and let the transfer trace expose any gap; keep the source caveats and feedback. On request, use the learner's own minimal component tree and preserve the same trigger/comparison/output questions.

If a specific app has compiler output, effects, changed identities or suspense, first make assumptions explicit; inspect the relevant original sources before extending the mechanism explanation. Don't silently apply the compiler-off predictions. If a learner only wants a quick answer, compress the route into one causal trace and return to the state/memo/context lesson that enables the missing reasoning. Reorder only after preserving the listed dependencies, or scaffold the missing concept in place.

## Self-review

The full five-lesson route was reviewed for goal coverage, source fidelity, beginner scaffolding and unnecessary material. State and parent recursion precede memo identity, then context fills the equal-props gap, then a genuinely new tree requires transfer. Corrections made during review include explicitly distinguishing outer props identity from per-prop comparison, early versus after-calculation bailouts, ancestor traversal versus function calls, and changing the context reader as well as the provider in the object-value variant. Generated JSX examples were also adjusted to survive the existing API's prose conversion without modifying infrastructure. No executable example pretends to implement React. No extra exercises, mandatory profile choices or broad internals prerequisites were added.
