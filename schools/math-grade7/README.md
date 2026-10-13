# school-template

A template for building interactive, agent-driven schools on any topic.

Students enroll for free with one click, get a unique student ID, paste a custom prompt into their AI agent of choice, and embark on interactive and individually-tailored learning journeys. Works with OpenCode, Claude Code, Codex, Gemini, and most other AI agent harnesses.

Based on the architecture of [OpenCode School](https://opencode.school).

## Quick start

To get started creating your own school, copy and paste this prompt into your agentic coding tool of choice:

> Let's create a new school!
>
> Fetch https://github.com/opencodeschool/school-template/blob/main/skill/SKILL.md for instructions.

The agent will walk you through the full process: cloning the template, defining your school's subject, designing the interview, planning lessons, and authoring content together.

Not using a coding agent yet? Check out [OpenCode School](https://opencode.school) to learn OpenCode, a free, open-source AI coding agent that works with models from Anthropic, OpenAI, Gemini, and others.

## How it works

Students start in the browser. They visit the school website, learn what it teaches, and enroll. Then they move into their AI agent to dive in and start learning at their own pace. An interview captures their preferences, and the agent adapts its teaching style from there: beginners get thorough explanations, experts get concise details, hands-on learners jump straight into doing things.

Each lesson follows a teach-then-quiz flow. The agent covers the material conversationally, quizzes the student, and marks the lesson complete. Progress syncs to the website in real time. The school also supports exercises: open-ended projects where students apply what they've learned.

## Stack

- [Astro](https://astro.build) — static site framework with SSR
- [Cloudflare Workers](https://workers.cloudflare.com) — edge hosting
- [Cloudflare KV](https://developers.cloudflare.com/kv/) — student progress storage
- [Tailwind CSS](https://tailwindcss.com) — styling
- [MDX](https://mdxjs.com/) — lesson content format

See [skill/SKILL.md](skill/SKILL.md) for the full architecture and scaffolding workflow.
