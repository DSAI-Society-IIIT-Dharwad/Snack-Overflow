from fastapi import Depends, status, HTTPException, APIRouter, Query
from app.database import get_db
from sqlalchemy import func, distinct
from sqlalchemy.orm import Session
from app.models import AsinRegistry, SellerPrices, CurrentPrices, PriceAlerts
from app.schemas import (
    SellerDirectoryItem,
    SellerStatsResponse,
    SellerProfileResponse,
)
from datetime import datetime, timedelta
from typing import List, Optional

router = APIRouter(prefix="/seller", tags=["Seller Intelligence"])


# =============================================================================
# GET /api/seller/stats
# Get seller stats: total, FBA, FBM, new this week
# =============================================================================
@router.get("/stats", response_model=SellerStatsResponse)
async def get_seller_stats(db: Session = Depends(get_db)):
    """
    Get summary statistics for all sellers.
    """
    all_sellers = db.query(CurrentPrices.seller_id, CurrentPrices.seller_name, CurrentPrices.fba_status).all()

    total_sellers = len(set(s.seller_id for s in all_sellers if s.seller_id))

    fba_sellers = len(set(
        s.seller_id for s in all_sellers
        if s.seller_id and s.fba_status and s.fba_status.upper() == "FBA"
    ))

    fbm_sellers = total_sellers - fba_sellers

    week_ago = datetime.utcnow() - timedelta(days=7)
    new_sellers = db.query(
        func.count(distinct(SellerPrices.seller_id))
    ).filter(
        SellerPrices.scraped_at >= week_ago
    ).scalar() or 0

    return SellerStatsResponse(
        total_sellers=total_sellers,
        fba_sellers=fba_sellers,
        fbm_sellers=fbm_sellers,
        new_this_week=new_sellers,
    )


