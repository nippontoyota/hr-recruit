from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import Response
from fpdf import FPDF
import io

router = APIRouter()

def s(text) -> str:
    if text is None:
        return ""
    if not isinstance(text, str):
        text = str(text)
    return text

import os
class ToyotaPDF(FPDF):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        font_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../static/fonts"))
        self.add_font("Roboto", "", os.path.join(font_dir, "Roboto-Regular.ttf"))
        self.add_font("Roboto", "B", os.path.join(font_dir, "Roboto-Bold.ttf"))
        self.add_font("Roboto", "I", os.path.join(font_dir, "Roboto-Italic.ttf"))

    def footer(self):
        self.set_y(-15)
        self.set_font("Roboto", "I", 8)
        self.cell(0, 10, f"Page {self.page_no()}", align="C")

def draw_tech_test_page(pdf, candidate, questions, tech_eval=None):
    pdf.add_page()
    pdf.set_margins(left=15, top=15, right=15)
    pdf.set_auto_page_break(auto=True, margin=15)

    # Header
    pdf.set_font("Roboto", "B", 18)
    pdf.cell(130, 10, "TOYOTA", ln=0)
    pdf.set_font("Roboto", "B", 10)
    pdf.cell(0, 10, "Series B", new_x="LMARGIN", new_y="NEXT", align="R")

    pdf.set_font("Roboto", "B", 10)
    pdf.cell(130, 6, "Motor Corporation", ln=0)
    pdf.set_font("Roboto", "B", 8)
    pdf.cell(0, 6, "Version 2020.1", new_x="LMARGIN", new_y="NEXT", align="R")

    pdf.set_font("Roboto", "I", 8)
    pdf.cell(130, 4, "*candidates with one year experience and above", ln=0)
    pdf.set_font("Roboto", "", 8)
    
    if tech_eval:
        from datetime import datetime, timezone
        d_str = tech_eval.get("created_at")
        if d_str:
            d_str = datetime.fromisoformat(d_str.replace("Z", "+00:00")).strftime("%d-%m-%Y")
        else:
            d_str = ""
        pdf.cell(0, 4, f"Date: {d_str}", new_x="LMARGIN", new_y="NEXT", align="R")
        pdf.cell(0, 4, "Time: Completed", new_x="LMARGIN", new_y="NEXT", align="R")
    else:
        pdf.cell(0, 4, "Date: ______________", new_x="LMARGIN", new_y="NEXT", align="R")
        pdf.cell(0, 4, "Time: ______________", new_x="LMARGIN", new_y="NEXT", align="R")
    pdf.ln(5)

    pdf.set_font("Roboto", "B", 10)
    pdf.cell(0, 8, "HUMAN RESOURCES DEPARTMENT", new_x="LMARGIN", new_y="NEXT", align="C")
    pdf.ln(5)

    pdf.set_font("Roboto", "B", 9)
    pdf.cell(50, 6, "Name of the Candidate:")
    pdf.set_font("Roboto", "B", 10)
    pdf.cell(0, 6, candidate.get("full_name", ""), new_x="LMARGIN", new_y="NEXT")

    pdf.set_font("Roboto", "B", 9)
    pdf.cell(50, 6, "Position Applied For:")
    pdf.set_font("Roboto", "B", 10)
    pdf.cell(0, 6, candidate.get("position_applied_for", ""), new_x="LMARGIN", new_y="NEXT")

    pdf.ln(5)
    pdf.cell(0, 8, f"Question Paper - {candidate.get('position_applied_for', '')}", new_x="LMARGIN", new_y="NEXT", align="C")
    pdf.ln(5)

    # Questions Table Header
    pdf.set_font("Roboto", "B", 9)
    pdf.cell(10, 8, "No.")
    pdf.cell(110, 8, "Question")
    pdf.cell(30, 8, "Max Marks", align="C")
    pdf.cell(30, 8, "Marks Obt.", new_x="LMARGIN", new_y="NEXT", align="C")

    total_marks_obtained = 0
    total_marks_possible = len(questions)
    answers = tech_eval.get("scores") or {} if tech_eval else {}

    # Questions
    for i, q in enumerate(questions):
        pdf.ln(3)
        pdf.set_font("Roboto", "", 9)
        pdf.cell(10, 6, str(i + 1))
        pdf.set_font("Roboto", "B", 9)
        # Using multi_cell for long questions
        x = pdf.get_x()
        y = pdf.get_y()
        pdf.multi_cell(110, 6, s(q.get("text", "")))
        new_y = pdf.get_y()
        
        pdf.set_xy(x + 110, y)
        pdf.cell(30, 6, "1", align="C")
        
        q_id = str(q.get("id", ""))
        candidate_ans = answers.get(q_id, "")
        correct_ans = q.get("correct_option", "")
        
        if tech_eval:
            is_correct = candidate_ans == correct_ans
            marks = 1 if is_correct else 0
            total_marks_obtained += marks
            
            if is_correct:
                pdf.set_text_color(0, 128, 0)
            else:
                pdf.set_text_color(255, 0, 0)
                
            pdf.cell(30, 6, str(marks), new_x="LMARGIN", new_y="NEXT", align="C")
            pdf.set_text_color(0, 0, 0)
        else:
            pdf.cell(30, 6, "", new_x="LMARGIN", new_y="NEXT", align="C")
            
        pdf.set_y(new_y)
        pdf.set_font("Roboto", "", 9)
        options = q.get("options", {})
        for k, v in options.items():
            pdf.cell(10, 5, "")
            if tech_eval and k == candidate_ans:
                pdf.set_font("Roboto", "B", 9)
                pdf.set_fill_color(230, 240, 255)
                pdf.cell(110, 5, s(f"{k}. {v}"), border=1, fill=True, new_x="LMARGIN", new_y="NEXT")
                pdf.set_font("Roboto", "", 9)
            elif tech_eval and k == correct_ans:
                pdf.set_text_color(0, 128, 0)
                pdf.cell(110, 5, s(f"{k}. {v} (Correct)"), new_x="LMARGIN", new_y="NEXT")
                pdf.set_text_color(0, 0, 0)
            else:
                pdf.cell(110, 5, s(f"{k}. {v}"), new_x="LMARGIN", new_y="NEXT")

    if tech_eval:
        pdf.ln(10)
        pdf.set_font("Roboto", "B", 12)
        pdf.cell(0, 10, f"TOTAL SCORE: {total_marks_obtained} / {total_marks_possible}", align="R", new_x="LMARGIN", new_y="NEXT")


