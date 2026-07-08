"""
Scroll through the landing at multiple viewports to trigger reveal animations,
then screenshot + check overflow element by element.
"""
from playwright.sync_api import sync_playwright
import os, time

BASE_URL = "https://vikupass.com"
OUT_DIR = r"C:\Users\Usuario\Desktop\PRINCIPAL\02-Proyectos-Propios\Emprendimientos\plateasf\.claude\audit-screenshots"
os.makedirs(OUT_DIR, exist_ok=True)

VIEWPORTS = [
    {"name": "mobile-375",   "width": 375,  "height": 812},
    {"name": "tablet-768",   "width": 768,  "height": 1024},
    {"name": "desktop-1280", "width": 1280, "height": 900},
]

def scroll_page(page):
    """Slowly scroll to trigger all IntersectionObserver callbacks."""
    total_height = page.evaluate("document.body.scrollHeight")
    step = 300
    pos = 0
    while pos < total_height:
        page.evaluate(f"window.scrollTo(0, {pos})")
        page.wait_for_timeout(120)
        pos += step
    page.evaluate("window.scrollTo(0, 0)")
    page.wait_for_timeout(300)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)

    for vp in VIEWPORTS:
        ctx = browser.new_context(
            viewport={"width": vp["width"], "height": vp["height"]},
            device_scale_factor=1,
        )
        page = ctx.new_page()

        page.goto(f"{BASE_URL}/", wait_until="networkidle", timeout=30000)
        scroll_page(page)

        # Full-page after scroll
        out_path = os.path.join(OUT_DIR, f"landing-scrolled-{vp['name']}.png")
        page.screenshot(path=out_path, full_page=True)
        print(f"Saved: {out_path}")

        # Overflow check
        scroll_w = page.evaluate("document.body.scrollWidth")
        client_w = page.evaluate("document.documentElement.clientWidth")
        if scroll_w > client_w + 2:
            print(f"  *** OVERFLOW @ {vp['name']}: scrollWidth={scroll_w} clientWidth={client_w}")
            # Find offending elements
            offenders = page.evaluate("""() => {
                const vw = document.documentElement.clientWidth;
                const hits = [];
                document.querySelectorAll('*').forEach(el => {
                    const r = el.getBoundingClientRect();
                    if (r.right > vw + 1) {
                        hits.push({
                            tag: el.tagName,
                            cls: el.className?.toString().slice(0, 80),
                            right: Math.round(r.right),
                            width: Math.round(r.width),
                            vw
                        });
                    }
                });
                return hits.slice(0, 15);
            }""")
            for o in offenders:
                print(f"    {o['tag']} .{o['cls'][:60]} right={o['right']} vw={o['vw']}")
        else:
            print(f"  No overflow @ {vp['name']} (scrollWidth={scroll_w}, clientWidth={client_w})")

        # Check tap target sizes for CTAs
        tap_targets = page.evaluate("""() => {
            const results = [];
            document.querySelectorAll('a, button').forEach(el => {
                const r = el.getBoundingClientRect();
                if (r.width > 0 && r.height > 0 && r.height < 44) {
                    results.push({
                        tag: el.tagName,
                        text: el.textContent?.trim().slice(0, 40),
                        h: Math.round(r.height),
                        w: Math.round(r.width)
                    });
                }
            });
            return results.slice(0, 20);
        }""")
        if tap_targets:
            print(f"  Small tap targets (<44px height) @ {vp['name']}:")
            for t in tap_targets:
                print(f"    {t['tag']} '{t['text']}' h={t['h']} w={t['w']}")

        ctx.close()

    browser.close()
    print("\nDone.")
