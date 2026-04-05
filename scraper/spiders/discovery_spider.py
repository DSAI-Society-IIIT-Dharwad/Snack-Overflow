import scrapy
import re
from parsel import Selector
from scraper.items import AsinRegistryItem
from config import SEARCH_QUERIES, MAX_PAGES, BEARING_BRANDS, SKF_MODELS
from utils.playwright_helper import fetch_search_page

class DiscoverySpider(scrapy.Spider):
    """
    Phase A — Searches Amazon.in for bearing models,
    collects ASINs and saves to asin_registry.
    Run once to build your tracking list.
    """
    name = "discovery"
    allowed_domains = ["amazon.in"]

    HEADERS = {
        "Accept":          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-IN,en;q=0.9,ta;q=0.8",
        "User-Agent":      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36",
    }

    def start_requests(self):
        max_pages = min(MAX_PAGES, 2)
        for query in SEARCH_QUERIES:
            for page in range(1, max_pages + 1):
                target_url = f"https://www.amazon.in/s?k={query.replace(' ', '+')}&page={page}"
                # Use a local data URL to keep Scrapy flow while fetching target HTML via Playwright only.
                yield scrapy.Request(
                    "data:text/html,<html></html>",
                    callback=self.parse_search,
                    meta={"query": query, "page": page, "target_url": target_url},
                    dont_filter=True,
                )

    async def parse_search(self, response):
        query = response.meta["query"]
        page = response.meta["page"]
        target_url = response.meta["target_url"]

        self.logger.info(f"Fetching search page via Playwright: {target_url}")
        html = await fetch_search_page(target_url)
        if not html:
            self.logger.warning(f"No HTML returned for query='{query}' page={page}")
            return []

        sel = Selector(text=html)
        products = sel.css("div[data-component-type='s-search-result']")
        self.logger.info(f"Query='{query}' Page={page} → {len(products)} products")

        items = []
        for product in products:
            asin  = product.attrib.get("data-asin", "")
            if not asin:
                continue

            title = product.css("h2 span::text").get(default="").strip()
            brand = self._detect_brand(title)
            model = self._detect_model(title, query)

            item = AsinRegistryItem()
            item["asin"]         = asin
            item["title"]        = title
            item["brand"]        = brand
            item["model"]        = model
            item["search_query"] = query
            items.append(item)

        return items

    def _detect_brand(self, title: str) -> str:
        t = title.upper()
        for brand in BEARING_BRANDS:
            if brand.upper() in t:
                return brand
        return "OTHER"

    def _detect_model(self, title: str, query: str) -> str:
        # Try to extract model from query first
        for model in SKF_MODELS:
            if model in query or model in title:
                return model
        # Fallback — extract numeric model from title
        match = re.search(r'\b\d{4,5}(-\w+)?\b', title)
        return match.group(0) if match else ""