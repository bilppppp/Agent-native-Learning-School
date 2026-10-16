"""Island chrome for schools that set chrome: \"island\" in school.config.ts."""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ISLAND = ROOT / "school-kit" / "island"
OVERLAY = ROOT / "school-kit" / "overlay"

ISLAND_DEPENDENCIES = {
    "animal-island-ui": "^2.2.1",
    "@astrojs/react": "^5.0.7",
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "classnames": "^2.5.1",
    "@types/react": "^19.1.0",
    "@types/react-dom": "^19.1.0",
    "naive-icons": "^1.6.0",
}

ISLAND_ASTRO_FILES = (
    (ISLAND / "layouts" / "Base.astro", Path("src/layouts/Base.astro")),
    (ISLAND / "pages" / "index.astro", Path("src/pages/index.astro")),
    (ISLAND / "pages" / "lessons" / "[slug].astro", Path("src/pages/lessons/[slug].astro")),
    (ISLAND / "components" / "TeachingMode.astro", Path("src/components/TeachingMode.astro")),
    (ISLAND / "components" / "AgentPrompt.astro", Path("src/components/AgentPrompt.astro")),
)

ISLAND_RUNTIME_FILES = (
    (ISLAND / "island.css", Path("src/styles/island.css")),
    (ISLAND / "IslandProgress.tsx", Path("src/components/island/IslandProgress.tsx")),
    (ISLAND / "IslandCountUp.tsx", Path("src/components/island/IslandCountUp.tsx")),
    (ISLAND / "IslandShell.tsx", Path("src/components/island/IslandShell.tsx")),
    (ISLAND / "IslandSignals.tsx", Path("src/components/island/IslandSignals.tsx")),
    (ISLAND / "IslandMark.tsx", Path("src/components/island/IslandMark.tsx")),
    (ISLAND / "IslandClock.tsx", Path("src/components/island/IslandClock.tsx")),
    (ISLAND / "IslandTypewriter.tsx", Path("src/components/island/IslandTypewriter.tsx")),
    (ISLAND / "IslandLessonBoard.tsx", Path("src/components/island/IslandLessonBoard.tsx")),
    (ISLAND / "IslandPrefs.tsx", Path("src/components/island/IslandPrefs.tsx")),
    (ISLAND / "IslandCast.tsx", Path("src/components/island/IslandCast.tsx")),
    (ISLAND / "IslandModeTip.tsx", Path("src/components/island/IslandModeTip.tsx")),
    (ISLAND / "IslandLessonChrome.tsx", Path("src/components/island/IslandLessonChrome.tsx")),
    (ISLAND / "IslandPageIcon.tsx", Path("src/components/island/IslandPageIcon.tsx")),
    (ISLAND / "IslandPromptNotice.tsx", Path("src/components/island/IslandPromptNotice.tsx")),
    (ISLAND / "LessonTabs.tsx", Path("src/components/island/LessonTabs.tsx")),
    (ISLAND / "island-icons.ts", Path("src/components/island/island-icons.ts")),
)


def write_if_changed(path: Path, content: str) -> bool:
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists() and path.read_text() == content:
        return False
    path.write_text(content)
    return True


def write_bytes_if_changed(path: Path, content: bytes) -> bool:
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists() and path.read_bytes() == content:
        return False
    path.write_bytes(content)
    return True


def ensure_island_config_type(school_ts: Path) -> bool:
    text = school_ts.read_text()
    if re.search(r'chrome\?\s*:\s*"island"', text):
        return False
    marker = "export interface SchoolConfig {\n"
    if marker not in text:
        raise ValueError(f"{school_ts} has no SchoolConfig interface")
    return write_if_changed(school_ts, text.replace(marker, marker + '\tchrome?: "island";\n', 1))


def merge_island_dependencies(package_path: Path) -> bool:
    data = json.loads(package_path.read_text())
    dependencies = data.setdefault("dependencies", {})
    changed = False
    for name, spec in ISLAND_DEPENDENCIES.items():
        if dependencies.get(name) != spec:
            dependencies[name] = spec
            changed = True
    if not changed:
        return False
    return write_if_changed(package_path, json.dumps(data, indent=2) + "\n")


