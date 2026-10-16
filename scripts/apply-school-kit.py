#!/usr/bin/env python3
"""Apply the reusable School Kit overlay to one School Template derived school."""

from __future__ import annotations

import argparse
import json
import re
import stat
import subprocess
import sys
import importlib.util
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OVERLAY = ROOT / "school-kit" / "overlay"

OVERLAY_FILES = (
    Path("astro.config.mjs"),
    Path("src/lib/ui.ts"),
    Path("src/lib/ui-messages.json"),
    Path("src/components/ClientUI.astro"),
    Path("src/components/AgentPrompt.astro"),
    Path("src/components/TeachingMode.astro"),
    Path("src/lib/teaching.ts"),
    Path("src/lib/deploy-target.ts"),
    Path("src/lib/public-origin.ts"),
    Path("src/lib/store.ts"),
    Path("src/lib/store-dev.ts"),
    Path("src/lib/store-node.ts"),
    Path("src/lib/store-vercel.ts"),
    Path("src/lib/progress.ts"),
    Path("src/lib/student-id.ts"),
    Path("src/pages/api/enroll.ts"),
    Path("src/pages/api/lessons/index.ts"),
    Path("src/pages/api/lessons/[slug].ts"),
    Path("src/pages/api/exercises/index.ts"),
    Path("src/pages/api/exercises/[slug].ts"),
    Path("src/pages/api/openapi.json.ts"),
    Path("src/pages/api/progress/[studentId].ts"),
    Path("src/pages/api/profile/[studentId].ts"),
    Path("src/pages/harness/pi.txt.ts"),
    Path("src/pages/llms.txt.ts"),
    Path("script/serve"),
    Path("DEPLOYMENT.md"),
    Path(".env.example"),
)

LEGACY_RUNTIME_FILES = (
    Path("src/lib/blob-kv.ts"),
    Path("src/lib/cf-workers-stub.ts"),
)

KIT_DEPENDENCIES = {
    "@astrojs/node": "10.0.2",
    "@astrojs/vercel": "^10.0.8",
    "@vercel/blob": "^2.8.1",
    "remark-math": "^6.0.0",
    "rehype-katex": "^7.0.1",
    "katex": "^0.16.22",
}

NPMRC_CONTENTS = "legacy-peer-deps=true\n"


def write_if_changed(path: Path, content: str) -> bool:
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists() and path.read_text() == content:
        return False
    path.write_text(content)
    return True


def matching_brace(text: str, opening: int) -> int:
    """Find a JavaScript/TypeScript object's closing brace without parsing it."""
    depth = 0
    quote: str | None = None
    escaped = False
    line_comment = False
    block_comment = False
    i = opening
    while i < len(text):
        char = text[i]
        next_char = text[i + 1] if i + 1 < len(text) else ""
        if line_comment:
            if char == "\n":
                line_comment = False
        elif block_comment:
            if char == "*" and next_char == "/":
                block_comment = False
                i += 1
        elif quote:
            if escaped:
                escaped = False
            elif char == "\\":
                escaped = True
            elif char == quote:
                quote = None
        elif char in ("'", '"', "`"):
            quote = char
        elif char == "/" and next_char == "/":
            line_comment = True
            i += 1
        elif char == "/" and next_char == "*":
            block_comment = True
            i += 1
        elif char == "{":
            depth += 1
        elif char == "}":
            depth -= 1
            if depth == 0:
                return i
        i += 1
    raise ValueError("Could not find the end of profileFields")


def add_teaching_mode_profile_field(config_path: Path) -> bool:
    text = config_path.read_text()
    match = re.search(r"\bprofileFields\s*:\s*\{", text)
    if not match:
        raise ValueError(f"{config_path} has no profileFields object")
    opening = text.find("{", match.start(), match.end())
    closing = matching_brace(text, opening)
    section = text[opening:closing]
    if re.search(r"\bteachingMode\s*:", section):
        return False

    line_start = text.rfind("\n", 0, closing) + 1
    closing_indent = re.match(r"[ \t]*", text[line_start:closing]).group(0)
    field_indent = closing_indent + "\t"
    before_closing = text[:closing]
    trailing_indent = re.search(r"\n[ \t]*$", before_closing)
    if trailing_indent:
        before_closing = before_closing[: trailing_indent.start() + 1]
    elif before_closing and not before_closing.endswith("\n"):
        before_closing += "\n"

    field = (
        f"{field_indent}teachingMode: {{\n"
        f'{field_indent}\tquestion: "How should your teacher guide you?",\n'
        f'{field_indent}\ttype: "single",\n'
        f"{field_indent}\toptions: [\n"
        f'{field_indent}\t\t{{ value: "simple", label: "Simple", description: "Focused explanations and fewer detours" }},\n'
        f'{field_indent}\t\t{{ value: "immersive", label: "Immersive", description: "More questions, connections, and practice" }},\n'
        f"{field_indent}\t],\n"
        f"{field_indent}\tadaptation: {{\n"
        f'{field_indent}\t\tsimple: "Keep explanations concise and focus on the core lesson activity.",\n'
        f'{field_indent}\t\timmersive: "Invite predictions, follow-up questions, connections, and short practice when useful.",\n'
        f"{field_indent}\t}},\n"
        f"{field_indent}}},\n"
    )
    updated = before_closing + field + closing_indent + text[closing:]
    return write_if_changed(config_path, updated)


