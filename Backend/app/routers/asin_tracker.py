from datetime import datetime

from fastapi import Depends, status, HTTPException, APIRouter
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import AsinRegistry, AsinTracker, CurrentPrices, SellerPrices
from app.schemas import AsinTrackerCreate, AsinTrackerResponse

router = APIRouter(prefix="/asin-tracker", tags=["Asin Tracker"])


# =============================================================================
# GET /asin-tracker/
# List all tracked ASINs with live stats from AsinTracker + CurrentPrices
# =============================================================================
@router.get("/", status_code=status.HTTP_200_OK, response_model=list[AsinTrackerResponse])
async def list_asin_trackers(db: Session = Depends(get_db)):
    query = (
        db.query(
            AsinTracker.asin,
            AsinTracker.title,
            AsinTracker.pincode,
            AsinTracker.first_seen,
            AsinTracker.last_seen,
            AsinTracker.is_active,
            AsinTracker.status,
            AsinTracker.last_scraped,
            func.count(CurrentPrices.seller_id).label("seller_count"),
            func.min(CurrentPrices.price).label("lowest_price"),
            func.max(CurrentPrices.last_updated).label("cp_last_updated"),
        )
        .outerjoin(CurrentPrices, AsinTracker.asin == CurrentPrices.asin)
        .group_by(
            AsinTracker.asin,
            AsinTracker.title,
            AsinTracker.pincode,
            AsinTracker.first_seen,
            AsinTracker.last_seen,
            AsinTracker.is_active,
            AsinTracker.status,
            AsinTracker.last_scraped,
        )
    )

    results = []
    for row in query.all():
        # Prefer the tracker's own last_scraped; fall back to the newest CurrentPrices timestamp
        last_scraped = row.last_scraped or row.cp_last_updated
        results.append(
            AsinTrackerResponse(
                asin=row.asin,
                title=row.title,
                pincode=row.pincode,
                first_seen=row.first_seen,
                last_seen=row.last_seen,
                is_active=row.is_active,
                status=row.status or ("active" if row.is_active else "inactive"),
                seller_count=int(row.seller_count or 0),
                lowest_price=float(row.lowest_price) if row.lowest_price is not None else None,
                last_scraped=last_scraped,
            )
        )

    return results


# =============================================================================
# POST /asin-tracker/
# Start tracking an ASIN — validates against AsinRegistry + price tables
# =============================================================================
@router.post("/", status_code=status.HTTP_201_CREATED, response_model=AsinTrackerResponse)
async def create_asin_tracker(payload: AsinTrackerCreate, db: Session = Depends(get_db)):

    # 1. ASIN must already exist in AsinRegistry
    registry_entry = db.query(AsinRegistry).filter(AsinRegistry.asin == payload.asin).first()
    if not registry_entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ASIN {payload.asin} does not exist in the registry. "
                   "Import or scrape it first before tracking.",
        )

    # 2. Pincode must have actual price data for this ASIN
    #    Check CurrentPrices first (current snapshot), then SellerPrices (historical)
    pincode_ok = (
        db.query(CurrentPrices)
        .filter(
            CurrentPrices.asin == payload.asin,
            CurrentPrices.pincode == payload.pincode,
        )
        .first()
    )
    if not pincode_ok:
        pincode_ok = (
            db.query(SellerPrices)
            .filter(
                SellerPrices.asin == payload.asin,
                SellerPrices.pincode == payload.pincode,
            )
            .first()
        )

    if not pincode_ok:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"No price data found for ASIN {payload.asin} at PIN code {payload.pincode}. "
                   "Ensure the scraper has collected prices for this location first.",
        )

    # 3. Reject duplicate trackers
    existing = db.query(AsinTracker).filter(AsinTracker.asin == payload.asin).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"ASIN {payload.asin} is already being tracked.",
        )

    now = datetime.utcnow()

    # Use the authoritative title from AsinRegistry; fall back to user-supplied if registry has none
    canonical_title = registry_entry.title or payload.title

    # Keep registry entry active
    registry_entry.is_active = True
    registry_entry.last_seen = now

    # Create the tracker row
    tracker = AsinTracker(
        asin=payload.asin,
        title=canonical_title,
        pincode=payload.pincode,
        last_seen=now,
        is_active=True,
        status="active",
    )

    db.add(tracker)
    db.commit()
    db.refresh(tracker)

    return AsinTrackerResponse(
        asin=tracker.asin,
        title=tracker.title,
        pincode=tracker.pincode,
        first_seen=tracker.first_seen,
        last_seen=tracker.last_seen,
        is_active=tracker.is_active,
        status=tracker.status,
        seller_count=0,
        lowest_price=None,
        last_scraped=None,
    )


# =============================================================================
# GET /asin-tracker/{asin}
# Fetch a single tracked ASIN with live stats
# =============================================================================
@router.get("/{asin}", status_code=status.HTTP_200_OK, response_model=AsinTrackerResponse)
async def get_asin_tracker(asin: str, db: Session = Depends(get_db)):
    asin = asin.strip().upper()

    tracker = db.query(AsinTracker).filter(AsinTracker.asin == asin).first()
    if not tracker:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ASIN {asin} is not being tracked",
        )

    # Pull live stats from CurrentPrices
    stats = (
        db.query(
            func.count(CurrentPrices.seller_id).label("seller_count"),
            func.min(CurrentPrices.price).label("lowest_price"),
            func.max(CurrentPrices.last_updated).label("cp_last_updated"),
        )
        .filter(CurrentPrices.asin == asin)
        .one()
    )

    # Authoritative last_scraped: tracker row first, then CurrentPrices timestamp
    last_scraped = tracker.last_scraped or stats.cp_last_updated

    return AsinTrackerResponse(
        asin=tracker.asin,
        title=tracker.title,
        pincode=tracker.pincode,
        first_seen=tracker.first_seen,
        last_seen=tracker.last_seen,
        is_active=tracker.is_active,
        status=tracker.status or ("active" if tracker.is_active else "inactive"),
        seller_count=int(stats.seller_count or 0),
        lowest_price=float(stats.lowest_price) if stats.lowest_price is not None else None,
        last_scraped=last_scraped,
    )


# =============================================================================
# DELETE /asin-tracker/{asin}
# Stop tracking an ASIN (also marks it inactive in AsinRegistry)
# =============================================================================
@router.delete("/{asin}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_asin_tracker(asin: str, db: Session = Depends(get_db)):
    asin = asin.strip().upper()

    tracker = db.query(AsinTracker).filter(AsinTracker.asin == asin).first()
    if not tracker:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ASIN {asin} is not being tracked",
        )

    # Mark registry entry inactive so scraper stops collecting prices
    registry_entry = db.query(AsinRegistry).filter(AsinRegistry.asin == asin).first()
    if registry_entry:
        registry_entry.is_active = False

    db.delete(tracker)
    db.commit()
    return None
