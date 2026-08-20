import smtplib
from email.message import EmailMessage
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)


class EmailSendError(Exception):
    """Raised when email cannot be sent; message is safe for HR-facing errors."""


def send_email_with_pdf(
    to_email: str,
    subject: str,
    body_html: str,
    pdf_bytes: bytes,
    pdf_filename: str,
    cc_emails: list[str] | None = None,
):
    """
    Sends an email with a PDF attachment using standard SMTP.
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
        
        # Attach the PDF
        msg.add_attachment(
            pdf_bytes,
            maintype='application',
            subtype='pdf',
            filename=pdf_filename
        )
        
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
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
