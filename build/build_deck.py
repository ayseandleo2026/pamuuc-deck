# -*- coding: utf-8 -*-
"""Build the PAMUUC Custom Wardrobe web deck from the existing localisation source."""
import html, importlib.util, json, re, shutil, sys
from pathlib import Path

SRC = Path("/Users/useraccount/Documents/PAMUUC MASTER/Pamuuc (B2C)/03 Ecommerce and Customer Experience/"
           "Translations and Localization/PAMUUC Translations Workspace/tmp/pdfs")
BRAND = Path("/Users/useraccount/Documents/PAMUUC MASTER/Pamuuc (B2C)/01 Brand/PAMUUC Brand Workspace")
SCRATCH = Path(__file__).parent
OUT = Path("/Users/useraccount/Claude/pamuuc-deck")

# --- load the existing layout engine (coordinates + fr/it/es copy) -------------
spec = importlib.util.spec_from_file_location("wardrobe", SRC / "build_custom_wardrobe_gilmer_html.py")
W = importlib.util.module_from_spec(spec); spec.loader.exec_module(W)
sys.path.insert(0, str(SCRATCH))
from en_data import EN
W.TRANSLATIONS["en"] = EN

LANGS = [("en", "English"), ("es", "Español"), ("fr", "Français"), ("it", "Italiano")]
LANG_HTML = {"en": "en", "es": "es", "fr": "fr", "it": "it"}
PDF_NAME = {"en": "EN", "es": "ES", "fr": "FR", "it": "IT"}

COLOR_CLASS = {tuple(W.NAVY): "c-navy", tuple(W.OFFWHITE): "c-off", tuple(W.WHITE): "c-white"}
WEIGHT = {"light": 300, "regular": 400, "medium": 500, "bold": 700}

# semantic role parsed out of the existing "tag" field, e.g. "en p3 heading 2"
def role_of(tag):
    m = re.match(r"^\w\w p(\d+) ([a-z]+)( \d+)?$", tag or "")
    if not m:
        return "x"
    page, role, index = m.group(1), m.group(2), m.group(3)
    if page == "4" and role == "title" and index:
        return "steptitle"          # a numbered step, not the slide headline
    return role

PHOTO_SLIDES = {1, 3, 5, 7}
NAVY_SLIDES = {1, 2, 7, 8}

def esc(t):
    return html.escape(t, quote=True)

# slide 8 is the only one whose reading order differs from its print order
P8_ORDER = {"wordmark": 0, "title": 2, "sub": 3, "name": 5, "role": 6,
            "email": 7, "phone": 8, "url": 9, "footer": 10}

def box_html(b, page, ordinal):
    role = role_of(b["tag"])
    cls = ["b", f"b--{role}", COLOR_CLASS[tuple(b["color"])], f"w{WEIGHT[b['weight']]}"]
    if b["align"] != "left":
        cls.append(f"ta-{b['align']}")
    order = P8_ORDER.get(role, ordinal) if page == 8 else ordinal
    style = (f"--x:{b['x']};--y:{b['top']};--w:{b['width']};"
             f"--fs:{b['size']};--lh:{b['leading']};--ord:{order}")
    if b["tracking"]:
        style += f";--tk:{b['tracking']}"
    data = f' data-fs="{b["size"]}" data-lh="{b["leading"]}" data-min="{b["minSize"]}" data-h="{b["height"]}"'
    inner = esc(b["text"]).replace(chr(10), '<br class="lb"> ')
    # the contact block stays visually identical but becomes tappable on a phone
    href = {"email": "mailto:simone@pamuuc.com",
            "phone": "tel:+34689876512",
            "url": "https://pamuuc-studio.com"}.get(role)
    if href:
        rel = ' target="_blank" rel="noopener"' if role == "url" else ""
        inner = f'<a href="{href}"{rel}>{inner}</a>'
    return (f'<div class="{" ".join(cls)}" style="{style}"{data}>{inner}</div>')

TRI = "180 275.953 193.011 275.953 186.491 267.959"      # page-6 marker, design units

