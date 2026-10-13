# Goal-driven School generation protocol

You are generating a course, not teaching a student yet. Read the input JSON and the available original local sources before proposing knowledge claims. For multi-page documentation captures, follow the derived-copy and provenance rules below. Use the same protocol for repositories, papers, and other materials. Do not modify anything outside the specified output school, and do not run git commands, publish, install packages, or change infrastructure.

1. Translate the learning goal into observable learner capabilities. Work backward from a small transfer activity. Select only prerequisites that enable those capabilities. Use the supplied depth, background, learningStyle, and original natural-language request as actual curriculum design constraints. If unspecified, use a systematic conceptual route with beginner-friendly scaffolding. For an introductory request prioritize core intuition and small concrete activities, omitting mechanisms that do not help the goal. A deeper request should change the capabilities, selected mechanisms, derivations, boundary cases and activity complexity, not merely length or labels. Assume only the explicitly supplied background; explain remaining prerequisites in place. Free-text depth requirements are valid; there is one generator, not separate generators per depth. Do not confuse curriculum depth (what to learn) with teachingMode (how to teach).
2. Inspect sources with targeted searches and reads. For code, identify actual symbols, branches, and relevant tests in the supplied version. For documents, read the relevant text, equations and figure descriptions. Distinguish source-supported statements from your own analogy, generated example, inference, and uncertainty. No invented citations. Copy each referenced original source file unmodified under public/sources/ using its relative path within the input source root. This allows any teacher to read the saved original locally via HTTP. For crawled Markdown derivatives, follow the multi-page capture rules below. Include original source URLs or local origin paths AND local source URLs, precise symbols/sections/equations, and version in lesson content. Use `{origin}/sources/...` in agentInstructions. Extracted text is a derived reading aid, not the original PDF/HTML; preserve and reference saved originals alongside it. Do not claim that an original was saved when only a derived copy is available. The source root may include documents and supplementary official documentation; choose the minimal relevant subset. PDF copies are useful for humans, but provide extracted text for the teacher. Do not copy entire repositories. Do not claim to have read an inaccessible source, or add outside sources without actually retrieving/reading them and recording their provenance. If the current model and its available tools support visual reading, before writing any lesson, first open and visually inspect at least one source page image or illustration relevant to the planned course, then inspect the other visuals the course depends on (use an image such as PNG/JPG if reading the PDF returns only extracted text; extracted text does not count as seeing a page); if visual access is genuinely unavailable, continue from the available text and record in COURSE.md what was not read visually, which files and page numbers can be confirmed, and why. If a figure number cannot be confirmed, say so. Do not invent content from filenames, do not claim to have seen pages when only text was read, and do not stop generation for lack of vision. This does not cancel the existing material-preparation failure when extracted text is too little.

When a material record contains `crawl` without `crawl.fallback`, that directory is a multi-page documentation capture. Read `provenance.json`, then use targeted searches to select and read only the pages under `pages/` needed for the learner's goal and prerequisites; reading every captured page is not required. The Markdown files are derived reading copies, not original HTML. `entry.html` is the original entry response only; original HTML for the other pages is not included in this capture. Copy only the referenced Markdown derivatives, together with `provenance.json` and `entry.html`, under `public/sources/<material-directory-name>/`, preserving their paths within the material directory. Label the Markdown copies as derived reading text and cite each original page URL from provenance together with its local `/sources/...` URL. Do not claim that copying a derivative preserves the original HTML, and do not copy every crawled page into the site. Record the pages actually read in COURSE.md. For HTTP HTML material records without `crawl`, or with `crawl.fallback`, use the saved single-page original and extracted text; do not describe them as a complete documentation capture.

