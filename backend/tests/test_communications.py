import pytest

from app.core.config import settings
from app.services.doubletick import DoubleTickError, send_template
from app.services.email import EmailSendError, send_email_with_pdf


def test_email_without_credentials_is_not_simulated(monkeypatch):
    monkeypatch.setattr(settings, "smtp_password", "")

    with pytest.raises(EmailSendError, match="not configured"):
        send_email_with_pdf(
            to_email="candidate@example.test",
            subject="Offer",
            body_html="<p>Offer</p>",
            pdf_bytes=b"pdf",
            pdf_filename="offer.pdf",
        )


def test_doubletick_without_credentials_is_not_sent(monkeypatch):
    monkeypatch.setattr(settings, "doubletick_api_key", "")
    monkeypatch.setattr(settings, "waba_phone_number_id", "")

    with pytest.raises(DoubleTickError, match="not configured"):
        send_template("9876543210", "candidate_invite", ["Candidate"])


def test_email_includes_cc_and_attachment_when_configured(monkeypatch):
    monkeypatch.setattr(settings, "smtp_password", "configured")
    monkeypatch.setattr(settings, "smtp_host", "smtp.example.test")
    monkeypatch.setattr(settings, "smtp_from_email", "hr@example.test")

    class FakeSMTP:
        def __init__(self, host, port):
            self.host = host
            self.port = port
            self.message = None

        def __enter__(self):
            return self

        def __exit__(self, *_args):
            return False

        def starttls(self):
            pass

        def login(self, _user, _password):
            pass

        def send_message(self, message, **_kwargs):
            self.message = message
            assert message["Cc"] == "cc@example.test"
            assert message.get_payload()[-1].get_filename() == "offer.pdf"

    smtp = FakeSMTP("", 0)
    monkeypatch.setattr("app.services.email.smtplib.SMTP", lambda host, port: smtp)

    assert send_email_with_pdf(
        to_email="candidate@example.test",
        subject="Offer",
        body_html="<p>Offer</p>",
        pdf_bytes=b"pdf",
        pdf_filename="offer.pdf",
        cc_emails=["cc@example.test"],
    ) is True
