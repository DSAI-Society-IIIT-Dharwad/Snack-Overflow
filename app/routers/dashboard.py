from datetime import datetime, timedelta

from fastapi import Depends, status, HTTPException, APIRouter, Query
from sqlalchemy import func, cast, Date
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import AsinRegistry, SellerPrices, CurrentPrices, PriceAlerts
from app.schemas import DashboardResponse, PriceTrendPoint, SellerComparisonItem

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


# ---------------------------------------------------------------------------
# State-code → region mapping (Indian states)
# ---------------------------------------------------------------------------
_STATE_REGION: dict[str, str] = {
    # North
    "DL": "North", "UP": "North", "HR": "North", "PB": "North",
    "HP": "North", "UK": "North", "JK": "North", "RJ": "North",
    # South
    "KA": "South", "TN": "South", "KL": "South", "AP": "South",
    "TG": "South", "PY": "South",
    # East
    "WB": "East", "OR": "East", "BR": "East", "JH": "East",
    "AS": "East", "NL": "East", "MN": "East", "TR": "East",
    # West
    "MH": "West", "GJ": "West", "MP": "West", "CG": "West", "GA": "West",
}


def _derive_region(location: str | None) -> str | None:
    """Extract state code from '"City, ST"' and map to region."""
    if not location:
        return None
    parts = location.rsplit(",", 1)
    if len(parts) == 2:
        state_code = parts[1].strip().upper()
        return _STATE_REGION.get(state_code)
    return None


