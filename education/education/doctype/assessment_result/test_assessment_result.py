# Copyright (c) 2015, Frappe Technologies Pvt. Ltd. and Contributors
# See license.txt

import frappe
from frappe.tests.utils import FrappeTestCase

from education.education.api import get_grade
from education.education.test_utils import create_grading_scale

# test_records = frappe.get_test_records('Assessment Result')


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
