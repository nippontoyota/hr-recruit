from datetime import datetime, timezone
from uuid import UUID

from pydantic import AliasChoices, BaseModel, ConfigDict, Field, field_validator, model_validator

from app.models.enums import DocumentType, PipelineStage, FormStatus, ScreeningStatus, ActivityType
from app.core.compat import parse_source_channel
from app.utils import validators as v


class CandidateCreate(BaseModel):
    """Accepts SPA field names; unknown extras are ignored."""

    model_config = ConfigDict(extra="ignore")

    full_name: str
    phone: str
    email: str | None = None
    source: str = "Unknown"
    source_reference: str | None = None
    position_applied_for: str = "Unknown"
    department: str | None = None
    branch_location: str | None = Field(
        default=None,
        validation_alias=AliasChoices("branch_location", "branch_name"),
    )
    assigned_hr_user_id: UUID | None = None

    @field_validator("full_name")
    @classmethod
    def check_full_name(cls, value: str) -> str:
        return v.validate_full_name(value)

    @field_validator("phone")
    @classmethod
    def check_phone(cls, value: str) -> str:
        return v.validate_phone(value)

    @field_validator("email")
    @classmethod
    def check_email(cls, value: str | None) -> str | None:
        return v.validate_email(value, required=False)

    @field_validator("position_applied_for")
    @classmethod
    def check_position(cls, value: str) -> str:
        if value == "Unknown":
            return value
        return v.validate_text_field(value, "Position applied for", 2, 100)

    @field_validator("source")
    @classmethod
    def check_source(cls, value: str) -> str:
        if value in ("Unknown", ""):
            return "Unknown"
        try:
            return parse_source_channel(value).value
        except ValueError as exc:
            raise ValueError(str(exc)) from exc

    @field_validator("source_reference")
    @classmethod
    def check_source_reference(cls, value: str | None) -> str | None:
        if value is None or not value.strip():
            return None
        if len(value.strip()) > 255:
            raise ValueError("Source reference must be at most 255 characters.")
        return value.strip()


class CandidateResolveDuplicate(BaseModel):
    action: str = Field(..., description="Either 'MERGE' or 'NOT_DUPLICATE'")


