import sys
import os
from dotenv import load_dotenv

load_dotenv()
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from simple_runner import run_discovery, run_tracking, run_tracking_known, run_tracking_models

def run(mode="track", limit_per_model=5):
    if mode == "discover":
        run_discovery()
    elif mode == "quick":
        # One-command flow: discover ASINs, then track a capped sample per model.
        run_discovery()
        run_tracking_known(limit_per_model=limit_per_model)
    elif mode == "track-models":
        # Hardcoded to requested models or can be extended for CLI args
        models = ["6205"]
        run_tracking_models(models)
    elif mode == "track-known":
        run_tracking_known(limit_per_model=limit_per_model)
    else:
        run_tracking()

if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "quick"
    limit = 5
    if len(sys.argv) > 2:
        try:
            limit = int(sys.argv[2])
        except ValueError:
            print(f"Invalid limit '{sys.argv[2]}', defaulting to 5")
            limit = 5
    run(mode, limit_per_model=limit)