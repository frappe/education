# Copyright (c) 2017, Frappe Technologies Pvt. Ltd. and contributors
# For license information, please see license.txt


import erpnext
import frappe
from frappe import _
from frappe.model.document import Document
from frappe.model.mapper import get_mapped_doc
from frappe.utils import cint, cstr, flt, money_in_words
from frappe.utils.background_jobs import enqueue


# TODO: on cancel delete all the fees / Sales Invoice created from this fee schedule


class FeeSchedule(Document):
	def onload(self):
		info = self.get_dashboard_info()
		self.set_onload("dashboard_info", info)

	# def on_cancel(self):
	# 	frappe.db.set_value("Fee Schedule", self.name, "fee_creation_status", "Cancelled")

	def get_dashboard_info(self):
		info = {
			"total_paid": 0,
			"total_unpaid": 0,
			"currency": erpnext.get_company_currency(self.company),
		}

		fees_amount = frappe.db.sql(
			"""select sum(grand_total), sum(outstanding_amount) from `tabSales Invoice`
			where fee_schedule=%s and docstatus=1 and student is not null""",
			(self.name),
		)

		if fees_amount:
			info["total_paid"] = flt(fees_amount[0][0]) - flt(fees_amount[0][1])
			info["total_unpaid"] = flt(fees_amount[0][1])

		return info

	def validate(self):
		self.calculate_total_and_program()

	def calculate_total_and_program(self):
		no_of_students = 0
		for d in self.student_groups:
			# if not d.total_students:
			d.total_students = get_total_students(
				d.student_group, self.academic_year, self.academic_term, self.student_category
			)
			no_of_students += cint(d.total_students)

			# validate the program of fee structure and student groups
			student_group_program = frappe.db.get_value(
				"Student Group", d.student_group, "program"
			)
			if self.program and student_group_program and self.program != student_group_program:
				frappe.msgprint(
					_("Program in the Fee Structure and Student Group {0} are different.").format(
						d.student_group
					)
				)
		self.grand_total = no_of_students * self.total_amount
		self.grand_total_in_words = money_in_words(self.grand_total)

	@frappe.whitelist()
	def create_fees(self):
		self.db_set("fee_creation_status", "In Process")
		frappe.publish_realtime(
			"fee_schedule_progress", {"progress": "0", "reload": 1}, user=frappe.session.user
		)

		total_records = sum([int(d.total_students) for d in self.student_groups])
		if total_records > 10:
			frappe.msgprint(
				_(
					"""Fee records will be created in the background.
				In case of any error the error message will be updated in the Schedule."""
				)
			)
			enqueue(
				generate_sales_invoice,
				queue="default",
				timeout=6000,
				event="generate_sales_invoice",
				fee_schedule=self.name,
			)
		else:
			generate_sales_invoice(self.name)


def generate_sales_invoice(fee_schedule):
	doc = frappe.get_doc("Fee Schedule", fee_schedule)
	error = False
	total_records = sum([int(d.total_students) for d in doc.student_groups])
	created_records = 0

	if not total_records:
		frappe.throw(_("Please setup Students under Student Groups"))

	for d in doc.student_groups:
		students = get_students(
			d.student_group, doc.academic_year, doc.academic_term, doc.student_category
		)
		for student in students:
			try:
				student_id = student.student
				create_sales_invoice(fee_schedule, student_id)
				created_records += 1
				frappe.publish_realtime(
					"fee_schedule_progress",
					{"progress": str(int(created_records * 100 / total_records))},
					user=frappe.session.user,
				)

			except Exception as e:
				error = True
				err_msg = (
					frappe.local.message_log and "\n\n".join(frappe.local.message_log) or cstr(e)
				)

	if error:
		frappe.db.rollback()
		frappe.db.set_value("Fee Schedule", fee_schedule, "fee_creation_status", "Failed")
		frappe.db.set_value("Fee Schedule", fee_schedule, "error_log", err_msg)

	else:
		frappe.db.set_value("Fee Schedule", fee_schedule, "fee_creation_status", "Successful")
		frappe.db.set_value("Fee Schedule", fee_schedule, "error_log", None)

	frappe.publish_realtime(
		"fee_schedule_progress", {"progress": "100", "reload": 1}, user=frappe.session.user
	)


def create_sales_invoice(fee_schedule, student_id):
	student = frappe.get_doc("Student", student_id)
	if not student.customer:
		student.set_missing_customer_details()
		student.create_customer()
	customer = frappe.db.get_value("Student", student.name, "customer")

	sales_invoice_doc = get_mapped_doc(
		"Fee Schedule",
		fee_schedule,
		{
			"Fee Schedule": {
				"doctype": "Sales Invoice",
				"field_map": {
					# change custom_fee_schedule to fee_schedule
					"name": "fee_schedule",
					"due_date": "due_date",
					"posting_date": "posting_date",
				},
			},
			"Fee Component": {
				"doctype": "Sales Invoice Item",
				"field_map": {
					# Fee Component Field : Sales Invoice Item Field
					"item": "item_code",
					"amount": "price_list_rate",
					"discount": "discount_percentage",
				},
			},
		},
		ignore_permissions=True,
	)
	sales_invoice_doc.student = student.name
	sales_invoice_doc.customer = customer
	if frappe.db.get_single_value(
		"Education Settings", "sales_invoice_posting_date_fee_schedule"
	):
		sales_invoice_doc.set_posting_time = 1

	for item in sales_invoice_doc.items:
		item.qty = 1

	sales_invoice_doc.save()
	if frappe.db.get_single_value("Education Settings", "auto_submit_sales_invoice"):
		sales_invoice_doc.submit()

	return sales_invoice_doc.name


#  gives program name for multiple enrollments in a calendar year
def get_students(
	student_group, academic_year, academic_term=None, student_category=None
):
	conditions = ""
	if student_category:
		conditions = " and pe.student_category={}".format(frappe.db.escape(student_category))
	if academic_term:
		conditions += " and pe.academic_term={}".format(frappe.db.escape(academic_term))
	students = frappe.db.sql(
		"""
		select pe.student, pe.student_name, pe.program, pe.student_batch_name, pe.name as enrollment
		from `tabStudent Group Student` sgs, `tabProgram Enrollment` pe
		where
			pe.docstatus = 1 and pe.student = sgs.student and pe.academic_year = %s
			and sgs.parent = %s and sgs.active = 1
			{conditions}
		""".format(
			conditions=conditions
		),
		(academic_year, student_group),
		as_dict=1,
	)
	return students


@frappe.whitelist()
def get_total_students(
	student_group, academic_year, academic_term=None, student_category=None
):
	total_students = get_students(
		student_group, academic_year, academic_term, student_category
	)
	return len(total_students)


@frappe.whitelist()
def get_fee_structure(source_name, target_doc=None):
	fee_request = get_mapped_doc(
		"Fee Structure",
		source_name,
		{"Fee Structure": {"doctype": "Fee Schedule"}},
		ignore_permissions=True,
	)
	return fee_request
