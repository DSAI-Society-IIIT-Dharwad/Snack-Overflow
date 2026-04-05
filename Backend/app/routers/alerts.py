from datetime import datetime, timedelta
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import AsinRegistry, CurrentPrices, PriceAlerts, SellerPrices
from app.schemas import AlertItem, AlertsResponse

router = APIRouter(prefix="/alerts", tags=["Alerts Center"])


# ---------------------------------------------------------------------------
# Helper: classify a PriceAlerts row into type + severity
# ---------------------------------------------------------------------------
def _classify_alert(alert: PriceAlerts, your_price: float | None) -> tuple[str, str, str, str]:
    """Returns (alert_type, title, message, severity)."""
    change = float(alert.change_pct or 0)
    new_p = float(alert.new_price or 0)
    old_p = float(alert.old_price or 0)
    seller = alert.seller_name or alert.seller_id or "A competitor"
    asin = alert.asin or ""

    # Competitor undercut: negative change AND their new price < your price
    if change <= -3 and your_price and new_p < your_price:
        diff = round(your_price - new_p, 2)
        return (
            "undercut",
            "Competitor Undercut",
            f"{seller} dropped to ₹{new_p:,.0f} on ASIN {asin} — below your price by ₹{diff:,.0f}.",
            "high",
        )

    # Price spike: large positive move
    if change >= 10:
        return (
            "spike",
            "Price Spike Detected",
            f"{seller} increased price by {change:.1f}% on ASIN {asin}. Opportunity window may be open.",
            "medium",
        )

    # Price drop (not undercut — above your price or no reference)
    if change <= -3:
        return (
            "price_drop",
            "Price Drop Detected",
            f"{seller} dropped price by {abs(change):.1f}% (₹{old_p:,.0f} → ₹{new_p:,.0f}) on ASIN {asin}.",
            "medium",
        )

    # Small movement
    direction = "raised" if change > 0 else "adjusted"
    return (
        "price_change",
        "Price Change",
        f"{seller} {direction} price by {abs(change):.1f}% on ASIN {asin}.",
        "low",
    )


# =============================================================================
# GET /alerts?asin=&seller_id=&severity=all
# =============================================================================
@router.get("/", status_code=status.HTTP_200_OK, response_model=AlertsResponse)
async def get_alerts(
    asin: str = Query(..., description="Amazon ASIN to analyse"),
    seller_id: str = Query(..., description="Your seller ID"),
    severity: str = Query("all", description="Filter by severity: all | high | medium | low"),
    db: Session = Depends(get_db),
):
    asin = asin.strip().upper()
    seller_id = seller_id.strip()

    # Verify ASIN
    registry = db.query(AsinRegistry).filter(AsinRegistry.asin == asin).first()
    if not registry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"ASIN {asin} not found.")

    # Your current price (reference for undercut detection)
    your_row = (
        db.query(CurrentPrices)
        .filter(CurrentPrices.asin == asin, CurrentPrices.seller_id == seller_id)
        .first()
    )
    your_price = float(your_row.price) if your_row and your_row.price else None

    # ------------------------------------------------------------------
    # 1. Price-change alerts from PriceAlerts table
    # ------------------------------------------------------------------
    price_alert_rows = (
        db.query(PriceAlerts)
        .filter(PriceAlerts.asin == asin)
        .order_by(PriceAlerts.detected_at.desc())
        .all()
    )

    alerts: list[AlertItem] = []
    for row in price_alert_rows:
        alert_type, title, message, sev = _classify_alert(row, your_price)
        if severity != "all" and sev != severity:
            continue
        alerts.append(
            AlertItem(
                id=row.id,
                alert_type=alert_type,
                title=title,
                message=message,
                severity=sev,
                asin=row.asin,
                detected_at=row.detected_at,
                is_read=bool(row.is_read),
            )
        )

    # ------------------------------------------------------------------
    # 2. New-competitor alerts (sellers new within last 7 days)
    # ------------------------------------------------------------------
    if severity in ("all", "low"):
        week_ago = datetime.utcnow() - timedelta(days=7)
        two_weeks_ago = datetime.utcnow() - timedelta(days=14)

        recent_ids = {
            r.seller_id
            for r in db.query(SellerPrices.seller_id)
            .filter(SellerPrices.asin == asin, SellerPrices.scraped_at >= week_ago)
            .distinct()
            .all()
        }
        prior_ids = {
            r.seller_id
            for r in db.query(SellerPrices.seller_id)
            .filter(
                SellerPrices.asin == asin,
                SellerPrices.scraped_at >= two_weeks_ago,
                SellerPrices.scraped_at < week_ago,
            )
            .distinct()
            .all()
        }
        new_sellers = recent_ids - prior_ids
        if new_sellers:
            alerts.append(
                AlertItem(
                    id=-1,  # synthetic — no DB row
                    alert_type="new_competitor",
                    title="New Competitor Entered",
                    message=f"{len(new_sellers)} new seller(s) detected for {asin} in the last 7 days.",
                    severity="low",
                    asin=asin,
                    detected_at=datetime.utcnow(),
                    is_read=False,
                )
            )

    # Sort: unread first, then by time desc
    alerts.sort(key=lambda a: (a.is_read, -(a.detected_at.timestamp() if a.detected_at else 0)))

    total_active = sum(1 for a in alerts if not a.is_read)

    return AlertsResponse(
        asin=asin,
        seller_id=seller_id,
        total_active=total_active,
        alerts=alerts,
    )


# =============================================================================
# PATCH /alerts/{alert_id}/read  — mark a single alert as read
# =============================================================================
@router.patch("/{alert_id}/read", status_code=status.HTTP_200_OK)
async def mark_alert_read(
    alert_id: int,
    db: Session = Depends(get_db),
):
    alert = db.query(PriceAlerts).filter(PriceAlerts.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found.")
    alert.is_read = True
    db.commit()
    return {"detail": "Alert marked as read."}


# =============================================================================
# POST /alerts/mark-all-read?asin=  — mark all alerts for an ASIN as read
# =============================================================================
@router.post("/mark-all-read", status_code=status.HTTP_200_OK)
async def mark_all_read(
    asin: str = Query(..., description="Amazon ASIN"),
    db: Session = Depends(get_db),
):
    asin = asin.strip().upper()
    updated = (
        db.query(PriceAlerts)
        .filter(PriceAlerts.asin == asin, PriceAlerts.is_read == False)
        .all()
    )
    for row in updated:
        row.is_read = True
    db.commit()
    return {"detail": f"{len(updated)} alert(s) marked as read."}
