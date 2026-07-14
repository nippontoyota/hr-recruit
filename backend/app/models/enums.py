import enum


class UserRole(str, enum.Enum):
    ADMIN = "ADMIN"
    LOCAL_HR = "LOCAL_HR"


class PipelineStage(str, enum.Enum):
    SCREENING = "SCREENING"
    CANDIDATE_FORM = "CANDIDATE_FORM"
    HR_INTERVIEW = "HR_INTERVIEW"
    DEPARTMENT_INTERVIEW = "DEPARTMENT_INTERVIEW"
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


class SourceChannel(str, enum.Enum):
    WALK_IN = "WALK_IN"
    INDEED = "INDEED"
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

