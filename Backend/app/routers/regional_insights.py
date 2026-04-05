from collections import defaultdict
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import AsinRegistry, CurrentPrices, SellerPrices
from app.schemas import RegionData, RegionalInsightsResponse, RegionWeeklyPoint
from app.utils import derive_region

router = APIRouter(prefix="/regional-insights", tags=["Regional Insights"])

# ---------------------------------------------------------------------------
# Static metadata per region
# ---------------------------------------------------------------------------
_REGION_META: dict[str, dict] = {
    "North": {
        "display_name": "North India",
        "cities": ["Delhi", "Chandigarh", "Lucknow", "Jaipur"],
    },
    "South": {
        "display_name": "South India",
        "cities": ["Bangalore", "Chennai", "Hyderabad", "Kochi"],
    },
    "West": {
        "display_name": "West India",
        "cities": ["Mumbai", "Pune", "Ahmedabad", "Surat"],
    },
    "East": {
        "display_name": "East India",
        "cities": ["Kolkata", "Bhubaneswar", "Patna", "Guwahati"],
    },
}

_DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]


# =============================================================================
# GET /regional-insights?asin=B08XYZ
# Returns region-level pricing stats + weekly trend for all 4 regions
# =============================================================================
@router.get("/", status_code=status.HTTP_200_OK, response_model=RegionalInsightsResponse)
async def get_regional_insights(
    asin: str = Query(..., description="Amazon ASIN to analyse"),
    db: Session = Depends(get_db),
):
    asin = asin.strip().upper()

    # ------------------------------------------------------------------
    # 1. Verify ASIN exists
    # ------------------------------------------------------------------
    registry = db.query(AsinRegistry).filter(AsinRegistry.asin == asin).first()
    if not registry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ASIN {asin} not found in registry.",
        )

    last_scraped = (
        db.query(func.max(CurrentPrices.last_updated))
        .filter(CurrentPrices.asin == asin)
        .scalar()
    )

    # ------------------------------------------------------------------
    # 2. Build seller_id → region map from CurrentPrices (has formatted
    #    seller_name like "QuickShip India, MH")
    # ------------------------------------------------------------------
    all_current = db.query(CurrentPrices).filter(CurrentPrices.asin == asin).all()
    seller_region_map: dict[str, str] = {}
    for row in all_current:
        reg = derive_region(row.seller_name)
        if reg and row.seller_id:
            seller_region_map[row.seller_id] = reg

    # ------------------------------------------------------------------
    # 3. Current snapshot — group CurrentPrices by region
    # ------------------------------------------------------------------
    region_prices: dict[str, list[float]] = defaultdict(list)
    for row in all_current:
        reg = derive_region(row.seller_name)
        if reg and row.price is not None:
            region_prices[reg].append(float(row.price))

    # ------------------------------------------------------------------
    # 4. Previous-week prices — for price_change_pct card badge
    # ------------------------------------------------------------------
    now = datetime.utcnow()
    week_ago = now - timedelta(days=7)
    two_weeks_ago = now - timedelta(days=14)

    prev_week_rows = (
        db.query(SellerPrices)
        .filter(
            SellerPrices.asin == asin,
            SellerPrices.scraped_at >= two_weeks_ago,
            SellerPrices.scraped_at < week_ago,
        )
        .all()
    )

    prev_region_prices: dict[str, list[float]] = defaultdict(list)
    for row in prev_week_rows:
        reg = seller_region_map.get(row.seller_id) or derive_region(row.seller_name)
        if reg and row.price is not None:
            prev_region_prices[reg].append(float(row.price))

    # ------------------------------------------------------------------
    # 5. Weekly trend (last 7 days) — group by region + day-of-week
    # ------------------------------------------------------------------
    weekly_rows = (
        db.query(SellerPrices)
        .filter(SellerPrices.asin == asin, SellerPrices.scraped_at >= week_ago)
        .all()
    )

    # region → { weekday_int → [prices] }
    region_day_prices: dict[str, dict[int, list[float]]] = {
        r: defaultdict(list) for r in _REGION_META
    }
    for row in weekly_rows:
        reg = seller_region_map.get(row.seller_id) or derive_region(row.seller_name)
        if reg and reg in region_day_prices and row.price is not None:
            weekday = row.scraped_at.weekday()  # 0=Mon … 6=Sun
            region_day_prices[reg][weekday].append(float(row.price))

    # ------------------------------------------------------------------
    # 6. Assemble RegionData for all 4 regions
    # ------------------------------------------------------------------
    regions: list[RegionData] = []
    for reg, meta in _REGION_META.items():
        prices = region_prices.get(reg, [])
        prev_prices = prev_region_prices.get(reg, [])

        avg_price = round(sum(prices) / len(prices), 2) if prices else None
        lowest_price = round(min(prices), 2) if prices else None
        seller_count = len({
            row.seller_id for row in all_current
            if derive_region(row.seller_name) == reg
        })

        # Price change vs previous week
        price_change_pct: float | None = None
        if prev_prices and avg_price is not None:
            prev_avg = sum(prev_prices) / len(prev_prices)
            if prev_avg > 0:
                price_change_pct = round((avg_price - prev_avg) / prev_avg * 100, 2)

        # Weekly trend Mon-Sun
        weekly_trend: list[RegionWeeklyPoint] = []
        day_map = region_day_prices.get(reg, {})
        for wd in range(7):
            day_vals = day_map.get(wd, [])
            weekly_trend.append(
                RegionWeeklyPoint(
                    day=_DAY_NAMES[wd],
                    avg_price=round(sum(day_vals) / len(day_vals), 2) if day_vals else None,
                )
            )

        regions.append(
            RegionData(
                region=reg,
                display_name=meta["display_name"],
                avg_price=avg_price,
                lowest_price=lowest_price,
                seller_count=seller_count,
                price_change_pct=price_change_pct,
                cities=meta["cities"],
                weekly_trend=weekly_trend,
            )
        )

    # ------------------------------------------------------------------
    # 7. Return
    # ------------------------------------------------------------------
    return RegionalInsightsResponse(
        asin=asin,
        product_title=registry.title,
        last_scraped=last_scraped,
        regions=regions,
    )