class PreFormApplicationData(BaseModel):
    """Validated payload for public pre-interview form submission."""

    model_config = ConfigDict(extra="ignore")

    nameAadhaar: str
    gender: str
    dateOfBirth: str
    age: str
    maritalStatus: str
    height: str
    weight: str
    bloodGroup: str
    religionCaste: str

    permHouseName: str
    permPostOffice: str
    permLandmark: str
    permDistrict: str
    permPinCode: str

    sameAsPermanent: bool = True
    presHouseName: str = ""
    presPostOffice: str = ""
    presLandmark: str = ""
    presDistrict: str = ""
    presPinCode: str = ""

    aadhaarNumber: str
    panNumber: str
    drivingLicenseNumber: str
    passportNumber: str = ""

    class10School: str
    class10Board: str
    class10Percentage: str
    class10PassingYear: str
    class10Mode: str

    class12School: str
    class12Stream: str
    class12Percentage: str
    class12PassingYear: str
    class12Mode: str

    gradCourse: str = ""
    gradCollege: str = ""
    gradPercentage: str = ""
    gradPassingYear: str = ""

    postGradCourse: str = ""
    postGradCollege: str = ""
    postGradPercentage: str = ""
    postGradPassingYear: str = ""

    languagesRead: str
    languagesWrite: str
    languagesSpeak: str

    previousExperience: bool = False
    prevCompanyName: str = ""
    prevPosition: str = ""
    totalExperience: str = "Fresher"
    expectedSalary: str

    sourceOfOpening: str
    referredBy: str = ""
    preferredRegion: str
    expectedJoiningDate: str

    hasReference: bool = False
    refRole: str = ""
    refName: str = ""
    refPanchayat: str = ""
    refContactNumber: str = ""

    prevTerminated: bool = False
    physicalDisability: bool = False
    nervousDisorder: bool = False
    eyeVision: bool = False
    criminalConviction: bool = False
    medicalRemarks: str = ""

    @model_validator(mode="after")
    def validate_all(self) -> "PreFormApplicationData":
        v.validate_full_name(self.nameAadhaar, "Name (as per Aadhaar)")
        v.validate_select(self.gender, v.GENDERS, "Gender")
        v.validate_dob(self.dateOfBirth, self.age)
        v.validate_select(self.maritalStatus, v.MARITAL_STATUSES, "Marital status")
        v.validate_select(self.bloodGroup, v.BLOOD_GROUPS, "Blood group")
        v.validate_number_range(self.height, "Height", 100, 250)
        v.validate_number_range(self.weight, "Weight", 30, 200)
        v.validate_text_field(self.religionCaste, "Religion & caste", 2, 100)

        for prefix, label in (
            ("perm", "Permanent"),
        ):
            v.validate_text_field(getattr(self, f"{prefix}HouseName"), f"{label} house name", 2, 200)
            v.validate_text_field(getattr(self, f"{prefix}PostOffice"), f"{label} post office", 2, 100)
            v.validate_text_field(getattr(self, f"{prefix}Landmark"), f"{label} landmark", 2, 100)
            v.validate_text_field(getattr(self, f"{prefix}District"), f"{label} district", 2, 100)
            v.validate_pin_code(getattr(self, f"{prefix}PinCode"), f"{label} PIN code")

        if not self.sameAsPermanent:
            for prefix, label in (("pres", "Present"),):
                v.validate_text_field(getattr(self, f"{prefix}HouseName"), f"{label} house name", 2, 200)
                v.validate_text_field(getattr(self, f"{prefix}PostOffice"), f"{label} post office", 2, 100)
                v.validate_text_field(getattr(self, f"{prefix}Landmark"), f"{label} landmark", 2, 100)
                v.validate_text_field(getattr(self, f"{prefix}District"), f"{label} district", 2, 100)
                v.validate_pin_code(getattr(self, f"{prefix}PinCode"), f"{label} PIN code")

        v.validate_aadhaar(self.aadhaarNumber)
        v.validate_pan(self.panNumber)
        v.validate_driving_license(self.drivingLicenseNumber)
        v.validate_passport(self.passportNumber)

        v.validate_text_field(self.class10School, "10th school name", 2, 150)
        v.validate_text_field(self.class10Board, "10th board", 2, 100)
        v.validate_percentage(self.class10Percentage, "10th percentage")
        v.validate_passing_year(self.class10PassingYear, "10th passing year")
        v.validate_select(self.class10Mode, v.STUDY_MODES, "10th mode of study")

        v.validate_text_field(self.class12School, "12th school name", 2, 150)
        v.validate_text_field(self.class12Stream, "12th stream", 2, 100)
        v.validate_percentage(self.class12Percentage, "12th percentage")
        v.validate_passing_year(self.class12PassingYear, "12th passing year")
        v.validate_select(self.class12Mode, v.STUDY_MODES, "12th mode of study")

        if self.gradCourse.strip() or self.gradCollege.strip() or self.gradPercentage.strip() or self.gradPassingYear.strip():
            v.validate_text_field(self.gradCourse, "Graduation course", 2, 100)
            v.validate_text_field(self.gradCollege, "Graduation college", 2, 100)
            v.validate_percentage(self.gradPercentage, "Graduation percentage")
            current_year = datetime.now(timezone.utc).year
            v.validate_passing_year(self.gradPassingYear, "Graduation passing year", max_year=current_year + 4)

        if self.postGradCourse.strip() or self.postGradCollege.strip() or self.postGradPercentage.strip() or self.postGradPassingYear.strip():
            v.validate_text_field(self.postGradCourse, "Post graduation course", 2, 100)
            v.validate_text_field(self.postGradCollege, "Post graduation college", 2, 100)
            v.validate_percentage(self.postGradPercentage, "Post graduation percentage")
            current_year = datetime.now(timezone.utc).year
            v.validate_passing_year(self.postGradPassingYear, "Post graduation passing year", max_year=current_year + 4)

        v.validate_text_field(self.languagesRead, "Languages to read", 2, 200)
        v.validate_text_field(self.languagesWrite, "Languages to write", 2, 200)
        v.validate_text_field(self.languagesSpeak, "Languages to speak", 2, 200)

        v.validate_salary(self.expectedSalary)

        if self.previousExperience:
            v.validate_experience_text(self.totalExperience)
            v.validate_text_field(self.prevCompanyName, "Previous company name", 2, 150)
            v.validate_text_field(self.prevPosition, "Previous position", 2, 100)
        else:
            if not self.totalExperience.strip():
                self.totalExperience = "Fresher"

        v.validate_select(self.sourceOfOpening, v.OPENING_SOURCES, "Source of opening")
        if self.sourceOfOpening == "Employee Referral" or self.referredBy.strip():
            v.validate_text_field(self.referredBy, "Referred by", 2, 100)

        v.validate_text_field(self.preferredRegion, "Preferred region", 2, 100)
        v.validate_future_date(self.expectedJoiningDate, "Expected joining date")

        if self.hasReference:
            v.validate_select(self.refRole, v.REF_ROLES, "Reference role")
            v.validate_text_field(self.refName, "Reference name", 2, 100)
            v.validate_text_field(self.refPanchayat, "Reference panchayat / location", 2, 100)
            v.validate_phone(self.refContactNumber, "Reference contact number")

        return self


