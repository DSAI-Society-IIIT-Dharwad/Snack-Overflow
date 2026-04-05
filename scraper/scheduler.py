from apscheduler.schedulers.blocking import BlockingScheduler
from run import run
import logging

logging.basicConfig(level=logging.INFO)
scheduler = BlockingScheduler()

@scheduler.scheduled_job("cron", minute="*/30")  # every 30 mins
def track_prices():
    print("[Scheduler] Starting tracking run for select models...")
    run("track-models")

@scheduler.scheduled_job("cron", day_of_week="mon", hour=0)  # weekly rediscovery
def discover_asins():
    print("[Scheduler] Starting discovery run...")
    run("discover")

if __name__ == "__main__":
    print("[Scheduler] Started — tracking every 30 mins")
    scheduler.start()