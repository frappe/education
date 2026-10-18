# Copyright (c) 2026, Frappe Technologies Pvt. Ltd. and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document


class CeremonyRegistration(Document):
	def validate(self):
		if len(self.guests) > self.allowed_guests:
			frappe.throw(
				_(
					f"Number of guests cannot exceed {self.allowed_guests}. Currently added: {len(self.guests)}"
				)
			)
