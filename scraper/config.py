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
    "600020",  # Adyar, Chennai
    "600040",  # Anna Nagar, Chennai
    "600100",  # Velachery, Chennai
    "638001",  # Erode
    "627001",  # Tirunelveli
    "636007",  # Salem
    "613001",  # Thanjavur
    "614001",  # Pattukkottai
    "622001",  # Pudukkottai
    "621301",  # Karur
    "611001",  # Nagapattinam
    "605001",  # Puducherry (near TN corridor)
]

BEARING_BRANDS = [
    "SKF", "NTN", "FAG", "NSK", "TIMKEN",
    "INA", "KOYO", "HRB", "ZKL", "NACHI",
]