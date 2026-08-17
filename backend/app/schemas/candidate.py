from datetime import datetime, timezone
from uuid import UUID

from pydantic import AliasChoices, BaseModel, ConfigDict, Field, field_validator, model_validator

from app.models.enums import DocumentType, PipelineStage, FormStatus, ScreeningStatus, ActivityType
from app.core.compat import parse_source_channel
from app.core.positions import DEPARTMENTS, EXPERIENCE_LEVELS
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
    experience: str = "Fresher"
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

    @field_validator("experience")
    @classmethod
    def check_experience(cls, value: str) -> str:
        if value not in EXPERIENCE_LEVELS:
            raise ValueError("Experience must be Fresher or Experienced.")
        return value

    @model_validator(mode="after")
    def check_department(self) -> "CandidateCreate":
        if self.department and self.department not in DEPARTMENTS:
            raise ValueError(f"Department must be one of: {', '.join(DEPARTMENTS)}")
        return self

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


class PreviousJobEntry(BaseModel):
    model_config = ConfigDict(extra="ignore")

    company: str = ""
    position: str = ""
    reporting: str = ""
    fromDate: str = ""
    toDate: str = ""
    salary: str = ""
    reason: str = ""


class PreFormApplicationData(BaseModel):
    """Validated payload for public call-letter / pre-interview application form."""

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
    positionSuitable: str = ""

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

    confidentToDrive: bool
    drive2Wheeler: bool = False
    drive3Wheeler: bool = False
    drive4Wheeler: bool = False
    driveHeavy: bool = False

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
    gradMode: str = ""

    postGradCourse: str = ""
    postGradCollege: str = ""
    postGradPercentage: str = ""
    postGradPassingYear: str = ""
    postGradMode: str = ""

    compWord: bool = False
    compExcel: bool = False
    compPowerPoint: bool = False
    compTally: bool = False
    compOther: bool = False
    softwareCerts: str = ""

    languagesRead: str
    languagesWrite: str
    languagesSpeak: str
    languagesOther: str = ""

    fatherName: str
    fatherAge: str = ""
    fatherOccupation: str = ""
    fatherCompany: str = ""
    fatherPhone: str = ""

    motherName: str
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

    previousExperience: bool = False
    previousJobs: list[PreviousJobEntry] = Field(default_factory=list)
    prevCompanyName: str = ""
    prevPosition: str = ""
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

    achievements: str = ""
    hobbies: str = ""

    prevTerminated: bool = False
    physicalDisability: bool = False
    nervousDisorder: bool = False
    eyeVision: bool = False
    criminalConviction: bool = False
    medicalRemarks: str = ""

    emergency1Relation: str
    emergency1Name: str
    emergency1Address: str
    emergency1Contact: str

    emergency2Relation: str = ""
    emergency2Name: str = ""
    emergency2Address: str = ""
    emergency2Contact: str = ""

    facebookUrl: str = ""
    instagramUrl: str = ""
    twitterUrl: str = ""

    emailId: str
    declarationPlace: str
    declarationDate: str
    declarationName: str

    @staticmethod
    def _any_filled(*values: str) -> bool:
        return any((value or "").strip() for value in values)

    @classmethod
    def _validate_job_row(
        cls,
        *,
        label: str,
        name: str,
        position: str,
        reporting: str,
        from_date: str,
        to_date: str,
        salary: str,
        reason: str,
        required: bool,
    ) -> None:
        filled = cls._any_filled(name, position, reporting, from_date, to_date, salary, reason)
        if not required and not filled:
            return
        v.validate_text_field(name, f"{label} company name", 2, 150)
        v.validate_text_field(position, f"{label} position", 2, 100)
        v.validate_text_field(reporting, f"{label} reporting person", 2, 100)
        v.validate_text_field(from_date, f"{label} from date", 2, 50)
        v.validate_text_field(to_date, f"{label} to date", 2, 50)
        v.validate_salary(salary, f"{label} salary")
        v.validate_text_field(reason, f"{label} reason for leaving", 2, 200)

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

        if not isinstance(self.confidentToDrive, bool):
            raise ValueError("Confident to drive is required.")

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

        if self._any_filled(
            self.gradCourse, self.gradCollege, self.gradPercentage, self.gradPassingYear, self.gradMode
        ):
            v.validate_text_field(self.gradCourse, "Graduation course", 2, 100)
            v.validate_text_field(self.gradCollege, "Graduation college", 2, 100)
            v.validate_percentage(self.gradPercentage, "Graduation percentage")
            current_year = datetime.now(timezone.utc).year
            v.validate_passing_year(self.gradPassingYear, "Graduation passing year", max_year=current_year + 4)
            v.validate_select(self.gradMode, v.STUDY_MODES, "Graduation mode of study")

        if self._any_filled(
            self.postGradCourse,
            self.postGradCollege,
            self.postGradPercentage,
            self.postGradPassingYear,
            self.postGradMode,
        ):
            v.validate_text_field(self.postGradCourse, "Post graduation course", 2, 100)
            v.validate_text_field(self.postGradCollege, "Post graduation college", 2, 100)
            v.validate_percentage(self.postGradPercentage, "Post graduation percentage")
            current_year = datetime.now(timezone.utc).year
            v.validate_passing_year(self.postGradPassingYear, "Post graduation passing year", max_year=current_year + 4)
            v.validate_select(self.postGradMode, v.STUDY_MODES, "Post graduation mode of study")

        v.validate_text_field(self.languagesRead, "Languages to read", 2, 200)
        v.validate_text_field(self.languagesWrite, "Languages to write", 2, 200)
        v.validate_text_field(self.languagesSpeak, "Languages to speak", 2, 200)

        v.validate_text_field(self.fatherName, "Father name", 2, 100)
        v.validate_text_field(self.motherName, "Mother name", 2, 100)
        if self.maritalStatus == "Married":
            v.validate_text_field(self.spouseName, "Spouse name", 2, 100)

        v.validate_salary(self.expectedSalary)

        jobs = list(self.previousJobs)
        if not jobs:
            jobs = [
                PreviousJobEntry(
                    company=self.prevCompanyName,
                    position=self.prevPosition,
                    reporting=self.prev1Reporting,
                    fromDate=self.prev1From,
                    toDate=self.prev1To,
                    salary=self.prev1Salary,
                    reason=self.prev1Reason,
                ),
                PreviousJobEntry(
                    company=self.prev2Name,
                    position=self.prev2Position,
                    reporting=self.prev2Reporting,
                    fromDate=self.prev2From,
                    toDate=self.prev2To,
                    salary=self.prev2Salary,
                    reason=self.prev2Reason,
                ),
                PreviousJobEntry(
                    company=self.prev3Name,
                    position=self.prev3Position,
                    reporting=self.prev3Reporting,
                    fromDate=self.prev3From,
                    toDate=self.prev3To,
                    salary=self.prev3Salary,
                    reason=self.prev3Reason,
                ),
                PreviousJobEntry(
                    company=self.prev4Name,
                    position=self.prev4Position,
                    reporting=self.prev4Reporting,
                    fromDate=self.prev4From,
                    toDate=self.prev4To,
                    salary=self.prev4Salary,
                    reason=self.prev4Reason,
                ),
            ]
            if not self.previousExperience:
                jobs = []
            else:
                while jobs and not self._any_filled(
                    jobs[-1].company,
                    jobs[-1].position,
                    jobs[-1].reporting,
                    jobs[-1].fromDate,
                    jobs[-1].toDate,
                    jobs[-1].salary,
                    jobs[-1].reason,
                ):
                    jobs.pop()

        if self.previousExperience:
            v.validate_experience_text(self.totalExperience)
            if not jobs:
                jobs = [PreviousJobEntry()]
            for idx, job in enumerate(jobs):
                self._validate_job_row(
                    label=f"Previous job {idx + 1}",
                    name=job.company,
                    position=job.position,
                    reporting=job.reporting,
                    from_date=job.fromDate,
                    to_date=job.toDate,
                    salary=job.salary,
                    reason=job.reason,
                    required=idx == 0,
                )
        else:
            if not self.totalExperience.strip():
                self.totalExperience = "Fresher"
            jobs = []

        if len(jobs) > 10:
            raise ValueError("At most 10 previous employers can be added.")

        self.previousJobs = jobs
        empty = PreviousJobEntry()
        first = jobs[0] if len(jobs) > 0 else empty
        second = jobs[1] if len(jobs) > 1 else empty
        third = jobs[2] if len(jobs) > 2 else empty
        fourth = jobs[3] if len(jobs) > 3 else empty
        self.prevCompanyName = first.company
        self.prevPosition = first.position
        self.prev1Reporting = first.reporting
        self.prev1From = first.fromDate
        self.prev1To = first.toDate
        self.prev1Salary = first.salary
        self.prev1Reason = first.reason
        self.prev2Name = second.company
        self.prev2Position = second.position
        self.prev2Reporting = second.reporting
        self.prev2From = second.fromDate
        self.prev2To = second.toDate
        self.prev2Salary = second.salary
        self.prev2Reason = second.reason
        self.prev3Name = third.company
        self.prev3Position = third.position
        self.prev3Reporting = third.reporting
        self.prev3From = third.fromDate
        self.prev3To = third.toDate
        self.prev3Salary = third.salary
        self.prev3Reason = third.reason
        self.prev4Name = fourth.company
        self.prev4Position = fourth.position
        self.prev4Reporting = fourth.reporting
        self.prev4From = fourth.fromDate
        self.prev4To = fourth.toDate
        self.prev4Salary = fourth.salary
        self.prev4Reason = fourth.reason

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

        v.validate_text_field(self.emergency1Relation, "Emergency contact 1 relation", 2, 50)
        v.validate_text_field(self.emergency1Name, "Emergency contact 1 name", 2, 100)
        v.validate_text_field(self.emergency1Address, "Emergency contact 1 address", 2, 200)
        v.validate_phone(self.emergency1Contact, "Emergency contact 1 phone")

        if self._any_filled(
            self.emergency2Relation, self.emergency2Name, self.emergency2Address, self.emergency2Contact
        ):
            v.validate_text_field(self.emergency2Relation, "Emergency contact 2 relation", 2, 50)
            v.validate_text_field(self.emergency2Name, "Emergency contact 2 name", 2, 100)
            v.validate_text_field(self.emergency2Address, "Emergency contact 2 address", 2, 200)
            v.validate_phone(self.emergency2Contact, "Emergency contact 2 phone")

        v.validate_email(self.emailId, required=True, label="Email")
        v.validate_text_field(self.declarationPlace, "Declaration place", 2, 100)
        try:
            datetime.strptime(self.declarationDate.strip(), "%Y-%m-%d")
        except ValueError as exc:
            raise ValueError("Declaration date is invalid.") from exc
        v.validate_text_field(self.declarationName, "Declaration name", 2, 100)

        return self


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


