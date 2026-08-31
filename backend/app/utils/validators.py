"""Shared field validators for Indian recruitment forms."""

import re
from datetime import date, datetime, timezone

PHONE_RE = re.compile(r"^[6-9]\d{9}$")
PIN_RE = re.compile(r"^[1-9]\d{5}$")
AADHAAR_RE = re.compile(r"^\d{12}$")
PAN_RE = re.compile(r"^[A-Z]{5}\d{4}[A-Z]$")
PASSPORT_RE = re.compile(r"^[A-Z]\d{7}$")
DL_RE = re.compile(r"^[A-Z0-9]{8,20}$", re.IGNORECASE)
EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]{2,}$")
FULL_NAME_RE = re.compile(r"^[a-zA-Z\s.'-]{2,100}$")

SOURCES = {"WALK_IN", "INDEED", "REFERRAL", "CAMPUS", "OTHER"}
GENDERS = {"Male", "Female", "Other"}
MARITAL_STATUSES = {"Single", "Married", "Divorced", "Widowed"}
BLOOD_GROUPS = {"A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"}
STUDY_MODES = {"Regular", "Distance"}
OPENING_SOURCES = {"Advertisement", "Agency", "Employee Referral", "Walk-in", "Social Media"}
# Local representatives are the current form options. The legacy relationship
# values remain valid so older applications can still be edited and submitted.
REF_ROLES = {
    "Ward Member",
    "Panchayat Member",
    "Municipality Councillor",
    "Corporation Councillor",
    "Manager",
    "Colleague",
    "Professor",
    "Relative",
    "Other",
}

MIN_AGE = 18
MAX_AGE = 65
MIN_YEAR = 1970


def digits_only(value: str) -> str:
    return re.sub(r"\D", "", value or "")


def alnum_only(value: str) -> str:
    return re.sub(r"[^a-zA-Z0-9]", "", value or "").upper()


def require_non_empty(value: str, label: str) -> str:
    if not (value or "").strip():
        raise ValueError(f"{label} is required.")
    return value.strip()


def validate_full_name(value: str, label: str = "Full name") -> str:
    trimmed = require_non_empty(value, label)
    if not FULL_NAME_RE.match(trimmed):
        raise ValueError(f"{label} must be 2-100 letters (spaces, dots, hyphens allowed).")
    return trimmed


def validate_phone(value: str, label: str = "Phone number") -> str:
    digits = digits_only(value)
    if not digits:
        raise ValueError(f"{label} is required.")
    if not PHONE_RE.match(digits):
        raise ValueError(f"{label} must be a 10-digit Indian mobile number (starts with 6-9).")
    return digits


def validate_email(value: str | None, required: bool = False, label: str = "Email") -> str | None:
    if value is None or not value.strip():
        if required:
            raise ValueError(f"{label} is required.")
        return None
    trimmed = value.strip()
    if not EMAIL_RE.match(trimmed):
        raise ValueError(f"{label} must be a valid email address.")
    return trimmed


def validate_pin_code(value: str, label: str = "PIN code") -> str:
    digits = digits_only(value)
    if not digits:
        raise ValueError(f"{label} is required.")
    if not PIN_RE.match(digits):
        raise ValueError(f"{label} must be a valid 6-digit PIN (first digit 1-9).")
    return digits


def validate_aadhaar(value: str, label: str = "Aadhaar number") -> str:
    digits = digits_only(value)
    if not digits:
        raise ValueError(f"{label} is required.")
    if not AADHAAR_RE.match(digits):
        raise ValueError(f"{label} must be exactly 12 digits.")
    return digits


def validate_pan(value: str, label: str = "PAN number") -> str:
    normalized = alnum_only(value)[:10]
    if not normalized:
        raise ValueError(f"{label} is required.")
    if not PAN_RE.match(normalized):
        raise ValueError(f"{label} must match format ABCDE1234F.")
    return normalized


def validate_passport(value: str | None, label: str = "Passport number") -> str | None:
    if not value or not value.strip():
        return None
    normalized = alnum_only(value)[:8]
    if not PASSPORT_RE.match(normalized):
        raise ValueError(f"{label} must match Indian format: 1 letter + 7 digits.")
    return normalized


def validate_driving_license(value: str, label: str = "Driving license number") -> str:
    normalized = alnum_only(value)[:20]
    if not normalized:
        raise ValueError(f"{label} is required.")
    if not DL_RE.match(normalized):
        raise ValueError(f"{label} must be 8-20 letters and digits.")
    return normalized


