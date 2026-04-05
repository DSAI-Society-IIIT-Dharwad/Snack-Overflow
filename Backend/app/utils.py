# ---------------------------------------------------------------------------
# Shared utilities
# ---------------------------------------------------------------------------

_STATE_REGION: dict[str, str] = {
    # North
    "DL": "North", "UP": "North", "HR": "North", "PB": "North",
    "HP": "North", "UK": "North", "JK": "North", "RJ": "North",
    # South
    "KA": "South", "TN": "South", "KL": "South", "AP": "South",
    "TG": "South", "PY": "South",
    # East
    "WB": "East", "OR": "East", "BR": "East", "JH": "East",
    "AS": "East", "NL": "East", "MN": "East", "TR": "East",
    # West
    "MH": "West", "GJ": "West", "MP": "West", "CG": "West", "GA": "West",
}


def derive_region(location: str | None) -> str | None:
    """Extract state code from '"City, ST"' and map to a broad region."""
    if not location:
        return None
    parts = location.rsplit(",", 1)
    if len(parts) == 2:
        state_code = parts[1].strip().upper()
        return _STATE_REGION.get(state_code)
    return None
