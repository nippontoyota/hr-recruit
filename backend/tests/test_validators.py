import pytest

from app.schemas.candidate import CandidateCreate, PreFormApplicationData, StageChange
from app.utils import validators as v


def test_validate_phone_accepts_indian_mobile():
    assert v.validate_phone("9876543210") == "9876543210"


def test_validate_phone_rejects_invalid():
    with pytest.raises(ValueError, match="10-digit"):
        v.validate_phone("1234567890")


def test_validate_pin_code():
    assert v.validate_pin_code("682001") == "682001"
    with pytest.raises(ValueError):
        v.validate_pin_code("012345")


def test_validate_pan():
    assert v.validate_pan("ABCDE1234F") == "ABCDE1234F"
    with pytest.raises(ValueError):
        v.validate_pan("ABC123")


def test_candidate_create_normalizes_linkedin_source():
    body = CandidateCreate.model_validate(
        {
            "full_name": "Rahul Kumar",
            "phone": "9876543210",
            "source": "LinkedIn",
            "position_applied_for": "Sales",
        }
    )
    assert body.source == "OTHER"


def test_stage_change_requires_reject_remarks():
    with pytest.raises(ValueError, match="10 characters"):
        StageChange.model_validate({"to_stage": "REJECTED", "remarks": "short"})


def test_pre_form_rejects_invalid_aadhaar():
    payload = _valid_pre_form()
    payload["aadhaarNumber"] = "123"
    with pytest.raises(ValueError):
        PreFormApplicationData.model_validate(payload)


def _valid_pre_form() -> dict:
    return {
        "nameAadhaar": "Rahul Kumar",
        "gender": "Male",
        "dateOfBirth": "1995-06-15",
        "age": "31",
        "maritalStatus": "Single",
        "height": "170",
        "weight": "70",
        "bloodGroup": "O+",
        "religionCaste": "Hindu / General",
        "permHouseName": "Rose Villa",
        "permPostOffice": "Kalamassery",
        "permLandmark": "Near NH",
        "permDistrict": "Ernakulam",
        "permPinCode": "682001",
        "sameAsPermanent": True,
        "aadhaarNumber": "123456789012",
        "panNumber": "ABCDE1234F",
        "drivingLicenseNumber": "KL0123456789012",
        "confidentToDrive": True,
        "class10School": "Govt HS",
        "class10Board": "Kerala",
        "class10Percentage": "85",
        "class10PassingYear": "2010",
        "class10Mode": "Regular",
        "class12School": "Govt HSS",
        "class12Stream": "Science",
        "class12Percentage": "80",
        "class12PassingYear": "2012",
        "class12Mode": "Regular",
        "languagesRead": "English, Malayalam",
        "languagesWrite": "English",
        "languagesSpeak": "English, Malayalam",
        "fatherName": "Ravi Kumar",
        "motherName": "Meera Kumar",
        "totalExperience": "Fresher",
        "expectedSalary": "25000",
        "sourceOfOpening": "Walk-in",
        "preferredRegion": "Kochi",
        "expectedJoiningDate": "2026-12-01",
        "hasReference": True,
        "refRole": "Professor",
        "refName": "Anil Nair",
        "refPanchayat": "Thrikkakara",
        "refContactNumber": "9876543210",
        "emergency1Relation": "Uncle",
        "emergency1Name": "Suresh Nair",
        "emergency1Address": "Kalamassery",
        "emergency1Contact": "9876501234",
        "emailId": "rahul@example.com",
        "declarationPlace": "Kochi",
        "declarationDate": "2026-08-13",
        "declarationName": "Rahul Kumar",
        "prevTerminated": False,
        "nervousDisorder": False,
        "physicalDisability": False,
        "eyeVision": False,
        "criminalConviction": False,
    }


def test_pre_form_accepts_valid_payload():
    PreFormApplicationData.model_validate(_valid_pre_form())


def test_pre_form_requires_father_and_mother_name():
    payload = _valid_pre_form()
    payload.pop("fatherName", None)
    payload["fatherName"] = ""
    payload["motherName"] = "Meera"
    with pytest.raises(ValueError):
        PreFormApplicationData.model_validate(payload)


def test_pre_form_requires_emergency1():
    payload = _valid_pre_form()
    payload["emergency1Name"] = ""
    payload["emergency1Relation"] = "Uncle"
    payload["emergency1Address"] = "Kochi"
    payload["emergency1Contact"] = "9876543210"
    with pytest.raises(ValueError):
        PreFormApplicationData.model_validate(payload)


def test_pre_form_requires_job1_when_experienced():
    payload = _valid_pre_form()
    payload["previousExperience"] = True
    payload["totalExperience"] = "2 Years"
    payload["prevCompanyName"] = ""
    payload["prevPosition"] = "Advisor"
    with pytest.raises(ValueError):
        PreFormApplicationData.model_validate(payload)


def test_pre_form_requires_spouse_when_married():
    payload = _valid_pre_form()
    payload["maritalStatus"] = "Married"
    payload["spouseName"] = ""
    with pytest.raises(ValueError):
        PreFormApplicationData.model_validate(payload)


def test_pre_form_accepts_fresher_without_job_rows():
    payload = _valid_pre_form()
    payload["previousExperience"] = False
    payload["totalExperience"] = "Fresher"
    PreFormApplicationData.model_validate(payload)
