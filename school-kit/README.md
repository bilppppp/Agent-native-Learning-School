# School Kit

`school-kit` is a small, repeatable overlay for School Template derived
schools. It keeps lesson content, source snapshots, progress records, and the
existing profile fields intact while adding a shared teaching-mode contract.

Apply it to a generated or existing school with:

```sh
python3 scripts/apply-school-kit.py schools/example
```

The command is idempotent. It creates `school.settings.json` only when the
school does not have one, adds the `teachingMode` profile field only when it is
missing, and installs these runtime files:

When the settings file already exists, its `teachingMode` value is the
pre-enrollment and no-profile default; the overlay never rewrites it.

- `src/lib/teaching.ts` — harness-neutral teaching modes and guidance.
- `src/components/TeachingMode.astro` — mode selector and profile persistence.
- `src/pages/api/lessons/[slug].ts` — returns current mode guidance when a
  `studentId` query parameter is supplied.
- `src/pages/llms.txt.ts` — shared teacher contract, independent of Pi.
- `src/pages/harness/pi.txt.ts` — the Pi-only HTTP/bash adapter contract.

The script also wires the mode control into `Base.astro` and keeps the lesson
prompt limited to the shared contract plus the current Pi adapter URL.
It removes the template's synthetic `enrollment` completion so enrollment
cannot create a fake lesson-progress record.
The existing progress refresh emits a small browser event so a mode changed by
the teacher API updates the control without adding another polling loop.

The overlay can be reapplied after regenerating a school. It does not touch
`src/content/lessons`, `src/content/exercises`, `public/sources`, progress
storage, or existing profile values.

## Website language

Fixed UI copy uses `school.settings.json.language`: `zh` (default) or `en`
(including `en-US` / `en-GB`). Natural-language values such as `English`,
`英文`, or `英语` also select English; other values fall back to Chinese.
Course content remains independently editable and is not translated by this layer.

`src/lib/ui-messages.json` is the shared text catalog. `src/lib/ui.ts` selects
server-rendered copy; `ClientUI.astro` exposes the same selected messages to
inline browser scripts, including status/error messages and completion dates.
`scripts/localize-school.py` wires inherited Template pages during overlay
application. Scaffolding applies this automatically to every new School.
Reapply the overlay to existing Schools, then restart development or rebuild
after changing their language setting. Keep internal mode values, routes,
API fields, and progress semantics unchanged when editing UI copy.
