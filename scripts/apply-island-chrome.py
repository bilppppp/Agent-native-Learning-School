"""Island chrome for schools that set chrome: \"island\" in school.config.ts."""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ISLAND = ROOT / "school-kit" / "island"

ISLAND_DEPENDENCIES = {
    "animal-island-ui": "^2.2.1",
    "@astrojs/react": "^5.0.7",
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "classnames": "^2.5.1",
    "@types/react": "^19.1.0",
    "@types/react-dom": "^19.1.0",
}

ISLAND_FILES = (
    (ISLAND / "island.css", Path("src/styles/island.css")),
    (ISLAND / "IslandProgress.tsx", Path("src/components/island/IslandProgress.tsx")),
    (ISLAND / "IslandCountUp.tsx", Path("src/components/island/IslandCountUp.tsx")),
)

DARK_SCRIPT = (
    "    <script is:inline>\n"
    '      if (window.matchMedia("(prefers-color-scheme: dark)").matches) {\n'
    '        document.documentElement.classList.add("dark");\n'
    "      }\n"
    '      window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {\n'
    '        document.documentElement.classList.toggle("dark", e.matches);\n'
    "      });\n"
    "    </script>\n"
)

THEME_APPLY_OLD = (
    "      window.__applySchoolTheme = function(themeName) {\n"
    "        var palette = window.__schoolThemePalettes[themeName] || window.__schoolThemePalettes.blue;\n"
    "        var root = document.documentElement;\n"
    '        root.style.setProperty("--theme-solid", palette.solid);\n'
    '        root.style.setProperty("--theme-solid-hover", palette.solidHover);\n'
    '        root.style.setProperty("--theme-link", palette.link);\n'
    '        root.style.setProperty("--theme-link-dark", palette.linkDark);\n'
    '        root.style.setProperty("--theme-soft-bg", palette.softBg);\n'
    '        root.style.setProperty("--theme-soft-border", palette.softBorder);\n'
    '        root.style.setProperty("--theme-soft-text", palette.softText);\n'
    '        root.style.setProperty("--theme-soft-bg-dark", palette.softBgDark);\n'
    '        root.style.setProperty("--theme-soft-border-dark", palette.softBorderDark);\n'
    '        root.style.setProperty("--theme-soft-text-dark", palette.softTextDark);\n'
    '        root.style.setProperty("--theme-card-text", palette.cardText);\n'
    "        root.dataset.themeColor = window.__schoolThemePalettes[themeName] ? themeName : \"blue\";\n"
    "      };"
)

THEME_APPLY_NEW = (
    "      window.__applySchoolTheme = function(themeName) {\n"
    "        var palette = window.__schoolThemePalettes[themeName] || window.__schoolThemePalettes.blue;\n"
    "        var root = document.documentElement;\n"
    "        void palette;\n"
    "        root.dataset.themeColor = window.__schoolThemePalettes[themeName] ? themeName : \"blue\";\n"
    "      };"
)

NAV_DELAY_HELPER = """
      function prefersIslandReducedMotion() {
        return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      }

      function afterIslandCelebration(url) {
        if (!url) return;
        if (prefersIslandReducedMotion()) {
          window.location.href = url;
          return;
        }
        var done = false;
        function finish() {
          if (done) return;
          done = true;
          window.location.href = url;
        }
        window.addEventListener("school:island-countup-done", finish, { once: true });
        setTimeout(finish, 4000);
      }

      function noteIslandLessonComplete() {
        window.__islandLessonJustCompleted = true;
        window.dispatchEvent(new CustomEvent("school:island-lesson-complete"));
      }
"""


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


def patch_island_astro_config(astro_path: Path) -> bool:
    text = astro_path.read_text()
    original = text
    if 'from "@astrojs/react"' not in text:
        marker = 'import mdx from "@astrojs/mdx";'
        if marker not in text:
            raise ValueError(f"{astro_path} has no MDX import")
        text = text.replace(marker, marker + '\nimport react from "@astrojs/react";', 1)
    if "react()" not in text:
        marker = "integrations: [mdx()]"
        if marker not in text:
            raise ValueError(f"{astro_path} has no mdx() integration list")
        text = text.replace(marker, "integrations: [mdx(), react()]", 1)
    text = text.replace('theme: "vesper"', 'theme: "github-light"')
    if 'noExternal: ["animal-island-ui"]' not in text or "resolve:" not in text:
        marker = "\t\tdefine: {"
        if marker not in text:
            raise ValueError(f"{astro_path} has no vite define block")
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
    return write_if_changed(astro_path, text) if text != original else False


