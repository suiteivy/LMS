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


def compile_academic_transcript(data):
    branding = data.get("branding", {})
    inst_name = branding.get("name") or data.get("institution_name", "Academic Institution")
    student = data.get("student", {})
    classification = data.get("classification", "term")
    config = data.get("config", {})
    summary = data.get("summary", {})
    period_title = data.get("period_title", "Academic Record")

    doc_titles = {
        "term": "Term Academic Progress Report",
        "year": "Academic Year Progress Report",
        "overall": "Official Cumulative Academic Transcript",
    }
    doc_title = doc_titles.get(classification, "Academic Progress Report")
    ref_no = f"TRN-{student.get('id', 'N/A')[:8].upper()}-{classification.upper()}"
    date_str = data.get("generated_at", "")[:10] or datetime.now().strftime("%Y-%m-%d")

    elements = build_header(
        inst_name=inst_name,
        doc_title=doc_title,
        doc_subtitle=period_title,
        ref_no=ref_no,
        date_str=date_str
    )

    styles = getSampleStyleSheet()
    label_style = ParagraphStyle('TrnLbl', fontName='Helvetica-Bold', fontSize=8.5, textColor=TEXT_MUTED)
    val_style = ParagraphStyle('TrnVal', fontName='Helvetica', fontSize=9, textColor=TEXT_DARK)
    bold_val = ParagraphStyle('TrnBVal', fontName='Helvetica-Bold', fontSize=9, textColor=NAVY_DARK)
    sec_heading = ParagraphStyle('TrnSecH', fontName='Helvetica-Bold', fontSize=11, leading=14, textColor=NAVY_DARK)
    sub_heading = ParagraphStyle('TrnSubH', fontName='Helvetica-Bold', fontSize=9.5, leading=12, textColor=ORANGE_DARK)
    small_text = ParagraphStyle('TrnSm', fontName='Helvetica', fontSize=8, leading=10, textColor=TEXT_MUTED)

    # 1. Student Summary Block
    fee_balance_info = student.get("fee_balance", {})
    show_fee = config.get("show_fee_balance", True)

    fee_cell = Paragraph(
        f"<font color='{'#1A7F37' if fee_balance_info.get('is_cleared') else '#CF222E'}'><b>{fee_balance_info.get('formatted', 'KES 0.00')}</b></font>",
        val_style
    ) if show_fee else Paragraph("Not Included in Report", small_text)

    student_rows = [
        [
            Paragraph("Student Name", label_style),
            Paragraph(student.get("full_name", "Unknown"), bold_val),
            Paragraph("Admission / ID No.", label_style),
            Paragraph(student.get("admission_number", "N/A"), bold_val)
        ],
        [
            Paragraph("Class / Form", label_style),
            Paragraph(student.get("class_name", "N/A"), val_style),
            Paragraph("Report Type", label_style),
            Paragraph(f"<font color='#FF6900'><b>{classification.upper()} REPORT</b></font>", val_style)
        ],
        [
            Paragraph("Period", label_style),
            Paragraph(period_title, val_style),
            Paragraph("Fee Balance", label_style),
            fee_cell
        ],
    ]

    student_table = Table(student_rows, colWidths=[38*mm, 52*mm, 42*mm, 48*mm])
    student_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), BG_LIGHT),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(student_table)
    elements.append(Spacer(1, 4 * mm))

    # 2. Scale-Appropriate Summary Section
    if config.get("show_summary_averages", True):
        elements.append(Paragraph("Academic Performance Summary", sec_heading))
        elements.append(Spacer(1, 1.5 * mm))

        scale_type = summary.get("scale_type", "numeric")
        if scale_type == "descriptor":
            # Descriptor Distribution Table
            desc_rows = [
                [
                    Paragraph("<b>Performance Level</b>", label_style),
                    Paragraph("<b>Code</b>", label_style),
                    Paragraph("<b>Number of Subjects</b>", label_style),
                    Paragraph("<b>Percentage</b>", label_style),
                ]
            ]
            for item in summary.get("descriptor_distribution", []):
                color_hex = item.get("color", "#161B22")
                desc_rows.append([
                    Paragraph(f"<font color='{color_hex}'><b>{item.get('level')}</b></font>", val_style),
                    Paragraph(f"<b>{item.get('short_code')}</b>", val_style),
                    Paragraph(str(item.get("count", 0)), bold_val),
                    Paragraph(f"{item.get('percentage', 0)}%", val_style),
                ])

            desc_table = Table(desc_rows, colWidths=[70*mm, 25*mm, 40*mm, 45*mm])
            desc_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), BG_LIGHT),
                ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
                ('TOPPADDING', (0, 0), (-1, -1), 3.5),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 3.5),
                ('LEFTPADDING', (0, 0), (-1, -1), 6),
                ('RIGHTPADDING', (0, 0), (-1, -1), 6),
            ]))
            elements.append(desc_table)
            elements.append(Spacer(1, 2 * mm))
            elements.append(Paragraph(f"<b>Overall Status:</b> {summary.get('headline', '')}", val_style))
        else:
            # Numeric Summary Metrics Grid
            avg_val = f"{summary.get('average_percentage')}%" if summary.get('average_percentage') is not None else "N/A"
            mean_grade = summary.get('mean_grade', 'N/A')
            gpa_str = f"{summary.get('gpa', 0.0):.2f} / {summary.get('gpa_scale', 4.0):.1f}"
            eval_str = f"{summary.get('total_evaluated', 0)} of {summary.get('total_subjects', 0)} Subjects"

            num_rows = [
                [
                    Paragraph("Average Mark", label_style),
                    Paragraph("Mean Grade", label_style),
                    Paragraph("GPA", label_style),
                    Paragraph("Subjects Evaluated", label_style),
                ],
                [
                    Paragraph(f"<font color='#FF6900' size=11><b>{avg_val}</b></font>", bold_val),
                    Paragraph(f"<font color='#1A7F37' size=11><b>{mean_grade}</b></font>", bold_val),
                    Paragraph(f"<font color='#0969DA' size=11><b>{gpa_str}</b></font>", bold_val),
                    Paragraph(f"<b>{eval_str}</b>", val_style),
                ]
            ]
            num_table = Table(num_rows, colWidths=[45*mm, 45*mm, 45*mm, 45*mm])
            num_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), BG_LIGHT),
                ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
                ('TOPPADDING', (0, 0), (-1, -1), 4),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
                ('LEFTPADDING', (0, 0), (-1, -1), 6),
                ('RIGHTPADDING', (0, 0), (-1, -1), 6),
            ]))
            elements.append(num_table)

        elements.append(Spacer(1, 4 * mm))

    # 3. Plain-Language Key & Legend Section
    if config.get("show_key_legend", True):
        legend_items = []
        if config.get("show_compulsory_elective", True):
            legend_items.append("<b>Compulsory:</b> Core required subject &bull; <b>Elective:</b> Optional chosen subject")

        if summary.get("scale_type") == "descriptor":
            legend_items.append("<b>EE:</b> Exceeding Expectation (80-100%) &bull; <b>ME:</b> Meeting Expectation (60-79%) &bull; <b>AE:</b> Approaching Expectation (40-59%) &bull; <b>BE:</b> Below Expectation (0-39%)")
        else:
            scales = data.get("scales", [])
            scale_descs = [f"<b>{s.get('letter_grade')}:</b> {s.get('min_score')}-{s.get('max_score')}%" for s in scales[:5]]
            if scale_descs:
                legend_items.append(" &bull; ".join(scale_descs))

        legend_p = Paragraph("<br/>".join(legend_items), small_text)
        legend_table = Table([[Paragraph("<b>KEY & LEGEND:</b>", label_style), legend_p]], colWidths=[28*mm, 152*mm])
        legend_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#FAFBFC")),
            ('BOX', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ]))
        elements.append(legend_table)
        elements.append(Spacer(1, 4 * mm))

    # 4. Itemized Subject Tables
    show_type = config.get("show_compulsory_elective", True)

    if classification == "term":
        elements.append(Paragraph("Subject Results", sec_heading))
        elements.append(Spacer(1, 1.5 * mm))

        subjects = data.get("subjects", [])
        if show_type:
            col_widths = [65*mm, 35*mm, 25*mm, 35*mm, 20*mm]
            headers = [
                Paragraph("<b>Subject Title</b>", label_style),
                Paragraph("<b>Category</b>", label_style),
                Paragraph("<b>Score (%)</b>", label_style),
                Paragraph("<b>Grade / Level</b>", label_style),
                Paragraph("<b>Points</b>", label_style),
            ]
        else:
            col_widths = [90*mm, 30*mm, 40*mm, 20*mm]
            headers = [
                Paragraph("<b>Subject Title</b>", label_style),
                Paragraph("<b>Score (%)</b>", label_style),
                Paragraph("<b>Grade / Level</b>", label_style),
                Paragraph("<b>Points</b>", label_style),
            ]

        subj_rows = [headers]
        for s in subjects:
            score_txt = f"{s.get('percentage', 0):.1f}%" if s.get('percentage') is not None else "-"
            grade_txt = s.get('letter_grade', 'N/A')
            gpa_txt = f"{s.get('gpa_points', 0.0):.1f}"
            c_type = s.get('classification_type', 'Compulsory')
            type_badge = f"<font color='{'#0969DA' if c_type == 'Elective' else '#24292F'}'><b>{c_type}</b></font>"

            if show_type:
                subj_rows.append([
                    Paragraph(s.get("subject_name", "Subject"), bold_val),
                    Paragraph(type_badge, val_style),
                    Paragraph(score_txt, val_style),
                    Paragraph(f"<b>{grade_txt}</b>", val_style),
                    Paragraph(gpa_txt, val_style),
                ])
            else:
                subj_rows.append([
                    Paragraph(s.get("subject_name", "Subject"), bold_val),
                    Paragraph(score_txt, val_style),
                    Paragraph(f"<b>{grade_txt}</b>", val_style),
                    Paragraph(gpa_txt, val_style),
                ])

        if len(subj_rows) == 1:
            empty_cell = Paragraph("<i>No completed subject evaluations recorded for this term.</i>", small_text)
            subj_rows.append([empty_cell] + [Paragraph("-", val_style)] * (len(headers) - 1))

        subj_table = Table(subj_rows, colWidths=col_widths)
        subj_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), BG_LIGHT),
            ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ('TOPPADDING', (0, 0), (-1, -1), 3.5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3.5),
            ('LEFTPADDING', (0, 0), (-1, -1), 5),
            ('RIGHTPADDING', (0, 0), (-1, -1), 5),
        ]))
        elements.append(subj_table)

    elif classification == "year":
        # Annual Cumulative Subject Summaries
        annual_summaries = data.get("annual_subject_summaries", [])
        elements.append(Paragraph("Year Subject Performance", sec_heading))
        elements.append(Spacer(1, 1.5 * mm))

        col_widths = [60*mm, 35*mm, 25*mm, 25*mm, 20*mm, 15*mm]
        ann_rows = [
            [
                Paragraph("<b>Subject Title</b>", label_style),
                Paragraph("<b>Category</b>", label_style),
                Paragraph("<b>Terms Taken</b>", label_style),
                Paragraph("<b>Annual Avg</b>", label_style),
                Paragraph("<b>Grade</b>", label_style),
                Paragraph("<b>GPA</b>", label_style),
            ]
        ]
        for s in annual_summaries:
            c_type = s.get('classification_type', 'Compulsory')
            type_badge = f"<font color='{'#0969DA' if c_type == 'Elective' else '#24292F'}'><b>{c_type}</b></font>"
            ann_rows.append([
                Paragraph(s.get("subject_name", "Subject"), bold_val),
                Paragraph(type_badge, val_style),
                Paragraph(f"{s.get('terms_evaluated', 1)} terms", val_style),
                Paragraph(f"{s.get('average_percentage', 0):.1f}%", val_style),
                Paragraph(f"<b>{s.get('letter_grade', 'N/A')}</b>", val_style),
                Paragraph(f"{s.get('gpa_points', 0.0):.1f}", val_style),
            ])

        ann_table = Table(ann_rows, colWidths=col_widths)
        ann_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), BG_LIGHT),
            ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            ('LEFTPADDING', (0, 0), (-1, -1), 5),
            ('RIGHTPADDING', (0, 0), (-1, -1), 5),
        ]))
        elements.append(ann_table)
        elements.append(Spacer(1, 4 * mm))

        # Term Group Breakdowns
        term_groups = data.get("term_groups", [])
        for tg in term_groups:
            elements.append(Paragraph(f"<b>Term Breakdown:</b> {tg.get('term_name')}", sub_heading))
            elements.append(Spacer(1, 1 * mm))
            t_subjs = tg.get("subjects", [])
            t_rows = [
                [
                    Paragraph("<b>Subject</b>", label_style),
                    Paragraph("<b>Score (%)</b>", label_style),
                    Paragraph("<b>Grade / Level</b>", label_style),
                ]
            ]
            for s in t_subjs:
                t_rows.append([
                    Paragraph(s.get("subject_name", "Subject"), val_style),
                    Paragraph(f"{s.get('percentage', 0):.1f}%", val_style),
                    Paragraph(f"<b>{s.get('letter_grade', 'N/A')}</b>", val_style),
                ])
            if len(t_rows) > 1:
                t_table = Table(t_rows, colWidths=[90*mm, 45*mm, 45*mm])
                t_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), BG_LIGHT),
                    ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
                    ('TOPPADDING', (0, 0), (-1, -1), 2.5),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 2.5),
                    ('LEFTPADDING', (0, 0), (-1, -1), 5),
                    ('RIGHTPADDING', (0, 0), (-1, -1), 5),
                ]))
                elements.append(t_table)
                elements.append(Spacer(1, 3 * mm))

    elif classification == "overall":
        layout_mode = data.get("layout_mode", "period_grouped")
        consolidated = data.get("consolidated_subjects", [])

        elements.append(Paragraph("All Subjects Summary (To Date)", sec_heading))
        elements.append(Spacer(1, 1.5 * mm))

        col_widths = [55*mm, 30*mm, 25*mm, 25*mm, 25*mm, 20*mm]
        c_rows = [
            [
                Paragraph("<b>Subject Title</b>", label_style),
                Paragraph("<b>Category</b>", label_style),
                Paragraph("<b>Terms</b>", label_style),
                Paragraph("<b>Average</b>", label_style),
                Paragraph("<b>Grade</b>", label_style),
                Paragraph("<b>Points</b>", label_style),
            ]
        ]
        for s in consolidated:
            c_type = s.get('classification_type', 'Compulsory')
            type_badge = f"<font color='{'#0969DA' if c_type == 'Elective' else '#24292F'}'><b>{c_type}</b></font>"
            c_rows.append([
                Paragraph(s.get("subject_name", "Subject"), bold_val),
                Paragraph(type_badge, val_style),
                Paragraph(f"{s.get('eval_count', 1)} periods", val_style),
                Paragraph(f"{s.get('cumulative_percentage', 0):.1f}%", val_style),
                Paragraph(f"<b>{s.get('cumulative_grade', 'N/A')}</b>", val_style),
                Paragraph(f"{s.get('gpa_points', 0.0):.1f}", val_style),
            ])

        c_table = Table(c_rows, colWidths=col_widths)
        c_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), BG_LIGHT),
            ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            ('LEFTPADDING', (0, 0), (-1, -1), 5),
            ('RIGHTPADDING', (0, 0), (-1, -1), 5),
        ]))
        elements.append(c_table)
        elements.append(Spacer(1, 4 * mm))

        if layout_mode == "period_grouped":
            year_timelines = data.get("year_timelines", [])
            for yt in year_timelines:
                elements.append(Paragraph(f"<b>Year {yt.get('academic_year_name')}</b>", sub_heading))
                elements.append(Spacer(1, 1 * mm))
                for tg in yt.get("terms", []):
                    t_subjs = tg.get("subjects", [])
                    t_rows = [
                        [
                            Paragraph(f"<b>{tg.get('term_name')} Subject</b>", label_style),
                            Paragraph("<b>Grade / Level</b>", label_style),
                            Paragraph("<b>Score (%)</b>", label_style),
                        ]
                    ]
                    for s in t_subjs:
                        t_rows.append([
                            Paragraph(s.get("subject_name", "Subject"), val_style),
                            Paragraph(f"<b>{s.get('letter_grade', 'N/A')}</b>", val_style),
                            Paragraph(f"{s.get('percentage', 0):.1f}%", val_style),
                        ])
                    t_table = Table(t_rows, colWidths=[90*mm, 45*mm, 45*mm])
                    t_table.setStyle(TableStyle([
                        ('BACKGROUND', (0, 0), (-1, 0), BG_LIGHT),
                        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
                        ('TOPPADDING', (0, 0), (-1, -1), 2.5),
                        ('BOTTOMPADDING', (0, 0), (-1, -1), 2.5),
                        ('LEFTPADDING', (0, 0), (-1, -1), 5),
                        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
                    ]))
                    elements.append(t_table)
                    elements.append(Spacer(1, 2.5 * mm))

    elements.append(Spacer(1, 3 * mm))

    # 5. Pending / Incomplete Section (if configured and pending subjects exist)
    pending_subjects = data.get("pending_subjects", [])
    if config.get("show_pending_section", True) and pending_subjects:
        elements.append(Paragraph("Pending Subjects & Coursework", sec_heading))
        elements.append(Spacer(1, 1.5 * mm))
        p_rows = [
            [
                Paragraph("<b>Subject Title</b>", label_style),
                Paragraph("<b>Category</b>", label_style),
                Paragraph("<b>Status / Requirement</b>", label_style),
            ]
        ]
        for p in pending_subjects[:10]: # cap to avoid excessive page spilling
            c_type = p.get('classification_type', 'Compulsory')
            p_rows.append([
                Paragraph(p.get("subject_name", "Subject"), val_style),
                Paragraph(c_type, val_style),
                Paragraph(f"<font color='#9A6700'>{p.get('status', 'In progress / exam pending')}</font>", small_text),
            ])

        p_table = Table(p_rows, colWidths=[70*mm, 35*mm, 75*mm])
        p_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), BG_LIGHT),
            ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            ('LEFTPADDING', (0, 0), (-1, -1), 5),
            ('RIGHTPADDING', (0, 0), (-1, -1), 5),
        ]))
        elements.append(p_table)
        elements.append(Spacer(1, 4 * mm))

    # 6. Official Institutional Certification & Seal
    elements.append(Spacer(1, 4 * mm))
    sig_title = ParagraphStyle('TrnSig', fontName='Helvetica-Bold', fontSize=8.5, textColor=NAVY_DARK, alignment=1)
    sig_sub = ParagraphStyle('TrnSigSub', fontName='Helvetica', fontSize=7.5, textColor=TEXT_MUTED, alignment=1)
    sig_rows = [
        [
            [
                Paragraph("________________________________________", sig_title),
                Spacer(1, 1*mm),
                Paragraph("Class Teacher", sig_title),
                Paragraph("Teacher Signature", sig_sub),
            ],
            [
                Paragraph("________________________________________", sig_title),
                Spacer(1, 1*mm),
                Paragraph("Dean / Registrar", sig_title),
                Paragraph("Academic Office", sig_sub),
            ],
            [
                Paragraph("________________________________________", sig_title),
                Spacer(1, 1*mm),
                Paragraph("Principal / Headteacher", sig_title),
                Paragraph("Official Stamp & Signature", sig_sub),
            ],
        ]
    ]
    sig_table = Table(sig_rows, colWidths=[60*mm, 60*mm, 60*mm])
    elements.append(sig_table)

    return elements


