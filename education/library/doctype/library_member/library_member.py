# Copyright (c) 2026, Frappe Technologies Pvt. Ltd. and contributors
# For license information, please see license.txt


import frappe
from frappe.model.document import Document
import qrcode
import barcode
from barcode.writer import ImageWriter
import io
import base64


class LibraryMember(Document):
	def validate(self):
		if self.membership_type == "External":
			if not self.external_member_name:
				frappe.throw("External Member Name is required")
		else:
			if not self.reference_doctype or not self.reference_name:
				frappe.throw("Reference Doctype and Name are required")

	def before_save(self):
		self.set_full_name()

	def set_full_name(self):
		if self.membership_type == "External":
			self.full_name = self.external_member_name
			return

		field_map = {"Student": "customer", "Employee": "employee_name"}

		fieldname = field_map.get(self.reference_doctype, "name")

		self.full_name = frappe.db.get_value(
			self.reference_doctype, self.reference_name, fieldname
		)

	def autoname(self):
		prefix_map = {"Employee": "EMP", "Student": "STD", "External": "EXT"}

		prefix = prefix_map.get(self.reference_doctype, "MEM")

		self.name = frappe.model.naming.make_autoname(f"MEM-{prefix}-.YYYY.-.#####")
