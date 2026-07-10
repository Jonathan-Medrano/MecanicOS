"""
Focused audit: confirm which overflow issues cause actual body scroll (real bugs).
"""
from playwright.sync_api import sync_playwright
import os

URL = "https://mecanico-nu.vercel.app"
OUT_DIR = "/tmp/responsive-audit"
os.makedirs(OUT_DIR, exist_ok=True)

VIEWPORTS = [
    {"name": "mobile-xs",  "width": 320,  "height": 568},
    {"name": "mobile-md",  "width": 375,  "height": 812},
    {"name": "mobile-lg",  "width": 430,  "height": 932},
    {"name": "tablet",     "width": 768,  "height": 1024},
]

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)

    print(f"\nBody scroll check: {URL}\n{'='*60}")

    for vp in VIEWPORTS:
        page = browser.new_page(viewport={"width": vp["width"], "height": vp["height"]})
        page.goto(URL, wait_until="networkidle", timeout=30000)

        result = page.evaluate("""() => {
            const body = document.body;
            const html = document.documentElement;
            return {
                bodyScrollWidth: body.scrollWidth,
                bodyClientWidth: body.clientWidth,
                htmlScrollWidth: html.scrollWidth,
                htmlClientWidth: html.clientWidth,
                bodyOverflowX: getComputedStyle(body).overflowX,
                htmlOverflowX: getComputedStyle(html).overflowX,
                hasHScroll: html.scrollWidth > html.clientWidth,
            };
        }""")

        has_scroll = result["hasHScroll"]
        status = "[!!] HAS HORIZONTAL SCROLL" if has_scroll else "[OK] no body scroll"
        print(f"\n[{vp['name']} - {vp['width']}px] {status}")
        print(f"  html scrollWidth={result['htmlScrollWidth']} clientWidth={result['htmlClientWidth']}")
        print(f"  overflow-x: html={result['htmlOverflowX']} body={result['bodyOverflowX']}")

        # If there's scroll, find the actual culprit at the body level
        if has_scroll:
            culprits = page.evaluate("""() => {
                const vw = document.documentElement.clientWidth;
                const found = [];
                document.querySelectorAll('*').forEach(el => {
                    // Only check elements whose parent does NOT overflow
                    const parent = el.parentElement;
                    if (!parent) return;
                    const parentOverflow = getComputedStyle(parent).overflowX;
                    if (parentOverflow === 'hidden' || parentOverflow === 'clip') return;
                    const rect = el.getBoundingClientRect();
                    if (rect.right > vw + 2) {
                        found.push({
                            tag: el.tagName,
                            cls: el.className.slice(0, 80),
                            right: Math.round(rect.right),
                            overflow: Math.round(rect.right - vw),
                            parentOverflow: parentOverflow,
                        });
                    }
                });
                const seen = new Set();
                return found.filter(e => {
                    const k = e.tag + e.cls;
                    if (seen.has(k)) return false;
                    seen.add(k);
                    return true;
                }).slice(0, 8);
            }""")
            if culprits:
                print(f"  Culprits (not clipped by overflow-hidden parent):")
                for c in culprits:
                    print(f"    <{c['tag']}> +{c['overflow']}px | parentOverflow={c['parentOverflow']}")
                    print(f"      class: {c['cls']}")

        # Screenshot of just the hero at mobile to see the overflow
        if vp["width"] <= 375:
            hero_path = f"{OUT_DIR}/hero-{vp['name']}-{vp['width']}px.png"
            hero = page.locator("section").first
            if hero:
                hero.screenshot(path=hero_path)
                print(f"  Hero screenshot: {hero_path}")

        page.close()

    browser.close()
    print(f"\n{'='*60}")
