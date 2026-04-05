"""
Simple async runner — the actual entry point used by run.py / scheduler.py.

Key design decisions vs. the original:
- One asyncio.run() per top-level call (not one per ASIN).
- One Playwright browser/page shared for the entire discovery or tracking run,
  avoiding the massive overhead of launching Chromium per ASIN.
- Price-alert logic is here (it was only in the unused Scrapy pipeline before).
- Timestamps use datetime.now(timezone.utc).isoformat() instead of "now()".
"""

from __future__ import annotations

import asyncio
import random
import re
import sys
from datetime import datetime, timezone
from parsel import Selector
from playwright.async_api import async_playwright
from supabase import create_client

# Ensure UTF-8 output on Windows (avoids ₹ / Unicode crashes on CP1252 terminals)
if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from config import (
    BEARING_BRANDS,
    MAX_PAGES,
    SEARCH_QUERIES,
    SKF_MODELS,
    SUPABASE_KEY,
    SUPABASE_URL,
    TN_PINCODES,
)
from utils.playwright_helper import (
    create_browser_context,
    create_fresh_page,
    fetch_offers_page,
    fetch_search_page,
)

ASIN_PATTERN = re.compile(r"^[A-Z0-9]{10}$")


# ── Tiny utilities ─────────────────────────────────────────────────────────────

def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _is_valid_asin(value: str) -> bool:
    return bool(value and ASIN_PATTERN.match(value.strip().upper()))


def _detect_brand(title: str) -> str:
    t = title.upper()
    for brand in BEARING_BRANDS:
        if brand.upper() in t:
            return brand
    return "OTHER"


def _detect_model(title: str, query: str) -> str:
    for model in SKF_MODELS:
        if model in query or model in title:
            return model
    match = re.search(r"\b\d{4,5}(-\w+)?\b", title)
    return match.group(0) if match else ""


def _calc_total(price: str, shipping: str) -> float | None:
    try:
        p = float(re.sub(r"[^\d.]", "", price)) if price else 0
        s = (
            float(re.sub(r"[^\d.]", "", shipping))
            if shipping and "free" not in shipping.lower()
            else 0
        )
        return round(p + s, 2) if p else None
    except Exception:
        return None


# ── Offer extraction ───────────────────────────────────────────────────────────

def _extract_offer_row(
    offer, asin: str, pincode: str, is_buybox: bool
) -> dict | None:
    """Parse a single #aod-offer or #aod-pinned-offer element."""
    price = ""
    for css_sel in [
        "span.a-price span.a-offscreen",
        ".aod-price span.a-offscreen",
        "span.a-color-price",
    ]:
        price = offer.css(css_sel + "::text").get(default="").strip()
        if price:
            break

    shipping = (
        offer.css("#aod-offer-shipsFrom span.a-color-base::text").get(default="")
        or offer.css("div[id*='shipsFrom'] span::text").get(default="")
    ).strip()

    seller_name = ""
    for css_sel in [
        "#aod-offer-soldBy a",
        "a[href*='seller=']",
        ".aod-merchant-info a",
        "div#aod-offer-soldBy span::text",
    ]:
        seller_name = offer.css(css_sel + "::text").get(default="").strip()
        if seller_name:
            break

    seller_href = (
        offer.css("#aod-offer-soldBy a::attr(href)").get(default="")
        or offer.css("a[href*='seller=']::attr(href)").get(default="")
    )
    seller_id = ""
    if "seller=" in seller_href:
        seller_id = seller_href.split("seller=")[-1].split("&")[0]
    elif "amazon" in seller_name.lower():
        seller_id = "AMAZON_IN"
    elif not seller_id and seller_name:
        # Fallback pseudo-ID if we have a name but no ID (risky for upsert, but keeps data)
        seller_id = re.sub(r"[^\w]", "_", seller_name).upper()

    if not price and not seller_name:
        return None

    ships_from = offer.css("#aod-offer-shipsFrom span::text").get(default="").lower()

    return {
        "asin":          asin,
        "seller_name":   seller_name,
        "seller_id":     seller_id,
        "price":         float(re.sub(r"[^\d.]", "", price)) if price else None,
        "total_price":   _calc_total(price, shipping),
        "shipping":      shipping,
        "fba_status":    "FBA" if ("amazon" in ships_from or "amazon" in seller_name.lower()) else "FBM",
        "is_buybox":     bool(is_buybox),
        "seller_rating": (
            offer.css("span[id*='seller-rating']::text").get(default="")
            or offer.css("i span.a-icon-alt::text").get(default="")
        ).strip(),
        "condition_type": "New",
        "pincode":        pincode,
    }


