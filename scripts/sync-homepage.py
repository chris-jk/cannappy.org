#!/usr/bin/env python3
"""Regenerate the homepage app grid from public/apps/index.html.

public/apps/index.html is the single source of truth for the catalog.
The homepage (src/client/index.tsx) renders the same entries as JSX, so
edit the /apps/ page and run this to keep them in sync:

    python3 scripts/sync-homepage.py && npx wrangler deploy
"""
import re
import sys
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
APPS = ROOT / "public/apps/index.html"
HOME = ROOT / "src/client/index.tsx"

# The generated block sits between the portfolio headline and </section>.
START_MARK = "keep shipping.\n        </h2>"
END_MARK = "      </section>\n\n      {/* Contact */}"

ENTRY_RE = re.compile(
    r'<(a|div) class="app(?: is-muted)?"(?:\s+href="([^"]*)")?[^>]*>\s*'
    r'<div class="app-icon">(.*?)</div>\s*'
    r'<div class="app-text">\s*<h2>(.*?)</h2>\s*'
    r'<p class="desc">(.*?)</p>\s*'
    r'<div class="app-meta">(.*?)</div>\s*'
    r"</div>\s*</(?:a|div)>",
    re.S,
)


def parse(src):
    cats = [(m.start(), m.group(1)) for m in re.finditer(r'<h2 class="cat-title">(.*?)</h2>', src, re.S)]

    def cat_of(pos):
        prior = [n for p, n in cats if p < pos]
        return prior[-1] if prior else None

    out = []
    for m in ENTRY_RE.finditer(src):
        _tag, href, icon, name, desc, meta = m.groups()
        out.append(
            dict(
                cat=cat_of(m.start()),
                href=(href or "").strip(),
                icon=icon.strip(),
                name=name.strip(),
                desc=desc.strip(),
                meta=meta.strip(),
            )
        )
    return out


def icon_jsx(icon):
    im = re.search(r'<img\s+src="([^"]+)"[^>]*alt="([^"]*)"', icon)
    if im:
        return f'<img src="{im.group(1)}" alt="{im.group(2)}" width={{52}} height={{52}} />'
    return icon


def render(entries):
    parts, cur = [], None
    for e in entries:
        if e["cat"] != cur:
            if cur is not None:
                parts.append("          </div>\n        </div>\n")
            parts.append(
                f'        <div className="cat">\n'
                f'          <h3 className="cat-title">{e["cat"]}</h3>\n'
                f'          <div className="app-grid">\n'
            )
            cur = e["cat"]
        if e["href"]:
            open_tag = f'            <a href="{e["href"]}" className="app" target="_blank" rel="noopener noreferrer">'
            close_tag = "</a>"
        else:
            open_tag = '            <div className="app is-muted">'
            close_tag = "</div>"
        parts.append(
            f"{open_tag}\n"
            f'              <div className="app-icon">{icon_jsx(e["icon"])}</div>\n'
            f'              <div className="app-text">\n'
            f'                <h4>{e["name"]}</h4>\n'
            f'                <p>{e["desc"]}</p>\n'
            f'                <div className="app-meta">{e["meta"].replace(chr(34) + "class=" + chr(34), "")}</div>\n'
            f"              </div>\n"
            f"            {close_tag}\n"
        )
    parts.append("          </div>\n        </div>\n")
    return "".join(parts).replace('class="', 'className="')


def main():
    entries = parse(APPS.read_text())
    if len(entries) < 40:
        sys.exit(f"parsed only {len(entries)} entries — the markup probably changed; aborting")

    tsx = HOME.read_text()
    start = tsx.index(START_MARK) + len(START_MARK)
    end = tsx.index(END_MARK)
    HOME.write_text(tsx[:start] + "\n\n" + render(entries) + "\n" + tsx[end:])
    print(f"synced {len(entries)} entries into the homepage")


if __name__ == "__main__":
    main()
