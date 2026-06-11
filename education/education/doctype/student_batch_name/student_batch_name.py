# Copyright (c) 2015, Frappe Technologies Pvt. Ltd. and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document


class StudentBatchName(Document):
	def validate(self):
		if self.end_date < self.start_date:
			frappe.throw(_("End Date cannot be before Start Date"))
