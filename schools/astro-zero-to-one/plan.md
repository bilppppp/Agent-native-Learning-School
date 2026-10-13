# school-template

A template repository for building interactive, agent-driven schools on any topic. Built with Astro 6, Cloudflare Workers, and KV. Based on the architecture of [OpenCode School](https://opencode.school).

## What this is

A working Astro application that anyone can clone and customize to create an interactive school. Students enroll on a website, then learn inside their AI agent of choice. The template includes enrollment, progress tracking, quizzes, student profiles, and agent discovery, all parameterized by a single config file.

The repo also includes an OpenCode skill (`skill/SKILL.md`) that guides an agent through customizing the template for a specific subject.

## How students experience a school

Students start in the browser. They visit the school website, learn what the school teaches, and enroll. Enrollment is instant: they pick a color, click a button, and receive a unique student ID like `curious-atom-4017`. Their enrollment data is stored in a Cloudflare KV store.

Then they move into their AI agent of choice to dive in and start learning. This works with OpenCode, Claude Code, Gemini CLI, Codex, or any AI tool that can fetch URLs and hold a conversation. Students copy a short prompt from the website and paste it into their agent. The prompt contains the student's ID and a link to the school's discovery file. The agent reads this file, discovers the school's API, fetches the student's progress, and is ready to teach.

The first lesson is an interview. The agent asks the student about their experience level, preferred learning style, how much detail they want, and subject-specific questions defined by the school creator. All answers are optional. They're saved to the student's profile and shape every lesson that follows.

From here, students progress through the course material inside their agent in a flexible and engaging way. They learn at their own pace, ask whatever questions they want, and shape the course to their preferences as they go. The agent adapts its teaching based on the student's profile: a beginner gets thorough explanations from scratch, an expert gets concise technical detail. Someone who prefers hands-on learning jumps straight into doing things, while a concepts-first learner gets the theory before the practice.

Each lesson follows a teach-then-quiz flow. The agent covers the material conversationally, pausing for the student to engage with each topic. Then it presents multiple-choice quiz questions. After the student answers, the agent reviews any wrong answers in a friendly way. The lesson is marked complete regardless of quiz score: quizzes are for learning, not gatekeeping.

Progress syncs in real time. When the agent marks a lesson complete via the API, the browser updates within a second: checkmarks appear, and the page navigates to the next lesson. Students work in their agent but see progress reflected on the website as they go.

The school also supports exercises: open-ended projects where students apply what they've learned. Exercises are less structured than lessons, with broader completion criteria.

## Architecture

Four layers:

```
+----------------------------------------------+
|  Content layer                               |
|  MDX files with frontmatter + agent instrs   |
+----------------------------------------------+
|  Web layer                                   |
|  Astro SSR site: lesson pages, enrollment    |
+----------------------------------------------+
|  API layer                                   |
|  REST endpoints, OpenAPI spec, llms.txt      |
+----------------------------------------------+
|  Storage layer                               |
|  Cloudflare KV: student progress + profiles  |
+----------------------------------------------+
```

The key insight is dual-audience content. Every lesson serves two audiences:

1. Humans read the lesson on the website (rich HTML, images, interactive components).
2. AI agents read the same lesson through the API (clean markdown + structured `agentInstructions` that describe what "done" looks like and how to verify it).

Agent discovery works through a chain: the agent reads `/llms.txt` (a plain-text overview of the school and its API), then downloads `/api/openapi.json` (the full OpenAPI 3.1 spec), then interacts with the API to fetch lessons, track progress, and manage profiles.

## Tool agnosticism

The template uses generic language everywhere. No references to specific AI tool features. The `llms.txt` file says "present quiz questions interactively" rather than naming any tool's specific question mechanism. The `AgentPrompt` component shows a simple prompt: "Fetch {origin}/llms.txt for instructions." The website mentions OpenCode as the recommended default but notes compatibility with Claude Code, Gemini CLI, Codex, and others.

## Config-driven design

Everything school-specific lives in `school.config.ts` at the root of the repo. The infrastructure code reads from this config. Customizing a school means editing one file (plus writing lesson content).

The config includes:

- School name and description
- Student ID word lists (adjectives and nouns that match the subject, generated during scaffolding)
- Enrollment color palette
- Subject-specific profile fields with questions, options, and adaptation guidelines
- Support links

## Repo structure

```
school-template/
  school.config.ts              # Central config: name, words, colors, profile fields
  src/
    content/
      lessons/                  # MDX lesson files
      exercises/                # MDX exercise files
    lib/
      progress.ts               # KV read/write for student progress
      progress.test.ts
      quiz-instructions.ts      # Shared quiz boilerplate (tool-agnostic)
      mdx-to-prose.ts           # Strip HTML for API responses
      mdx-to-prose.test.ts
      student-id.ts             # ID generation (reads word lists from config)
      student-id.test.ts
      valid-slugs.ts            # Slug validation against content collections
      school.ts                 # Re-exports school.config.ts for server code
    pages/
      api/
        enroll.ts               # POST /api/enroll
        progress/[studentId].ts # GET/PUT/DELETE /api/progress/{studentId}
        profile/[studentId].ts  # GET/PUT /api/profile/{studentId}
        lessons/index.ts        # GET /api/lessons
        lessons/[slug].ts       # GET /api/lessons/{slug}
        exercises/index.ts      # GET /api/exercises
        exercises/[slug].ts     # GET /api/exercises/{slug}
        openapi.json.ts         # GET /api/openapi.json
      llms.txt.ts               # GET /llms.txt (agent discovery)
      lessons/[slug].astro      # Lesson page template
      exercises/[slug].astro    # Exercise page template
      index.astro               # Homepage with enrollment
      glossary.astro            # Term definitions
      troubleshooting.astro     # Common problems
      disenroll.astro           # Progress reset
    components/
      AgentPrompt.astro         # Copy-paste prompt for agents
    layouts/
      Base.astro                # Master layout: sidebar, theme, progress polling
    content.config.ts           # Zod schemas for lessons and exercises
    styles/main.css             # Tailwind + custom CSS
    env.d.ts                    # CloudflareEnv type (PROGRESS KV binding)
  skill/
    SKILL.md                    # Scaffolding skill for OpenCode
  script/
    dev                         # Local dev server
    build                       # Astro build
    lint                        # Biome linter
    deploy                      # Wrangler deploy
    test                        # Vitest runner
  .github/workflows/
    ci.yml                      # Lint + test on PRs
    deploy.yml                  # Build + deploy on push to main
  wrangler.jsonc                # Workers config with KV binding
  astro.config.mjs              # Astro 6, Cloudflare adapter, MDX
  biome.json                    # Linter config
  vitest.config.ts              # Test config
  tsconfig.json
  package.json
```

## Implementation plan

### Phase 1: Create the repo and extract infrastructure

1.1: Copy the upstream opencode.school codebase (`upstream/main` from the opencode.school repo) into this repo as the starting point.

1.2: Strip all opencode.school-specific content:
- Remove all 14 lesson MDX files
- Remove all 9 exercise MDX files
- Remove `src/content/cloudflare/` (CF fork only)
- Remove `src/components/CloudflareNote.astro` (CF fork only)
- Remove opencode.school-specific pages (about, tips, changelog)
- Remove `src/lib/changelog.ts`
- Remove `src/lib/config-validation-instructions.ts`
- Clear glossary and troubleshooting of school-specific content
- Remove OG images, videos, and media scripts (encode-video, publish-video, generate-og-images, migrate-kv, clean-progress)
- Keep: dev, build, lint, deploy, test scripts

### Phase 2: Create school.config.ts

2.1: Define the `SchoolConfig` type in `src/lib/school.ts`:
- `name: string`
- `description: string`
- `adjectives: string[]` (for student ID generation)
- `nouns: string[]` (for student ID generation)
- `colors: string[]` (enrollment palette)
- `profileFields: Record<string, ProfileField>` (subject-specific interview questions)
- `support: { issues: string; community?: string }`

Each `ProfileField` has: `question`, `type` (single/multi), `options` (value + label + description), `adaptation` (per-value guidelines for how the agent should adapt).

2.2: Create `school.config.ts` at the repo root with placeholder values.

2.3: Wire config into infrastructure:
- `student-id.ts`: read word lists from config
- `llms.txt.ts`: read name, description, profile adaptation guidelines from config
- `openapi.json.ts`: read name for spec title
- `Base.astro`: read name for page titles, sidebar
- `index.astro`: read name, description for homepage
- `profile/[studentId].ts`: read allowed values from config for validation
- `AgentPrompt.astro`: read name for prompt text

### Phase 3: Make language tool-agnostic

3.1: Rewrite `quiz-instructions.ts` with generic language ("present quiz questions interactively" not "use question tool calls in parallel").

3.2: Rewrite `llms.txt.ts` to be about "the school" generically. Profile adaptation guidelines generated from config. No references to specific tool features.

3.3: Update `AgentPrompt.astro` with generic prompt format. Add a note about tool compatibility.

3.4: Update homepage and site copy to use "your AI agent" language, mentioning OpenCode as the recommended default alongside other tools.

### Phase 4: Create placeholder content

4.1: Interview lesson (`01-interview.mdx`): `agentOnly: true`, `quiz: false`. agentInstructions reference generic profile fields (learningStyle, depthPreference) plus custom fields from config.

4.2: Two example quiz lessons (`02-example-lesson.mdx`, `03-example-lesson-2.mdx`) showing the MDX format, 4 quiz topics, prose body, agentInstructions. Marked with `<!-- DRAFT -->`.

4.3: One example exercise (`01-example-exercise.mdx`).

4.4: Supporting pages with generic content: glossary (empty term list with instructions), troubleshooting (generic issues), disenroll (functional, reads school name from config).

### Phase 5: Update infrastructure files

5.1: `wrangler.jsonc`: placeholder worker name, TODO for KV namespace ID, no custom domain routes.

5.2: `content.config.ts`: remove `cloudflare` collection, remove `modifiesGlobalConfig` from lesson schema, keep lessons + exercises.

5.3: `progress.ts`: generic `StudentProfile` with `learningStyle` and `depthPreference` built in, plus `[key: string]: unknown` for custom fields.

5.4: `package.json`: name `school-template`, updated description.

5.5: `.github/workflows/`: keep ci.yml and deploy.yml, note that secrets need to be configured.

5.6: `astro.config.mjs`: keep Cloudflare adapter, MDX, remove school-specific config.

### Phase 6: Write the skill

Write `skill/SKILL.md` with these sections:

**How students experience a school**: the full student journey, from browser enrollment through agent-driven learning. Tool-agnostic.

**Architecture**: four layers, dual-audience content, agent discovery chain, quiz engine, real-time sync.

**Scaffolding a new school** (10 steps):

Step 1 - Set up the project: clone from template, install deps, create KV namespace, make initial commit.

Step 2 - Define the school: ask about subject, audience, name, domain. Fill in school.config.ts.

Step 3 - Generate student ID vocabulary: based on the subject, generate 12-15 adjectives and 12-15 nouns that fit the domain. Review with creator. Write to config.

Step 4 - Design the interview: discuss what the creator needs to know about students to teach them well. Propose profile fields with questions, options, and adaptation guidelines. Review together. Write to config. Update interview lesson.

Step 5 - Plan the lessons: ask about topics, order, scope. Generate a lesson plan. Review together. Adjust.

Step 6 - Author lessons (collaborative loop): work through lessons one at a time with the creator. For each lesson:
  1. Ask what the lesson should cover. What should students understand after completing it?
  2. Discuss together. Ask follow-up questions. Note examples, misconceptions, connections.
  3. Based on the discussion, propose four quiz topics. Ask if they feel right.
  4. Generate a complete draft (MDX body + agentInstructions + frontmatter).
  5. Mark as draft.
  6. Check in: anything to add or change? Ideas that came up?
  Between lessons, remind the creator they can revisit earlier ones. Encourage spontaneous ideas.

Step 7 - Author exercises: propose exercise ideas based on the lessons. Discuss with the creator. Generate drafts.

Step 8 - Fill in supporting content: glossary terms, subject-specific troubleshooting.

Step 9 - Review pass: read through all lessons in order. Check consistency, flow, gaps.

Step 10 - Build and test: lint, build, run locally, test enrollment, test a lesson with an agent.

**Git discipline**: commit at natural stopping points throughout the process. The skill suggests commits after each major step. Run script/lint before committing. Frequent commits give confidence to experiment and push forward.

**Content authoring guide**: how to write agentInstructions, quiz topics, profile fields, adaptation guidelines.

**Reference**: SchoolConfig schema, MDX frontmatter schema, API endpoints, KV data model.

### Phase 7: README

- What this is (one paragraph)
- Quick start (clone, install, configure, deploy)
- How to use the skill
- Project structure overview
- Link to opencode.school as the reference implementation

### Phase 8: Test

- Use the skill to scaffold a sample school
- Verify lint and build pass
- Verify enrollment flow works locally
- Verify lesson API returns content with quiz instructions appended
- Verify profile API validates against config-defined fields
- Verify student IDs use the custom word lists

## Example schools

To validate the template works across different subjects:

**Element School** (periodictable.school): 118 elements, interview asks about chemistry background, quizzes cover atomic structure and properties, word lists use chemistry vocabulary (atomic, bonded, charged / atom, element, isotope).

**Cloudflare School** (cloudflare.school): lessons per product family (Workers, R2, D1, KV, Zero Trust, etc.), interview asks about web dev experience, quizzes cover product capabilities and use cases, word lists use infrastructure vocabulary (cached, edged, routed / worker, tunnel, cache).

**Music Theory School**: lessons on scales, chords, rhythm, harmony, interview asks about instrument experience, word lists use musical vocabulary (chromatic, harmonic, modal / chord, melody, scale).

## Design decisions

**No authentication**: student IDs are the only identifier. No passwords, no OAuth. Removes friction. Acceptable tradeoff for educational content without grades or credentials.

**Idempotent mutations**: marking a completed lesson complete is a no-op. Simplifies agent logic.

**Agent-only lessons**: the interview can only be completed by an agent, enforced server-side (403 if browser tries).

**Origin-aware URLs**: llms.txt and openapi.json use the request origin, not a hardcoded domain. Works in dev, preview, and production without code changes.

**Content in git**: lessons are MDX files, not in a CMS. Version history, PR reviews, easy collaboration.

**Quizzes for learning**: always marked complete regardless of score. Low-pressure, encouraging.

**Config-driven**: one file to customize. Everything else is infrastructure that doesn't change between schools.

**Tool-agnostic**: generic language throughout. Works with any AI tool that can fetch URLs and converse.
