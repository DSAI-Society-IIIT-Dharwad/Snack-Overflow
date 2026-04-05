import sys
import os
from dotenv import load_dotenv

load_dotenv()
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from simple_runner import run_discovery, run_tracking, run_tracking_known, run_tracking_models

def run(mode="track"):
    if mode == "discover":
        run_discovery()
    elif mode == "track-models":
        # Hardcoded to requested models or can be extended for CLI args
        models = ["6205"]
        run_tracking_models(models)
    elif mode == "track-known":
        run_tracking_known(limit_per_model=2)
    else:
        run_tracking()

if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "track"
    run(mode)