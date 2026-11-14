import logging
import smtplib
import ssl
from email.message import EmailMessage

from app.core.config import settings

logger = logging.getLogger(__name__)


class EmailSendError(Exception):
    """Raised when email cannot be sent; message is safe for HR-facing errors."""


def _login_clean(server, user: str, password: str) -> None:
    clean_user = (user or "").strip()
    clean_password = (password or "").strip().replace(" ", "").strip('"').strip("'")
    server.user = clean_user
    server.password = clean_password
    try:
        # Send PLAIN auth directly. If credentials are bad, Gmail returns 535 BadCredentials.
        # Python's standard server.login() attempts a secondary AUTH LOGIN when PLAIN fails,
        # which triggers Gmail to drop the socket and mask the 535 behind 'Connection unexpectedly closed'.
        if hasattr(server, "auth") and hasattr(server, "auth_plain"):
            server.auth("PLAIN", server.auth_plain)
            return
    except smtplib.SMTPAuthenticationError:
        raise
    except Exception:
        pass
    server.login(clean_user, clean_password)


def _send_smtp_attempt(
    host: str,
    port: int,
    user: str,
    password: str,
    from_email: str,
    msg: EmailMessage,
    to_addrs: list[str],
) -> bool:
    context = ssl.create_default_context()
    if int(port) == 465:
        with smtplib.SMTP_SSL(host, port, context=context, timeout=20) as server:
            if hasattr(server, "ehlo"):
                server.ehlo()
            _login_clean(server, user, password)
            server.send_message(msg, from_addr=from_email, to_addrs=to_addrs)
            return True

    with smtplib.SMTP(host, port, timeout=20) as server:
        if hasattr(server, "ehlo"):
            server.ehlo()
        try:
            server.starttls(context=context)
        except TypeError:
            server.starttls()
        if hasattr(server, "ehlo"):
            server.ehlo()
        _login_clean(server, user, password)
        server.send_message(msg, from_addr=from_email, to_addrs=to_addrs)
        return True


def send_email(
    to_email: str,
    subject: str,
    body_html: str,
    cc_emails: list[str] | None = None,
    attachment: tuple[bytes, str, str] | None = None,
    from_name: str | None = None,
):
    """
    Sends an HTML email using standard SMTP with automatic TLS/SSL port fallback.
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
        msg['From'] = f"{from_name} <{settings.smtp_from_email}>" if from_name else settings.smtp_from_email
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
        
        primary_port = int(settings.smtp_port or 587)
        fallback_port = 465 if primary_port == 587 else 587

        try:
            _send_smtp_attempt(
                settings.smtp_host,
                primary_port,
                settings.smtp_user,
                settings.smtp_password,
                settings.smtp_from_email,
                msg,
                to_addrs,
            )
        except (
            smtplib.SMTPServerDisconnected,
            smtplib.SMTPConnectError,
            TimeoutError,
            OSError,
            ConnectionResetError,
        ) as disconnect_err:
            logger.warning(
                "Primary SMTP attempt on %s:%s failed (%s). Retrying on fallback port %s...",
                settings.smtp_host,
                primary_port,
                disconnect_err,
                fallback_port,
            )
            try:
                _send_smtp_attempt(
                    settings.smtp_host,
                    fallback_port,
                    settings.smtp_user,
                    settings.smtp_password,
                    settings.smtp_from_email,
                    msg,
                    to_addrs,
                )
            except Exception as fallback_err:
                logger.error(
                    "Fallback SMTP attempt on %s:%s also failed: %s",
                    settings.smtp_host,
                    fallback_port,
                    fallback_err,
                )
                raise fallback_err
        
        logger.info(f"Email sent successfully to {to_email}")
        return True
    except smtplib.SMTPAuthenticationError as e:
        logger.error("SMTP Authentication failed for %s: %s", settings.smtp_user, e)
        raise EmailSendError(
            f"SMTP Authentication failed for {settings.smtp_user}. Check Google App Password in configuration."
        ) from e
    except smtplib.SMTPRecipientsRefused as e:
        logger.error("Candidate email rejected for %s: %s", to_email, e)
        raise EmailSendError(
            f"Candidate email rejected by email provider ({to_email}). Check recipient address."
        ) from e
    except smtplib.SMTPException as e:
        logger.error("SMTP error while sending to %s: %s", to_email, e)
        raise EmailSendError(
            f"Email provider error while sending ({type(e).__name__}): {e}. Check SMTP configuration and try again."
        ) from e
    except Exception as e:
        logger.error("Failed to send email to %s: %s", to_email, e)
        err_msg = str(e).strip() or type(e).__name__
        raise EmailSendError(
            f"Email provider failed while sending: {err_msg}. Check SMTP configuration and try again."
        ) from e


def send_email_with_pdf(
    to_email: str,
    subject: str,
    body_html: str,
    pdf_bytes: bytes,
    pdf_filename: str,
    cc_emails: list[str] | None = None,
    from_name: str | None = None,
):
    """Sends an HTML email with a PDF attachment using standard SMTP."""
    return send_email(
        to_email=to_email,
        subject=subject,
        body_html=body_html,
        cc_emails=cc_emails,
        from_name=from_name,
        attachment=(pdf_bytes, 'application', pdf_filename),
    )