# =============================================================================
# GET /dashboard?asin=B08XYZ&seller_id=A1B2C3
# Returns all data needed to render the dashboard for a seller × ASIN pair
# =============================================================================
@router.get("/", status_code=status.HTTP_200_OK, response_model=DashboardResponse)
async def get_dashboard(
    asin: str = Query(..., description="Amazon ASIN to analyse"),
    seller_id: str = Query(..., description="Your seller ID"),
    db: Session = Depends(get_db),
):
    asin = asin.strip().upper()
    seller_id = seller_id.strip()

    # ------------------------------------------------------------------
    # 1. Verify ASIN exists
    # ------------------------------------------------------------------
    registry = db.query(AsinRegistry).filter(AsinRegistry.asin == asin).first()
    if not registry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ASIN {asin} not found in registry.",
        )

    # ------------------------------------------------------------------
    # 2. Current market snapshot from CurrentPrices
    # ------------------------------------------------------------------
    market_stats = (
        db.query(
            func.min(CurrentPrices.price).label("lowest_price"),
            func.avg(CurrentPrices.price).label("avg_price"),
            func.count(CurrentPrices.seller_id).label("seller_count"),
            func.max(CurrentPrices.last_updated).label("last_scraped"),
        )
        .filter(CurrentPrices.asin == asin)
        .one()
    )

    lowest_market_price = float(market_stats.lowest_price) if market_stats.lowest_price else None
    market_avg = round(float(market_stats.avg_price)) if market_stats.avg_price else None
    active_sellers = int(market_stats.seller_count or 0)
    last_scraped = market_stats.last_scraped

    # ------------------------------------------------------------------
    # 3. Yesterday's lowest price (for % change badge on first card)
    # ------------------------------------------------------------------
    yesterday = datetime.utcnow() - timedelta(days=1)
    yesterday_low_row = (
        db.query(func.min(SellerPrices.price).label("low"))
        .filter(
            SellerPrices.asin == asin,
            SellerPrices.scraped_at >= yesterday,
            SellerPrices.scraped_at < datetime.utcnow(),
        )
        .one()
    )
    lowest_price_change_pct: float | None = None
    if lowest_market_price and yesterday_low_row.low:
        yesterday_low = float(yesterday_low_row.low)
        if yesterday_low > 0:
            lowest_price_change_pct = round(
                (lowest_market_price - yesterday_low) / yesterday_low * 100, 2
            )

    # ------------------------------------------------------------------
    # 4. New sellers this week
    # ------------------------------------------------------------------
    week_ago = datetime.utcnow() - timedelta(days=7)
    new_sellers_this_week = (
        db.query(func.count(func.distinct(SellerPrices.seller_id)))
        .filter(SellerPrices.asin == asin, SellerPrices.scraped_at >= week_ago)
        .scalar()
        or 0
    )

    # ------------------------------------------------------------------
    # 5. Undercut alerts — unread PriceAlerts for this ASIN
    # ------------------------------------------------------------------
    undercut_alerts = (
        db.query(func.count(PriceAlerts.id))
        .filter(PriceAlerts.asin == asin, PriceAlerts.is_read == False)
        .scalar()
        or 0
    )

    # ------------------------------------------------------------------
    # 6. Your current price from CurrentPrices
    # ------------------------------------------------------------------
    your_row = (
        db.query(CurrentPrices)
        .filter(CurrentPrices.asin == asin, CurrentPrices.seller_id == seller_id)
        .first()
    )
    your_price = float(your_row.price) if your_row and your_row.price else None

    # ------------------------------------------------------------------
    # 7. Your latest price change % from PriceAlerts
    # ------------------------------------------------------------------
    your_alert = (
        db.query(PriceAlerts)
        .filter(PriceAlerts.asin == asin, PriceAlerts.seller_id == seller_id)
        .order_by(PriceAlerts.detected_at.desc())
        .first()
    )
    your_change_pct = float(your_alert.change_pct) if your_alert and your_alert.change_pct else None

    # ------------------------------------------------------------------
    # 8. Seller comparison table — all sellers for this ASIN
    # ------------------------------------------------------------------
    all_sellers = (
        db.query(CurrentPrices)
        .filter(CurrentPrices.asin == asin)
        .order_by(CurrentPrices.price.asc().nullslast())
        .all()
    )

    # Compute relevance scores: lowest seller = 100, scale others down
    prices_with_val = [float(s.price) for s in all_sellers if s.price is not None]
    max_price_val = max(prices_with_val) if prices_with_val else None
    min_price_val = float(lowest_market_price) if lowest_market_price else None

    seller_comparison: list[SellerComparisonItem] = []
    for s in all_sellers:
        s_price = float(s.price) if s.price else None
        if s_price is not None and min_price_val is not None and max_price_val is not None:
            price_range = max_price_val - min_price_val
            rel = int(100 - ((s_price - min_price_val) / price_range * 85)) if price_range > 0 else 100
        else:
            rel = None

        location = s.seller_name  # seller_name often stores "Name, ST" in scraped data
        # Try to build a location string from pincode field if present
        location_str: str | None = None
        if s.pincode:
            location_str = s.pincode  # fallback – frontend may enrich this

        seller_comparison.append(
            SellerComparisonItem(
                seller_id=s.seller_id,
                seller_name=s.seller_name,
                price=s_price,
                is_lowest=(s_price == min_price_val) if s_price is not None else False,
                fba_status=s.fba_status or "FBM",
                region=_derive_region(s.seller_name),
                location=location_str,
                relevance_score=max(15, rel) if rel is not None else None,
                is_buybox=bool(s.is_buybox),
            )
        )

    # ------------------------------------------------------------------
    # 9. Price trend history — daily buckets from SellerPrices
    #    Returns up to 90 days; client can slice to 7/30/90 as needed
    # ------------------------------------------------------------------
    ninety_days_ago = datetime.utcnow() - timedelta(days=90)

    # Market average per day (all sellers)
    market_daily = (
        db.query(
            cast(SellerPrices.scraped_at, Date).label("day"),
            func.avg(SellerPrices.price).label("avg_price"),
        )
        .filter(SellerPrices.asin == asin, SellerPrices.scraped_at >= ninety_days_ago)
        .group_by(cast(SellerPrices.scraped_at, Date))
        .order_by(cast(SellerPrices.scraped_at, Date))
        .all()
    )

    # Your own price per day
    your_daily = (
        db.query(
            cast(SellerPrices.scraped_at, Date).label("day"),
            func.avg(SellerPrices.price).label("your_price"),
        )
        .filter(
            SellerPrices.asin == asin,
            SellerPrices.seller_id == seller_id,
            SellerPrices.scraped_at >= ninety_days_ago,
        )
        .group_by(cast(SellerPrices.scraped_at, Date))
        .order_by(cast(SellerPrices.scraped_at, Date))
        .all()
    )

    # Merge both series by date
    your_map = {str(r.day): round(float(r.your_price), 2) for r in your_daily}
    price_history = [
        PriceTrendPoint(
            date=str(r.day),
            your_price=your_map.get(str(r.day)),
            market_avg=round(float(r.avg_price), 2) if r.avg_price else None,
        )
        for r in market_daily
    ]

    # ------------------------------------------------------------------
    # 10. Assemble and return
    # ------------------------------------------------------------------
    return DashboardResponse(
        asin=asin,
        seller_id=seller_id,
        product_title=registry.title,
        last_scraped=last_scraped,
        lowest_market_price=lowest_market_price,
        lowest_price_change_pct=lowest_price_change_pct,
        active_sellers=active_sellers,
        new_sellers_this_week=int(new_sellers_this_week),
        undercut_alerts=int(undercut_alerts),
        your_price=your_price,
        your_change_pct=your_change_pct,
        market_avg=market_avg,
        price_history=price_history,
        seller_comparison=seller_comparison,
    )
