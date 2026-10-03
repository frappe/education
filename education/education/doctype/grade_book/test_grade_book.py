# Copyright (c) 2026, Frappe Technologies Pvt. Ltd. and Contributors
# See license.txt

import frappe
from frappe.tests.utils import FrappeTestCase

from education.education.test_utils import create_grading_scale


class TestGradeBook(FrappeTestCase):
	def setUp(self):
		self.scale = "_Test GPA Grading Scale"
		create_grading_scale(self.scale)

	def tearDown(self):
		frappe.db.rollback()

	def test_compute_overall_uses_scale(self):
		grade_book = frappe.new_doc("Grade Book")
		grade_book.grading_scale = self.scale
		grade_book.status = "Computed"
		grade_book.append(
			"subjects",
			{
				"subject": "Math",
				"computed_percentage": 80,
				"computed_grade": "A",
				"percentage": 80,
				"grade": "A",
			},
		)
		grade_book.append(
			"subjects",
			{
				"subject": "Science",
				"computed_percentage": 70,
				"computed_grade": "B",
				"percentage": 70,
				"grade": "B",
			},
		)
		grade_book.compute_overall()

		self.assertEqual(grade_book.overall_percentage, 75)
		self.assertEqual(grade_book.overall_grade, "B")

	def test_override_recalculates_letter_grade_from_scale(self):
		grade_book = frappe.new_doc("Grade Book")
		grade_book.grading_scale = self.scale
		grade_book.status = "Computed"
		grade_book.append(
			"subjects",
			{
				"subject": "Math",
				"computed_percentage": 80,
				"computed_grade": "A",
				"percentage": 55,
				"is_overridden": 1,
				"override_comment": "Makeup exam",
			},
		)
		grade_book.apply_overrides_and_totals()

		self.assertEqual(grade_book.subjects[0].grade, "D")
		self.assertEqual(grade_book.overall_grade, "D")
