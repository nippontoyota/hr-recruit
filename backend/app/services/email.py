import smtplib
from email.message import EmailMessage
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

def send_email_with_pdf(to_email: str, subject: str, body_html: str, pdf_bytes: bytes, pdf_filename: str):
    """
    Sends an email with a PDF attachment using standard SMTP.
    """
    if not settings.smtp_password:
        logger.warning(f"SMTP password not configured. Simulating email to {to_email}")
        logger.info(f"Email Subject: {subject}")
        return True

    try:
        msg = EmailMessage()
        msg['Subject'] = subject
        msg['From'] = settings.smtp_from_email
        msg['To'] = to_email
        
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
            server.send_message(msg)
            
        logger.info(f"Email sent successfully to {to_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {str(e)}")
        raise e
