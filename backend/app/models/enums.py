import enum


class UserRole(str, enum.Enum):
    SUPER_ADMIN = "SUPER_ADMIN"
    COMPANY_HR_HEAD = "COMPANY_HR_HEAD"
    BRANCH_HR = "BRANCH_HR"
    HQ_HR = "HQ_HR"
    DEPT_HEAD = "DEPT_HEAD"
    BRANCH_VP = "BRANCH_VP"
    SERVICE_VP = "SERVICE_VP"
    HQ_STAFF = "HQ_STAFF"
    FINANCE = "FINANCE"
    # Legacy roles for compatibility
    ADMIN = "ADMIN"
    LOCAL_HR = "LOCAL_HR"
    HR = "LOCAL_HR"


class PipelineStage(str, enum.Enum):
    SCREENING = "SCREENING"
    CANDIDATE_FORM = "CANDIDATE_FORM"
    HR_INTERVIEW = "HR_INTERVIEW"
    DEPARTMENT_INTERVIEW = "DEPARTMENT_INTERVIEW"
    BRANCH_EVALUATION = "BRANCH_EVALUATION"
    FINAL_APPROVAL = "FINAL_APPROVAL"
    HIRED = "HIRED"
    REJECTED = "REJECTED"
    ON_HOLD = "ON_HOLD"


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

