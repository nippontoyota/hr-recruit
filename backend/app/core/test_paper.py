"""Assemble brand-aware technical tests from common and role-specific banks."""

from __future__ import annotations

import random

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.positions import (
    COMMON_QUESTION_COUNT,
    PAPER_COMMON,
    ROLE_SAMPLE_SIZE,
    paper_key,
)
from app.core.branding import brand_is_river
from app.core.question_banks import QUESTION_CATALOG
from app.models.candidate import Candidate
from app.models.technical_question import TechnicalQuestion


def _load_paper(db: Session, key: str) -> list[TechnicalQuestion]:
    questions = list(
        db.scalars(
            select(TechnicalQuestion)
            .where(TechnicalQuestion.department == key)
            .order_by(TechnicalQuestion.id)
        ).all()
    )
    if questions:
        return questions

    catalog_rows = QUESTION_CATALOG.get(key)
    if not catalog_rows:
        return []

    # Attempt to seed DB dynamically so future reads find it in the DB
    try:
        new_objs = []
        for qid, text, options, answer in catalog_rows:
            obj = TechnicalQuestion(
                id=qid,
                department=key,
                text=text,
                options=options,
                answer=answer,
            )
            db.add(obj)
            new_objs.append(obj)
        db.commit()
        return new_objs
    except Exception:
        db.rollback()
        # Fallback to in-memory transient instances
        return [
            TechnicalQuestion(
                id=qid,
                department=key,
                text=text,
                options=options,
                answer=answer,
            )
            for qid, text, options, answer in catalog_rows
        ]


def assemble_test_questions(
    db: Session,
    department: str | None,
    position: str | None,
    experience: str | None,
    brand: str | None = None,
) -> list[TechnicalQuestion]:
    common: list[TechnicalQuestion] = []
    if not brand_is_river(brand):
        common = _load_paper(db, PAPER_COMMON)
        if len(common) < COMMON_QUESTION_COUNT:
            raise HTTPException(
                status_code=400,
                detail="Common technical questions are not seeded.",
            )
        common = list(common[:COMMON_QUESTION_COUNT])

    key = paper_key(department, position, experience)
    if not key:
        raise HTTPException(
            status_code=400,
            detail="Set a valid department and position before generating a test.",
        )
    bank = _load_paper(db, key)
    if not bank:
        raise HTTPException(
            status_code=400,
            detail=f"No question bank seeded for this role ({key}).",
        )
    take = min(ROLE_SAMPLE_SIZE, len(bank))
    sampled = random.sample(bank, take)

    random.shuffle(common)
    random.shuffle(sampled)
    return common + sampled


def assemble_for_candidate(db: Session, candidate: Candidate) -> list[TechnicalQuestion]:
    return assemble_test_questions(
        db,
        candidate.department,
        candidate.position_applied_for,
        candidate.experience,
        brand=candidate.brand,
    )


def to_test_data(questions: list[TechnicalQuestion]) -> dict:
    return {
        "questions": [
            {"id": q.id, "text": q.text, "options": q.options}
            for q in questions
        ],
        "answers": {q.id: q.answer for q in questions},
    }
