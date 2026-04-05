from app.database import SessionLocal
from sqlalchemy import text

db = SessionLocal()
try:
    db.execute(text("ALTER TABLE settings DROP CONSTRAINT IF EXISTS settings_user_id_fkey"))
    db.commit()
    print("Dropped foreign key successfully")
except Exception as e:
    print("Error:", e)
    db.rollback()
finally:
    db.close()
