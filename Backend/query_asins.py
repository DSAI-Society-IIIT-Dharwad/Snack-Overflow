from app.database import SessionLocal
from sqlalchemy import text

db = SessionLocal()
try:
    res = db.execute(text("SELECT distinct asin FROM current_prices"))
    for r in res:
        print(r)
except Exception as e:
    print("Error:", e)
finally:
    db.close()
