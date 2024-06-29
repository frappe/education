# Copyright (c) 2015, Frappe Technologies and Contributors
# See license.txt

import frappe
from frappe.tests.utils import FrappeTestCase
from education.education.test_utils import (
	create_fee_category,
	create_company,
	get_defaults,
)


class TestFeeCategory(FrappeTestCase):
	def setUp(self):
		create_fee_category("Tuition Fee")
		create_company("Dunder Mifflin Paper Co")

	def tearDown(self):
		frappe.db.rollback()

	def test_item_created(self):
		"""
		Test to check if the item master is created when a Fee Category is created.
		"""
		companies = frappe.db.get_all("Company", fields=["name"])
		item = frappe.db.get_value(
			"Fee Category", filters={"name": "Tuition Fee"}, fieldname="item"
		)
		self.assertTrue(frappe.db.exists("Item", item))

		item_group = frappe.db.get_value(
			"Item", filters={"name": item}, fieldname="item_group"
		)
		self.assertEqual(item_group, "Fee Component")

	def test_item_defaults_from_item_group(self):
		"""
		When creating a Fee Category, if there are no item defaults, then get defaults from Item Group
		"""
		defaults = get_defaults()

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
		defaults = get_defaults()

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

	def test_fee_component_duplicate_default(self):
		"""
		When setting defaults if there are 2 defaults for the same company, then throw an error
		"""
		fee_component = frappe.get_doc("Fee Category", "Tuition Fee")
		# get any income account
		income_account = frappe.get_all("Account", fields=["name"], limit=1)[0]["name"]
		defaults = get_defaults()
		default_array = [
			{
				"company": "_Test Company",
				"income_account": income_account,
				"selling_cost_center": defaults.cost_center,
			},
			{
				"company": "_Test Company",
				"income_account": income_account,
				"selling_cost_center": defaults.cost_center,
			},
		]
		for default in default_array:
			fee_component.append("item_defaults", default)
		self.assertRaises(frappe.ValidationError, fee_component.save)
