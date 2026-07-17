import sys
import os
from uuid import uuid4
from datetime import datetime, timezone

# Add backend directory to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal
from app.models.candidate import Candidate, PipelineStage
from app.models.candidate_profile import CandidateProfile
from app.models.evaluation import Evaluation, EvaluationType, InterviewStatus, EvaluationVerdict

def seed_test_candidate():
    db = SessionLocal()
    try:
        candidate_id = uuid4()
        
        # 1. Create Candidate at FINAL_APPROVAL
        candidate = Candidate(
            id=candidate_id,
            candidate_id=f"NIP-{str(candidate_id)[:8].upper()}",
            full_name="John Doe (Test)",
            phone="9998887776",
            email="john.test@example.com",
            source="Walk In",
            position_applied_for="Customer Support Executive",
            current_stage=PipelineStage.FINAL_APPROVAL,
            branch_location="Kalamassery (Nippon Towers)"
        )
        db.add(candidate)
        db.flush()

        # 2. Create Candidate Profile with rich PreForm data
        profile = CandidateProfile(
            candidate_id=candidate_id,
            current_location="Ernakulam",
            experience_level="Experienced",
            total_experience="2.5 Years",
            current_company="Tech Solutions Pvt Ltd",
            expected_salary="25,000",
            raw_data={
                "age": "28",
                "dateOfBirth": "1996-05-15",
                "gender": "Male",
                "bloodGroup": "O+ve",
                "height": "175",
                "weight": "72",
                "maritalStatus": "Single",
                "religionCaste": "Christian",
                "permHouseName": "Test House",
                "permPostOffice": "Test PO",
                "permLandmark": "Near Park",
                "permDistrict": "Ernakulam",
                "permPinCode": "682020",
                "sameAsPermanent": True,
                "languagesRead": "English, Malayalam",
                "languagesWrite": "English, Malayalam",
                "languagesSpeak": "English, Malayalam",
                "aadhaarNumber": "123456789012",
                "panNumber": "ABCDE1234F",
                "drivingLicenseNumber": "KL071234567",
                "class10School": "Test High School",
                "class10Board": "CBSE",
                "class10Percentage": "85",
                "class10PassingYear": "2012",
                "class12School": "Test HSS",
                "class12Stream": "Commerce",
                "class12Percentage": "82",
                "class12PassingYear": "2014",
                "gradCollege": "Test College",
                "gradCourse": "BBA",
                "gradPercentage": "75",
                "gradPassingYear": "2017",
                "totalExperience": "2.5 Years",
                "prevCompanyName": "Tech Solutions Pvt Ltd",
                "prevPosition": "Customer Support",
                "expectedSalary": "25,000"
            }
        )
        db.add(profile)

        # 3. Create Evaluations
        now = datetime.now(timezone.utc)
        
        # HR Evaluation
        hr_eval = Evaluation(
            id=uuid4(),
            candidate_id=candidate_id,
            type=EvaluationType.BRANCH_HR,
            status=InterviewStatus.EVALUATED,
            verdict=EvaluationVerdict.SELECTED,
            remarks="Good communication skills. Suitable for the role.",
            scores={"communication": 8, "technical": 7},
            scheduled_time=now
        )
        db.add(hr_eval)

        # Dept Head Evaluation
        dept_eval = Evaluation(
            id=uuid4(),
            candidate_id=candidate_id,
            type=EvaluationType.DEPT_HEAD,
            status=InterviewStatus.EVALUATED,
            verdict=EvaluationVerdict.SELECTED,
            remarks="Technically sound and good attitude.",
            scores={"overall": 8},
            scheduled_time=now
        )
        db.add(dept_eval)

        db.commit()
        print(f"Successfully created test candidate!")
        print(f"Name: {candidate.full_name}")
        print(f"ID: {candidate.id}")
        
    except Exception as e:
        db.rollback()
        print(f"Error seeding candidate: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_test_candidate()
