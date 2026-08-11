import enum


class UserRole(str, enum.Enum):
    ADMIN = "ADMIN"
    HO_HR = "HO_HR"
    LOCAL_HR = "LOCAL_HR"


class PipelineStage(str, enum.Enum):
    SCREENING = "SCREENING"
    CANDIDATE_FORM = "CANDIDATE_FORM"
    BRANCH_INTERVIEW = "BRANCH_INTERVIEW"
    TEST = "TEST"
    FINAL_APPROVAL = "FINAL_APPROVAL"
    HIRED = "HIRED"
    REJECTED = "REJECTED"
    ON_HOLD = "ON_HOLD"
    
    # New Branch Flow Stages
    CALL_LETTER = "CALL_LETTER"
    INTERVIEWS = "INTERVIEWS"
    BACKGROUND_VERIFICATION = "BACKGROUND_VERIFICATION"
    APPLICATION = "APPLICATION"
    SENT_TO_HO = "SENT_TO_HO"
    
    # New HO HR Flow Stages
    HO_INTERVIEWS = "HO_INTERVIEWS"
    SALARY_DETAILS = "SALARY_DETAILS"
    CSS = "CSS"
    
    # Deprecated stages (kept for SQLAlchemy pg_enum mapping compatibility)
    DEPARTMENT_INTERVIEW = "DEPARTMENT_INTERVIEW"
    BRANCH_EVALUATION = "BRANCH_EVALUATION"
    HR_INTERVIEW = "HR_INTERVIEW"


class FormStatus(str, enum.Enum):
    NOT_SENT = "NOT_SENT"
    SENT = "SENT"
    VIEWED = "VIEWED"
    SUBMITTED = "SUBMITTED"
    EXPIRED = "EXPIRED"


class ScreeningStatus(str, enum.Enum):
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    QUALIFIED = "QUALIFIED"
    REJECTED = "REJECTED"


class ActivityType(str, enum.Enum):
    CALL = "CALL"
    WHATSAPP = "WHATSAPP"
    EMAIL = "EMAIL"
    STAGE_CHANGE = "STAGE_CHANGE"
    FORM = "FORM"
    SYSTEM = "SYSTEM"
    NOTE = "NOTE"


class SourceChannel(str, enum.Enum):
    WALK_IN = "WALK_IN"
    INDEED = "INDEED"
    NAUKRI = "NAUKRI"
    REFERRAL = "REFERRAL"
    CAMPUS = "CAMPUS"
    OTHER = "OTHER"


class DocumentType(str, enum.Enum):
    RESUME = "RESUME"


class CommunicationType(str, enum.Enum):
    WHATSAPP = "WHATSAPP"
    EMAIL = "EMAIL"
    PHONE_CALL = "PHONE_CALL"


class CommunicationDirection(str, enum.Enum):
    INCOMING = "INCOMING"
    OUTGOING = "OUTGOING"


class CommunicationStatus(str, enum.Enum):
    PENDING = "PENDING"
    SENT = "SENT"
    DELIVERED = "DELIVERED"
    FAILED = "FAILED"
    READ = "READ"


class FollowUpPriority(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class FollowUpStatus(str, enum.Enum):
    PENDING = "PENDING"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class InterviewVerdict(str, enum.Enum):
    SELECTED = "SELECTED"
    REJECTED = "REJECTED"
    ON_HOLD = "ON_HOLD"


class InterviewMode(str, enum.Enum):
    PHYSICAL = "PHYSICAL"
    ONLINE = "ONLINE"


class InterviewStatus(str, enum.Enum):
    PENDING_SCHEDULE = "PENDING_SCHEDULE"
    SCHEDULED = "SCHEDULED"
    EVALUATED = "EVALUATED"


class EvaluationType(str, enum.Enum):
    BRANCH_HR = "BRANCH_HR"
    DEPT_HEAD = "DEPT_HEAD"
    GM_LEVEL = "GM_LEVEL"
    TECHNICAL_TEST = "TECHNICAL_TEST"
    HQ_INTERVIEW = "HQ_INTERVIEW"


class EvaluationVerdict(str, enum.Enum):
    SELECTED = "SELECTED"
    REJECTED = "REJECTED"
    ON_HOLD = "ON_HOLD"
    PASS = "PASS"
    FAIL = "FAIL"

