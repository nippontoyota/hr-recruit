"""Build candidate exports (CSV and styled Excel workbook) matching the 37-column company specification."""

from __future__ import annotations

import csv
from datetime import date, datetime
from io import BytesIO, StringIO
import re
from typing import Any, Iterable, Iterator
from zoneinfo import ZoneInfo

from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter

from app.models.candidate import Candidate
from app.utils.date_format import format_date_dmy

_IST = ZoneInfo("Asia/Kolkata")

# Exact 37 headers requested
EXPORT_HEADERS_37: list[str] = [
    "SL No",
    "Name",
    "Branch ",
    "Department",
    "Designation",
    " Level",
    "Basic + DA ",
    "HRA",
    "Travel",
    "Hostel",
    "Children Education ",
    "Conveyance",
    "Mobile",
    "Branch Allowance",
    "Total Salary",
    "Incentive",
    "Blood Group",
    "Contact No;",
    "Fathers/ Mother Contact No ",
    "House Name ",
    "Post office",
    "Landmark ",
    "District",
    "Pincode",
    "Father's Name",
    "Mothers Name",
    "Date Of Birth ",
    "Total Experience",
    "Name of Previour Employer-1",
    "Name of Previour Employer-2",
    "Name of Previour Employer-3",
    "Educational Qualification",
    "Technical Qualification",
    "Marital Status",
    "Email ID:",
    "SPOUSE NAME",
    "Religion",
]

# Legacy compatibility aliases
EXPORT_COLUMNS = tuple((h, h) for h in EXPORT_HEADERS_37)
CSV_COLUMNS = EXPORT_COLUMNS

_NUMERIC_SALARY_COL_INDICES = {7, 8, 9, 10, 11, 12, 13, 14, 15, 16}  # 1-based indices in EXPORT_HEADERS_37
_CENTER_COL_INDICES = {1, 6, 17, 24, 27, 34}  # SL No, Level, Blood Group, Pincode, DOB, Marital Status


def _clean_str(value: Any) -> str:
    if value is None:
        return ""
    text = str(value).strip()
    if text.lower() in ("none", "null", "nan", "-"):
        return ""
    return text


def _find_salary_value(salary: dict | None, *keys: str) -> Any:
    """Find a salary component safely across varied casing, spacing, and underscores."""
    if not salary or not isinstance(salary, dict):
        return ""

    normalized_map: dict[str, Any] = {}
    for k, v in salary.items():
        if v is not None:
            norm_k = re.sub(r"[^a-z0-9]+", "", str(k).lower())
            if norm_k and norm_k not in normalized_map:
                normalized_map[norm_k] = v
            normalized_map[str(k).strip().lower()] = v

    for target in keys:
        norm_target = re.sub(r"[^a-z0-9]+", "", str(target).lower())
        if norm_target in normalized_map:
            val = normalized_map[norm_target]
            return val if val is not None else ""
        low_target = str(target).strip().lower()
        if low_target in normalized_map:
            val = normalized_map[low_target]
            return val if val is not None else ""
    return ""


def _find_family_phone(raw: dict) -> str:
    """Look up parent phone from raw fields or familyMembers array."""
    direct = _clean_str(raw.get("fatherPhone") or raw.get("motherPhone"))
    if direct:
        return direct

    family = raw.get("familyMembers")
    if isinstance(family, list):
        for member in family:
            if isinstance(member, dict):
                rel = str(member.get("relation") or member.get("rel") or "").lower()
                ph = _clean_str(member.get("phone") or member.get("ph"))
                if ph and any(p in rel for p in ("father", "mother", "parent")):
                    return ph

    emergency = _clean_str(raw.get("emergency1Contact") or raw.get("emergency2Contact"))
    return emergency


def _find_family_name(raw: dict, target_relation: str) -> str:
    """Look up father/mother/spouse name from top-level raw fields or familyMembers."""
    if target_relation == "father":
        direct = _clean_str(raw.get("fatherName"))
        if direct:
            return direct
        keywords = ("father",)
    elif target_relation == "mother":
        direct = _clean_str(raw.get("motherName"))
        if direct:
            return direct
        keywords = ("mother",)
    elif target_relation == "spouse":
        direct = _clean_str(raw.get("spouseName"))
        if direct:
            return direct
        keywords = ("spouse", "husband", "wife")
    else:
        keywords = (target_relation,)

    family = raw.get("familyMembers")
    if isinstance(family, list):
        for member in family:
            if isinstance(member, dict):
                rel = str(member.get("relation") or member.get("rel") or "").lower()
                name = _clean_str(member.get("name"))
                if name and any(k in rel for k in keywords):
                    return name
    return ""