def island_astro_config_text(source: str) -> str:
    text = source
    if 'from "@astrojs/react"' not in text:
        marker = 'import mdx from "@astrojs/mdx";'
        if marker not in text:
            raise ValueError("astro config has no MDX import")
        text = text.replace(marker, marker + '\nimport react from "@astrojs/react";', 1)
    if "react()" not in text:
        marker = "integrations: [mdx()]"
        if marker not in text:
            raise ValueError("astro config has no mdx() integration list")
        text = text.replace(marker, "integrations: [mdx(), react()]", 1)
    text = text.replace('theme: "vesper"', 'theme: "github-light"')
    if 'noExternal: ["animal-island-ui"]' not in text or "resolve:" not in text:
        marker = "\t\tdefine: {"
        if marker not in text:
            raise ValueError("astro config has no vite define block")
        if "ssr: {" in text and 'noExternal: ["animal-island-ui"]' in text:
            text = text.replace(
                '\t\tssr: {\n\t\t\tnoExternal: ["animal-island-ui"],\n\t\t},\n',
                '\t\tssr: {\n\t\t\tnoExternal: ["animal-island-ui"],\n\t\t},\n'
                '\t\tresolve: {\n\t\t\tnoExternal: ["animal-island-ui"],\n\t\t},\n',
                1,
            )
        else:
            text = text.replace(
                marker,
                '\t\tssr: {\n\t\t\tnoExternal: ["animal-island-ui"],\n\t\t},\n'
                '\t\tresolve: {\n\t\t\tnoExternal: ["animal-island-ui"],\n\t\t},\n'
                + marker,
                1,
            )
    return text


def patch_island_astro_config(astro_path: Path, source: str | None = None) -> bool:
    text = island_astro_config_text(source if source is not None else astro_path.read_text())
    return write_if_changed(astro_path, text)


def role_messages_text(source: str) -> str:
    text = source
    additions = (
        (
            '    "chooseColor": "Choose a color for your student ID card and site theme.",\n'
            '    "generatingId":',
            '    "chooseColor": "Choose a color for your student ID card and site theme.",\n'
            '    "chooseRole": "Choose a character.",\n'
            '    "roleWarrior": "Warrior",\n'
            '    "roleWizard": "Wizard",\n'
            '    "rolePriest": "Priest",\n'
            '    "roleRanger": "Ranger",\n'
            '    "chooseIdentity": "Choose identity",\n'
            '    "confirmRole": "Then use Start learning below to enter.",\n'
            '    "generatingId":',
        ),
        (
            '    "chooseColor": "为学习身份卡和网站主题选择一种颜色。",\n'
            '    "generatingId":',
            '    "chooseColor": "为学习身份卡和网站主题选择一种颜色。",\n'
            '    "chooseRole": "选择你的角色。",\n'
            '    "roleWarrior": "战士",\n'
            '    "roleWizard": "巫师",\n'
            '    "rolePriest": "牧师",\n'
            '    "roleRanger": "游侠",\n'
            '    "chooseIdentity": "选择身份",\n'
            '    "confirmRole": "选好后，点击下方的开始学习进入课程。",\n'
            '    "generatingId":',
        ),
        (
            '    "disenrollDescriptionLong": "Remove your student ID, progress, and theme color from this browser. Your data on the server is not affected. You will need to re-enroll to use this school again.",',
            '    "disenrollDescriptionLong": "Remove your student ID, progress, and chosen character from this browser. Your data on the server is not affected. You will need to re-enroll to use this school again.",',
        ),
        (
            '    "disenrollDescriptionLong": "移除本浏览器中的学习身份、缓存进度与主题颜色，服务器数据不会删除。再次学习时需要重新注册或恢复原身份。",',
            '    "disenrollDescriptionLong": "移除本浏览器中的学习身份、缓存进度与所选角色，服务器数据不会删除。再次学习时需要重新注册或恢复原身份。",',
        ),
    )
    for old, new in additions:
        if old in text:
            text = text.replace(old, new, 1)
    if '"chooseRole"' not in text:
        raise ValueError("ui-messages.json is missing chooseRole after the island message merge")
    identity_lines = (
        (
            '    "chooseRole": "Choose a character.",\n',
            '    "chooseRole": "Choose a character.",\n'
            '    "chooseIdentity": "Choose identity",\n'
            '    "confirmRole": "Then use Start learning below to enter.",\n',
        ),
        (
            '    "chooseRole": "选择你的角色。",\n',
            '    "chooseRole": "选择你的角色。",\n'
            '    "chooseIdentity": "选择身份",\n'
            '    "confirmRole": "选好后，点击下方的开始学习进入课程。",\n',
        ),
    )
    if '"chooseIdentity"' not in text:
        for old, new in identity_lines:
            if old in text:
                text = text.replace(old, new, 1)
    return text


