"""Assemble the 15-question technical test (6 common + 9 from the role bank)."""

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
from app.models.candidate import Candidate
from app.models.technical_question import TechnicalQuestion


def _load_paper(db: Session, key: str) -> list[TechnicalQuestion]:
    return list(
        db.scalars(
            select(TechnicalQuestion)
            .where(TechnicalQuestion.department == key)
            .order_by(TechnicalQuestion.id)
        ).all()
    )


def assemble_test_questions(
    db: Session,
    department: str | None,
    position: str | None,
    experience: str | None,
) -> list[TechnicalQuestion]:
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
    )


def to_test_data(questions: list[TechnicalQuestion]) -> dict:
    return {
        "questions": [
            {"id": q.id, "text": q.text, "options": q.options}
            for q in questions
        ],
        "answers": {q.id: q.answer for q in questions},
    }