class CandidateWorkState(BaseModel):
    next_action: str
    action_key: str = "NONE"
    responsible_team: str
    blockers: list[str] = Field(default_factory=list)
    days_in_stage: int
    days_since_activity: int | None = None
    queue_keys: list[str] = Field(default_factory=list)


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
    experience: str = "Fresher"
    department: str | None = None
    share_url: str | None = None
    pre_form_status: FormStatus
    pre_form_sent_at: datetime | None
    pre_form_expires_at: datetime | None = None
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
    handed_over_to_ho: bool = False
    offer_blockers: list[str] = []
    screening: "CandidateScreeningOut | None" = None
    work_state: CandidateWorkState | None = None


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
    experience: str = "Fresher"
    department: str | None = None
    share_url: str | None = None
    pre_form_status: FormStatus
    pre_form_sent_at: datetime | None
    pre_form_expires_at: datetime | None = None
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
    handed_over_to_ho: bool = False
    work_state: CandidateWorkState | None = None


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


class CandidateDepartmentUpdate(BaseModel):
    """Mid-process change of what the candidate is being considered for."""

    department: str = Field(..., min_length=1, max_length=255)
    position_applied_for: str | None = Field(None, max_length=255)
    experience: str | None = None
    source: str | None = None
    source_reference: str | None = None

    @field_validator("source")
    @classmethod
    def check_source(cls, value: str | None) -> str | None:
        if value is None:
            return None
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

    @model_validator(mode="after")
    def check_assignment(self) -> "CandidateDepartmentUpdate":
        if self.department not in DEPARTMENTS:
            raise ValueError(f"Department must be one of: {', '.join(DEPARTMENTS)}")
        if self.experience is not None and self.experience not in EXPERIENCE_LEVELS:
            raise ValueError("Experience must be Fresher or Experienced.")
        return self


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

class PublicCandidateOut(BaseModel):
    full_name: str
    phone: str
    email: str | None = None
    source: str
    position_applied_for: str
    experience: str = "Fresher"
    has_resume: bool = False
    token: str | None = None


class PublicFullStatusOut(BaseModel):
    full_name: str
    is_awaiting_full_fill: bool
    pre_form_expires_at: datetime | None = None


class PublicUploadOut(BaseModel):
    status: str = "ok"
    file_name: str | None = None
    photo_url: str | None = None


class CandidatePortalOut(BaseModel):
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


class WhatsAppInviteCreate(BaseModel):
    variables: dict[str, str]


class CandidatePaginatedOut(BaseModel):
    data: list[CandidateListOut]
    total_count: int
    page: int
    limit: int
