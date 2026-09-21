# Copyright (c) 2026, Frappe Technologies Pvt. Ltd. and Contributors
# See license.txt

import frappe
from frappe.tests.utils import FrappeTestCase

from education.education.doctype.subject_registration.subject_registration import (
	get_row_unit_load,
	validate_unit_load,
)


class TestSubjectRegistration(FrappeTestCase):
	def test_row_unit_load_prefers_credit(self):
		self.assertEqual(get_row_unit_load(frappe._dict(credit=3, credit_hours=6)), 3)
		self.assertEqual(get_row_unit_load(frappe._dict(credit=0, credit_hours=6)), 6)
		self.assertEqual(get_row_unit_load(frappe._dict()), 0)

	def test_unit_load_skipped_for_regular(self):
		validate_unit_load("Regular", 1, 2, 5)
		validate_unit_load("Subject Based", 10, 2, 5)

	def test_credit_based_unit_load_within_range(self):
		validate_unit_load("Credit Based", 3, 2, 5)

	def test_credit_based_unit_load_below_minimum(self):
		self.assertRaises(frappe.ValidationError, validate_unit_load, "Credit Based", 1, 2, 5)

	def test_credit_based_unit_load_above_maximum(self):
		self.assertRaises(frappe.ValidationError, validate_unit_load, "Credit Based", 6, 2, 5)

	def test_calculate_total_credits(self):
		doc = frappe.new_doc("Subject Registration")
		doc.append("compulsory_subjects", {"subject": "Math", "credit": 2})
		doc.append("elective_subjects", {"subject": "Physics", "credit_hours": 1.5})
		doc.calculate_total_credits()
		self.assertEqual(doc.total_credits, 3.5)
