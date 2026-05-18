# Copyright (c) 2026, Frappe Technologies Pvt. Ltd. and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document

from frappe.utils import flt


class FeeTerm(Document):
	def validate(self):

		if self.term_type == "Fixed Fees of Days" and self.fixed_days_payment_terms:
			for term in self.fixed_days_payment_terms:
				if term.due_days <= 0:
					frappe.throw("Due days must be greater than zero for Fixed Fees of Days term type")

			self.validate_percentage("fixed_days_payment_terms")

		if self.term_type == "Fixed Fees of Dates" and self.fixed_dates_payment_terms:
			if any(term.due_date < self.posting_date for term in self.fixed_dates_payment_terms):
				frappe.throw(
					"Due dates cannot be before Posting Date for Fixed Fees of Dates term type"
				)

			self.validate_percentage("fixed_dates_payment_terms")

		if self.term_type == "Duration Based Fees":
			if self.invoice_cycles <= 0:
				frappe.throw("Duration must be greater than zero for Duration Based Fees term type")
			if self.bill_every == "":
				frappe.throw("Bill Every field is required for Duration Based Fees term type")

	def validate_percentage(self, table_field):
		total_percentage = sum(flt(term.percent_of_total) for term in self.get(table_field))
		if total_percentage != 100:
			frappe.throw("Total percentage of payment terms must be 100%")
