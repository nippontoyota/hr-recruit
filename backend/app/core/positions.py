"""Department / position catalog and technical-test paper keys."""

from __future__ import annotations

EXPERIENCE_FRESHER = "Fresher"
EXPERIENCE_EXPERIENCED = "Experienced"
EXPERIENCE_LEVELS = (EXPERIENCE_FRESHER, EXPERIENCE_EXPERIENCED)

POS_GEM = "GEM (Guest Experienced Manager)"
POS_BACK_OFFICE = "Back Office / Delivery Coordinator"
POS_LOBBY = "Lobby In-Charge"
POS_DRIVER = "Driver"
POS_CR = "Customer Relation Executive"
POS_ACCOUNTS = "Accounts Executive"
POS_HR = "HR Executive"
POS_SYSTEMS = "System Administrator"
POS_PROJECTS = "Projects Executive"
POS_INSURANCE = "Insurance Executive"
POS_MARKETING = "Marketing Executive"
POS_FINANCE = "Finance Coordinator"
POS_TRAINING = "Trainer"

SALES_DEPARTMENT = "Sales"

SALES_POSITIONS = (POS_GEM, POS_BACK_OFFICE, POS_LOBBY, POS_DRIVER)
DRIVER_ONLY_POSITIONS = (POS_DRIVER,)
STAFF_BY_DEPT = {
    "CR": POS_CR,
    "Accounts": POS_ACCOUNTS,
    "HR": POS_HR,
    "Systems": POS_SYSTEMS,
    "Projects": POS_PROJECTS,
    "Insurance": POS_INSURANCE,
    "Marketing": POS_MARKETING,
    "Finance": POS_FINANCE,
    "Training": POS_TRAINING,
}

DEPARTMENTS = (
    "Accessories",
    "Accounts",
    "Administration",
    "Call Centre",
    "CR",
    "Finance",
    "HR",
    "Insurance",
    "Marketing",
    "Projects",
    "Purchase",
    "Sales",
    "Sales - Lexus",
    "Sales - U Trust",
    "Security",
    "Service",
    "Service - Lexus",
    "Systems",
    "Training",
    "Management operations",
)

PAPER_COMMON = "COMMON"
PAPER_GEM_FRESHER = "SALES_GEM_FRESHER"
PAPER_GEM_EXPERIENCED = "SALES_GEM_EXPERIENCED"
PAPER_BACK_OFFICE = "SALES_BACK_OFFICE"
PAPER_LOBBY = "SALES_LOBBY"
PAPER_DRIVER = "DRIVER"
PAPER_CR_FRESHER = "CR_FRESHER"
PAPER_CR_EXPERIENCED = "CR_EXPERIENCED"
PAPER_ACCOUNTS = "ACCOUNTS"
PAPER_HR = "HR"
PAPER_SYSTEMS = "SYSTEMS"
PAPER_PROJECTS = "PROJECTS"
PAPER_INSURANCE = "INSURANCE"
PAPER_MARKETING = "MARKETING"
PAPER_FINANCE = "FINANCE"
PAPER_TRAINING = "TRAINING"
PAPER_BY_DEPT = {
    "Accounts": PAPER_ACCOUNTS,
    "HR": PAPER_HR,
    "Systems": PAPER_SYSTEMS,
    "Projects": PAPER_PROJECTS,
    "Insurance": PAPER_INSURANCE,
    "Marketing": PAPER_MARKETING,
    "Finance": PAPER_FINANCE,
    "Training": PAPER_TRAINING,
}

ROLE_SAMPLE_SIZE = 9
COMMON_QUESTION_COUNT = 6


def positions_for(department: str) -> tuple[str, ...]:
    if department == SALES_DEPARTMENT:
        return SALES_POSITIONS
    staff = STAFF_BY_DEPT.get(department)
    if staff:
        return (staff, POS_DRIVER)
    if department in DEPARTMENTS:
        return DRIVER_ONLY_POSITIONS
    return ()


def paper_key(department: str | None, position: str | None, experience: str | None) -> str | None:
    """Return the role-bank paper key, or None if the assignment has no paper."""
    pos = (position or "").strip()
    dept = (department or "").strip()
    exp = (experience or "").strip() or EXPERIENCE_FRESHER
    if pos == POS_DRIVER:
        return PAPER_DRIVER
    if dept == SALES_DEPARTMENT:
        if pos == POS_GEM:
            if exp == EXPERIENCE_EXPERIENCED:
                return PAPER_GEM_EXPERIENCED
            return PAPER_GEM_FRESHER
        if pos == POS_BACK_OFFICE:
            return PAPER_BACK_OFFICE
        if pos == POS_LOBBY:
            return PAPER_LOBBY
        return None
    if dept == "CR" and pos == POS_CR:
        if exp == EXPERIENCE_EXPERIENCED:
            return PAPER_CR_EXPERIENCED
        return PAPER_CR_FRESHER
    if pos == STAFF_BY_DEPT.get(dept):
        return PAPER_BY_DEPT.get(dept)
    return None


def validate_assignment(
    department: str,
    position: str,
    experience: str | None = None,
) -> None:
    if department not in DEPARTMENTS:
        raise ValueError(f"Department must be one of: {', '.join(DEPARTMENTS)}")
    allowed = positions_for(department)
    if position not in allowed:
        raise ValueError(f"Position must be one of: {', '.join(allowed)}")
    if experience is not None and experience not in EXPERIENCE_LEVELS:
        raise ValueError("Experience must be Fresher or Experienced.")