def patch_island_base(base_path: Path) -> bool:
    text = base_path.read_text()
    original = text

    main_css = 'import "../styles/main.css";'
    island_css = 'import "../styles/island.css";'
    if island_css not in text:
        if main_css not in text:
            raise ValueError(f"{base_path} has no main.css import")
        text = text.replace(main_css, main_css + "\n" + island_css, 1)

    teaching = 'import TeachingMode from "../components/TeachingMode.astro";'
    island_imports = (
        teaching
        + "\nimport IslandProgress from \"../components/island/IslandProgress\";"
        + "\nimport IslandCountUp from \"../components/island/IslandCountUp\";"
        + "\nimport { Background, Title } from \"animal-island-ui\";"
    )
    if "IslandProgress" not in text:
        if teaching not in text:
            raise ValueError(f"{base_path} has no TeachingMode import")
        text = text.replace(teaching, island_imports, 1)

    if "const currentLessonSlug" not in text:
        marker = "const currentPath = Astro.url.pathname;"
        if marker not in text:
            raise ValueError(f"{base_path} has no currentPath")
        text = text.replace(
            marker,
            marker
            + '\nconst currentLessonSlug = (currentPath.match(/^\\/lessons\\/([^/]+)\\/?$/) || [])[1] || "";',
            1,
        )

    if 'data-chrome="island"' not in text:
        if '<html lang={locale}>' in text:
            text = text.replace('<html lang={locale}>', '<html lang={locale} data-chrome="island">', 1)
        elif '<html lang="en">' in text:
            text = text.replace('<html lang="en">', '<html lang="en" data-chrome="island">', 1)
        else:
            raise ValueError(f"{base_path} has no html lang tag")

    if 'name="color-scheme"' not in text:
        text = text.replace(
            '    <meta name="viewport" content="width=device-width, initial-scale=1" />\n',
            '    <meta name="viewport" content="width=device-width, initial-scale=1" />\n'
            '    <meta name="color-scheme" content="light" />\n',
            1,
        )

    if DARK_SCRIPT in text:
        text = text.replace(DARK_SCRIPT, "", 1)

    if 'root.style.setProperty("--theme-solid"' in text:
        if THEME_APPLY_OLD not in text:
            raise ValueError(f"{base_path} has an unsupported school theme applicator")
        text = text.replace(THEME_APPLY_OLD, THEME_APPLY_NEW, 1)

    if "island-page-bg" not in text:
        body_open = '  <body class="min-h-screen">\n    <div class="lg:flex">'
        if body_open not in text:
            raise ValueError(f"{base_path} has no expected body/flex shell")
        text = text.replace(
            body_open,
            '  <body class="min-h-screen">\n'
            '    <Background type="dots-gray" className="island-page-bg">\n'
            '    <div class="island-shell lg:flex">',
            1,
        )

    if 'class="island-mobile-brand"' not in text:
        mobile_classic = (
            '        <a href="/" class="font-mono font-bold text-lg">{config.name}</a>'
        )
        mobile_public = (
            '        <a href="/" class="font-mono font-bold text-lg">{courseShortName}</a>'
        )
        mobile = mobile_public if mobile_public in text else mobile_classic
        if mobile not in text:
            raise ValueError(f"{base_path} has no mobile school name link")
        text = text.replace(
            mobile,
            '        <a href="/" class="island-mobile-brand">'
            '\n          <Title color="app-teal" size="small">{courseShortName}</Title>'
            "\n        </a>",
            1,
        )

    if "island-school-title" not in text:
        sidebar_name = (
            '        <a href="/" class="block font-mono font-bold text-xl mb-6 px-3" '
            'data-school-name={courseShortName}>{courseShortName}</a>'
        )
        if sidebar_name not in text:
            sidebar_name = (
                '        <a href="/" class="block font-mono font-bold text-xl mb-6 px-3" '
                'data-school-name={config.name}>{config.name}</a>'
            )
        if sidebar_name not in text:
            raise ValueError(f"{base_path} has no sidebar school name link")
        text = text.replace(
            sidebar_name,
            '        <a href="/" class="block mb-4 px-1" data-school-name={courseShortName}>\n'
            '          <h1 class="island-school-title m-0 text-xl">\n'
            '            <Title color="app-teal" size="middle">{courseShortName}</Title>\n'
            "          </h1>\n"
            "        </a>\n"
            '        <div class="mb-6 px-1">\n'
            "          <IslandProgress client:load total={lessons.length} />\n"
            "        </div>",
            1,
        )

    if "island-rail" not in text:
        closer = "      </main>\n    </div>"
        if closer not in text:
            raise ValueError(f"{base_path} has no main/flex closer")
        text = text.replace(
            closer,
            "      </main>\n"
            '      <aside class="island-rail hidden xl:block w-72 shrink-0 sticky top-0 h-screen overflow-y-auto p-6">\n'
            "        <IslandCountUp client:load currentLessonSlug={currentLessonSlug} />\n"
            "      </aside>\n"
            "    </div>\n"
            "    </Background>",
            1,
        )

    return write_if_changed(base_path, text) if text != original else False