def format_currency_py(amount, symbol="KSh"):
    try:
        val = float(amount or 0)
        return f"{symbol} {val:,.2f}"
    except (ValueError, TypeError):
        return f"{symbol} 0.00"


def compile_fee_invoice(data):
    styles = getSampleStyleSheet()
    elements = []

    inst_name = data.get("institution_name", "Academic Institution")
    curr = data.get("currency", {})
    curr_sym = curr.get("symbol", "KSh") if isinstance(curr, dict) else str(curr or "KSh")
    invoice = data.get("invoice", {})
    student = data.get("student", {})

    invoice_no = invoice.get("invoice_number", "INV-DRAFT")
    issue_date = invoice.get("issue_date", datetime.now().strftime("%Y-%m-%d"))
    due_date = invoice.get("due_date", "On Enrollment")
    status = (invoice.get("status") or "unpaid").lower()

    # 1. Header
    elements.extend(build_header(
        inst_name,
        "FEE INVOICE",
        doc_subtitle="FEE STATEMENT",
        ref_no=invoice_no,
        date_str=issue_date
    ))
    elements.append(Spacer(1, 4 * mm))

    # 2. Metadata Grid (Student Info & Invoice Details)
    label_style = ParagraphStyle('InvMetaLabel', fontName='Helvetica-Bold', fontSize=8, leading=11, textColor=TEXT_MUTED)
    val_style = ParagraphStyle('InvMetaVal', fontName='Helvetica', fontSize=9, leading=12, textColor=TEXT_DARK)
    val_bold = ParagraphStyle('InvMetaValB', fontName='Helvetica-Bold', fontSize=9, leading=12, textColor=NAVY_DARK)

    status_color = SUCCESS_GREEN if status == "paid" else (ORANGE_PRIMARY if status == "partial" else (DANGER_RED if status == "overdue" else AMBER_WARN))
    status_style = ParagraphStyle('InvStatus', fontName='Helvetica-Bold', fontSize=9, leading=12, textColor=status_color)

    meta_data = [
        [
            Paragraph("STUDENT DETAILS", ParagraphStyle('H1', fontName='Helvetica-Bold', fontSize=9, textColor=ORANGE_PRIMARY)),
            Paragraph("INVOICE DETAILS", ParagraphStyle('H2', fontName='Helvetica-Bold', fontSize=9, textColor=ORANGE_PRIMARY))
        ],
        [
            Paragraph(f"<b>Name:</b> {student.get('full_name', 'Student')}", val_style),
            Paragraph(f"<b>Invoice Number:</b> {invoice_no}", val_bold)
        ],
        [
            Paragraph(f"<b>Admission No:</b> {student.get('admission_number') or student.get('id') or 'N/A'}", val_style),
            Paragraph(f"<b>Issue Date:</b> {issue_date}", val_style)
        ],
        [
            Paragraph(f"<b>Class / Form:</b> {student.get('class_name') or student.get('grade') or 'Unassigned'}", val_style),
            Paragraph(f"<b>Payment Due Date:</b> {due_date}", val_bold)
        ],
        [
            Paragraph(f"<b>Academic Period:</b> {student.get('academic_year', '')} · {student.get('term', '')}".strip(" ·"), val_style),
            Paragraph(f"<b>Status:</b> {status.upper()}", status_style)
        ]
    ]

    meta_table = Table(meta_data, colWidths=[90 * mm, 90 * mm])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), BG_LIGHT),
        ('BOX', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('INNERGRID', (0, 0), (-1, -1), 0.25, colors.HexColor("#E5E7EB")),
        ('TOPPADDING', (0, 0), (-1, -1), 2.5 * mm),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2.5 * mm),
        ('LEFTPADDING', (0, 0), (-1, -1), 3.5 * mm),
        ('RIGHTPADDING', (0, 0), (-1, -1), 3.5 * mm),
    ]))
    elements.append(meta_table)
    elements.append(Spacer(1, 5 * mm))

    # 3. Itemized Fee Components Table
    th_style = ParagraphStyle('InvTH', fontName='Helvetica-Bold', fontSize=8, leading=10, textColor=colors.white)
    th_right = ParagraphStyle('InvTHR', fontName='Helvetica-Bold', fontSize=8, leading=10, textColor=colors.white, alignment=2)
    td_style = ParagraphStyle('InvTD', fontName='Helvetica', fontSize=8.5, leading=11, textColor=TEXT_DARK)
    td_bold = ParagraphStyle('InvTDB', fontName='Helvetica-Bold', fontSize=8.5, leading=11, textColor=TEXT_DARK)
    td_right = ParagraphStyle('InvTDR', fontName='Helvetica', fontSize=8.5, leading=11, textColor=TEXT_DARK, alignment=2)
    td_right_bold = ParagraphStyle('InvTDRB', fontName='Helvetica-Bold', fontSize=8.5, leading=11, textColor=NAVY_DARK, alignment=2)

    items = invoice.get("itemized_breakdown") or []
    if not items:
        # Fallback to single fee structure row if no itemized components
        gross = invoice.get("gross_amount") or invoice.get("net_amount") or 0
        discount = invoice.get("discount_amount", 0)
        net = invoice.get("net_amount", gross)
        items = [{
            "component_name": invoice.get("title") or "Tuition & Institutional Operations Fee",
            "category": "Core Operations",
            "amount": gross,
            "discount": discount,
            "net_amount": net
        }]

    item_rows = [
        [
            Paragraph("#", th_style),
            Paragraph("Fee Description", th_style),
            Paragraph("Category", th_style),
            Paragraph("Amount", th_right),
            Paragraph("Discount", th_right),
            Paragraph("Total", th_right)
        ]
    ]

    for idx, itm in enumerate(items, 1):
        name = itm.get("name") or itm.get("component_name") or itm.get("title") or f"Component {idx}"
        cat = itm.get("category") or "Standard"
        gross_val = float(itm.get("amount") or itm.get("gross_amount") or 0)
        disc_val = float(itm.get("discount") or itm.get("discount_amount") or 0)
        net_val = float(itm.get("net_amount") or (gross_val - disc_val))

        item_rows.append([
            Paragraph(str(idx), td_style),
            Paragraph(name, td_bold),
            Paragraph(cat, td_style),
            Paragraph(format_currency_py(gross_val, curr_sym), td_right),
            Paragraph(f"-{format_currency_py(disc_val, curr_sym)}" if disc_val > 0 else "—", td_right),
            Paragraph(format_currency_py(net_val, curr_sym), td_right_bold)
        ])

    items_table = Table(
        item_rows,
        colWidths=[10 * mm, 65 * mm, 30 * mm, 25 * mm, 25 * mm, 25 * mm]
    )

    t_styles = [
        ('BACKGROUND', (0, 0), (-1, 0), NAVY_DARK),
        ('ALIGN', (3, 0), (-1, -1), 'RIGHT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 2.2 * mm),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2.2 * mm),
        ('LEFTPADDING', (0, 0), (-1, -1), 2 * mm),
        ('RIGHTPADDING', (0, 0), (-1, -1), 2 * mm),
        ('BOX', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('INNERGRID', (0, 0), (-1, -1), 0.25, BORDER_COLOR),
    ]

    for r in range(1, len(item_rows)):
        if r % 2 == 0:
            t_styles.append(('BACKGROUND', (0, r), (-1, r), BG_LIGHT))

    items_table.setStyle(TableStyle(t_styles))
    elements.append(items_table)
    elements.append(Spacer(1, 4 * mm))

    # 4. Summary & Balance Due Box
    gross_total = float(invoice.get("gross_amount") or 0)
    total_discount = float(invoice.get("discount_amount") or 0)
    net_total = float(invoice.get("net_amount") or (gross_total - total_discount))
    paid_amount = float(invoice.get("paid_amount") or 0)
    balance_due = float(invoice.get("balance_due") or (net_total - paid_amount))

    sum_label = ParagraphStyle('SumL', fontName='Helvetica', fontSize=9, leading=12, textColor=TEXT_DARK, alignment=2)
    sum_val = ParagraphStyle('SumV', fontName='Helvetica-Bold', fontSize=9, leading=12, textColor=NAVY_DARK, alignment=2)
    bal_label = ParagraphStyle('BalL', fontName='Helvetica-Bold', fontSize=10, leading=14, textColor=ORANGE_PRIMARY, alignment=2)
    bal_val = ParagraphStyle('BalV', fontName='Helvetica-Bold', fontSize=12, leading=16, textColor=ORANGE_PRIMARY, alignment=2)

    summary_rows = [
        ["", "", Paragraph("Gross Assessed:", sum_label), Paragraph(format_currency_py(gross_total, curr_sym), sum_val)],
        ["", "", Paragraph("Total Waivers & Discounts:", sum_label), Paragraph(f"-{format_currency_py(total_discount, curr_sym)}" if total_discount > 0 else "—", sum_val)],
        ["", "", Paragraph("Net Assessed Billed:", sum_label), Paragraph(format_currency_py(net_total, curr_sym), sum_val)],
        ["", "", Paragraph("Total Paid to Date:", sum_label), Paragraph(format_currency_py(paid_amount, curr_sym), sum_val)],
        ["", "", Paragraph("BALANCE DUE:", bal_label), Paragraph(format_currency_py(balance_due, curr_sym), bal_val)],
    ]

    summary_table = Table(
        summary_rows,
        colWidths=[50 * mm, 50 * mm, 45 * mm, 35 * mm]
    )
    summary_table.setStyle(TableStyle([
        ('LINEABOVE', (2, 0), (3, 0), 0.5, BORDER_COLOR),
        ('LINEBELOW', (2, 3), (3, 3), 0.5, BORDER_COLOR),
        ('LINEABOVE', (2, 4), (3, 4), 1.0, ORANGE_PRIMARY),
        ('LINEBELOW', (2, 4), (3, 4), 1.0, ORANGE_PRIMARY),
        ('TOPPADDING', (0, 0), (-1, -1), 1.5 * mm),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 1.5 * mm),
        ('RIGHTPADDING', (0, 0), (-1, -1), 2 * mm),
    ]))
    elements.append(summary_table)
    elements.append(Spacer(1, 6 * mm))

    # 5. Payment Instructions & Institutional Notes
    notes_p = Paragraph(
        f"<b>Payment Instructions & Notes:</b> {invoice.get('notes') or 'Please pay via the school official bank account or mobile money channel. Quote the student Admission Number in all payment transactions. Retain payment receipts for accounts reconciliation.'}",
        ParagraphStyle('NotesP', fontName='Helvetica', fontSize=8, leading=11, textColor=TEXT_MUTED)
    )
    elements.append(notes_p)
    elements.append(Spacer(1, 8 * mm))

    # 6. Verification & Signature Block
    sig_title = ParagraphStyle('InvSigT', fontName='Helvetica-Bold', fontSize=8.5, leading=11, textColor=NAVY_DARK)
    sig_sub = ParagraphStyle('InvSigS', fontName='Helvetica', fontSize=7.5, leading=9, textColor=TEXT_MUTED)

    sig_data = [
        [
            Paragraph("________________________________________", sig_title),
            Paragraph("________________________________________", sig_title),
        ],
        [
            Paragraph("Bursar / Finance Officer", sig_title),
            Paragraph("Principal / Head of Institution", sig_title),
        ],
        [
            Paragraph("Official Stamp & Verification", sig_sub),
            Paragraph("Institutional Seal & Approval", sig_sub),
        ]
    ]
    sig_table = Table(sig_data, colWidths=[90 * mm, 90 * mm])
    sig_table.setStyle(TableStyle([
        ('TOPPADDING', (0, 0), (-1, -1), 1 * mm),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 1 * mm),
    ]))
    elements.append(KeepTogether([sig_table]))

    return elements


