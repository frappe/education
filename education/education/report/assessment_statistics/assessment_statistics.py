# Copyright (c) 2026, Frappe Technologies Pvt. Ltd. and contributors
# For license information, please see license.txt

from statistics import mean, median, pstdev

import frappe
from frappe import _
from frappe.utils import flt

from education.education.api import get_grade_details


def execute(filters=None):
	filters = frappe._dict(filters or {})
	if not filters.assessment_plan:
		frappe.throw(_("Assessment Plan is required"))

	assessment_plan = frappe.get_doc("Assessment Plan", filters.assessment_plan)
	assessment_plan.check_permission("read")
	if assessment_plan.docstatus != 1:
		frappe.throw(
			_("Assessment Plan {0} must be submitted").format(frappe.bold(assessment_plan.name))
		)

	grading_scale = frappe.db.get_value(
		"Course", assessment_plan.course, "default_grading_scale"
	)
	data = get_data(assessment_plan.name, grading_scale)
	return (
		get_columns(),
		data,
		None,
		get_chart(data, grading_scale),
		get_report_summary(data, grading_scale),
	)


def get_columns():
	return [
		{
			"fieldname": "student",
			"label": _("Student"),
			"fieldtype": "Link",
			"options": "Student",
			"width": 150,
		},
		{
			"fieldname": "student_name",
			"label": _("Student Name"),
			"fieldtype": "Data",
			"width": 190,
		},
		{
			"fieldname": "score",
			"label": _("Score"),
			"fieldtype": "Float",
			"width": 100,
		},
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
			"width": 120,
		},
		{
			"fieldname": "grade",
			"label": _("Grade"),
			"fieldtype": "Data",
			"width": 90,
		},
	]


def get_data(assessment_plan, grading_scale):
	results = frappe.get_all(
		"Assessment Result",
		filters={"assessment_plan": assessment_plan, "docstatus": 1},
		fields=["student", "student_name", "score", "maximum_score", "percentage"],
		order_by="percentage desc, student_name asc",
	)
	for result in results:
		result.score = flt(result.score, 2)
		result.maximum_score = flt(result.maximum_score, 2)
		result.percentage = flt(result.percentage, 2)
		result.grade = (
			get_grade_details(grading_scale, result.percentage).grade_code
			if grading_scale
			else ""
		)
	return results


def get_chart(data, grading_scale):
	if grading_scale:
		labels = frappe.get_all(
			"Grading Scale Interval",
			filters={"parent": grading_scale},
			pluck="grade_code",
			order_by="minimum_percentage desc",
		)
		counts = {label: 0 for label in labels}
		for row in data:
			label = row.grade or _("Unclassified")
			if label not in counts:
				labels.append(label)
				counts[label] = 0
			counts[label] += 1
		chart_label = _("Grade Distribution")
	else:
		labels = [f"{start}-{start + 9}" for start in range(0, 100, 10)] + ["100"]
		counts = {label: 0 for label in labels}
		for row in data:
			percentage = max(0, min(flt(row.percentage), 100))
			label = "100" if percentage == 100 else labels[int(percentage // 10)]
			counts[label] += 1
		chart_label = _("Percentage Distribution")

	return {
		"data": {
			"labels": labels,
			"datasets": [
				{
					"name": chart_label,
					"values": [counts[label] for label in labels],
				}
			],
		},
		"type": "bar",
		"colors": ["#2490ef"],
	}


def get_report_summary(data, grading_scale):
	percentages = [flt(row.percentage) for row in data]
	if not percentages:
		return [
			{
				"value": 0,
				"label": _("Graded Students"),
				"datatype": "Int",
			}
		]

	summary = [
		{
			"value": len(percentages),
			"label": _("Graded Students"),
			"datatype": "Int",
		},
		{
			"value": flt(mean(percentages), 2),
			"label": _("Mean"),
			"datatype": "Percent",
		},
		{
			"value": flt(median(percentages), 2),
			"label": _("Median"),
			"datatype": "Percent",
		},
		{
			"value": flt(max(percentages), 2),
			"label": _("Highest"),
			"datatype": "Percent",
		},
		{
			"value": flt(min(percentages), 2),
			"label": _("Lowest"),
			"datatype": "Percent",
		},
		{
			"value": flt(pstdev(percentages), 2),
			"label": _("Standard Deviation"),
			"datatype": "Float",
		},
	]

	if grading_scale:
		passed = sum(
			1
			for percentage in percentages
			if get_grade_details(grading_scale, percentage).earn_credits
		)
		summary.append(
			{
				"value": flt(passed / len(percentages) * 100, 2),
				"label": _("Pass Rate"),
				"datatype": "Percent",
			}
		)
	return summary
