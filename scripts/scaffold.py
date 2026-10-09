"""Copy the upstream template and apply the shared, harness-neutral School Kit."""
import json
import os
import re
import shutil
import sys
import subprocess
from pathlib import Path

root = Path(__file__).resolve().parents[1]
spec = json.loads((root / sys.argv[1]).read_text())
out = root / spec["output"]
if out.exists():
    raise SystemExit(f"Refusing to overwrite existing school: {out}")
template = root / "upstream/school-template"
shutil.copytree(template, out, ignore=shutil.ignore_patterns(
    ".git", ".github", "node_modules", ".astro", ".wrangler", "dist", "AGENTS.md", "skill"))
for folder in ("src/content/lessons", "src/content/exercises"):
    for example in (out / folder).glob("*.mdx"):
        example.unlink()
(out / "node_modules").symlink_to(os.path.relpath(template / "node_modules", out), target_is_directory=True)
wrangler = {"name": out.name + "-school", "compatibility_date": "2026-03-12",
    "compatibility_flags": ["nodejs_compat"], "assets": {"directory": "./dist/client"},
    "kv_namespaces": [{"binding": "PROGRESS", "id": "local-" + out.name + "-progress"}]}
(out / "wrangler.jsonc").write_text(json.dumps(wrangler, indent=2) + "\n")
(out / "school.settings.json").write_text(json.dumps(spec, ensure_ascii=False, indent=2) + "\n")
school_config = out / "school.config.ts"
school_config.write_text(school_config.read_text().replace('name: "My School"', 'name: ' + json.dumps(spec["name"], ensure_ascii=False)).replace('description: "An interactive course about your subject."', 'description: ' + json.dumps(spec.get("goal", ""), ensure_ascii=False)))
astro = out / "astro.config.mjs"
astro.write_text(astro.read_text().replace('output: "server",', 'output: "server",\n\tcacheDir: "./.astro/cache",').replace("vite: {", 'vite: {\n\t\tcacheDir: "./.vite",\n\t\tserver: { strictPort: true },').replace('adapter: cloudflare(),', 'adapter: cloudflare({ inspectorPort: false }),'))
base = out / "src/layouts/Base.astro"
text = base.read_text().replace('import "../styles/main.css";', 'import "../styles/main.css";\nimport config from "../../school.config";')
text = text.replace('const { title, description = "An interactive, agent-driven school." }', 'const { title, description = config.description }')
text = text.replace('const pageTitle = title ? `${title} | My School` : "My School";', 'const pageTitle = title ? `${title} | ${config.name}` : config.name;')
text = text.replace('content="My School"', 'content={config.name}').replace('data-school-name="My School"', 'data-school-name={config.name}').replace('>My School<', '>{config.name}<')
text = re.sub(r'        <div class="mt-6 pt-4 border-t border-gray-200 dark:border-stone-800">\n          <a\n            href="/exercises"[\s\S]*?</div>', lambda match: '{exercises.length > 0 && (\n' + match.group(0) + '\n)}', text, count=1)
text = re.sub(r'          <a\n            href="/glossary"[\s\S]*?</a>\n', '', text, count=1)
base.write_text(text)
home = out / "src/pages/index.astro"
text = home.read_text().replace('import Base from "../layouts/Base.astro";', 'import Base from "../layouts/Base.astro";\nimport config from "../../school.config";')
text = text.replace('Welcome! This is an interactive, self-paced course. Enroll to get started.', '{config.description} {t("welcome")}')
# Remove the empty exercises invitation; real activities live inside lessons.
start = text.index('    <h2 class="text-sm font-mono uppercase tracking-wider text-gray-500 dark:text-gray-500 mb-4 mt-10">Exercises</h2>')
end = text.index('  </div>', text.index('    </ol>', start))
text = text[:start] + text[end:]
text = re.sub(r"    <p>Enroll above, then use your AI agent of choice.*?</p>\n\n    <p>Works with.*?</p>",
    '    <p>{t("orientation")}</p>', text, flags=re.S)
home.write_text(text)
subprocess.run([sys.executable, str(root / "scripts/apply-school-kit.py"), str(out)], check=True)
print(f"Scaffolded {out.relative_to(root)} using school-template; local KV and shared teacher contract.")
