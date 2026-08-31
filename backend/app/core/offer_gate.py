"""Prerequisites that must pass before an offer letter can be sent."""

from __future__ import annotations

from sqlalchemy import select

from app.core.salary_sheet import validate_package
from app.models.enums import EvaluationType, EvaluationVerdict, PipelineStage
from app.utils.validators import validate_email, validate_phone

OFFER_STAGES = frozenset({PipelineStage.CSS, PipelineStage.SALARY_DETAILS, PipelineStage.FINAL_APPROVAL, PipelineStage.OFFER_RESPONSE, PipelineStage.HIRED})
HO_TYPES = (EvaluationType.HQ_INTERVIEW_1, EvaluationType.HQ_INTERVIEW_2)


def offer_blockers(candidate, *, has_resume: bool, evaluations=None, db=None) -> list[str]:
    stage = candidate.current_stage
    if stage == PipelineStage.REJECTED:
        return ["candidate is rejected"]
    if stage == PipelineStage.ON_HOLD:
        return ["candidate is on hold"]
    if str(getattr(candidate, "offer_status", "") or "").upper() in {"SENT", "ACCEPTED"}:
        return ["already offered"]

    if evaluations is None and db is not None:
        from app.models.evaluation import Evaluation

        evaluations = list(
            db.scalars(
                select(Evaluation).where(
                    Evaluation.candidate_id == candidate.id,
                    Evaluation.type.in_(HO_TYPES),
                )
            )
        )

    verdicts = {}
    for ev in evaluations or []:
        kind = getattr(ev, "type", None)
        if kind in HO_TYPES:
            verdicts[kind] = getattr(ev, "verdict", None)

    missing: list[str] = []
    if verdicts.get(EvaluationType.HQ_INTERVIEW_1) != EvaluationVerdict.SELECTED:
        missing.append("HR interview verdict")

    salary = getattr(candidate, "salary_data", None)
    if not salary:
        missing.append("salary sheet")
    else:
        if validate_package(salary):
            missing.append("valid salary data")
        if stage not in OFFER_STAGES:
            missing.append("Salary approval")

    if not has_resume:
        missing.append("required documents")

    candidate_email = getattr(candidate, "email", None)
    if not candidate_email and getattr(candidate, "profile", None):
        prof = getattr(candidate, "profile")
        candidate_email = getattr(prof, "email", None) or (getattr(prof, "raw_data", None) or {}).get("emailId")
    try:
        validate_email(candidate_email, required=True)
    except ValueError:
        missing.append("valid email")
    try:
        validate_phone(getattr(candidate, "phone", None) or "")
    except ValueError:
        missing.append("valid phone")

    return missing