If the saved materials do not support the learner's goal, fill the HTTP HTML sources before writing lessons. From the repository root run `npm run school -- supplement SCHOOL_NAME`. That command starts siteone-crawler on each saved HTTP HTML source and follows the crawler's own same-domain links; it does not limit the crawl to the entry path. Pass `--crawl-prefix` only when a narrower path was explicitly requested. After it finishes, select and read only the pages the goal needs. If supplement fails, continue with the pages already saved and any pages you retrieve with your own web tools. Do not describe a single entry page as the whole documentation set.
3. Design a coherent learning path around the learner's goal, prior knowledge, and requested depth. Each lesson should address a distinct, meaningful learning objective, with clear boundaries and natural progression. Avoid overloaded lessons, unnecessary fragmentation, repetition, and repackaging the source's original structure. Keep learner-facing content focused and readable, leaving adaptive explanations and deeper exploration to the teacher. Use however many lessons the goal and requested depth need. Do not require a creator or expert to write or review each lesson. In the output school's COURSE.md explain the goal, prerequisites, capabilities, why each lesson exists, its dependency on earlier lessons, the selected sources, exclusions and reasons, uncertainties, and how to adjust the route. Explicitly explain how depth/background/learning preferences affected the scope, prerequisites, explanations, activities and expected outcomes. Include a concise source ledger connecting major claims to actual source locations. State which files you actually read. Never say you read the entire repository if you did not.
4. Write COMPLETE lessons as plain Markdown files in src/content/lessons/, with YAML frontmatter: title, slug (kebab-case), description, order (1-based), quiz: false, agentOnly: true, agentInstructions: |. Body must be complete, usable learning material, not an outline or a fixed checklist. Choose its content and organization to serve the lesson objective. Use only Markdown, no JSX/HTML expressions. Code fences are allowed. Use `$...$` for inline math and `$$` blocks for display math, with the opening and closing `$$` each on their own line. Keep Chinese explanations and units outside math mode. Write a literal dollar sign as `\$`. Keep code and commands in inline code or fenced code blocks.
5. agentInstructions are flexible, HARNESS-NEUTRAL teaching notes, not an exhaustive script. Include only lesson-specific capabilities, necessary source passages to read, relevant prerequisites and misconceptions/hints, a domain-appropriate activity, expected reasoning where needed, and an observable completion condition. Activities can be prediction+observation, a numerical calculation, explaining a diagram, or tracing a mechanism. Completion means participating in the activity and receiving feedback, not scoring perfectly. Do not demand installing/building an entire source project just to learn a concept. Do not repeat shared teaching behavior, progress GET/PUT instructions, model metadata, or harness-specific tool instructions, transport, or internal session details; the shared runtime protocol supplies these. Keep actual code/library names in source material, even if they happen to match a harness name.
6. Use diagrams, visualizations, worked examples, or interactive artifacts when they materially improve understanding. Choose the simplest effective representation based on the learning content, and ground factual relationships in the source material. Do not require visualizations for every lesson. Place generated supporting artifacts under public/activities/ and reference them from lessons. Clearly label model-generated examples as examples, not original source. Verify executable examples where possible. Avoid fake implementations that teach a false mechanism. No dependency on a remote proprietary sandbox. Simple Node/Python calculations are sufficient when appropriate. Optional browser examples may use an installed local dependency; ensure that an alternative remains available.
7. School identity, settings and profile options are already configured. Do not change infrastructure, school.config.ts, school.settings.json, shared teaching routes, package manifests, or progress data. No mandatory separate interview lesson: a teacher can briefly ask background when necessary. Keep profile choices optional. Do not create exercises merely to fill a section; activities belong in lessons when sufficient. Write course prose in the requested language (Chinese by default); retain technical identifiers. Write only COURSE.md, src/content/lessons/*.md and necessary public/sources/ and public/activities/ files. No new validation framework or testing scripts.
8. Self-review the full route for goal coverage, source fidelity, learnability and unnecessary material. Correct problems before finishing. Return a concise explanation of what was generated, how it supports the goal, and what remains unverified. Do not claim real teaching or progress validation: another process will conduct that.

Infrastructure is preconfigured. All teachers receive shared teaching, source-access, profile and completion instructions via llms.txt. Website progress belongs to the School and must never be seeded by the generator. Transport details belong to the current harness integration and are not part of curriculum content. TeachingMode may change during learning without changing the curriculum depth or regenerating the route.


Repository working directory: /Users/gravity/Desktop/AI/Agent-native Learning School 
Input:
{
  "name": "astro-zero-to-one",
  "goal": "基于零基础框架小白视角，从头到尾系统掌握 Astro 框架栈：从为什么需要框架与零 JS 心智模型开始，循序渐进掌握项目结构、.astro 组件与模板语法、文件路由与链接、页面布局与插槽系统、样式与静态资源优化、内容集合（Content Collections）、群岛架构与客户端水合指令，以及构建预览与生产部署。",
  "depth": "系统掌握 Astro 框架栈核心机制，针对零基础框架小白循序渐进，原汁原味还原官方文档体系",
  "background": "完全没有接触过现代前端框架，仅具备基础 HTML/CSS/JS 常识",
  "learningStyle": "具体官方示例驱动，直觉与机制推导结合，预测观察与动手实验，避免遗漏关键概念",
  "teachingMode": "simple",
  "language": "zh",
  "port": 4331,
  "request": "基于零基础框架小白视角，从零到一系统掌握 Astro 框架栈。学习来源：https://docs.astro.build/zh-cn/getting-started/。原汁原味还原官方文档站，避免缺漏，针对完全没有接触过现代前端框架的小白循序渐进学习整个框架栈。",
  "sources": [
    "https://docs.astro.build/zh-cn/getting-started/"
  ],
  "crawl": "force",
  "maxPages": 500,
  "crawlWorkers": 4,
  "crawlPrefix": "/zh-cn",
  "output": "schools/astro-zero-to-one",
  "sourceRoot": "schools/astro-zero-to-one/materials",
  "materials": [
    {
      "path": "material-1",
      "url": "https://docs.astro.build/zh-cn/getting-started/",
      "fetchedURL": "https://docs.astro.build/zh-cn/getting-started/",
      "retrieved": "2026-10-13",
      "version": "siteone-crawler 2.5.1",
      "provenance": "material-1/provenance.json",
      "pages": "material-1/pages",
      "crawl": {
        "tool": "siteone-crawler",
        "version": "2.5.1",
        "prefix": "/zh-cn",
        "maxPages": 500,
        "workers": 4,
        "pageCount": 398,
        "decision": "override-on"
      }
    }
  ]
}
Read the sources and write the actual curriculum files now.
