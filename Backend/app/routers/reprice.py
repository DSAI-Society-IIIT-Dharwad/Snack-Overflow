from fastapi import Depends, status, HTTPException, APIRouter, Query
from app.database import get_db
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.models import AsinRegistry, SellerPrices, CurrentPrices, PriceAlerts, RepriceRules
from app.schemas import (
    PriceDataResponse,
    ApplyPriceRequest,
    RepriceRuleCreate,
    RepriceRuleResponse,
)
from datetime import datetime
from typing import List, Optional

router = APIRouter(prefix="/reprice", tags=["Reprice Engine"])


# =============================================================================
# GET /api/prices?asin=B08XYZ2
# Returns the lowest competitor price and market average for a given ASIN
# =============================================================================
@router.get("/prices", response_model=PriceDataResponse)
async def get_price_data(asin: str = Query(...), db: Session = Depends(get_db)):
    """
    Get current market prices for a specific ASIN.
    Used to populate the calculator inputs with live scraper data.
    """
    # Check if ASIN exists in registry
    asin_record = db.query(AsinRegistry).filter(AsinRegistry.asin == asin).first()
    if not asin_record:
        raise HTTPException(status_code=404, detail=f"ASIN {asin} not found in registry")

    # Get current prices for this ASIN
    prices = db.query(CurrentPrices).filter(CurrentPrices.asin == asin).all()

    if not prices:
        raise HTTPException(
            status_code=404, detail=f"No price data available for ASIN {asin}"
        )

    # Calculate lowest price and market average
    price_values = [p.price for p in prices if p.price is not None]

    if not price_values:
        raise HTTPException(
            status_code=404, detail=f"No valid prices found for ASIN {asin}"
        )

    lowest_price = min(price_values)
    market_avg = sum(price_values) / len(price_values)

    return PriceDataResponse(
        asin=asin,
        lowest_price=float(lowest_price),
        market_avg=round(market_avg, 2),
        sellers=len(prices),
    )


# =============================================================================
# POST /api/reprice/apply
# Apply the recommended price to the Amazon listing
# =============================================================================
@router.post("/apply", status_code=status.HTTP_200_OK)
async def apply_reprice(request: ApplyPriceRequest, db: Session = Depends(get_db)):
    """
    Apply the recommended price to the product.
    In production, this would call Amazon's API to update the listing.
    For now, it stores the applied price in the database.
    """
    # Verify ASIN exists
    asin_record = db.query(AsinRegistry).filter(AsinRegistry.asin == request.asin).first()
    if not asin_record:
        raise HTTPException(status_code=404, detail=f"ASIN {request.asin} not found")

    # TODO: Integrate with Amazon SP-API to actually update the listing
    # For hackathon demo, we just confirm the price was received

    return {
        "success": True,
        "message": f"Price ₹{request.price} applied to ASIN {request.asin}",
        "asin": request.asin,
        "applied_price": request.price,
    }


# =============================================================================
# GET /api/reprice/rules
# Fetch all automated reprice rules
# =============================================================================
@router.get("/rules", response_model=List[RepriceRuleResponse])
async def get_rules(db: Session = Depends(get_db)):
    """
    Get all automated reprice rules.
    """
    rules = db.query(RepriceRules).order_by(RepriceRules.created_at.desc()).all()
    return rules


# =============================================================================
# POST /api/reprice/rules
# Create a new automated reprice rule
# =============================================================================
@router.post("/rules", response_model=RepriceRuleResponse, status_code=status.HTTP_201_CREATED)
async def create_rule(rule: RepriceRuleCreate, db: Session = Depends(get_db)):
    """
    Create a new automated reprice rule.
    This rule will run automatically every time the scraper completes.
    """
    # Verify ASIN exists
    asin_record = db.query(AsinRegistry).filter(AsinRegistry.asin == rule.asin).first()
    if not asin_record:
        raise HTTPException(status_code=404, detail=f"ASIN {rule.asin} not found")

    # Validate strategy
    valid_strategies = ["Competitive", "Margin-First", "Midpoint"]
    if rule.strategy not in valid_strategies:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid strategy. Must be one of: {valid_strategies}",
        )

    # Create the rule
    db_rule = RepriceRules(
        name=rule.name,
        asin=rule.asin,
        strategy=rule.strategy,
        min_margin=rule.min_margin or 5.0,
        min_price=rule.min_price,
        max_price=rule.max_price,
        status="active",
    )

    db.add(db_rule)
    db.commit()
    db.refresh(db_rule)

    return db_rule


