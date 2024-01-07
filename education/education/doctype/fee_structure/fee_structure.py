# Copyright (c) 2015, Frappe Technologies and contributors
# For license information, please see license.txt


import frappe
from frappe import _

from frappe.model.document import Document
from frappe.model.mapper import get_mapped_doc


class FeeStructure(Document):
	def validate(self):
		self.calculate_total()
		self.validate_discount()

	def calculate_total(self):
		"""Calculates total amount."""
		self.total_amount = 0
		for d in self.components:
			self.total_amount += d.amount

	def validate_discount(self):
		for component in self.components:

			if component.discount > 100:
				frappe.throw(
					_("Discount cannot be greater than 100%  in row {0}").format(component.idx)
				)


@frappe.whitelist()
def make_fee_schedule(source_name, target_doc=None):
	return get_mapped_doc(
		"Fee Structure",
		source_name,
		{
			"Fee Structure": {
				"doctype": "Fee Schedule",
				"validation": {
					"docstatus": ["=", 1],
				},
			},
			"Fee Component": {"doctype": "Fee Component"},
		},
		target_doc,
	)
