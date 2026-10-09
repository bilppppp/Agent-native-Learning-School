#!/usr/bin/env python3
"""Apply the reusable School Kit overlay to one School Template derived school."""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OVERLAY = ROOT / "school-kit" / "overlay"

OVERLAY_FILES = (
    Path("src/components/AgentPrompt.astro"),
    Path("src/components/TeachingMode.astro"),
    Path("src/lib/teaching.ts"),
    Path("src/pages/api/lessons/[slug].ts"),
    Path("src/pages/harness/pi.txt.ts"),
    Path("src/pages/llms.txt.ts"),
)


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

    return write_if_changed(base_path, text) if text != original else False


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


def ensure_settings(target: Path) -> bool:
    settings_path = target / "school.settings.json"
    if settings_path.exists():
        return False
    return write_if_changed(
        settings_path,
        json.dumps({"teachingMode": "simple"}, indent=2) + "\n",
    )


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
    if add_teaching_mode_profile_field(target / "school.config.ts"):
        changed.append("school.config.ts (added profileFields.teachingMode)")

    for relative in OVERLAY_FILES:
        source = OVERLAY / relative
        destination = target / relative
        if write_if_changed(destination, source.read_text()):
            changed.append(str(relative))

    if patch_base_layout(target / "src/layouts/Base.astro"):
        changed.append("src/layouts/Base.astro")
    homepage = target / "src/pages/index.astro"
    if homepage.exists() and patch_homepage(homepage):
        changed.append("src/pages/index.astro (removed synthetic enrollment completion)")
    openapi = target / "src/pages/api/openapi.json.ts"
    if patch_openapi(openapi):
        changed.append("src/pages/api/openapi.json.ts")
    return changed


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("school", type=Path, help="Path to a School Template derived school")
    args = parser.parse_args()
    target = args.school if args.school.is_absolute() else ROOT / args.school
    try:
        changed = apply(target.resolve())
    except (OSError, ValueError) as error:
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
