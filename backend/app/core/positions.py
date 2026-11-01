"""Department / position catalog and technical-test paper keys."""

from __future__ import annotations

EXPERIENCE_FRESHER = "Fresher"
EXPERIENCE_EXPERIENCED = "Experienced"
EXPERIENCE_LEVELS = (EXPERIENCE_FRESHER, EXPERIENCE_EXPERIENCED)

OPENING_NEW = "New opening"
OPENING_REPLACEMENT = "Replacement"
OPENING_TYPES = (OPENING_NEW, OPENING_REPLACEMENT)

# Existing Sales & Department Staff Positions
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

# Service Positions
POS_SERVICE_TECH_TRAINEE = "Technician Trainee"
POS_SERVICE_TECH = "Technician"
POS_SERVICE_PAINT_TECH_TRAINEE = "Paint Technician Trainee"
POS_SERVICE_PAINT_TECH = "Paint Technician"
POS_SERVICE_BODY_TECH_TRAINEE = "Body Technician Trainee"
POS_SERVICE_BODY_TECH = "Body Technician"
POS_SERVICE_ADVISOR_TRAINEE = "Service Advisor Trainee"
POS_SERVICE_ADVISOR = "Service Advisor"
POS_SERVICE_CHIEF_GEN_TECH = "Chief General Technician"
POS_SERVICE_FRONT_BACK_OFFICE = "Front Office / Back Office Executive"
POS_SERVICE_WARRANTY_INCHARGE = "Warranty In-Charge"
POS_SERVICE_TECH_LEADER = "Technical Leader"
POS_SERVICE_PARTS_INCHARGE = "Parts In-Charge"

# Call Centre Positions
POS_CALL_CENTRE_EXEC = "Call Centre Executive"

# Accessories Positions
POS_ACCESSORIES_TECH = "Accessories Technician"
POS_ACCESSORIES_SALES_EXEC = "Accessories Sales Executive"
POS_ACCESSORIES_PARTS_INCHARGE = "Accessories Parts In-Charge"

# Security Positions
POS_SECURITY_GUARD = "Security Guard"
POS_SECURITY_SUPERVISOR = "Security Supervisor"

SALES_DEPARTMENT = "Sales"
SERVICE_DEPARTMENT = "Service"
CALL_CENTRE_DEPARTMENT = "Call Centre"
ACCESSORIES_DEPARTMENT = "Accessories"
SECURITY_DEPARTMENT = "Security"

SALES_POSITIONS = (POS_GEM, POS_BACK_OFFICE, POS_LOBBY, POS_DRIVER)

SERVICE_POSITIONS = (
    POS_SERVICE_TECH_TRAINEE,
    POS_SERVICE_TECH,
    POS_SERVICE_PAINT_TECH_TRAINEE,
    POS_SERVICE_PAINT_TECH,
    POS_SERVICE_BODY_TECH_TRAINEE,
    POS_SERVICE_BODY_TECH,
    POS_SERVICE_ADVISOR_TRAINEE,
    POS_SERVICE_ADVISOR,
    POS_SERVICE_CHIEF_GEN_TECH,
    POS_SERVICE_FRONT_BACK_OFFICE,
    POS_SERVICE_WARRANTY_INCHARGE,
    POS_SERVICE_TECH_LEADER,
    POS_SERVICE_PARTS_INCHARGE,
    POS_DRIVER,
)

ACCESSORIES_POSITIONS = (
    POS_ACCESSORIES_TECH,
    POS_ACCESSORIES_SALES_EXEC,
    POS_ACCESSORIES_PARTS_INCHARGE,
    POS_DRIVER,
)

SECURITY_POSITIONS = (
    POS_SECURITY_GUARD,
    POS_SECURITY_SUPERVISOR,
    POS_DRIVER,
)

CALL_CENTRE_POSITIONS = (
    POS_CALL_CENTRE_EXEC,
    POS_DRIVER,
)

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

# New Paper Keys
PAPER_SERVICE_TECH_TRAINEE = "SERVICE_TECH_TRAINEE"
PAPER_SERVICE_TECH = "SERVICE_TECH"
PAPER_SERVICE_PAINT_TECH_TRAINEE = "SERVICE_PAINT_TECH_TRAINEE"
PAPER_SERVICE_PAINT_TECH = "SERVICE_PAINT_TECH"
PAPER_SERVICE_BODY_TECH_TRAINEE = "SERVICE_BODY_TECH_TRAINEE"
PAPER_SERVICE_BODY_TECH = "SERVICE_BODY_TECH"
PAPER_SERVICE_ADVISOR_TRAINEE = "SERVICE_ADVISOR_TRAINEE"
PAPER_SERVICE_ADVISOR = "SERVICE_ADVISOR"
PAPER_SERVICE_CHIEF_GEN_TECH = "SERVICE_CHIEF_GEN_TECH"
PAPER_SERVICE_FRONT_BACK_OFFICE = "SERVICE_FRONT_BACK_OFFICE"
PAPER_SERVICE_WARRANTY_INCHARGE = "SERVICE_WARRANTY_INCHARGE"
PAPER_SERVICE_TECH_LEADER = "SERVICE_TECH_LEADER"
PAPER_SERVICE_PARTS_INCHARGE = "SERVICE_PARTS_INCHARGE"