def patch_island_home(home_path: Path) -> bool:
    if not home_path.exists():
        return False
    text = home_path.read_text()
    original = text

    if 'from "animal-island-ui"' not in text:
        marker = 'import Base from "../layouts/Base.astro";'
        if marker not in text:
            raise ValueError(f"{home_path} has no Base import")
        text = text.replace(
            marker,
            marker + '\nimport { Title, Card, Button } from "animal-island-ui";',
            1,
        )

    old_card = (
        '    <div class="theme-card-band rounded-2xl overflow-hidden" '
        'style="aspect-ratio:85.6/54; position:relative; z-index:2;">\n'
        '      <div class="flex flex-col justify-between h-full px-7 py-5">\n'
        '        <p class="text-xs font-mono uppercase tracking-[0.3em] opacity-80">{t("studentId")}</p>\n'
        '        <p id="student-id-display" class="text-2xl font-mono font-bold tracking-tight"></p>\n'
        "      </div>\n"
        "    </div>"
    )
    new_card = (
        '    <Card color="app-teal" className="island-id-card" style={{ position: "relative", zIndex: 2 }}>\n'
        '      <div class="flex flex-col justify-between h-full px-7 py-5" style="aspect-ratio:85.6/54;">\n'
        '        <p class="text-xs font-mono uppercase tracking-[0.3em] opacity-80">{t("studentId")}</p>\n'
        '        <p id="student-id-display" class="text-2xl font-mono font-bold tracking-tight"></p>\n'
        "      </div>\n"
        "    </Card>"
    )
    if old_card in text:
        text = text.replace(old_card, new_card, 1)

    old_lessons = (
        '    <h2 class="text-sm font-mono uppercase tracking-wider text-gray-500 dark:text-gray-500 mb-4">{t("lessons")}</h2>'
    )
    if old_lessons in text:
        text = text.replace(
            old_lessons,
            '    <h2 class="mb-4"><Title color="brown" size="small">{t("lessons")}</Title></h2>',
            1,
        )

    old_how = "    <h2>{t(\"howItWorks\")}</h2>"
    if old_how in text:
        text = text.replace(
            old_how,
            '    <h2><Title color="brown" size="small">{t("howItWorks")}</Title></h2>',
            1,
        )

    enroll = (
        '      <button\n'
        '        type="button"\n'
        '        id="enroll-button"\n'
        '        class="rainbow-bg cursor-pointer rounded-lg px-10 py-4 font-mono font-semibold text-2xl disabled:opacity-50 disabled:cursor-not-allowed"\n'
        '      >{t("enroll")}</button>'
    )
    if enroll in text:
        text = text.replace(
            enroll,
            '      <span id="enroll-button" class="inline-block">\n'
            '        <Button type="primary" size="large">{t("chooseIdentity")}</Button>\n'
            "      </span>",
            1,
        )

    enroll_bottom = (
        '    <button\n'
        '      type="button"\n'
        '      id="enroll-button-bottom"\n'
        '      class="rainbow-bg cursor-pointer rounded-lg px-10 py-4 font-mono font-semibold text-2xl disabled:opacity-50 disabled:cursor-not-allowed"\n'
        '    >{t("enroll")}</button>'
    )
    if enroll_bottom in text:
        text = text.replace(
            enroll_bottom,
            '    <span id="enroll-button-bottom" class="inline-block">\n'
            '      <Button type="primary" size="large">{t("enroll")}</Button>\n'
            "    </span>",
            1,
        )

    text = install_learning_roles(text)
    return write_if_changed(home_path, text) if text != original else False


