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

	columns = get_columns(filters)
	date = filters.get("date")

	holiday_list = get_holiday_list()
	if is_holiday(holiday_list, filters.get("date")):
		msgprint(
			_("No attendance has been marked for {0} as it is a Holiday").format(
				frappe.bold(formatdate(filters.get("date")))
			)
		)

	absent_students = get_absent_students(date)
	leave_applicants = get_leave_applications(date)

	data = []
	for student in absent_students:
		if not student.student in leave_applicants:
			row = [student.student, student.student_name, student.student_batch]
			stud_details = frappe.db.get_value(
				"Student",
				student.student,
				["student_email_id", "student_mobile_number"],
				as_dict=True,
			)

			if stud_details.student_email_id:
				row += [stud_details.student_email_id]
			else:
				row += [""]

			if stud_details.student_mobile_number:
				row += [stud_details.student_mobile_number]
			else:
				row += [""]

			data.append(row)

	return columns, data


def get_columns(filters):
	columns = [
		_("Student") + ":Link/Student:90",
		_("Student Name") + "::150",
		_("Student Batch") + "::180",
		_("Student Email Address") + "::180",
		_("Student Mobile No.") + "::150",
	]
	return columns


def get_absent_students(date):
	absent_students = frappe.db.sql(
		"""
		SELECT student, student_name, student_batch
		FROM `tabStudent Attendance`
		WHERE
			status='Absent' and docstatus=1 and date = %s
		ORDER BY
			student_batch, student_name""",
		date,
		as_dict=1,
	)
	return absent_students


def get_leave_applications(date):
	leave_applicants = []
	leave_applications = frappe.db.sql(
		"""
		SELECT student
		FROM
			`tabStudent Leave Application`
		WHERE
			docstatus = 1 and mark_as_present = 1 and
			from_date <= %s and to_date >= %s
	""",
		(date, date),
	)
	for student in leave_applications:
		leave_applicants.append(student[0])

	return leave_applicants
