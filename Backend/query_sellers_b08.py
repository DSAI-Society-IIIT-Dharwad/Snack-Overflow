from app.database import SessionLocal
from sqlalchemy import text

db = SessionLocal()
try:
    res = db.execute(text("SELECT seller_id, price FROM current_prices WHERE asin='B08XYZ2' limit 5"))
    for r in res:
        print(r)
except Exception as e:
    print("Error:", e)
finally:
    db.close()
