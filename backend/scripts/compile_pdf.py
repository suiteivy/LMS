"""
High-fidelity institutional PDF compiler using ReportLab.
Compiles genuine vector PDFs with selectable text, institutional branding,
custom layouts, and precise pagination.
"""

import sys
import json
import os
import base64
from datetime import datetime
from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.units import inch, cm, mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    KeepTogether, HRFlowable, Image as RLImage
)
from reportlab.pdfgen import canvas

ORANGE_PRIMARY = colors.HexColor("#FF6900")
ORANGE_DARK = colors.HexColor("#CC5500")
NAVY_DARK = colors.HexColor("#161B22")
BORDER_COLOR = colors.HexColor("#D0D7DE")
BG_LIGHT = colors.HexColor("#F6F8FA")
TEXT_MUTED = colors.HexColor("#57606A")
TEXT_DARK = colors.HexColor("#24292F")
SUCCESS_GREEN = colors.HexColor("#1A7F37")
DANGER_RED = colors.HexColor("#CF222E")
AMBER_WARN = colors.HexColor("#9A6700")

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_number(num_pages)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

    def draw_page_number(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(TEXT_MUTED)
        page_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(A4[0] - 15 * mm, 12 * mm, page_text)
        self.drawString(15 * mm, 12 * mm, "CONFIDENTIAL & OFFICIAL INSTITUTIONAL RECORD — DIGITALLY COMPILED")
        self.setStrokeColor(BORDER_COLOR)
        self.setLineWidth(0.5)
        self.line(15 * mm, 16 * mm, A4[0] - 15 * mm, 16 * mm)
        self.restoreState()


def build_header(inst_name, doc_title, doc_subtitle=None, ref_no=None, date_str=None):
    styles = getSampleStyleSheet()
    header_elements = []

    inst_style = ParagraphStyle(
        'InstTitle',
        fontName='Helvetica-Bold',
        fontSize=15,
        leading=18,
        textColor=NAVY_DARK,
        alignment=0
    )
    doc_style = ParagraphStyle(
        'DocTitle',
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=ORANGE_PRIMARY,
        alignment=0
    )
    sub_style = ParagraphStyle(
        'DocSub',
        fontName='Helvetica',
        fontSize=9,
        leading=12,
        textColor=TEXT_MUTED,
        alignment=0
    )
    meta_style = ParagraphStyle(
        'DocMeta',
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=TEXT_DARK,
        alignment=2
    )

    left_cells = [
        Paragraph(inst_name.upper(), inst_style),
        Spacer(1, 2 * mm),
        Paragraph(doc_title, doc_style),
    ]
    if doc_subtitle:
        left_cells.append(Paragraph(doc_subtitle, sub_style))

    right_text = []
    if ref_no:
        right_text.append(f"<b>Ref:</b> {ref_no}")
    right_text.append(f"<b>Date:</b> {date_str or datetime.now().strftime('%d %b %Y')}")
    right_text.append(f"<b>Status:</b> <font color='#1A7F37'><b>OFFICIAL</b></font>")

    right_cell = [Paragraph("<br/>".join(right_text), meta_style)]

    table_data = [[left_cells, right_cell]]
    header_table = Table(table_data, colWidths=[115 * mm, 65 * mm])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
    ]))

    header_elements.append(header_table)
    header_elements.append(Spacer(1, 4 * mm))
    header_elements.append(HRFlowable(width="100%", thickness=1.5, color=ORANGE_PRIMARY, spaceBefore=0, spaceAfter=5*mm))
    return header_elements