ROLE_FACES = (
    '    <div class="island-id-face is-selected" data-role="warrior">\n'
    '      <Card color="app-red" className="island-id-card" style={{ position: "relative", zIndex: 2 }}>\n'
    '        <div class="island-id-layout">\n'
    "          <div>\n"
    '            <p class="text-xs font-mono uppercase tracking-[0.3em] opacity-80">{t("studentId")}</p>\n'
    '            <p class="island-id-role">{t("roleWarrior")}</p>\n'
    '            <p class="island-id-value text-2xl font-mono font-bold tracking-tight"></p>\n'
    "          </div>\n"
    '          <span class="island-role-sprite island-role-sprite--warrior" aria-hidden="true"></span>\n'
    "        </div>\n"
    "      </Card>\n"
    "    </div>\n"
    '    <div class="island-id-face" data-role="wizard">\n'
    '      <Card color="purple" className="island-id-card" style={{ position: "relative", zIndex: 2 }}>\n'
    '        <div class="island-id-layout">\n'
    "          <div>\n"
    '            <p class="text-xs font-mono uppercase tracking-[0.3em] opacity-80">{t("studentId")}</p>\n'
    '            <p class="island-id-role">{t("roleWizard")}</p>\n'
    '            <p class="island-id-value text-2xl font-mono font-bold tracking-tight"></p>\n'
    "          </div>\n"
    '          <span class="island-role-sprite island-role-sprite--wizard" aria-hidden="true"></span>\n'
    "        </div>\n"
    "      </Card>\n"
    "    </div>\n"
    '    <div class="island-id-face" data-role="priest">\n'
    '      <Card color="app-yellow" className="island-id-card" style={{ position: "relative", zIndex: 2 }}>\n'
    '        <div class="island-id-layout">\n'
    "          <div>\n"
    '            <p class="text-xs font-mono uppercase tracking-[0.3em] opacity-80">{t("studentId")}</p>\n'
    '            <p class="island-id-role">{t("rolePriest")}</p>\n'
    '            <p class="island-id-value text-2xl font-mono font-bold tracking-tight"></p>\n'
    "          </div>\n"
    '          <span class="island-role-sprite island-role-sprite--priest" aria-hidden="true"></span>\n'
    "        </div>\n"
    "      </Card>\n"
    "    </div>\n"
    '    <div class="island-id-face" data-role="ranger">\n'
    '      <Card color="app-green" className="island-id-card" style={{ position: "relative", zIndex: 2 }}>\n'
    '        <div class="island-id-layout">\n'
    "          <div>\n"
    '            <p class="text-xs font-mono uppercase tracking-[0.3em] opacity-80">{t("studentId")}</p>\n'
    '            <p class="island-id-role">{t("roleRanger")}</p>\n'
    '            <p class="island-id-value text-2xl font-mono font-bold tracking-tight"></p>\n'
    "          </div>\n"
    '          <span class="island-role-sprite island-role-sprite--ranger" aria-hidden="true"></span>\n'
    "        </div>\n"
    "      </Card>\n"
    "    </div>"
)

