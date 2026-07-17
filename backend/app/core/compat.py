"""Frontend contract shims (SPA role names + source labels)."""

from __future__ import annotations

import re

from app.models.enums import SourceChannel, UserRole

# DB role → values the SPA RoleRoute / AuthContext expect
ROLE_TO_FRONTEND: dict[UserRole, str] = {
    UserRole.ADMIN: "SUPER_ADMIN",
    UserRole.LOCAL_HR: "HR",
    UserRole.SUPER_ADMIN: "SUPER_ADMIN",
    UserRole.COMPANY_HR_HEAD: "COMPANY_HR_HEAD",
    UserRole.BRANCH_HR: "BRANCH_HR",
    UserRole.HQ_HR: "HQ_HR",
    UserRole.DEPT_HEAD: "DEPT_HEAD",
    UserRole.BRANCH_VP: "BRANCH_VP",
    UserRole.SERVICE_VP: "SERVICE_VP",
    UserRole.HQ_STAFF: "HQ_STAFF",
    UserRole.FINANCE: "FINANCE",
}

# Common UI / mock labels → SourceChannel
_SOURCE_ALIASES: dict[str, SourceChannel] = {
    "walk_in": SourceChannel.WALK_IN,
    "walk-in": SourceChannel.WALK_IN,
    "walk in": SourceChannel.WALK_IN,
    "walkin": SourceChannel.WALK_IN,
    "indeed": SourceChannel.INDEED,
    "referral": SourceChannel.REFERRAL,
    "campus": SourceChannel.CAMPUS,
    "other": SourceChannel.OTHER,
    "linkedin": SourceChannel.OTHER,
    "website": SourceChannel.OTHER,
    "web": SourceChannel.OTHER,
    "naukri": SourceChannel.OTHER,
}


def role_for_frontend(role: UserRole) -> str:
    return ROLE_TO_FRONTEND[role]


def parse_source_channel(value: object) -> SourceChannel:
    if isinstance(value, SourceChannel):
        return value
    if not isinstance(value, str) or not value.strip():
        raise ValueError("source_channel is required")

    raw = value.strip()
    upper = raw.upper().replace(" ", "_").replace("-", "_")
    try:
        return SourceChannel(upper)
    except ValueError:
        pass

    key = re.sub(r"\s+", " ", raw.lower().replace("_", " ").replace("-", " ")).strip()
    key_compact = key.replace(" ", "")
    if key in _SOURCE_ALIASES:
        return _SOURCE_ALIASES[key]
    if key_compact in _SOURCE_ALIASES:
        return _SOURCE_ALIASES[key_compact]
    raise ValueError(f"Unsupported source_channel: {value}")