def _extract_fallback_rows(sel, asin: str, pincode: str) -> list[dict]:
    """
    Fallback: when the AOD panel is empty but seller links exist on the page,
    build minimal rows from those links so we still capture something.
    """
    rows: list[dict] = []
    seen: set[str] = set()
    base_txt = sel.css("span.a-price span.a-offscreen::text").get(default="").strip()
    base_price = float(re.sub(r"[^\d.]", "", base_txt)) if base_txt else None

    for link in sel.css("a[href*='seller=']"):
        seller_name = link.css("::text").get(default="").strip()
        href = link.attrib.get("href", "")
        seller_id = ""
        if "seller=" in href:
            seller_id = href.split("seller=")[-1].split("&")[0]
        if not seller_name or not seller_id or seller_id in seen:
            continue
        seen.add(seller_id)
        rows.append(
            {
                "asin":          asin,
                "seller_name":   seller_name,
                "seller_id":     seller_id,
                "price":         base_price,
                "total_price":   base_price,
                "shipping":      "",
                "fba_status":    "FBA" if "amazon" in seller_name.lower() else "FBM",
                "is_buybox":     False,
                "seller_rating": "",
                "condition_type": "New",
                "pincode":        pincode,
            }
        )
    return rows


# ── Price-alert logic ──────────────────────────────────────────────────────────

def _check_and_create_alert(
    client, offer_row: dict, new_price: float
) -> None:
    """
    Query current_prices for the previous price.  If the change is >1%,
    insert a row into price_alerts.  Must be called BEFORE upserting
    current_prices so the comparison is against the old value.
    """
    asin      = offer_row.get("asin", "")
    seller_id = offer_row.get("seller_id", "")
    if not seller_id:
        return

    try:
        result = (
            client.table("current_prices")
            .select("price")
            .eq("asin", asin)
            .eq("seller_id", seller_id)
            .execute()
        )
        if not result or not result.data:
            return  # First-time entry — no previous price to compare

        old_price = float(result.data[0].get("price") or 0)
        if old_price == 0:
            return

        change_pct = ((new_price - old_price) / old_price) * 100

        if abs(change_pct) > 1:
            client.table("price_alerts").insert(
                {
                    "asin":        asin,
                    "seller_id":   seller_id,
                    "seller_name": offer_row.get("seller_name", ""),
                    "old_price":   old_price,
                    "new_price":   new_price,
                    "change_pct":  round(change_pct, 2),
                    "created_at":  _now_iso(),
                }
            ).execute()
            print(
                f"[Alert] {offer_row.get('seller_name')} | {asin} | "
                f"₹{old_price} → ₹{new_price} ({change_pct:+.1f}%)"
            )

    except Exception as exc:
        print(f"[Alert] Check error for {asin}/{seller_id}: {exc}")


# ── DB write helper ────────────────────────────────────────────────────────────

