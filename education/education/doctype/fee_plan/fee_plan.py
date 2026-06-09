# Copyright (c) 2026, Frappe Technologies Pvt. Ltd. and contributors
# For license information, please see license.txt

import erpnext
import frappe
from frappe.model.document import Document
from frappe.utils import flt, add_to_date


class FeePlan(Document):
	# def validate(self):
	# 	self.calculate_total_amount()
	# 	self.calculate_total_and_program()
	# 	self.validate_fee_components()
	# 	self.validate_total_against_fee_strucuture()

	# def onload(self):
	#     info = self.get_dashboard_info()
	#     self.set_onload("dashboard_info", info)

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

	def on_submit(self):
		fee_types_to_check = [
			"Fixed Fees of Days",
			"Fixed Fees of Dates",
			"Duration Based Fees",
		]
		if self.fee_plan_details:
			for component in self.fee_plan_details:
				if flt(component.amount) <= 0:
					frappe.throw("Amount must be greater than zero for all fee components")

		if not self.fee_term:
			frappe.throw("Fee Term is required to submit the Fee Plan")

		if self.fee_term_type and self.fee_term_type in fee_types_to_check:
			fee_term_doc = frappe.get_doc("Fee Term", self.fee_term)
			print(f"Fee Term Document: {fee_term_doc.fee_components}")
			fee_plan_details = self.calculate_installment_components(
				fee_term_doc.total_amount,
				fee_term_doc.fee_components,
				self.fee_plan_details,
			)

			self.create_invoices(fee_plan_details)

	def calculate_installment_components(
		self, total_amount, fee_components, fee_plan_details
	):
		total = total_amount

		allocated = {c.get("fees_category"): 0.0 for c in fee_components}

		result = []

		for idx, detail in enumerate(fee_plan_details):
			is_last = idx == len(fee_plan_details) - 1
			detail_amount = flt(detail.get("amount"))
			components = []

			if is_last:
				for component in fee_components:
					remainder = flt(component.get("total")) - allocated[component.get("fees_category")]
					components.append(
						{
							"fees_category": component.get("fees_category"),
							"total": float(remainder),
							"item": component.get("item"),
						}
					)
			else:
				component_total = 0.0

				for i, component in enumerate(fee_components):
					component_amount = flt(component.get("total"))
					is_last_component = i == len(fee_components) - 1

					if is_last_component:
						amount = detail_amount - component_total
					else:
						proportion = component_amount / total
						amount = flt(detail_amount * proportion)
						component_total += amount

					allocated[component.get("fees_category")] += amount

					components.append(
						{
							"fees_category": component.get("fees_category"),
							"amount": float(amount),
							"item": component.get("item"),
						}
					)

			result.append(
				{
					"fee_plan_detail": detail.get("name"),
					"due_date": detail.get("date"),
					"total": float(detail_amount),
					"components": components,
				}
			)

		return result

	def create_invoices(self, fee_plan_details):
		try:
			for detail in fee_plan_details:
				customer = frappe.get_value("Student", self.student, "customer")
				invoice = frappe.new_doc("Sales Invoice")
				invoice.customer = customer
				invoice.student = self.student
				invoice.fee_plan = self.name
				invoice.set_posting_time = 1
				invoice.posting_date = detail.get("due_date")
				invoice.due_date = detail.get("due_date")
				print(
					f"Creating invoice for customer: {customer}, due date: {invoice.due_date}, total: {detail.get('total')}, posting date: {invoice.posting_date}"
				)
				for component in detail.get("components", []):
					invoice.append(
						"items",
						{
							"item_code": component.get("item"),
							"rate": component.get("amount"),
							"qty": 1,
						},
					)
				invoice.insert()
				invoice.submit()
				frappe.db.set_value(
					"Fee Plan Detail",
					detail.get("fee_plan_detail"),
					{"invoice": invoice.name, "invoice_status": invoice.status},
				)
		except Exception as e:
			frappe.log_error(f"Error creating invoice: {str(e)}")
			frappe.db.rollback()
			frappe.throw(
				"An error occurred while creating invoices. Please check the error log for details."
			)

	# def get_dashboard_info(self):
	#     info = {
	#         "total_paid": 0,
	#         "total_unpaid": 0,
	#         "currency": erpnext.get_company_currency(self.company),
	#     }

	#     fees_amount = frappe.db.sql(
	#         """select sum(grand_total), sum(outstanding_amount) from `tabSales Invoice`
	#         where fee_plan=%s and docstatus=1 and student is not null""",
	#         (self.name),
	#     )

	#     if fees_amount:
	#         info["total_paid"] = flt(fees_amount[0][0]) - flt(fees_amount[0][1])
	#         info["total_unpaid"] = flt(fees_amount[0][1])

	#     return info

	def update_outstanding_amount(self):
		total_paid = 0
		total_outstanding = 0
		for detail in self.fee_plan_details:
			total_paid += flt(detail.paid_amount)

		total_outstanding = flt(self.total_amount) - total_paid

		self.db_set("paid_amount", total_paid)
		self.db_set("outstanding_amount", total_outstanding)


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