def validate_select(value: str, options: set[str], label: str) -> str:
    trimmed = require_non_empty(value, label)
    if trimmed not in options:
        raise ValueError(f"{label} must be a valid option.")
    return trimmed


def validate_text_field(value: str, label: str, min_len: int, max_len: int) -> str:
    trimmed = require_non_empty(value, label)
    if len(trimmed) < min_len:
        raise ValueError(f"{label} must be at least {min_len} characters.")
    if len(trimmed) > max_len:
        raise ValueError(f"{label} must be at most {max_len} characters.")
    return trimmed


def _age_from_dob(dob: date) -> int:
    today = date.today()
    age = today.year - dob.year
    if (today.month, today.day) < (dob.month, dob.day):
        age -= 1
    return age


def validate_dob(value: str, age_value: str | None = None) -> date:
    if not value:
        raise ValueError("Date of birth is required.")
    try:
        dob = date.fromisoformat(value)
    except ValueError as exc:
        raise ValueError("Date of birth is invalid.") from exc
    age = _age_from_dob(dob)
    if age < MIN_AGE or age > MAX_AGE:
        raise ValueError(f"Age must be between {MIN_AGE} and {MAX_AGE} years.")
    if age_value and age_value.strip():
        try:
            entered = int(age_value.strip())
        except ValueError as exc:
            raise ValueError("Age must be a number.") from exc
        if entered != age:
            raise ValueError(f"Age must match date of birth ({age} years).")
    return dob


def validate_number_range(value: str, label: str, min_val: float, max_val: float) -> float:
    if not (value or "").strip():
        raise ValueError(f"{label} is required.")
    try:
        num = float(value.strip())
    except ValueError as exc:
        raise ValueError(f"{label} must be a number.") from exc
    if num < min_val or num > max_val:
        raise ValueError(f"{label} must be between {min_val} and {max_val}.")
    return num


def validate_percentage(value: str, label: str, required: bool = True) -> float | None:
    if not (value or "").strip():
        if required:
            raise ValueError(f"{label} is required.")
        return None
    try:
        num = float(value.strip())
    except ValueError as exc:
        raise ValueError(f"{label} must be a number.") from exc
    if num < 0 or num > 100:
        raise ValueError(f"{label} must be between 0 and 100.")
    return num


def validate_passing_year(value: str, label: str, required: bool = True, max_year: int | None = None) -> int | None:
    if not (value or "").strip():
        if required:
            raise ValueError(f"{label} is required.")
        return None
    raw = value.strip()
    if not re.fullmatch(r"\d{4}", raw):
        raise ValueError(f"{label} must be a 4-digit year.")
    year = int(raw)
    current = datetime.now(timezone.utc).year
    limit = max_year if max_year is not None else current
    if year < MIN_YEAR or year > limit:
        raise ValueError(f"{label} must be between {MIN_YEAR} and {limit}.")
    return year


def validate_salary(value: str, label: str = "Expected salary") -> str:
    digits = digits_only(value)
    if not digits:
        raise ValueError(f"{label} is required.")
    amount = int(digits)
    if amount < 5000 or amount > 99_999_999:
        raise ValueError(f"{label} must be between 5000 and 99999999.")
    return digits


def validate_experience_text(value: str, label: str = "Total experience") -> str:
    trimmed = require_non_empty(value, label)
    if len(trimmed) < 2 or len(trimmed) > 50:
        raise ValueError(f'{label} must be 2-50 characters (e.g. "2 Years 3 Months" or "Fresher").')
    return trimmed


def validate_future_date(value: str, label: str, max_days_ahead: int = 365) -> date:
    if not value:
        raise ValueError(f"{label} is required.")
    try:
        target = date.fromisoformat(value)
    except ValueError as exc:
        raise ValueError(f"{label} is invalid.") from exc
    today = date.today()
    if target < today:
        raise ValueError(f"{label} cannot be in the past.")
    max_date = today.toordinal() + max_days_ahead
    if target.toordinal() > max_date:
        raise ValueError(f"{label} must be within {max_days_ahead} days from today.")
    return target


def validate_reject_remarks(value: str | None) -> str:
    trimmed = (value or "").strip()
    if not trimmed:
        raise ValueError("Rejection remarks are required.")
    if len(trimmed) < 10:
        raise ValueError("Rejection remarks must be at least 10 characters.")
    return trimmed
