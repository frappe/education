# Copyright (c) 2018, Frappe Technologies Pvt. Ltd. and Contributors
# See license.txt

import unittest

import frappe

from education.education.doctype.course_activity.test_course_activity import \
    make_course_activity
from education.education.doctype.program.test_program import setup_program
from education.education.doctype.student.test_student import (create_student,
                                                              get_student)


class TestSubjectEnrollment(unittest.TestCase):
	def setUp(self):
		setup_program()
		student = create_student(
			{
				"first_name": "_Test First",
				"last_name": "_Test Last",
				"email": "_test_student_1@example.com",
			}
		)
		program_enrollment = student.enroll_in_program("_Test Program")
		subject_enrollment = frappe.db.get_value(
			"Course Enrollment",
			{
				"course": "_Test Course 1",
				"student": student.name,
				"program_enrollment": program_enrollment.name,
			},
			"name",
		)
		make_course_activity(subject_enrollment, "Article", "_Test Article 1-1")

	def test_get_progress(self):
		student = get_student("_test_student_1@example.com")
		program_enrollment_name = frappe.get_list(
			"Program Enrollment", filters={"student": student.name, "Program": "_Test Program"}
		)[0].name
		subject_enrollment_name = frappe.get_list(
			"Course Enrollment",
			filters={
				"student": student.name,
				"course": "_Test Course 1",
				"program_enrollment": program_enrollment_name,
			},
		)[0].name
		subject_enrollment = frappe.get_doc("Course Enrollment", subject_enrollment_name)
		progress = subject_enrollment.get_progress(student)
		finished = {
			"content": "_Test Article 1-1",
			"content_type": "Article",
			"is_complete": True,
		}
		self.assertTrue(finished in progress)
		frappe.db.rollback()

	def tearDown(self):
		for entry in frappe.db.get_all("Course Enrollment"):
			frappe.delete_doc("Course Enrollment", entry.name)

		for entry in frappe.db.get_all("Program Enrollment"):
			doc = frappe.get_doc("Program Enrollment", entry.name)
			doc.cancel()
			doc.delete()
