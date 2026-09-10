#!/usr/bin/env python3
"""Switch bivianocontracting.com to clean URLs: /about instead of /about.html.

GitHub Pages already serves /about from about.html, so this only rewrites what the site
*points at*: internal links, the sitemap, og:url, JSON-LD, the legacy redirect stubs, and adds
a rel=canonical to every page so /about.html and /about never compete in Google.

Idempotent. Usage: python3 scripts/clean_urls.py [--check]
"""
import re, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DOMAIN = "https://www.bivianocontracting.com"
PAGES = sorted(p.stem for p in ROOT.glob("*.html") if p.name != "404.html" and not p.name.startswith("._"))
CHECK = "--check" in sys.argv
page_alt = "|".join(re.escape(p) for p in sorted(PAGES, key=len, reverse=True))


def slug(page):
    return "/" if page == "index" else f"/{page}"


def rewrite(text):
    # absolute URLs on our own domain (sitemap, og:url, JSON-LD, redirect stubs)
    text = re.sub(rf"{re.escape(DOMAIN)}/({page_alt})\.html(?=[\"'#?<\s;]|$)",
                  lambda m: DOMAIN + slug(m.group(1)), text)
    # relative links to our own pages: href="about.html", "./about.html", "/about.html" (+ #anchor / ?query)
    text = re.sub(rf"(href=[\"'])(?:\./|/)?({page_alt})\.html(?=[\"'#?])",
                  lambda m: m.group(1) + slug(m.group(2)), text)
    return text.replace(f'href="/#', 'href="/#')


def add_canonical(text, page):
    url = DOMAIN + slug(page)
    tag = f'<link rel="canonical" href="{url}" />'
    if 'rel="canonical"' in text:
        return re.sub(r'<link rel="canonical"[^>]*>', tag, text)
    return re.sub(r"(\n?\s*)</head>", lambda m: f"\n  {tag}{m.group(1)}</head>", text, count=1)


# git-tracked files only — the T7 volume is littered with macOS "._*.html" AppleDouble files
tracked = subprocess.run(["git", "ls-files"], cwd=ROOT, capture_output=True, text=True).stdout.split()
targets = [ROOT / t for t in tracked if t.endswith(".html")] + [ROOT / "sitemap.xml"]
changed = []
for f in targets:
    old = f.read_text()
    new = rewrite(old)
    if f.parent == ROOT and f.suffix == ".html" and f.name != "404.html":
        new = add_canonical(new, f.stem)
    if new != old:
        changed.append(f.relative_to(ROOT))
        if not CHECK:
            f.write_text(new)

# leftovers: any .html pointer to one of our own pages that survived
left = []
for f in targets:
    for m in re.finditer(rf"(?:href=[\"'](?:\./|/)?|{re.escape(DOMAIN)}/)({page_alt})\.html", f.read_text()):
        left.append(f"{f.relative_to(ROOT)}: {m.group(0)}")
print(f"{'would change' if CHECK else 'changed'} {len(changed)} files")
print(f"remaining internal .html pointers: {len(left)}")
for l in left[:20]:
    print("  ", l)
