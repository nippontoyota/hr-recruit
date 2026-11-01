"""Seed technical test question banks for Service, Accessories, Call Centre, and Security."""
from __future__ import annotations

import json
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import select

from app.core.database import SessionLocal
from app.models.technical_question import TechnicalQuestion
from service_ops_question_banks import SERVICE_OPS_PAPERS


def _upsert(db, paper: str, rows: list[tuple]) -> int:
    count = 0
    for qid, text, options, answer in rows:
        found = db.scalar(
            select(TechnicalQuestion).where(
                TechnicalQuestion.id == qid,
                TechnicalQuestion.department == paper,
            )
        )
        if found:
            found.text = text
            found.options = options
            found.answer = answer
        else:
            db.add(
                TechnicalQuestion(
                    id=qid,
                    department=paper,
                    text=text,
                    options=options,
                    answer=answer,
                )
            )
        count += 1
    return count


def seed_service_ops_questions() -> None:
    db = SessionLocal()
    try:
        total = 0
        for paper, rows in SERVICE_OPS_PAPERS.items():
            total += _upsert(db, paper, rows)
        db.commit()
        print(f"Successfully seeded/verified {total} technical test questions across {len(SERVICE_OPS_PAPERS)} papers.")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def generate_sql_file(out_path: str = "seed_service_ops_questions.sql") -> None:
    lines = [
        "-- Safe idempotent seed script for Service, Accessories, Call Centre, and Security test questions",
        "-- Inserts or updates 285 questions across 19 papers into recruitment.technical_questions",
        "",
    ]
    for paper, rows in SERVICE_OPS_PAPERS.items():
        lines.append(f"-- Paper: {paper} ({len(rows)} questions)")
        for qid, text, options, answer in rows:
            clean_text = text.replace("'", "''")
            options_json = json.dumps(options, ensure_ascii=False).replace("'", "''")
            lines.append(
                f"INSERT INTO recruitment.technical_questions (id, department, text, options, answer) "
                f"VALUES ('{qid}', '{paper}', '{clean_text}', '{options_json}'::jsonb, '{answer}') "
                f"ON CONFLICT (id, department) DO UPDATE SET "
                f"text = EXCLUDED.text, options = EXCLUDED.options, answer = EXCLUDED.answer;"
            )
        lines.append("")
    
    with open(out_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print(f"Generated SQL seed file at {out_path}")


if __name__ == "__main__":
    generate_sql_file()
    try:
        seed_service_ops_questions()
    except Exception as exc:
        print(f"Note: Direct DB connection could not run ({exc}). Use seed_service_ops_questions.sql or ensure DB credentials are active.")
