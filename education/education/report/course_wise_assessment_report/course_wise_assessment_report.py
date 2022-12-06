# Copyright (c) 2013, Frappe Technologies Pvt. Ltd. and contributors
# For license information, please see license.txt


from collections import OrderedDict, defaultdict

import frappe
from frappe import _

from education.education.api import get_grade


def execute(filters=None):
	data, chart, grades = [], [], []
	args = frappe._dict()
	grade_wise_analysis = defaultdict(dict)

	args["academic_year"] = filters.get("academic_year")
	args["course"] = filters.get("course")
	args["assessment_group"] = filters.get("assessment_group")

	args["academic_term"] = filters.get("academic_term")
	args["student_group"] = filters.get("student_group")

	if args["assessment_group"] == "All Assessment Groups":
		frappe.throw(
			_("Please select the assessment group other than 'All Assessment Groups'")
		)

	returned_values = get_formatted_result(args, get_assessment_criteria=True)
	student_dict = returned_values["student_details"]
	result_dict = returned_values["assessment_result"]
	assessment_criteria_dict = returned_values["assessment_criteria"]

	for student in result_dict:
		student_row = {}
		student_row["student"] = student
		student_row["student_name"] = student_dict[student]
		for criteria in assessment_criteria_dict:
			scrub_criteria = frappe.scrub(criteria)
			if criteria in result_dict[student][args.course][args.assessment_group]:
				student_row[scrub_criteria] = result_dict[student][args.course][
					args.assessment_group
				][criteria]["grade"]
				student_row[scrub_criteria + "_score"] = result_dict[student][args.course][
					args.assessment_group
				][criteria]["score"]

				# create the list of possible grades
				if student_row[scrub_criteria] not in grades:
					grades.append(student_row[scrub_criteria])

				# create the dict of for gradewise analysis
				if student_row[scrub_criteria] not in grade_wise_analysis[criteria]:
					grade_wise_analysis[criteria][student_row[scrub_criteria]] = 1
				else:
					grade_wise_analysis[criteria][student_row[scrub_criteria]] += 1
			else:
				student_row[frappe.scrub(criteria)] = ""
				student_row[frappe.scrub(criteria) + "_score"] = ""
		data.append(student_row)

	assessment_criteria_list = [d for d in assessment_criteria_dict]
	columns = get_column(assessment_criteria_dict)
	chart = get_chart_data(grades, assessment_criteria_list, grade_wise_analysis)

	return columns, data, None, chart


def get_formatted_result(args, get_course=False, get_all_assessment_groups=False):
	courses = []
	filters = prepare_filters(args, get_all_assessment_groups)

	assessment_result = frappe.get_all("Assessment Result", filters,
		["student", "student_name", "name", "course", "assessment_group", "total_score", "grade"], order_by="")
	for result in assessment_result:
		if get_course and result.course not in courses:
			courses.append(result.course)

		details = frappe.get_all("Assessment Result Detail", {
			"parent": result.name,
		}, ["assessment_criteria", "maximum_score", "grade", "score"])
		result.update({
			"details": details
		})

	return {
		"assessment_result": assessment_result,
		"courses": courses
	}


def prepare_filters(args, get_all_assessment_groups):
	filters = {
		"academic_year": args.academic_year,
		"docstatus": 1
	}

	options = ["course", "academic_term", "student_group"]
	for option in options:
		if args.get(option):
			filters[option] = args.get(option)

	if get_all_assessment_groups:
		assessment_groups = get_child_assessment_groups(args.assessment_group)
	else:
		assessment_groups = args.assessment_group

	filters.update({
		"assessment_group": ["in", assessment_groups]
	})

	if args.students:
		filters.update({
			"student": ["in", args.students]
		})
	return filters

def get_column(assessment_criteria):
	columns = [
		{
			"fieldname": "student",
			"label": _("Student ID"),
			"fieldtype": "Link",
			"options": "Student",
			"width": 90,
		},
		{
			"fieldname": "student_name",
			"label": _("Student Name"),
			"fieldtype": "Data",
			"width": 160,
		},
	]
	for d in assessment_criteria:
		columns.append(
			{"fieldname": frappe.scrub(d), "label": d, "fieldtype": "Data", "width": 110}
		)
		columns.append(
			{
				"fieldname": frappe.scrub(d) + "_score",
				"label": "Score(" + str(int(assessment_criteria[d])) + ")",
				"fieldtype": "Float",
				"width": 100,
			}
		)

	return columns


def get_chart_data(grades, criteria_list, kounter):
	grades = sorted(grades)
	datasets = []

	for grade in grades:
		tmp = frappe._dict({"name": grade, "values": []})
		for criteria in criteria_list:
			if grade in kounter[criteria]:
				tmp["values"].append(kounter[criteria][grade])
			else:
				tmp["values"].append(0)
		datasets.append(tmp)

	return {
		"data": {"labels": criteria_list, "datasets": datasets},
		"type": "bar",
	}


def get_child_assessment_groups(assessment_group):
	assessment_groups = []
	group_type = frappe.get_value("Assessment Group", assessment_group, "is_group")
	if group_type:
		from frappe.desk.treeview import get_children

		assessment_groups = [
			d.get("value")
			for d in get_children("Assessment Group", assessment_group)
			if d.get("value") and not d.get("expandable")
		]
	else:
		assessment_groups = [assessment_group]
	return assessment_groups
