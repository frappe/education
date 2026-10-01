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
def preview_report_card(doc: str):
	doc = frappe._dict(json.loads(doc))
	doc.students = [doc.student]
	values = get_formatted_result(doc, get_course=True)
	courses = values.get("courses")
	assessment_groups = get_child_assessment_groups(doc.assessment_group)
	letterhead = get_letter_head(doc, not doc.add_letterhead)
	grade_books = get_grade_books(doc)

	doc.attendance = get_attendance_count(doc.students[0], doc.academic_year, doc.academic_term)

	html = frappe.render_template(
		"education/education/doctype/student_report_generation_tool/student_report_generation_tool.html",
		{
			"doc": doc,
			"assessment_result": values.get("assessment_result"),
			"grade_books": grade_books,
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


def get_attendance_count(student, academic_year, academic_term=None):
	"""
	PROPER FIX for Frappe v15+
	- Uses Query Builder (no string SQL like count(student))
	- Does NOT filter by academic_year column (doesn't exist in Student Attendance)
	- Filters by date range from Academic Year/Term
	"""
	from frappe.query_builder.functions import Count

	attendance = frappe._dict()
	attendance.total = 0
	attendance.present = 0
	attendance.absent = 0
	attendance.leaves = 0

	from_date = None
	to_date = None

	# Step 1: Get date range from Academic Year or Academic Term
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

	# Step 2: If we have dates, query Student Attendance by DATE only
	if from_date and to_date:
		StudentAttendance = frappe.qb.DocType("Student Attendance")

		query = (
			frappe.qb.from_(StudentAttendance)
			.select(
				StudentAttendance.status,
				Count(StudentAttendance.name).as_("count")
			)
			.where(
				(StudentAttendance.student == student)
				& (StudentAttendance.docstatus == 1)
				& (StudentAttendance.date[from_date:to_date])
			)
			.groupby(StudentAttendance.status)
		)

		data = query.run(as_dict=True)

		for row in data:
			status = row.status
			count = row.count
			if status == "Present":
				attendance.present = count
			elif status == "Absent":
				attendance.absent = count
			else:
				attendance.leaves += count
			attendance.total += count

		return attendance
	else:
		# No date range found - return empty attendance (don't throw during report generation)
		frappe.log_error(
			f"Attendance dates not found for Year={academic_year} Term={academic_term}",
			"get_attendance_count"
		)
		return attendance


def get_grade_books(doc):
	filters = {
		"student": doc.students[0],
		"academic_year": doc.academic_year,
		"status": "Computed",
	}
	if doc.academic_term:
		filters["academic_term"] = doc.academic_term
	if doc.program:
		filters["program"] = doc.program
	if doc.student_batch:
		filters["student_batch"] = doc.student_batch

	books = frappe.get_all(
		"Grade Book",
		filters=filters,
		fields=[
			"name",
			"course",
			"overall_percentage",
			"overall_grade",
		],
		order_by="course",
	)
	for book in books:
		book.subjects = frappe.get_all(
			"Grade Book Subject",
			{"parent": book.name, "parenttype": "Grade Book"},
			[
				"subject",
				"percentage",
				"grade",
				"is_overridden",
			],
			order_by="idx",
		)
	return books
