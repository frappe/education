# Copyright (c) 2013, Frappe Technologies Pvt. Ltd. and contributors
# For license information, please see license.txt


import frappe
from frappe import _

from education.education.report.course_wise_assessment_report.course_wise_assessment_report import \
    get_formatted_result


def execute(filters=None):
	columns, data = [], []

	data, course_list = get_data(data, filters)
	columns = get_column(course_list)
	chart = get_chart(data, course_list)

	return columns, data, None, chart


def get_data(data, filters):
	args = frappe._dict()
	args["academic_year"] = filters.get("academic_year")
	args["assessment_group"] = filters.get("assessment_group")

	args.students = frappe.get_all(
		"Student Group Student", {"parent": filters.get("student_group")}, pluck="student"
	)

	values = get_formatted_result(args, get_course=True)
	assessment_result = values.get("assessment_result")
	course_list = values.get("courses")

	for result in assessment_result:
		exists = [i for i, d in enumerate(data) if d.get("student") == result.student]
		if not len(exists):
			row = frappe._dict()
			row.student = result.student
			row.student_name = result.student_name
			row.assessment_group = result.assessment_group
			row["grade_" + frappe.scrub(result.course)] = result.grade
			row["score_" + frappe.scrub(result.course)] = result.total_score

			data.append(row)
		else:
			index = exists[0]
			data[index]["grade_" + frappe.scrub(result.course)] = result.grade
			data[index]["score_" + frappe.scrub(result.course)] = result.total_score

	return data, course_list


def get_column(course_list):
	columns = [
		{
			"fieldname": "student",
			"label": _("Student ID"),
			"fieldtype": "Link",
			"options": "Student",
			"width": 150,
		},
		{
			"fieldname": "student_name",
			"label": _("Student Name"),
			"fieldtype": "Data",
			"width": 120,
		},
		{
			"fieldname": "assessment_group",
			"label": _("Assessment Group"),
			"fieldtype": "Link",
			"options": "Assessment Group",
			"width": 100,
		},
	]
	for course in course_list:
		columns.append(
			{
				"fieldname": "grade_" + frappe.scrub(course),
				"label": course,
				"fieldtype": "Data",
				"width": 100,
			}
		)
		columns.append(
			{
				"fieldname": "score_" + frappe.scrub(course),
				"label": "Score (" + course + ")",
				"fieldtype": "Float",
				"width": 150,
			}
		)

	return columns


def get_chart(data, course_list):
	dataset = []
	students = [row.student_name for row in data]

	for course in course_list:
		dataset_row = {"values": []}
		dataset_row["name"] = course
		for row in data:
			if "score_" + frappe.scrub(course) in row:
				dataset_row["values"].append(row["score_" + frappe.scrub(course)])
			else:
				dataset_row["values"].append(0)

		dataset.append(dataset_row)

	charts = {
		"data": {"labels": students, "datasets": dataset},
		"type": "bar",
		"colors": ["#ff0e0e", "#ff9966", "#ffcc00", "#99cc33", "#339900"],
	}

	return charts