def compile_clearance_confirmation(data):
    user = data.get("user", {})
    inst_name = data.get("institution_name", "Academic Institution")
    process = data.get("process", {})

    ref_no = f"CLR-{process.get('id', 'N/A')[:8].upper()}"
    elements = build_header(
        inst_name=inst_name,
        doc_title="Clearance Certificate",
        doc_subtitle="Official Confirmation of Institutional Departure & Record Clearance",
        ref_no=ref_no,
        date_str=process.get("completed_at", "")[:10] or datetime.now().strftime("%Y-%m-%d")
    )

    styles = getSampleStyleSheet()
    label_style = ParagraphStyle('Lbl', fontName='Helvetica-Bold', fontSize=9, textColor=TEXT_MUTED)
    val_style = ParagraphStyle('Val', fontName='Helvetica', fontSize=9.5, textColor=TEXT_DARK)
    badge_cleared = Paragraph("<font color='#1A7F37'><b>CLEARED</b></font>", val_style)

    # 1. User Summary Block
    user_info = [
        [Paragraph("Full Name", label_style), Paragraph(user.get("full_name", "Unknown"), val_style),
         Paragraph("Role", label_style), Paragraph(process.get("user_role", "Student").capitalize(), val_style)],
        [Paragraph("Identifier / ID", label_style), Paragraph(user.get("id", "N/A"), val_style),
         Paragraph("Reason Category", label_style), Paragraph(str(process.get("reason_category", "Leaving")).replace("_", " ").title(), val_style)],
        [Paragraph("Leaving Date", label_style), Paragraph(str(process.get("completed_at", "")[:10] or "N/A"), val_style),
         Paragraph("Clearance State", label_style), Paragraph("<font color='#1A7F37'><b>COMPLETED & ARCHIVED</b></font>", val_style)],
    ]
    user_table = Table(user_info, colWidths=[35*mm, 55*mm, 35*mm, 55*mm])
    user_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), BG_LIGHT),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(user_table)
    elements.append(Spacer(1, 6 * mm))

    # 2. Independent Clearance Verification Table
    sec_heading = ParagraphStyle('SecH', fontName='Helvetica-Bold', fontSize=12, textColor=NAVY_DARK)
    elements.append(Paragraph("Category Clearance Verifications", sec_heading))
    elements.append(Spacer(1, 2.5 * mm))

    cat_data = [
        [Paragraph("<b>Clearance Category</b>", label_style),
         Paragraph("<b>Verification Criteria</b>", label_style),
         Paragraph("<b>Status</b>", label_style),
         Paragraph("<b>Audited Notes / Reference</b>", label_style)],
        [
            Paragraph("<b>Library & Media Center</b>", val_style),
            Paragraph("No overdue, unreturned, or damaged books", val_style),
            badge_cleared,
            Paragraph(process.get("library_notes") or "Verified zero outstanding items", val_style)
        ],
        [
            Paragraph("<b>Bursar & Finance Office</b>", val_style),
            Paragraph("All fees, dues, and account balances settled", val_style),
            badge_cleared,
            Paragraph(process.get("finance_notes") or "Account audited; zero balance confirmed", val_style)
        ],
        [
            Paragraph("<b>Property & Equipment</b>", val_style),
            Paragraph("All keys, lab items, uniforms & devices returned", val_style),
            badge_cleared,
            Paragraph(process.get("property_notes") or "All institutional property accounted for", val_style)
        ],
        [
            Paragraph("<b>Registrar / Administration</b>", val_style),
            Paragraph("Student/Staff lifecycle updated to archived state", val_style),
            badge_cleared,
            Paragraph(process.get("override_reason") or "Completed standard clearance gate checks", val_style)
        ],
    ]
    cat_table = Table(cat_data, colWidths=[45*mm, 55*mm, 25*mm, 55*mm])
    cat_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#EAEEF2")),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(cat_table)
    elements.append(Spacer(1, 6 * mm))

    # 3. Certificate Declaration Box
    decl_style = ParagraphStyle(
        'Decl',
        fontName='Helvetica',
        fontSize=9.5,
        leading=14,
        textColor=TEXT_DARK
    )
    declaration_text = (
        f"This document formally certifies that <b>{user.get('full_name', 'the named user')}</b> has fully satisfied all "
        f"clearance obligations with <b>{inst_name}</b> as of <b>{process.get('completed_at', '')[:10] or datetime.now().strftime('%Y-%m-%d')}</b>. "
        "All academic, monetary, library, and institutional assets have been surrendered or discharged in full compliance "
        "with the institutional clearance policy. The user account has been successfully transitioned to its official archived state."
    )
    box_data = [[Paragraph(declaration_text, decl_style)]]
    box_table = Table(box_data, colWidths=[180*mm])
    box_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#F0FDF4")),
        ('BOX', (0, 0), (-1, -1), 1, SUCCESS_GREEN),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
    ]))
    elements.append(box_table)
    elements.append(Spacer(1, 10 * mm))

    # 4. Signatures
    sig_style = ParagraphStyle('SigTitle', fontName='Helvetica-Bold', fontSize=9, textColor=NAVY_DARK, alignment=1)
    sub_sig = ParagraphStyle('SigSub', fontName='Helvetica', fontSize=8, textColor=TEXT_MUTED, alignment=1)
    sig_data = [
        [
            [Paragraph("________________________________", sig_style), Spacer(1, 2*mm), Paragraph("Head of Institution / Principal", sig_style), Paragraph("Authorized Signature & Seal", sub_sig)],
            [Paragraph("________________________________", sig_style), Spacer(1, 2*mm), Paragraph("Registrar / Academic Administrator", sig_style), Paragraph("Verification Officer", sub_sig)],
        ]
    ]
    sig_table = Table(sig_data, colWidths=[90*mm, 90*mm])
    sig_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
    ]))
    elements.append(sig_table)

    return elements


