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

        # Drop dependent tables first
        db.execute(text("DELETE FROM recruitment.activity_logs"))
        db.execute(text("DELETE FROM recruitment.communications"))
        db.execute(text("DELETE FROM recruitment.documents"))
        db.execute(text("DELETE FROM recruitment.evaluations"))
        db.execute(text("DELETE FROM recruitment.evaluation_tokens"))
        db.execute(text("DELETE FROM recruitment.stage_history"))
        db.execute(text("DELETE FROM recruitment.candidate_screening"))
        db.execute(text("DELETE FROM recruitment.candidate_profiles"))
        
        # Now drop candidates and users
        db.execute(text("DELETE FROM recruitment.candidates"))
        db.execute(text("DELETE FROM recruitment.users"))
        db.commit()
        print("Cleared existing users and candidates.")
        
        # Alter ENUM type if running on PostgreSQL to ensure it only has 3 roles
        # In a real environment, we'd use Alembic. For this seed, we just execute raw SQL to update the type.
        # But wait, PostgreSQL enum types can't easily drop values. 
        # The easiest way is to rename the old type, create a new one, and cast.
        # We will skip DB-level enum alteration if it's too complex and just rely on SQLAlchemy string mapping.
        # SQLAlchemy Enum with native_enum=False or we just insert strings.
        # Since we use create_type=False in the models, we don't need to drop the enum type, it will just accept strings.
        
        # Seed 3 Users
        admin_user = User(
            id=uuid.uuid4(),
            email="admin@nippon.local",
            full_name="System Admin",
            hashed_password=hash_password("admin123"),
            role=UserRole.ADMIN,
            branch_location=None
        )
        
        ho_hr = User(
            id=uuid.uuid4(),
            email="ho@nippontoyota.com",
            full_name="Head Office HR",
            hashed_password=hash_password("hr123"),
            role=UserRole.HO_HR,
            branch_location=None
        )
        
        kochi_hr = User(
            id=uuid.uuid4(),
            email="kochi@nippontoyota.com",
            full_name="Kochi Local HR",
            hashed_password=hash_password("local123"),
            role=UserRole.LOCAL_HR,
            branch_location="Kochi"
        )
        
        tvm_hr = User(
            id=uuid.uuid4(),
            email="tvm@nippontoyota.com",
            full_name="Trivandrum Local HR",
            hashed_password=hash_password("local123"),
            role=UserRole.LOCAL_HR,
            branch_location="Trivandrum"
        )
        
        db.add_all([admin_user, ho_hr, kochi_hr, tvm_hr])
        db.commit()
        print("Successfully seeded testing credentials:")
        print("1. admin@nippon.local (pw: admin123) - ADMIN")
        print("2. ho@nippontoyota.com (pw: hr123) - HO_HR")
        print("3. kochi@nippontoyota.com (pw: local123) - LOCAL_HR (Kochi)")
        print("4. tvm@nippontoyota.com (pw: local123) - LOCAL_HR (Trivandrum)")
        
    except Exception as e:
        db.rollback()
        print(f"Error seeding DB: {str(e)}")
    finally:
        db.close()

if __name__ == "__main__":
    reset_db()
