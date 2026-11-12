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
    monkeypatch.setattr(
        "app.services.email.smtplib.SMTP",
        lambda host, port, timeout: smtp if timeout == 20 else None,
    )

    assert send_email_with_pdf(
        to_email="candidate@example.test",
        subject="Offer",
        body_html="<p>Offer</p>",
        pdf_bytes=b"pdf",
        pdf_filename="offer.pdf",
        cc_emails=["cc@example.test"],
    ) is True


def test_email_smtp_auth_error_provides_descriptive_message(monkeypatch):
    import smtplib

    monkeypatch.setattr(settings, "smtp_password", "configured")
    monkeypatch.setattr(settings, "smtp_host", "smtp.gmail.com")
    monkeypatch.setattr(settings, "smtp_from_email", "hr@example.test")

    class AuthFailingSMTP:
        def __init__(self, *args, **kwargs):
            pass
        def __enter__(self):
            return self
        def __exit__(self, *_args):
            return False
        def starttls(self):
            pass
        def login(self, _user, _password):
            raise smtplib.SMTPAuthenticationError(535, b"5.7.8 Username and Password not accepted")

    monkeypatch.setattr("app.services.email.smtplib.SMTP", AuthFailingSMTP)

    with pytest.raises(EmailSendError, match="SMTP Authentication failed"):
        send_email_with_pdf(
            to_email="candidate@example.test",
            subject="Offer",
            body_html="<p>Offer</p>",
            pdf_bytes=b"pdf",
            pdf_filename="offer.pdf",
        )


def test_email_recipients_refused_provides_descriptive_message(monkeypatch):
    import smtplib

    monkeypatch.setattr(settings, "smtp_password", "configured")
    monkeypatch.setattr(settings, "smtp_host", "smtp.gmail.com")
    monkeypatch.setattr(settings, "smtp_from_email", "hr@example.test")

    class RefusedSMTP:
        def __init__(self, *args, **kwargs):
            pass
        def __enter__(self):
            return self
        def __exit__(self, *_args):
            return False
        def starttls(self):
            pass
        def login(self, _user, _password):
            pass
        def send_message(self, *args, **kwargs):
            raise smtplib.SMTPRecipientsRefused({"candidate@bad": (550, b"User unknown")})

    monkeypatch.setattr("app.services.email.smtplib.SMTP", RefusedSMTP)

    with pytest.raises(EmailSendError, match="Candidate email rejected"):
        send_email_with_pdf(
            to_email="candidate@bad",
            subject="Offer",
            body_html="<p>Offer</p>",
            pdf_bytes=b"pdf",
            pdf_filename="offer.pdf",
        )


def test_email_smtp_disconnected_falls_back_to_ssl_port(monkeypatch):
    import smtplib

    monkeypatch.setattr(settings, "smtp_password", "configured")
    monkeypatch.setattr(settings, "smtp_host", "smtp.gmail.com")
    monkeypatch.setattr(settings, "smtp_port", 587)
    monkeypatch.setattr(settings, "smtp_from_email", "hr@example.test")

    class DisconnectingSMTP:
        def __init__(self, *args, **kwargs):
            pass
        def __enter__(self):
            raise smtplib.SMTPServerDisconnected("Connection unexpectedly closed")
        def __exit__(self, *args):
            return False

    fallback_sent = False

    class SuccessfulSSLSMTP:
        def __init__(self, *args, **kwargs):
            pass
        def __enter__(self):
            return self
        def __exit__(self, *args):
            return False
        def login(self, u, p):
            pass
        def send_message(self, msg, **kwargs):
            nonlocal fallback_sent
            fallback_sent = True

    monkeypatch.setattr("app.services.email.smtplib.SMTP", DisconnectingSMTP)
    monkeypatch.setattr("app.services.email.smtplib.SMTP_SSL", SuccessfulSSLSMTP)

    assert send_email_with_pdf(
        to_email="candidate@example.test",
        subject="Offer",
        body_html="<p>Offer</p>",
        pdf_bytes=b"pdf",
        pdf_filename="offer.pdf",
    ) is True
    assert fallback_sent is True
