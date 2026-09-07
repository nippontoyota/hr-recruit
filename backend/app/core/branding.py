"""Brand identity and safe defaults for multi-brand recruitment flows."""

from __future__ import annotations

NIPPON_TOYOTA = "NIPPON_TOYOTA"
RIVER = "RIVER"

RIVER_TEMPLATE_NAMES = {
    "call_letter": "river_interview_call_letter",
    "call_letter_v2": "river_interview_call_letter_v2",
    "call_letter_v2_two_touchpoints": "river_interview_call_letter_v2_two_touchpoints",
    "hr_interview": "river_interview_schedule",
    "interviewer": "river_interviewer_invite",
    "technical_test": "river_technical_test_invite",
    "ho_interview": "river_head_office_interview_invite",
    "ho_online_interview": "river_head_office_online_interview_invite",
    "offer": "river_offer_intimation",
}


def normalize_brand(value: object) -> str:
    """Resolve legacy/null/unknown values to the original Toyota brand."""
    return RIVER if str(value or "").strip().upper() == RIVER else NIPPON_TOYOTA


def brand_is_river(value: object) -> bool:
    return normalize_brand(value) == RIVER


def brand_label(value: object) -> str:
    return "River" if brand_is_river(value) else "Nippon Toyota"


def brand_template(key: str, value: object, fallback: str) -> str:
    return RIVER_TEMPLATE_NAMES.get(key, fallback) if brand_is_river(value) else fallback


def brand_setting(value: object, toyota_value: str, river_value: str) -> str:
    """Pick a configured asset without ever falling back across brands."""
    return river_value if brand_is_river(value) else toyota_value
