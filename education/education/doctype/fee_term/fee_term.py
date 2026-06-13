# Copyright (c) 2026, Frappe Technologies Pvt. Ltd. and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import flt, getdate


class FeeTerm(Document):
	def validate(self):
		self.validate_fee_components()
		self.validate_payment_terms()
		self.validate_duration_settings()

	def validate_fee_components(self):
		if not self.fee_components:
			frappe.throw(_("At least one Fee Component is required."))

		seen_categories = set()
		for component in self.fee_components:
			if component.fees_category in seen_categories:
				frappe.throw(
					_(
						"Row {0}: Fee Category {1} is duplicated. Each Fee Category can only be added once."
					).format(component.idx, frappe.bold(component.fees_category))
				)
			seen_categories.add(component.fees_category)

		if len(self.fee_components) > 1 and any(
			flt(component.value) >= 100 for component in self.fee_components
		):
			frappe.throw(_("The percentage must be distributed across all the Fee Components."))

		total = sum(flt(component.value) for component in self.fee_components)
		if flt(total, 2) != 100:
			frappe.throw(
				_("Total value of all Fee Components must be 100%, currently {0}%.").format(
					flt(total, 2)
				)
			)

	def validate_payment_terms(self):
		if self.term_type not in ("Fixed Fees of Days", "Fixed Fees of Dates"):
			return

		if not self.payment_terms:
			frappe.throw(
				_("Payment Terms are required for term type {0}.").format(self.term_type)
			)

		for row in self.payment_terms:
			if self.term_type == "Fixed Fees of Days" and not row.due_days:
				frappe.throw(
					_("Row {0}: Due Days is mandatory for term type {1}.").format(
						row.idx, self.term_type
					)
				)

			if self.term_type == "Fixed Fees of Dates":
				if not row.due_date:
					frappe.throw(
						_("Row {0}: Due Date is mandatory for term type {1}.").format(
							row.idx, self.term_type
						)
					)
				if self.posting_date and getdate(row.due_date) < getdate(self.posting_date):
					frappe.throw(_("Row {0}: Due Date cannot be before Posting Date.").format(row.idx))

		total_percent = sum(flt(row.percent_of_total) for row in self.payment_terms)
		if flt(total_percent, 2) != 100:
			frappe.throw(
				_(
					"Total Percent of Total of all Payment Terms must be 100%, currently {0}%."
				).format(flt(total_percent, 2))
			)

	def validate_duration_settings(self):
		if self.term_type != "Duration Based Fees":
			return

		if not self.bill_every:
			frappe.throw(_("Bill Every is required for Duration Based Fees."))

		if not self.invoice_cycles or self.invoice_cycles <= 0:
			frappe.throw(_("Invoice Cycles must be greater than zero for Duration Based Fees."))

		if not self.fees_start_date:
			frappe.throw(_("Fees Start Date is required for Duration Based Fees."))