def decor(page):
    """Vector furniture for the flat slides, in 1440x810 design units."""
    if page == 4:
        dots = "".join(
            f'<circle cx="{199.984 + i * 207.99:.3f}" cy="469.98" r="4.507"/>' for i in range(6))
        return ('<svg class="decor" viewBox="0 0 1440 810" preserveAspectRatio="none" aria-hidden="true">'
                '<rect class="rule" x="96" y="230" width="1248" height="1"/>'
                '<rect class="tline" x="96" y="468.98" width="1248" height="2"/>'
                f'<g class="dot">{dots}</g></svg>')
    if page == 6:
        tris = "".join(
            f'<polygon points="{" ".join(str(float(v) + (dx if k % 2 == 0 else dy)) for k, v in enumerate(TRI.split()))}"/>'
            for dx, dy in ((0, 0), (600.009, 0), (0, 206.022), (600.009, 206.022)))
        bars = "".join(f'<rect x="{x}" y="{y}" width="1" height="112"/>'
                       for x in (204, 804) for y in (268, 474))
        return ('<svg class="decor" viewBox="0 0 1440 810" preserveAspectRatio="none" aria-hidden="true">'
                '<rect class="rule" x="96" y="230" width="1248" height="1"/>'
                '<rect class="rule" x="96" y="650" width="1248" height="1"/>'
                f'<g class="bar">{bars}</g><g class="tri">{tris}</g></svg>')
    if page == 8:
        return ('<svg class="decor" viewBox="0 0 1440 810" preserveAspectRatio="none" aria-hidden="true">'
                '<polygon class="cue" points="1336.8 790.4 1349.8 790.4 1343.3 782.4"/></svg>')
    return ""

LOGO = (BRAND / "04 LOGO/svg/pamuuc-icon-currentcolor.svg").read_text(encoding="utf-8")
LOGO_INNER = re.search(r"<path[^>]*/>", LOGO).group(0)

def logo_svg():
    # visual bbox of the mark inside the 1000x1000 canvas -> design box measured off the PDF
    return ('<svg class="mark" viewBox="0 0 1000 1000" aria-hidden="true">' + LOGO_INNER + "</svg>")

def slide_html(page, lang, boxes):
    classes = ["slide", f"s{page}", "navy" if page in NAVY_SLIDES else "off"]
    parts = [f'<section class="{" ".join(classes)}" aria-label="Slide {page} of 8">',
             '<div class="stage">']
    if page in PHOTO_SLIDES:
        parts.append(f'<div class="photo" role="img" aria-label="PAMUUC uniforms"></div>')
    parts.append(decor(page))
    if page == 8:
        parts.append(f'<div class="b b--logo" style="--ord:-1">{logo_svg()}</div>')
    parts.extend(box_html(b, page, i) for i, b in enumerate(boxes))
    parts.append("</div></section>")
    return "\n".join(parts)

def nav_html(lang):
    links = "".join(
        f'<a href="../{code}/" class="{"on" if code == lang else ""}" hreflang="{code}" '
        f'lang="{code}">{code.upper()}</a>' for code, _ in LANGS)
    pdf = f'../pdf/Pamuuc Studio - Custom Uniforms - {PDF_NAME[lang]}.pdf'
    label = {"en": "PDF", "es": "PDF", "fr": "PDF", "it": "PDF"}[lang]
    return ('<nav class="chrome" aria-label="Language">'
            f'<div class="langs">{links}</div>'
            f'<a class="dl" href="{html.escape(pdf)}" download>{label}</a>'
            "</nav>")

TITLE = {
    "en": "PAMUUC Studio — Custom Wardrobe",
    "es": "PAMUUC Studio — Vestuario a medida",
    "fr": "PAMUUC Studio — Vestiaire sur mesure",
    "it": "PAMUUC Studio — Divise su misura",
}

def page_html(lang):
    slides = []
    for page in range(1, 9):
        boxes = W.PAGE_DRAWERS[page](W.TRANSLATIONS[lang][page], lang) + [W.footer(lang, page)]
        slides.append(slide_html(page, lang, boxes))
    desc = W.TRANSLATIONS[lang][1]["sub"]
    return f"""<!doctype html>
<html lang="{lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow, noarchive, noimageindex">
<title>{esc(TITLE[lang])}</title>
<meta name="description" content="{esc(desc)}">
<meta property="og:title" content="{esc(TITLE[lang])}">
<meta property="og:description" content="{esc(desc)}">
<meta property="og:type" content="website">
<meta property="og:image" content="../assets/img/share.jpg">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#011251">
<link rel="icon" href="../assets/img/favicon.svg" type="image/svg+xml">
<link rel="preload" href="../assets/fonts/Gilmer-Light.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="../assets/fonts/Gilmer-Medium.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="../assets/css/deck.css">
</head>
<body class="deck">
{nav_html(lang)}
<main class="slides">
{chr(10).join(slides)}
</main>
<script src="../assets/js/deck.js" defer></script>
</body>
</html>
"""

def main():
    for lang, _ in LANGS:
        d = OUT / lang
        d.mkdir(parents=True, exist_ok=True)
        (d / "index.html").write_text(page_html(lang), encoding="utf-8")
        print("wrote", d / "index.html")

if __name__ == "__main__":
    main()
