# Copyright (c) 2026, Frappe Technologies Pvt. Ltd. and contributors
# For license information, please see license.txt

# import frappe
from frappe.model.document import Document

from ...utils import update_copy_counts


class MediaCopy(Document):
	def on_update(self):
		if self.has_value_changed("status"):
			update_copy_counts(self.media)
