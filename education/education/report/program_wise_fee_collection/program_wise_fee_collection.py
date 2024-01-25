# Copyright (c) 2013, Frappe Technologies Pvt. Ltd. and contributors
# For license information, please see license.txt


import frappe
from frappe import _
from frappe.query_builder.functions import Sum


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
			"fieldname": "fees_collected",
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

	fee_details = (
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
		.orderby("paid_amount", order=frappe.qb.desc)
	).run(as_dict=1)

	for entry in fee_details:
		data.append(
			{
				"program": entry.program,
				"fees_collected": entry.paid_amount,
				"outstanding_amount": entry.outstanding_amount,
				"grand_total": entry.grand_total,
			}
		)

	return data


def get_filter_conditions(filters):
	conditions = ""

	if filters.get("from_date") and filters.get("to_date"):
		conditions += " and posting_date BETWEEN '%s' and '%s'" % (
			filters.get("from_date"),
			filters.get("to_date"),
		)

	return conditions


def get_chart_data(data):
	if not data:
		return

	labels = []
	fees_collected = []
	outstanding_amount = []

	for entry in data:
		labels.append(entry.get("program"))
		fees_collected.append(entry.get("fees_collected"))
		outstanding_amount.append(entry.get("outstanding_amount"))

	return {
		"data": {
			"labels": labels,
			"datasets": [
				{"name": _("Fees Collected"), "values": fees_collected},
				{"name": _("Outstanding Amt"), "values": outstanding_amount},
			],
		},
		"type": "bar",
	}
