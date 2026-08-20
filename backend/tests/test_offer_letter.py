from app.api.v1.pdf import generate_offer_letter_pdf, resolve_offer_fields
from app.core.offer_gate import offer_blockers
from app.models.enums import EvaluationType, EvaluationVerdict, PipelineStage

from types import SimpleNamespace


GOOD_SALARY = {
    "name": "Anu",
    "total salary": 12500,
    "total allowance": 0,
    "fixed incentive": 2500,
    "gross salary": 15000,
}


def _cand(**kw):
    data = dict(
        current_stage=PipelineStage.FINAL_APPROVAL,
        salary_data=GOOD_SALARY,
        email="anu@example.com",
        phone="9876543210",
        offer_status=None,
    )
    data.update(kw)
    return SimpleNamespace(**data)


def _evals(hr=True, dept=True):
    rows = []
    if hr:
        rows.append(SimpleNamespace(type=EvaluationType.HQ_INTERVIEW_1, verdict=EvaluationVerdict.SELECTED))
    if dept:
        rows.append(SimpleNamespace(type=EvaluationType.HQ_INTERVIEW_2, verdict=EvaluationVerdict.SELECTED))
    return rows


def test_resolve_offer_fields_from_salary_sheet():
    fields = resolve_offer_fields(
        {
            "candidate": {
                "full_name": "Anu Nithin",
                "position_applied_for": "Officer - Floor Supervisor",
                "department": "Service",
                "salary_data": {
                    "Total_Salary": 20000,
                    "Total_Allowance": 1500,
                    "Others": 0,
                    "Gross_Salary": 21500,
                },
            },
            "joining_date": "12-08-2026",
        }
    )
    assert fields["candidate_name"] == "Anu Nithin"
    assert fields["gross_salary"] == "21500"
    assert fields["total_salary"] == "20000"
    assert fields["joining_date"] == "12-08-2026"


def test_resolve_offer_fields_from_nippon_sheet_keys():
    fields = resolve_offer_fields(
        {
            "candidate": {
                "full_name": "K S Mohasin",
                "salary_data": {
                    "name": "K S Mohasin",
                    "designation": "Executive",
                    "department": "HR",
                    "total salary": 12500,
                    "total allowance": 0,
                    "fixed incentive": 2500,
                    "gross salary": 15000,
                    "proposed date of joining": "2024-07-15",
                },
            }
        }
    )
    assert fields["designation"] == "Executive"
    assert fields["others"] == "2500"
    assert fields["gross_salary"] == "15000"
    assert fields["joining_date"] == "15-07-2024"


def test_offer_letter_pdf_is_pdf():
    pdf = generate_offer_letter_pdf(
        {
            "candidate_name": "Anu Nithin",
            "designation": "Lobby In-Charge",
            "department": "Service",
            "total_salary": "20000",
            "total_allowance": "1500",
            "others": "0",
            "gross_salary": "21500",
            "joining_date": "12-08-2026",
        }
    )
    assert bytes(pdf)[:4] == b"%PDF"


def test_offer_blockers_empty_when_ready():
    assert offer_blockers(_cand(), has_resume=True, evaluations=_evals(hr=True, dept=False)) == []
    assert offer_blockers(_cand(), has_resume=True, evaluations=_evals(hr=True, dept=True)) == []


def test_offer_blockers_lists_interview_and_salary_gaps():
    missing = offer_blockers(
        _cand(salary_data=None, current_stage=PipelineStage.CSS),
        has_resume=True,
        evaluations=[],
    )
    assert missing == ["HR interview verdict", "salary sheet"]


def test_offer_blockers_rejects_invalid_salary_and_unapproved_stage():
    missing = offer_blockers(
        _cand(salary_data={"name": "Anu"}, current_stage=PipelineStage.SENT_TO_HO),
        has_resume=True,
        evaluations=_evals(),
    )
    assert "valid salary data" in missing
    assert "Salary approval" in missing


def test_offer_blockers_status_and_contact():
    assert offer_blockers(_cand(current_stage=PipelineStage.REJECTED), has_resume=True, evaluations=_evals()) == [
        "candidate is rejected"
    ]
    assert offer_blockers(_cand(current_stage=PipelineStage.ON_HOLD), has_resume=True, evaluations=_evals()) == [
        "candidate is on hold"
    ]
    assert offer_blockers(_cand(offer_status="SENT"), has_resume=True, evaluations=_evals()) == ["already offered"]
    missing = offer_blockers(
        _cand(email=None, phone="123"),
        has_resume=False,
        evaluations=_evals(),
    )
    assert missing == ["required documents", "valid email", "valid phone"]


def test_offer_blockers_body_gross_salary_does_not_replace_sheet():
    """Request-body package figures cannot stand in for an uploaded salary sheet."""
    assert "salary sheet" in offer_blockers(
        _cand(salary_data=None),
        has_resume=True,
        evaluations=_evals(),
    )