PAPER_CALL_CENTRE_EXEC = "CALL_CENTRE_EXEC"

PAPER_ACCESSORIES_TECH = "ACCESSORIES_TECH"
PAPER_ACCESSORIES_SALES_EXEC = "ACCESSORIES_SALES_EXEC"
PAPER_ACCESSORIES_PARTS_INCHARGE = "ACCESSORIES_PARTS_INCHARGE"

PAPER_SECURITY_GUARD = "SECURITY_GUARD"
PAPER_SECURITY_SUPERVISOR = "SECURITY_SUPERVISOR"

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

SERVICE_PAPER_BY_POS = {
    POS_SERVICE_TECH_TRAINEE: PAPER_SERVICE_TECH_TRAINEE,
    POS_SERVICE_TECH: PAPER_SERVICE_TECH,
    POS_SERVICE_PAINT_TECH_TRAINEE: PAPER_SERVICE_PAINT_TECH_TRAINEE,
    POS_SERVICE_PAINT_TECH: PAPER_SERVICE_PAINT_TECH,
    POS_SERVICE_BODY_TECH_TRAINEE: PAPER_SERVICE_BODY_TECH_TRAINEE,
    POS_SERVICE_BODY_TECH: PAPER_SERVICE_BODY_TECH,
    POS_SERVICE_ADVISOR_TRAINEE: PAPER_SERVICE_ADVISOR_TRAINEE,
    POS_SERVICE_ADVISOR: PAPER_SERVICE_ADVISOR,
    POS_SERVICE_CHIEF_GEN_TECH: PAPER_SERVICE_CHIEF_GEN_TECH,
    POS_SERVICE_FRONT_BACK_OFFICE: PAPER_SERVICE_FRONT_BACK_OFFICE,
    POS_SERVICE_WARRANTY_INCHARGE: PAPER_SERVICE_WARRANTY_INCHARGE,
    POS_SERVICE_TECH_LEADER: PAPER_SERVICE_TECH_LEADER,
    POS_SERVICE_PARTS_INCHARGE: PAPER_SERVICE_PARTS_INCHARGE,
    # Tolerant aliases
    "Warranty Incharge": PAPER_SERVICE_WARRANTY_INCHARGE,
    "Parts Incharge": PAPER_SERVICE_PARTS_INCHARGE,
    "Front office and Back office": PAPER_SERVICE_FRONT_BACK_OFFICE,
}

ACCESSORIES_PAPER_BY_POS = {
    POS_ACCESSORIES_TECH: PAPER_ACCESSORIES_TECH,
    POS_ACCESSORIES_SALES_EXEC: PAPER_ACCESSORIES_SALES_EXEC,
    POS_ACCESSORIES_PARTS_INCHARGE: PAPER_ACCESSORIES_PARTS_INCHARGE,
    "Accessories Parts Incharge": PAPER_ACCESSORIES_PARTS_INCHARGE,
}

SECURITY_PAPER_BY_POS = {
    POS_SECURITY_GUARD: PAPER_SECURITY_GUARD,
    POS_SECURITY_SUPERVISOR: PAPER_SECURITY_SUPERVISOR,
}

CALL_CENTRE_PAPER_BY_POS = {
    POS_CALL_CENTRE_EXEC: PAPER_CALL_CENTRE_EXEC,
}

ROLE_SAMPLE_SIZE = 9
COMMON_QUESTION_COUNT = 6


def positions_for(department: str) -> tuple[str, ...]:
    if department == SALES_DEPARTMENT:
        return SALES_POSITIONS
    if department in (SERVICE_DEPARTMENT, "Service - Lexus"):
        return SERVICE_POSITIONS
    if department == ACCESSORIES_DEPARTMENT:
        return ACCESSORIES_POSITIONS
    if department == SECURITY_DEPARTMENT:
        return SECURITY_POSITIONS
    if department == CALL_CENTRE_DEPARTMENT:
        return CALL_CENTRE_POSITIONS
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
    if dept in (SERVICE_DEPARTMENT, "Service - Lexus") or pos in SERVICE_PAPER_BY_POS:
        paper = SERVICE_PAPER_BY_POS.get(pos)
        if paper:
            return paper
    if dept == ACCESSORIES_DEPARTMENT or pos in ACCESSORIES_PAPER_BY_POS:
        paper = ACCESSORIES_PAPER_BY_POS.get(pos)
        if paper:
            return paper
    if dept == SECURITY_DEPARTMENT or pos in SECURITY_PAPER_BY_POS:
        paper = SECURITY_PAPER_BY_POS.get(pos)
        if paper:
            return paper
    if dept == CALL_CENTRE_DEPARTMENT or pos in CALL_CENTRE_PAPER_BY_POS:
        paper = CALL_CENTRE_PAPER_BY_POS.get(pos)
        if paper:
            return paper
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
