# Copyright (c) 2015, Frappe Technologies and Contributors
# See license.txt

import unittest

import frappe


class TestAcademicYear(unittest.TestCase):
	def test_date_validation(self):
		year = frappe.get_doc(
			{
				"doctype": "Academic Year",
				"year_start_date": "13-02-2023",
				"year_end_date": "27-01-2023",
			}
		)
		self.assertRaises(frappe.ValidationError, year.insert)
