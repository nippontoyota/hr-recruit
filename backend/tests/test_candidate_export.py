from datetime import datetime, timezone
from io import BytesIO
from uuid import uuid4

from openpyxl import load_workbook
from fastapi.testclient import TestClient

from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.main import app
from app.models.candidate import Candidate
from app.models.candidate_profile import CandidateProfile
from app.models.enums import PipelineStage, UserRole
from app.models.user import User
from app.services.candidate_export import (
    EXPORT_HEADERS_37,
    build_candidates_workbook,
    extract_candidate_row,
    iter_candidates_csv,
)


client = TestClient(app)


def test_candidate_workbook_contains_roster_fields_and_is_safe_to_open():
    candidate = Candidate(
        id=uuid4(),
        candidate_id="NT-100",
        full_name="=Potential Formula",
        phone="9876543210",
        email="candidate@example.com",
        source="REFERRAL",
        position_applied_for="Sales Executive",
        experience="Fresher",
        current_stage=PipelineStage.SENT_TO_HO,
        branch_location="Kalamassery",
        applied_at=datetime(2026, 8, 31, 9, 42, tzinfo=timezone.utc),
    )

    workbook = load_workbook(build_candidates_workbook([candidate]))
    sheet = workbook["Candidates"]

    assert sheet.max_row == 2
    assert sheet.max_column == 37
    assert sheet.freeze_panes == "A2"
    assert sheet.auto_filter.ref == "A1:AK1"

    # Header styling & values
    assert sheet["A1"].value == "SL No"
    assert sheet["B1"].value == "Name"
    assert sheet["C1"].value == "Branch "
    assert sheet["AK1"].value == "Religion"

    # Cell fill color should be Deep Navy
    assert sheet["A1"].fill.fgColor.rgb == "001E3A5F" or sheet["A1"].fill.start_color.rgb == "001E3A5F"
    assert sheet["A1"].font.color.rgb == "00FFFFFF"
    assert sheet["A1"].font.bold is True

    # Data row 1
    assert sheet["A2"].value == 1
    assert sheet["B2"].value == "'=Potential Formula"
    assert sheet["C2"].value == "Kalamassery"
    assert sheet["E2"].value == "Sales Executive"
    assert sheet["R2"].value == "9876543210"


def test_candidate_export_is_head_office_only():
    local_user = User(
        id=uuid4(),
        email="branch@example.com",
        hashed_password="x",
        full_name="Branch HR",
        role=UserRole.LOCAL_HR,
        is_active=True,
    )
    app.dependency_overrides[get_current_active_user] = lambda: local_user
    try:
        response = client.get("/api/v1/candidates/export.xlsx")
        assert response.status_code == 403
    finally:
        app.dependency_overrides.clear()