def _save_offer_rows(client, asin: str, offers: list[dict]) -> int:
    """
    For each offer:
      1. Append to `seller_prices` (history).
      2. Check for a significant price change → insert into `price_alerts`.
      3. Upsert into `current_prices` (live snapshot).
    Returns the number of rows successfully persisted.
    """
    saved = 0
    ts = _now_iso()
    for offer in offers:
        try:
            # 1 — history
            client.table("seller_prices").insert(offer).execute()

            # 2 — price alert (BEFORE updating current_prices)
            new_price = offer.get("price")
            seller_id = offer.get("seller_id")
            if new_price and seller_id:
                _check_and_create_alert(client, offer, new_price)

            # 3 — live snapshot (manual upsert to bypass missing unique index errors)
            if seller_id:
                client.table("current_prices").delete().eq("asin", asin).eq("seller_id", seller_id).execute()
            
            # Remove keys that current_prices table doesn't have
            snapshot = {**offer, "last_updated": ts}
            snapshot.pop("condition_type", None)
            
            client.table("current_prices").insert(snapshot).execute()

            saved += 1

        except Exception as exc:
            print(f"[Tracking] DB error for ASIN {asin} Seller: {offer.get('seller_name')}: {exc}")

    return saved


# ── Discovery (Phase A) ────────────────────────────────────────────────────────

async def _run_discovery_async() -> None:
    client    = create_client(SUPABASE_URL, SUPABASE_KEY)
    max_pages = min(MAX_PAGES, 2)
    saved     = 0

    async with async_playwright() as p:
        browser, page = await create_browser_context(p)
        try:
            for query in SEARCH_QUERIES:
                for page_num in range(1, max_pages + 1):
                    url = (
                        f"https://www.amazon.in/s?"
                        f"k={query.replace(' ', '+')}&page={page_num}"
                    )
                    print(f"[Discovery] Fetching: {url}")
                    html = await fetch_search_page(url, page)
                    if not html:
                        print(f"[Discovery] No HTML — query='{query}' page={page_num}")
                        continue

                    sel      = Selector(text=html)
                    products = sel.css("div[data-component-type='s-search-result']")
                    print(
                        f"[Discovery] '{query}' page {page_num} → "
                        f"{len(products)} products"
                    )

                    for product in products:
                        asin = product.attrib.get("data-asin", "").strip().upper()
                        if not _is_valid_asin(asin):
                            continue

                        title = product.css("h2 span::text").get(default="").strip()
                        row = {
                            "asin":         asin,
                            "title":        title,
                            "brand":        _detect_brand(title),
                            "model":        _detect_model(title, query),
                            "search_query": query,
                            "is_active":    True,
                            "last_seen":    _now_iso(),
                        }
                        try:
                            client.table("asin_registry").upsert(
                                row, on_conflict="asin"
                            ).execute()
                            saved += 1
                        except Exception as exc:
                            print(f"[Discovery] Save error for {asin}: {exc}")
        finally:
            try:
                await browser.close()
            except Exception:
                pass

    print(f"[Discovery] Done. Saved/updated {saved} rows in asin_registry.")


# ── Tracking (Phase B) ─────────────────────────────────────────────────────────

