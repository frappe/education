# Copyright (c) 2015, Frappe Technologies and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class FeeCategory(Document):
	def after_insert(self):
		# create an item
		item_master = frappe.new_doc("Item")
		item_master.item_code = self.name
		item_master.item_name = self.name
		# TODO: After installation create an item group called Fee Component
		item_master.item_group = "Fee Component"
		item_master.insert()
