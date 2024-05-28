# Copyright (c) 2015, Frappe Technologies and Contributors
# See license.txt

import frappe
from frappe.tests.utils import FrappeTestCase
from education.education.test_utils import create_fee_category


class TestFeeCategory(FrappeTestCase):
	def setUp(self):
		create_fee_category("Tuition Fee")

	def tearDown(self):
		frappe.db.rollback()

	def test_item_created(self):
		fee_category = frappe.get_doc("Fee Category", "Tuition Fee")
		item = fee_category.get("item")
		self.assertTrue(frappe.db.exists("Item", item))

		item = frappe.get_doc("Item", item)
		self.assertEqual(item.item_group, "Fee Component")

	# def test_category_defaults(self):
	# 	fee_category = frappe.get_doc("Fee Category", "Tuition Fee")
	# 	self.assertTrue(fee_category.get('item_defaults'))
	# fieldnames = ["company","income_account","selling_cost_center"]
