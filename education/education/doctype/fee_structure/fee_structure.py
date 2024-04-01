# Copyright (c) 2015, Frappe Technologies and contributors
# For license information, please see license.txt


import json
import frappe
from frappe import _

from frappe.model.document import Document
from frappe.model.mapper import get_mapped_doc
from frappe.utils import flt
from education.education.doctype.fee_category.fee_category import create_item


class FeeStructure(Document):
	def validate(self):
		self.calculate_total()
		self.validate_discount()

	def calculate_total(self):
		"""Calculates total amount."""
		self.total_amount = 0
		for d in self.components:
			d.total = flt(d.amount) - (d.amount * (flt(d.discount) / 100))
			self.total_amount += d.total

	def validate_discount(self):
		for component in self.components:
			if flt(component.discount) > 100:
				frappe.throw(
					_("Discount cannot be greater than 100%  in row {0}").format(component.idx)
				)

	def before_submit(self):
		for component in self.components:
			# create item for each component if it doesn't exist
			if not component.get("item"):
				self.create_item_master_and_save_item_in_fee_component(component)

	def create_item_master_and_save_item_in_fee_component(self, component):
		# create item master from fee category
		item = create_item(component, use_name_field=False)
		component.item = item
		# store the item in the component doc
		component_doc = frappe.get_doc("Fee Category", component.fees_category)
		component_doc.item = item
		component_doc.save()


@frappe.whitelist()
def get_amount_distribution_based_on_fee_plan(
	components,
	total_amount=0,
	fee_plan="Monthly",
	academic_year=None,
):

	total_amount = flt(total_amount)
	components = json.loads(components)

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
		"Monthly": {"month_list": month_list, "amount": 1 / 12},
		"Quarterly": {
			"month_list": ["April", "July", "October", "January"],
			"amount": 1 / 4,
		},
		"Semi-Annually": {"month_list": ["April", "October"], "amount": 1 / 2},
		"Term-Wise": {"month_list": [], "amount": 0},
		"Annually": {"month_list": ["April"], "amount": 1},
	}

	academic_terms = []
	if fee_plan == "Term-Wise":
		academic_terms = frappe.get_list(
			"Academic Term",
			filters={"academic_year": academic_year},
			fields=["name", "term_start_date"],
			order_by="term_start_date asc",
		)
		if not academic_terms:
			frappe.throw(
				_("No Academic Terms found for Academic Year {0}").format(academic_year)
			)
		month_dict.get(fee_plan)["amount"] = 1 / len(academic_terms)

		for term in academic_terms:
			term_start_date = term.get("term_start_date")
			month_dict.get(fee_plan)["month_list"].append(
				{"term": term.get("name"), "due_date": term.get("term_start_date")}
			)

	month_list_and_amount = month_dict[fee_plan]

	per_component_amount = {}
	for component in components:
		per_component_amount[component.get("fees_category")] = component.get(
			"total"
		) * month_list_and_amount.get("amount")

	amount = sum(per_component_amount.values())

	final_month_list = []

	if fee_plan == "Term-Wise":
		for term in month_list_and_amount.get("month_list"):
			final_month_list.append(
				{"term": term.get("term"), "due_date": term.get("due_date"), "amount": amount}
			)

	else:
		for month in month_list_and_amount.get("month_list"):
			date = frappe.utils.data.get_first_day(month)
			final_month_list.append({"month": month, "due_date": date, "amount": amount})

	return {"distribution": final_month_list, "per_component_amount": per_component_amount}


@frappe.whitelist()
def make_fee_schedule(
	source_name, dialog_values, per_component_amount, target_doc=None
):

	dialog_values = json.loads(dialog_values)
	per_component_amount = json.loads(per_component_amount)

	student_groups = dialog_values.get("student_groups")
	monthly_distribution = [
		month.get("due_date") for month in dialog_values.get("distribution", [])
	]

	for distribution in dialog_values.get("distribution", []):
		validate_due_date(distribution.get("due_date"), distribution.get("idx"))

		doc = get_mapped_doc(
			"Fee Structure",
			source_name,
			{
				"Fee Structure": {
					"doctype": "Fee Schedule",
				},
				"Fee Component": {"doctype": "Fee Component"},
			},
		)
		doc.due_date = distribution.get("due_date")
		if distribution.get("term"):
			doc.academic_term = distribution.get("term")
		amount_per_month = 0

		for component in doc.components:
			component.total = per_component_amount.get(component.fees_category)
			discount = flt(component.discount) / 100
			component.amount = flt((component.total) / (1 - discount))
			amount_per_month += component.total
		# amount_per_month will be the total amount for each Fee Structure
		doc.total_amount = amount_per_month
		for group in student_groups:
			fee_schedule_student_group = doc.append("student_groups", {})
			fee_schedule_student_group.student_group = group.get("student_group")

		doc.save()

	return len(monthly_distribution)
	# return doc

	# create fee schedule for


def validate_due_date(due_date, idx):
	if due_date < frappe.utils.nowdate():
		frappe.throw(
			_("Due Date in row {0} should be greater than or same as today's date.").format(idx)
		)


@frappe.whitelist()
def make_term_wise_fee_schedule(source_name, target_doc=None):

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
