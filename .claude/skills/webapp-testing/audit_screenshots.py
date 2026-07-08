"""
UX Audit screenshots: landing page at 375/768/1280px.
"""
from playwright.sync_api import sync_playwright
import os

BASE_URL = "https://vikupass.com"
OUT_DIR = r"C:\Users\Usuario\Desktop\PRINCIPAL\02-Proyectos-Propios\Emprendimientos\plateasf\.claude\audit-screenshots"
os.makedirs(OUT_DIR, exist_ok=True)

VIEWPORTS = [
    {"name": "mobile-375", "width": 375, "height": 812},
    {"name": "tablet-768", "width": 768, "height": 1024},
    {"name": "desktop-1280", "width": 1280, "height": 900},
]

PAGES = [
    {"slug": "landing", "path": "/"},
    {"slug": "login", "path": "/login"},
]

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)

    for vp in VIEWPORTS:
        ctx = browser.new_context(
            viewport={"width": vp["width"], "height": vp["height"]},
            device_scale_factor=1,
        )
        page = ctx.new_page()

        # Capture console errors
        console_errors = []
        page.on("console", lambda msg: console_errors.append(f"[{msg.type}] {msg.text}") if msg.type in ("error", "warning") else None)

        for pg in PAGES:
            url = f"{BASE_URL}{pg['path']}"
            print(f"Visiting {url} @ {vp['width']}px ...")
            page.goto(url, wait_until="networkidle", timeout=30000)

            # Full-page screenshot
            out_path = os.path.join(OUT_DIR, f"{pg['slug']}-{vp['name']}.png")
            page.screenshot(path=out_path, full_page=True)
            print(f"  Saved: {out_path}")

            # Check for horizontal scroll overflow
            scroll_width = page.evaluate("document.body.scrollWidth")
            client_width = page.evaluate("document.body.clientWidth")
            if scroll_width > client_width + 2:
                print(f"  *** OVERFLOW: scrollWidth={scroll_width} > clientWidth={client_width} @ {vp['name']} on /{pg['slug']}")

        # Report console errors
        if console_errors:
            print(f"\n  Console errors @ {vp['name']}:")
            for e in console_errors[:10]:
                print(f"    {e}")

        ctx.close()

    browser.close()
    print("\nAll screenshots done.")
