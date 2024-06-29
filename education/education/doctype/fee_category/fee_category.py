# Copyright (c) 2015, Frappe Technologies and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe import _


class FeeCategory(Document):
	def validate(self):
		self.update_defaults_from_item_group()
		self.validate_duplicate_item_defaults()

	def after_insert(self):
		# create an item
		item_name = create_item(self)
		self.item = item_name
		self.save()

	def on_update(self):
		# update item
		item_name = update_item(self)
		self.item = item_name

	def on_trash(self):
		# delete item
		frappe.delete_doc("Item", self.name, force=1)

	def update_defaults_from_item_group(self):
		"""Get defaults from Item Group"""
		item_group = "Fee Component"
		if self.item_defaults:
			return

		item_defaults = frappe.db.get_values(
			"Item Default",
			{"parent": item_group},
			[
				"company",
				"selling_cost_center",
				"income_account",
			],
			as_dict=1,
		)
		if item_defaults:
			update_item_defaults(self, item_defaults)
			frappe.msgprint(_('Defaults fetched from "Fee Component" Item Group '), alert=True)

	def validate_duplicate_item_defaults(self):
		"""Validate duplicate item defaults"""
		companies = [d.company for d in self.item_defaults]
		if len(companies) != len(set(companies)):
			frappe.throw(_("Cannot set multiple Item Defaults for a company."))


def create_item(doc, use_name_field=True):
	name_field = doc.name if use_name_field else doc.fees_category
	if frappe.db.exists("Item", name_field):
		return frappe.db.get_value("Item", name_field, "name")

	item = frappe.new_doc("Item")
	item.item_code = name_field
	item.description = doc.description
	item.item_group = "Fee Component"
	item.is_sales_item = 1
	item.is_service_item = 1
	item.is_stock_item = 0
	update_item_defaults(item, doc.item_defaults)
	item.insert()
	return item.name


def update_item(fee_category):
	item = frappe.get_doc("Item", fee_category.name)
	item.item_name = fee_category.name
	item.description = fee_category.description

	item_defaults = frappe.get_all(
		"Item Default",
		{"parent": fee_category.item},
		["company", "selling_cost_center", "income_account"],
	)
	item_default_companies = [d.company for d in item_defaults]
	fee_category_companies = [d.company for d in fee_category.item_defaults]
	for fee_category_default in fee_category.item_defaults:
		if fee_category_default.company not in item_default_companies:
			add_item_defaults(item, fee_category_default)
		else:
			update_defaults(item, fee_category_default)

	remove_item_defaults(item, fee_category_companies)
	item.save()
	return item.name


def add_item_defaults(item, fee_category_defaults):
	item.append(
		"item_defaults",
		{
			"company": fee_category_defaults.company,
			"selling_cost_center": fee_category_defaults.selling_cost_center,
			"income_account": fee_category_defaults.income_account,
			"default_warehouse": "",
		},
	)


def update_defaults(item, fee_category_default):
	for d in item.item_defaults:
		if d.company == fee_category_default.company:
			d.selling_cost_center = fee_category_default.selling_cost_center
			d.income_account = fee_category_default.income_account
			break


def remove_item_defaults(item, fee_category_companies):
	items_to_remove = []
	for d in item.item_defaults:
		if d.company not in fee_category_companies:
			items_to_remove.append(d.idx)

	for idx in items_to_remove:
		item.item_defaults.pop(idx - 1)


def update_item_defaults(item, defaults):
	for item_default in defaults:
		item.append(
			"item_defaults",
			{
				"company": item_default.company,
				"selling_cost_center": item_default.selling_cost_center,
				"income_account": item_default.income_account,
				"default_warehouse": "",
			},
		)
