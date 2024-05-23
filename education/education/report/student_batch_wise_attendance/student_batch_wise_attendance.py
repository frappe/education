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

	active_student_group = get_active_student_group()

	data = []
	for student_group in active_student_group:
		present_students = 0
		absent_students = 0
		leave_students = 0
		student_group_strength = get_student_group_strength(student_group.name)
		student_attendance = get_student_attendance(student_group.name, filters.get("date"))
		if student_attendance:
			for attendance in student_attendance:
				if attendance.status == "Present":
					present_students = attendance.count
				elif attendance.status == "Absent":
					absent_students = attendance.count
				elif attendance.status == "Leave":
					leave_students = attendance.count

		unmarked_students = student_group_strength - (
			present_students + absent_students + leave_students
		)
		row = {
			"student_group": student_group.name,
			"student_group_strength": student_group_strength,
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
			"label": _("Student Group"),
			"fieldname": "student_group",
			"fieldtype": "Link",
			"options": "Student Group",
			"width": 250,
		},
		{
			"label": _("Student Group Strength"),
			"fieldname": "student_group_strength",
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


def get_active_student_group():
	active_student_groups = frappe.db.sql(
		"""select name from `tabStudent Group` where group_based_on = "Batch"
		and academic_year=%s order by name""",
		(frappe.defaults.get_defaults().academic_year),
		as_dict=1,
	)
	return active_student_groups


def get_student_group_strength(student_group):
	student_group_strength = frappe.db.sql(
		"""select count(*) from `tabStudent Group Student`
		where parent = %s and active=1""",
		student_group,
	)[0][0]
	return student_group_strength


def get_student_attendance(student_group, date):
	student_attendance = frappe.db.sql(
		"""select count(*) as count, status from `tabStudent Attendance` where
				student_group= %s and date= %s and docstatus = 1 and
				(course_schedule is Null or course_schedule='') group by status""",
		(student_group, date),
		as_dict=1,
	)
	return student_attendance
