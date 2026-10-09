"""Readable derivatives for common binary/web documents; originals remain untouched."""
import sys
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path
from zipfile import ZipFile

class ArticleText(HTMLParser):
    def __init__(self):
        super().__init__()
        self.skip = 0
        self.text = []
    def handle_starttag(self, tag, attrs):
        if tag in ("script", "style", "noscript", "svg"):
            self.skip += 1
        if tag in ("p", "h1", "h2", "h3", "li", "pre", "br", "section", "article") and not self.skip:
            self.text.append("\n")
    def handle_endtag(self, tag):
        if tag in ("script", "style", "noscript", "svg"):
            self.skip = max(0, self.skip - 1)
        if tag in ("p", "li", "pre") and not self.skip:
            self.text.append("\n")
    def handle_data(self, data):
        if not self.skip:
            self.text.append(data)

path = Path(sys.argv[1])
kind = sys.argv[2] if len(sys.argv) > 2 else path.suffix.lower()
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
    parser = ArticleText()
    parser.feed(path.read_text(errors="replace"))
    text = "\n".join(line.strip() for line in "".join(parser.text).splitlines() if line.strip())
else:
    raise SystemExit(f"Unsupported extraction format: {kind}")
out = path.with_name(path.name + ".txt")
out.write_text(text, encoding="utf-8")
print(out)
