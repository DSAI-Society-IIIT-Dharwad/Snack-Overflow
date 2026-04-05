"""
Smoke test for the discovery pipeline.
Runs a single-query, single-page discovery against Amazon and prints results.
Does NOT write to Supabase — purely logs what would be saved.
"""

import os
import sys
import asyncio
import re
from parsel import Selector
from dotenv import load_dotenv

# Ensure UTF-8 output on Windows (avoids ₹ / Unicode crashes on CP1252 terminals)
if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from utils.playwright_helper import create_browser_context, fetch_search_page
from playwright.async_api import async_playwright
from simple_runner import _is_valid_asin, _detect_brand, _detect_model


TEST_QUERY = "SKF bearing 6205"
TEST_URL   = f"https://www.amazon.in/s?k={TEST_QUERY.replace(' ', '+')}&page=1"


async def _run() -> None:
    print(f"[Smoke] Fetching: {TEST_URL}")
    async with async_playwright() as p:
        browser, page = await create_browser_context(p)
        try:
            html = await fetch_search_page(TEST_URL, page)
        finally:
            await browser.close()

    if not html:
        print("[Smoke] No HTML returned — possible bot-detection block.")
        return

    sel      = Selector(text=html)
    products = sel.css("div[data-component-type='s-search-result']")
    print(f"[Smoke] Found {len(products)} products on page")

    valid = 0
    for product in products:
        asin  = product.attrib.get("data-asin", "").strip().upper()
        title = product.css("h2 span::text").get(default="").strip()
        if not _is_valid_asin(asin):
            continue
        brand = _detect_brand(title)
        model = _detect_model(title, TEST_QUERY)
        print(f"  ASIN={asin}  brand={brand:<8}  model={model:<10}  {title[:60]}")
        valid += 1

    print(f"\n[Smoke] {valid} valid ASINs found (would be upserted to asin_registry)")


if __name__ == "__main__":
    asyncio.run(_run())
