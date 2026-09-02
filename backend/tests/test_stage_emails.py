from types import SimpleNamespace
from uuid import uuid4

from app.services import stage_emails
from app.services.email import EmailSendError


class _FakeDb:
    def __init__(self, local_hr_email=None):
        self.added = []
        self._local_hr_email = local_hr_email

    def add(self, value):
        self.added.append(value)

    def scalar(self, _stmt):
        return self._local_hr_email


def _candidate(**kw):
    data = dict(
        id=uuid4(),
        full_name="Anu Nithin",
        position_applied_for="Officer - Floor Supervisor",
        email="anu@example.com",
        branch_location="Kochi",
        profile=None,
    )
    data.update(kw)
    return SimpleNamespace(**data)


def test_rejected_email_uses_candidate_name_and_job_title():
    candidate = _candidate()

    subject, body_html, preview = stage_emails._rejected_email_content(candidate)

    assert subject == "Update on Your Application"
    assert "Dear Anu Nithin" in body_html
    assert "Officer - Floor Supervisor" in body_html
    assert "180 days" in body_html
    assert "we will not be moving forward" in preview.lower()


def test_on_hold_email_uses_candidate_name_and_job_title():
    candidate = _candidate()

    subject, body_html, preview = stage_emails._on_hold_email_content(candidate)

    assert subject == "Update on Your Application"
    assert "Dear Anu Nithin" in body_html
    assert "Officer - Floor Supervisor" in body_html
    assert "on hold" in body_html.lower()
    assert "on hold" in preview.lower()


def test_send_rejection_email_sends_with_stakeholder_cc(monkeypatch):
    db = _FakeDb(local_hr_email="branchhr@nippontoyota.com")
    candidate = _candidate()
    user = SimpleNamespace(id=uuid4())
    sent = {}

    monkeypatch.setattr(stage_emails, "send_email", lambda **kwargs: sent.update(kwargs))

    status, error = stage_emails.send_rejection_email(db, candidate, user)

    assert status == "SENT"
    assert error is None
    assert sent["to_email"] == "anu@example.com"
    assert sent["cc_emails"] == [
        "recruitment@nippontoyota.com",
        "naveen@nippontoyota.com",
        "jerry@nippontoyota.com",
        "branchhr@nippontoyota.com",
    ]
    assert candidate.profile.raw_data["rejectionEmailStatus"] == "SENT"


def test_send_on_hold_email_records_failure_when_email_missing():
    db = _FakeDb()
    candidate = _candidate(email=None)
    user = SimpleNamespace(id=uuid4())

    status, error = stage_emails.send_on_hold_email(db, candidate, user)

    assert status == "FAILED"
    assert "does not have an email" in error
    assert candidate.profile.raw_data["onHoldEmailStatus"] == "FAILED"
    assert any(
        item.content_preview.startswith("On Hold Email Failed")
        for item in db.added
        if hasattr(item, "content_preview")
    )


def test_send_rejection_email_records_smtp_failure(monkeypatch):
    db = _FakeDb()
    candidate = _candidate()
    user = SimpleNamespace(id=uuid4())

    def fail_send(**_kwargs):
        raise EmailSendError("Email provider failed while sending. Check SMTP configuration and try again.")

    monkeypatch.setattr(stage_emails, "send_email", fail_send)

    status, error = stage_emails.send_rejection_email(db, candidate, user)

    assert status == "FAILED"
    assert error == "Email provider failed while sending. Check SMTP configuration and try again."
    assert candidate.profile.raw_data["rejectionEmailStatus"] == "FAILED"
