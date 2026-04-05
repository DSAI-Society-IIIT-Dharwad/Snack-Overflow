"""
Playwright helpers for Amazon.in scraping.

Design:
- `create_browser_context` — one Chromium browser + page for the whole run.
- `create_fresh_page`      — recreate a page within an existing browser (crash recovery).
- `fetch_search_page`      — search results, uses existing page.
- `fetch_offers_page`      — AOD all-sellers panel, scrolls until offer count stabilises.
"""

from __future__ import annotations

import asyncio
import os
import random
from playwright.async_api import async_playwright, Browser, BrowserContext, Page

from config import TN_PINCODES

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
]

# Anti-detection init script — reused when we create fresh pages after crashes
_ANTI_DETECT_JS = """
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    window.chrome = { runtime: {} };
"""

_DEBUG = os.getenv("DEBUG", "").lower() in ("1", "true", "yes")


# ── Browser / page factory ─────────────────────────────────────────────────────

async def create_browser_context(playwright) -> tuple[Browser, Page]:
    """
    Launch a single anti-detection Chromium browser and return (browser, page).
    Caller must `await browser.close()` when done.
    """
    browser = await playwright.chromium.launch(
        headless=True,
        args=[
            "--no-sandbox",
            "--disable-blink-features=AutomationControlled",
            "--disable-dev-shm-usage",
        ],
    )
    page = await _new_page(browser)
    return browser, page


async def create_fresh_page(browser: Browser) -> Page:
    """
    Create a new page inside an existing browser (used after a page crash).
    Applies the same anti-detection setup as the original page.
    """
    return await _new_page(browser)


import urllib.parse

