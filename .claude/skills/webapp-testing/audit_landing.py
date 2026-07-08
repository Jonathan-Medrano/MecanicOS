from playwright.sync_api import sync_playwright
import os

URL = "https://vikupass.com"
OUT = r"C:\Users\Usuario\Desktop\PRINCIPAL\02-Proyectos-Propios\Emprendimientos\plateasf\.audit-screenshots"
os.makedirs(OUT, exist_ok=True)

VIEWPORTS = [
    {"name": "mobile", "width": 375, "height": 812},
    {"name": "tablet", "width": 768, "height": 1024},
    {"name": "desktop", "width": 1280, "height": 900},
]

def check_overflow(page):
    """Returns True if the page has horizontal overflow (scroll)."""
    return page.evaluate("""
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    """)

def get_console_errors(page):
    errors = []
    page.on("console", lambda msg: errors.append((msg.type, msg.text)) if msg.type in ("error", "warning") else None)
    return errors

def audit_viewport(browser, vp):
    context = browser.new_context(
        viewport={"width": vp["width"], "height": vp["height"]},
        user_agent="Mozilla/5.0 (compatible; AuditBot/1.0)"
    )
    page = context.new_page()

    console_msgs = []
    page.on("console", lambda msg: console_msgs.append((msg.type, msg.text)) if msg.type in ("error", "warning") else None)
    page.on("pageerror", lambda err: console_msgs.append(("pageerror", str(err))))

    print(f"\n=== {vp['name']} ({vp['width']}x{vp['height']}) ===")
    page.goto(URL, wait_until="networkidle", timeout=30000)

    # Screenshot full page
    screenshot_path = os.path.join(OUT, f"landing_{vp['name']}.png")
    page.screenshot(path=screenshot_path, full_page=True)
    print(f"  Screenshot: {screenshot_path}")

    # Check horizontal overflow
    has_overflow = check_overflow(page)
    print(f"  Horizontal overflow: {has_overflow}")

    # Check navbar CTA visibility
    navbar = page.locator("header").first
    cta_primary = page.locator('header a[href="/login?tab=registro"]').first
    cta_visible = cta_primary.is_visible() if cta_primary.count() > 0 else False
    print(f"  Navbar CTA primary visible: {cta_visible}")

    # Check hero section
    hero = page.locator("section").first
    hero_h1 = page.locator("h1").first
    if hero_h1.count() > 0:
        h1_box = hero_h1.bounding_box()
        print(f"  H1 bounding box: {h1_box}")

    # Check CTA buttons tap targets (all links/buttons in hero)
    hero_buttons = page.locator("section").first.locator("a, button").all()
    small_tap_targets = []
    for btn in hero_buttons[:10]:  # check first 10
        try:
            box = btn.bounding_box()
            if box and (box["height"] < 44 or box["width"] < 44):
                txt = btn.inner_text()[:40]
                small_tap_targets.append(f"'{txt}' h={box['height']:.0f}px w={box['width']:.0f}px")
        except Exception:
            pass
    if small_tap_targets:
        print(f"  Small tap targets in hero: {small_tap_targets}")

    # Check hamburger menu button size on mobile
    if vp["width"] <= 375:
        hamburger = page.locator("button[aria-label='Abrir menú']")
        if hamburger.count() > 0:
            box = hamburger.bounding_box()
            print(f"  Hamburger button: {box}")

        # Check if "Crear mi espacio" CTA is visible without hamburger
        cta_create = page.locator('a[href="/login?tab=registro"]').first
        print(f"  'Crear mi espacio' direct link count: {page.locator('a[href=\"/login?tab=registro\"]').count()}")

    # Console errors
    if console_msgs:
        print(f"  Console messages:")
        for t, msg in console_msgs[:15]:
            print(f"    [{t}] {msg[:120]}")
    else:
        print(f"  Console: clean")

    # Screenshot viewport-only (above fold)
    screenshot_fold_path = os.path.join(OUT, f"landing_{vp['name']}_fold.png")
    page.screenshot(path=screenshot_fold_path, full_page=False)
    print(f"  Above-fold screenshot: {screenshot_fold_path}")

    context.close()
    return {
        "viewport": vp["name"],
        "has_overflow": has_overflow,
        "cta_primary_visible": cta_visible,
        "small_tap_targets": small_tap_targets,
        "console_msgs": console_msgs,
    }

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)

    results = []
    for vp in VIEWPORTS:
        result = audit_viewport(browser, vp)
        results.append(result)

    browser.close()

    print("\n\n=== SUMMARY ===")
    for r in results:
        print(f"\n{r['viewport']}:")
        print(f"  Overflow: {r['has_overflow']}")
        print(f"  CTA visible: {r['cta_primary_visible']}")
        if r['small_tap_targets']:
            print(f"  Small tap targets: {r['small_tap_targets']}")
        if r['console_msgs']:
            print(f"  Console issues: {len(r['console_msgs'])}")
