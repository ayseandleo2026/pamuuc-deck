# PAMUUC Studio — Custom Wardrobe (web deck)

A web version of the four *Custom Uniforms* PDFs. Static files only: no build step
to deploy, no server, nothing to log into.

```
index.html          language auto-redirect (+ manual chooser without JS)
en/ es/ fr/ it/     one deck per language
assets/             Gilmer webfonts, slide imagery, CSS, JS
pdf/                the original PDFs, linked from the "PDF" button
robots.txt          Disallow: / — keeps the deck out of search engines
```

## How it renders

Desktop keeps the print layout exactly: a 1440 × 810 grid where every element sits at
its original coordinate, scaled by a single CSS variable (`--u`) so the slide is
pixel-faithful at any window size. Coordinates and copy come from the existing
localisation engine, so the web deck and the PDFs cannot drift apart.

Below 900px the slides reflow into a readable single column — photo banner, then
headline, then body — because a 1440-wide slide scaled onto a phone would render
body text at about 4px. Slide order, wording and colour are unchanged.

`deck.js` re-runs the same shrink-to-fit pass the PDF build uses, so a long Italian
or French string tightens exactly as it does in print. All four languages currently
fit with zero overflow.

## Deploying

Any static host works. For GitHub Pages:

```bash
gh repo create pamuuc-deck --private --source . --push
```

then Settings → Pages → Deploy from branch → `main` / root.

**Repo visibility matters here.** Every slide is footed "Confidential · Recipient use
only". On GitHub Free, Pages only publishes from a *public* repo, which would make
these files cloneable by anyone and leave them in git history permanently. On GitHub
Pro the repo stays private while the site is still public-by-link. The published site
is reachable without a login either way — that is the point — but the source need not be.

`robots.txt` and a `noindex` meta tag on every page keep it out of Google. That is
obscurity, not access control: anyone with the link can open it.

## Rebuilding

`build/build_deck.py` regenerates the four HTML files from the localisation source in
`PAMUUC Translations Workspace/tmp/pdfs`. Copy changes belong there, not in the
generated HTML.

```bash
python3 build/build_deck.py
```

`build/render.swift` and `build/imgtool.swift` regenerate slide imagery from the
text-free background PDF, if the photography ever changes.
