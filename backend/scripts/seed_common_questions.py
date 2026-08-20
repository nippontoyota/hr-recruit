"""Seed the 6 common Toyota questions used on every technical test."""
from __future__ import annotations

import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select

from app.core.database import SessionLocal
from app.models.technical_question import TechnicalQuestion

COMMON_DEPT = "COMMON"

COMMON_QUESTIONS = [
    {
        "id": "C1",
        "text": "Toyota Motor Corporation is headquartered in which country?",
        "options": {"A": "India", "B": "Japan", "C": "Germany", "D": "USA"},
        "answer": "B",
    },
    {
        "id": "C2",
        "text": "Toyota Motor Corporation was founded in which year?",
        "options": {"A": "1920", "B": "1937", "C": "1945", "D": "1955"},
        "answer": "B",
    },
    {
        "id": "C3",
        "text": "What is the full name of Toyota's Indian subsidiary?",
        "options": {
            "A": "Toyota India Motors Pvt. Ltd.",
            "B": "Toyota Kirloskar Motor Pvt. Ltd.",
            "C": "Toyota Indian Automobile Ltd.",
            "D": "Toyota Motor India Ltd.",
        },
        "answer": "B",
    },
    {
        "id": "C4",
        "text": "In which year was Toyota first launched in India?",
        "options": {"A": "1995", "B": "1998", "C": "2000", "D": "2005"},
        "answer": "C",
    },
    {
        "id": "C5",
        "text": "Which was Toyota's first vehicle introduced in India?",
        "options": {
            "A": "Toyota Innova",
            "B": "Toyota Fortuner",
            "C": "Toyota Qualis",
            "D": "Toyota Camry",
        },
        "answer": "C",
    },
    {
        "id": "C6",
        "text": "What is the main role of a Toyota dealership such as Nippon Toyota?",
        "options": {
            "A": "Only manufacturing vehicles",
            "B": "Vehicle sales, service, and customer support",
            "C": "Manufacturing engines only",
            "D": "Manufacturing tyres",
        },
        "answer": "B",
    },
]


def seed_common_questions() -> None:
    db = SessionLocal()
    try:
        for row in COMMON_QUESTIONS:
            found = db.scalar(
                select(TechnicalQuestion).where(
                    TechnicalQuestion.id == row["id"],
                    TechnicalQuestion.department == COMMON_DEPT,
                )
            )
            if found:
                found.text = row["text"]
                found.options = row["options"]
                found.answer = row["answer"]
                continue
            db.add(
                TechnicalQuestion(
                    id=row["id"],
                    department=COMMON_DEPT,
                    text=row["text"],
                    options=row["options"],
                    answer=row["answer"],
                )
            )
        db.commit()
        print(f"Seeded {len(COMMON_QUESTIONS)} common technical test questions.")
    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()


if __name__ == "__main__":
    seed_common_questions()
