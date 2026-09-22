# Copyright (c) 2015, Frappe Technologies Pvt. Ltd. and Contributors
# License: GNU General Public License v3. See license.txt


import frappe
from erpnext.setup.doctype.holiday_list.holiday_list import is_holiday
from frappe import _, msgprint
from frappe.utils import formatdate

from education.education.doctype.student_attendance.student_attendance import (
	get_holiday_list,
)


def execute(filters=None):
	if not filters:
		filters = {}

	if not filters.get("date"):
		msgprint(_("Please select date"), raise_exception=1)

	holiday_list = get_holiday_list()
	if is_holiday(holiday_list, filters.get("date")):
		msgprint(
			_("No attendance has been marked for {0} as it is a Holiday").format(
				frappe.bold(formatdate(filters.get("date")))
			)
		)

	columns = get_columns(filters)

	data = []
	for batch in get_active_batches(filters.get("date")):
		present_students = 0
		absent_students = 0
		leave_students = 0
		batch_strength = get_batch_strength(batch.name)
		student_attendance = get_student_attendance(batch.name, filters.get("date"))
		if student_attendance:
			for attendance in student_attendance:
				if attendance.status == "Present":
					present_students = attendance.count
				elif attendance.status == "Absent":
					absent_students = attendance.count
				elif attendance.status == "Leave":
					leave_students = attendance.count

		unmarked_students = batch_strength - (
			present_students + absent_students + leave_students
		)
		row = {
			"student_batch": batch.name,
			"batch_strength": batch_strength,
			"present_students": present_students,
			"absent_students": absent_students,
			"leave_students": leave_students,
			"unmarked_students": unmarked_students,
		}
		data.append(row)
	return columns, data


def get_columns(filters):
	columns = [
		{
			"label": _("Student Batch"),
			"fieldname": "student_batch",
			"fieldtype": "Link",
			"options": "Student Batch Name",
			"width": 250,
		},
		{
			"label": _("Batch Strength"),
			"fieldname": "batch_strength",
			"fieldtype": "Int",
			"width": 200,
		},
		{
			"label": _("Present"),
			"fieldname": "present_students",
			"fieldtype": "Int",
			"width": 90,
		},
		{
			"label": _("Leave"),
			"fieldname": "leave_students",
			"fieldtype": "Int",
			"width": 90,
		},
		{
			"label": _("Absent"),
			"fieldname": "absent_students",
			"fieldtype": "Int",
			"width": 90,
		},
	]
	return columns


def get_active_batches(date):
	"""Return the batches running on the given date."""
	return frappe.get_all(
		"Student Batch Name",
		filters=[
			["disabled", "=", 0],
			["start_date", "<=", date],
			["end_date", ">=", date],
		],
		fields=["name"],
		order_by="name",
	)


def get_batch_strength(student_batch):
	return frappe.db.count(
		"Course Enrollment", {"student_batch": student_batch, "docstatus": 1}
	)


def get_student_attendance(student_batch, date):
	student_attendance = frappe.db.sql(
		"""select count(*) as count, status from `tabStudent Attendance` where
				student_batch= %s and date= %s and docstatus = 1 and
				(subject_schedule is Null or subject_schedule='') group by status""",
		(student_batch, date),
		as_dict=1,
	)
	return student_attendance
