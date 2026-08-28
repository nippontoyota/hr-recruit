from app.services.doubletick import (
    call_letter_placeholders,
    hr_interview_placeholders,
    interviewer_placeholders,
    sanitize_placeholder,
    technical_test_placeholders,
)
from app.services.whatsapp_templates import ALL_SPECS, CALL_LETTER, INTERVIEW_SCHEDULE


def test_sanitize_placeholder_flattens_newlines_and_empty():
    extra = (
        "Meeting Point – Floor 3rd\n"
        "Touch Point 1 – Sreehari (HRD) 8606986060"
    )
    assert "\n" not in sanitize_placeholder(extra)
    assert sanitize_placeholder("") == "-"
    assert sanitize_placeholder("  a   b  ") == "a b"


def test_call_letter_placeholders_match_template_order():
    values = call_letter_placeholders(
        {
            "candidateName": "Arun",
            "position": "Sales Consultant",
            "visitDate": "20 Aug 2026",
            "branchName": "Kalamassery",
            "formLink": "https://hr.example/form",
            "arrivalTime": "9:15 AM",
            "extraInstructions": "Floor 3\nAsk for HR",
            "mapsLink": "https://maps.example/k",
            "recruiterName": "Anu",
        }
    )
    assert values == [
        "Arun",
        "Sales Consultant",
        "20 Aug 2026",
        "Kalamassery",
        "https://hr.example/form",
        "9:15 AM",
        "Floor 3 / Ask for HR",
        "https://maps.example/k",
        "Anu",
    ]
    assert len(values) == len(CALL_LETTER.keys)
    assert CALL_LETTER.body.count("{{") == 9


def test_interviewer_and_test_placeholder_counts():
    interviewer = interviewer_placeholders(
        {
            "interviewerName": "Mathew",
            "candidateName": "Arun",
            "mode": "HO HR Interview",
            "locationOrLink": "https://hr.example/eval",
        }
    )
    assert interviewer == ["Mathew", "Arun", "HO HR Interview", "https://hr.example/eval"]
    test = technical_test_placeholders(
        {
            "candidateName": "Arun",
            "position": "Technician",
            "locationOrLink": "https://hr.example/test",
            "date": "21 Aug 2026",
            "time": "10:00 AM",
        }
    )
    assert test[2] == "https://hr.example/test"
    assert all(len(spec.body) <= 1024 for spec in ALL_SPECS)
    assert all(len(spec.keys) == len(spec.examples) for spec in ALL_SPECS)


def test_head_office_schedule_placeholders_have_no_form_link():
    values = hr_interview_placeholders(
        {
            "candidateName": "Arun",
            "position": "Sales Consultant",
            "date": "22 Aug 2026",
            "time": "10:30 AM",
            "mode": "Walk-in",
            "locationOrLink": "Nippon Toyota Head Office",
            "recruiterName": "Jerin",
        }
    )
    assert values == [
        "Arun",
        "Sales Consultant",
        "22 Aug 2026",
        "10:30 AM",
        "Walk-in",
        "Nippon Toyota Head Office",
        "Jerin",
    ]
    assert "application form" not in INTERVIEW_SCHEDULE.body.lower()
