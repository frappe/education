# Copyright (c) 2015, Frappe and Contributors
# See license.txt


import frappe
from frappe.tests.utils import FrappeTestCase

from education.education.test_utils import (
	create_academic_year,
	create_academic_term,
	create_program,
	create_student,
	create_program_enrollment,
	create_student_group,
)


class TestProgramEnrollment(FrappeTestCase):
	def setUp(self):
		create_academic_year()
		create_academic_term(
			term_name="Term 1", term_start_date="2023-04-01", term_end_date="2023-09-30"
		)
		create_program("Class 1")

	def test_create_course_enrollments(self):
		student = create_student()
		create_program_enrollment(student_name=student.name, submit=1)

	def tearDown(self):
		frappe.db.rollback()
