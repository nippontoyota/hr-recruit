"""DoubleTick / Meta WhatsApp template copy. Placeholder {{n}} order must match `keys`."""

from dataclasses import dataclass


@dataclass(frozen=True)
class WhatsAppTemplateSpec:
    name: str
    body: str
    keys: tuple[str, ...]
    examples: tuple[str, ...]
    category: str = "UTILITY"

    def example_map(self) -> dict[str, str]:
        return {str(index): value for index, value in enumerate(self.examples, start=1)}


CALL_LETTER = WhatsAppTemplateSpec(
    name="nippon_interview_call_letter",
    keys=(
        "candidateName",
        "position",
        "visitDate",
        "branchName",
        "formLink",
        "arrivalTime",
        "extraInstructions",
        "mapsLink",
        "recruiterName",
    ),
    examples=(
        "Arun Kumar",
        "Sales Consultant",
        "20 Aug 2026",
        "Kalamassery",
        "https://hr-recruit.vercel.app/pre-form/example",
        "9:15 AM",
        "Meeting Point - Floor 3rd - Sales Training Room / HR Department",
        "https://maps.google.com/?q=Nippon+Toyota+Kalamassery",
        "Anu",
    ),
    body=(
        "Dear {{1}},\n"
        "\n"
        '"Greetings from Nippon HRD"\n'
        "\n"
        "This is to inform you that, pertaining to your application for *{{2}}*, "
        "we have scheduled a direct interview on *{{3}}* at Nippon Toyota, *{{4}}*. "
        "Please bring an updated bio-data and a passport size photo.\n"
        "\n"
        "Also complete the Job Application Form using the link below without fail:\n"
        "{{5}}\n"
        "\n"
        "Reporting Time - *{{6}}*\n"
        "Dress Code - Formal Wear with Proper Grooming (Mandatory)\n"
        "{{7}}\n"
        "\n"
        "Location Link -\n"
        "{{8}}\n"
        "\n"
        "Regards\n"
        "{{9}}\n"
        "Talent Acquisition Team\n"
        "Nippon Toyota"
    ),
)

CALL_LETTER_V2_ONE_TOUCHPOINT = WhatsAppTemplateSpec(
    name="nippon_interview_call_letter_v2",
    keys=(
        "candidateName",
        "position",
        "visitDate",
        "branchName",
        "formLink",
        "arrivalTime",
        "meetingPoint",
        "touchPoint1",
        "mapsLink",
        "recruiterName",
    ),
    examples=(
        "Arun Kumar",
        "Sales Consultant",
        "20 Aug 2026",
        "Kalamassery",
        "https://hr-recruit.vercel.app/pre-form/example",
        "9:15 AM",
        "Floor 3rd - Sales Training Room / HR Department",
        "Sreehari (HRD) 8606986060",
        "https://maps.google.com/?q=Nippon+Toyota+Kalamassery",
        "Anu",
    ),
    body=(
        "Dear {{1}},\n"
        "\n"
        '"Greetings from Nippon HRD"\n'
        "\n"
        "This is to inform you that, pertaining to your application for *{{2}}*, "
        "we have scheduled a direct interview on *{{3}}* at Nippon Toyota, *{{4}}*. "
        "Please bring an updated bio-data and a passport size photo.\n"
        "\n"
        "Also complete the Job Application Form using the link below without fail:\n"
        "{{5}}\n"
        "\n"
        "Reporting Time - *{{6}}*\n"
        "Dress Code - Formal Wear with Proper Grooming (Mandatory)\n"
        "Meeting Point - {{7}}\n"
        "Touch Point 1 - {{8}}\n"
        "\n"
        "Location Link -\n"
        "{{9}}\n"
        "\n"
        "Regards\n"
        "{{10}}\n"
        "Talent Acquisition Team\n"
        "Nippon Toyota"
    ),
)

CALL_LETTER_V2_TWO_TOUCHPOINTS = WhatsAppTemplateSpec(
    name="nippon_interview_call_letter_v2_two_touchpoints",
    keys=(
        "candidateName",
        "position",
        "visitDate",
        "branchName",
        "formLink",
        "arrivalTime",
        "meetingPoint",
        "touchPoint1",
        "touchPoint2",
        "mapsLink",
        "recruiterName",
    ),
    examples=(
        "Arun Kumar",
        "Sales Consultant",
        "20 Aug 2026",
        "Kalamassery",
        "https://hr-recruit.vercel.app/pre-form/example",
        "9:15 AM",
        "Floor 3rd - Sales Training Room / HR Department",
        "Sreehari (HRD) 8606986060",
        "Mathew (HRD) 9544286099",
        "https://maps.google.com/?q=Nippon+Toyota+Kalamassery",
        "Anu",
    ),
    body=(
        "Dear {{1}},\n"
        "\n"
        '"Greetings from Nippon HRD"\n'
        "\n"
        "This is to inform you that, pertaining to your application for *{{2}}*, "
        "we have scheduled a direct interview on *{{3}}* at Nippon Toyota, *{{4}}*. "
        "Please bring an updated bio-data and a passport size photo.\n"
        "\n"
        "Also complete the Job Application Form using the link below without fail:\n"
        "{{5}}\n"
        "\n"
        "Reporting Time - *{{6}}*\n"
        "Dress Code - Formal Wear with Proper Grooming (Mandatory)\n"
        "Meeting Point - {{7}}\n"
        "Touch Point 1 - {{8}}\n"
        "Touch Point 2 - {{9}}\n"
        "\n"
        "Location Link -\n"
        "{{10}}\n"
        "\n"
        "Regards\n"
        "{{11}}\n"
        "Talent Acquisition Team\n"
        "Nippon Toyota"
    ),
)

