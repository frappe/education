# Copyright (c) 2015, Frappe Technologies and contributors
# For license information, please see license.txt


import frappe
from frappe import _

from frappe.model.document import Document
from frappe.model.mapper import get_mapped_doc
from frappe.utils import flt


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
def get_distribution_based_on_fee_plan(fee_plan="Monthly", total_amount=0):

	total_amount = flt(total_amount)

	month_list = [
		"January",
		"February",
		"March",
		"April",
		"May",
		"June",
		"July",
		"August",
		"September",
		"October",
		"November",
		"December",
	]

	month_dict = {
		"Monthly": {"month_list": month_list, "amount": total_amount / 12},
		"Quarterly": {
			"month_list": ["April", "July", "October", "January"],
			"amount": total_amount / 4,
		},
		"Semi-Annually": {"month_list": ["April", "October"], "amount": total_amount / 2},
		"Annually": {"month_list": ["April"], "amount": total_amount},
	}

	month_list_and_amount = month_dict[fee_plan]
	final_month_list = []

	for month in month_list_and_amount.get("month_list"):
		date = frappe.utils.data.get_first_day(month)
		final_month_list.append(
			{"month": month, "due_date": date, "amount": month_list_and_amount.get("amount")}
		)

	return final_month_list


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