async def _run_tracking_async(asins: list[dict]) -> None:
    client = create_client(SUPABASE_URL, SUPABASE_KEY)
    saved  = 0

    async with async_playwright() as p:
        browser, page = await create_browser_context(p)
        try:
            for row in asins:
                asin = (row.get("asin") or "").strip().upper()
                if not _is_valid_asin(asin):
                    continue

                pincode = random.choice(TN_PINCODES)
                print(f"[Tracking] ASIN={asin} | Pincode={pincode} | Model={row.get('model', 'N/A')}")

                try:
                    html, pincode = await fetch_offers_page(asin, pincode, page)
                except BaseException as exc:
                    print(f"[Tracking] CRASH for {asin}: {exc}. Re-creating page...")
                    try:
                        await page.close()
                    except:
                        pass
                    # Recover: create a fresh page within the same browser
                    page = await create_fresh_page(browser)
                    continue

                if not html:
                    print(f"[Tracking] No HTML returned for {asin}")
                    continue

                sel                = Selector(text=html)
                offers_to_save: list[dict] = []

                # Buy-box (pinned) offer
                pinned = sel.css("#aod-pinned-offer")
                if pinned:
                    r = _extract_offer_row(pinned[0], asin, pincode, True)
                    if r:
                        offers_to_save.append(r)

                # All other seller offers
                for offer in sel.css("#aod-offer"):
                    r = _extract_offer_row(offer, asin, pincode, False)
                    if r:
                        offers_to_save.append(r)

                # Static fallback when AOD panel is empty
                if not offers_to_save:
                    print(f"[Tracking] AOD empty for {asin} — using static fallback")
                    offers_to_save.extend(_extract_fallback_rows(sel, asin, pincode))

                if not offers_to_save:
                    print(f"[Tracking] No offers found for {asin} — skipping")
                    continue

                print(f"[Tracking] {asin} — saving {len(offers_to_save)} offer(s)")
                saved += _save_offer_rows(client, asin, offers_to_save)

        finally:
            try:
                await browser.close()
            except Exception:
                pass

    print(f"[Tracking] Done. Saved {saved} rows across seller_prices / current_prices.")


# ── Public API (called by run.py / scheduler.py) ───────────────────────────────

def run_discovery() -> None:
    """Phase A: search Amazon, populate asin_registry."""
    asyncio.run(_run_discovery_async())


def run_tracking() -> None:
    """Phase B: scrape all seller offers for every active ASIN."""
    client = create_client(SUPABASE_URL, SUPABASE_KEY)
    all_rows = (
        client.table("asin_registry")
        .select("asin, model")
        .eq("is_active", True)
        .execute()
        .data
        or []
    )
    valid = [r for r in all_rows if _is_valid_asin(r.get("asin", ""))]
    print(
        f"[Tracking] Active rows: {len(all_rows)} | "
        f"Valid ASINs to track: {len(valid)}"
    )
    asyncio.run(_run_tracking_async(valid))


def run_tracking_models(models: list[str]) -> None:
    """Phase B: track all ASINs matching specific models."""
    client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    # Query ASINs that match the requested models
    all_rows = (
        client.table("asin_registry")
        .select("asin, model")
        .eq("is_active", True)
        .in_("model", models)
        .execute()
        .data
        or []
    )
    
    valid = [r for r in all_rows if _is_valid_asin(r.get("asin", ""))]
    print(
        f"[Tracking Models] Models={models} | "
        f"Valid ASINs found: {len(valid)}"
    )
    
    if not valid:
        print("[Tracking Models] No ASINs found for these models. Run discovery first?")
        return

    asyncio.run(_run_tracking_async(valid))


def run_tracking_known(limit_per_model: int = 2) -> None:
    """
    Phase B (quick mode): track a small per-model sample of known ASINs.
    Useful for smoke-testing the tracking pipeline without a full run.
    """
    client = create_client(SUPABASE_URL, SUPABASE_KEY)
    rows = (
        client.table("asin_registry")
        .select("asin,model,title")
        .eq("is_active", True)
        .execute()
        .data
        or []
    )

    picked: list[dict] = []
    for model in SKF_MODELS:
        seen: set[str] = set()
        count = 0
        for row in rows:
            asin = (row.get("asin") or "").strip().upper()
            if not _is_valid_asin(asin) or asin in seen:
                continue
            title     = (row.get("title") or "").upper()
            row_model = row.get("model") or ""
            if row_model == model or model in title:
                seen.add(asin)
                picked.append({"asin": asin, "model": model})
                count += 1
                if count >= limit_per_model:
                    break

    if not picked:
        print("[Tracking] No known valid ASINs found for configured models.")
        return

    print(
        f"[Tracking] Known-ASIN sample: {len(picked)} ASINs "
        f"across {len(set(r['model'] for r in picked))} models"
    )
    asyncio.run(_run_tracking_async(picked))