INTERVIEWER_INVITE = WhatsAppTemplateSpec(
    name="nippon_interviewer_invite",
    keys=("interviewerName", "candidateName", "mode", "locationOrLink"),
    examples=(
        "Mathew",
        "Arun Kumar",
        "HO HR Interview",
        "https://hr-recruit.vercel.app/eval/example",
    ),
    body=(
        "Hi {{1}},\n"
        "\n"
        "Please complete the evaluation form for *{{2}}* ({{3}}):\n"
        "{{4}}\n"
        "\n"
        "Nippon Toyota HR"
    ),
)

TECHNICAL_TEST = WhatsAppTemplateSpec(
    name="nippon_technical_test_invite",
    keys=("candidateName", "position", "locationOrLink", "date", "time"),
    examples=(
        "Arun Kumar",
        "Technician",
        "https://hr-recruit.vercel.app/test/example",
        "21 Aug 2026",
        "10:00 AM",
    ),
    body=(
        "Dear {{1}},\n"
        "\n"
        "Please complete your technical test for *{{2}}*:\n"
        "{{3}}\n"
        "\n"
        "Date: {{4}}\n"
        "Time: {{5}}\n"
        "\n"
        "Nippon Toyota HR"
    ),
)

INTERVIEW_SCHEDULE = WhatsAppTemplateSpec(
    name="nippon_head_office_interview_invite",
    keys=("candidateName", "position", "date", "time", "mode", "locationOrLink", "recruiterName"),
    examples=(
        "Arun Kumar",
        "Sales Consultant",
        "22 Aug 2026",
        "10:30 AM",
        "Walk-in",
        "Nippon Toyota Edappally",
        "Jerin Thomas",
    ),
    body=(
        "Dear {{1}},\n"
        "\n"
        "Your Head Office interview for *{{2}}* is scheduled.\n"
        "\n"
        "Date: *{{3}}*\n"
        "Reporting time: *{{4}}*\n"
        "Mode: {{5}}\n"
        "Location/Link: {{6}}\n"
        "\n"
        "Please bring an updated bio-data and a passport size photo.\n"
        "Dress Code - Formal Wear with Proper Grooming (Mandatory)\n"
        "Please be on time.\n"
        "\n"
        "Regards\n"
        "{{7}}\n"
        "Nippon Toyota HR"
    ),
)

ONLINE_INTERVIEW_SCHEDULE = WhatsAppTemplateSpec(
    name="nippon_head_office_online_interview_invite",
    keys=("candidateName", "position", "date", "time", "recruiterName"),
    examples=(
        "Arun Kumar",
        "Sales Consultant",
        "22 Aug 2026",
        "10:30 AM",
        "Jerin Thomas",
    ),
    body=(
        "Dear {{1}},\n"
        "\n"
        "Your Head Office online interview for *{{2}}* is scheduled.\n"
        "\n"
        "Date: *{{3}}*\n"
        "Reporting time: *{{4}}*\n"
        "Mode: Online\n"
        "\n"
        "More details about the online meeting, including the joining link, will be shared with you shortly.\n"
        "\n"
        "Please be ready at the scheduled time.\n"
        "\n"
        "Regards\n"
        "{{5}}\n"
        "Nippon Toyota HR"
    ),
)

OFFER_INTIMATION = WhatsAppTemplateSpec(
    name="nippon_offer_intimation",
    keys=("candidateName", "position", "branchName"),
    examples=("Arun Kumar", "Sales Consultant", "Kalamassery"),
    body=(
        "Dear {{1}},\n"
        "\n"
        "We are delighted to offer you the position of *{{2}}* at Nippon Toyota, {{3}}.\n"
        "\n"
        "Your official offer letter has been sent to your email as a PDF. "
        "Please review it and reply to HR with any questions.\n"
        "\n"
        "We look forward to welcoming you to the team.\n"
        "\n"
        "Best regards\n"
        "Human Resources\n"
        "Nippon Toyota"
    ),
)

ALL_SPECS = (
    CALL_LETTER,
    CALL_LETTER_V2_ONE_TOUCHPOINT,
    CALL_LETTER_V2_TWO_TOUCHPOINTS,
    INTERVIEWER_INVITE,
    TECHNICAL_TEST,
    INTERVIEW_SCHEDULE,
    ONLINE_INTERVIEW_SCHEDULE,
    OFFER_INTIMATION,
)
