# Copyright (c) 2026, Frappe Technologies Pvt. Ltd. and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import getdate, nowdate


class HostelBed(Document):
	def validate(self):
		if self.under_maintenance and self.current_allocation:
			frappe.throw(
				_(
					"Bed {0} is occupied by {1}. Check the student out before marking it under maintenance."
				).format(frappe.bold(self.name), frappe.bold(self.current_student))
			)
		reserved = bool(
			self.current_allocation
			and getdate(frappe.db.get_value("Hostel Allocation", self.current_allocation, "from_date"))
			> getdate(nowdate())
		)
		self.status = get_bed_status(self.disabled, self.under_maintenance, self.current_allocation, reserved)


def get_bed_status(disabled, under_maintenance, current_allocation, reserved=False):
	"""Reserved means the allocation holding the bed has not started yet."""
	if current_allocation:
		return "Reserved" if reserved else "Occupied"
	if disabled:
		return "Disabled"
	if under_maintenance:
		return "Under Maintenance"
	return "Vacant"