def compile_violation_summary(data):
    violation = data.get("violation", {})
    student = data.get("student", {})
    inst_name = data.get("institution_name", "Academic Institution")

    ref_no = f"VIO-{violation.get('id', 'N/A')[:8].upper()}"
    elements = build_header(
        inst_name=inst_name,
        doc_title="Disciplinary Incident Summary",
        doc_subtitle="Official Record of Student Disciplinary Event & Action",
        ref_no=ref_no,
        date_str=violation.get("incident_date") or datetime.now().strftime("%Y-%m-%d")
    )

    styles = getSampleStyleSheet()
    label_style = ParagraphStyle('Lbl', fontName='Helvetica-Bold', fontSize=9, textColor=TEXT_MUTED)
    val_style = ParagraphStyle('Val', fontName='Helvetica', fontSize=9.5, textColor=TEXT_DARK)

    # Student metadata
    stu_info = [
        [Paragraph("Student Name", label_style), Paragraph(student.get("full_name", "Student Name"), val_style),
         Paragraph("Admission No.", label_style), Paragraph(student.get("admission_number") or student.get("id", "N/A"), val_style)],
        [Paragraph("Class / Grade", label_style), Paragraph(student.get("class_name", "Class"), val_style),
         Paragraph("Incident Date", label_style), Paragraph(violation.get("incident_date", "N/A"), val_style)],
        [Paragraph("Violation Type", label_style), Paragraph(f"<b>{str(violation.get('violation_type', 'General')).replace('_', ' ').upper()}</b>", val_style),
         Paragraph("Severity Level", label_style), Paragraph(f"<b>{str(violation.get('severity', 'Medium')).upper()}</b>", val_style)],
    ]
    stu_table = Table(stu_info, colWidths=[35*mm, 55*mm, 35*mm, 55*mm])
    stu_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), BG_LIGHT),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(stu_table)
    elements.append(Spacer(1, 6 * mm))

    # Incident Details Box
    sec_heading = ParagraphStyle('SecH', fontName='Helvetica-Bold', fontSize=12, textColor=NAVY_DARK)
    elements.append(Paragraph("Incident Title & Description", sec_heading))
    elements.append(Spacer(1, 2 * mm))

    desc_style = ParagraphStyle('Desc', fontName='Helvetica', fontSize=9.5, leading=14, textColor=TEXT_DARK)
    title_p = Paragraph(f"<b>{violation.get('title', 'Disciplinary Incident')}</b>", ParagraphStyle('VT', fontName='Helvetica-Bold', fontSize=11, textColor=NAVY_DARK))
    desc_p = Paragraph(violation.get("description", "No description provided."), desc_style)

    box_data = [[title_p], [desc_p]]
    desc_table = Table(box_data, colWidths=[180*mm])
    desc_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), BG_LIGHT),
        ('BOX', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(desc_table)
    elements.append(Spacer(1, 6 * mm))

    # Action Taken & Administrative Decision
    elements.append(Paragraph("Corrective Action Taken & Sanctions", sec_heading))
    elements.append(Spacer(1, 2 * mm))

    action_text = violation.get("action_taken") or "Incident logged for administrative follow-up."
    action_table = Table([[Paragraph(action_text, desc_style)]], colWidths=[180*mm])
    action_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#FEF3C7") if violation.get("severity") in ["high", "critical"] else BG_LIGHT),
        ('BOX', (0, 0), (-1, -1), 1, AMBER_WARN if violation.get("severity") in ["high", "critical"] else BORDER_COLOR),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(action_table)
    elements.append(Spacer(1, 8 * mm))

    # Signatures
    sig_style = ParagraphStyle('SigTitle', fontName='Helvetica-Bold', fontSize=9, textColor=NAVY_DARK, alignment=1)
    sub_sig = ParagraphStyle('SigSub', fontName='Helvetica', fontSize=8, textColor=TEXT_MUTED, alignment=1)
    sig_data = [
        [
            [Paragraph("________________________________", sig_style), Spacer(1, 2*mm), Paragraph("Disciplinary Committee / Dean", sig_style), Paragraph("Official Signature", sub_sig)],
            [Paragraph("________________________________", sig_style), Spacer(1, 2*mm), Paragraph("Principal / Head of Institution", sig_style), Paragraph("Administrative Endorsement", sub_sig)],
        ]
    ]
    sig_table = Table(sig_data, colWidths=[90*mm, 90*mm])
    elements.append(sig_table)
    return elements


def compile_institutional_summary(data):
    user = data.get("user", {})
    inst_name = data.get("institution_name", "Academic Institution")
    summary = data.get("summary", {})
    role = summary.get("role", "student").lower()

    ref_no = f"SUM-{user.get('id', 'N/A')[:8].upper()}"
    elements = build_header(
        inst_name=inst_name,
        doc_title=f"Institutional Summary — {role.capitalize()}",
        doc_subtitle="Official Retrospective Record of Institutional Tenure & Engagement",
        ref_no=ref_no,
        date_str=datetime.now().strftime("%Y-%m-%d")
    )

    styles = getSampleStyleSheet()
    label_style = ParagraphStyle('Lbl', fontName='Helvetica-Bold', fontSize=9, textColor=TEXT_MUTED)
    val_style = ParagraphStyle('Val', fontName='Helvetica', fontSize=9.5, textColor=TEXT_DARK)

    # Core Person Info
    person_info = [
        [Paragraph("Full Name", label_style), Paragraph(user.get("full_name", "User Name"), val_style),
         Paragraph("Institutional Role", label_style), Paragraph(role.capitalize(), val_style)],
        [Paragraph("Identifier / ID", label_style), Paragraph(user.get("id", "N/A"), val_style),
         Paragraph("Status", label_style), Paragraph(f"<b>{user.get('status', 'Active').capitalize()}</b>", val_style)],
        [Paragraph("Tenure Start", label_style), Paragraph(summary.get("start_date", "N/A"), val_style),
         Paragraph("Tenure Exit / Current", label_style), Paragraph(summary.get("end_date") or "Currently Active", val_style)],
    ]
    p_table = Table(person_info, colWidths=[35*mm, 55*mm, 35*mm, 55*mm])
    p_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), BG_LIGHT),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(p_table)
    elements.append(Spacer(1, 6 * mm))

    sec_heading = ParagraphStyle('SecH', fontName='Helvetica-Bold', fontSize=12, textColor=NAVY_DARK)

    if role == "student":
        # Classes & Levels Attended
        elements.append(Paragraph("Academic Enrolment & Progression History", sec_heading))
        elements.append(Spacer(1, 2 * mm))

        hist_headers = [Paragraph("<b>Academic Year</b>", label_style), Paragraph("<b>Class / Level</b>", label_style),
                        Paragraph("<b>Term Performance (Avg)</b>", label_style), Paragraph("<b>Attendance Rate</b>", label_style)]
        rows = [hist_headers]
        classes_hist = summary.get("academic_history", [])
        if not classes_hist:
            rows.append([Paragraph("No historical records", val_style), Paragraph("—", val_style), Paragraph("—", val_style), Paragraph("—", val_style)])
        else:
            for ch in classes_hist:
                rows.append([
                    Paragraph(ch.get("year", "N/A"), val_style),
                    Paragraph(ch.get("class_name", "N/A"), val_style),
                    Paragraph(f"{ch.get('average', 'N/A')}%" if ch.get('average') is not None else "—", val_style),
                    Paragraph(f"{ch.get('attendance', 'N/A')}%" if ch.get('attendance') is not None else "—", val_style),
                ])
        h_table = Table(rows, colWidths=[40*mm, 55*mm, 45*mm, 40*mm])
        h_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#EAEEF2")),
            ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ]))
        elements.append(h_table)
        elements.append(Spacer(1, 6 * mm))

    else:
        # Teacher: Roles, Designations & Teaching Assignments
        elements.append(Paragraph("Roles, Designations & Teaching Assignments", sec_heading))
        elements.append(Spacer(1, 2 * mm))

        th_headers = [Paragraph("<b>Designation / Role</b>", label_style), Paragraph("<b>Scope / Department</b>", label_style),
                      Paragraph("<b>Assigned Date</b>", label_style), Paragraph("<b>Status</b>", label_style)]
        rows = [th_headers]
        roles_hist = summary.get("designation_history", [])
        if not roles_hist:
            rows.append([Paragraph("Classroom Teacher", val_style), Paragraph("General Faculty", val_style), Paragraph(summary.get("start_date", "N/A"), val_style), Paragraph("Active", val_style)])
        else:
            for rh in roles_hist:
                rows.append([
                    Paragraph(rh.get("role", "N/A"), val_style),
                    Paragraph(rh.get("scope", "General"), val_style),
                    Paragraph(rh.get("date", "N/A"), val_style),
                    Paragraph(rh.get("status", "Active"), val_style),
                ])
        th_table = Table(rows, colWidths=[50*mm, 55*mm, 40*mm, 35*mm])
        th_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#EAEEF2")),
            ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ]))
        elements.append(th_table)
        elements.append(Spacer(1, 6 * mm))

    # Leaving or Standing Note
    if summary.get("exit_reason"):
        elements.append(Paragraph("Departure Status & Record", sec_heading))
        elements.append(Spacer(1, 2 * mm))
        exit_p = Paragraph(f"<b>Reason for Leaving:</b> {summary.get('exit_reason')} (Date: {summary.get('end_date', 'N/A')})", val_style)
        exit_t = Table([[exit_p]], colWidths=[180*mm])
        exit_t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), BG_LIGHT),
            ('BOX', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ]))
        elements.append(exit_t)
        elements.append(Spacer(1, 8 * mm))

    # Institutional Seal
    sig_style = ParagraphStyle('SigTitle', fontName='Helvetica-Bold', fontSize=9, textColor=NAVY_DARK, alignment=1)
    sub_sig = ParagraphStyle('SigSub', fontName='Helvetica', fontSize=8, textColor=TEXT_MUTED, alignment=1)
    sig_data = [
        [
            [Paragraph("________________________________", sig_style), Spacer(1, 2*mm), Paragraph("Registrar / Academic Office", sig_style), Paragraph("Certification Authority", sub_sig)],
            [Paragraph("________________________________", sig_style), Spacer(1, 2*mm), Paragraph("Principal / Administrative Head", sig_style), Paragraph("Institutional Attestation", sub_sig)],
        ]
    ]
    sig_table = Table(sig_data, colWidths=[90*mm, 90*mm])
    elements.append(sig_table)
    return elements


