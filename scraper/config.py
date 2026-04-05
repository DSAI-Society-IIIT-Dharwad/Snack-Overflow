import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

SKF_MODELS = [
    "6205", "6206", "6207", "6208",
    "6305", "6306", "6307",
    "6004", "6005", "6006",
    "22205", "22206",
]

SEARCH_QUERIES = [f"SKF bearing {model}" for model in SKF_MODELS]

MAX_PAGES = 2

TN_PINCODES = [
    "600001",  # Chennai
    "641001",  # Coimbatore
    "625001",  # Madurai
    "620001",  # Tiruchirappalli
    "630001",  # Sivakasi
]

BEARING_BRANDS = [
    "SKF", "NTN", "FAG", "NSK", "TIMKEN",
    "INA", "KOYO", "HRB", "ZKL", "NACHI",
]