async def _new_page(browser: Browser) -> Page:
    """Internal: create a context + page with all anti-detect settings."""
    context_options = {
        "user_agent": random.choice(USER_AGENTS),
        "viewport": {"width": 1920, "height": 1080},
        "locale": "en-IN",
        "timezone_id": "Asia/Kolkata",
        "extra_http_headers": {
            "Accept-Language": "en-IN,en;q=0.9,ta;q=0.8",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
    }

    # Optional: Apply proxy rotation if PROXY_POOL is set in environment
    raw_pool = os.getenv("PROXY_POOL", "").strip()
    if raw_pool:
        proxies = [p.strip() for p in raw_pool.split(",") if p.strip()]
        if proxies:
            chosen_proxy = random.choice(proxies)
            parsed = urllib.parse.urlparse(chosen_proxy)
            proxy_settings = {"server": f"{parsed.scheme}://{parsed.hostname}:{parsed.port}"}
            if parsed.username and parsed.password:
                proxy_settings["username"] = parsed.username
                proxy_settings["password"] = urllib.parse.unquote(parsed.password)
            
            context_options["proxy"] = proxy_settings
            if _DEBUG:
                print(f"[Playwright] Using proxy: {parsed.hostname}")

    context = await browser.new_context(**context_options)
    
    # Block static assets — faster loads
    await context.route(
        "**/*.{png,jpg,jpeg,gif,svg,woff,woff2,ttf}",
        lambda route: route.abort(),
    )
    page = await context.new_page()
    await page.add_init_script(_ANTI_DETECT_JS)
    return page


# ── Search page ────────────────────────────────────────────────────────────────

async def fetch_search_page(url: str, page: Page) -> str:
    """Navigate to Amazon search URL and return rendered HTML."""
    try:
        await page.goto(url, wait_until="domcontentloaded", timeout=45_000)
        await asyncio.sleep(random.uniform(2, 4))
        await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        await asyncio.sleep(random.uniform(1, 2))
        html = await page.content()
        if _DEBUG:
            _dump_html(html, f"search_{url.split('k=')[-1][:20]}.html")
        return html
    except Exception as exc:
        print(f"[Playwright] Search error for {url}: {exc}")
        return ""


# ── Offers page ────────────────────────────────────────────────────────────────

async def _set_delivery_pincode(page: Page, pincode: str) -> None:
    """Best-effort: open the location picker and enter a TN pincode."""
    for selector in ["#glow-ingress-block", "#nav-global-location-popover-link"]:
        try:
            await page.locator(selector).first.click(timeout=3_000)
            break
        except Exception:
            continue

    updated = False
    for selector in ["#GLUXZipUpdateInput", "#GLUXZipUpdateInput_0"]:
        try:
            await page.locator(selector).first.fill(pincode, timeout=5_000)
            updated = True
            break
        except Exception:
            continue
    if not updated:
        return

    for selector in ["#GLUXZipUpdate input.a-button-input", "#GLUXZipUpdate-announce"]:
        try:
            await page.locator(selector).first.click(timeout=5_000)
            break
        except Exception:
            continue

    try:
        await page.wait_for_timeout(1_500)
        await page.locator(
            "#GLUXConfirmClose, .a-popover-footer input.a-button-input"
        ).first.click(timeout=2_000)
    except Exception:
        pass


async def fetch_offers_page(asin: str, pincode: str, page: Page) -> tuple[str, str]:
    """
    Navigate page → product → set pincode → AOD panel.
    Scrolls until the offer count stabilises to capture ALL lazy-loaded sellers.
    Returns (html, pincode).
    """
    if not pincode:
        pincode = random.choice(TN_PINCODES)

    aod_url = f"https://www.amazon.in/dp/{asin}?aod=1&condition=new"

    # Step 1 — warm up session on the product page
    await page.goto(
        f"https://www.amazon.in/dp/{asin}",
        wait_until="domcontentloaded",
        timeout=30_000,
    )
    await asyncio.sleep(random.uniform(2, 4))

    # Step 2 — set delivery pincode
    await _set_delivery_pincode(page, pincode)

    # Step 3 — load the All Offers (AOD) panel
    await page.goto(aod_url, wait_until="domcontentloaded", timeout=30_000)

    # Step 4 — wait for first offer card to appear
    try:
        await page.wait_for_selector(
            "#aod-offer, #aod-pinned-offer",
            timeout=15_000,
        )
    except Exception:
        # Try clicking "See all buying options" as fallback
        try:
            await page.click(
                "#buybox-see-all-buying-choices a, #aod-ingress-link",
                timeout=5_000,
            )
            await asyncio.sleep(2)
        except Exception:
            pass

    # Step 5 — scroll until offer count stabilises (catches ALL lazy-loaded sellers)
    prev_count = -1
    stable_rounds = 0
    for _ in range(8):  # max 8 scroll passes (~20-30s)
        # Scroll the AOD container first, then the whole page
        await page.evaluate("""
            () => {
                const container = document.getElementById('aod-container')
                              || document.getElementById('aod-offer-list')
                              || document.querySelector('[id*="aod-offer"]');
                if (container) container.scrollTo(0, container.scrollHeight);
                window.scrollTo(0, document.body.scrollHeight);
            }
        """)
        await asyncio.sleep(random.uniform(1.5, 2.5))

        current_count = len(await page.query_selector_all("#aod-offer"))
        if current_count == prev_count:
            stable_rounds += 1
            if stable_rounds >= 2:
                break  # Stable for 2 consecutive rounds — we have all offers
        else:
            stable_rounds = 0
        prev_count = current_count

    html = await page.content()

    # Debug dump (only when DEBUG=1)
    if _DEBUG:
        _dump_html(html, f"debug_{asin}.html")

    # Log summary
    offers     = await page.query_selector_all("#aod-offer")
    pinned_els = await page.query_selector_all("#aod-pinned-offer")
    sellers    = await page.query_selector_all("a[href*='seller=']")
    print(
        f"[Playwright] ASIN={asin}  pinned={len(pinned_els)}  "
        f"offers={len(offers)}  seller_links={len(sellers)}"
    )

    return html, pincode


# ── Internal helpers ───────────────────────────────────────────────────────────

def _dump_html(html: str, filename: str) -> None:
    try:
        os.makedirs("debug", exist_ok=True)
        with open(os.path.join("debug", filename), "w", encoding="utf-8") as fh:
            fh.write(html)
    except Exception as exc:
        print(f"[Playwright] Debug dump failed: {exc}")
