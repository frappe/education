# Copyright (c) 2026, Frappe Technologies Pvt. Ltd. and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document


class Campus(Document):
	def validate(self):
		self.campus_code = self.campus_code.strip().upper() if self.campus_code else None
		self.validate_cost_center_company()
		self.validate_main_campus()

	def validate_cost_center_company(self):
		if not self.cost_center or not self.company:
			return

		cost_center_company = frappe.db.get_value("Cost Center", self.cost_center, "company")
		if cost_center_company != self.company:
			frappe.throw(
				_("Cost Center {0} does not belong to Company {1}.").format(
					frappe.bold(self.cost_center), frappe.bold(self.company)
				)
			)

	def validate_main_campus(self):
		if not self.is_main_campus or self.disabled:
			return

		filters = {
			"company": self.company,
			"is_main_campus": 1,
			"disabled": 0,
		}
		if not self.is_new():
			filters["name"] = ["!=", self.name]

		existing = frappe.db.exists("Campus", filters)
		if existing:
			frappe.throw(
				_("Company {0} already has a main campus {1}.").format(
					frappe.bold(self.company), frappe.bold(existing)
				)
			)


def company_has_campus(company):
	if not company:
		return False
	return bool(frappe.db.exists("Campus", {"company": company, "disabled": 0}))


def validate_campus(doc, required=False):
	"""Blank campus is valid until this company has campuses.

	New physical records must pick a campus once one exists. Existing records
	with a blank campus stay shared across sites.
	"""
	campus = doc.get("campus")
	company = doc.get("company")

	if not campus:
		if required and doc.is_new() and company_has_campus(company):
			frappe.throw(_("Campus is required because {0} has campuses.").format(frappe.bold(company)))
		return

	details = frappe.db.get_value("Campus", campus, ["company", "disabled"], as_dict=True)
	if not details:
		return

	if details.disabled:
		frappe.throw(_("Campus {0} is disabled.").format(frappe.bold(campus)))

	if company and details.company != company:
		frappe.throw(
			_("Campus {0} does not belong to Company {1}.").format(frappe.bold(campus), frappe.bold(company))
		)

	if not company and details.company:
		doc.company = details.company


def set_campus_from_register(doc):
	register = doc.get("admission_register")
	if not register:
		return

	campus = frappe.db.get_value("Admission Register", register, "campus")
	if campus:
		doc.campus = campus


def set_campus_from_enrollment(doc):
	enrollment = doc.get("course_enrollment")
	if not enrollment:
		return

	campus = frappe.db.get_value("Course Enrollment", enrollment, "campus")
	if campus:
		doc.campus = campus


def campus_cost_center(campus):
	if not campus:
		return None
	return frappe.db.get_value("Campus", campus, "cost_center")


def apply_room_campus(doc):
	"""Copy a room's campus onto a schedule. A room with no campus is shared."""
	if not doc.get("room"):
		return

	room_campus = frappe.db.get_value("Room", doc.room, "campus")
	if not room_campus:
		return

	if doc.get("campus") and doc.campus != room_campus:
		frappe.throw(
			_("Room {0} belongs to Campus {1}.").format(frappe.bold(doc.room), frappe.bold(room_campus))
		)

	doc.campus = room_campus


def apply_campus_to_invoice(invoice, campus):
	"""Tag a Sales Invoice when Campus is an accounting dimension."""
	if not campus:
		return

	if invoice.meta.has_field("campus"):
		invoice.campus = campus

	cost_center = campus_cost_center(campus)
	for item in invoice.get("items") or []:
		if item.meta.has_field("campus"):
			item.campus = campus
		if cost_center and not item.cost_center:
			item.cost_center = cost_center


def ensure_campus_accounting_dimension():
	"""Register Campus so fee and invoice lines carry it onto GL Entry."""
	if not frappe.db.exists("DocType", "Campus"):
		return
	if frappe.db.exists("Accounting Dimension", {"document_type": "Campus"}):
		return

	dimension = frappe.new_doc("Accounting Dimension")
	dimension.document_type = "Campus"
	dimension.label = "Campus"
	dimension.insert(ignore_permissions=True)
