# Copyright (c) 2015, Frappe Technologies and Contributors
# See license.txt

import frappe
from frappe.tests.utils import FrappeTestCase
from education.education.test_utils import create_fee_category, create_company


class TestFeeCategory(FrappeTestCase):
	def setUp(self):
		create_fee_category("Tuition Fee")
		create_company("Dunder Mifflin Paper Co")

	def tearDown(self):
		frappe.db.rollback()

	def test_item_created(self):
		companies = frappe.db.get_all("Company", fields=["name"])
		fee_category = frappe.get_doc("Fee Category", "Tuition Fee")
		item = fee_category.get("item")
		self.assertTrue(frappe.db.exists("Item", item))

		item = frappe.get_doc("Item", item)
		self.assertEqual(item.item_group, "Fee Component")

	def test_item_defaults_from_item_group(self):
		"""
		When creating a Fee Category, if there are no item defaults, then get defaults from Item Group
		"""
		defaults = frappe.get_all(
			"Company",
			filters={"name": "_Test Company"},
			fields=["default_income_account", "cost_center"],
		)[0]

		item_group = frappe.get_doc("Item Group", "Fee Component")
		item_group.append(
			"item_group_defaults",
			{
				"company": "_Test Company",
				"income_account": defaults.default_income_account,
				"selling_cost_center": defaults.cost_center,
			},
		)
		item_group.save()

		fee_category = frappe.get_doc("Fee Category", "Tuition Fee")
		fee_category.description = "Test"
		fee_category.save()

		fee_category = frappe.get_doc("Fee Category", "Tuition Fee")
		fee_category_defaults = fee_category.get("item_defaults")[0]

		self.assertEqual(fee_category_defaults.company, "_Test Company")
		self.assertEqual(
			fee_category_defaults.income_account, defaults.default_income_account
		)
		self.assertEqual(fee_category_defaults.selling_cost_center, defaults.cost_center)

	def test_fee_component_defaults_same_as_item_defaults(self):
		"""
		When creating a Fee Category, if the defaults are set in Fee Category those should be saved in the Item Defaults aswell
		"""
		defaults = frappe.get_all(
			"Company",
			filters={"name": "_Test Company"},
			fields=["default_income_account", "cost_center"],
		)[0]
		fee_category_name = "Test Fee Category"
		fee_category = create_fee_category(fee_category_name)
		fee_category.append(
			"item_defaults",
			{
				"company": "_Test Company",
				"income_account": defaults.default_income_account,
				"selling_cost_center": defaults.cost_center,
			},
		)
		fee_category.save()

		item = frappe.get_doc("Item", fee_category_name)
		item_defaults = item.get("item_defaults")[0]

		self.assertEqual(item_defaults.company, "_Test Company")
		self.assertEqual(item_defaults.income_account, defaults.default_income_account)
		self.assertEqual(item_defaults.selling_cost_center, defaults.cost_center)

	def test_fee_component_default_update(self):
		# test while updating, update defaults and in item also have same defaults
		"""
		After updating the fee component defaults, the item defaults should also be updated
		"""
		pass

	def test_fee_component_duplicate_default(self):
		"""
		When setting defaults if there are 2 defaults for the same company, then throw an error
		"""
		pass
