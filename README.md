# ASINLytics

## 🚀 Project Overview

ASINLytics is a real-time price intelligence and competitive analysis platform for Amazon sellers.

### Problem Statement
Amazon seller competition changes minute-by-minute. Sellers struggle to manually track:
- Competitor price moves
- Buy Box shifts
- Location-specific price differences
- Undercutting patterns across multiple ASINs

### Solution
ASINLytics provides ASIN-level intelligence by continuously scraping seller offers, storing time-series data, analyzing trends, and presenting actionable recommendations through backend APIs and a frontend dashboard.

## ✨ Features

- Real-time price tracking at ASIN and seller level
- Location-based pricing intelligence using TN pincodes (geo-sensitive offer discovery)
- Seller-level analysis with seller identity, pricing, FBA/FBM, and Buy Box flags
- Price alert generation for significant price movements
- Undercut detection and repricing support through backend analytical endpoints
- Historical trend visibility for decision-ready pricing actions

## 🛠 Tech Stack

### Scraper
- Python
- Scrapy
- Playwright (async browser automation)
- Parsel
- APScheduler
- Supabase Python SDK

### Backend (auto-detected from repository)
- FastAPI
- SQLAlchemy
- Pydantic Settings
- Uvicorn
- psycopg2-binary

### Frontend
- React 19
- Vite
- Chart.js + react-chartjs-2
- Supabase JavaScript SDK

### Database (auto-detected)
- Primary in current implementation: Supabase PostgreSQL
- Backend uses SQLAlchemy DATABASE_URL pattern, which can be adapted to MySQL with model and dialect adjustments

## 🧩 Architecture

ASINLytics follows a modular pipeline:

Scraper → Database → Backend API → Frontend Dashboard

### Data Flow
1. Scraper discovers ASINs for configured product models.
2. Scraper fetches seller offers by pincode and extracts pricing/seller attributes.
3. Scraper writes historical rows and current snapshots into database tables.
4. Backend computes trends, alerts, regional insights, and repricing recommendations.
5. Frontend visualizes KPIs, trends, alerts, and seller-level competition.

## 📁 Project Structure

- Backend/
  - app/
  - requirements.txt
- Frontend/
  - asinlytics-react/
- scraper/
  - spiders/
  - utils/
  - requirements.txt
- README.md

## ⚙️ Setup Instructions

### 1) Clone Repository
~~~bash
git clone <your-repo-url>
cd Hackathon
~~~

### 2) Scraper Setup
~~~bash
python -m venv .venv
# Windows
.venv\Scripts\activate
# Linux/macOS
source .venv/bin/activate

pip install -r scraper/requirements.txt
python -m playwright install chromium
~~~

Create scraper environment file at scraper/.env:
~~~env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-service-or-anon-key
~~~

Run scraper (one-command quick flow: discovery + capped tracking):
~~~bash
python scraper/run.py quick 5
~~~

Other useful scraper modes:
~~~bash
python scraper/run.py discover
python scraper/run.py track-known 5
python scraper/run.py track
~~~

### 3) Backend Setup
~~~bash
cd Backend
python -m venv .venv
# Windows
.venv\Scripts\activate
# Linux/macOS
source .venv/bin/activate

pip install -r requirements.txt
~~~

Create Backend/.env:
~~~env
database_url=postgresql+psycopg2://USER:PASSWORD@HOST:5432/DB_NAME
~~~

Run backend API:
~~~bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
~~~

### 4) Frontend Setup
~~~bash
cd Frontend/asinlytics-react
npm install
~~~

Create Frontend/asinlytics-react/.env:
~~~env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
~~~

Run frontend:
~~~bash
npm run dev
~~~

## 📊 Usage / Workflow

### End-to-End Workflow
1. Start scraper to collect ASIN and seller offer snapshots.
2. Persist data in seller_prices and current_prices tables.
3. Backend reads time-series and computes alerts, trends, and recommendations.
4. Frontend dashboard displays market movements for seller action.

### Example Scenario
- You track SKF bearing model 6206.
- Scraper pulls offers across multiple pincodes.
- A competitor undercuts by 3.5% in Chennai while staying higher in Coimbatore.
- Backend flags the undercut event and suggests a safe response band.
- Frontend highlights alert severity and recommended action.

## 🖼 Demo / Screenshots

Add screenshots here during final demo prep:

![Dashboard Overview](docs/screenshots/dashboard-overview.png)
![Price Trend Chart](docs/screenshots/price-trend.png)
![Regional Insights](docs/screenshots/regional-insights.png)

## 🔮 Future Improvements

- Smart proxy rotation and anti-bot resilience for higher scrape consistency
- Rich seller-quality enrichment (ratings, feedback velocity, trust scoring)
- ML-based dynamic repricing recommendations
- Better multi-region scaling beyond TN pincodes
- Event-driven alert delivery (email, webhook, Slack)

## 👥 Contributors

Auto-detected from git history:

- Damodar Lokapure
- Neil Tauro
- Sameer Gaonkar
- Ved Kukalekar

## 📄 License

MIT License

This project is licensed under the MIT License. If a LICENSE file is not yet present, add one before production/open-source release.
