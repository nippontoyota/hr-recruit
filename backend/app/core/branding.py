"""Brand identity and safe defaults for multi-brand recruitment flows."""

from __future__ import annotations

NIPPON_TOYOTA = "NIPPON_TOYOTA"
RIVER = "RIVER"


def normalize_brand(value: object) -> str:
    """Resolve legacy/null/unknown values to the original Toyota brand."""
    return RIVER if str(value or "").strip().upper() == RIVER else NIPPON_TOYOTA


def brand_is_river(value: object) -> bool:
    return normalize_brand(value) == RIVER