ROLE_PICKER = (
    '      <p id="role-picker-copy" class="text-sm text-gray-600 dark:text-stone-400 mb-4">{t("chooseRole")}</p>\n'
    '      <div id="role-picker" class="island-role-picker not-prose">\n'
    '        <button type="button" class="island-role-option" data-role="warrior" aria-pressed="true" aria-label={t("roleWarrior")}>\n'
    '          <span class="island-role-sprite island-role-sprite--warrior" aria-hidden="true"></span>\n'
    '          <span class="island-role-name">{t("roleWarrior")}</span>\n'
    "        </button>\n"
    '        <button type="button" class="island-role-option" data-role="wizard" aria-pressed="false" aria-label={t("roleWizard")}>\n'
    '          <span class="island-role-sprite island-role-sprite--wizard" aria-hidden="true"></span>\n'
    '          <span class="island-role-name">{t("roleWizard")}</span>\n'
    "        </button>\n"
    '        <button type="button" class="island-role-option" data-role="priest" aria-pressed="false" aria-label={t("rolePriest")}>\n'
    '          <span class="island-role-sprite island-role-sprite--priest" aria-hidden="true"></span>\n'
    '          <span class="island-role-name">{t("rolePriest")}</span>\n'
    "        </button>\n"
    '        <button type="button" class="island-role-option" data-role="ranger" aria-pressed="false" aria-label={t("roleRanger")}>\n'
    '          <span class="island-role-sprite island-role-sprite--ranger" aria-hidden="true"></span>\n'
    '          <span class="island-role-name">{t("roleRanger")}</span>\n'
    "        </button>\n"
    "      </div>\n"
    '      <p class="island-role-confirm">{t("confirmRole")}</p>\n'
)

ROLE_SCRIPT = """      function setSelectedRole(role) {
        selectedRole = roleNames.indexOf(role) === -1 ? "warrior" : role;
        localStorage.setItem("learningRole", selectedRole);
        document.querySelectorAll(".island-id-face").forEach(function(face) {
          face.classList.toggle("is-selected", face.getAttribute("data-role") === selectedRole);
        });
        roleOptions.forEach(function(opt) {
          opt.setAttribute("aria-pressed", opt.getAttribute("data-role") === selectedRole ? "true" : "false");
        });
      }

      function setPickerState(message, disabled) {
        if (colorPickerCopy && message) colorPickerCopy.textContent = message;
        roleOptions.forEach(function(opt) {
          opt.disabled = disabled;
          opt.classList.toggle("opacity-60", disabled);
          opt.classList.toggle("cursor-not-allowed", disabled);
        });
      }

      // On page load: if already enrolled, show card + lesson list with fast cipher + celebration
      var existingId = window.school.getStudentId();
      setSelectedRole(selectedRole);
      if (existingId) {
        showEnrolled(existingId, true, true);
      }

      function submitEnrollment() {
        if (isSubmitting) return;
        isSubmitting = true;
        if (enrollError) enrollError.classList.add("hidden");
        if (stepButton) stepButton.classList.add("hidden");
        if (stepColor) stepColor.classList.remove("hidden");
        window.scrollTo({ top: 0, behavior: "smooth" });
        setPickerState(window.schoolUI.t("generatingId"), true);
        window.school.enroll().then(function(data) {
          showEnrolled(data.studentId, true, false);
        }).catch(function() {
          if (enrollError) enrollError.classList.remove("hidden");
          setPickerState(window.schoolUI.t("chooseRole"), false);
          isSubmitting = false;
        });
      }

      // The lower button enters with the selected character.
      if (enrollBtnBottom) {
        enrollBtnBottom.addEventListener("click", function() {
          submitEnrollment();
        });
      }

      // The upper button only opens the character picker.
      if (enrollBtn) {
        enrollBtn.addEventListener("click", function() {
          stepButton.classList.add("hidden");
          stepColor.classList.remove("hidden");
          setSelectedRole(selectedRole);
        });
      }

      roleOptions.forEach(function(opt) {
        opt.addEventListener("click", function() {
          if (isSubmitting) return;
          setSelectedRole(opt.getAttribute("data-role"));
        });
      });
"""


