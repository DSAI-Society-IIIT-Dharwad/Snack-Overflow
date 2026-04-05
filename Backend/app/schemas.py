import re
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, field_validator


class RepriceEngineResponse(BaseModel):
    average_price: float
    lowest_price: float

    class Config:
        from_attributes = True


# =============================================================================
# DASHBOARD SCHEMAS
# =============================================================================

class PriceTrendPoint(BaseModel):
    """Single day bucket for the price trend chart."""
    date: str               # ISO date string e.g. "2026-04-01"
    your_price: Optional[float] = None
    market_avg: Optional[float] = None


# =============================================================================
# PRICE TRENDS SCHEMAS
# =============================================================================

class PriceTrendsResponse(BaseModel):
    """Full payload returned by GET /price-trends."""
    asin: str
    product_title: Optional[str] = None
    last_scraped: Optional[datetime] = None
    # Stats cards
    price_change_7d_pct: Optional[float] = None   # e.g. -4.8
    avg_price_30d: Optional[float] = None          # 30-day market average
    volatility: str = "low"                        # low | medium | high
    spike_events_30d: int = 0                      # days with >5% price swing
    # Chart data — up to 90 days; client slices to 7/30/90
    price_history: List[PriceTrendPoint] = []


class SellerComparisonItem(BaseModel):
    """Single row in the Seller Comparison table."""
    seller_id: str
    seller_name: Optional[str] = None
    price: Optional[float] = None
    is_lowest: bool = False
    fba_status: Optional[str] = None   # "FBA" or "FBM"
    region: Optional[str] = None       # North / South / East / West
    location: Optional[str] = None     # e.g. "Mumbai, MH"
    relevance_score: Optional[int] = None  # 0-100, higher = closer to lowest price
    is_buybox: bool = False


class DashboardResponse(BaseModel):
    """Full payload returned by GET /dashboard."""
    # Identity
    asin: str
    #seller_id: str
    product_title: Optional[str] = None
    last_scraped: Optional[datetime] = None

    # Stats cards
    lowest_market_price: Optional[float] = None
    lowest_price_change_pct: Optional[float] = None   # vs yesterday
    active_sellers: int = 0
    new_sellers_this_week: int = 0
    undercut_alerts: int = 0                           # unread alerts for this ASIN

    # Your position
    your_price: Optional[float] = None
    your_change_pct: Optional[float] = None            # from latest alert for your seller_id
    market_avg: Optional[float] = None

    # Trend chart data
    price_history: List[PriceTrendPoint] = []

    # Seller comparison table
    seller_comparison: List[SellerComparisonItem] = []


# Reprice Calculator - Price Data for ASIN
class PriceDataResponse(BaseModel):
    asin: str
    lowest_price: float
    market_avg: float
    sellers: int


# Apply Price Request
class ApplyPriceRequest(BaseModel):
    asin: str
    seller_id: str
    price: float
    strategy_used: Optional[str] = None
class RepriceRuleCreate(BaseModel):
    name: str
    asin: str
    strategy: str  # competitive, margin-first, midpoint
    min_margin: Optional[float] = 12
    min_price: Optional[float] = None
    max_price: Optional[float] = None


class RepriceRuleResponse(BaseModel):
    id: int
    name: str
    asin: str
    strategy: str
    min_margin: Optional[float]
    min_price: Optional[float]
    max_price: Optional[float]
    status: str
    last_run: Optional[datetime]

    class Config:
        from_attributes = True


class CurrentPriceResponse(BaseModel):
    asin: str
    seller_id: str
    seller_name: Optional[str]
    price: Optional[float]
    total_price: Optional[float]
    shipping: Optional[str]
    fba_status: Optional[str]
    is_buybox: Optional[bool]
    seller_rating: Optional[str]
    pincode: Optional[str]
    last_updated: Optional[datetime]

    class Config:
        from_attributes = True


class PriceAlertResponse(BaseModel):
    id: int
    asin: str
    seller_id: str
    seller_name: Optional[str]
    old_price: Optional[float]
    new_price: Optional[float]
    change_pct: Optional[float]
    detected_at: Optional[datetime]
    is_read: Optional[bool]

    class Config:
        from_attributes = True


class AsinTrackerCreate(BaseModel):
    """Only the three fields the UI collects are required."""
    asin: str
    title: str
    pincode: str