PUBLIC_TITLE_BLOCK = (
    "const courseShortName = config.shortName || config.publicName || config.name;\n"
    "const coursePublicName = config.publicName || config.shortName || config.name;\n"
    "const pageTitle = title ? `${title} | ${courseShortName}` : `${coursePublicName} | Learn Islands`;"
)


def patch_public_titles(base_path: Path) -> bool:
    """Use the public course name in the document title and header, not the directory slug."""
    text = base_path.read_text()
    original = text
    legacy = 'const pageTitle = title ? `${title} | ${config.name}` : config.name;'
    template = 'const pageTitle = title ? `${title} | My School` : "My School";'
    if "const courseShortName = " not in text:
        if legacy in text:
            text = text.replace(legacy, PUBLIC_TITLE_BLOCK, 1)
        elif template in text:
            text = text.replace(template, PUBLIC_TITLE_BLOCK, 1)
        else:
            raise ValueError(f"{base_path} has no recognizable document title")
    text = text.replace(
        '<meta property="og:site_name" content={config.name} />',
        '<meta property="og:site_name" content={courseShortName} />',
        1,
    )
    text = text.replace('data-school-name={config.name}', "data-school-name={courseShortName}")
    text = text.replace(">{config.name}<", ">{courseShortName}<")
    return write_if_changed(base_path, text) if text != original else False


def ensure_public_title_fields(target: Path) -> bool:
    """Add optional public names. Leave an existing publicName untouched."""
    changed = False
    school_ts = target / "src/lib/school.ts"
    type_text = school_ts.read_text()
    if "publicName?:" not in type_text:
        needle = "\tname: string;\n"
        if needle not in type_text:
            raise ValueError(f"{school_ts} has no name field on SchoolConfig")
        type_text = type_text.replace(
            needle,
            "\tname: string;\n\tpublicName?: string;\n\tshortName?: string;\n",
            1,
        )
        school_ts.write_text(type_text)
        changed = True

    config_path = target / "school.config.ts"
    config_text = config_path.read_text()
    if re.search(r"(?m)^\s*publicName\s*:", config_text):
        return changed
    match = re.search(r"(?m)^([ \t]*)name:\s*(?:\"(?:\\.|[^\"])*\"|'(?:\\.|[^'])*')\s*,[ \t]*\n", config_text)
    if not match:
        raise ValueError(f"{config_path} has no name property")
    indent = match.group(1)
    insert = f'{indent}publicName: "",\n{indent}shortName: "",\n'
    config_text = config_text[: match.end()] + insert + config_text[match.end() :]
    config_path.write_text(config_text)
    return True


def patch_base_layout(base_path: Path) -> bool:
    text = base_path.read_text()
    original = text

    if 'import TeachingMode from "../components/TeachingMode.astro";' not in text:
        marker = 'import "../styles/main.css";'
        if marker not in text:
            raise ValueError(f"{base_path} has no main.css import")
        text = text.replace(
            marker,
            marker + '\nimport TeachingMode from "../components/TeachingMode.astro";',
            1,
        )

    if "<TeachingMode />" not in text:
        marker = "        <slot />"
        if marker not in text:
            raise ValueError(f"{base_path} has no main slot")
        text = text.replace(marker, "        <TeachingMode />\n" + marker, 1)

    if "school:enrolled" not in text:
        pattern = re.compile(r"(this\.setCachedProgress\(data\.progress\);\s*)(return data;)")
        text, count = pattern.subn(
            r'\1window.dispatchEvent(new CustomEvent("school:enrolled"));\n\t\t\t\2',
            text,
            count=1,
        )
        if count == 0:
            raise ValueError(f"{base_path} has no enrollment completion point")

    if "school:progress" not in text:
        pattern = re.compile(r"(this\.setCachedProgress\(progress\);\s*)(return progress;)")
        text, count = pattern.subn(
            r'\1window.dispatchEvent(new CustomEvent("school:progress", { detail: progress }));\n\t\t\t\2',
            text,
            count=1,
        )
        if count == 0:
            raise ValueError(f"{base_path} has no progress refresh point")

    text = patch_stale_student_id(base_path, text)
    return write_if_changed(base_path, text) if text != original else False


