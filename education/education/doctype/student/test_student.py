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

	def test_create_customer_during_import_with_duplicate_name(self):
		frappe.flags.in_import = True
		try:
			s1 = frappe.get_doc(
				{
					"doctype": "Student",
					"first_name": "DupStudent",
					"last_name": "ImportTest",
					"student_email_id": "dupstudent1@example.com",
				}
			).insert(ignore_permissions=True)

			s2 = frappe.get_doc(
				{
					"doctype": "Student",
					"first_name": "DupStudent",
					"last_name": "ImportTest",
					"student_email_id": "dupstudent2@example.com",
				}
			).insert(ignore_permissions=True)

			self.assertEqual(s1.customer, "DupStudent ImportTest")
			self.assertEqual(s2.customer, "DupStudent ImportTest - 1")
		finally:
			frappe.flags.in_import = False

	def tearDown(self):
		frappe.db.rollback()


