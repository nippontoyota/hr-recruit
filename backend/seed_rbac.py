import os
import sys

# Add the project root to the sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__))))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
from app.core.security import hash_password
from app.models.user import User
from app.models.enums import UserRole
import uuid

# Direct DB connection
engine = create_engine(settings.database_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def reset_db():
    print("Starting RBAC reset...")
    db = SessionLocal()
    
    try:
        # We need to alter the ENUM type to accept 'HO_HR'
        # ALTER TYPE cannot be run inside a transaction block
        with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
            try:
                conn.execute(text("ALTER TYPE recruitment.user_role ADD VALUE 'HO_HR'"))
                print("Added HO_HR to user_role enum.")
            except Exception as e:
                # Value might already exist, which is fine
                pass

        # Just drop users
        db.execute(text("DELETE FROM recruitment.users"))
        db.commit()
        print("Cleared existing users.")
        
        # Seed Professional Users
        users = [
            User(
                id=uuid.uuid4(),
                email="admin@nipponhr.com",
                full_name="System Administrator",
                hashed_password=hash_password("Admin@123!"),
                role=UserRole.ADMIN,
                branch_location=None
            ),
            User(
                id=uuid.uuid4(),
                email="ho@nipponhr.com",
                full_name="Head Office HR",
                hashed_password=hash_password("HOHR@123!"),
                role=UserRole.HO_HR,
                branch_location=None
            ),
            User(
                id=uuid.uuid4(),
                email="nettoor@nipponhr.com",
                full_name="Nettoor Branch HR",
                hashed_password=hash_password("Nettoor@123!"),
                role=UserRole.LOCAL_HR,
                branch_location="Nettoor"
            ),
            User(
                id=uuid.uuid4(),
                email="enchakkal@nipponhr.com",
                full_name="Enchakkal Branch HR",
                hashed_password=hash_password("Enchakkal@123!"),
                role=UserRole.LOCAL_HR,
                branch_location="Enchakkal"
            )
        ]
        
        db.add_all(users)
        db.commit()
        print("Successfully seeded testing credentials.")
        
    except Exception as e:
        db.rollback()
        print(f"Error seeding DB: {str(e)}")
    finally:
        db.close()

if __name__ == "__main__":
    reset_db()
