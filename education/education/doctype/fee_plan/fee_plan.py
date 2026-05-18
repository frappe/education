# Copyright (c) 2026, Frappe Technologies Pvt. Ltd. and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.utils import flt, add_to_date


class FeePlan(Document):
	def before_save(self):
		fee_types_to_check = [
			"Fixed Fees of Days",
			"Fixed Fees of Dates",
			"Duration Based Fees",
		]

		if self.fee_term_type and self.fee_term_type in fee_types_to_check:
			total_amount = 0
			total_paid = 0
			total_outstanding = 0
			for component in self.fee_plan_details:
				total_amount += flt(component.amount)
				total_paid += flt(component.paid_amount)

			total_outstanding = total_amount - total_paid

			self.total_amount = total_amount
			self.outstanding_amount = total_outstanding
			self.paid_amount = total_paid


@frappe.whitelist()
def get_fee_plan_details(fee_plan):
	fee_term_doc = frappe.get_doc("Fee Term", fee_plan)

	fee_details = {}

	if fee_term_doc.term_type == "Fixed Fees of Dates":
		for term in fee_term_doc.fixed_dates_payment_terms:
			key = term.name
			if key not in fee_details:
				fee_details[key] = {
					"date": term.due_date,
					"amount": fee_term_doc.total_amount * (flt(term.percent_of_total) / 100),
				}

	elif fee_term_doc.term_type == "Fixed Fees of Days":
		for term in fee_term_doc.fixed_days_payment_terms:
			key = term.name
			if key not in fee_details:
				fee_details[key] = {
					"date": add_to_date(fee_term_doc.posting_date, days=term.due_days),
					"amount": fee_term_doc.total_amount * (flt(term.percent_of_total) / 100),
				}

	elif fee_term_doc.term_type == "Duration Based Fees":
		if fee_term_doc.invoice_cycles > 0 and fee_term_doc.bill_every:
			cycle_duration = f"{fee_term_doc.bill_every}s".lower()
			for cycle in range(fee_term_doc.invoice_cycles):
				key = f"Cycle {cycle + 1}"
				if key not in fee_details:
					fee_details[key] = {
						"date": add_to_date(
							fee_term_doc.fees_start_date or fee_term_doc.posting_date,
							**{cycle_duration: cycle + 1},
						),
						"amount": round(fee_term_doc.total_amount / fee_term_doc.invoice_cycles, 2),
					}

	return list(fee_details.values())