def _get_previous_employer(raw: dict, index: int) -> str:
    """Extract previous employer name from previousJobs list or legacy slot fields."""
    jobs = raw.get("previousJobs")
    if isinstance(jobs, list) and len(jobs) > index:
        job = jobs[index]
        if isinstance(job, dict):
            company = _clean_str(job.get("company") or job.get("co"))
            if company:
                return company

    fallbacks = [
        raw.get("prevCompanyName") or raw.get("prev1Name"),
        raw.get("prev2Name"),
        raw.get("prev3Name"),
    ]
    if index < len(fallbacks):
        return _clean_str(fallbacks[index])
    return ""


def _get_educational_qualification(raw: dict, candidate: Candidate) -> str:
    """Derive highest educational qualification."""
    if raw.get("postGradCourse"):
        parts = [_clean_str(raw.get("postGradCourse")), _clean_str(raw.get("postGradStream"))]
        return " - ".join(p for p in parts if p)
    if raw.get("gradCourse"):
        parts = [_clean_str(raw.get("gradCourse")), _clean_str(raw.get("gradStream"))]
        return " - ".join(p for p in parts if p)
    if raw.get("class12Stream") or raw.get("class12School"):
        stream = _clean_str(raw.get("class12Stream"))
        return f"12th - {stream}" if stream else "12th / Plus Two"
    if raw.get("class10School") or raw.get("class10Board"):
        board = _clean_str(raw.get("class10Board"))
        return f"10th - {board}" if board else "10th / SSLC"

    prof = getattr(candidate, "profile", None)
    return _clean_str(
        raw.get("educationHighest")
        or raw.get("highestQualification")
        or raw.get("educationalQualification")
        or raw.get("qualification")
        or getattr(prof, "education_level", None)
    )


def _get_technical_qualification(raw: dict) -> str:
    """Derive technical certifications and computer skills."""
    software = _clean_str(raw.get("softwareCerts"))
    skills: list[str] = []
    if raw.get("compWord"):
        skills.append("MS Word")
    if raw.get("compExcel"):
        skills.append("MS Excel")
    if raw.get("compPowerPoint"):
        skills.append("PowerPoint")
    if raw.get("compTally"):
        skills.append("Tally")
    if raw.get("compOther"):
        skills.append("Other")

    tech = _clean_str(raw.get("technicalQualification"))
    parts: list[str] = []
    if software:
        parts.append(software)
    if skills:
        parts.append(", ".join(skills))
    if tech and tech not in (software, parts):
        parts.append(tech)

    return "; ".join(parts)


def _format_date_val(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, datetime):
        return format_date_dmy(value.astimezone(_IST) if value.tzinfo else value)
    if isinstance(value, date):
        return format_date_dmy(value)
    text = str(value).strip()
    # If ISO date YYYY-MM-DD
    if len(text) == 10 and text[4] == "-" and text[7] == "-":
        try:
            d = datetime.strptime(text, "%Y-%m-%d").date()
            return format_date_dmy(d)
        except ValueError:
            pass
    return text


