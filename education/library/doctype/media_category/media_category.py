# Copyright (c) 2026, Frappe Technologies Pvt. Ltd. and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class MediaCategory(Document):
	def before_insert(self):
		if not self.code:
			self.code = frappe.model.naming.make_autoname("CAT-.#####")
