# Copyright (c) 2026, Frappe Technologies Pvt. Ltd. and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document

from ...utils import generate_barcode_base64, generate_qr_base64, save_file


class MemberCard(Document):
	def before_save(self):
		self.generate_codes()

	def generate_codes(self):
		data = self.name

		if not self.qr_code:
			qr_image = generate_qr_base64(data)
			self.qr_code = save_file(self, qr_image, f"{self.name}_qr.png")

		if not self.barcode:
			barcode_image = generate_barcode_base64(data)
			self.barcode = save_file(self, barcode_image, f"{self.name}_barcode.png")
