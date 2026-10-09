// Model-generated content validation. Uses existing template dependencies only.
// Run from this school: node script/validate-course.mjs
// No build, infrastructure access, progress writes, or filesystem writes.
import assert from "node:assert/strict";
import { readFile, readdir, access } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { load } from "js-yaml";
import { compile } from "@mdx-js/mdx";
import { z } from "astro/zod";
import { transform } from "esbuild";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const lessonDir = resolve(root, "src/content/lessons");
// Same field schema as src/content.config.ts, plus protocol value constraints.
const schema = z.object({
  title: z.string(), slug: z.string(), description: z.string(),
  order: z.number(), quiz: z.boolean(), agentOnly: z.boolean().default(false),
  agentInstructions: z.string(),
});
const slugs = new Set();
const orders = [];
let checked = 0;
const localURLs = new Set();
function onlyMarkdown() {
  return (tree) => {
    function visit(node) {
      assert(!node.type.startsWith("mdx"), `Not plain Markdown: ${node.type}`);
      if (node.type === "link" && /^\/(sources|activities)\//.test(node.url)) {
        localURLs.add(node.url);
      }
      for (const child of node.children ?? []) visit(child);
    }
    visit(tree);
  };
}
for (const name of (await readdir(lessonDir)).sort()) {
  assert(name.endsWith(".md"), `Unexpected lesson type: ${name}`);
  const file = await readFile(resolve(lessonDir, name), "utf8");
  const match = /^---\n([\s\S]*?)\n---\n([\s\S]+)$/.exec(file);
  assert(match, `Missing complete frontmatter/body: ${name}`);
  const data = schema.parse(load(match[1]));
  assert.equal(data.quiz, false);
  assert.equal(data.agentOnly, true);
  assert(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.slug));
  assert(!slugs.has(data.slug), `Duplicate slug: ${data.slug}`);
  slugs.add(data.slug);
  orders.push(data.order);
  assert(match[2].length > 2000, `Lesson too skeletal: ${name}`);
  for (const phrase of ["Core questions", "completion", "Traceable sources"]) {
    assert(match[2].toLowerCase().includes(phrase.toLowerCase()), `Missing ${phrase}: ${name}`);
  }
  const notes = data.agentInstructions;
  for (const phrase of ["{origin}/sources/transformer/attention-is-all-you-need.txt", "1706.03762v7", "progress", "wait", "feedback", "actual model ID"]) {
    assert(notes.includes(phrase), `Missing note ${phrase}: ${name}`);
  }
  assert(notes.includes(data.slug), `Completion note must identify slug: ${name}`);
  for (const m of notes.matchAll(/\{origin\}(\/(?:sources|activities)\/[^\s]+?\.(?:txt|pdf|py))/g)) {
    localURLs.add(m[1]);
  }
  await compile(match[2], { remarkPlugins: [onlyMarkdown] });
  checked += 1;
}
assert.deepEqual(orders, [1, 2, 3, 4, 5]);
for (const url of localURLs) await access(resolve(root, "public", url.slice(1)));
for (const ext of ["txt", "pdf"]) {
  const name = `transformer/attention-is-all-you-need.${ext}`;
  const original = await readFile(resolve(root, "../../sources", name));
  const copied = await readFile(resolve(root, "public/sources", name));
  assert(original.equals(copied), `Modified source copy: ${name}`);
}
const config = await readFile(resolve(root, "school.config.ts"), "utf8");
assert(config.includes('name: "Transformer School"'));
assert(config.includes('description: "Understand the Transformer architecture and attention mechanism."'));
await transform(config, { loader: "ts", format: "esm" });
console.log(`Validated ${checked} complete plain-Markdown lessons, schema, order/slugs, local resources, source copies, notes, and config syntax.`);
