"""
Responsive audit of the landing page at multiple breakpoints.
Captures full-page screenshots and checks for horizontal overflow.
"""
from playwright.sync_api import sync_playwright
import os

URL = "https://mecanico-nu.vercel.app"
OUT_DIR = "/tmp/responsive-audit"
os.makedirs(OUT_DIR, exist_ok=True)

VIEWPORTS = [
    {"name": "mobile-xs",  "width": 320,  "height": 568},   # iPhone SE 1st gen
    {"name": "mobile-md",  "width": 375,  "height": 812},   # iPhone 12/13
    {"name": "mobile-lg",  "width": 430,  "height": 932},   # iPhone 14 Pro Max
    {"name": "tablet",     "width": 768,  "height": 1024},  # iPad
    {"name": "desktop-sm", "width": 1024, "height": 768},
    {"name": "desktop-lg", "width": 1440, "height": 900},
]

def check_overflow(page, viewport_name):
    """Returns list of elements wider than the viewport."""
    issues = page.evaluate("""() => {
        const vw = document.documentElement.clientWidth;
        const overflowing = [];
        document.querySelectorAll('*').forEach(el => {
            const rect = el.getBoundingClientRect();
            if (rect.right > vw + 1) {
                overflowing.push({
                    tag: el.tagName,
                    class: el.className.slice(0, 80),
                    right: Math.round(rect.right),
                    vw: vw,
                    overflow: Math.round(rect.right - vw)
                });
            }
        });
        // deduplicate by class
        const seen = new Set();
        return overflowing.filter(e => {
            const key = e.tag + e.class;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        }).slice(0, 10);
    }""")
    return issues

def check_nav_overlap(page):
    """Check if nav items overflow or are hidden."""
    return page.evaluate("""() => {
        const nav = document.querySelector('header nav');
        if (!nav) return null;
        const links = Array.from(nav.querySelectorAll('a'));
        return links.map(a => ({
            text: a.textContent.trim(),
            visible: a.offsetParent !== null,
            rect: {
                top: Math.round(a.getBoundingClientRect().top),
                right: Math.round(a.getBoundingClientRect().right),
                left: Math.round(a.getBoundingClientRect().left),
            }
        }));
    }""")

def check_text_overflow(page):
    """Check for text that is clipped or overflowing its container."""
    return page.evaluate("""() => {
        const issues = [];
        document.querySelectorAll('h1, h2, h3, p, span, a').forEach(el => {
            if (el.scrollWidth > el.clientWidth + 2) {
                issues.push({
                    tag: el.tagName,
                    text: el.textContent.trim().slice(0, 50),
                    scrollW: el.scrollWidth,
                    clientW: el.clientWidth,
                });
            }
        });
        return issues.slice(0, 10);
    }""")

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)

    print(f"\nAuditing: {URL}\n{'='*60}")

    for vp in VIEWPORTS:
        page = browser.new_page(viewport={"width": vp["width"], "height": vp["height"]})
        page.goto(URL, wait_until="networkidle", timeout=30000)

        # Screenshot
        path = f"{OUT_DIR}/{vp['name']}-{vp['width']}px.png"
        page.screenshot(path=path, full_page=True)

        # Checks
        overflow = check_overflow(page, vp["name"])
        nav = check_nav_overlap(page)
        text_overflow = check_text_overflow(page)

        print(f"\n[{vp['name']} — {vp['width']}px]")
        print(f"  Screenshot: {path}")

        if overflow:
            print(f"  [!!] HORIZONTAL OVERFLOW ({len(overflow)} elements):")
            for el in overflow:
                print(f"    <{el['tag']}> class=\"{el['class']}\" overflows by {el['overflow']}px")
        else:
            print("  [OK] No horizontal overflow")

        if nav:
            print(f"  Nav links:")
            for link in nav:
                print(f"    '{link['text']}' visible={link['visible']} left={link['rect']['left']} right={link['rect']['right']}")

        if text_overflow:
            print(f"  [!!] TEXT OVERFLOW ({len(text_overflow)} elements):")
            for el in text_overflow:
                print(f"    <{el['tag']}> \"{el['text']}\" scrollW={el['scrollW']} clientW={el['clientW']}")
        else:
            print("  [OK] No text overflow")

        page.close()

    browser.close()
    print(f"\n{'='*60}\nScreenshots saved to: {OUT_DIR}")
