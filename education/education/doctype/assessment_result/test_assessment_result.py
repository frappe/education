# Copyright (c) 2015, Frappe Technologies Pvt. Ltd. and Contributors
# See license.txt

import frappe
from frappe.tests.utils import FrappeTestCase

from education.education.api import get_grade, get_grade_details
from education.education.test_utils import create_grading_scale


class TestAssessmentResult(FrappeTestCase):
	def setUp(self):
		create_grading_scale()

	def tearDown(self):
		frappe.db.rollback()

	def test_grade(self):
		grade = get_grade("_Test Grading Scale", 80)
		self.assertEqual("A", grade)

		grade = get_grade("_Test Grading Scale", 70)
		self.assertEqual("B", grade)

	def test_grade_between_intervals(self):
		# _Test Grading Scale has B at 70-79 and A at 80-100
		self.assertEqual("B", get_grade("_Test Grading Scale", 79.5))
		self.assertEqual("D", get_grade("_Test Grading Scale", 59.99))

		details = get_grade_details("_Test Grading Scale", 49.5)
		self.assertEqual("F", details.grade_code)
		self.assertEqual(0, details.earn_credits)

	def test_grade_details_include_gpa(self):
		scale_name = "_Test GPA Grading Scale"
		create_grading_scale(scale_name)
		details = get_grade_details(scale_name, 80)
		self.assertEqual("A", details.grade_code)
		self.assertEqual(4.0, details.gpa)
		self.assertEqual(1, details.include_gpa)
		self.assertEqual(1, details.earn_credits)

		failing = get_grade_details(scale_name, 40)
		self.assertEqual("F", failing.grade_code)
		self.assertEqual(0.0, failing.gpa)
		self.assertEqual(0, failing.earn_credits)
