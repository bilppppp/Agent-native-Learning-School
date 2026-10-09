# Generation validation

## Checks actually run

All generation writes were confined to `schools/react`. No git commands, package installation, publishing, infrastructure changes or progress seeding were performed.

| Check | Result |
| --- | --- |
| Compare selected `public/sources/` copies with original `sources/` files | **Passed:** all 13 files are byte-identical; 670,848 bytes total. |
| Resolve concrete local source/activity references in COURSE and all lessons | **Passed:** 59 references point to existing files. Illustrative path patterns such as `/sources/...` are not treated as concrete URLs. |
| Parse all lesson YAML with installed `js-yaml` | **Passed:** exactly five lessons; all required fields, consecutive 1-5 order, unique kebab-case slugs, `quiz: false`, `agentOnly: true`, literal teaching notes with local source/progress guidance. |
| Check complete-body learning sections | **Passed:** each lesson includes explanation, a worked example, misconception, activity, core questions, completion criterion and sources. This is a structural check, not pedagogical validation. |
| Process all lesson bodies and COURSE with installed Astro Markdown processor | **Passed:** plain Markdown processed successfully. |
| Parse generated JavaScript/JSX code fences with installed esbuild | **Passed:** 13 code fences; syntax only, not React execution. |
| Run existing lesson API's `mdxToProse` helper against each lesson body | **Passed after correction:** every body is preserved exactly apart from trimming surrounding whitespace, including all fenced examples. |
| Parse `school.config.ts` and compare shared identity/profile fields to the template | **Passed:** React School name and goal-bearing description; adjectives, nouns, colors and profile fields unchanged. Placeholder support URL was cleared, not replaced with an invented one. |
| Run `node public/activities/equality-lab.mjs state`, `props`, and `all` | **Passed:** all generated comparison assertions passed in each mode on Node v24.16.0. This tests JavaScript equality, not React rendering. |
| Review conditional Dashboard predictions against selected implementation branches and original test expectations | Done as source-grounded reasoning, **not** runtime verification. |

## Corrections during review

- Distinguished outer props-object identity from memo's per-prop comparison.
- Distinguished eager same-state bailout from calling a component before skipping children.
- Kept ancestor work-record traversal separate from ancestor component function calls.
- In the context object-value detour, changed both the provider value and the reader expression, avoiding rendering an object as text.
- The preconfigured `mdxToProse` helper strips some HTML-like tags even inside code fences. Generated examples now use span elements and the name `BasicNote` rather than tags/names that this helper removes. Verified exact body preservation without modifying infrastructure.
- Corrected precise source locations for `readContextForConsumer` and `markRootUpdated`.

## Not verified

No full Astro build, local HTTP server/API integration, browser rendering, React source test suite, React project installation/build, deployment or external URL availability check was run. The original tests were read, not executed. Source commit identity comes from the supplied input, with the local version declaration separately read.

No actual teaching session, learner outcome, completion/progress API write, mastery measurement or real teaching-progress validation occurred. Those remain for the separate teaching/validation process. Structural Markdown and code-syntax checks do not replace them.