class AsinTrackerResponse(BaseModel):
    asin: str
    title: Optional[str] = None
    pincode: Optional[str] = None
    first_seen: Optional[datetime] = None
    last_seen: Optional[datetime] = None
    is_active: Optional[bool] = None
    status: Optional[str] = None
    seller_count: int = 0
    lowest_price: Optional[float] = None
    last_scraped: Optional[datetime] = None

    class Config:
        from_attributes = True


"""
1) REprice engine
lowest price and average price for that particular asin
"""


# =============================================================================
# SELLER INTELLIGENCE SCHEMAS
# =============================================================================

class SellerDirectoryItem(BaseModel):
    """Single seller item in the directory listing"""
    seller_name: str
    seller_id: Optional[str] = None
    location: Optional[str] = None  # e.g., "Mumbai, MH"
    avg_price: Optional[float] = None
    product_count: int = 0
    fba_status: str = "FBM"  # FBA or FBM
    region: Optional[str] = None  # North, South, East, West
    trend: str = "stable"  # growing, declining, stable
    watch_status: bool = False

    class Config:
        from_attributes = True


class SellerStatsResponse(BaseModel):
    """Stats cards at the top of Seller Intel page"""
    total_sellers: int
    fba_sellers: int
    fbm_sellers: int
    new_this_week: int


class SellerIntelResponse(BaseModel):
    """Full payload returned by GET /seller-intel?asin="""
    asin: str
    last_scraped: Optional[datetime] = None
    total_sellers: int = 0
    fba_sellers: int = 0
    fbm_sellers: int = 0
    new_this_week: int = 0
    sellers: List[SellerDirectoryItem] = []


class SellerProfileResponse(BaseModel):
    """Detailed seller profile when clicking a row (modal popup)"""
    seller_id: str
    seller_name: str
    location: Optional[str] = None
    region: Optional[str] = None
    fba_status: str = "FBM"
    current_price: Optional[float] = None
    total_products: int = 0
    est_sales: Optional[float] = None
    trend: str = "stable"
    watch_status: bool = False

    class Config:
        from_attributes = True


# =============================================================================
# REGIONAL INSIGHTS SCHEMAS
# =============================================================================

class RegionWeeklyPoint(BaseModel):
    """Single day bucket for the regional weekly trend mini-chart."""
    day: str
    avg_price: Optional[float] = None


class RegionData(BaseModel):
    """Stats and weekly trend for one region."""
    region: str
    display_name: str
    avg_price: Optional[float] = None
    lowest_price: Optional[float] = None
    seller_count: int = 0
    price_change_pct: Optional[float] = None
    cities: List[str] = []
    weekly_trend: List[RegionWeeklyPoint] = []


class RegionalInsightsResponse(BaseModel):
    """Full payload returned by GET /regional-insights?asin="""
    asin: str
    product_title: Optional[str] = None
    last_scraped: Optional[datetime] = None
    regions: List[RegionData] = []


# =============================================================================
# ALERTS CENTER SCHEMAS
# =============================================================================

class AlertItem(BaseModel):
    """Single alert item in the Alerts Center."""
    id: int
    alert_type: str          # undercut | spike | price_drop | price_change | new_competitor
    title: str
    message: str
    severity: str            # high | medium | low
    asin: Optional[str] = None
    detected_at: Optional[datetime] = None
    is_read: bool = False


class AlertsResponse(BaseModel):
    """Full payload returned by GET /alerts."""
    asin: str
    seller_id: Optional[str] = None
    total_active: int = 0    # count of unread alerts
    alerts: List[AlertItem] = []


# =============================================================================
# SETTINGS SCHEMAS
# =============================================================================
from uuid import UUID

class SettingsBase(BaseModel):
    seller_id: str
    default_asin: Optional[str] = None
    scrape_interval: Optional[int] = None
    default_region: Optional[str] = None
    alert_email: Optional[str] = None
    high_severity_alerts: Optional[bool] = None
    auto_apply_prices: Optional[bool] = None

class SettingsCreate(SettingsBase):
    user_id: UUID

class SettingsUpdate(SettingsBase):
    pass

class SettingsResponse(SettingsBase):
    id: int
    user_id: UUID

    class Config:
        from_attributes = True