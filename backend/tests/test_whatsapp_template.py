from types import SimpleNamespace
from uuid import uuid4
from unittest.mock import MagicMock

from app.api.v1.candidates_core import (
    apply_whatsapp_template,
    parse_visit_date,
    _issue_pre_form,
    _mark_call_letter_sent,
)
from app.models.enums import FormStatus


def test_parse_visit_date_iso_and_display():
    iso = parse_visit_date("2026-08-20")
    assert iso is not None
    assert iso.day == 20
    assert iso.month == 8
    display = parse_visit_date("20 Aug 2026")
    assert display is not None
    assert display.day == 20


def test_apply_whatsapp_template_persists_visit_and_raw_data():
    db = MagicMock()
    candidate = SimpleNamespace(
        id=uuid4(),
        position_applied_for="Unknown",
        visit_branch=None,
        visit_date=None,
        visit_time=None,
        visit_maps_link=None,
        visit_instructions=None,
        profile=SimpleNamespace(raw_data=None),
    )
    apply_whatsapp_template(
        db,
        candidate,
        {
            "position": "HR - Experienced",
            "branchName": "Kalamassery",
            "mapsLink": "https://maps.example/k",
            "visitDate": "2026-08-20",
            "arrivalTime": "9:15 AM",
            "extraInstructions": "Floor 3",
            "recruiterName": "Anu",
        },
    )
    assert candidate.visit_branch == "Kalamassery"
    assert candidate.visit_maps_link == "https://maps.example/k"
    assert candidate.visit_time == "9:15 AM"
    assert candidate.position_applied_for == "HR - Experienced"
    assert candidate.profile.raw_data["whatsapp_template"]["branchName"] == "Kalamassery"
    assert candidate.profile.raw_data["whatsapp_template"]["recruiterName"] == "Anu"
    assert "whatsapp_invite" not in candidate.profile.raw_data


def test_apply_whatsapp_template_sent_records_invite():
    db = MagicMock()
    user = SimpleNamespace(id=uuid4())
    candidate = SimpleNamespace(
        id=uuid4(),
        position_applied_for="Sales",
        visit_branch=None,
        visit_date=None,
        visit_time=None,
        visit_maps_link=None,
        visit_instructions=None,
        profile=SimpleNamespace(raw_data={}),
    )
    apply_whatsapp_template(db, candidate, {"branchName": "Edappally"}, user, sent=True)
    assert candidate.profile.raw_data["whatsapp_invite"]["sent_by_user_id"] == str(user.id)


def _form_candidate(**updates):
    values = dict(
        id=uuid4(),
        pre_form_token=None,
        pre_form_token_purpose=None,
        pre_form_token_revoked=False,
        pre_form_expires_at=None,
        pre_form_status=FormStatus.NOT_SENT,
        pre_form_sent_at=None,
        pre_form_submitted_at=None,
    )
    values.update(updates)
    return SimpleNamespace(**values)


def test_issue_pre_form_does_not_mark_call_letter_sent():
    db = MagicMock()
    user = SimpleNamespace(id=uuid4())
    candidate = _form_candidate()
    _issue_pre_form(db, candidate, user)
    assert candidate.pre_form_status == FormStatus.NOT_SENT
    assert candidate.pre_form_token
    assert candidate.pre_form_sent_at is None


def test_mark_call_letter_sent_sets_sent_status():
    db = MagicMock()
    user = SimpleNamespace(id=uuid4())
    candidate = _form_candidate(pre_form_token="existing", pre_form_token_purpose="PRE_FORM")
    _mark_call_letter_sent(db, candidate, user)
    assert candidate.pre_form_status == FormStatus.SENT
    assert candidate.pre_form_sent_at is not None


def test_mark_call_letter_sent_does_not_downgrade_viewed():
    db = MagicMock()
    user = SimpleNamespace(id=uuid4())
    candidate = _form_candidate(
        pre_form_status=FormStatus.VIEWED,
        pre_form_token="existing",
        pre_form_token_purpose="PRE_FORM",
    )
    _mark_call_letter_sent(db, candidate, user)
    assert candidate.pre_form_status == FormStatus.VIEWED
