# Copyright (c) 2015, Frappe Technologies and Contributors
# See license.txt

import frappe
from frappe.tests.utils import FrappeTestCase
from education.education.test_utils import (
	create_academic_year,
	create_academic_term,
	create_fee_category,
	create_program,
	create_fee_structure,
)


class TestFeeStructure(FrappeTestCase):
	def setUp(self):
		# add functions which are needed for setting up the test
		create_academic_year()
		create_academic_term(
			term_name="Term 1", term_start_date="2023-04-01", term_end_date="2023-09-30"
		)
		create_academic_term(
			term_name="Term 2", term_start_date="2023-10-01", term_end_date="2024-03-31"
		)
		create_fee_category("Tuition Fee")
		create_fee_category("Library Fee")
		create_program("Class 1")

	def tearDown(self):
		frappe.db.rollback()

	def test_fee_structure_creation(self):
		fee_components = [
			{"fees_category": "Tuition Fee", "amount": 2000, "discount": 0},
			{"fees_category": "Library Fee", "amount": 2000, "discount": 0},
		]
		fee_structure = create_fee_structure(components=fee_components, submit=1)

		self.assertEqual(fee_structure.docstatus, 1)
		self.assertEqual(fee_structure.total_amount, 4000)

	def test_fee_structure_with_discounts(self):
		fee_components = [
			{"fees_category": "Tuition Fee", "amount": 2000, "discount": 20},
			{"fees_category": "Library Fee", "amount": 2000, "discount": 50},
		]
		fee_structure = create_fee_structure(components=fee_components, submit=1)

		self.assertEqual(fee_structure.docstatus, 1)
		self.assertEqual(fee_structure.total_amount, 2600)
