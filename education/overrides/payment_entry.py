import frappe


def on_payment_entry_submit(doc, method=None):
	update_fee_plan_invoice_status(doc)


def on_payment_entry_cancel(doc, method=None):
	update_fee_plan_invoice_status(doc)


def update_fee_plan_invoice_status(payment_entry):
	if payment_entry.payment_type != "Receive":
		return

	for ref in payment_entry.references:
		if ref.reference_doctype != "Sales Invoice":
			continue

		invoice_name = ref.reference_name

		invoice_doc = frappe.get_doc("Sales Invoice", invoice_name)

		fee_plan_name = invoice_doc.fee_plan
		if not fee_plan_name:
			continue

		child_row = frappe.db.get_value(
			"Fee Plan Detail",
			{"parent": fee_plan_name, "invoice": invoice_name},
			["name", "paid_amount"],
			as_dict=True,
		)

		if not child_row:
			continue

		frappe.db.set_value(
			"Fee Plan Detail",
			child_row.name,
			{
				"invoice_status": invoice_doc.status,
				"paid_amount": invoice_doc.grand_total - invoice_doc.outstanding_amount,
			},
		)

		frappe.get_doc("Fee Plan", fee_plan_name).run_method("update_outstanding_amount")

	frappe.db.commit()


def on_unreconcile_payment(doc, method=None):
	for allocation in doc.allocations:
		if allocation.reference_doctype == "Sales Invoice":
			invoice_doc = frappe.get_doc(allocation.reference_doctype, allocation.reference_name)
			fee_plan_name = invoice_doc.fee_plan
			if fee_plan_name:
				child_row = frappe.db.get_value(
					"Fee Plan Detail",
					{"parent": fee_plan_name, "invoice": invoice_doc.name},
					["name"],
					as_dict=True,
				)
				if child_row:
					frappe.db.set_value(
						"Fee Plan Detail",
						child_row.name,
						{
							"invoice_status": invoice_doc.status,
							"paid_amount": invoice_doc.grand_total - invoice_doc.outstanding_amount,
						},
					)
					frappe.get_doc("Fee Plan", fee_plan_name).run_method("update_outstanding_amount")

	frappe.db.commit()


def on_payment_entry_update_after_submit(doc, method=None):
	if not doc.has_value_changed("references"):
		return

	for ref in doc.references:
		if ref.reference_doctype == "Sales Invoice":
			invoice_doc = frappe.get_doc(ref.reference_doctype, ref.reference_name)
			fee_plan_name = invoice_doc.fee_plan
			if fee_plan_name:
				child_row = frappe.db.get_value(
					"Fee Plan Detail",
					{"parent": fee_plan_name, "invoice": invoice_doc.name},
					["name", "paid_amount", "amount"],
					as_dict=True,
				)
				if child_row and (child_row.paid_amount != child_row.amount):
					paid_amount = child_row.paid_amount + ref.allocated_amount
					frappe.db.set_value(
						"Fee Plan Detail",
						child_row.name,
						{
							"invoice_status": (
								"Paid" if paid_amount == invoice_doc.grand_total else invoice_doc.status
							),
							"paid_amount": paid_amount,
						},
					)
					frappe.get_doc("Fee Plan", fee_plan_name).run_method("update_outstanding_amount")

	frappe.db.commit()
