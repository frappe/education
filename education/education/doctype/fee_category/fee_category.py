# Copyright (c) 2015, Frappe Technologies and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class FeeCategory(Document):
	def on_update(self):
		# update item
		update_item(self)

	def after_insert(self):
		# create an item
		create_item(self)


def create_item(doc):
	item_master = frappe.new_doc("Item")
	item_master.item_code = doc.name
	item_master.description = doc.description
	# TODO: After installation create an item group called Fee Component
	item_master.item_group = "Fee Component"
	item_master.is_sales_item = 1
	item_master.is_service_item = 1

	item_master.insert()


def update_item(doc):
	item = frappe.get_doc("Item", doc.name)
	item.item_name = doc.name
	item.description = doc.description
	item.save()
