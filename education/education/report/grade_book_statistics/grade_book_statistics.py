# Copyright (c) 2026, Frappe Technologies Pvt. Ltd. and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.utils import flt


def execute(filters=None):
	filters = frappe._dict(filters or {})
	if not filters.grade_book:
		frappe.throw(_("Grade Book is required"))

	grade_book = frappe.get_doc("Grade Book", filters.grade_book)
	grade_book.check_permission("read")
	if grade_book.status != "Computed":
		frappe.throw(
			_("Grade Book {0} has not been computed").format(frappe.bold(grade_book.name))
		)

	cohort = get_cohort_statistics(grade_book)
	data = get_data(grade_book, cohort.subject_averages)
	return (
		get_columns(),
		data,
		None,
		get_chart(data),
		get_report_summary(grade_book, cohort),
	)


def get_columns():
	return [
		{
			"fieldname": "subject",
			"label": _("Subject"),
			"fieldtype": "Link",
			"options": "Subject",
			"width": 180,
		},
		{
			"fieldname": "grade_template",
			"label": _("Grade Template"),
			"fieldtype": "Link",
			"options": "Grade Template",
			"width": 180,
		},
		{
			"fieldname": "computed_percentage",
			"label": _("Computed Percentage"),
			"fieldtype": "Percent",
			"width": 160,
		},
		{
			"fieldname": "percentage",
			"label": _("Final Percentage"),
			"fieldtype": "Percent",
			"width": 140,
		},
		{
			"fieldname": "grade",
			"label": _("Grade"),
			"fieldtype": "Data",
			"width": 90,
		},
		{
			"fieldname": "cohort_average",
			"label": _("Cohort Average"),
			"fieldtype": "Percent",
			"width": 130,
		},
		{
			"fieldname": "difference",
			"label": _("Difference"),
			"fieldtype": "Percent",
			"width": 110,
		},
		{
			"fieldname": "is_overridden",
			"label": _("Overridden"),
			"fieldtype": "Check",
			"width": 100,
		},
	]


def get_data(grade_book, subject_averages):
	data = []
	for row in grade_book.subjects:
		cohort_average = flt(subject_averages.get(row.subject), 2)
		percentage = flt(row.percentage, 2)
		data.append(
			{
				"subject": row.subject,
				"grade_template": row.grade_template,
				"computed_percentage": flt(row.computed_percentage, 2),
				"percentage": percentage,
				"grade": row.grade,
				"cohort_average": cohort_average,
				"difference": flt(percentage - cohort_average, 2),
				"is_overridden": row.is_overridden,
			}
		)
	return data


def get_cohort_statistics(grade_book):
	conditions = [
		"gb.status = 'Computed'",
		"gb.course = %(course)s",
		"gb.academic_year = %(academic_year)s",
		"ifnull(gb.academic_term, '') = %(academic_term)s",
	]
	values = {
		"course": grade_book.course,
		"academic_year": grade_book.academic_year,
		"academic_term": grade_book.academic_term or "",
	}
	if grade_book.student_batch:
		conditions.append("gb.student_batch = %(student_batch)s")
		values["student_batch"] = grade_book.student_batch

	subject_rows = frappe.db.sql(
		"""
		SELECT gbs.subject, AVG(gbs.percentage) AS average
		FROM `tabGrade Book Subject` gbs
		INNER JOIN `tabGrade Book` gb ON gb.name = gbs.parent
		WHERE {conditions}
		GROUP BY gbs.subject
		""".format(
			conditions=" AND ".join(conditions)
		),
		values,
		as_dict=True,
	)
	overall_rows = frappe.db.sql(
		"""
		SELECT gb.name, gb.overall_percentage
		FROM `tabGrade Book` gb
		WHERE {conditions}
		ORDER BY gb.overall_percentage DESC, gb.name ASC
		""".format(
			conditions=" AND ".join(conditions)
		),
		values,
		as_dict=True,
	)

	rank = None
	if any(row.name == grade_book.name for row in overall_rows):
		rank = 1 + sum(
			flt(row.overall_percentage) > flt(grade_book.overall_percentage)
			for row in overall_rows
		)
	return frappe._dict(
		subject_averages={row.subject: flt(row.average, 2) for row in subject_rows},
		average=(
			flt(
				sum(flt(row.overall_percentage) for row in overall_rows) / len(overall_rows),
				2,
			)
			if overall_rows
			else 0
		),
		count=len(overall_rows),
		rank=rank,
	)


def get_chart(data):
	return {
		"data": {
			"labels": [row["subject"] for row in data],
			"datasets": [
				{
					"name": _("Student"),
					"values": [row["percentage"] for row in data],
				},
				{
					"name": _("Cohort Average"),
					"values": [row["cohort_average"] for row in data],
				},
			],
		},
		"type": "bar",
		"colors": ["#2490ef", "#7cd6fd"],
	}


def get_report_summary(grade_book, cohort):
	summary = [
		{
			"value": flt(grade_book.overall_percentage, 2),
			"label": _("Overall Percentage"),
			"datatype": "Percent",
		},
		{
			"value": grade_book.overall_grade,
			"label": _("Overall Grade"),
			"datatype": "Data",
		},
		{
			"value": cohort.average,
			"label": _("Cohort Average"),
			"datatype": "Percent",
		},
	]
	if cohort.rank:
		summary.append(
			{
				"value": _("{0} of {1}").format(cohort.rank, cohort.count),
				"label": _("Cohort Rank"),
				"datatype": "Data",
			}
		)
	return summary