def generate_tech_test_pdf(payload: dict) -> bytes:
    pdf = ToyotaPDF(format="A4")
    candidate = payload.get("candidate", {})
    questions = payload.get("questions", [])
    
    draw_tech_test_page(pdf, candidate, questions, None)
    return pdf.output(dest="S")

def generate_candidate_summary_pdf(payload: dict) -> bytes:
    from fpdf.fonts import FontFace
    import datetime
    
    pdf = ToyotaPDF(format="A4")
    pdf.add_page()
    pdf.set_margins(left=5, top=5, right=5)
    pdf.set_auto_page_break(auto=True, margin=5)
    
    candidate = payload.get("candidate", {})
    raw_data = payload.get("raw_data", {})
    evaluations = payload.get("evaluations", [])
    
    hr_eval = None
    for e in evaluations:
        if e.get("type") in ["BRANCH_HR", "HQ_INTERVIEW"]:
            hr_eval = e
            break
            
    today = datetime.datetime.now().strftime('%d-%b-%Y')
    
    def format_date(d_str):
        if not d_str: return today
        try:
            return datetime.datetime.fromisoformat(d_str.replace('Z', '+00:00')).strftime('%d-%b-%Y')
        except:
            return d_str
            
    pdf.set_draw_color(0, 0, 0)
    pdf.set_line_width(0.2)
    
    bold_style = FontFace(emphasis="B")
    bg_gray = FontFace(fill_color=(243, 244, 246))
    bold_bg_gray = FontFace(emphasis="B", fill_color=(243, 244, 246))
    
    # --- PAGE 1 ---
    # Header Table
    pdf.set_font("Roboto", "", 8)
    with pdf.table(
        borders_layout="ALL",
        first_row_as_headings=False,
        col_widths=(30, 80, 20, 20, 20, 30),
        text_align=("C", "L", "C", "C", "C", "C"),
        line_height=5
    ) as table:
        row = table.row()
        row.cell("", rowspan=2) 
        row.cell("NIPPON TOYOTA\nNIPPON MOTOR CORPORATION (P) LTD, NIPPON TOWERS, KALAMASSERY", rowspan=2, style=bold_style)
        row.cell("")
        row.cell("")
        row.cell("Sl No", style=bg_gray)
        row.cell("")
        
        row2 = table.row()
        row2.cell("")
        row2.cell("")
        row2.cell("Date :", style=bg_gray)
        row2.cell(today)
        
        row3 = table.row()
        row3.cell("Human Resource Department", colspan=6, align="C", style=bold_bg_gray)

    import os
    logo_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../../frontend/public/nippon-toyota-logo.png"))
    if os.path.exists(logo_path):
        pdf.image(logo_path, x=12, y=6, w=16)
        
    # Candidate Summary Sheet Table
    with pdf.table(
        borders_layout="ALL",
        first_row_as_headings=False,
        col_widths=(30, 40, 20, 35, 25, 20, 30),
        text_align=("L", "C", "C", "C", "C", "C", "C"),
        line_height=5
    ) as table:
        row = table.row()
        row.cell("Candidate Summary Sheet", colspan=5, align="C", style=bold_bg_gray)
        row.cell("Department", style=bold_bg_gray)
        row.cell("")
        
        row = table.row()
        row.cell("Name", style=bold_bg_gray)
        row.cell(s(candidate.get("full_name", "")), colspan=2)
        row.cell("Application Submitted on:", style=bg_gray)
        row.cell(format_date(candidate.get("applied_at", "")), colspan=2)
        row.cell("Location", style=bold_bg_gray)
        
        row = table.row()
        row.cell("Post Applied", style=bold_bg_gray)
        row.cell(s(candidate.get("position_applied_for", "")), colspan=2)
        row.cell("Source", style=bold_bg_gray)
        row.cell(s(raw_data.get("sourceOfOpening", "NA")))
        row.cell(s(raw_data.get("preferredRegion", "NA")), colspan=2)
        
        row = table.row()
        row.cell("Post Suitable", style=bold_bg_gray)
        row.cell("", colspan=2)
        row.cell("Age", style=bold_bg_gray)
        row.cell(s(str(raw_data.get("age", "NA"))))
        row.cell("", colspan=2)
        
        row = table.row()
        row.cell("Personal Details", colspan=3, align="C", style=bold_bg_gray)
        row.cell("Date of Birth", style=bold_bg_gray)
        row.cell(s(raw_data.get("dateOfBirth", "NA")), colspan=3)
        
    # Contact & Image Section
    with pdf.table(
        borders_layout="ALL",
        first_row_as_headings=False,
        col_widths=(40, 40, 45, 25, 50),
        text_align=("C", "C", "C", "C", "C"),
        line_height=5
    ) as table:
        row = table.row()
        row.cell("Contact No:", style=bold_bg_gray)
        contact = s(candidate.get("phone", ""))
        if raw_data.get("refContactNumber"): contact += "\n" + str(raw_data.get("refContactNumber"))
        row.cell(contact)
        row.cell("Experience", style=bold_bg_gray)
        row.cell("Years", style=bold_bg_gray)
        row.cell("Photo", rowspan=3, style=FontFace(color=(150, 150, 150)))
        
        row = table.row()
        row.cell("Contact Address", rowspan=2, style=bold_bg_gray)
        perm = [raw_data.get(k) for k in ["permHouseName", "permPostOffice", "permLandmark", "permDistrict", "permPinCode"] if raw_data.get(k)]
        row.cell(", ".join(perm) if perm else "NA", rowspan=2)
        row.cell("Total Work Experience", style=bold_style)
        row.cell(s(str(raw_data.get("totalExperience", "NA"))))
        
        row = table.row()
        row.cell("Relevant Experience", style=bold_style)
        row.cell("")

    # Educational Qualification & Family
    with pdf.table(
        borders_layout="ALL",
        first_row_as_headings=False,
        col_widths=(35, 15, 25, 25, 25, 25, 25, 25),
        text_align=("L", "C", "C", "C", "C", "C", "C", "C"),
        line_height=5
    ) as table:
        row = table.row()
        row.cell("Educational Qualification", style=bold_bg_gray)
        row.cell("Degree")
        row.cell("Specialization", style=bg_gray)
        row.cell(s(raw_data.get("gradCourse", "NA")))
        row.cell("Father's\nOccupation", style=bg_gray)
        row.cell(s(raw_data.get("fatherOccupation", "NA")))
        row.cell("Siblings 1\nOccupation", style=bg_gray)
        row.cell(s(raw_data.get("sibling1Occupation", "NA")))
        
        row = table.row()
        row.cell("Educational Qualification", style=bold_bg_gray)
        row.cell("Plus two")
        row.cell("Specialization", style=bg_gray)
        row.cell(s(raw_data.get("class12Stream", "NA")))
        row.cell("Mother's\nOccupation", style=bg_gray)
        row.cell(s(raw_data.get("motherOccupation", "NA")))
        row.cell("Siblings 2\nOccupation", style=bg_gray)
        row.cell(s(raw_data.get("sibling2Occupation", "NA")))
        
        row = table.row()
        row.cell("Computer Knowledge", style=bold_bg_gray)
        comps = []
        if raw_data.get("compWord"): comps.append("Word")
        if raw_data.get("compExcel"): comps.append("Excel")
        row.cell(", ".join(comps) if comps else "", colspan=2)
        row.cell("Driving Licence", style=bold_bg_gray)
        drv = []
        if raw_data.get("drive2Wheeler"): drv.append("2Wheeler")
        if raw_data.get("drive4Wheeler"): drv.append("4Wheeler")
        row.cell(", ".join(drv) if drv else "", colspan=2)
        row.cell("Spouse\nOccupation", style=bg_gray)
        row.cell(s(raw_data.get("spouseOccupation", "NA")))

    # Score Board
    with pdf.table(
        borders_layout="ALL",
        first_row_as_headings=False,
        col_widths=(45, 25, 35, 25, 35, 35),
        text_align=("L", "C", "C", "C", "C", "C"),
        line_height=5
    ) as table:
        row = table.row()
        row.cell("SCORE BOARD / TEST RESULTS (% Wise)", colspan=6, align="C", style=bold_bg_gray)
        
        row = table.row()
        row.cell("Psychometry test Result", style=bg_gray)
        row.cell("")
        row.cell("TOTAL AVERAGE", rowspan=4, align="C", style=bold_bg_gray)
        row.cell("85.0", rowspan=4, align="C", style=bold_style)
        row.cell("1st Interview", style=bg_gray)
        row.cell(format_date(hr_eval.get("created_at", "")) if hr_eval else today)
        
        row = table.row()
        row.cell("Analytical Test Result", style=bg_gray)
        row.cell("")
        row.cell("2nd Interview", style=bg_gray)
        row.cell(today)
        
        row = table.row()
        row.cell("Technical Test Result", style=bg_gray)
        row.cell("")
        row.cell("3rd Interview", style=bg_gray)
        row.cell(today)
        
        row = table.row()
        row.cell("Department Test Result", style=bg_gray)
        row.cell("85.00")
        row.cell("4th Interview", style=bg_gray)
        row.cell("0-Jan-00")

    # Employment Record
    with pdf.table(
        borders_layout="ALL",
        first_row_as_headings=False,
        col_widths=(35, 15, 15, 15, 35, 45, 20, 20),
        text_align=("C", "C", "C", "C", "C", "C", "C", "C"),
        line_height=5
    ) as table:
        row = table.row()
        row.cell("Employment Record", colspan=8, style=bold_bg_gray)
        
        row = table.row()
        row.cell("Organisation", rowspan=2, style=bold_bg_gray)
        row.cell("Period", colspan=2, style=bold_bg_gray)
        row.cell("No: of\nYears", rowspan=2, style=bold_bg_gray)
        row.cell("Designation", rowspan=2, style=bold_bg_gray)
        row.cell("Reason for Resignation", rowspan=2, style=bold_bg_gray)
        row.cell("Total Salary", rowspan=2, style=bold_bg_gray)
        row.cell("Category", rowspan=2, style=bold_bg_gray)
        
        row = table.row()
        row.cell("From", style=bold_bg_gray)
        row.cell("To", style=bold_bg_gray)
        
        for i in range(1, 6):
            row = table.row()
            pName = raw_data.get(f"prev{i}Name")
            if not pName:
                row.cell(""); row.cell(""); row.cell(""); row.cell("")
                row.cell(""); row.cell(""); row.cell(""); row.cell("")
                continue
            
            pFrom = raw_data.get(f"prev{i}From", "")
            pTo = raw_data.get(f"prev{i}To", "")
            pPos = raw_data.get(f"prev{i}Position", "")
            pReason = raw_data.get(f"prev{i}Reason", "")
            pSal = raw_data.get(f"prev{i}Salary", "")
            
            row.cell(s(pName))
            row.cell(s(pFrom))
            row.cell(s(pTo))
            row.cell("")
            row.cell(s(pPos))
            row.cell(s(pReason))
            row.cell(s(pSal))
            row.cell("Monthly")

    # Salary block
    with pdf.table(
        borders_layout="ALL",
        first_row_as_headings=False,
        col_widths=(40, 30, 40, 40, 30, 20),
        text_align=("L", "C", "C", "L", "C", "C"),
        line_height=5
    ) as table:
        row = table.row()
        row.cell("Current Salary", style=bold_bg_gray)
        row.cell("", style=bg_gray)
        row.cell("Remarks", rowspan=4, style=bg_gray)
        row.cell("Expected Salary", style=bold_bg_gray)
        row.cell(s(str(raw_data.get("expectedSalary", "NA"))), style=bg_gray)
        row.cell("", rowspan=4)
        
        row = table.row()
        row.cell("Incentive", style=bold_bg_gray)
        row.cell("", style=bg_gray)
        row.cell("Incentive", style=bold_bg_gray)
        row.cell("", style=bg_gray)
        
        row = table.row()
        row.cell("Other", style=bold_bg_gray)
        row.cell("", style=bg_gray)
        row.cell("Others", style=bold_bg_gray)
        row.cell("", style=bg_gray)
        
        row = table.row()
        row.cell("Total", style=bold_bg_gray)
        row.cell("", style=bold_bg_gray)
        row.cell("Total", style=bold_bg_gray)
        row.cell(s(str(raw_data.get("expectedSalary", "NA"))), style=bold_bg_gray)

    # Interview Comments
    with pdf.table(
        borders_layout="ALL",
        first_row_as_headings=False,
        col_widths=(30, 30, 80, 20, 20, 20),
        text_align=("C", "C", "L", "C", "C", "C"),
        line_height=5
    ) as table:
        interview_evals = [e for e in evaluations if e.get("type") in ["BRANCH_HR", "DEPT_HEAD", "GM_LEVEL", "HQ_INTERVIEW"]]
        total_marks = 0
        
        row_count = max(5, len(interview_evals))
        first_row = table.row()
        first_row.cell("Interview Comments", rowspan=row_count + 1, style=bold_bg_gray)
        
        first_row.cell("Evaluator", style=bold_bg_gray)
        first_row.cell("Remarks", style=bold_bg_gray)
        first_row.cell("Verdict", colspan=2, style=bold_bg_gray)
        first_row.cell("Score", style=bold_bg_gray)

        for i in range(row_count):
            row = table.row()
            if i < len(interview_evals):
                ev = interview_evals[i]
                evaluator_name = ev.get("type", "").replace("_", " ").title()
                score = str(ev.get("scores", {}).get("total", "")) if ev.get("scores") else ""
                if score.isdigit(): total_marks += int(score)
                row.cell(evaluator_name, style=bg_gray)
                row.cell(s(ev.get("remarks", "")), style=bg_gray)
                row.cell(s(ev.get("verdict", "")), colspan=2, style=bold_bg_gray)
                row.cell(score, style=bold_bg_gray)
            else:
                row.cell("", style=bg_gray)
                row.cell("", style=bg_gray)
                row.cell("", colspan=2, style=bold_bg_gray)
                row.cell("", style=bold_bg_gray)
                
        row = table.row()
        row.cell("Total Marks", colspan=4, align="R", style=bold_bg_gray)
        row.cell(str(total_marks), style=bold_bg_gray)

    # Bottom Section
    with pdf.table(
        borders_layout="ALL",
        first_row_as_headings=False,
        col_widths=(30, 45, 45, 30, 25, 25),
        text_align=("C", "C", "C", "C", "C", "C"),
        line_height=5
    ) as table:
        row = table.row()
        row.cell("Offer Letter Issued\n[ ]", style=bg_gray)
        row.cell("Offer Communication Message\n[ ]", style=bg_gray)
        row.cell("Offer Communication Call\nAccepted [ ]   Rejected [ ]", style=bg_gray)
        row.cell("Document Carry Message\n[ ]", style=bg_gray)
        row.cell("Follow Up\nCall (N-1)\n[ ]", style=bg_gray)
        row.cell("Date Of Joining", style=bold_bg_gray)
        
    # --- PAGE 2 ---
    pdf.add_page()
    pdf.set_margins(left=10, top=10, right=10)
    pdf.set_auto_page_break(auto=True, margin=10)
    
    # Logo
    if os.path.exists(logo_path):
        pdf.image(logo_path, x=10, y=10, w=12)
        
    pdf.set_font("Roboto", "B", 10)
    pdf.set_xy(30, 15)
    pdf.cell(100, 5, "NIPPON MOTORS PVT LTD,KALAMASSERY")
    
    pdf.set_xy(160, 10)
    pdf.set_font("Roboto", "", 8)
    pdf.cell(30, 5, "N/24/2083", border=1, align="C")
    
    pdf.ln(10)
    
    with pdf.table(
        borders_layout="ALL",
        first_row_as_headings=False,
        col_widths=(100, 100),
        text_align=("L", "C"),
        line_height=5
    ) as table:
        row = table.row()
        row.cell("HUMAN RESOURCES DEPARTMENT", colspan=2, align="C", style=bold_bg_gray)
        row = table.row()
        row.cell("SALARY PROPOSAL - NIPPON", colspan=2, align="C", style=bold_style)
        
        row = table.row()
        row.cell("Name")
        row.cell(s(candidate.get("full_name", "")))
        
        row = table.row()
        row.cell("Level")
        row.cell("")
        
        row = table.row()
        row.cell("Proposed Date of Joining")
        row.cell("")
        
        row = table.row()
        row.cell("Department")
        row.cell(s(candidate.get("position_applied_for", "")))
        
        row = table.row()
        row.cell("Designation")
        row.cell("")
        
        row = table.row()
        row.cell("Branch")
        row.cell("")
        
        row = table.row()
        row.cell("Last Salary", style=FontFace(emphasis="B", fill_color=(255, 255, 255)))
        row.cell("NA")
        
        row = table.row()
        row.cell("Candidate expected salary", style=bold_style)
        row.cell(s(str(raw_data.get("expectedSalary", "NA"))), style=bold_style)
        
        row = table.row()
        row.cell("Total Experience", style=bold_style)
        row.cell(s(str(raw_data.get("totalExperience", "NA"))), style=bold_style)
        
        row = table.row()
        row.cell("Relevant Experience", style=bold_style)
        row.cell("NA", style=bold_style)

    pdf.ln(2)
    with pdf.table(
        borders_layout="ALL",
        first_row_as_headings=False,
        col_widths=(100, 50, 50),
        text_align=("L", "R", "R"),
        line_height=5
    ) as table:
        row = table.row()
        row.cell("SALARY BREAK UP", style=bold_bg_gray)
        row.cell("PROPOSAL", colspan=2, align="C", style=bold_bg_gray)
        
        row = table.row()
        row.cell("REF No.", style=bg_gray)
        row.cell("NA", colspan=2, align="C", style=bg_gray)
        
        row = table.row()
        row.cell("BASIC+DA")
        row.cell("NA")
        row.cell("NA")
        
        row = table.row()
        row.cell("HRA")
        row.cell("NA")
        row.cell("NA")
        
        row = table.row()
        row.cell("TRAVEL")
        row.cell("NA")
        row.cell("NA")
        
        row = table.row()
        row.cell("HOSTEL")
        row.cell("-", align="C")
        row.cell("-", align="C")
        
        row = table.row()
        row.cell("CHILDREN EDUCATION")
        row.cell("-", align="C")
        row.cell("-", align="C")
        
        row = table.row()
        row.cell("TOTAL SALARY", style=bold_bg_gray)
        row.cell("NA", style=bold_bg_gray)
        row.cell("NA", style=bold_bg_gray)
        
        row = table.row()
        row.cell("CONVEYANCE")
        row.cell("-", align="C")
        row.cell("-", align="C")
        
        row = table.row()
        row.cell("MOBILE")
        row.cell("-", align="C")
        row.cell("-", align="C")
        
        row = table.row()
        row.cell("BRANCH ALLOWANCE")
        row.cell("-", align="C")
        row.cell("-", align="C")
        
        row = table.row()
        row.cell("TOTAL ALLOWANCE", style=bold_bg_gray)
        row.cell("-", align="C", style=bold_bg_gray)
        row.cell("-", align="C", style=bold_bg_gray)
        
        row = table.row()
        row.cell("TOTAL SALARY + ALLOWANCE", style=bold_bg_gray)
        row.cell("NA", style=bold_bg_gray)
        row.cell("NA", style=bold_bg_gray)
        
        row = table.row()
        row.cell("FIXED INCENTIVE")
        row.cell("NA")
        row.cell("NA")
        
        row = table.row()
        row.cell("TOTAL INCENTIVE", style=bold_bg_gray)
        row.cell("NA", style=bold_bg_gray)
        row.cell("NA", style=bold_bg_gray)
        
        row = table.row()
        row.cell("Incentive Remarks")
        row.cell("NA", colspan=2, align="C")
        
        row = table.row()
        row.cell("GROSS SALARY", style=bold_bg_gray)
        row.cell("NA", style=bold_bg_gray)
        row.cell("NA", style=bold_bg_gray)
        
        row = table.row()
        row.cell("For PF calculation (Basic+Da) limited to 15000/-", colspan=3)
        
        row = table.row()
        row.cell("EMPLOYEE EPF", style=bold_bg_gray)
        row.cell("NA", style=bold_bg_gray)
        row.cell("NA", style=bold_bg_gray)
        
        row = table.row()
        row.cell("EMPLOYEE ESI CONTRIBUTION", style=bold_bg_gray)
        row.cell("NA", style=bold_bg_gray)
        row.cell("NA", style=bold_bg_gray)
        
        row = table.row()
        row.cell("TOTAL", style=bold_bg_gray)
        row.cell("NA", style=bold_bg_gray)
        row.cell("NA", style=bold_bg_gray)
        
        row = table.row()
        row.cell("TAKE HOME AFTER DEDUCTION", style=bold_bg_gray)
        row.cell("NA", style=bold_bg_gray)
        row.cell("NA", style=bold_bg_gray)
        
        row = table.row()
        row.cell("EMPLOYER EPF", style=bold_bg_gray)
        row.cell("NA", style=bold_bg_gray)
        row.cell("NA", style=bold_bg_gray)
        
        row = table.row()
        row.cell("EMPLOYER ESI CONTRIBUTION", style=bold_bg_gray)
        row.cell("NA", style=bold_bg_gray)
        row.cell("NA", style=bold_bg_gray)
        
        row = table.row()
        row.cell("BONUS (Monthly) - Eligibility after completion of 1 year", style=bold_bg_gray)
        row.cell("NA", style=bold_bg_gray)
        row.cell("NA", style=bold_bg_gray)
        
        row = table.row()
        row.cell("GRATUITY - As per Statutory norms", style=bold_bg_gray)
        row.cell("NA", style=bold_bg_gray)
        row.cell("NA", style=bold_bg_gray)
        
        row = table.row()
        row.cell("MONTHLY CTC", style=bold_bg_gray)
        row.cell("NA", style=bold_bg_gray)
        row.cell("NA", style=bold_bg_gray)

    # Signatures
    pdf.ln(5)
    pdf.cell(100, 5, "Prepared By")
    pdf.cell(90, 5, "Checked By")
    pdf.ln(5)
    pdf.cell(100, 5, "_______________________")
    pdf.cell(90, 5, "Jerry Jacob Mathew")
    pdf.ln(5)
    pdf.cell(100, 5, "HRD")
    
    pdf.ln(10)
    pdf.set_font("Roboto", "I", 8)
    pdf.cell(0, 5, "DECLARATION BY THE CANDIDATE", align="C", ln=1)
    pdf.cell(0, 5, "I here declare that I'm fully aware of the salary details explained to me", ln=1)
    
    pdf.ln(15)
    pdf.cell(50, 5, "_______________________", ln=0)
    pdf.cell(140, 5, "______________________________________________________", ln=1)
    pdf.cell(50, 5, "Date", ln=0)
    pdf.cell(140, 5, "Name & Signature of the candidate", ln=1)
    
    # --- PAGE 3 ---
    pdf.add_page()
    pdf.set_margins(left=10, top=10, right=10)
    pdf.set_auto_page_break(auto=True, margin=10)
    
    if os.path.exists(logo_path):
        pdf.image(logo_path, x=10, y=10, w=10)
        
    pdf.set_font("Roboto", "B", 12)
    pdf.set_xy(25, 12)
    pdf.cell(100, 5, "TOYOTA")
    pdf.set_xy(25, 17)
    pdf.set_font("Roboto", "", 8)
    pdf.cell(100, 5, "NIPPON MOTOR CORPORATION (P) LTD.")
    
    pdf.ln(10)
    pdf.set_font("Roboto", "B", 10)
    pdf.cell(0, 8, "Human Resources Department", align="C", ln=1)
    pdf.set_fill_color(243, 244, 246)
    pdf.cell(0, 8, "Background Verification", align="C", fill=True, ln=1)
    
    pdf.set_font("Roboto", "", 8)
    with pdf.table(
        borders_layout="ALL",
        first_row_as_headings=False,
        col_widths=(40, 50, 20, 40, 40),
        text_align=("L", "C", "C", "C", "R"),
        line_height=5
    ) as table:
        row = table.row()
        row.cell("Name of the candidate", style=bold_style)
        row.cell(s(candidate.get("full_name", "")))
        row.cell("Mobile No", style=bold_style)
        row.cell(s(candidate.get("phone", "")))
        row.cell(s(f"Date: {format_date('')}"), rowspan=2, align="R")
        
        row = table.row()
        row.cell("Post Applied", style=bold_style)
        row.cell(s(candidate.get("position_applied_for", "")))
        row.cell("Nippon Branch", colspan=2, style=bold_style)

    pdf.ln(2)
    with pdf.table(
        borders_layout="ALL",
        first_row_as_headings=False,
        col_widths=(60, 35, 60, 35),
        text_align=("L", "C", "L", "C"),
        line_height=5
    ) as table:
        row = table.row()
        row.cell("LOCALITY FEEDBACK", colspan=4, align="C", style=bold_bg_gray)
        
        row = table.row()
        row.cell("Name of the Panchayath / Muncipality / Corporation", colspan=2, style=bg_gray)
        row.cell("", colspan=2)
        
        row = table.row()
        row.cell("Name of the Councillor", style=bg_gray)
        row.cell("")
        row.cell("Name of Panchayath member", style=bg_gray)
        row.cell("")
        
        row = table.row()
        row.cell("Contact No :", style=bg_gray)
        row.cell("")
        row.cell("Contact No :", style=bg_gray)
        row.cell("")
        
        row = table.row()
        row.cell("Any issue that has been updated till date (Yes / No )", colspan=2, style=bg_gray)
        row.cell("", colspan=2)
        
        row = table.row()
        row.cell("If yes specify", style=bg_gray)
        row.cell("", colspan=3)
        
        row = table.row()
        row.cell("Any Police Case Reported (Yes / No )", colspan=2, style=bg_gray)
        row.cell("", colspan=2)
        
        row = table.row()
        row.cell("If yes specify", style=bg_gray)
        row.cell("", colspan=3)
        
        row = table.row()
        row.cell("Any kind of family issues (Yes / No )", colspan=2, style=bg_gray)
        row.cell("", colspan=2)
        
        row = table.row()
        row.cell("If yes specify", style=bg_gray)
        row.cell("", colspan=3)
        
        row = table.row()
        row.cell("Over all feedback", style=bold_bg_gray)
        row.cell("", colspan=3)

    pdf.ln(2)
    with pdf.table(
        borders_layout="ALL",
        first_row_as_headings=False,
        col_widths=(60, 35, 60, 35),
        text_align=("L", "C", "L", "C"),
        line_height=5
    ) as table:
        row = table.row()
        row.cell("SOCIAL MEDIA EVALUATION", colspan=4, align="C", style=bold_bg_gray)
        
        row = table.row()
        row.cell("Name in Facebook", style=bold_bg_gray)
        row.cell(s(raw_data.get("facebookUrl", "NA")))
        row.cell("Name in Instagram", style=bold_bg_gray)
        row.cell("Tauraus Connetions", style=bold_bg_gray)
        
        row = table.row()
        row.cell("Any kind of political interference in his personal charge (yes / No )", colspan=3, style=bg_gray)
        row.cell("")
        
        row = table.row()
        row.cell("If yes - which political side", colspan=2, style=bg_gray)
        row.cell("", colspan=2)
        
        row = table.row()
        row.cell("What are the kind of shared / liked pages", colspan=2, style=bg_gray)
        row.cell("", colspan=2)
        
        row = table.row()
        row.cell("In Instagram / facebook who all are the followers", colspan=2, style=bg_gray)
        row.cell("", colspan=2)
        
        row = table.row()
        row.cell("Past 4 years what all are his following pages", colspan=2, style=bg_gray)
        row.cell("", colspan=2)
        
        row = table.row()
        row.cell("Whether the candidate is active in social media (Yes/No)", colspan=3, style=bg_gray)
        row.cell("")
        
        row = table.row()
        row.cell("Over all feedback", style=bold_bg_gray)
        row.cell("Active in social media", colspan=3)

    pdf.ln(2)
    with pdf.table(
        borders_layout="ALL",
        first_row_as_headings=False,
        col_widths=(50, 45, 50, 45),
        text_align=("L", "C", "L", "C"),
        line_height=5
    ) as table:
        row = table.row()
        row.cell("Feedback from previous Employer", colspan=4, align="C", style=FontFace(emphasis="B", fill_color=(102, 102, 102), color=(255, 255, 255)))
        
        row = table.row()
        row.cell("Employer Name", style=bg_gray)
        row.cell(s(raw_data.get("prev1Name", "NA")))
        row.cell("Designation", style=bg_gray)
        row.cell(s(raw_data.get("prev1Position", "NA")))
        
        row = table.row()
        row.cell("Period of Employment", style=bg_gray)
        row.cell("From", style=bold_style)
        row.cell(s(raw_data.get("prev1From", "NA")))
        row.cell("To", style=bold_style)
        # We need an extra column for 'To' actually, but it's simpler to merge if we change col sizes.
        # Since table has 4 columns:
        # Col 1: Period, Col 2: From, Col 3: FromDate, Col 4: ToDate -> wait, the html was 5 columns.
        
    with pdf.table(
        borders_layout="ALL",
        first_row_as_headings=False,
        col_widths=(70, 40, 50, 30),
        text_align=("L", "C", "L", "C"),
        line_height=5
    ) as table:
        row = table.row()
        row.cell("Name of Contacted Person For Verification", style=bg_gray)
        row.cell("Drishya")
        row.cell("Designation of contacted person", style=bg_gray)
        row.cell("HR")
        
        row = table.row()
        row.cell("Contacted person Mob No :", style=bg_gray)
        row.cell("9633431909", colspan=3)
        
        row = table.row()
        row.cell("Employee - Employer Rapport", style=bg_gray)
        row.cell("Very Good", colspan=3)
        
        row = table.row()
        row.cell("Any Financial Loans & Advances taken by the candidate (Yes / No)", colspan=2, style=bg_gray)
        row.cell("", colspan=2)
        
        row = table.row()
        row.cell("If yes specify", style=bg_gray)
        row.cell("", colspan=3)
        
        row = table.row()
        row.cell("If Any long leaves Taken (Yes / No)", colspan=2, style=bg_gray)
        row.cell("", colspan=2)
        
        row = table.row()
        row.cell("Over all feedback", style=bold_bg_gray)
        row.cell("Good employee and also good customer supports", colspan=3)

    pdf.ln(5)
    with pdf.table(
        borders_layout="ALL",
        first_row_as_headings=False,
        col_widths=(63, 63, 64),
        text_align=("C", "C", "C"),
        line_height=5
    ) as table:
        row = table.row()
        row.cell("Prepared By", style=bold_bg_gray)
        row.cell("Checked By", style=bold_bg_gray)
        row.cell("Checked By", style=bold_bg_gray)
        
        row = table.row()
        row.cell("Bijo M Joseph")
        row.cell("Sreehari S")
        row.cell("Naveen C")
        
        row = table.row()
        row.cell("HRD", style=bold_bg_gray)
        row.cell("HRD", style=bold_bg_gray)
        row.cell("HRD", style=bold_bg_gray)


    return pdf.output(dest="S")

