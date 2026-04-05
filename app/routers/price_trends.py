from datetime import datetime, timedelta
from statistics import stdev

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import cast, Date, func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import AsinRegistry, CurrentPrices, PriceAlerts, SellerPrices
from app.schemas import PriceTrendPoint, PriceTrendsResponse

router = APIRouter(prefix="/price-trends", tags=["Price Trends"])


# =============================================================================
# GET /price-trends?asin=B08XYZ&seller_id=A1B2C3
# Returns stats cards + chart data for the Price Trends page
# =============================================================================
@router.get("/", status_code=status.HTTP_200_OK, response_model=PriceTrendsResponse)
async def get_price_trends(
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

    last_scraped = (
        db.query(func.max(CurrentPrices.last_updated))
        .filter(CurrentPrices.asin == asin)
        .scalar()
    )

    now = datetime.utcnow()
    days_7_ago   = now - timedelta(days=7)
    days_30_ago  = now - timedelta(days=30)
    days_90_ago  = now - timedelta(days=90)

    # ------------------------------------------------------------------
    # 2. 7D price change — compare lowest market price today vs 7 days ago
    # ------------------------------------------------------------------
    current_low = (
        db.query(func.min(CurrentPrices.price))
        .filter(CurrentPrices.asin == asin)
        .scalar()
    )
    low_7d_ago = (
        db.query(func.min(SellerPrices.price))
        .filter(SellerPrices.asin == asin, SellerPrices.scraped_at >= days_7_ago)
        .scalar()
    )

    price_change_7d_pct: float | None = None
    if current_low and low_7d_ago and float(low_7d_ago) > 0:
        price_change_7d_pct = round(
            (float(current_low) - float(low_7d_ago)) / float(low_7d_ago) * 100, 2
        )

    # ------------------------------------------------------------------
    # 3. 30D average market price
    # ------------------------------------------------------------------
    avg_price_30d_raw = (
        db.query(func.avg(SellerPrices.price))
        .filter(SellerPrices.asin == asin, SellerPrices.scraped_at >= days_30_ago)
        .scalar()
    )
    avg_price_30d = round(float(avg_price_30d_raw), 2) if avg_price_30d_raw else None

    # ------------------------------------------------------------------
    # 4. Volatility — std-dev of daily average prices over 30 days
    # ------------------------------------------------------------------
    daily_avgs_30d = (
        db.query(func.avg(SellerPrices.price).label("avg_price"))
        .filter(SellerPrices.asin == asin, SellerPrices.scraped_at >= days_30_ago)
        .group_by(cast(SellerPrices.scraped_at, Date))
        .all()
    )
    daily_values = [float(r.avg_price) for r in daily_avgs_30d if r.avg_price]

    volatility = "low"
    if len(daily_values) >= 2 and avg_price_30d:
        cv = stdev(daily_values) / avg_price_30d * 100  # coefficient of variation %
        if cv >= 3:
            volatility = "high"
        elif cv >= 1:
            volatility = "medium"

    # ------------------------------------------------------------------
    # 5. Spike events — days where market avg changed > 5% vs prev day
    # ------------------------------------------------------------------
    daily_market = (
        db.query(
            cast(SellerPrices.scraped_at, Date).label("day"),
            func.avg(SellerPrices.price).label("avg_price"),
        )
        .filter(SellerPrices.asin == asin, SellerPrices.scraped_at >= days_30_ago)
        .group_by(cast(SellerPrices.scraped_at, Date))
        .order_by(cast(SellerPrices.scraped_at, Date))
        .all()
    )

    spike_events = 0
    for i in range(1, len(daily_market)):
        prev = float(daily_market[i - 1].avg_price or 0)
        curr = float(daily_market[i].avg_price or 0)
        if prev > 0 and abs(curr - prev) / prev * 100 >= 5:
            spike_events += 1

    # ------------------------------------------------------------------
    # 6. Price trend history — up to 90 days of daily buckets
    # ------------------------------------------------------------------
    all_market_daily = (
        db.query(
            cast(SellerPrices.scraped_at, Date).label("day"),
            func.avg(SellerPrices.price).label("avg_price"),
        )
        .filter(SellerPrices.asin == asin, SellerPrices.scraped_at >= days_90_ago)
        .group_by(cast(SellerPrices.scraped_at, Date))
        .order_by(cast(SellerPrices.scraped_at, Date))
        .all()
    )

    your_daily = (
        db.query(
            cast(SellerPrices.scraped_at, Date).label("day"),
            func.avg(SellerPrices.price).label("your_price"),
        )
        .filter(
            SellerPrices.asin == asin,
            SellerPrices.seller_id == seller_id,
            SellerPrices.scraped_at >= days_90_ago,
        )
        .group_by(cast(SellerPrices.scraped_at, Date))
        .order_by(cast(SellerPrices.scraped_at, Date))
        .all()
    )

    your_map = {str(r.day): round(float(r.your_price), 2) for r in your_daily}
    price_history = [
        PriceTrendPoint(
            date=str(r.day),
            your_price=your_map.get(str(r.day)),
            market_avg=round(float(r.avg_price), 2) if r.avg_price else None,
        )
        for r in all_market_daily
    ]

    # ------------------------------------------------------------------
    # 7. Assemble and return
    # ------------------------------------------------------------------
    return PriceTrendsResponse(
        asin=asin,
        seller_id=seller_id,
        product_title=registry.title,
        last_scraped=last_scraped,
        price_change_7d_pct=price_change_7d_pct,
        avg_price_30d=avg_price_30d,
        volatility=volatility,
        spike_events_30d=spike_events,
        price_history=price_history,
    )
