# Copyright (c) 2017, Frappe Technologies Pvt. Ltd. and Contributors
# See license.txt

import frappe
from frappe.tests.utils import FrappeTestCase
from education.education.doctype.fee_schedule.fee_schedule import generate_fees

from education.education.test_utils import (
	create_academic_year,
	create_academic_term,
	create_fee_category,
	create_program,
	create_fee_structure,
	create_student,
	create_program_enrollment,
	create_student_group,
	create_fee_schedule,
)


class TestFeeSchedule(FrappeTestCase):
	def setUp(self):
		create_academic_year()
		create_academic_term(
			term_name="Term 1", term_start_date="2023-04-01", term_end_date="2023-09-30"
		)
		create_academic_term(
			term_name="Term 2", term_start_date="2023-10-01", term_end_date="2024-03-31"
		)
		create_program("Class 1")
		create_fee_category("Tuition Fee")
		create_fee_category("Library Fee")
		fee_components = [
			{"fees_category": "Tuition Fee", "amount": 2000, "discount": 0},
			{"fees_category": "Library Fee", "amount": 2000, "discount": 0},
		]
		fee_structure = create_fee_structure(components=fee_components, submit=1)

		student = create_student()
		create_program_enrollment(student_name=student.name, submit=1)

		create_student_group()

	def tearDown(self):
		frappe.db.rollback()

	def test_fee_schedule(self):
		fee_schedule = create_fee_schedule(submit=1)
		total_students = 0
		for group in fee_schedule.student_groups:
			total_students += group.total_students

		self.assertEqual(fee_schedule.docstatus, 1)
		self.assertEqual(total_students, 1)
		self.assertEqual(fee_schedule.grand_total, total_students * fee_schedule.total_amount)

	def test_sales_invoice_creation_flow(self):
		due_date = frappe.utils.add_days(frappe.utils.nowdate(), 2)
		fee_schedule = create_fee_schedule(submit=1, due_date=due_date)
		# sales_invoice_posting_date_fee_schedule set it as 1
		self.assertEqual(fee_schedule.status, "Invoice Pending")
		self.assertNotEqual(fee_schedule.status, "Order Pending")
		generate_fees(fee_schedule.name)
		sales_invoices = frappe.get_all(
			"Sales Invoice", filters={"fee_schedule": fee_schedule.name}
		)
		sales_order = frappe.get_all(
			"Sales Order", filters={"fee_schedule": fee_schedule.name}
		)
		self.assertEqual(len(sales_invoices), 1)
		self.assertEqual(len(sales_order), 0)
		fee_schedule_status = frappe.db.get_value("Fee Schedule", fee_schedule.name, "status")
		self.assertEqual(fee_schedule_status, "Invoice Created")

	def test_sales_order_creation_flow(self):
		# create_so from education settings set to 1
		frappe.db.set_value("Education Settings", "Education Settings", "create_so", 1)
		due_date = frappe.utils.add_days(frappe.utils.nowdate(), 2)
		fee_schedule = create_fee_schedule(submit=1, due_date=due_date)

		self.assertEqual(fee_schedule.status, "Order Pending")
		self.assertNotEqual(fee_schedule.status, "Invoice Pending")
		generate_fees(fee_schedule.name)
		sales_order = frappe.get_all(
			"Sales Order", filters={"fee_schedule": fee_schedule.name}
		)
		sales_invoices = frappe.get_all(
			"Sales Invoice", filters={"fee_schedule": fee_schedule.name}
		)
		self.assertEqual(len(sales_order), 1)
		self.assertEqual(len(sales_invoices), 0)
		fee_schedule_status = frappe.db.get_value("Fee Schedule", fee_schedule.name, "status")
		self.assertEqual(fee_schedule_status, "Order Created")