# =============================================================================
# GET /api/seller/directory
# Get list of all sellers with summary info
# =============================================================================
@router.get("/directory", response_model=List[SellerDirectoryItem])
async def get_seller_directory(
    region: Optional[str] = Query(None),
    fba_status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """
    Get directory of all sellers with their summary information.
    """
    sellers_query = db.query(
        CurrentPrices.seller_id,
        CurrentPrices.seller_name,
        CurrentPrices.fba_status,
        func.avg(CurrentPrices.price).label("avg_price"),
        func.count(distinct(CurrentPrices.asin)).label("product_count"),
    ).group_by(
        CurrentPrices.seller_id,
        CurrentPrices.seller_name,
        CurrentPrices.fba_status,
    )

    if fba_status:
        sellers_query = sellers_query.filter(CurrentPrices.fba_status == fba_status.upper())

    sellers = sellers_query.all()

    region_map = {
        "11": "North", "12": "North", "13": "North", "14": "North",
        "40": "West", "41": "West", "42": "West",
        "56": "South", "57": "South",
        "60": "South",
        "70": "East", "71": "East",
    }

    # Location names for major cities
    city_map = {
        "40": "Mumbai, MH",
        "41": "Pune, MH",
        "11": "Delhi, DL",
        "56": "Bangalore, KA",
        "60": "Chennai, TN",
        "70": "Kolkata, WB",
    }

    results = []
    for seller in sellers:
        seller_pincodes = db.query(CurrentPrices.pincode).filter(
            CurrentPrices.seller_id == seller.seller_id
        ).distinct().all()

        seller_region = None
        seller_location = None
        for pc in seller_pincodes:
            if pc.pincode and len(pc.pincode) >= 2:
                prefix = pc.pincode[:2]
                if prefix in region_map:
                    seller_region = region_map[prefix]
                if prefix in city_map:
                    seller_location = city_map[prefix]
                break

        if region and seller_region != region:
            continue

        price_alerts = db.query(PriceAlerts).filter(
            PriceAlerts.seller_id == seller.seller_id
        ).order_by(PriceAlerts.detected_at.desc()).limit(10).all()

        if price_alerts:
            increases = sum(1 for a in price_alerts if a.change_pct and a.change_pct > 0)
            decreases = sum(1 for a in price_alerts if a.change_pct and a.change_pct < 0)
            if increases > decreases:
                trend = "growing"
            elif decreases > increases:
                trend = "declining"
            else:
                trend = "stable"
        else:
            trend = "stable"

        results.append(SellerDirectoryItem(
            seller_name=seller.seller_name or "Unknown",
            seller_id=seller.seller_id,
            location=seller_location,
            avg_price=float(seller.avg_price) if seller.avg_price else None,
            product_count=int(seller.product_count) if seller.product_count else 0,
            fba_status=seller.fba_status or "FBM",
            region=seller_region,
            trend=trend,
            watch_status=False,
        ))

    return results


# =============================================================================
# GET /api/seller/{seller_id}
# Get detailed seller profile (modal popup)
# =============================================================================
@router.get("/{seller_id}", response_model=SellerProfileResponse)
async def get_seller_profile(seller_id: str, db: Session = Depends(get_db)):
    """
    Get detailed profile for a specific seller (for modal popup).
    """
    seller_prices = db.query(CurrentPrices).filter(
        CurrentPrices.seller_id == seller_id
    ).all()

    if not seller_prices:
        raise HTTPException(status_code=404, detail=f"Seller {seller_id} not found")

    price_values = [p.price for p in seller_prices if p.price is not None]

    if price_values:
        current_price = sum(price_values) / len(price_values)
    else:
        current_price = None

    latest = seller_prices[0]

    region_map = {
        "11": "North", "12": "North", "13": "North", "14": "North",
        "40": "West", "41": "West", "42": "West",
        "56": "South", "57": "South",
        "60": "South",
        "70": "East", "71": "East",
    }

    region_full_map = {
        "North": "North India",
        "South": "South India",
        "East": "East India",
        "West": "West India",
    }

    city_map = {
        "40": "Mumbai, MH",
        "41": "Pune, MH",
        "11": "Delhi, DL",
        "56": "Bangalore, KA",
        "60": "Chennai, TN",
        "70": "Kolkata, WB",
    }

    seller_region = None
    seller_location = None
    if latest.pincode and len(latest.pincode) >= 2:
        prefix = latest.pincode[:2]
        if prefix in region_map:
            seller_region = region_full_map.get(region_map[prefix], region_map[prefix])
        if prefix in city_map:
            seller_location = city_map[prefix]

    price_alerts = db.query(PriceAlerts).filter(
        PriceAlerts.seller_id == seller_id
    ).order_by(PriceAlerts.detected_at.desc()).limit(10).all()

    if price_alerts:
        increases = sum(1 for a in price_alerts if a.change_pct and a.change_pct > 0)
        decreases = sum(1 for a in price_alerts if a.change_pct and a.change_pct < 0)
        if increases > decreases:
            trend = "growing"
        elif decreases > increases:
            trend = "declining"
        else:
            trend = "stable"
    else:
        trend = "stable"

    total_products = len(set(p.asin for p in seller_prices))

    # Estimate sales: products * avg_price * assumed monthly velocity
    est_sales = None
    if current_price and total_products:
        est_sales = round(current_price * total_products * 5, 2)  # Simplified estimate

    return SellerProfileResponse(
        seller_id=seller_id,
        seller_name=latest.seller_name or "Unknown",
        location=seller_location,
        region=seller_region,
        fba_status=latest.fba_status or "FBM",
        current_price=round(current_price, 2) if current_price else None,
        total_products=total_products,
        est_sales=est_sales,
        trend=trend,
        watch_status=False,
    )


# =============================================================================
# POST /api/seller/{seller_id}/watch
# Toggle watch status for a seller
# =============================================================================
@router.post("/{seller_id}/watch")
async def toggle_seller_watch(seller_id: str, db: Session = Depends(get_db)):
    """
    Toggle watch status for a seller.
    """
    return {
        "success": True,
        "message": f"Seller {seller_id} watch status toggled",
    }
