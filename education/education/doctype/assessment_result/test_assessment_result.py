# Copyright (c) 2015, Frappe Technologies Pvt. Ltd. and Contributors
# See license.txt


from frappe.tests.utils import FrappeTestCase

from education.education.api import get_grade

# test_records = frappe.get_test_records('Assessment Result')


class TestAssessmentResult(FrappeTestCase):
	def test_grade(self):
		grade = get_grade("_Test Grading Scale", 80)
		self.assertEqual("A", grade)

		grade = get_grade("_Test Grading Scale", 70)
		self.assertEqual("B", grade)