def patch_stale_student_id(base_path: Path, text: str) -> str:
    """Drop a student id that this school does not know, and stop polling it."""
    if "res.status === 404" not in text:
        old = (
            "          const res = await fetch(`/api/progress/${studentId}`);\n"
            "          if (!res.ok) return null;"
        )
        new = (
            "          const res = await fetch(`/api/progress/${studentId}`);\n"
            "          if (res.status === 404) {\n"
            '            localStorage.removeItem("studentId");\n'
            '            localStorage.removeItem("progress");\n'
            "            this.updateEnrolledIndicator();\n"
            "            this.updateAllCheckmarks();\n"
            "            return null;\n"
            "          }\n"
            "          if (!res.ok) return null;"
        )
        if old not in text:
            raise ValueError(f"{base_path} has no progress fetch to clear a stale student id")
        text = text.replace(old, new, 1)

    if "function startPolling()" not in text:
        old = (
            "        if (window.school.getStudentId()) {\n"
            "          setInterval(function() {\n"
            "            window.school.fetchProgress().then(function() {\n"
            "              window.school.updateAllCheckmarks();\n"
            "            });\n"
            "          }, 1000);\n"
            "        }"
        )
        new = (
            "        var pollTimer = null;\n"
            "        function startPolling() {\n"
            "          if (pollTimer) return;\n"
            "          pollTimer = setInterval(function() {\n"
            "            if (!window.school.getStudentId()) {\n"
            "              clearInterval(pollTimer);\n"
            "              pollTimer = null;\n"
            "              return;\n"
            "            }\n"
            "            window.school.fetchProgress().then(function() {\n"
            "              window.school.updateAllCheckmarks();\n"
            "            });\n"
            "          }, 1000);\n"
            "        }\n"
            "\n"
            "        if (window.school.getStudentId()) {\n"
            "          startPolling();\n"
            "        }\n"
            "\n"
            '        window.addEventListener("school:enrolled", function() {\n'
            "          startPolling();\n"
            "        });"
        )
        if old not in text:
            raise ValueError(f"{base_path} has no progress poll to stop for a stale student id")
        text = text.replace(old, new, 1)
    return text


def patch_homepage(home_path: Path) -> bool:
    """Remove the template's synthetic enrollment completion."""
    text = home_path.read_text()
    original = text
    pattern = re.compile(
        r'\s*window\.school\.markComplete\("enrollment"\)\.then\(function\(\) \{\s*'
        r'window\.school\.updateAllCheckmarks\(\);\s*'
        r'if \(typeof window\.school\.updateEnrolledIndicator === "function"\) \{\s*'
        r'window\.school\.updateEnrolledIndicator\(\);\s*'
        r'\}\s*'
        r'\}\);\s*',
    )
    replacement = (
        '\n              window.school.updateAllCheckmarks();\n'
        '              if (typeof window.school.updateEnrolledIndicator === "function") {\n'
        '                window.school.updateEnrolledIndicator();\n'
        '              }\n'
    )
    text, count = pattern.subn(replacement, text, count=1)
    if count == 0 and 'markComplete("enrollment")' in original:
        raise ValueError(f"{home_path} has an unsupported enrollment completion block")
    return write_if_changed(home_path, text) if text != original else False