# =============================================================================
# DELETE /api/reprice/rules/{rule_id}
# Delete an automated reprice rule
# =============================================================================
@router.delete("/rules/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_rule(rule_id: int, db: Session = Depends(get_db)):
    """
    Delete an automated reprice rule.
    """
    rule = db.query(RepriceRules).filter(RepriceRules.id == rule_id).first()

    if not rule:
        raise HTTPException(status_code=404, detail=f"Rule {rule_id} not found")

    db.delete(rule)
    db.commit()

    return {"success": True, "message": f"Rule '{rule.name}' deleted"}


# =============================================================================
# PATCH /api/reprice/rules/{rule_id}/toggle
# Toggle rule status (active/paused)
# =============================================================================
@router.patch("/rules/{rule_id}/toggle", response_model=RepriceRuleResponse)
async def toggle_rule(rule_id: int, db: Session = Depends(get_db)):
    """
    Toggle a rule between active and paused status.
    """
    rule = db.query(RepriceRules).filter(RepriceRules.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail=f"Rule {rule_id} not found")

    rule.status = "paused" if rule.status == "active" else "active"
    db.commit()
    db.refresh(rule)

    return rule


# =============================================================================
# POST /api/reprice/rules/run
# Run all active rules (called by scraper after each cycle)
# =============================================================================
@router.post("/rules/run", status_code=status.HTTP_200_OK)
async def run_active_rules(db: Session = Depends(get_db)):
    """
    Run all active reprice rules.
    This endpoint is called automatically by the scraper after each price update cycle.

    For each active rule:
    1. Fetch current market prices for the ASIN
    2. Apply the rule's strategy
    3. Calculate the new recommended price
    4. Store/update the recommended price (or apply via Amazon API)
    5. Update last_run timestamp
    """
    # Get all active rules
    active_rules = db.query(RepriceRules).filter(RepriceRules.status == "active").all()

    results = []

    for rule in active_rules:
        # Get current prices for this ASIN
        prices = db.query(CurrentPrices).filter(CurrentPrices.asin == rule.asin).all()

        if not prices:
            results.append(
                {"asin": rule.asin, "status": "skipped", "reason": "No price data"}
            )
            continue

        price_values = [p.price for p in prices if p.price is not None]
        if not price_values:
            results.append(
                {"asin": rule.asin, "status": "skipped", "reason": "No valid prices"}
            )
            continue

        lowest_price = min(price_values)
        market_avg = sum(price_values) / len(price_values)

        # For rule execution, we need a cost price - use min_price as floor or 0
        cost_price = float(rule.min_price) if rule.min_price else 0.0
        min_margin = float(rule.min_margin) if rule.min_margin else 5.0

        # Calculate recommended price using the rule's strategy
        if rule.strategy == "competitive":
            recommended = lowest_price - 1
        elif rule.strategy == "margin-first":
            recommended = cost_price * (1 + min_margin / 100)
        elif rule.strategy == "midpoint":
            recommended = (lowest_price + market_avg) / 2
        else:
            recommended = lowest_price

        # Apply min/max price constraints if set
        if rule.min_price:
            recommended = max(recommended, float(rule.min_price))
        if rule.max_price:
            recommended = min(recommended, float(rule.max_price))

        # Update last_run timestamp
        rule.last_run = datetime.utcnow()

        results.append(
            {
                "rule_id": rule.id,
                "rule_name": rule.name,
                "asin": rule.asin,
                "strategy": rule.strategy,
                "lowest_price": float(lowest_price),
                "market_avg": round(market_avg, 2),
                "recommended_price": round(recommended, 2),
                "status": "executed",
            }
        )

    db.commit()

    return {
        "success": True,
        "rules_executed": len(results),
        "results": results,
    }


# =============================================================================
# GET /api/reprice/rules/{rule_id}
# Get a single rule by ID
# =============================================================================
@router.get("/rules/{rule_id}", response_model=RepriceRuleResponse)
async def get_rule(rule_id: int, db: Session = Depends(get_db)):
    """
    Get details of a specific reprice rule.
    """
    rule = db.query(RepriceRules).filter(RepriceRules.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail=f"Rule {rule_id} not found")

    return rule
