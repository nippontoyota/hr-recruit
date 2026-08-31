import smtplib
from email.message import EmailMessage
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)


class EmailSendError(Exception):
    """Raised when email cannot be sent; message is safe for HR-facing errors."""


def send_email(
    to_email: str,
    subject: str,
    body_html: str,
    cc_emails: list[str] | None = None,
    attachment: tuple[bytes, str, str] | None = None,
):
    """
    Sends an HTML email using standard SMTP.
    """
    if not settings.smtp_password or not settings.smtp_host or not settings.smtp_from_email:
        raise EmailSendError(
            "Email is not configured on the server. Add SMTP credentials before sending."
        )

    try:
        cc_emails = [e.strip() for e in (cc_emails or []) if e and e.strip()]
        to_addrs = [to_email] + cc_emails

        msg = EmailMessage()
        msg['Subject'] = subject
        msg['From'] = settings.smtp_from_email
        msg['To'] = to_email
        if cc_emails:
            msg['Cc'] = ", ".join(cc_emails)
        
        msg.set_content("Please enable HTML to view this email.")
        msg.add_alternative(body_html, subtype='html')
        
        if attachment:
            attachment_bytes, maintype, filename = attachment
            subtype = 'pdf' if maintype == 'application' else 'octet-stream'
            msg.add_attachment(
                attachment_bytes,
                maintype=maintype,
                subtype=subtype,
                filename=filename,
            )
        
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=20) as server:
            server.starttls()
            server.login(settings.smtp_user, settings.smtp_password)
            server.send_message(msg, from_addr=settings.smtp_from_email, to_addrs=to_addrs)
            
        logger.info(f"Email sent successfully to {to_email}")
        return True
    except Exception as e:
        logger.error("Failed to send email to %s: %s", to_email, e)
        raise EmailSendError(
            "Email provider failed while sending. Check SMTP configuration and try again."
        ) from e


def send_email_with_pdf(
    to_email: str,
    subject: str,
    body_html: str,
    pdf_bytes: bytes,
    pdf_filename: str,
    cc_emails: list[str] | None = None,
):
    """Sends an HTML email with a PDF attachment using standard SMTP."""
    return send_email(
        to_email=to_email,
        subject=subject,
        body_html=body_html,
        cc_emails=cc_emails,
        attachment=(pdf_bytes, 'application', pdf_filename),
    )
