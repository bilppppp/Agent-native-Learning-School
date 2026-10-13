"""Readable derivatives for common binary/web documents; originals remain untouched."""
import re
import sys
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlparse
from zipfile import ZipFile

GITHUB_NAME = re.compile(r"^[A-Za-z0-9._-]+$")

class ArticleText(HTMLParser):
    def __init__(self, collect_hrefs=False):
        super().__init__()
        self.skip = 0
        self.text = []
        self.hrefs = []
        self.collect_hrefs = collect_hrefs
    def handle_starttag(self, tag, attrs):
        if tag in ("script", "style", "noscript", "svg"):
            self.skip += 1
        if tag in ("p", "h1", "h2", "h3", "li", "pre", "br", "section", "article") and not self.skip:
            self.text.append("\n")
        if self.collect_hrefs and tag == "a" and not self.skip:
            for name, value in attrs:
                if name == "href" and value:
                    self.hrefs.append(value)
                    break
    def handle_endtag(self, tag):
        if tag in ("script", "style", "noscript", "svg"):
            self.skip = max(0, self.skip - 1)
        if tag in ("p", "li", "pre") and not self.skip:
            self.text.append("\n")
    def handle_data(self, data):
        if not self.skip:
            self.text.append(data)

def github_repo_url(href, base=None):
    if not href or any(ord(c) < 32 or c == "\x7f" for c in href):
        return None
    try:
        parsed = urlparse(urljoin(base, href) if base else href)
    except ValueError:
        return None
    scheme = parsed.scheme.lower()
    if scheme not in ("http", "https"):
        return None
    if parsed.username is not None or parsed.password is not None:
        return None
    if (parsed.hostname or "").lower() != "github.com":
        return None
    if parsed.port not in (None, 80 if scheme == "http" else 443):
        return None
    parts = parsed.path.split("/")
    if not parsed.path.startswith("/") or any(p == "" or p in (".", "..") for p in parts[1:]):
        return None
    segs = parts[1:]
    if len(segs) < 5 or segs[2] not in ("edit", "blob"):
        return None
    owner, repo = segs[0], segs[1][:-4] if segs[1].lower().endswith(".git") else segs[1]
    if owner in ("", ".", "..") or repo in ("", ".", "..") or "%" in owner or "%" in repo:
        return None
    if any(ord(c) < 32 or c == "\x7f" for c in owner + repo):
        return None
    if not GITHUB_NAME.fullmatch(owner) or not GITHUB_NAME.fullmatch(repo):
        return None
    return f"https://github.com/{owner.lower()}/{repo.lower()}"

def hint_github_repos(hrefs, base, single_page=True):
    seen = set()
    for href in hrefs:
        try:
            repo = github_repo_url(href, base)
        except Exception:
            continue
        if not repo or repo in seen:
            continue
        seen.add(repo)
        if single_page:
            print(f"提示：页面的编辑/源文件链接指向文档源码仓库 {repo}；如需多页文档，建议改用 --source {repo}。本次仍仅保存入口页。", file=sys.stderr, flush=True)
        else:
            print(f"提示：入口页的编辑/源文件链接指向文档源码仓库 {repo}。", file=sys.stderr, flush=True)

hints_only = "--github-hints-only" in sys.argv[1:]
argv = [a for a in sys.argv[1:] if a != "--github-hints-only"]
path = Path(argv[0])
kind = argv[1] if len(argv) > 1 else path.suffix.lower()
page_url = argv[2] if len(argv) > 2 else ""
hrefs = []
if kind == ".pdf":
    try:
        from pypdf import PdfReader
    except ImportError:
        raise SystemExit("PDF text extraction needs pypdf. Run: python3 -m pip install pypdf")
    text = "\n\n".join(f"## PDF page {i+1}\n{page.extract_text() or ''}" for i, page in enumerate(PdfReader(path).pages))
    if len(text.strip()) < 100:
        raise SystemExit("PDF has too little readable text (possibly scanned). Supply OCR/text; do not invent its contents.")
elif kind == ".docx":
    with ZipFile(path) as doc:
        xml = ET.fromstring(doc.read("word/document.xml"))
    ns = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
    text = "\n".join("".join(p.itertext()) for p in xml.findall(".//w:p", ns))
elif kind in (".html", ".htm"):
    parser = ArticleText(collect_hrefs=bool(page_url))
    parser.feed(path.read_text(errors="replace"))
    text = "\n".join(line.strip() for line in "".join(parser.text).splitlines() if line.strip())
    hrefs = parser.hrefs
else:
    raise SystemExit(f"Unsupported extraction format: {kind}")
if hints_only:
    if page_url:
        try:
            hint_github_repos(hrefs, page_url, single_page=False)
        except Exception:
            pass
    sys.exit(0)
out = path.with_name(path.name + ".txt")
out.write_text(text, encoding="utf-8")
if page_url:
    try:
        hint_github_repos(hrefs, page_url)
    except Exception:
        pass
print(out)