class PostFormApplicationData(BaseModel):
    model_config = ConfigDict(extra="ignore")

    languagesWrite: str = ""
    languagesSpeak: str = ""
    languagesOther: str = ""
    drive2Wheeler: bool = False
    drive3Wheeler: bool = False
    drive4Wheeler: bool = False
    driveHeavy: bool = False

    gradMode: str = ""
    postGradMode: str = ""

    compWord: bool = False
    compExcel: bool = False
    compPowerPoint: bool = False
    compTally: bool = False
    compOther: bool = False
    softwareCerts: str = ""

    fatherName: str = ""
    fatherAge: str = ""
    fatherOccupation: str = ""
    fatherCompany: str = ""
    fatherPhone: str = ""

    motherName: str = ""
    motherAge: str = ""
    motherOccupation: str = ""
    motherCompany: str = ""
    motherPhone: str = ""

    spouseName: str = ""
    spouseAge: str = ""
    spouseOccupation: str = ""
    spouseCompany: str = ""
    spousePhone: str = ""

    child1Relation: str = ""
    child1Name: str = ""
    child1Age: str = ""
    child1Occupation: str = ""
    child1Company: str = ""
    child1Phone: str = ""

    child2Relation: str = ""
    child2Name: str = ""
    child2Age: str = ""
    child2Occupation: str = ""
    child2Company: str = ""
    child2Phone: str = ""

    child3Relation: str = ""
    child3Name: str = ""
    child3Age: str = ""
    child3Occupation: str = ""
    child3Company: str = ""
    child3Phone: str = ""

    sibling1Relation: str = ""
    sibling1Name: str = ""
    sibling1Age: str = ""
    sibling1Occupation: str = ""
    sibling1Company: str = ""
    sibling1Phone: str = ""

    sibling2Relation: str = ""
    sibling2Name: str = ""
    sibling2Age: str = ""
    sibling2Occupation: str = ""
    sibling2Company: str = ""
    sibling2Phone: str = ""

    sibling3Relation: str = ""
    sibling3Name: str = ""
    sibling3Age: str = ""
    sibling3Occupation: str = ""
    sibling3Company: str = ""
    sibling3Phone: str = ""

    hobbies: str = ""
    achievements: str = ""

    emergency1Relation: str = ""
    emergency1Name: str = ""
    emergency1Address: str = ""
    emergency1Contact: str = ""

    emergency2Relation: str = ""
    emergency2Name: str = ""
    emergency2Address: str = ""
    emergency2Contact: str = ""

    prev1Reporting: str = ""
    prev1From: str = ""
    prev1To: str = ""
    prev1Salary: str = ""
    prev1Reason: str = ""

    prev2Name: str = ""
    prev2Position: str = ""
    prev2Reporting: str = ""
    prev2From: str = ""
    prev2To: str = ""
    prev2Salary: str = ""
    prev2Reason: str = ""

    prev3Name: str = ""
    prev3Position: str = ""
    prev3Reporting: str = ""
    prev3From: str = ""
    prev3To: str = ""
    prev3Salary: str = ""
    prev3Reason: str = ""

    prev4Name: str = ""
    prev4Position: str = ""
    prev4Reporting: str = ""
    prev4From: str = ""
    prev4To: str = ""
    prev4Salary: str = ""
    prev4Reason: str = ""

    facebookUrl: str = ""
    instagramUrl: str = ""
    twitterUrl: str = ""


class CandidateProfileRawDataUpdate(BaseModel):
    raw_data: dict

class CandidateProfileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    candidate_id: UUID
    version: int
    current_location: str | None
    experience_level: str | None
    total_experience: str | None
    current_company: str | None
    expected_salary: str | None
    joining_date: str | None
    email: str | None
    resume_url: str | None
    photo_url: str | None = None
    raw_data: dict | None = None
    created_at: datetime
    updated_at: datetime

class CandidateScreeningCreate(BaseModel):
    status: ScreeningStatus
    call_completed: bool = False
    interest_confirmed: bool = False
    salary_discussed: bool = False
    notice_period_discussed: bool = False
    basic_eligibility_checked: bool = False
    remarks: str | None = None
    pending_reason: str | None = None
    follow_up_date: datetime | None = None
    visit_branch: str | None = None
    branch_visit_date: datetime | None = None
    maps_link: str | None = None
    extra_instructions: str | None = None

    @model_validator(mode="after")
    def check_pending_fields(self) -> "CandidateScreeningCreate":
        from datetime import date

        if self.status == ScreeningStatus.PENDING:
            if not self.pending_reason or not self.pending_reason.strip():
                self.pending_reason = "No reason provided"
            if self.follow_up_date is None:
                from datetime import datetime, timezone
                self.follow_up_date = datetime.now(timezone.utc)

        if self.remarks and len(self.remarks) > 2000:
            raise ValueError("Remarks must be at most 2000 characters.")
        return self

