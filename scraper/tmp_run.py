import asyncio
import sys
import config

# Temporarily bypass configuration to make discovery fast and limited
config.SEARCH_QUERIES = ["SKF bearing 6205"]
config.MAX_PAGES = 1

from simple_runner import _run_discovery_async, _run_tracking_async
from supabase import create_client

# Ensure UTF-8 output on Windows
if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

async def custom_run():
    print("--- Running Fast Discovery (1 model, 1 page) ---")
    await _run_discovery_async()
    
    print("\n--- Running Tracking for up to 5 ASINs ---")
    client = create_client(config.SUPABASE_URL, config.SUPABASE_KEY)
    rows = client.table("asin_registry").select("asin,model,title").eq("is_active", True).limit(5).execute().data
    
    if not rows:
        print("No ASINs found in registry.")
        return
        
    print(f"Selected {len(rows)} ASINs to track: {[r['asin'] for r in rows]}")
    await _run_tracking_async(rows)

if __name__ == "__main__":
    asyncio.run(custom_run())
