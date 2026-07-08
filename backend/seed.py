"""
Seed the database with sample users and candidates for local development.

Run from the backend folder:
    python seed.py
"""
from datetime import date

from sqlalchemy import select

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.enums import (
    PipelineStage,
    RemarkStageContext,
    SourceChannel,
    UserRole,
)
from app.models.user import User
from app.services import candidate_service


def seed() -> None:
    db = SessionLocal()

    try:
        existing = db.scalar(select(User).limit(1))
        if existing:
            print("Database already has data — skipping seed.")
            return

        admin = User(
            email="admin@nippon-toyota.in",
            hashed_password=hash_password("admin123"),
            full_name="Portal Admin",
            role=UserRole.ADMIN,
            branch_location="Head Office",
        )
        local_hr_1 = User(
            email="hr.chennai@nippon-toyota.in",
            hashed_password=hash_password("hr123456"),
            full_name="Priya Sharma",
            role=UserRole.LOCAL_HR,
            branch_location="Chennai",
        )
        local_hr_2 = User(
            email="hr.bangalore@nippon-toyota.in",
            hashed_password=hash_password("hr123456"),
            full_name="Rahul Menon",
            role=UserRole.LOCAL_HR,
            branch_location="Bangalore",
        )
        db.add_all([admin, local_hr_1, local_hr_2])
        db.commit()
        db.refresh(admin)
        db.refresh(local_hr_1)
        db.refresh(local_hr_2)

        sample_candidates = [
            {
                "full_name": "Arjun Patel",
                "phone": "9876543210",
                "email": "arjun.patel@email.com",
                "source_channel": SourceChannel.INDEED,
                "branch_location": "Chennai",
                "current_stage": PipelineStage.NEW_APPLICATION,
                "application_data": {
                    "education": [{"degree": "B.Tech Mechanical", "year": 2024}],
                    "skills": ["AutoCAD", "Quality inspection"],
                },
                "assigned_hr_user_id": local_hr_1.id,
                "profile_completeness_pct": 65,
            },
            {
                "full_name": "Meera Krishnan",
                "phone": "9876543211",
                "email": "meera.k@email.com",
                "source_channel": SourceChannel.REFERRAL,
                "branch_location": "Chennai",
                "current_stage": PipelineStage.AWAITING_LOCAL_INTERVIEW,
                "application_data": {"work_history": [{"company": "Auto Parts Ltd", "years": 2}]},
                "assigned_hr_user_id": local_hr_1.id,
                "profile_completeness_pct": 80,
            },
            {
                "full_name": "Vikram Singh",
                "phone": "9876543212",
                "email": "vikram.s@email.com",
                "source_channel": SourceChannel.CAMPUS,
                "branch_location": "Bangalore",
                "current_stage": PipelineStage.LOCAL_HR_REVIEW_COMPLETE,
                "application_data": {"education": [{"degree": "Diploma Automobile", "year": 2025}]},
                "assigned_hr_user_id": local_hr_2.id,
            },
            {
                "full_name": "Ananya Reddy",
                "phone": "9876543213",
                "email": "ananya.r@email.com",
                "source_channel": SourceChannel.WALK_IN,
                "branch_location": "Bangalore",
                "current_stage": PipelineStage.AWAITING_HEAD_OFFICE_INTERVIEW,
                "assigned_hr_user_id": local_hr_2.id,
            },
            {
                "full_name": "Karthik Iyer",
                "phone": "9876543214",
                "email": "karthik.i@email.com",
                "source_channel": SourceChannel.INDEED,
                "branch_location": "Chennai",
                "current_stage": PipelineStage.SUITABLE_FOR_HIRE,
                "assigned_hr_user_id": local_hr_1.id,
            },
            {
                "full_name": "Divya Nair",
                "phone": "9876543215",
                "email": "divya.n@email.com",
                "source_channel": SourceChannel.OTHER,
                "branch_location": "Head Office",
                "current_stage": PipelineStage.SALARY_PENDING,
            },
            {
                "full_name": "Rohan Das",
                "phone": "9876543216",
                "email": "rohan.d@email.com",
                "source_channel": SourceChannel.REFERRAL,
                "branch_location": "Chennai",
                "current_stage": PipelineStage.OFFER_SENT,
            },
            {
                "full_name": "Former Employee Test",
                "phone": "9876543217",
                "email": "rejoin.test@email.com",
                "source_channel": SourceChannel.WALK_IN,
                "branch_location": "Chennai",
                "current_stage": PipelineStage.NEW_APPLICATION,
                "is_rejoining": True,
                "notes_summary": "Previously worked at Nippon Toyota 2019–2021.",
            },
            {
                "full_name": "Duplicate Phone Test",
                "phone": "9876543210",
                "email": "duplicate.test@email.com",
                "source_channel": SourceChannel.INDEED,
                "branch_location": "Chennai",
                "current_stage": PipelineStage.NEW_APPLICATION,
            },
        ]

        created = []
        for data in sample_candidates:
            candidate = candidate_service.create_candidate(
                db,
                full_name=data["full_name"],
                phone=data["phone"],
                email=data.get("email"),
                date_of_birth=data.get("date_of_birth"),
                source_channel=data["source_channel"],
                branch_location=data.get("branch_location"),
                is_rejoining=data.get("is_rejoining", False),
                application_data=data.get("application_data"),
                assigned_hr_user_id=data.get("assigned_hr_user_id"),
                notes_summary=data.get("notes_summary"),
                profile_completeness_pct=data.get("profile_completeness_pct"),
                current_stage=data["current_stage"],
                changed_by_user_id=admin.id,
            )
            created.append(candidate)

        candidate_service.add_remark(
            db,
            created[1],
            stage_context=RemarkStageContext.LOCAL_HR,
            author_user_id=local_hr_1.id,
            content="Good communication skills. Recommended for head office round.",
            scores={"knowledge": 7, "attitude": 8},
        )

        print(f"Seed complete — {len(created)} candidates, 3 users.")
        print("Login: admin@nippon-toyota.in / admin123")

    finally:
        db.close()


if __name__ == "__main__":
    seed()
