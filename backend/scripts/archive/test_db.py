import sys
import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.user import User

from app.core.config import settings

engine = create_engine(str(settings.database_url))
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def main():
    db = SessionLocal()
    try:
        users = db.query(User).all()
        for u in users:
            print(f"ID: {u.id}, Email: {u.email}, Role: {u.role}")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    main()
