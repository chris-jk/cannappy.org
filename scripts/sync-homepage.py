#!/usr/bin/env python3
"""Regenerate the homepage app grid from public/apps/index.html.

public/apps/index.html is the single source of truth for the catalog.
The homepage (src/client/index.tsx) renders the same entries as JSX, so
edit the /apps/ page and run this to keep them in sync:

    python3 scripts/sync-homepage.py && npx wrangler deploy

Three card shapes are supported:
  <a class="app" href=...>                 plain linked card
  <div class="app has-link">               card whose title carries the link,
                                           so store badges can be links too
  <div class="app is-muted">               unlinked card
"""
import re
import sys
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
APPS = ROOT / "public/apps/index.html"
HOME = ROOT / "src/client/index.tsx"

START_MARK = "keep shipping.\n        </h2>"
END_MARK = "      </section>\n\n      {/* Contact */}"

CARD_RE = re.compile(
    r'<(?P<tag>a|div) class="app(?P<mods>[^"]*)"(?:\s+href="(?P<href>[^"]*)")?[^>]*>\s*'
    r'<div class="app-icon">(?P<icon>.*?)</div>\s*'
    r'<div class="app-text">\s*<h2>(?P<title>.*?)</h2>\s*'
    r'<p class="desc">(?P<desc>.*?)</p>\s*'
    r'<div class="app-meta">(?P<meta>.*?)</div>\s*'
    r"</div>\s*</(?P=tag)>",
    re.S,
)
CARD_LINK_RE = re.compile(r'<a class="card-link" href="([^"]+)"[^>]*>(.*?)</a>(.*)', re.S)


def parse(src):
    cats = [(m.start(), m.group(1)) for m in re.finditer(r'<h2 class="cat-title">(.*?)</h2>', src, re.S)]

    def cat_of(pos):
        prior = [n for p, n in cats if p < pos]
        return prior[-1] if prior else None

    out = []
    for m in CARD_RE.finditer(src):
        d = m.groupdict()
        href, title, extra = d.get("href") or "", d["title"].strip(), ""
        inner = CARD_LINK_RE.match(title)
        if inner:  # has-link card: href and rating live inside the <h2>
            href, title, extra = inner.group(1), inner.group(2).strip(), inner.group(3).strip()
        out.append(
            dict(
                cat=cat_of(m.start()),
                href=href,
                has_link="has-link" in d["mods"],
                muted="is-muted" in d["mods"],
                icon=d["icon"].strip(),
                name=title,
                extra=extra,
                desc=d["desc"].strip(),
                meta=d["meta"].strip(),
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

        if e["has_link"]:
            open_tag, close_tag = '            <div className="app has-link">', "</div>"
            title = (
                f'<a className="card-link" href="{e["href"]}" target="_blank" '
                f'rel="noopener noreferrer">{e["name"]}</a>{e["extra"]}'
            )
        elif e["href"]:
            open_tag = f'            <a href="{e["href"]}" className="app" target="_blank" rel="noopener noreferrer">'
            close_tag, title = "</a>", e["name"]
        else:
            open_tag, close_tag, title = '            <div className="app is-muted">', "</div>", e["name"]

        parts.append(
            f"{open_tag}\n"
            f'              <div className="app-icon">{icon_jsx(e["icon"])}</div>\n'
            f'              <div className="app-text">\n'
            f"                <h4>{title}</h4>\n"
            f'                <p>{e["desc"]}</p>\n'
            f'                <div className="app-meta">{e["meta"]}</div>\n'
            f"              </div>\n"
            f"            {close_tag}\n"
        )
    parts.append("          </div>\n        </div>\n")
    # HTML attrs -> JSX attrs, but never touch hrefs
    return "".join(parts).replace(' class="', ' className="')


def main():
    entries = parse(APPS.read_text())
    if len(entries) < 40:
        sys.exit(f"parsed only {len(entries)} entries — the markup probably changed; aborting")

    tsx = HOME.read_text()
    start = tsx.index(START_MARK) + len(START_MARK)
    end = tsx.index(END_MARK)
    HOME.write_text(tsx[:start] + "\n\n" + render(entries) + "\n" + tsx[end:])
    print(f"synced {len(entries)} entries "
          f"({sum(e['has_link'] for e in entries)} with store links, "
          f"{sum(bool(e['extra']) for e in entries)} with ratings)")


if __name__ == "__main__":
    main()