def patch_openapi(openapi_path: Path) -> bool:
    """Document the mode query and response fields, failing on unknown layouts."""
    text = openapi_path.read_text()
    original = text

    lesson_schema = re.search(
        r'(\t\t\t\tLesson: \{)(.*?)(?=\n\t\t\t\tExercise: \{)',
        text,
        flags=re.DOTALL,
    )
    if not lesson_schema:
        raise ValueError(f"{openapi_path} has no Lesson schema")
    schema_block = lesson_schema.group(2)
    if "teachingMode:" not in schema_block or "teachingGuidance:" not in schema_block:
        marker = '\t\t\t\t\t\tagentOnly: { type: "boolean" },'
        if marker not in schema_block:
            raise ValueError(f"{openapi_path} Lesson schema has no agentOnly property")
        additions = (
            '\n\t\t\t\t\t\tteachingMode: { type: "string", enum: ["simple", "immersive"] },'
            if "teachingMode:" not in schema_block
            else ""
        )
        additions += (
            '\n\t\t\t\t\t\tteachingGuidance: { type: "string" },'
            if "teachingGuidance:" not in schema_block
            else ""
        )
        schema_block = schema_block.replace(marker, marker + additions, 1)
        text = text[: lesson_schema.start(2)] + schema_block + text[lesson_schema.end(2) :]

    lesson_path = re.search(
        r'(\t\t\t"/api/lessons/\{slug\}": \{)(.*?)(?=\n\t\t\t"/api/exercises")',
        text,
        flags=re.DOTALL,
    )
    if not lesson_path:
        raise ValueError(f"{openapi_path} has no /api/lessons/{{slug}} operation")
    block = lesson_path.group(2)
    if 'name: "studentId"' not in block:
        marker = (
            '\t\t\t\t\t\t{\n'
            '\t\t\t\t\t\t\tname: "slug",\n'
            '\t\t\t\t\t\t\tin: "path",\n'
            '\t\t\t\t\t\t\trequired: true,\n'
            '\t\t\t\t\t\t\tschema: { type: "string" },\n'
            '\t\t\t\t\t\t},'
        )
        if marker not in block:
            raise ValueError(f"{openapi_path} lesson operation has no slug parameter")
        block = block.replace(
            marker,
            marker
            + '\n\t\t\t\t\t\t{\n'
            + '\t\t\t\t\t\t\tname: "studentId",\n'
            + '\t\t\t\t\t\t\tin: "query",\n'
            + '\t\t\t\t\t\t\trequired: false,\n'
            + "\t\t\t\t\t\t\tdescription: \"Used to return the learner's current teaching mode.\",\n"
            + '\t\t\t\t\t\t\tschema: { type: "string" },\n'
            + '\t\t\t\t\t\t},',
            1,
        )
        text = text[: lesson_path.start(2)] + block + text[lesson_path.end(2) :]

    final_schema = re.search(
        r'\t\t\t\tLesson: \{(.*?)(?=\n\t\t\t\tExercise: \{)',
        text,
        flags=re.DOTALL,
    )
    final_lesson = re.search(
        r'\t\t\t"/api/lessons/\{slug\}": \{(.*?)(?=\n\t\t\t"/api/exercises")',
        text,
        flags=re.DOTALL,
    )
    if (
        not final_schema
        or "teachingMode:" not in final_schema.group(1)
        or "teachingGuidance:" not in final_schema.group(1)
        or not final_lesson
        or 'name: "studentId"' not in final_lesson.group(1)
        or 'in: "query"' not in final_lesson.group(1)
    ):
        raise ValueError(f"{openapi_path} failed to install the mode-aware lesson schema")
    return write_if_changed(openapi_path, text) if text != original else False


def merge_runtime_dependencies(package_path: Path) -> bool:
    data = json.loads(package_path.read_text())
    dependencies = data.setdefault("dependencies", {})
    changed = False
    for name, spec in KIT_DEPENDENCIES.items():
        if dependencies.get(name) != spec:
            dependencies[name] = spec
            changed = True
    if not changed:
        return False
    return write_if_changed(package_path, json.dumps(data, indent=2) + "\n")


def ensure_npmrc(target: Path) -> bool:
    return write_if_changed(target / ".npmrc", NPMRC_CONTENTS)


def ensure_gitignore(target: Path) -> bool:
    path = target / ".gitignore"
    markers = {".school-data", ".school-data/"}
    if path.exists():
        lines = path.read_text().splitlines()
        if any(line.strip() in markers for line in lines):
            return False
        text = path.read_text()
        if text and not text.endswith("\n"):
            text += "\n"
        return write_if_changed(path, text + ".school-data/\n")
    return write_if_changed(path, ".school-data/\n")


def ensure_serve_executable(target: Path) -> None:
    serve = target / "script" / "serve"
    if not serve.is_file():
        return
    mode = serve.stat().st_mode
    serve.chmod(mode | stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH)


def install_runtime_dependencies(target: Path) -> None:
    subprocess.run(["npm", "install"], cwd=target, check=True)


def ensure_settings(target: Path) -> bool:
    settings_path = target / "school.settings.json"
    if settings_path.exists():
        return False
    return write_if_changed(
        settings_path,
        json.dumps({"teachingMode": "simple"}, indent=2) + "\n",
    )


