import httpx
import logging
import re
from typing import List

from app.core.config import settings

logger = logging.getLogger(__name__)


class DoubleTickError(Exception):
    """Raised when DoubleTick send fails; user_message is safe to show in the UI."""

    def __init__(self, user_message: str, raw: str | None = None):
        self.user_message = user_message
        self.raw = raw or user_message
        super().__init__(user_message)


def _format_phone(phone: str) -> str:
    digits = re.sub(r"\D", "", phone)
    if len(digits) == 10:
        return f"+91{digits}"
    if len(digits) == 12 and digits.startswith("91"):
        return f"+{digits}"
    if phone.startswith("+"):
        return phone
    return f"+{digits}" if digits else ""


def _extract_api_error_text(response: httpx.Response) -> str:
    try:
        data = response.json()
    except Exception:
        return response.text or f"HTTP {response.status_code}"

    if isinstance(data, dict):
        for key in ("errorMessage", "message", "error", "detail", "description"):
            val = data.get(key)
            if isinstance(val, str) and val.strip():
                return val.strip()
            if isinstance(val, dict):
                nested = val.get("message") or val.get("errorMessage") or val.get("description")
                if isinstance(nested, str) and nested.strip():
                    return nested.strip()
        messages = data.get("messages")
        if isinstance(messages, list) and messages:
            first = messages[0] if isinstance(messages[0], dict) else {}
            err = first.get("errorMessage") or first.get("message") or first.get("status")
            if err:
                return str(err)
    return response.text or f"HTTP {response.status_code}"


def friendly_doubletick_error(raw: str) -> str:
    """Map DoubleTick/Meta error text to an obvious HR-facing message."""
    text = (raw or "").lower()

    if any(
        k in text
        for k in (
            "insufficient",
            "not enough",
            "low balance",
            "wallet",
            "credit",
            "funds",
            "top up",
            "top-up",
            "topup",
            "recharge",
            "balance is",
            "no balance",
            "out of credit",
            "payment required",
            "402",
        )
    ):
        return (
            "DoubleTick wallet has insufficient balance / credits. "
            "Top up the DoubleTick account, then try sending again."
        )

    if any(k in text for k in ("unauthorized", "invalid public api", "invalid api", "api key")):
        return "DoubleTick API key is invalid or unauthorized. Check server DoubleTick credentials."

    if any(
        k in text
        for k in (
            "template",
            "not found",
            "not approved",
            "does not exist",
            "undeliverable",
            "template name",
        )
    ) and "eligibility" not in text:
        return (
            "WhatsApp template is missing or not approved in DoubleTick. "
            "Confirm the template name and Meta approval status."
        )

    if any(k in text for k in ("eligibility", "payment issue", "unsupported post")):
        return (
            "WhatsApp Business eligibility/payment issue on DoubleTick/Meta. "
            "Contact DoubleTick support to restore messaging."
        )

    if "not configured" in text:
        return "DoubleTick is not configured on the server (API key or WABA number missing)."

    if any(k in text for k in ("timeout", "timed out", "connection")):
        return "Could not reach DoubleTick (network/timeout). Try again in a moment."

    cleaned = (raw or "").strip() or "Unknown DoubleTick error"
    if len(cleaned) > 280:
        cleaned = cleaned[:277] + "..."
    return f"WhatsApp send failed: {cleaned}"


def send_template(
    to_phone: str,
    template_name: str,
    placeholders: List[str],
    language: str = "en",
) -> dict:
    """
    Sends a WhatsApp template message using DoubleTick API.
    Raises DoubleTickError with a clear user_message on failure.
    """
    api_key = settings.doubletick_api_key
    from_number = settings.waba_phone_number_id

    if not api_key or not from_number:
        raise DoubleTickError(
            "DoubleTick is not configured on the server (API key or WABA number missing)."
        )

    url = "https://public.doubletick.io/whatsapp/message/template"
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": api_key,
    }

    payload = {
        "messages": [
            {
                "content": {
                    "templateName": template_name,
                    "language": language,
                    "templateData": {"body": {"placeholders": placeholders}},
                },
                "from": _format_phone(from_number),
                "to": _format_phone(to_phone),
            }
        ]
    }

    logger.info("Sending DoubleTick template '%s' to %s", template_name, to_phone)
    try:
        with httpx.Client(timeout=30.0) as client:
            response = client.post(url, json=payload, headers=headers)
    except httpx.TimeoutException as e:
        raise DoubleTickError(
            "Could not reach DoubleTick (network/timeout). Try again in a moment.",
            str(e),
        ) from e
    except httpx.RequestError as e:
        raise DoubleTickError(
            "Could not reach DoubleTick (network error). Try again in a moment.",
            str(e),
        ) from e

    if response.status_code < 200 or response.status_code >= 300:
        raw = _extract_api_error_text(response)
        logger.error("DoubleTick API failed (%s): %s", response.status_code, raw)
        raise DoubleTickError(friendly_doubletick_error(raw), raw)

    res_json = response.json()
    messages = res_json.get("messages", [])
    if messages:
        msg_status = messages[0]
        status = str(msg_status.get("status", "")).upper()
        if status in ("FAILED", "REJECTED", "ERROR"):
            raw = msg_status.get("errorMessage") or msg_status.get("message") or "Unknown error"
            logger.error("DoubleTick delivery failed: %s", raw)
            raise DoubleTickError(friendly_doubletick_error(str(raw)), str(raw))

    return res_json


if __name__ == "__main__":
    # ponytail: quick self-check for balance wording
    assert "insufficient" in friendly_doubletick_error("Insufficient wallet balance").lower()
    assert "Top up" in friendly_doubletick_error("not enough credits in account")
    assert "template" in friendly_doubletick_error("Template xyz not found").lower()
    print("ok")
