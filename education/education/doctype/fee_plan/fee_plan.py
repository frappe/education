# Copyright (c) 2026, Frappe Technologies Pvt. Ltd. and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import add_to_date, cint, flt, getdate

INSTALLMENT_TERM_TYPES = (
	"Fixed Fees of Days",
	"Fixed Fees of Dates",
	"Duration Based Fees",
)


class FeePlan(Document):
	def before_save(self):
		self.update_totals()

	def update_totals(self):
		if self.fee_plan_details:
			self.total_amount = sum(flt(d.amount) for d in self.fee_plan_details)

		total_paid = sum(flt(d.paid_amount) for d in self.fee_plan_details)
		self.paid_amount = total_paid
		self.outstanding_amount = flt(self.total_amount) - total_paid

	def on_submit(self):
		if not self.fee_term:
			frappe.throw(_("Fee Term is required to submit the Fee Plan."))

		if self.fee_term_type in INSTALLMENT_TERM_TYPES:
			if not self.fee_plan_details:
				frappe.throw(_("There are no fee plan installments to invoice."))
			self.create_invoices()

	def on_cancel(self):
		self.ignore_linked_doctypes = ("GL Entry", "Stock Ledger Entry")
		self.cancel_invoices()

	def create_invoices(self):
		fee_term = frappe.get_doc("Fee Term", self.fee_term)
		customer = frappe.db.get_value("Student", self.student, "customer")
		if not customer:
			frappe.throw(_("Student {0} does not have a linked Customer.").format(self.student))

		for detail in self.fee_plan_details:
			if detail.invoice:
				continue
			invoice = self.make_sales_invoice(fee_term, customer, detail)
			detail.db_set("invoice", invoice.name)
			detail.db_set("invoice_status", invoice.status)

	def make_sales_invoice(self, fee_term, customer, detail):
		invoice = frappe.new_doc("Sales Invoice")
		invoice.customer = customer
		invoice.student = self.student
		invoice.fee_plan = self.name
		invoice.company = fee_term.company
		invoice.set_posting_time = 1
		invoice.posting_date = detail.date
		invoice.due_date = detail.date

		if fee_term.receivable_account:
			invoice.debit_to = fee_term.receivable_account

		for component in fee_term.fee_components:
			if not component.item:
				frappe.throw(
					_("Fee Category {0} does not have a linked Item.").format(component.fees_category)
				)
			invoice.append(
				"items",
				{
					"item_code": component.item,
					"qty": 1,
					"rate": flt(detail.amount) * flt(component.value) / 100.0,
					"cost_center": fee_term.cost_center,
				},
			)

		invoice.insert(ignore_permissions=True)
		invoice.submit()
		return invoice

	def cancel_invoices(self):
		for detail in self.fee_plan_details:
			if not detail.invoice:
				continue
			invoice = frappe.get_doc("Sales Invoice", detail.invoice)
			if invoice.docstatus == 1:
				invoice.cancel()
			detail.db_set("invoice_status", "Cancelled")

	def update_outstanding_amount(self):
		total_paid = sum(flt(detail.paid_amount) for detail in self.fee_plan_details)
		total_outstanding = flt(self.total_amount) - total_paid

		self.db_set("paid_amount", total_paid)
		self.db_set("outstanding_amount", total_outstanding)


def get_installments(fee_term, total_amount, start_date):
	"""Build the list of installments (date + amount) for a Fee Term.

	The amount of each installment is a portion of ``total_amount`` (the course
	fee). The last installment absorbs any rounding remainder so the sum of all
	installments always equals ``total_amount``.
	"""
	total_amount = flt(total_amount)
	start_date = getdate(start_date)
	installments = []

	if fee_term.term_type == "Duration Based Fees":
		cycles = cint(fee_term.invoice_cycles)
		if cycles <= 0:
			return installments

		unit = "{0}s".format((fee_term.bill_every or "").lower())
		base_amount = flt(total_amount / cycles, 2)
		allocated = 0.0

		for cycle in range(cycles):
			date = start_date if cycle == 0 else add_to_date(start_date, **{unit: cycle})
			if cycle == cycles - 1:
				amount = flt(total_amount - allocated, 2)
			else:
				amount = base_amount
				allocated += amount
			installments.append({"date": date, "amount": amount})

	elif fee_term.term_type in ("Fixed Fees of Dates", "Fixed Fees of Days"):
		rows = fee_term.payment_terms
		allocated = 0.0

		for idx, row in enumerate(rows):
			if fee_term.term_type == "Fixed Fees of Dates":
				date = getdate(row.due_date)
			else:
				date = add_to_date(start_date, days=cint(row.due_days))

			if idx == len(rows) - 1:
				amount = flt(total_amount - allocated, 2)
			else:
				amount = flt(total_amount * flt(row.percent_of_total) / 100.0, 2)
				allocated += amount

			installments.append({"date": date, "amount": amount})

	return installments
