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

	def test_disable_customer_sync(self):
		frappe.db.set_single_value("Education Settings", "disable_customer_sync", 1)

		if not frappe.db.exists("Customer Group", "Commercial"):
			frappe.get_doc(
				{"doctype": "Customer Group", "customer_group_name": "Commercial"}
			).insert()

		customer = frappe.get_doc(
			{
				"doctype": "Customer",
				"customer_name": "Partner Venue A",
				"customer_type": "Company",
				"customer_group": "Commercial",
			}
		).insert()

		student = frappe.get_doc("Student", {"student_email_id": "test@example.com"})
		student.customer = customer.name
		student.save()

		customer.reload()
		self.assertEqual(customer.customer_name, "Partner Venue A")
		self.assertEqual(customer.customer_group, "Commercial")

		student_without_customer = frappe.get_doc(
			{
				"doctype": "Student",
				"first_name": "New",
				"last_name": "Student",
				"student_email_id": "new-student@example.com",
			}
		).insert()
		self.assertFalse(bool(student_without_customer.customer))

	def tearDown(self):
		frappe.db.rollback()
