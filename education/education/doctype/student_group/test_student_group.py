# Copyright (c) 2015, Frappe Technologies and Contributors
# See license.txt


import frappe

import education.education
from frappe.tests.utils import FrappeTestCase
from education.education.test_utils import (
	create_academic_year,
	create_academic_term,
	create_program,
	create_student,
	create_program_enrollment,
	create_student_group,
)


class TestStudentGroup(FrappeTestCase):
	def setUp(self):
		create_academic_year()
		create_academic_term(
			term_name="Term 1", term_start_date="2023-04-01", term_end_date="2023-09-30"
		)
		create_program("Class 1")
		student = create_student()
		create_program_enrollment(student_name=student.name, submit=1)
		create_student_group()

	def tearDown(self):
		frappe.db.rollback()

	def test_student_roll_no(self):
		student_group = frappe.get_doc("Student Group", "Test Student Group")
		self.assertEqual(
			max([d.group_roll_number for d in student_group.students]),
			len(student_group.students),
		)
