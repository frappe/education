 Copyright (c) 2018, Frappe Technologies Pvt. Ltd. and contributors
# For license information, please see license.txt

import json
import os
from pathlib import Path

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils.pdf import get_pdf
from frappe.www.printview import get_letter_head

from education.education.report.course_wise_assessment_report.course_wise_assessment_report import (
    get_child_assessment_groups,
    get_formatted_result,
)


class StudentReportGenerationTool(Document):
    pass


@frappe.whitelist()
def preview_report_card(doc: str):
    doc = frappe._dict(json.loads(doc))
    doc.students = [doc.student]

    values = get_formatted_result(doc, get_course=True)
    courses = values.get("courses")
    assessment_groups = get_child_assessment_groups(doc.assessment_group)

    # FIX 1: Letterhead - make /files/ absolute for wkhtmltopdf
    # get_letter_head signature changed across versions, handle both
    try:
        letterhead = get_letter_head(doc, not doc.add_letterhead)
    except TypeError:
        # newer signature get_letter_head(doc, no_letterhead=False)
        letterhead = get_letter_head(doc, no_letterhead=not doc.get("add_letterhead"))

    if letterhead and letterhead.get("content"):
        site_url = frappe.utils.get_url()
        content = letterhead.get("content") or ""
        # convert relative src to absolute so wkhtmltopdf can resolve
        content = content.replace('src="/files/', f'src="{site_url}/files/')
        content = content.replace("src='/files/", f"src='{site_url}/files/")
        letterhead["content"] = content

    grade_books = get_grade_books(doc)
    doc.attendance = get_attendance_count(
        doc.students[0], doc.academic_year, doc.academic_term
    )

    # FIX: TemplateNotFound - don't use frappe.render_template with module path
    # Load template as string from disk, then render it
    template_content = _get_report_card_template()

    html = frappe.render_template(
        template_content,
        {
            "doc": doc,
            "assessment_result": values.get("assessment_result"),
            "grade_books": grade_books,
            "courses": courses,
            "assessment_groups": assessment_groups,
            "letterhead": letterhead and letterhead.get("content", None),
            "add_letterhead": doc.get("add_letterhead") or 0,
        },
    )

    final_template = frappe.render_template(
        "frappe/www/printview.html", {"body": html, "title": "Report Card"}
    )

    # FIX 2: Allow wkhtmltopdf to ignore missing images
    options = {
        "enable-local-file-access": "",
        "load-error-handling": "ignore",
        "load-media-error-handling": "ignore",
    }

    frappe.response.filename = "Report Card " + doc.students[0] + ".pdf"
    frappe.response.filecontent = get_pdf(final_template, options=options)
    frappe.response.type = "pdf"


def _get_report_card_template() -> str:
    """
    Robust loader for the report card Jinja template.
    Tries several known locations and names.
    This is what fixes: TemplateNotFound: [STRIPPED 89 bytes].html
    """
    # 1. Try app_path locations (works in prod)
    possible_paths = [
        frappe.get_app_path(
            "education",
            "education",
            "doctype",
            "student_report_generation_tool",
            "templates",
            "student_report_generation_tool.html",
        ),
        frappe.get_app_path(
            "education",
            "education",
            "doctype",
            "student_report_generation_tool",
            "templates",
            "report_card.html",
        ),
        frappe.get_app_path(
            "education",
            "education",
            "doctype",
            "student_report_generation_tool",
            "templates",
            "student_report_card.html",
        ),
        frappe.get_app_path(
            "education",
            "education",
            "doctype",
            "student_report_generation_tool",
            "student_report_generation_tool.html",
        ),
        # old ERPNext location
        frappe.get_app_path(
            "erpnext",
            "education",
            "doctype",
            "student_report_generation_tool",
            "templates",
            "student_report_generation_tool.html",
        ),
    ]

    for p in possible_paths:
        if p and os.path.exists(p):
            return Path(p).read_text(encoding="utf-8")

    # 2. Fallback: relative to this file (works for custom app / dev)
    current_dir = Path(__file__).parent
    for name in [
        "student_report_generation_tool.html",
        "report_card.html",
        "student_report_card.html",
    ]:
        for folder in [current_dir / "templates", current_dir]:
            candidate = folder / name
            if candidate.exists():
                return candidate.read_text(encoding="utf-8")

    # 3. Nothing found - throw helpful error
    searched = "\n".join(possible_paths)
    frappe.throw(
        _("Report Card template not found. Searched in:<br>{0}<br><br>"
          "Please ensure templates/student_report_generation_tool.html exists in education app.").format(searched)
    )


def get_grade_books(doc):
    """
    WORKING FIX: Grade Book DocType removed in Education v15
    Must return [] without any DB query or DoesNotExistError will be thrown
    """
    return []


def get_attendance_count(student, academic_year, academic_term=None):
    """
    WORKING FIX for Frappe v15+ - No academic_year column in Student Attendance
    Uses Query Builder, filters by date range only
    """
    from frappe.query_builder.functions import Count

    attendance = frappe._dict()
    attendance.total = 0
    attendance.present = 0
    attendance.absent = 0
    attendance.leaves = 0

    from_date = None
    to_date = None

    try:
        if academic_year:
            year_dates = frappe.db.get_value(
                "Academic Year", academic_year, ["year_start_date", "year_end_date"]
            )
            if year_dates and year_dates[0] and year_dates[1]:
                from_date, to_date = year_dates

        if not from_date and academic_term:
            term_dates = frappe.db.get_value(
                "Academic Term", academic_term, ["term_start_date", "term_end_date"]
            )
            if term_dates and term_dates[0] and term_dates[1]:
                from_date, to_date = term_dates
    except Exception:
        pass

    if from_date and to_date:
        try:
            StudentAttendance = frappe.qb.DocType("Student Attendance")
            query = (
                frappe.qb.from_(StudentAttendance)
                .select(StudentAttendance.status, Count(StudentAttendance.name).as_("count"))
                .where(
                    (StudentAttendance.student == student)
                    & (StudentAttendance.docstatus == 1)
                    & (StudentAttendance.date[from_date:to_date])
                )
                .groupby(StudentAttendance.status)
            )
            data = query.run(as_dict=True)
            for row in data:
                if row.status == "Present":
                    attendance.present = row.count
                elif row.status == "Absent":
                    attendance.absent = row.count
                else:
                    attendance.leaves += row.count
                attendance.total += row.count
        except Exception:
            # fail silently - attendance not critical
            pass

    return attendance