def extract_candidate_row(candidate: Candidate, sl_no: int) -> list[Any]:
    """Map candidate, profile.raw_data, and salary_data into the exact 37-column specification."""
    prof = getattr(candidate, "profile", None)
    raw = (prof.raw_data or {}) if prof and isinstance(prof.raw_data, dict) else {}
    salary = candidate.salary_data if isinstance(candidate.salary_data, dict) else {}

    # 1. SL No
    col_1_sl_no = sl_no

    # 2. Name
    col_2_name = _clean_str(candidate.full_name or raw.get("fullName"))

    # 3. Branch 
    col_3_branch = _clean_str(candidate.branch_location or salary.get("branch") or raw.get("branchName"))

    # 4. Department
    col_4_dept = _clean_str(candidate.department or salary.get("department") or raw.get("department"))

    # 5. Designation
    col_5_designation = _clean_str(
        salary.get("designation") or candidate.position_applied_for or raw.get("positionAppliedFor")
    )

    # 6.  Level
    col_6_level = _clean_str(salary.get("level") or salary.get("grade"))

    # 7. Basic + DA 
    col_7_basic_da = _find_salary_value(
        salary, "basic da", "basic + da", "basic_da", "basic", "Basic + DA", "Basic + DA "
    )

    # 8. HRA
    col_8_hra = _find_salary_value(salary, "hra", "HRA", "hra allowance")

    # 9. Travel
    col_9_travel = _find_salary_value(salary, "travel", "travel allowance", "Travel", "travel_allowance")

    # 10. Hostel
    col_10_hostel = _find_salary_value(salary, "hostel", "hostel allowance", "Hostel", "hostel_allowance")

    # 11. Children Education 
    col_11_children_edu = _find_salary_value(
        salary, "children education", "children_education", "Children Education", "children education allowance"
    )

    # 12. Conveyance
    col_12_conveyance = _find_salary_value(
        salary,
        "conveyance",
        "conveyance allowance",
        "Conveyance",
        "conveyance_allowance",
        "Conveyance/Performance Allowance",
        "conveyance/performance allowance",
        "conveyance performance allowance",
        "conveyance_performance_allowance",
    )
    if col_12_conveyance is None or col_12_conveyance == "":
        for k, v in salary.items():
            if "conveyance" in str(k).lower() and v is not None and str(v).strip() != "":
                col_12_conveyance = _parse_number_or_str(v)
                break

    # 13. Mobile
    col_13_mobile = _find_salary_value(salary, "mobile", "mobile allowance", "Mobile", "mobile_allowance")

    # 14. Branch Allowance
    col_14_branch_allowance = _find_salary_value(
        salary, "branch allowance", "branch_allowance", "Branch Allowance"
    )

    # 15. Total Salary
    col_15_total_salary = _find_salary_value(
        salary, "total salary", "total_salary", "Total Salary", "gross salary", "gross_salary", "Gross Salary"
    )

    # 16. Incentive
    col_16_incentive = _find_salary_value(
        salary, "incentive", "Incentive", "fixed incentive", "total incentive", "others"
    )

    # 17. Blood Group
    col_17_blood_group = _clean_str(raw.get("bloodGroup"))

    # 18. Contact No;
    col_18_contact = _clean_str(candidate.phone or raw.get("mobileNumber") or raw.get("contactNumber"))

    # 19. Fathers/ Mother Contact No 
    col_19_parent_contact = _find_family_phone(raw)

    # 20. House Name 
    col_20_house_name = _clean_str(raw.get("permHouseName") or raw.get("presHouseName") or raw.get("houseName"))

    # 21. Post office
    col_21_post_office = _clean_str(raw.get("permPostOffice") or raw.get("presPostOffice") or raw.get("postOffice"))

    # 22. Landmark 
    col_22_landmark = _clean_str(raw.get("permLandmark") or raw.get("presLandmark") or raw.get("landmark"))

    # 23. District
    col_23_district = _clean_str(raw.get("permDistrict") or raw.get("presDistrict") or raw.get("district"))

    # 24. Pincode
    col_24_pincode = _clean_str(raw.get("permPinCode") or raw.get("presPinCode") or raw.get("pinCode") or raw.get("pincode"))

    # 25. Father's Name
    col_25_father_name = _find_family_name(raw, "father")

    # 26. Mothers Name
    col_26_mother_name = _find_family_name(raw, "mother")

    # 27. Date Of Birth 
    col_27_dob = _format_date_val(raw.get("dateOfBirth") or raw.get("dob"))

    # 28. Total Experience
    col_28_experience = _clean_str(raw.get("totalExperience") or getattr(prof, "total_experience", None) or candidate.experience)

    # 29. Name of Previour Employer-1
    col_29_prev_emp_1 = _get_previous_employer(raw, 0)

    # 30. Name of Previour Employer-2
    col_30_prev_emp_2 = _get_previous_employer(raw, 1)

    # 31. Name of Previour Employer-3
    col_31_prev_emp_3 = _get_previous_employer(raw, 2)

    # 32. Educational Qualification
    col_32_education = _get_educational_qualification(raw, candidate)

    # 33. Technical Qualification
    col_33_technical = _get_technical_qualification(raw)

    # 34. Marital Status
    col_34_marital = _clean_str(raw.get("maritalStatus"))

    # 35. Email ID:
    col_35_email = _clean_str(candidate.email or getattr(prof, "email", None) or raw.get("emailId"))

    # 36. SPOUSE NAME
    col_36_spouse = _find_family_name(raw, "spouse")

    # 37. Religion
    col_37_religion = _clean_str(raw.get("religionCaste") or raw.get("religion"))

    return [
        col_1_sl_no,
        col_2_name,
        col_3_branch,
        col_4_dept,
        col_5_designation,
        col_6_level,
        col_7_basic_da,
        col_8_hra,
        col_9_travel,
        col_10_hostel,
        col_11_children_edu,
        col_12_conveyance,
        col_13_mobile,
        col_14_branch_allowance,
        col_15_total_salary,
        col_16_incentive,
        col_17_blood_group,
        col_18_contact,
        col_19_parent_contact,
        col_20_house_name,
        col_21_post_office,
        col_22_landmark,
        col_23_district,
        col_24_pincode,
        col_25_father_name,
        col_26_mother_name,
        col_27_dob,
        col_28_experience,
        col_29_prev_emp_1,
        col_30_prev_emp_2,
        col_31_prev_emp_3,
        col_32_education,
        col_33_technical,
        col_34_marital,
        col_35_email,
        col_36_spouse,
        col_37_religion,
    ]