class CandidateScreeningOut(CandidateScreeningCreate):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    candidate_id: UUID
    created_at: datetime
    updated_at: datetime

    @model_validator(mode="after")
    def check_pending_fields(self) -> "CandidateScreeningOut":
        # Skip strict validation on read — existing DB records may lack pending_reason/follow_up_date
        return self


class CandidateOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    candidate_id: str
    full_name: str
    phone: str
    email: str | None
    source: str
    source_reference: str | None
    position_applied_for: str
    department: str | None = None
    share_url: str | None = None
    pre_form_status: FormStatus
    pre_form_sent_at: datetime | None
    pre_form_submitted_at: datetime | None
    pre_form_token: str | None = None
    current_stage: PipelineStage
    branch_location: str | None
    visit_branch: str | None = None
    visit_date: datetime | None = None
    visit_time: str | None = None
    visit_maps_link: str | None = None
    visit_instructions: str | None = None
    profile: CandidateProfileOut | None = None
    is_duplicate_flagged: bool
    duplicate_of_candidate_id: UUID | None
    assigned_hr_user_id: UUID | None
    assigned_manager_id: UUID | None
    assigned_gm_id: UUID | None
    offer_status: str | None = None
    salary_data: dict | None = None
    applied_at: datetime
    created_at: datetime
    updated_at: datetime
    has_resume: bool = False
    is_rejoining: bool = False
    screening: "CandidateScreeningOut | None" = None

class CandidateListOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    candidate_id: str
    full_name: str
    phone: str
    email: str | None
    source: str
    source_reference: str | None
    position_applied_for: str
    department: str | None = None
    share_url: str | None = None
    pre_form_status: FormStatus
    pre_form_sent_at: datetime | None
    pre_form_submitted_at: datetime | None
    pre_form_token: str | None = None
    current_stage: PipelineStage
    branch_location: str | None
    visit_branch: str | None = None
    visit_date: datetime | None = None
    visit_time: str | None = None
    visit_maps_link: str | None = None
    visit_instructions: str | None = None
    is_duplicate_flagged: bool
    duplicate_of_candidate_id: UUID | None
    assigned_hr_user_id: UUID | None
    assigned_manager_id: UUID | None
    assigned_gm_id: UUID | None
    offer_status: str | None = None
    applied_at: datetime
    created_at: datetime
    updated_at: datetime
    has_resume: bool = False
    is_rejoining: bool = False


class StageChange(BaseModel):
    to_stage: PipelineStage
    remarks: str | None = None

    @model_validator(mode="after")
    def check_reject_remarks(self) -> "StageChange":
        if self.to_stage == PipelineStage.REJECTED:
            v.validate_reject_remarks(self.remarks)
        return self


class VisitScheduleUpdate(BaseModel):
    visit_branch: str | None = None
    visit_date: datetime | None = None
    visit_time: str | None = None
    visit_maps_link: str | None = None
    visit_instructions: str | None = None


class StageHistoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    candidate_id: UUID
    from_stage: PipelineStage | None
    to_stage: PipelineStage
    changed_by_user_id: UUID
    reason: str | None
    created_at: datetime


class DocumentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    candidate_id: UUID
    doc_type: DocumentType
    file_name: str
    content_type: str
    file_size_bytes: int
    uploaded_by_user_id: UUID | None
    created_at: datetime
    download_url: str




class ScreeningSubmitResponse(BaseModel):
    screening: CandidateScreeningOut
    candidate: CandidateOut | None = None

class ActivityLogOut(BaseModel):
    id: UUID
    candidate_id: UUID
    activity_type: ActivityType
    title: str
    description: str
    created_by_user_id: UUID | None
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class CandidatePortalEvaluationOut(BaseModel):
    id: UUID
    type: str
    status: str
    scheduled_time: datetime | None
    location_or_link: str | None
    candidate_response: str | None
    interview_mode: str | None

class CandidatePortalOut(BaseModel):
    id: UUID
    full_name: str
    position_applied_for: str
    phone: str
    email: str | None = None
    branch_location: str | None = None
    photo_url: str | None = None
    current_stage: PipelineStage
    offer_status: str | None
    evaluations: list[CandidatePortalEvaluationOut]

class CandidatePortalResponseIn(BaseModel):
    action_type: str # "INTERVIEW_CONFIRM", "INTERVIEW_DECLINE", "OFFER_ACCEPT", "OFFER_DECLINE"
    evaluation_id: UUID | None = None

class ActivityLogCreate(BaseModel):
    activity_type: ActivityType
    title: str
    description: str


class WhatsAppInviteCreate(BaseModel):
    variables: dict[str, str]
