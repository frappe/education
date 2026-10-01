# Copyright (c) 2018, Frappe Technologies Pvt. Ltd. and contributors
# For license information, please see license.txt


import json

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
def preview_report_card(doc):
	doc = frappe._dict(json.loads(doc))
	doc.students = [doc.student]
	values = get_formatted_result(doc, get_course=True)
	courses = values.get("courses")
	assessment_groups = get_child_assessment_groups(doc.assessment_group)
	letterhead = get_letter_head(doc, not doc.add_letterhead)

	# get the attendance of the student for that peroid of time.
	doc.attendance = get_attendance_count(
		doc.students[0], doc.academic_year, doc.academic_term
	)

	html = frappe.render_template(
		"education/education/doctype/student_report_generation_tool/student_report_generation_tool.html",
		{
			"doc": doc,
			"assessment_result": values.get("assessment_result"),
			"courses": courses,
			"assessment_groups": assessment_groups,
			"letterhead": letterhead and letterhead.get("content", None),
			"add_letterhead": doc.add_letterhead if doc.add_letterhead else 0,
		},
	)

	final_template = frappe.render_template(
		"frappe/www/printview.html", {"body": html, "title": "Report Card"}
	)

	frappe.response.filename = "Report Card " + doc.students[0] + ".pdf"
	frappe.response.filecontent = get_pdf(final_template)
	frappe.response.type = "pdf"


def get_attendance_count(student, academic_year, academic_term):
    from frappe.query_builder.functions import Count
    StudentAttendance = frappe.qb.DocType("Student Attendance")

    query = (
        frappe.qb.from_(StudentAttendance)
        .select(StudentAttendance.status, Count(StudentAttendance.name).as_("count"))
        .where(
            (StudentAttendance.student == student)
            & (StudentAttendance.academic_year == academic_year)
            & (StudentAttendance.academic_term == academic_term)
            & (StudentAttendance.docstatus == 1)
        )
        .groupby(StudentAttendance.status)
    )

    data = query.run(as_dict=True)

    attendance = {}
    total = 0
    for row in data:
        attendance[row.status] = row.count
        total += row.count

    attendance["Total"] = total
    return attendance
