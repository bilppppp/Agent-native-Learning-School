"""Wire fixed Template UI copy to the shared School Kit catalog, preserving page behavior."""
import html
import json
import os
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CATALOG = json.loads((ROOT / 'school-kit/overlay/src/lib/ui-messages.json').read_text())['en']
PAGES = ['src/layouts/Base.astro', 'src/pages/index.astro', 'src/pages/lessons/[slug].astro',
         'src/pages/exercises/index.astro', 'src/pages/exercises/[slug].astro',
         'src/pages/disenroll.astro', 'src/pages/troubleshooting.astro',
         'src/pages/glossary.astro', 'src/pages/404.astro']


def localize(path, target):
    original = path.read_text()
    front, body = original.split('---', 2)[1:]
    module = os.path.relpath(target / 'src/lib/ui', path.parent).replace(os.sep, '/')
    if not module.startswith('.'): module = './' + module
    if f'from "{module}"' not in front:
        names = 't, locale' if path.name == 'Base.astro' else 't'
        front += f'\nimport {{ {names} }} from "{module}";\n'

    def script(match):
        opening, code = match.group(1), match.group(2)
        kind = 'exercise' if '/exercises/' in str(path) else 'lesson'
        code = re.sub(r'function formatBannerText\(completion\) \{.*?\n      \}',
                      'function formatBannerText(completion) {\n        return window.schoolUI.completion("' + kind + '", completion);\n      }', code, flags=re.S)
        for key, value in CATALOG.items():
            literal = json.dumps(value, ensure_ascii=False)
            code = code.replace(literal, 'window.schoolUI.t("' + key + '")')
            if '…' in value:
                code = code.replace(json.dumps(value), 'window.schoolUI.t("' + key + '")')
        code = code.replace('"Saving..."', 'window.schoolUI.t("saving")')
        # Network error messages are implementation details; show a translated UI error.
        code = re.sub(r'err && err.message \? err.message : (window.schoolUI.t\("[^"]+"\))', r'\1', code)
        return opening + code + '</script>'

    body = body.replace('use OpenCode School again.', 'use this school again.')
    scripts = []
    def stash(match):
        scripts.append(script(match))
        return f'@@SCHOOL_SCRIPT_{len(scripts)-1}@@'
    body = re.sub(r'(<script\b[^>]*>)(.*?)</script>', stash, body, flags=re.S)
    # Localize text-only attributes; never change routes, selectors, internal values or API fields.
    for key, value in CATALOG.items():
        for attr in ['title', 'description', 'aria-label']:
            body = body.replace(f'{attr}="{value}"', f'{attr}={{t("{key}")}}')
    def text_node(match):
        value = match.group(1)
        normalized = re.sub(r'\s+', ' ', html.unescape(value)).strip()
        for key, en in CATALOG.items():
            if normalized == en.strip(): return '>{t("' + key + '")}<'
        for kind in ['lesson', 'exercise']:
            noun = kind.title()
            if normalized == noun + ' {' + kind + '.data.order}':
                return '>{t("' + kind + 'Number", { number: ' + kind + '.data.order })}<'
            if normalized == 'Next ' + kind + ': {next.data.title} →':
                return '>{t("next' + noun + '", { title: next.data.title })}<'
        if normalized.startswith('{config.description} ') and ('学习目标驱动' in normalized):
            return '>{config.description} {t("welcome")}<'
        if normalized.startswith('在上方注册') and ('Pi' in normalized):
            return '>{t("orientation")}<'
        return match.group(0)
    body = re.sub(r'>([^<>]+)<', text_node, body)
    # The same static strings occur between Astro expressions rather than HTML tags.
    body = body.replace('Next lesson: {next.data.title} &rarr;', '{t("nextLesson", { title: next.data.title })}')
    body = body.replace('Next exercise: {next.data.title} &rarr;', '{t("nextExercise", { title: next.data.title })}')
    for i, code in enumerate(scripts): body = body.replace(f'@@SCHOOL_SCRIPT_{i}@@', code)
    if path.name == 'Base.astro':
        body = body.replace('<html lang="en">', '<html lang={locale}>')
        if '<ClientUI />' not in body:
            front += '\nimport ClientUI from "../components/ClientUI.astro";\n'
            body = body.replace('  <head>', '  <head>\n    <ClientUI />', 1)
    updated = '---' + front + '---' + body
    if updated != original:
        path.write_text(updated)
        return True
    return False


def apply_language(target):
    changed = []
    for relative in PAGES:
        path = target / relative
        if path.exists() and localize(path, target): changed.append(relative)
    return changed