def install_learning_roles(text: str) -> str:
    """Replace the theme-color picker with four animated character choices."""
    teal_card = (
        '    <Card color="app-teal" className="island-id-card" style={{ position: "relative", zIndex: 2 }}>\n'
        '      <div class="flex flex-col justify-between h-full px-7 py-5" style="aspect-ratio:85.6/54;">\n'
        '        <p class="text-xs font-mono uppercase tracking-[0.3em] opacity-80">{t("studentId")}</p>\n'
        '        <p id="student-id-display" class="text-2xl font-mono font-bold tracking-tight"></p>\n'
        "      </div>\n"
        "    </Card>"
    )
    if 'class="island-id-face"' not in text:
        if teal_card not in text:
            raise ValueError("island homepage has no identity card for a learning role")
        text = text.replace(teal_card, ROLE_FACES, 1)

    picker_start = text.find('      <p id="color-picker-copy"')
    if picker_start >= 0:
        picker_end = text.find('      <p id="enroll-error"', picker_start)
        if picker_end < 0:
            raise ValueError("island homepage color picker has no enroll error")
        text = text[:picker_start] + ROLE_PICKER + text[picker_end:]
    elif 'id="role-picker"' not in text:
        raise ValueError("island homepage has neither a color picker nor a role picker")

    display_decl = (
        '      var colorPickerCopy = document.getElementById("color-picker-copy");\n'
        '      var enrollError     = document.getElementById("enroll-error");\n'
        '      var display         = document.getElementById("student-id-display");'
    )
    paint_decl = (
        '      var colorPickerCopy = document.getElementById("role-picker-copy");\n'
        '      var enrollError     = document.getElementById("enroll-error");\n'
        "      function paintId(value) {\n"
        '        document.querySelectorAll(".island-id-value").forEach(function(node) {\n'
        "          node.textContent = value;\n"
        "        });\n"
        "      }"
    )
    if display_decl in text:
        text = text.replace(display_decl, paint_decl, 1)
        text = re.sub(r"display\.textContent = ([^;]+);", r"paintId(\1);", text)
    elif "function paintId(" not in text:
        raise ValueError("island homepage enroll script has no identity display")

    celebration = (
        "        var palettes = window.school.getThemePalettes();\n"
        "        var palette = palettes[window.school.getThemeColor()] || palettes.blue;\n"
        "        var colors = [palette.solid, palette.solidHover, palette.linkDark, palette.softText, palette.softTextDark];"
    )
    role_celebration = (
        "        var roleColors = {\n"
        '          warrior: ["#b91c1c", "#fb7185", "#fdba74", "#fff7ed"],\n'
        '          wizard: ["#6d28d9", "#c4b5fd", "#818cf8", "#f5f3ff"],\n'
        '          priest: ["#ca8a04", "#fde68a", "#fffbeb", "#fef3c7"],\n'
        '          ranger: ["#15803d", "#86efac", "#fef08a", "#ecfccb"]\n'
        "        };\n"
        "        var colors = roleColors[selectedRole] || roleColors.warrior;"
    )
    if celebration in text:
        text = text.replace(celebration, role_celebration, 1)

    theme_state = (
        "      var colorOptions = Array.prototype.slice.call(\n"
        '        document.querySelectorAll(".enrollment-color-option[data-theme-color]")\n'
        "      );\n"
        "\n"
        "      var selectedTheme = window.school.getThemeColor();\n"
    )
    role_state = (
        "      var roleOptions = Array.prototype.slice.call(\n"
        '        document.querySelectorAll(".island-role-option[data-role]")\n'
        "      );\n"
        '      var roleNames = ["warrior", "wizard", "priest", "ranger"];\n'
        "\n"
        "      function readRole() {\n"
        '        var saved = localStorage.getItem("learningRole");\n'
        '        return roleNames.indexOf(saved) === -1 ? "warrior" : saved;\n'
        "      }\n"
        "\n"
        "      var selectedRole = readRole();\n"
    )
    if theme_state in text:
        text = text.replace(theme_state, role_state, 1)
    elif "function readRole()" not in text:
        raise ValueError("island homepage enroll script has no theme or role state")

    handler_start = text.find("      function setSelectedTheme(themeName) {")
    if handler_start >= 0:
        handler_end = text.find("    })();", handler_start)
        if handler_end < 0:
            raise ValueError("island homepage enroll script has no closing call")
        text = text[:handler_start] + ROLE_SCRIPT + text[handler_end:]
    elif "click a character → enroll" in text:
        handler_start = text.find("      function setSelectedRole(role) {")
        handler_end = text.find("    })();", handler_start)
        if handler_start < 0 or handler_end < 0:
            raise ValueError("island homepage role handler could not be updated")
        text = text[:handler_start] + ROLE_SCRIPT + text[handler_end:]
    elif "function setSelectedRole(" not in text:
        raise ValueError("island homepage enroll script has no theme or role handler")

    top_enroll = (
        '      <span id="enroll-button" class="inline-block">\n'
        '        <Button type="primary" size="large">{t("enroll")}</Button>\n'
        "      </span>"
    )
    top_choose = (
        '      <span id="enroll-button" class="inline-block">\n'
        '        <Button type="primary" size="large">{t("chooseIdentity")}</Button>\n'
        "      </span>"
    )
    if top_enroll in text:
        text = text.replace(top_enroll, top_choose, 1)
    if "island-role-confirm" not in text and '      <p id="enroll-error"' in text:
        text = text.replace(
            '      <p id="enroll-error"',
            '      <p class="island-role-confirm">{t("confirmRole")}</p>\n      <p id="enroll-error"',
            1,
        )
    return text


