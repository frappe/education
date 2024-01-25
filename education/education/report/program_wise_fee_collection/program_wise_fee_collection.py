# Copyright (c) 2013, Frappe Technologies Pvt. Ltd. and contributors
# For license information, please see license.txt


import frappe
from frappe import _
from frappe.query_builder.functions import Sum
from frappe.query_builder import Order


def execute(filters=None):
	if not filters:
		filters = {}

	columns = get_columns(filters)
	data = get_data(filters)
	chart = get_chart_data(data)

	return columns, data, None, chart


def get_columns(filters=None):
	return [
		{
			"label": _("Program"),
			"fieldname": "program",
			"fieldtype": "Link",
			"options": "Program",
			"width": 300,
		},
		{
			"label": _("Fees Collected"),
			"fieldname": "paid_amount",
			"fieldtype": "Currency",
			"width": 200,
		},
		{
			"label": _("Outstanding Amount"),
			"fieldname": "outstanding_amount",
			"fieldtype": "Currency",
			"width": 200,
		},
		{
			"label": _("Grand Total"),
			"fieldname": "grand_total",
			"fieldtype": "Currency",
			"width": 200,
		},
	]


def get_data(filters=None):
	data = []

	sales_invoice = frappe.qb.DocType("Sales Invoice")
	fee_schedule = frappe.qb.DocType("Fee Schedule")

	sales_invoice_details = (
		frappe.qb.from_(sales_invoice)
		.inner_join(fee_schedule)
		.on(sales_invoice.fee_schedule == fee_schedule.name)
		.select(
			fee_schedule.program,
			(Sum(sales_invoice.grand_total) - Sum(sales_invoice.outstanding_amount)).as_(
				"paid_amount"
			),
			Sum(sales_invoice.outstanding_amount).as_("outstanding_amount"),
			Sum(sales_invoice.grand_total).as_("grand_total"),
		)
		.where(
			(sales_invoice.docstatus == 1)
			& (sales_invoice.student.isnotnull())
			& (sales_invoice.posting_date >= filters.get("from_date"))
			& (sales_invoice.posting_date < filters.get("to_date"))
		)
		.groupby(fee_schedule.program)
		.orderby("paid_amount", order=Order.desc)
	).run(as_dict=1)
	fee = frappe.qb.DocType("Fees")
	fee_details = (
		frappe.qb.from_(fee)
		.select(
			fee.program,
			(Sum(fee.grand_total) - Sum(fee.outstanding_amount)).as_("paid_amount"),
			Sum(fee.outstanding_amount).as_("outstanding_amount"),
			Sum(fee.grand_total).as_("grand_total"),
		)
		.where(
			(fee.docstatus == 1)
			& (fee.program.isnotnull())
			& (fee.posting_date.between(filters.get("from_date"), filters.get("to_date")))
		)
		.groupby(fee.program)
		.orderby("paid_amount", order=Order.desc)
	).run(as_dict=1)

	if not fee_details:
		return sales_invoice_details
	if not sales_invoice_details:
		return fee_details

	data = [*fee_details]

	fee_details_dict = {item["program"]: item for item in data}
	program_in_fees = list(fee_details_dict.keys())

	for detail in sales_invoice_details:
		if detail.get("program") in program_in_fees:
			existing_program = fee_details_dict[detail.get("program")]
			existing_program["paid_amount"] += detail.get("paid_amount")
			existing_program["outstanding_amount"] += detail.get("outstanding_amount")
			existing_program["grand_total"] += detail.get("grand_total")
		else:
			data.append(detail)

	return data


def get_chart_data(data):
	if not data:
		return

	labels = []
	paid_amount = []
	outstanding_amount = []

	for entry in data:
		labels.append(entry.get("program"))
		paid_amount.append(entry.get("paid_amount"))
		outstanding_amount.append(entry.get("outstanding_amount"))

	return {
		"data": {
			"labels": labels,
			"datasets": [
				{"name": _("Fees Collected"), "values": paid_amount},
				{"name": _("Outstanding Amt"), "values": outstanding_amount},
			],
		},
		"type": "bar",
	}
