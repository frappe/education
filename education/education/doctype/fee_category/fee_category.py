# Copyright (c) 2015, Frappe Technologies and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class FeeCategory(Document):
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

	item.insert()
	return item.name


def update_item(doc):
	item = frappe.get_doc("Item", doc.name)
	item.item_name = doc.name
	item.description = doc.description
	item.save()
	return item.name
