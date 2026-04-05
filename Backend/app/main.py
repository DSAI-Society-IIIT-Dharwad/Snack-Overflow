from fastapi import FastAPI, Depends, status, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.database import get_db
from sqlalchemy.orm import Session
from app.models import AsinRegistry, SellerPrices, CurrentPrices, PriceAlerts
from .routers import reprice, asin_tracker, seller, dashboard, price_trends, regional_insights, alerts

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(reprice.router)
app.include_router(asin_tracker.router)
app.include_router(seller.router)
app.include_router(dashboard.router)
app.include_router(price_trends.router)
app.include_router(regional_insights.router)
app.include_router(alerts.router)

@app.get("/")
async def root():
    return {"Message": "Hello World!"}

@app.get("/products", status_code=status.HTTP_200_OK)
async def get_products(db: Session = Depends(get_db)):
    product = db.query(AsinRegistry).all()
    return {"products": product}
    