def merge_role_messages(path: Path) -> bool:
    text = path.read_text()
    original = text
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
        raise ValueError(f"{path} is missing chooseRole after the island message merge")
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
    return write_if_changed(path, text) if text != original else False


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


def patch_island_lesson(lesson_path: Path) -> bool:
    if not lesson_path.exists():
        return False
    text = lesson_path.read_text()
    original = text

    if 'from "animal-island-ui"' not in text:
        marker = 'import AgentPrompt from "../../components/AgentPrompt.astro";'
        if marker not in text:
            raise ValueError(f"{lesson_path} has no AgentPrompt import")
        text = text.replace(
            marker,
            marker + '\nimport { Title } from "animal-island-ui";',
            1,
        )

    old_h1 = '    <h1 class="text-3xl font-bold">{lesson.data.title}</h1>'
    if old_h1 in text:
        text = text.replace(
            old_h1,
            '    <h1 class="island-lesson-title"><Title color="brown" size="middle">{lesson.data.title}</Title></h1>',
            1,
        )
    text = text.replace(
        '<h1 class="island-lesson-title text-3xl font-bold"><Title color="brown" size="large">',
        '<h1 class="island-lesson-title"><Title color="brown" size="middle">',
    )

    if "afterIslandCelebration" not in text:
        if "var wasAlreadyComplete = window.school.isLessonComplete(lessonSlug);" not in text:
            raise ValueError(f"{lesson_path} has no wasAlreadyComplete marker")
        text = text.replace(
            "      var wasAlreadyComplete = window.school.isLessonComplete(lessonSlug);\n",
            "      var wasAlreadyComplete = window.school.isLessonComplete(lessonSlug);\n"
            + NAV_DELAY_HELPER,
            1,
        )

        old_agent = (
            "            if (!wasAlreadyComplete && agentOnlyNext) {\n"
            "              window.location.href = agentOnlyNext.getAttribute(\"href\");\n"
            "            }"
        )
        if old_agent not in text:
            raise ValueError(f"{lesson_path} has no agent-only auto-navigation")
        text = text.replace(
            old_agent,
            "            if (!wasAlreadyComplete && agentOnlyNext) {\n"
            "              noteIslandLessonComplete();\n"
            "              afterIslandCelebration(agentOnlyNext.getAttribute(\"href\"));\n"
            "            }",
            1,
        )

        old_set = (
            "      function setCompleted() {\n"
            "        showBanner();\n"
            "        if (nextUrl) {\n"
            "          window.location.href = nextUrl;\n"
            "        } else {\n"
            "          label.textContent = window.schoolUI.t(\"lessonComplete\");\n"
            "          btn.disabled = true;\n"
            "        }\n"
            "      }"
        )
        if old_set not in text:
            raise ValueError(f"{lesson_path} has no setCompleted helper")
        text = text.replace(
            old_set,
            "      function setCompleted() {\n"
            "        showBanner();\n"
            "        noteIslandLessonComplete();\n"
            "        if (nextUrl) {\n"
            "          afterIslandCelebration(nextUrl);\n"
            "        } else {\n"
            "          label.textContent = window.schoolUI.t(\"lessonComplete\");\n"
            "          btn.disabled = true;\n"
            "        }\n"
            "      }",
            1,
        )

    return write_if_changed(lesson_path, text) if text != original else False


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


