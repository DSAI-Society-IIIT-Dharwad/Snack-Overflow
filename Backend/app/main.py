from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import reprice, asin_tracker, seller, dashboard, price_trends, regional_insights, alerts

app = FastAPI(title="ASINLytics API", version="1.0.0")

# ---------------------------------------------------------------------------
# CORS — allow the Vite dev server to call the API
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",   # Vite default
        "http://localhost:3000",   # CRA / fallback
        "http://127.0.0.1:5173",
    ],
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
    return {"message": "ASINLytics API is running."}