def test_candidate_export_returns_a_valid_xlsx_for_head_office():
    ho_user = User(
        id=uuid4(),
        email="ho@example.com",
        hashed_password="x",
        full_name="Head Office HR",
        role=UserRole.HO_HR,
        is_active=True,
    )
    candidate = Candidate(
        id=uuid4(),
        candidate_id="NT-101",
        full_name="Valid Candidate",
        phone="9876543211",
        current_stage=PipelineStage.SENT_TO_HO,
    )

    class Result:
        def all(self):
            return [candidate]

    class FakeDb:
        def scalars(self, _query):
            return Result()

    app.dependency_overrides[get_current_active_user] = lambda: ho_user
    app.dependency_overrides[get_db] = lambda: FakeDb()
    try:
        response = client.get("/api/v1/candidates/export.xlsx")
        assert response.status_code == 200
        assert response.headers["content-type"].startswith(
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
        workbook = load_workbook(BytesIO(response.content))
        sheet = workbook["Candidates"]
        assert sheet["A2"].value == 1
        assert sheet["B2"].value == "Valid Candidate"
        assert sheet["R2"].value == "9876543211"
    finally:
        app.dependency_overrides.clear()


def test_candidate_export_maps_all_37_fields_and_salary_and_raw_data():
    candidate = Candidate(
        id=uuid4(),
        candidate_id="NT-555",
        full_name="Rahul Nair",
        branch_location="Thrissur",
        department="Sales",
        position_applied_for="Sales Officer",
        phone="9876500001",
        email="rahul@example.com",
        experience="3 Years",
        salary_data={
            "level": "Grade 3",
            "basic da": 18000,
            "hra": 6000,
            "travel": 1500,
            "hostel": 2000,
            "children education": 1000,
            "conveyance": 1200,
            "mobile": 800,
            "branch allowance": 2500,
            "total salary": 33000,
            "incentive": 4000,
        },
    )
    candidate.profile = CandidateProfile(
        raw_data={
            "bloodGroup": "B+ve",
            "fatherPhone": "9876500002",
            "permHouseName": "Nair Villa",
            "permPostOffice": "Round North PO",
            "permLandmark": "Opp Museum",
            "permDistrict": "Thrissur",
            "permPinCode": "680020",
            "fatherName": "K. Raman Nair",
            "motherName": "Lakshmi Nair",
            "dateOfBirth": "1994-06-20",
            "totalExperience": "3.5 Years",
            "previousJobs": [
                {"company": "First Auto Ltd"},
                {"company": "Second Motors"},
                {"company": "Third Wheels"},
            ],
            "gradCourse": "B.Tech",
            "gradStream": "Mechanical",
            "compExcel": True,
            "compWord": True,
            "softwareCerts": "AutoCAD",
            "maritalStatus": "Married",
            "spouseName": "Anjana Nair",
            "religionCaste": "Hindu",
        }
    )

    row = extract_candidate_row(candidate, 1)
    assert len(row) == 37
    assert len(EXPORT_HEADERS_37) == 37

    # Check key mapped columns
    assert row[0] == 1  # SL No
    assert row[1] == "Rahul Nair"  # Name
    assert row[2] == "Thrissur"  # Branch 
    assert row[3] == "Sales"  # Department
    assert row[4] == "Sales Officer"  # Designation
    assert row[5] == "Grade 3"  #  Level
    assert row[6] == 18000  # Basic + DA 
    assert row[7] == 6000  # HRA
    assert row[8] == 1500  # Travel
    assert row[9] == 2000  # Hostel
    assert row[10] == 1000  # Children Education 
    assert row[11] == 1200  # Conveyance
    assert row[12] == 800  # Mobile
    assert row[13] == 2500  # Branch Allowance
    assert row[14] == 33000  # Total Salary
    assert row[15] == 4000  # Incentive
    assert row[16] == "B+ve"  # Blood Group
    assert row[17] == "9876500001"  # Contact No;
    assert row[18] == "9876500002"  # Fathers/ Mother Contact No 
    assert row[19] == "Nair Villa"  # House Name 
    assert row[20] == "Round North PO"  # Post office
    assert row[21] == "Opp Museum"  # Landmark 
    assert row[22] == "Thrissur"  # District
    assert row[23] == "680020"  # Pincode
    assert row[24] == "K. Raman Nair"  # Father's Name
    assert row[25] == "Lakshmi Nair"  # Mothers Name
    assert row[26] == "20/06/1994"  # Date Of Birth 
    assert row[27] == "3.5 Years"  # Total Experience
    assert row[28] == "First Auto Ltd"  # Name of Previour Employer-1
    assert row[29] == "Second Motors"  # Name of Previour Employer-2
    assert row[30] == "Third Wheels"  # Name of Previour Employer-3
    assert row[31] == "B.Tech - Mechanical"  # Educational Qualification
    assert "AutoCAD" in row[32] and "MS Excel" in row[32]  # Technical Qualification
    assert row[33] == "Married"  # Marital Status
    assert row[34] == "rahul@example.com"  # Email ID:
    assert row[35] == "Anjana Nair"  # SPOUSE NAME
    assert row[36] == "Hindu"  # Religion

    # Verify CSV streaming produces valid headers and values
    csv_chunks = list(iter_candidates_csv([candidate]))
    assert len(csv_chunks) == 2
    assert "SL No,Name,Branch " in csv_chunks[0]
    assert "Rahul Nair" in csv_chunks[1]
    assert "First Auto Ltd" in csv_chunks[1]


def test_candidate_export_handles_conveyance_and_perf_allowance_variations():
    c1 = Candidate(
        id=uuid4(),
        full_name="Candidate One",
        salary_data={"Conveyance/Performance Allowance": 2400},
    )
    c2 = Candidate(
        id=uuid4(),
        full_name="Candidate Two",
        salary_data={"conveyance performance allowance": 3100},
    )
    row1 = extract_candidate_row(c1, 1)
    row2 = extract_candidate_row(c2, 2)
    assert row1[11] == 2400
    assert row2[11] == 3100