def generate_dynamic_form_pdf(payload: dict) -> bytes:
    pdf = ToyotaPDF(format="A4")
    pdf.add_page()
    pdf.set_margins(left=15, top=15, right=15)
    pdf.set_auto_page_break(auto=True, margin=15)
    
    # 1. Header Block
    logo_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../../frontend/public/nippon-toyota-logo.png"))
    if os.path.exists(logo_path):
        pdf.image(logo_path, x=175, y=15, w=20)
        
    pdf.set_font("Roboto", "B", 24)
    pdf.set_text_color(0, 0, 0)
    pdf.cell(140, 10, "NIPPON TOYOTA", ln=1)
    
    pdf.set_font("Roboto", "B", 10)
    pdf.set_text_color(80, 80, 80)
    # simulate tracking-widest
    pdf.cell(140, 6, "H U M A N   R E S O U R C E S   D E P A R T M E N T", ln=1)
    
    pdf.ln(6)
    pdf.set_draw_color(0, 0, 0)
    pdf.line(15, pdf.get_y(), 195, pdf.get_y())
    pdf.ln(6)
    
    # 2. Form Title Block
    pdf.set_fill_color(243, 244, 246) # bg-gray-100
    pdf.set_draw_color(200, 200, 200)
    start_y = pdf.get_y()
    
    # We will draw a rect manually or just use cells.
    # Title "CANDIDATE APPLICATION FORM"
    pdf.set_font("Roboto", "B", 14)
    pdf.set_text_color(0, 0, 0)
    pdf.cell(180, 10, "CANDIDATE APPLICATION FORM", border="LRT", align="C", fill=True, ln=1)
    
    # A manual thin line
    pdf.set_draw_color(220, 220, 220)
    pdf.line(15, pdf.get_y(), 195, pdf.get_y())
    
    # Candidate info line
    pdf.set_font("Roboto", "B", 8)
    pdf.set_text_color(100, 100, 100)
    pdf.set_draw_color(200, 200, 200)
    
    subtitle = s(payload.get("subtitle", ""))
    # Parse subtitle for "Candidate Name: XXX" and we also need Submitted On, but let's just dump subtitle for now.
    
    pdf.cell(25, 8, "CANDIDATE NAME:", border="L", fill=True)
    pdf.set_text_color(0, 0, 0)
    name_part = subtitle.replace("Candidate Name:", "").strip() if "Candidate Name:" in subtitle else subtitle
    pdf.cell(85, 8, name_part, border="", fill=True)
    
    pdf.set_text_color(100, 100, 100)
    pdf.cell(25, 8, "SUBMITTED ON:", border="", fill=True)
    pdf.set_text_color(0, 0, 0)
    # just use current date if not available, or extract
    import datetime
    today_str = datetime.datetime.now().strftime("%d-%b-%Y")
    pdf.cell(45, 8, today_str, border="R", fill=True, ln=1)
    
    pdf.set_draw_color(200, 200, 200)
    pdf.line(15, pdf.get_y(), 195, pdf.get_y())
    pdf.ln(8)
    
    # 3. Sections with 3-column grid
    sections = payload.get("sections", [])
    
    for idx, section in enumerate(sections):
        if idx > 0:
            pdf.set_draw_color(220, 220, 220)
            pdf.line(15, pdf.get_y(), 195, pdf.get_y())
            pdf.ln(4)
            
        pdf.set_font("Roboto", "B", 9)
        pdf.set_text_color(7, 94, 84) # #075E54
        pdf.cell(0, 6, s(section.get("heading", "")).upper(), ln=1)
        pdf.ln(2)
        
        items = section.get("items", {})
        items_list = list(items.items())
        
        col_w = 58
        gutter = 3
        
        # We process in chunks of 3
        for i in range(0, len(items_list), 3):
            # check page break
            if pdf.get_y() > 260:
                pdf.add_page()
                
            chunk = items_list[i:i+3]
            start_x = 15
            y_top = pdf.get_y()
            
            # First pass: find max height needed for this row
            max_h = 14
            for k, v in chunk:
                v_str = s(str(v))
                if len(v_str) > 30 or "\n" in v_str:
                    max_h = max(max_h, 20) # Just a simple heuristic
                    
            # Draw the cells
            for j, (k, v) in enumerate(chunk):
                x = start_x + j * (col_w + gutter)
                pdf.set_xy(x, y_top)
                
                # Draw rounded-like box (fpdf2 cell border)
                pdf.set_fill_color(249, 249, 249) # very light gray
                pdf.set_draw_color(230, 230, 230)
                pdf.cell(col_w, max_h, "", border=1, fill=True)
                
                # Draw Key
                pdf.set_xy(x + 2, y_top + 2)
                pdf.set_font("Roboto", "B", 7)
                pdf.set_text_color(115, 115, 115) # text-muted-foreground
                
                # formatting key like camelCase to Title Case
                import re
                formatted_key = re.sub(r'([A-Z])', r' \1', k)
                formatted_key = formatted_key.replace('_', ' ').strip().upper()
                pdf.cell(col_w - 4, 4, formatted_key)
                
                # Draw Value
                pdf.set_xy(x + 2, y_top + 6)
                pdf.set_font("Roboto", "B", 9)
                pdf.set_text_color(0, 0, 0)
                pdf.multi_cell(col_w - 4, 4, s(str(v)), align="L")
                
            pdf.set_xy(15, y_top + max_h + 3)
            
        pdf.ln(3)

    return pdf.output(dest="S")

@router.post("/tech-test")
async def generate_tech_test(request: Request):
    payload = await request.json()
    pdf_bytes = generate_tech_test_pdf(payload)
    return Response(
        content=bytes(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": 'attachment; filename="TechTest.pdf"'}
    )

@router.post("/candidate-summary")
async def generate_candidate_summary(request: Request):
    payload = await request.json()
    pdf_bytes = generate_candidate_summary_pdf(payload)
    return Response(
        content=bytes(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": 'attachment; filename="CandidateSummary.pdf"'}
    )

@router.post("/dynamic-form")
async def generate_dynamic_form(request: Request):
    try:
        payload = await request.json()
        pdf_bytes = generate_dynamic_form_pdf(payload)
        return Response(
            content=bytes(pdf_bytes),
            media_type="application/pdf",
            headers={"Content-Disposition": 'attachment; filename="Form.pdf"'}
        )
    except Exception as e:
        import traceback
        with open("pdf_error.log", "w") as err_f:
            err_f.write(traceback.format_exc())
            err_f.write(str(payload))
        raise e
