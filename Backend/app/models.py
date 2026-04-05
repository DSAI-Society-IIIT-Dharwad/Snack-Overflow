from sqlalchemy import Column, Integer, String, Boolean, Numeric, ForeignKey, TIMESTAMP, text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from .database import Base


# 1. asin_registry
class AsinRegistry(Base):
    __tablename__ = "asin_registry"

    id = Column(Integer, primary_key=True, index=True)
    asin = Column(String(20), unique=True, nullable=False)
    model = Column(String(50))
    title = Column(String(500))
    brand = Column(String(100))
    search_query = Column(String(200))
    first_seen = Column(TIMESTAMP(timezone=True), server_default=text("now()"))
    last_seen = Column(TIMESTAMP(timezone=True))
    is_active = Column(Boolean, server_default="true")


# 2. seller_prices (append-only)
class SellerPrices(Base):
    __tablename__ = "seller_prices"

    id = Column(Integer, primary_key=True, index=True)
    asin = Column(String(20), ForeignKey("asin_registry.asin"))
    seller_name = Column(String(255))
    seller_id = Column(String(100))
    price = Column(Numeric(10, 2))
    total_price = Column(Numeric(10, 2))
    shipping = Column(String(100))
    fba_status = Column(String(10))
    is_buybox = Column(Boolean, server_default="false")
    seller_rating = Column(String(100))
    condition_type = Column(String(50))
    pincode = Column(String(10))
    scraped_at = Column(TIMESTAMP(timezone=True), server_default=text("now()"))


# 3. current_prices (composite PK)
class CurrentPrices(Base):
    __tablename__ = "current_prices"

    asin = Column(String(20), ForeignKey("asin_registry.asin"), primary_key=True)
    seller_id = Column(String(100), primary_key=True)

    seller_name = Column(String(255))
    price = Column(Numeric(10, 2))
    total_price = Column(Numeric(10, 2))
    shipping = Column(String(100))
    fba_status = Column(String(10))
    is_buybox = Column(Boolean, server_default="false")
    seller_rating = Column(String(100))
    pincode = Column(String(10))
    last_updated = Column(TIMESTAMP(timezone=True), server_default=text("now()"))


# 4. price_alerts
class PriceAlerts(Base):
    __tablename__ = "price_alerts"

    id = Column(Integer, primary_key=True, index=True)
    asin = Column(String(20), ForeignKey("asin_registry.asin"))
    seller_id = Column(String(100))
    seller_name = Column(String(255))
    old_price = Column(Numeric(10, 2))
    new_price = Column(Numeric(10, 2))
    change_pct = Column(Numeric(5, 2))
    detected_at = Column(TIMESTAMP(timezone=True), server_default=text("now()"))
    is_read = Column(Boolean, server_default="false")


# 5. reprice_rules
class RepriceRules(Base):
    __tablename__ = "reprice_rules"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    asin = Column(String(20), ForeignKey("asin_registry.asin"), nullable=False)
    strategy = Column(String(20), nullable=False)  # competitive, margin-first, midpoint
    min_margin = Column(Numeric(5, 2), default=5.0)  # minimum margin %
    min_price = Column(Numeric(10, 2))  # optional floor price
    max_price = Column(Numeric(10, 2))  # optional ceiling price
    status = Column(String(10), default="active")  # active, paused
    last_run = Column(TIMESTAMP(timezone=True))
    created_at = Column(TIMESTAMP(timezone=True), server_default=text("now()"))


# 6. asin_tracker
class AsinTracker(Base):
    __tablename__ = "asin_tracker"

    id = Column(Integer, primary_key=True, index=True)
    asin = Column(String(20), unique=True, nullable=False)
    title = Column(String(500))
    model = Column(String(50))
    brand = Column(String(100))
    search_query = Column(String(200))
    pincode = Column(String(10))
    first_seen = Column(TIMESTAMP(timezone=True), server_default=text("now()"))
    last_seen = Column(TIMESTAMP(timezone=True))
    is_active = Column(Boolean, server_default="true")
    status = Column(String(20), default="active")  # active, paused, error
    last_scraped = Column(TIMESTAMP(timezone=True))

class Settings(Base):
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(
        UUID(as_uuid=True),
        nullable=False,
        unique=True
    )

    default_asin = Column(String(20))
    seller_id = Column(String(100))
    scrape_interval = Column(Integer)

    default_region = Column(String(20))

    alert_email = Column(String(255))
    high_severity_alerts = Column(Boolean, default=True)

    auto_apply_prices = Column(Boolean, default=False)

    __table_args__ = (
        UniqueConstraint("user_id", name="unique_user_settings"),
    )