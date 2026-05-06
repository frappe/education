# Copyright (c) 2026, Frappe Technologies Pvt. Ltd. and contributors
# For license information, please see license.txt

import re
import frappe
from frappe.model.document import Document

from ...utils import validate_isbn10, validate_isbn13


class LibraryMedia(Document):
	def after_insert(self):
		if self.auto_create_copies:
			count = self.default_copy_count or 1

			from ...utils import create_media_copies

			create_media_copies(self.name, count=count)

		if self.publisher:
			frappe.get_doc(
				{
					"doctype": "Publisher Media Link",
					"parent": self.publisher,
					"parenttype": "Publisher",
					"parentfield": "published_media",
					"media": self.name,
					"role": "Primary",
				}
			).insert(ignore_permissions=True)

	def validate(self):
		if self.isbn:
			self.isbn = self.isbn.replace("-", "").strip()

			if not is_valid_isbn(self.isbn):
				frappe.throw("Invalid ISBN number")

			if frappe.db.exists("Library Media", {"isbn": self.isbn}):
				frappe.throw("Book with this ISBN already exists")


def is_valid_isbn(isbn):
	if len(isbn) == 10:
		return validate_isbn10(isbn)
	elif len(isbn) == 13:
		return validate_isbn13(isbn)
	return False
