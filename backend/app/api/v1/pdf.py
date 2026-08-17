import os

from fastapi import APIRouter, Depends, Request
from fastapi.responses import Response
from fpdf import FPDF
from fpdf.enums import XPos, YPos

from app.core.deps import require_roles
from app.models.enums import UserRole
from app.models.user import User

router = APIRouter()

_STATIC_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../static"))
_FONT_DIR = os.path.join(_STATIC_DIR, "fonts")
_LOGO_PATH = os.path.join(_STATIC_DIR, "nippon-toyota-logo-print.png")
_MAROON = (214, 28, 36)


def s(text) -> str:
    if text is None:
        return ""
    if not isinstance(text, str):
        text = str(text)
    return text.strip()


def _join_date(value) -> str:
    text = s(value)
    if len(text) >= 10 and text[4] == "-" and text[7] == "-":
        return f"{text[8:10]}-{text[5:7]}-{text[0:4]}"
    return text


def _salary_get(data: dict | None, *keys: str) -> str:
    if not data:
        return ""
    folded = {str(k).strip().lower().replace("_", " ").replace("+", " "): v for k, v in data.items()}
    folded = {" ".join(k.split()): v for k, v in folded.items()}
    for key in keys:
        value = folded.get(key.lower().replace("_", " "))
        if value is None:
            continue
        text = str(value).strip()
        if text and text.lower() not in {"none", "nan"}:
            return text
    return ""


def _inr(value: str) -> str:
    raw = (
        value.replace("Rs.", "")
        .replace("Rs", "")
        .replace("/-", "")
        .replace(",", "")
        .strip()
    )
    try:
        number = float(raw)
        if number.is_integer():
            return str(int(number))
        return f"{number:g}"
    except ValueError:
        return value or "0"


def resolve_offer_fields(payload: dict) -> dict:
    candidate = payload.get("candidate") or {}
    salary = payload.get("salary_data") or candidate.get("salary_data") or {}
    return {
        "candidate_name": s(payload.get("candidate_name") or candidate.get("full_name")),
        "designation": s(
            payload.get("designation")
            or _salary_get(salary, "designation")
            or candidate.get("position_applied_for")
            or candidate.get("department")
        ),
        "department": s(
            payload.get("department") or _salary_get(salary, "department") or candidate.get("department")
        ),
        "total_salary": s(payload.get("total_salary") or _salary_get(salary, "total salary", "basic", "basic salary")),
        "total_allowance": s(payload.get("total_allowance") or _salary_get(salary, "total allowance", "allowance")),
        "others": s(
            payload.get("others")
            or _salary_get(salary, "others", "other", "fixed incentive", "total incentive")
            or "0"
        ),
        "gross_salary": s(
            payload.get("gross_salary")
            or _salary_get(salary, "gross salary", "gross", "total package", "ctc", "monthly package", "monthly ctc")
        ),
        "joining_date": _join_date(
            payload.get("joining_date")
            or _salary_get(salary, "proposed doj", "proposed date of joining", "joining date")
        ),
    }