def compile_payment_receipt(data):
    styles = getSampleStyleSheet()
    elements = []

    inst_name = data.get("institution_name", "Academic Institution")
    curr = data.get("currency", {})
    curr_sym = curr.get("symbol", "KSh") if isinstance(curr, dict) else str(curr or "KSh")
    receipt = data.get("receipt", {})
    student = data.get("student", {})

    receipt_no = receipt.get("receipt_number") or receipt.get("reference_number") or f"REC-{datetime.now().strftime('%Y%m%d%H%M')}"
    pay_date = receipt.get("payment_date", datetime.now().strftime("%Y-%m-%d"))
    pay_method = (receipt.get("payment_method") or "Cash").replace("_", " ").title()
    ref_number = receipt.get("reference_number") or "N/A"
    amount_paid = float(receipt.get("amount") or 0)
    prev_balance = float(receipt.get("previous_balance") or 0)
    running_balance = float(receipt.get("running_balance") or (prev_balance - amount_paid if prev_balance > 0 else 0))

    # 1. Header
    elements.extend(build_header(
        inst_name,
        "OFFICIAL PAYMENT RECEIPT",
        doc_subtitle="PAYMENT ACKNOWLEDGEMENT & RUNNING BALANCE STATEMENT",
        ref_no=receipt_no,
        date_str=pay_date
    ))
    elements.append(Spacer(1, 4 * mm))

    # 2. Hero Amount Paid Callout Card
    hero_title = ParagraphStyle('HeroT', fontName='Helvetica-Bold', fontSize=9, leading=12, textColor=colors.HexColor("#065F46"), alignment=1)
    hero_amount = ParagraphStyle('HeroA', fontName='Helvetica-Bold', fontSize=24, leading=28, textColor=colors.HexColor("#065F46"), alignment=1)
    hero_badge = ParagraphStyle('HeroB', fontName='Helvetica-Bold', fontSize=8, leading=10, textColor=colors.HexColor("#047857"), alignment=1)

    hero_card_data = [
        [Paragraph("AMOUNT RECEIVED & CONFIRMED", hero_title)],
        [Paragraph(format_currency_py(amount_paid, curr_sym), hero_amount)],
        [Paragraph(f"PAID VIA {pay_method.upper()} · REF: {ref_number}", hero_badge)]
    ]
    hero_table = Table(hero_card_data, colWidths=[180 * mm])
    hero_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#ECFDF5")),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#A7F3D0")),
        ('TOPPADDING', (0, 0), (-1, -1), 2 * mm),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2.5 * mm),
    ]))
    elements.append(hero_table)
    elements.append(Spacer(1, 5 * mm))

    # 3. Student & Transaction Details Grid
    val_style = ParagraphStyle('RecVal', fontName='Helvetica', fontSize=8.5, leading=12, textColor=TEXT_DARK)
    val_bold = ParagraphStyle('RecValB', fontName='Helvetica-Bold', fontSize=8.5, leading=12, textColor=NAVY_DARK)

    details_data = [
        [
            Paragraph("STUDENT INFORMATION", ParagraphStyle('H1', fontName='Helvetica-Bold', fontSize=9, textColor=ORANGE_PRIMARY)),
            Paragraph("TRANSACTION DETAILS", ParagraphStyle('H2', fontName='Helvetica-Bold', fontSize=9, textColor=ORANGE_PRIMARY))
        ],
        [
            Paragraph(f"<b>Student Name:</b> {student.get('full_name', 'Student')}", val_bold),
            Paragraph(f"<b>Receipt Number:</b> {receipt_no}", val_bold)
        ],
        [
            Paragraph(f"<b>Admission Number:</b> {student.get('admission_number') or student.get('id') or 'N/A'}", val_style),
            Paragraph(f"<b>Payment Date:</b> {pay_date}", val_style)
        ],
        [
            Paragraph(f"<b>Class / Form:</b> {student.get('class_name') or student.get('grade') or 'Unassigned'}", val_style),
            Paragraph(f"<b>Payment Method:</b> {pay_method}", val_style)
        ],
        [
            Paragraph(f"<b>Academic Period:</b> {student.get('academic_year', '')} · {student.get('term', '')}".strip(" ·"), val_style),
            Paragraph(f"<b>External Reference:</b> {ref_number}", val_style)
        ],
        [
            Paragraph(f"<b>Fee Purpose:</b> {receipt.get('fee_structure_title') or receipt.get('origin_label') or 'School Fees Payment'}", val_style),
            Paragraph(f"<b>Recorded By:</b> {receipt.get('recorded_by') or receipt.get('recorded_by_label') or 'Accounts Office'}", val_style)
        ]
    ]

    details_table = Table(details_data, colWidths=[90 * mm, 90 * mm])
    details_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), BG_LIGHT),
        ('BOX', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('INNERGRID', (0, 0), (-1, -1), 0.25, colors.HexColor("#E5E7EB")),
        ('TOPPADDING', (0, 0), (-1, -1), 2.2 * mm),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2.2 * mm),
        ('LEFTPADDING', (0, 0), (-1, -1), 3.5 * mm),
        ('RIGHTPADDING', (0, 0), (-1, -1), 3.5 * mm),
    ]))
    elements.append(details_table)
    elements.append(Spacer(1, 5 * mm))

    # 4. Financial Reconciliation & Running Balance
    reconcil_header = ParagraphStyle('RecH', fontName='Helvetica-Bold', fontSize=8, textColor=colors.white)
    th_r = ParagraphStyle('RecHR', fontName='Helvetica-Bold', fontSize=8, textColor=colors.white, alignment=2)
    td_r = ParagraphStyle('RecTR', fontName='Helvetica-Bold', fontSize=9, textColor=NAVY_DARK, alignment=2)
    bal_r = ParagraphStyle('RecBR', fontName='Helvetica-Bold', fontSize=10, textColor=ORANGE_PRIMARY, alignment=2)

    ledger_rows = [
        [
            Paragraph("Description", reconcil_header),
            Paragraph("Details", reconcil_header),
            Paragraph("Amount", th_r)
        ],
        [
            Paragraph("Previous Balance", val_bold),
            Paragraph("Balance before this payment", val_style),
            Paragraph(format_currency_py(prev_balance, curr_sym), td_r)
        ],
        [
            Paragraph("Amount Paid", val_bold),
            Paragraph(f"Paid via {pay_method} ({ref_number})", val_style),
            Paragraph(f"-{format_currency_py(amount_paid, curr_sym)}", ParagraphStyle('PPaid', fontName='Helvetica-Bold', fontSize=9, textColor=SUCCESS_GREEN, alignment=2))
        ],
        [
            Paragraph("REMAINING BALANCE", ParagraphStyle('BalLbl', fontName='Helvetica-Bold', fontSize=9.5, textColor=ORANGE_PRIMARY)),
            Paragraph("Balance due after this payment", val_style),
            Paragraph(format_currency_py(running_balance, curr_sym), bal_r)
        ]
    ]

    ledger_table = Table(ledger_rows, colWidths=[55 * mm, 80 * mm, 45 * mm])
    ledger_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), NAVY_DARK),
        ('BACKGROUND', (0, 1), (-1, 1), BG_LIGHT),
        ('BACKGROUND', (0, 3), (-1, 3), colors.HexColor("#FFF7ED")),
        ('BOX', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('INNERGRID', (0, 0), (-1, -1), 0.25, BORDER_COLOR),
        ('TOPPADDING', (0, 0), (-1, -1), 2.5 * mm),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2.5 * mm),
        ('LEFTPADDING', (0, 0), (-1, -1), 3 * mm),
        ('RIGHTPADDING', (0, 0), (-1, -1), 3 * mm),
    ]))
    elements.append(ledger_table)
    elements.append(Spacer(1, 5 * mm))

    # 5. Notes & Legal Terms
    receipt_notes = receipt.get("notes") or receipt.get("admin_notes") or "Payment has been officially confirmed and credited to the student's institutional ledger. Cheques are subject to bank clearance."
    notes_para = Paragraph(
        f"<b>Official Note:</b> {receipt_notes}",
        ParagraphStyle('RNotes', fontName='Helvetica', fontSize=8, leading=11, textColor=TEXT_MUTED)
    )
    elements.append(notes_para)
    elements.append(Spacer(1, 8 * mm))

    # 6. Official Stamp & Signature Block
    sig_t = ParagraphStyle('RecSigT', fontName='Helvetica-Bold', fontSize=8.5, leading=11, textColor=NAVY_DARK)
    sig_s = ParagraphStyle('RecSigS', fontName='Helvetica', fontSize=7.5, leading=9, textColor=TEXT_MUTED)

    sig_data = [
        [
            Paragraph("________________________________________", sig_t),
            Paragraph("________________________________________", sig_t),
        ],
        [
            Paragraph("Cashier Signature", sig_t),
            Paragraph("Finance Office", sig_t),
        ],
        [
            Paragraph(f"Received ({pay_date})", sig_s),
            Paragraph("Official Stamp", sig_s),
        ]
    ]
    sig_table = Table(sig_data, colWidths=[90 * mm, 90 * mm])
    sig_table.setStyle(TableStyle([
        ('TOPPADDING', (0, 0), (-1, -1), 1 * mm),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 1 * mm),
    ]))
    elements.append(KeepTogether([sig_table]))

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
    elif doc_type == "academic_transcript":
        story = compile_academic_transcript(data)
    elif doc_type == "fee_invoice":
        story = compile_fee_invoice(data)
    elif doc_type == "payment_receipt":
        story = compile_payment_receipt(data)
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