def _csv_cell_format(val: Any) -> str:
    if val is None:
        return ""
    if isinstance(val, (datetime, date)):
        return _format_date_val(val)
    return str(val)


def iter_candidates_csv(candidates: Iterable[Candidate]) -> Iterator[str]:
    """Stream candidates in the 37-column CSV format."""
    buffer = StringIO()
    writer = csv.writer(buffer)
    writer.writerow(EXPORT_HEADERS_37)
    yield buffer.getvalue()

    for sl_no, candidate in enumerate(candidates, start=1):
        buffer.seek(0)
        buffer.truncate(0)
        row = extract_candidate_row(candidate, sl_no)
        writer.writerow([_csv_cell_format(v) for v in row])
        yield buffer.getvalue()


def _excel_cell_sanitize(value: Any) -> Any:
    """Format and protect Excel values against formula injection."""
    if value is None:
        return ""
    if isinstance(value, datetime):
        return value.replace(tzinfo=None)
    if isinstance(value, date):
        return value
    if isinstance(value, (int, float)):
        return value
    text = str(value).strip()
    if text[:1] in ("=", "+", "-", "@"):
        return f"'{text}"
    return text


def build_candidates_workbook(candidates: Iterable[Candidate]) -> BytesIO:
    """Build a beautifully styled, readable Excel workbook matching the 37 columns."""
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "Candidates"
    sheet.views.sheetView[0].showGridLines = True
    sheet.freeze_panes = "A2"
    sheet.auto_filter.ref = f"A1:{get_column_letter(len(EXPORT_HEADERS_37))}1"

    # Header styling: Corporate Deep Navy (#1E3A5F) with bold white text
    header_fill = PatternFill(start_color="1E3A5F", end_color="1E3A5F", fill_type="solid")
    header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    header_border = Border(
        left=Side(style="thin", color="CBD5E1"),
        right=Side(style="thin", color="CBD5E1"),
        top=Side(style="thin", color="CBD5E1"),
        bottom=Side(style="thin", color="CBD5E1"),
    )
    sheet.row_dimensions[1].height = 28

    for column_index, heading in enumerate(EXPORT_HEADERS_37, start=1):
        cell = sheet.cell(row=1, column=column_index, value=heading)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        cell.border = header_border

    # Data row styling
    stripe_fill = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")
    regular_font = Font(name="Calibri", size=10, color="1E293B")
    cell_border = Border(
        left=Side(style="thin", color="E2E8F0"),
        right=Side(style="thin", color="E2E8F0"),
        top=Side(style="thin", color="E2E8F0"),
        bottom=Side(style="thin", color="E2E8F0"),
    )

    col_max_lengths = [len(h) for h in EXPORT_HEADERS_37]

    for row_index, candidate in enumerate(candidates, start=2):
        sheet.row_dimensions[row_index].height = 22
        is_odd_row = (row_index % 2 == 1)
        row_values = extract_candidate_row(candidate, row_index - 1)

        for col_index, raw_value in enumerate(row_values, start=1):
            val = _excel_cell_sanitize(raw_value)
            cell = sheet.cell(row=row_index, column=col_index, value=val)
            cell.font = regular_font
            cell.border = cell_border

            if is_odd_row:
                cell.fill = stripe_fill

            # Alignment and number formats
            if col_index in _NUMERIC_SALARY_COL_INDICES:
                cell.alignment = Alignment(horizontal="right", vertical="center")
                if isinstance(val, (int, float)):
                    cell.number_format = "#,##0"
            elif col_index in _CENTER_COL_INDICES:
                cell.alignment = Alignment(horizontal="center", vertical="center")
            else:
                cell.alignment = Alignment(horizontal="left", vertical="center")

            # Update max length for auto-width
            val_len = len(str(val or ""))
            if val_len > col_max_lengths[col_index - 1]:
                col_max_lengths[col_index - 1] = val_len

    # Apply auto-fit column dimensions with padding
    for col_index, max_len in enumerate(col_max_lengths, start=1):
        col_letter = get_column_letter(col_index)
        # Allocate width: clamp between 12 and 36
        sheet.column_dimensions[col_letter].width = max(12, min(max_len + 3, 36))

    output = BytesIO()
    workbook.save(output)
    output.seek(0)
    return output
