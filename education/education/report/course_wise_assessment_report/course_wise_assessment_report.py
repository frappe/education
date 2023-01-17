# Copyright (c) 2013, Frappe Technologies Pvt. Ltd. and contributors
# For license information, please see license.txt


from collections import OrderedDict, defaultdict

import frappe
from frappe import _
from frappe.desk.treeview import get_children


def execute(filters=None):
	data, chart = [], []

	if filters.get("assessment_group") == "All Assessment Groups":
		frappe.throw(
			_("Please select the assessment group other than 'All Assessment Groups'")
		)

	data, criterias = get_data(filters)
	columns = get_column(criterias)
	chart = get_chart(data, criterias)

	return columns, data, None, chart


def get_data(filters):
	data = []
	criterias = []
	values = get_formatted_result(filters)

	for result in values.get("assessment_result"):
		row = frappe._dict()
		row.student = result.get("student")
		row.student_name = result.get("student_name")

		for detail in result.details:
			criteria = detail.get("assessment_criteria")
			row[frappe.scrub(criteria)] = detail.get("grade")
			row[frappe.scrub(criteria) + "_score"] = detail.get("score")
			if not criteria in criterias:
				criterias.append(criteria)

		data.append(row)

	return data, criterias


def get_formatted_result(args, get_course=False):
	courses = []
	filters = prepare_filters(args)

	assessment_result = frappe.get_all(
		"Assessment Result",
		filters,
		[
			"student",
			"student_name",
			"name",
			"course",
			"assessment_group",
			"total_score",
			"grade",
		],
		order_by="",
	)

	for result in assessment_result:
		if get_course and result.course not in courses:
			courses.append(result.course)

		details = frappe.get_all(
			"Assessment Result Detail",
			{
				"parent": result.name,
			},
			["assessment_criteria", "maximum_score", "grade", "score"],
		)
		result.update({"details": details})

	return {"assessment_result": assessment_result, "courses": courses}


def prepare_filters(args):
	filters = {"academic_year": args.academic_year, "docstatus": 1}

	options = ["course", "academic_term", "student_group"]
	for option in options:
		if args.get(option):
			filters[option] = args.get(option)

	assessment_groups = get_child_assessment_groups(args.assessment_group)

	filters.update({"assessment_group": ["in", assessment_groups]})

	if args.students:
		filters.update({"student": ["in", args.students]})
	return filters


def get_column(criterias):
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
			"width": 150,
		},
	]
	for criteria in criterias:
		columns.append(
			{
				"fieldname": frappe.scrub(criteria),
				"label": criteria,
				"fieldtype": "Data",
				"width": 100,
			}
		)
		columns.append(
			{
				"fieldname": frappe.scrub(criteria) + "_score",
				"label": "Score (" + criteria + ")",
				"fieldtype": "Float",
				"width": 100,
			}
		)

	return columns


def get_chart(data, criterias):
	dataset = []
	students = [row.student_name for row in data]

	for criteria in criterias:
		dataset_row = {"values": []}
		dataset_row["name"] = criteria
		for row in data:
			if frappe.scrub(criteria) + "_score" in row:
				dataset_row["values"].append(row[frappe.scrub(criteria) + "_score"])
			else:
				dataset_row["values"].append(0)

		dataset.append(dataset_row)

	charts = {
		"data": {"labels": students, "datasets": dataset},
		"type": "bar",
		"colors": ["#ff0e0e", "#ff9966", "#ffcc00", "#99cc33", "#339900"],
	}

	return charts


def get_child_assessment_groups(assessment_group):
	assessment_groups = []
	group_type = frappe.get_value("Assessment Group", assessment_group, "is_group")
	if group_type:

		assessment_groups = [
			d.get("value")
			for d in get_children("Assessment Group", assessment_group)
			if d.get("value") and not d.get("expandable")
		]
	else:
		assessment_groups = [assessment_group]
	return assessment_groups
