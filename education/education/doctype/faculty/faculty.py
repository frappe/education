# Copyright (c) 2026, Frappe Technologies Pvt. Ltd. and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document

from frappe.utils import getdate


class Faculty(Document):
	def validate(self):
		self.set_title()
		self.validate_dates()
		self.validate_user()

	def set_title(self):
		self.faculty_name = " ".join(
			filter(None, [self.first_name, self.middle_name, self.last_name])
		)

	def validate_dates(self):
		if self.date_of_birth and getdate(self.date_of_birth) >= getdate():
			frappe.throw(_("Date of Birth cannot be greater than today."))

	def validate_user(self):
		"""Create a website user for faculty creation if not already exists"""
		if not frappe.db.get_single_value(
			"Education Settings", "user_creation_skip"
		) and not frappe.db.exists("User", self.email_address):
			faculty_user = frappe.get_doc(
				{
					"doctype": "User",
					"first_name": self.first_name,
					"last_name": self.last_name,
					"email": self.email_address,
					"gender": self.gender,
					"send_welcome_email": 1,
					"user_type": "Website User",
				}
			)
			faculty_user.add_roles("Faculty")
			faculty_user.save(ignore_permissions=True)

			self.user_id = faculty_user.name