def patch_island_teaching_mode(path: Path) -> bool:
    text = path.read_text()
    if "island-mode-panel" in text:
        return False
    old = (
        '  class="mb-8 rounded-xl border border-gray-200 bg-gray-50/70 p-5 dark:border-stone-800 dark:bg-stone-900/50"'
    )
    if old not in text:
        raise ValueError(f"{path} has an unsupported TeachingMode panel class")
    return write_if_changed(
        path,
        text.replace(old, '  class="mb-8 rounded-xl island-mode-panel p-5"', 1),
    )


def patch_island_agent_prompt(path: Path) -> bool:
    text = path.read_text()
    original = text
    if "island-prompt-card" not in text:
        old = 'class="agent-prompt-card hidden mb-8"'
        if old not in text:
            raise ValueError(f"{path} has no agent-prompt-card class")
        text = text.replace(old, 'class="agent-prompt-card island-prompt-card hidden mb-8"', 1)
    old_font = "  font-family: var(--font-sans), ui-sans-serif, system-ui, sans-serif;"
    new_font = (
        '  font-family: "PingFang SC", "Noto Sans SC", "Microsoft YaHei", '
        "ui-sans-serif, system-ui, sans-serif;"
    )
    if old_font in text:
        text = text.replace(old_font, new_font)
    return write_if_changed(path, text) if text != original else False


def apply_island(target: Path) -> list[str]:
    changed: list[str] = []
    school_ts = target / "src/lib/school.ts"
    if school_ts.exists() and ensure_island_config_type(school_ts):
        changed.append("src/lib/school.ts")

    package_changed = merge_island_dependencies(target / "package.json")
    if package_changed:
        changed.append("package.json")

    for source, relative in ISLAND_FILES:
        if write_if_changed(target / relative, source.read_text()):
            changed.append(str(relative))
    for name in ("warrior.png", "wizard.png", "priest.png", "ranger.png", "NOTICE.txt"):
        source = ISLAND / "roles" / name
        relative = Path("public/roles") / name
        payload = source.read_bytes()
        if write_bytes_if_changed(target / relative, payload):
            changed.append(str(relative))

    if patch_island_astro_config(target / "astro.config.mjs"):
        changed.append("astro.config.mjs")
    if patch_island_base(target / "src/layouts/Base.astro"):
        changed.append("src/layouts/Base.astro")
    home = target / "src/pages/index.astro"
    if patch_island_home(home):
        changed.append("src/pages/index.astro")
    lesson = target / "src/pages/lessons/[slug].astro"
    if patch_island_lesson(lesson):
        changed.append("src/pages/lessons/[slug].astro")
    changed.extend(patch_island_heading_pages(target))
    if patch_island_teaching_mode(target / "src/components/TeachingMode.astro"):
        changed.append("src/components/TeachingMode.astro")
    if patch_island_agent_prompt(target / "src/components/AgentPrompt.astro"):
        changed.append("src/components/AgentPrompt.astro")
    messages = target / "src/lib/ui-messages.json"
    if messages.exists() and merge_role_messages(messages):
        changed.append("src/lib/ui-messages.json")
    if patch_island_disenroll(target / "src/pages/disenroll.astro"):
        changed.append("src/pages/disenroll.astro")

    if package_changed:
        import subprocess

        subprocess.run(["npm", "install"], cwd=target, check=True)
        changed.append("package-lock.json")
    return changed
