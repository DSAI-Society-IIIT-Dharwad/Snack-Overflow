import scrapy
from parsel import Selector
from scraper.items import SellerPriceItem
from utils.playwright_helper import fetch_offers_page
from config import TN_PINCODES, SUPABASE_URL, SUPABASE_KEY
from supabase import create_client
import random

class TrackingSpider(scrapy.Spider):
    """
    Phase B — For each active ASIN in registry,
    fetches all seller offers and stores price data.
    Runs on schedule every 6 hours.
    """
    name = "tracking"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

    def start_requests(self):
        # Load all active ASINs from Supabase
        result = (
            self.supabase.table("asin_registry")
            .select("asin, model, brand")
            .eq("is_active", True)
            .execute()
        )

        asins = result.data or []
        self.logger.info(f"Tracking {len(asins)} ASINs")

        for row in asins:
            yield scrapy.Request(
                url="data:text/html,<html></html>",
                callback=self.parse,
                meta={"asin": row["asin"]},
                dont_filter=True,
            )

    async def parse(self, response):
        asin    = response.meta["asin"]
        pincode = random.choice(TN_PINCODES)

        self.logger.info(f"Fetching offers for ASIN {asin} via Playwright...")
        html, pincode = await fetch_offers_page(asin, pincode)

        if not html:
            self.logger.warning(f"No HTML returned for {asin}")
            return []

        sel = Selector(text=html)
        items = []

        # ── Pinned / Buy Box offer ─────────────────────────────────────
        pinned = sel.css("#aod-pinned-offer")
        if pinned:
            item = self._extract_offer(pinned[0], asin, pincode, is_buybox=True)
            if item:
                items.append(item)

        # ── All other offers ───────────────────────────────────────────
        offers = sel.css("#aod-offer")
        self.logger.info(f"ASIN {asin}: {len(offers)} additional offers")

        for offer in offers:
            item = self._extract_offer(offer, asin, pincode, is_buybox=False)
            if item:
                items.append(item)

        # ── Static fallback if AOD panel empty ────────────────────────
        if not pinned and not offers:
            self.logger.warning(f"AOD empty for {asin} — using static fallback")
            items.extend(list(self._static_fallback(sel, asin, pincode)))

        return items

    def _extract_offer(self, offer, asin, pincode, is_buybox):
        item = SellerPriceItem()
        item["asin"]      = asin
        item["pincode"]   = pincode
        item["is_buybox"] = is_buybox

        # Price
        price = ""
        for sel in [
            "span.a-price span.a-offscreen",
            ".aod-price span.a-offscreen",
            "span.a-color-price",
        ]:
            price = offer.css(sel + "::text").get(default="").strip()
            if price:
                break
        item["price"] = price

        # Shipping
        shipping = (
            offer.css("#aod-offer-shipsFrom span.a-color-base::text").get(default="")
            or offer.css("div[id*='shipsFrom'] span::text").get(default="")
        ).strip()
        item["shipping"] = shipping

        # Total price = price + shipping (if numeric)
        item["total_price"] = self._calc_total(price, shipping)

        # Seller name
        seller_name = ""
        for sel in [
            "#aod-offer-soldBy a",
            "a[href*='seller=']",
            ".aod-merchant-info a",
        ]:
            seller_name = offer.css(sel + "::text").get(default="").strip()
            if seller_name:
                break
        item["seller_name"] = seller_name

        # Seller ID
        seller_href = (
            offer.css("#aod-offer-soldBy a::attr(href)").get(default="")
            or offer.css("a[href*='seller=']::attr(href)").get(default="")
        )
        seller_id = ""
        if "seller=" in seller_href:
            seller_id = seller_href.split("seller=")[-1].split("&")[0]
        item["seller_id"] = seller_id

        # FBA status
        ships_from = offer.css(
            "#aod-offer-shipsFrom span::text"
        ).get(default="").lower()
        item["fba_status"] = "FBA" if "amazon" in ships_from else "FBM"

        # Seller rating
        item["seller_rating"] = (
            offer.css("span[id*='seller-rating']::text").get(default="")
            or offer.css("i span.a-icon-alt::text").get(default="")
        ).strip()

        item["condition_type"] = "New"

        if not item["price"] and not item["seller_name"]:
            return None

        return item

    def _static_fallback(self, sel, asin, pincode):
        for link in sel.css("a[href*='seller=']"):
            seller_name = link.css("::text").get(default="").strip()
            seller_href = link.attrib.get("href", "")
            seller_id   = ""
            if "seller=" in seller_href:
                seller_id = seller_href.split("seller=")[-1].split("&")[0]
            if not seller_name or not seller_id:
                continue
            item = SellerPriceItem()
            item["asin"]           = asin
            item["pincode"]        = pincode
            item["seller_name"]    = seller_name
            item["seller_id"]      = seller_id
            item["price"]          = sel.css("span.a-price span.a-offscreen::text").get(default="").strip()
            item["total_price"]    = item["price"]
            item["shipping"]       = ""
            item["fba_status"]     = "FBA" if "amazon" in seller_name.lower() else "FBM"
            item["is_buybox"]      = True
            item["seller_rating"]  = ""
            item["condition_type"] = "New"
            yield item

    def _calc_total(self, price: str, shipping: str) -> str:
        try:
            import re
            p = float(re.sub(r"[^\d.]", "", price)) if price else 0
            s = float(re.sub(r"[^\d.]", "", shipping)) if shipping and "free" not in shipping.lower() else 0
            return str(round(p + s, 2)) if p else ""
        except Exception:
            return ""