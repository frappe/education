# Copyright (c) 2026, Frappe Technologies Pvt. Ltd. and Contributors
# See license.txt

import frappe
from frappe.tests.utils import FrappeTestCase


class TestGradeTemplate(FrappeTestCase):
	def setUp(self):
		self.company = frappe.db.get_value(
			"Company", {"company_name": "_Test Company"}, "name"
		)
		if not self.company:
			self.company = frappe.get_all("Company", pluck="name", limit=1)[0]

		if not frappe.db.exists("Academic Year", "_Test Grade Template Year"):
			frappe.get_doc(
				{
					"doctype": "Academic Year",
					"academic_year_name": "_Test Grade Template Year",
					"company": self.company,
					"year_start_date": "2026-01-01",
					"year_end_date": "2026-12-31",
				}
			).insert()

		if not frappe.db.exists("Academic Term", "_Test Grade Template Year (Term 1)"):
			frappe.get_doc(
				{
					"doctype": "Academic Term",
					"academic_year": "_Test Grade Template Year",
					"company": self.company,
					"term_name": "Term 1",
					"term_start_date": "2026-01-01",
					"term_end_date": "2026-06-30",
				}
			).insert()

		if not frappe.db.exists("Assignment Type", "_Test Homework"):
			frappe.get_doc(
				{
					"doctype": "Assignment Type",
					"assignment_type_name": "_Test Homework",
					"company": self.company,
				}
			).insert()

		if not frappe.db.exists("Assignment Type", "_Test Exam"):
			frappe.get_doc(
				{
					"doctype": "Assignment Type",
					"assignment_type_name": "_Test Exam",
					"company": self.company,
				}
			).insert()

	def test_assignment_weights_must_total_100(self):
		template = frappe.get_doc(
			{
				"doctype": "Grade Template",
				"template_name": "_Test Grade Template Invalid",
				"company": self.company,
				"academic_year": "_Test Grade Template Year",
				"academic_term": "_Test Grade Template Year (Term 1)",
				"weightage_type": "Assignment Type Weightage",
				"assignment_weights": [
					{"assignment_type": "_Test Homework", "weightage": 40},
					{"assignment_type": "_Test Exam", "weightage": 40},
				],
			}
		)
		self.assertRaises(frappe.ValidationError, template.insert)

	def test_valid_assignment_weight_template(self):
		name = "_Test Grade Template Valid"
		if frappe.db.exists("Grade Template", name):
			frappe.delete_doc("Grade Template", name)

		template = frappe.get_doc(
			{
				"doctype": "Grade Template",
				"template_name": name,
				"company": self.company,
				"academic_year": "_Test Grade Template Year",
				"academic_term": "_Test Grade Template Year (Term 1)",
				"weightage_type": "Assignment Type Weightage",
				"assignment_weights": [
					{"assignment_type": "_Test Homework", "weightage": 40},
					{"assignment_type": "_Test Exam", "weightage": 60},
				],
			}
		).insert()

		self.assertEqual(template.name, name)
		frappe.delete_doc("Grade Template", name)