def generate_pdf(doc_type, data, output_path=None):
    buffer = BytesIO() if not output_path else None
    target = output_path or buffer

    doc = SimpleDocTemplate(
        target,
        pagesize=A4,
        leftMargin=15 * mm,
        rightMargin=15 * mm,
        topMargin=15 * mm,
        bottomMargin=20 * mm,
    )

    if doc_type == "clearance_confirmation":
        story = compile_clearance_confirmation(data)
    elif doc_type == "violation_summary":
        story = compile_violation_summary(data)
    elif doc_type == "institutional_summary":
        story = compile_institutional_summary(data)
    else:
        raise ValueError(f"Unsupported document type: {doc_type}")

    doc.build(story, canvasmaker=NumberedCanvas)

    if buffer:
        buffer.seek(0)
        return buffer.getvalue()
    return None


def main():
    if len(sys.argv) < 2 or sys.argv[1] == "-":
        payload = json.loads(sys.stdin.read())
        output_file = sys.argv[2] if len(sys.argv) > 2 else None
    else:
        arg1 = sys.argv[1]
        output_file = sys.argv[2] if len(sys.argv) > 2 else None

        if os.path.exists(arg1):
            with open(arg1, "r", encoding="utf-8") as f:
                payload = json.load(f)
        else:
            payload = json.loads(arg1)

    doc_type = payload.get("document_type")
    data = payload.get("data", {})

    if output_file:
        generate_pdf(doc_type, data, output_path=output_file)
        print(json.dumps({
            "success": True,
            "output_file": output_file,
            "bytes": os.path.getsize(output_file)
        }))
    else:
        pdf_bytes = generate_pdf(doc_type, data)
        b64 = base64.b64encode(pdf_bytes).decode("ascii")
        print(json.dumps({
            "success": True,
            "size_bytes": len(pdf_bytes),
            "base64": b64
        }))


if __name__ == "__main__":
    main()