def strip_ts_comments(text: str) -> str:
    out: list[str] = []
    i = 0
    n = len(text)
    while i < n:
        ch = text[i]
        nxt = text[i + 1] if i + 1 < n else ""
        if ch == "/" and nxt == "/":
            i += 2
            while i < n and text[i] != "\n":
                i += 1
            continue
        if ch == "/" and nxt == "*":
            i += 2
            while i + 1 < n and not (text[i] == "*" and text[i + 1] == "/"):
                i += 1
            i = min(n, i + 2)
            continue
        if ch in "\"'`":
            quote = ch
            out.append(ch)
            i += 1
            while i < n:
                out.append(text[i])
                if text[i] == "\\":
                    i += 1
                    if i < n:
                        out.append(text[i])
                        i += 1
                    continue
                if text[i] == quote:
                    i += 1
                    break
                i += 1
            continue
        out.append(ch)
        i += 1
    return "".join(out)


def is_island_chrome(target: Path) -> bool:
    config = target / "school.config.ts"
    if not config.is_file():
        return False
    source = strip_ts_comments(config.read_text())
    return bool(re.search(r'(?m)^\s*chrome\s*:\s*["\']island["\']\s*,?\s*$', source))


def apply(target: Path) -> list[str]:
    if not target.is_dir():
        raise ValueError(f"School directory does not exist: {target}")
    required = (
        target / "school.config.ts",
        target / "src/layouts/Base.astro",
        target / "src/pages/api/profile/[studentId].ts",
        target / "src/pages/api/openapi.json.ts",
    )
    missing = [str(path.relative_to(target)) for path in required if not path.exists()]
    if missing:
        raise ValueError(f"Not a School Template derived school; missing: {', '.join(missing)}")

    changed: list[str] = []
    if ensure_settings(target):
        changed.append("school.settings.json")
    package_changed = merge_runtime_dependencies(target / "package.json")
    if package_changed:
        changed.append("package.json")
    if ensure_npmrc(target):
        changed.append(".npmrc")
    if ensure_gitignore(target):
        changed.append(".gitignore")
    if add_teaching_mode_profile_field(target / "school.config.ts"):
        changed.append("school.config.ts (added profileFields.teachingMode)")

    for relative in OVERLAY_FILES:
        source = OVERLAY / relative
        destination = target / relative
        if write_if_changed(destination, source.read_text()):
            changed.append(str(relative))

    if patch_base_layout(target / "src/layouts/Base.astro"):
        changed.append("src/layouts/Base.astro")
    if patch_public_titles(target / "src/layouts/Base.astro"):
        changed.append("src/layouts/Base.astro (public titles)")
    if ensure_public_title_fields(target):
        changed.append("public title fields")
    homepage = target / "src/pages/index.astro"
    if homepage.exists() and patch_homepage(homepage):
        changed.append("src/pages/index.astro (removed synthetic enrollment completion)")
    openapi = target / "src/pages/api/openapi.json.ts"
    if patch_openapi(openapi):
        changed.append("src/pages/api/openapi.json.ts")
    spec = importlib.util.spec_from_file_location("localize_school", ROOT / "scripts/localize-school.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    changed.extend(module.apply_language(target))
    for leftover in LEGACY_RUNTIME_FILES:
        path = target / leftover
        if path.exists():
            path.unlink()
            changed.append(f"removed {leftover}")
    ensure_serve_executable(target)
    if package_changed:
        install_runtime_dependencies(target)
        changed.append("package-lock.json")
    if is_island_chrome(target):
        island_spec = importlib.util.spec_from_file_location(
            "apply_island_chrome", ROOT / "scripts/apply-island-chrome.py"
        )
        island_module = importlib.util.module_from_spec(island_spec)
        island_spec.loader.exec_module(island_module)
        changed.extend(island_module.apply_island(target))
    return changed


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("school", type=Path, help="Path to a School Template derived school")
    args = parser.parse_args()
    target = args.school if args.school.is_absolute() else ROOT / args.school
    try:
        changed = apply(target.resolve())
    except (OSError, ValueError, subprocess.CalledProcessError) as error:
        print(f"apply-school-kit: error: {error}", file=sys.stderr)
        return 1
    if changed:
        print(f"Applied School Kit to {target}:")
        for path in changed:
            print(f"  changed {path}")
    else:
        print(f"School Kit already applied to {target}; no changes.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
