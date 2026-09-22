# Copyright (c) 2026, Frappe Technologies Pvt. Ltd. and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import flt


class GradeTemplate(Document):
	def validate(self):
		self.validate_academic_year_and_term()
		self.validate_weights()

	def validate_academic_year_and_term(self):
		if not self.academic_year:
			return

		year_company = frappe.db.get_value("Academic Year", self.academic_year, "company")
		if year_company and self.company and year_company != self.company:
			frappe.throw(
				_("Company must be the same as that of Academic Year {0}").format(
					frappe.bold(self.academic_year)
				)
			)

		if not self.academic_term:
			return

		term = frappe.db.get_value(
			"Academic Term",
			self.academic_term,
			["academic_year", "company"],
			as_dict=True,
		)
		if not term:
			return

		if term.academic_year != self.academic_year:
			frappe.throw(
				_("Academic Term {0} does not belong to Academic Year {1}").format(
					frappe.bold(self.academic_term), frappe.bold(self.academic_year)
				)
			)

		if term.company and self.company and term.company != self.company:
			frappe.throw(
				_("Company must be the same as that of Academic Term {0}").format(
					frappe.bold(self.academic_term)
				)
			)

	def validate_weights(self):
		if self.weightage_type == "Assignment Type Weightage":
			self.set("attendance_weights", [])
			self._validate_weight_rows(
				self.assignment_weights,
				key_field="assignment_type",
				label=_("Assignment Type Weights"),
			)
		elif self.weightage_type == "Attendance Weightage":
			self.set("assignment_weights", [])
			self._validate_weight_rows(
				self.attendance_weights,
				key_field="attendance_type",
				label=_("Attendance Weights"),
			)

	def _validate_weight_rows(self, rows, key_field, label):
		if not rows:
			frappe.throw(_("At least one row is required in {0}").format(label))

		seen = set()
		total = 0
		field_label = (
			_("Assignment Type") if key_field == "assignment_type" else _("Attendance Type")
		)
		for row in rows:
			key = row.get(key_field)
			if key in seen:
				frappe.throw(
					_("Row {0}: {1} {2} is duplicated in {3}").format(
						row.idx, field_label, frappe.bold(key), label
					)
				)
			seen.add(key)
			total += flt(row.weightage)

		if flt(total, 2) != 100:
			frappe.throw(
				_("Total Weightage of all {0} must be 100%, currently {1}%.").format(
					label, flt(total, 2)
				)
			)
