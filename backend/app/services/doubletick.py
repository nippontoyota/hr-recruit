import httpx
import logging
import re
from typing import List
from app.core.config import settings

logger = logging.getLogger(__name__)

def _format_phone(phone: str) -> str:
    # Prepend +91 for Indian mobile numbers if they don't have it
    digits = re.sub(r"\D", "", phone)
    if len(digits) == 10:
        return f"+91{digits}"
    if len(digits) == 12 and digits.startswith("91"):
        return f"+{digits}"
    if phone.startswith("+"):
        return phone
    return f"+{digits}" if digits else ""

def send_template(
    to_phone: str,
    template_name: str,
    placeholders: List[str],
    language: str = "en"
) -> dict:
    """
    Sends a WhatsApp template message using DoubleTick API.
    Returns the API response dict.
    """
    api_key = settings.doubletick_api_key
    from_number = settings.waba_phone_number_id
    
    if not api_key or not from_number:
        raise ValueError("DoubleTick API Key or WABA Phone Number ID is not configured.")

    url = "https://public.doubletick.io/whatsapp/message/template"
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": api_key
    }

    payload = {
        "messages": [
            {
                "content": {
                    "templateName": template_name,
                    "language": language,
                    "templateData": {
                        "body": {
                            "placeholders": placeholders
                        }
                    }
                },
                "from": _format_phone(from_number),
                "to": _format_phone(to_phone)
            }
        ]
    }

    logger.info(f"Sending DoubleTick template '{template_name}' to {to_phone}")
    with httpx.Client(timeout=30.0) as client:
        response = client.post(url, json=payload, headers=headers)
        
        if response.status_code < 200 or response.status_code >= 300:
            logger.error(f"DoubleTick API failed with status {response.status_code}: {response.text}")
            response.raise_for_status()
        
        res_json = response.json()
        messages = res_json.get("messages", [])
        if messages:
            msg_status = messages[0]
            status = msg_status.get("status", "").upper()
            if status in ("FAILED", "REJECTED", "ERROR"):
                err_msg = msg_status.get("errorMessage") or "Unknown error"
                logger.error(f"DoubleTick delivery failed: {err_msg}")
                raise Exception(f"DoubleTick delivery failed: {err_msg}")
        
        return res_json
