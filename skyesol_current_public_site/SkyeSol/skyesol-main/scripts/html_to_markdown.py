#!/usr/bin/env python3
from __future__ import annotations

import argparse
import html
import re
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import quote


BLOCK_TAGS = {
    "address", "article", "aside", "blockquote", "br", "dd", "div", "dl", "dt",
    "figcaption", "figure", "footer", "form", "h1", "h2", "h3", "h4", "h5", "h6",
    "header", "hr", "li", "main", "nav", "ol", "p", "pre", "section", "table",
    "tbody", "td", "tfoot", "th", "thead", "tr", "ul"
}

SKIP_TAGS = {"script", "style", "svg", "canvas", "noscript"}


def clean_space(value: str) -> str:
    value = html.unescape(value)
    value = re.sub(r"\s+", " ", value)
    return value.strip()


def slug_url(path: Path) -> str:
    return "/".join(quote(part) for part in path.parts)


class HeadParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.in_title = False
        self.title_parts: list[str] = []
        self.description = ""
        self.canonical = ""
        self.h1 = ""
        self._heading_capture = ""
        self._in_h1 = False

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attrs_map = {k.lower(): v or "" for k, v in attrs}
        if tag == "title":
            self.in_title = True
        if tag == "meta" and attrs_map.get("name", "").lower() == "description":
            self.description = clean_space(attrs_map.get("content", ""))
        if tag == "link" and attrs_map.get("rel", "").lower() == "canonical":
            self.canonical = clean_space(attrs_map.get("href", ""))
        if tag == "h1" and not self.h1:
            self._in_h1 = True
            self._heading_capture = ""

    def handle_endtag(self, tag: str) -> None:
        if tag == "title":
            self.in_title = False
        if tag == "h1" and self._in_h1:
            self.h1 = clean_space(self._heading_capture)
            self._in_h1 = False

    def handle_data(self, data: str) -> None:
        if self.in_title:
            self.title_parts.append(data)
        if self._in_h1:
            self._heading_capture += data

    @property
    def title(self) -> str:
        return clean_space(" ".join(self.title_parts))


class MarkdownParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.parts: list[str] = []
        self.skip_depth = 0
        self.link_stack: list[str] = []

    def push_break(self, count: int = 2) -> None:
        if not self.parts:
            return
        text = "".join(self.parts).rstrip()
        self.parts = [text + ("\n" * count)]

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag in SKIP_TAGS:
            self.skip_depth += 1
            return
        if self.skip_depth:
            return

        attrs_map = {k.lower(): v or "" for k, v in attrs}
        if tag in {"h1", "h2", "h3", "h4", "h5", "h6"}:
            self.push_break()
            self.parts.append("#" * int(tag[1]) + " ")
        elif tag == "li":
            self.push_break(1)
            self.parts.append("- ")
        elif tag == "blockquote":
            self.push_break()
            self.parts.append("> ")
        elif tag == "br":
            self.parts.append("\n")
        elif tag == "hr":
            self.push_break()
            self.parts.append("---\n\n")
        elif tag == "a":
            self.link_stack.append(attrs_map.get("href", ""))
            self.parts.append("[")
        elif tag in BLOCK_TAGS:
            self.push_break()

    def handle_endtag(self, tag: str) -> None:
        if tag in SKIP_TAGS and self.skip_depth:
            self.skip_depth -= 1
            return
        if self.skip_depth:
            return

        if tag == "a" and self.link_stack:
            href = self.link_stack.pop()
            self.parts.append(f"]({href})" if href else "]")
        elif tag in {"h1", "h2", "h3", "h4", "h5", "h6", "p", "section", "article", "div", "ul", "ol"}:
            self.push_break()

    def handle_data(self, data: str) -> None:
        if self.skip_depth:
            return
        text = clean_space(data)
        if not text:
            return
        if self.parts and not self.parts[-1].endswith((" ", "\n", "[", "> ", "- ")):
            self.parts.append(" ")
        self.parts.append(text)

    def markdown(self) -> str:
        text = "".join(self.parts)
        text = re.sub(r"[ \t]+\n", "\n", text)
        text = re.sub(r"\n{3,}", "\n\n", text)
        text = re.sub(r"\[\s+", "[", text)
        text = re.sub(r"\s+\]", "]", text)
        return text.strip()


def parse_html(path: Path) -> tuple[HeadParser, str]:
    source = path.read_text(encoding="utf-8", errors="ignore")
    head = HeadParser()
    head.feed(source)
    body = MarkdownParser()
    body.feed(source)
    return head, body.markdown()


def frontmatter_value(value: str) -> str:
    return '"' + value.replace("\\", "\\\\").replace('"', '\\"') + '"'


def convert_file(root: Path, source: Path, base_url: str, generated_date: str) -> Path:
    head, body = parse_html(source)
    rel = source.relative_to(root)
    md_path = source.with_suffix(".md")
    source_url = f"{base_url.rstrip('/')}/{slug_url(rel)}"
    canonical = head.canonical or source_url
    title = head.h1 or head.title or source.stem.replace("-", " ").replace("_", " ").strip()
    description = head.description
    content_type = "case-study" if "case" in str(rel).lower() else "blog"

    markdown = [
        "---",
        f"title: {frontmatter_value(title)}",
        f"description: {frontmatter_value(description)}",
        f"canonical: {frontmatter_value(canonical)}",
        f"source_html: {frontmatter_value(source_url)}",
        f"content_type: {frontmatter_value(content_type)}",
        f"generated: {frontmatter_value(generated_date)}",
        "---",
        "",
        f"# {title}",
        "",
    ]
    if description:
        markdown.extend([description, ""])
    if body:
        markdown.append(body)
    markdown.append("")
    md_path.write_text("\n".join(markdown), encoding="utf-8")
    return md_path


def main() -> int:
    parser = argparse.ArgumentParser(description="Create AI-readable Markdown mirrors for static HTML content.")
    parser.add_argument("--root", required=True)
    parser.add_argument("--base-url", required=True)
    parser.add_argument("--generated-date", default="2026-05-02")
    parser.add_argument("paths", nargs="+")
    args = parser.parse_args()

    root = Path(args.root).resolve()
    html_files: list[Path] = []
    for raw in args.paths:
        target = (root / raw).resolve()
        if target.is_dir():
            html_files.extend(path for path in sorted(target.rglob("*.html")) if path.is_file())
        elif target.is_file() and target.suffix.lower() == ".html":
            html_files.append(target)

    converted: list[Path] = []
    for source in sorted(set(html_files)):
        name = source.name.lower()
        if name in {"template.html", "_template.html", "_template-minimal.html"}:
            continue
        converted.append(convert_file(root, source, args.base_url, args.generated_date))

    for path in converted:
        print(path.relative_to(root))
    print(f"Converted {len(converted)} files.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
