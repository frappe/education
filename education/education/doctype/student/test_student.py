# Copyright (c) 2015, Frappe Technologies and Contributors
# See license.txt


import frappe

from education.education.doctype.program.test_program import (
	make_program_and_linked_courses,
)

test_records = frappe.get_test_records("Student")
from frappe.tests.utils import FrappeTestCase
from education.education.test_utils import create_student


class TestStudent(FrappeTestCase):
	def setUp(self):
		student = create_student()

	def test_create_student_user(self):
		self.assertTrue(bool(frappe.db.exists("User", "test@example.com")))

	def test_create_customer_against_student(self):
		student = frappe.get_doc("Student", {"student_email_id": "test@example.com"})
		self.assertTrue(bool(student.customer))
		self.assertEqual(student.customer_group, "Student")

	def tearDown(self):
		frappe.db.rollback()
