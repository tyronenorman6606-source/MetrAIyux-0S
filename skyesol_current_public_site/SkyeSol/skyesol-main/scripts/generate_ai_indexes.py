#!/usr/bin/env python3
from __future__ import annotations

import argparse
import re
import xml.etree.ElementTree as ET
from pathlib import Path
from urllib.parse import quote


def slug_url(path: Path) -> str:
    return "/".join(quote(part) for part in path.parts)


def read_frontmatter(path: Path) -> dict[str, str]:
    text = path.read_text(encoding="utf-8", errors="ignore")
    if not text.startswith("---"):
        return {}
    end = text.find("\n---", 3)
    if end == -1:
        return {}
    data: dict[str, str] = {}
    for line in text[3:end].splitlines():
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        data[key.strip()] = value.strip().strip('"')
    return data


def title_from_path(path: Path) -> str:
    stem = path.stem.replace("-", " ").replace("_", " ")
    return re.sub(r"\s+", " ", stem).strip().title()


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate llms.txt and markdown sitemap indexes.")
    parser.add_argument("--root", required=True)
    parser.add_argument("--base-url", required=True)
    parser.add_argument("--site-name", required=True)
    parser.add_argument("--generated-date", default="2026-05-02")
    parser.add_argument("paths", nargs="+")
    args = parser.parse_args()

    root = Path(args.root).resolve()
    base_url = args.base_url.rstrip("/")
    md_files: list[Path] = []
    for raw in args.paths:
        target = (root / raw).resolve()
        if target.is_dir():
            md_files.extend(path for path in sorted(target.rglob("*.md")) if path.is_file())
        elif target.is_file() and target.suffix.lower() == ".md":
            md_files.append(target)

    md_files = sorted(set(md_files))
    lines = [
        f"# {args.site_name}",
        "",
        "AI-readable content index for search engines, answer engines, LLM crawlers, and retrieval systems.",
        "The HTML pages remain the canonical human-facing pages; these Markdown mirrors expose the same blog and case study knowledge in clean text.",
        "",
        "## Core Positioning",
        "",
        "Skyes Over London LC builds custom AI automation, business websites, client portals, workflow systems, SEO content systems, and operational infrastructure for small businesses, contractors, creators, service companies, and local organizations.",
        "",
        "## Markdown Content",
        "",
    ]

    for path in md_files:
        rel = path.relative_to(root)
        meta = read_frontmatter(path)
        title = meta.get("title") or title_from_path(path)
        description = meta.get("description", "")
        url = f"{base_url}/{slug_url(rel)}"
        source = meta.get("source_html", "")
        lines.append(f"- [{title}]({url})")
        if description:
            lines.append(f"  Summary: {description}")
        if source:
            lines.append(f"  Source HTML: {source}")

    (root / "llms.txt").write_text("\n".join(lines) + "\n", encoding="utf-8")

    full_lines = [
        f"# {args.site_name} Full AI Content",
        "",
        "This file concatenates the Markdown mirrors of the site's blog and case study content for AI retrieval, answer engine ingestion, and offline knowledge indexing.",
        "",
    ]
    for path in md_files:
        rel = path.relative_to(root)
        full_lines.extend([
            "---",
            f"Source Markdown: {base_url}/{slug_url(rel)}",
            "",
            path.read_text(encoding="utf-8", errors="ignore").strip(),
            "",
        ])
    (root / "llms-full.txt").write_text("\n".join(full_lines) + "\n", encoding="utf-8")

    urlset = ET.Element("urlset", xmlns="http://www.sitemaps.org/schemas/sitemap/0.9")
    for static_name in ("llms.txt", "llms-full.txt"):
        url = ET.SubElement(urlset, "url")
        ET.SubElement(url, "loc").text = f"{base_url}/{static_name}"
        ET.SubElement(url, "lastmod").text = args.generated_date
        ET.SubElement(url, "changefreq").text = "weekly"
        ET.SubElement(url, "priority").text = "0.9"
    for path in md_files:
        rel = path.relative_to(root)
        url = ET.SubElement(urlset, "url")
        ET.SubElement(url, "loc").text = f"{base_url}/{slug_url(rel)}"
        ET.SubElement(url, "lastmod").text = args.generated_date
        ET.SubElement(url, "changefreq").text = "monthly"
        ET.SubElement(url, "priority").text = "0.7"

    tree = ET.ElementTree(urlset)
    ET.indent(tree, space="  ")
    tree.write(root / "ai-content-sitemap.xml", encoding="utf-8", xml_declaration=True)

    print(f"Indexed {len(md_files)} Markdown files.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
