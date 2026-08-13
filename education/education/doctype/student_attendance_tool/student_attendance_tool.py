# Copyright (c) 2015, Frappe Technologies Pvt. Ltd. and contributors
# For license information, please see license.txt


import frappe
from frappe.model.document import Document

from education.education.doctype.student_batch_name.student_batch_name import (
	get_batch_students,
)


class StudentAttendanceTool(Document):
	pass


@frappe.whitelist()
def get_student_attendance_records(
	based_on, date=None, student_batch=None, course_schedule=None
):
	student_attendance_list = []

	if based_on == "Course Schedule":
		student_batch = frappe.db.get_value(
			"Course Schedule", course_schedule, "student_batch"
		)

	student_list = get_batch_students(student_batch) if student_batch else []

	StudentAttendance = frappe.qb.DocType("Student Attendance")

	if course_schedule:
		student_attendance_list = (
			frappe.qb.from_(StudentAttendance)
			.select(StudentAttendance.student, StudentAttendance.status)
			.where((StudentAttendance.course_schedule == course_schedule))
		).run(as_dict=True)
	else:
		student_attendance_list = (
			frappe.qb.from_(StudentAttendance)
			.select(StudentAttendance.student, StudentAttendance.status)
			.where(
				(StudentAttendance.student_batch == student_batch)
				& (StudentAttendance.date == date)
				& (
					(StudentAttendance.course_schedule == "")
					| (StudentAttendance.course_schedule.isnull())
				)
			)
		).run(as_dict=True)

	for attendance in student_attendance_list:
		for student in student_list:
			if student.student == attendance.student:
				student.status = attendance.status

	return student_list
