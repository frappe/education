# Copyright (c) 2026, Frappe Technologies Pvt. Ltd. and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document


class AdmissionRegister(Document):
	def validate(self):
		if self.end_date < self.start_date:
			frappe.throw(_("End Date cannot be before Start Date"))

		if self.admission_based_on == "Course":
			if not self.course:
				frappe.throw(_("Course is required"))

			if not self.course_fee_amount:
				frappe.throw(_("Registration Fee Amount is required"))

		elif self.admission_based_on == "Program":
			if not self.program:
				frappe.throw(_("Program is required"))

		if self.registration_fee:
			if not self.registration_fee_item:
				frappe.throw(_("Registration Fee Item is required"))

		if self.max_number_of_admissions < 1:
			frappe.throw(_("Max Number of Admissions must be greater than 0"))

		if self.minimum_age < 1:
			frappe.throw(_("Minimum Age must be greater than 0"))

		if self.admission_based_on == "Program":
			if any(row.course_fee_amount <= 0 for row in self.courses):
				frappe.throw(_("Course Fee Amount must be greater than 0 for all courses"))

	@frappe.whitelist()
	def get_course_details(self):
		if self.course:
			course = frappe.get_doc("Course", self.course)
			return {
				"registration_fee_amount": course.registration_fee_amount,
				"registration_fee": course.registration_fee,
				"registration_fee_item": course.registration_fee_item,
			}
