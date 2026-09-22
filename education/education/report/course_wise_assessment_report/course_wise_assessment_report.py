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

	data = get_data(filters)
	columns = get_column()
	chart = get_chart(data)

	return columns, data, None, chart


def get_data(filters):
	data = []
	values = get_formatted_result(filters)

	for result in values.get("assessment_result"):
		data.append(
			frappe._dict(
				{
					"student": result.get("student"),
					"student_name": result.get("student_name"),
					"assessment_plan": result.get("assessment_plan"),
					"subject": result.get("subject"),
					"score": result.get("score"),
					"maximum_score": result.get("maximum_score"),
					"percentage": result.get("percentage"),
					"grade": result.get("grade"),
				}
			)
		)

	return data


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
			"assessment_plan",
			"assessment_group",
			"score",
			"maximum_score",
			"percentage",
			"grade",
		],
		order_by="",
	)

	for result in assessment_result:
		if get_course and result.course not in courses:
			courses.append(result.course)

		result.subject = frappe.db.get_value(
			"Assessment Plan", result.assessment_plan, "subject"
		)

	return {"assessment_result": assessment_result, "courses": courses}


def prepare_filters(args):
	filters = {"academic_year": args.academic_year, "docstatus": 1}

	options = ["course", "academic_term", "student_batch"]
	for option in options:
		if args.get(option):
			filters[option] = args.get(option)

	assessment_groups = get_child_assessment_groups(args.assessment_group)

	filters.update({"assessment_group": ["in", assessment_groups]})

	if args.students:
		filters.update({"student": ["in", args.students]})
	return filters


def get_column():
	return [
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
		{
			"fieldname": "assessment_plan",
			"label": _("Assessment"),
			"fieldtype": "Link",
			"options": "Assessment Plan",
			"width": 150,
		},
		{
			"fieldname": "subject",
			"label": _("Subject"),
			"fieldtype": "Link",
			"options": "Subject",
			"width": 130,
		},
		{"fieldname": "score", "label": _("Score"), "fieldtype": "Float", "width": 100},
		{
			"fieldname": "maximum_score",
			"label": _("Maximum Score"),
			"fieldtype": "Float",
			"width": 130,
		},
		{
			"fieldname": "percentage",
			"label": _("Percentage"),
			"fieldtype": "Percent",
			"width": 110,
		},
		{"fieldname": "grade", "label": _("Grade"), "fieldtype": "Data", "width": 80},
	]


def get_chart(data):
	students = [row.student_name for row in data]
	dataset = [{"name": _("Percentage"), "values": [row.percentage for row in data]}]

	return {
		"data": {"labels": students, "datasets": dataset},
		"type": "bar",
		"colors": ["#339900"],
	}


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