class ToyotaPDF(FPDF):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.add_font("Roboto", "", os.path.join(_FONT_DIR, "Roboto-Regular.ttf"))
        self.add_font("Roboto", "B", os.path.join(_FONT_DIR, "Roboto-Bold.ttf"))
        self.add_font("Roboto", "I", os.path.join(_FONT_DIR, "Roboto-Italic.ttf"))
        self.set_margins(20, 42, 20)
        self.set_auto_page_break(auto=True, margin=54)

    def _maroon_line(self, y: float) -> None:
        self.set_draw_color(*_MAROON)
        self.set_line_width(0.45)
        self.line(20, y, 190, y)

    def header(self):
        if os.path.isfile(_LOGO_PATH):
            self.image(_LOGO_PATH, x=20, y=6, w=52)
        self._maroon_line(34)
        self.set_y(40)

    def footer(self):
        self._maroon_line(246)
        self.set_y(248)
        self.set_text_color(0, 0, 0)
        self.set_font("Roboto", "B", 11)
        self.cell(0, 6, "NIPPON MOTOR CORPORATION (P) LTD.", align="C", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        self.set_font("Roboto", "", 11)
        self.cell(0, 6, "XIX/9C, Nippon Towers, NH - 544, HMT Junction, Kalamassery, Cochin - 683104, Kerala - India", align="C", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        self.cell(0, 6, "E-mail : nippon@nippontoyota.com", align="C", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        self.cell(0, 6, "CIN - U50101KL1999PTC012728", align="C", new_x=XPos.LMARGIN, new_y=YPos.NEXT)


def _write(pdf: FPDF, text: str, size: int = 11, bold: bool = False, italic: bool = False, h: float = 6) -> None:
    style = "B" if bold else "I" if italic else ""
    pdf.set_x(pdf.l_margin)
    pdf.set_font("Roboto", style, size)
    pdf.multi_cell(pdf.epw, h, text, new_x=XPos.LMARGIN, new_y=YPos.NEXT)


def _write_parts(pdf: FPDF, parts: list[tuple[str, bool]], size: int = 11, h: float = 6) -> None:
    pdf.set_x(pdf.l_margin)
    for text, bold in parts:
        pdf.set_font("Roboto", "B" if bold else "", size)
        pdf.write(h, text)
    pdf.ln(h + 1)


def _salary_row(pdf: FPDF, label: str, amount: str) -> None:
    pdf.set_x(pdf.l_margin + 8)
    pdf.set_font("Roboto", "", 11)
    pdf.cell(48, 7, label)
    pdf.cell(12, 7, "=")
    pdf.cell(30, 7, amount, new_x=XPos.LMARGIN, new_y=YPos.NEXT)


def generate_offer_letter_pdf(payload: dict) -> bytearray:
    fields = resolve_offer_fields(payload)
    name = fields["candidate_name"] or "[Candidate name]"
    designation = fields["designation"] or "[Designation]"
    department = fields["department"]
    role = f"{designation} - {department}" if department and department.lower() not in designation.lower() else designation
    total_salary = _inr(fields["total_salary"] or "0")
    allowance = _inr(fields["total_allowance"] or "0")
    others = _inr(fields["others"] or "0")
    gross = _inr(fields["gross_salary"] or "0")
    joining = fields["joining_date"] or "[joining date]"

    pdf = ToyotaPDF()
    pdf.add_page()
    pdf.set_text_color(0, 0, 0)

    _write_parts(pdf, [("Dear Mr. ", False), (name, True)])
    pdf.ln(2)
    _write(pdf, "Greetings from Team Nippon.!!!", h=7)
    pdf.ln(3)
    _write_parts(
        pdf,
        [
            (
                "With reference to your application and subsequent interviews, we are pleased to offer you the position ",
                False,
            ),
            (role, True),
            (
                " in our organization. As discussed we are offering you a total Monthly package of "
                f"Rs. {gross}/-, (Subject to statutory deductions). A detailed break up as mentioned below:-",
                False,
            ),
        ],
    )
    pdf.ln(2)

    for label, amount in (
        ("Total Salary", total_salary),
        ("Total Allowance", allowance),
        ("Others", others),
        ("Total Package", gross),
    ):
        _salary_row(pdf, label, amount)
    pdf.ln(3)

    _write(pdf, f"You are advised to join duty on or before {joining} as agreed.")
    pdf.ln(2)
    _write(
        pdf,
        "You will be on probation for a period of 6 Months, during which your job will be evaluated and "
        "analyzed, based on which you will be confirmed. However the management has right to extend the "
        "probation period as per your performance.",
    )
    pdf.ln(3)
    _write(pdf, "We look forward to you joining our team. We are sure that you will have a bright career with our company.")
    _write(pdf, "We take this opportunity to welcome you and your family into the folds of our company.")
    pdf.ln(3)
    _write(pdf, "Yours faithfully,", h=7)
    pdf.ln(8)
    _write(pdf, "JERRY JACOB MATHEW", bold=True, h=6)
    _write(pdf, "HUMAN RESOURCES MANAGER", bold=True, size=10, h=5)
    _write(pdf, "NIPPON MOTOR CORPORATION PVT LTD.", bold=True, size=10, h=5)

    return pdf.output()


@router.post("/offer-letter")
async def generate_offer_letter(
    request: Request,
    _user: User = Depends(require_roles(UserRole.ADMIN, UserRole.HO_HR)),
):
    payload = await request.json()
    pdf_bytes = generate_offer_letter_pdf(payload)
    return Response(
        content=bytes(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": 'inline; filename="OfferLetter.pdf"'},
    )
