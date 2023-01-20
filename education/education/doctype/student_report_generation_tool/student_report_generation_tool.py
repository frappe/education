# Copyright (c) 2018, Frappe Technologies Pvt. Ltd. and contributors
# For license information, please see license.txt


import json

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils.pdf import get_pdf

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
	if not (doc.student_name and doc.student_batch):
		program_enrollment = frappe.get_all(
			"Class Enrollment",
			fields=["student_batch_name", "student_name"],
			filters={"student": doc.student, "docstatus": ("!=", 2), "academic_year": doc.academic_year},
		)
		if program_enrollment:
			doc.batch = program_enrollment[0].student_batch_name
			doc.student_name = program_enrollment[0].student_name

	# get the assessment result of the selected student
	values = get_formatted_result(
		doc, get_course=True, get_all_assessment_groups=(not doc.include_assessment_criteria)
	)
	grading_scale_name = frappe.db.get_value('Class', doc.program, 'grading_scale')
	grading_scale = frappe.get_doc('Grading Scale', grading_scale_name)
	assessment_result = values.get("assessment_result").get(doc.student)
	courses = values.get("course_dict")
	settings = frappe.get_doc('Education Settings')

	student_grading_info = get_student_class_grading_info(doc.program, doc.academic_year, doc.students[0], doc.assessment_group)
	# get the assessment group as per the user selection
	if not doc.include_assessment_criteria:
		assessment_groups = get_child_assessment_groups(doc.assessment_group)
	else: 
		assessment_groups = [ doc.assessment_group ]

	# get the attendance of the student for that peroid of time.
	doc.attendance = get_attendance_count(doc.students[0], doc.academic_year, doc.academic_term)

	template = (
		"education/education/doctype/student_report_generation_tool/student_report_generation_test2.html"
	)
	base_template_path = "frappe/www/printview.html"

	from frappe.www.printview import get_letter_head

	letterhead = get_letter_head(
		frappe._dict({"letter_head": doc.letterhead}), not doc.add_letterhead
	)

	instructor_remarks = get_student_class_remark_info(doc.program, doc.academic_year, doc.students[0], doc.assessment_group)
	student_image = frappe.db.get_value('Student', doc.student, 'image')

	html = frappe.render_template(
		template,
		{
			"doc": doc,
			"assessment_result": assessment_result,
			"courses": courses,
			"assessment_groups": assessment_groups,
			"remarks": instructor_remarks,
			"letterhead": letterhead and letterhead.get("content", None),
			"add_letterhead": doc.add_letterhead if doc.add_letterhead else 0,
			"student_image": student_image,
			"settings": settings,
			"grading_info": student_grading_info,
			"grading_scale": grading_scale,
		}, 
	)
	final_template = frappe.render_template(
		base_template_path, {"body": html, "title": "Report Card"}
	)

	frappe.response.filename = "Report Card " + doc.students[0] + ".pdf"
	frappe.response.filecontent = get_pdf(final_template, {"margin-right": "5mm", "margin-left": "5mm"})
	frappe.response.type = "download"

def get_student_class_grading_info(student_class, academic_year, student, assessment_group):
	try:
		class_result = frappe.get_last_doc('Class Assessment Group Result', {"program": student_class, "assessment_group": assessment_group, "academic_year": academic_year}).as_dict()
		student_result = frappe.get_last_doc('Student Assessment Report Information', filters={"student": student, "parent": class_result.name}).as_dict()
		student_result["subjects_info"] = class_result.get("subjects")
		return student_result
	except:
		return None

def get_student_class_remark_info(student_class, academic_year, student, assessment_group):
	try:
		class_remarks = frappe.get_last_doc('Student Group Assessment Remarks', {"student_class": student_class, "assessment_group": assessment_group, "academic_year": academic_year}).as_dict()
		student_remark = frappe.get_last_doc('Student Assessment Remark Information', filters={"student": student, "parent": class_remarks.name}).as_dict()
		return student_remark
	except:
		return None
		
def get_courses_criteria(courses):
	course_criteria = frappe._dict()
	for course in courses:
		course_criteria[course] = [
			d.assessment_criteria
			for d in frappe.get_all(
				"Subject Assessment Criteria", fields=["assessment_criteria"], filters={"parent": course}
			)
		]
	return course_criteria

def get_default_criteria():
	settings = frappe.get_doc("Education Settings")
	default_criteria = [
			d.assessment_criteria
			for d in frappe.get_all(
				"Subject Assessment Criteria", fields=["assessment_criteria"], filters={"parent": settings}
			)
		]
	return default_criteria


def get_attendance_count(student, academic_year, academic_term=None):
	if academic_year:
		from_date, to_date = frappe.db.get_value(
			"Academic Year", academic_year, ["year_start_date", "year_end_date"]
		)
	elif academic_term:
		from_date, to_date = frappe.db.get_value(
			"Academic Term", academic_term, ["term_start_date", "term_end_date"]
		)
	if from_date and to_date:
		attendance = dict(
			frappe.db.sql(
				"""select status, count(student) as no_of_days
			from `tabStudent Attendance` where student = %s and docstatus = 1
			and date between %s and %s group by status""",
				(student, from_date, to_date),
			)
		)
		if "Absent" not in attendance.keys():
			attendance["Absent"] = 0
		if "Present" not in attendance.keys():
			attendance["Present"] = 0
		return attendance
	else:
		frappe.throw(_("Provide the academic year and set the starting and ending date."))
