from datetime import datetime, timezone
from supabase import create_client
from scraper.items import AsinRegistryItem, SellerPriceItem
from config import SUPABASE_URL, SUPABASE_KEY
import re


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

class SupabasePipeline:

    @classmethod
    def from_crawler(cls, crawler):
        return cls()

    def open_spider(self, spider=None):
        self.client = create_client(SUPABASE_URL, SUPABASE_KEY)
        self.saved_asins = 0
        self.saved_prices = 0

    def close_spider(self, spider=None):
        print(f"\n[Pipeline] Done — {self.saved_asins} ASINs, {self.saved_prices} price records saved")

    def process_item(self, item, spider=None):
        if isinstance(item, AsinRegistryItem):
            return self._save_asin(item)
        elif isinstance(item, SellerPriceItem):
            return self._save_price(item)
        return item

    def _save_asin(self, item):
        try:
            self.client.table("asin_registry").upsert({
                "asin":         item.get("asin", ""),
                "title":        item.get("title", ""),
                "brand":        item.get("brand", ""),
                "model":        item.get("model", ""),
                "search_query": item.get("search_query", ""),
                "is_active":    True,
                "last_seen":    _now_iso(),
            }, on_conflict="asin").execute()
            self.saved_asins += 1
        except Exception as e:
            print(f"[Pipeline] ASIN save error: {e}")
        return item

    def _save_price(self, item):
        raw   = item.get("price", "") or ""
        clean = re.sub(r"[^\d.]", "", raw)
        price = float(clean) if clean else None

        raw_t   = item.get("total_price", "") or ""
        clean_t = re.sub(r"[^\d.]", "", raw_t)
        total   = float(clean_t) if clean_t else price

        row = {
            "asin":          item.get("asin", ""),
            "seller_name":   item.get("seller_name", ""),
            "seller_id":     item.get("seller_id", ""),
            "price":         price,
            "total_price":   total,
            "shipping":      item.get("shipping", ""),
            "fba_status":    item.get("fba_status", ""),
            "is_buybox":     bool(item.get("is_buybox", False)),
            "seller_rating": item.get("seller_rating", ""),
            "condition_type":item.get("condition_type", "New"),
            "pincode":       item.get("pincode", ""),
        }

        try:
            # 1 — Append to history
            self.client.table("seller_prices").insert(row).execute()

            # 2 — Check price change BEFORE upsert
            if price and item.get("seller_id"):
                self._check_alert(item, price)

            # 3 — Upsert live snapshot
            self.client.table("current_prices").upsert(
                {**row, "last_updated": _now_iso()},
                on_conflict="asin,seller_id"
            ).execute()

            self.saved_prices += 1

        except Exception as e:
            print(f"[Pipeline] Price save error: {e}")

        return item

    def _check_alert(self, item, new_price):
        try:
            result = (
                self.client.table("current_prices")
                .select("price")
                .eq("asin", item.get("asin"))
                .eq("seller_id", item.get("seller_id"))
                .execute()
            )
            if not result.data:
                return

            old_price = float(result.data[0].get("price") or 0)
            if old_price == 0:
                return

            change_pct = ((new_price - old_price) / old_price) * 100

            if abs(change_pct) > 1:
                self.client.table("price_alerts").insert({
                    "asin":        item.get("asin"),
                    "seller_id":   item.get("seller_id"),
                    "seller_name": item.get("seller_name"),
                    "old_price":   old_price,
                    "new_price":   new_price,
                    "change_pct":  round(change_pct, 2),
                }).execute()
                print(f"[Alert] {item.get('seller_name')} changed {old_price} → {new_price} ({change_pct:.1f}%)")

        except Exception as e:
            print(f"[Pipeline] Alert check error: {e}")