def merge_role_messages(path: Path, source: str | None = None) -> bool:
    text = role_messages_text(source if source is not None else path.read_text())
    return write_if_changed(path, text)


def patch_island_disenroll(path: Path) -> bool:
    if not path.exists():
        return False
    text = path.read_text()
    if 'localStorage.removeItem("learningRole")' in text:
        return False
    needle = '        localStorage.removeItem("themeColor");\n'
    if needle not in text:
        raise ValueError(f"{path} has no themeColor removal")
    return write_if_changed(
        path,
        text.replace(needle, needle + '        localStorage.removeItem("learningRole");\n', 1),
    )


def patch_island_heading_pages(target: Path) -> list[str]:
    changed: list[str] = []
    pages = {
        Path("src/pages/exercises/[slug].astro"): "{exercise.data.title}",
        Path("src/pages/exercises/index.astro"): '{t("exercises")}',
        Path("src/pages/troubleshooting.astro"): '{t("troubleshooting")}',
        Path("src/pages/disenroll.astro"): '{t("disenroll")}',
        Path("src/pages/glossary.astro"): '{t("glossary")}',
    }
    for relative, title_expr in pages.items():
        path = target / relative
        if not path.exists():
            continue
        text = path.read_text()
        original = text
        old = f'    <h1 class="text-3xl font-bold">{title_expr}</h1>'
        if old in text and "island-lesson-title" not in text:
            if 'from "animal-island-ui"' not in text:
                if 'import Base from "../../layouts/Base.astro";' in text:
                    text = text.replace(
                        'import Base from "../../layouts/Base.astro";',
                        'import Base from "../../layouts/Base.astro";\nimport { Title } from "animal-island-ui";',
                        1,
                    )
                elif 'import Base from "../layouts/Base.astro";' in text:
                    text = text.replace(
                        'import Base from "../layouts/Base.astro";',
                        'import Base from "../layouts/Base.astro";\nimport { Title } from "animal-island-ui";',
                        1,
                    )
            text = text.replace(
                old,
                f'    <h1 class="island-lesson-title"><Title color="brown" size="middle">{title_expr}</Title></h1>',
                1,
            )
        text = text.replace(
            '<h1 class="island-lesson-title text-3xl font-bold"><Title color="brown" size="large">',
            '<h1 class="island-lesson-title"><Title color="brown" size="middle">',
        )
        if text != original and write_if_changed(path, text):
            changed.append(str(relative))
    return changed


def install_island_shell(target: Path) -> list[str]:
    changed: list[str] = []
    for source, relative in ISLAND_ASTRO_FILES + ISLAND_RUNTIME_FILES:
        if write_if_changed(target / relative, source.read_text()):
            changed.append(str(relative))
    for name in ("warrior.png", "wizard.png", "priest.png", "ranger.png", "NOTICE.txt"):
        source = ISLAND / "roles" / name
        relative = Path("public/roles") / name
        if write_bytes_if_changed(target / relative, source.read_bytes()):
            changed.append(str(relative))
    return changed


def apply_island(target: Path) -> list[str]:
    changed: list[str] = []
    school_ts = target / "src/lib/school.ts"
    if school_ts.exists() and ensure_island_config_type(school_ts):
        changed.append("src/lib/school.ts")

    if merge_island_dependencies(target / "package.json"):
        changed.append("package.json")

    overlay_astro = OVERLAY / "astro.config.mjs"
    if patch_island_astro_config(target / "astro.config.mjs", overlay_astro.read_text()):
        changed.append("astro.config.mjs")

    overlay_messages = OVERLAY / "src/lib/ui-messages.json"
    messages = target / "src/lib/ui-messages.json"
    if overlay_messages.exists() and merge_role_messages(messages, overlay_messages.read_text()):
        changed.append("src/lib/ui-messages.json")

    if patch_island_disenroll(target / "src/pages/disenroll.astro"):
        changed.append("src/pages/disenroll.astro")
    changed.extend(patch_island_heading_pages(target))
    changed.extend(install_island_shell(target))
    return changed
