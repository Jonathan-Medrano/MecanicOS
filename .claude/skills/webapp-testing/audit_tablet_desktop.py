"""Scroll + screenshot tablet and desktop after first run failed mid-way."""
from playwright.sync_api import sync_playwright
import os

BASE_URL = "https://vikupass.com"
OUT_DIR = r"C:\Users\Usuario\Desktop\PRINCIPAL\02-Proyectos-Propios\Emprendimientos\plateasf\.claude\audit-screenshots"
os.makedirs(OUT_DIR, exist_ok=True)

VIEWPORTS = [
    {"name": "tablet-768",   "width": 768,  "height": 1024},
    {"name": "desktop-1280", "width": 1280, "height": 900},
]

def scroll_page(page):
    total_height = page.evaluate("document.body.scrollHeight")
    step = 300
    pos = 0
    while pos < total_height:
        page.evaluate(f"window.scrollTo(0, {pos})")
        page.wait_for_timeout(100)
        pos += step
    page.evaluate("window.scrollTo(0, 0)")
    page.wait_for_timeout(400)

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

        out_path = os.path.join(OUT_DIR, f"landing-scrolled-{vp['name']}.png")
        page.screenshot(path=out_path, full_page=True)
        print(f"Saved: {out_path}")

        sw = page.evaluate("document.body.scrollWidth")
        cw = page.evaluate("document.documentElement.clientWidth")
        print(f"  scrollWidth={sw} clientWidth={cw} overflow={sw > cw + 2}")

        # Tap targets below 44px
        small = page.evaluate("""() => {
            const res = [];
            document.querySelectorAll('a[href], button').forEach(el => {
                const r = el.getBoundingClientRect();
                if (r.width > 0 && r.height > 0 && r.height < 44) {
                    const text = el.textContent.trim().replace(/[\\u0080-\\uFFFF]/g, '?').slice(0, 40);
                    res.push({ tag: el.tagName, text, h: Math.round(r.height), w: Math.round(r.width) });
                }
            });
            return res.slice(0, 25);
        }""")
        if small:
            print(f"  Tap targets <44px @ {vp['name']}:")
            for t in small:
                print(f"    {t['tag']} '{t['text']}' h={t['h']}px w={t['w']}px")

        ctx.close()

    browser.close()
    print("Done.")
