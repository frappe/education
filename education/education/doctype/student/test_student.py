# Copyright (c) 2015, Frappe Technologies and Contributors
# See license.txt


import frappe
from unittest import mock

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

	def test_student_without_email_skips_user_creation(self):
		frappe.db.set_single_value("Education Settings", "user_creation_skip", 0)

		for email in [None, "", "   ", "not-an-email"]:
			with self.subTest(email=email):
				student = frappe.new_doc("Student")
				student.first_name = "Test"
				student.last_name = "Student"
				student.student_email_id = email

				with mock.patch.object(frappe, "get_doc", wraps=frappe.get_doc) as get_doc:
					student.validate_user()
					user_creation_attempts = [
						call
						for call in get_doc.call_args_list
						if isinstance(call.args[0], dict)
						and call.args[0].get("doctype") == "User"
					]
				self.assertFalse(user_creation_attempts)

	def tearDown(self):
		frappe.db.rollback()
