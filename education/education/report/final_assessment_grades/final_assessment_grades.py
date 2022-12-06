# Copyright (c) 2013, Frappe Technologies Pvt. Ltd. and contributors
# For license information, please see license.txt


from collections import defaultdict
import frappe
from frappe import _

from education.education.report.course_wise_assessment_report.course_wise_assessment_report import (
    get_chart_data, get_formatted_result)


def execute(filters=None):
	columns, data, scores = [], [], []
	course_wise_analysis = defaultdict(dict)

	data, course_dict = get_data(data, filters)
	columns = get_column(course_dict)
	scores = [ d.total_score for d in data]
	#chart = get_chart_data(scores, course_dict, course_wise_analysis)

	return columns, data, None, None


def get_data(data, filters):
	args = frappe._dict()
	args["academic_year"] = filters.get("academic_year")
	args["assessment_group"] = filters.get("assessment_group")

	args.students = frappe.get_all("Student Group Student", {
		"parent": filters.get("student_group")
	}, pluck="student")

	values = get_formatted_result(args, get_course=True, get_all_assessment_groups=True)
	assessment_result = values.get("assessment_result")
	course_dict = values.get("courses")

	for result in assessment_result:
		exists =  [i for i, d in enumerate(data) if d.get("student") == result.student]
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

	return data, course_dict

def get_column(course_dict):
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
			"width": 100
		}
	]
	for course in course_dict:
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
