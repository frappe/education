# Copyright (c) 2015, Frappe Technologies and contributors
# For license information, please see license.txt

from typing import Any

import frappe
from frappe.model.document import Document
from frappe.query_builder.functions import IfNull

from education.education.doctype.campus.campus import validate_campus


class Room(Document):
	def validate(self):
		validate_campus(self, required=True)


@frappe.whitelist()
@frappe.validate_and_sanitize_search_inputs
def room_query(
	doctype: str,
	txt: str,
	searchfield: str,
	start: int,
	page_len: int,
	filters: dict[str, Any],
):
	"""Rooms on the selected campus, plus rooms shared across campuses."""
	filters = filters or {}
	room = frappe.qb.DocType("Room")
	query = (
		frappe.qb.from_(room)
		.select(room.name, room.room_name)
		.where(room.name.like(f"%{txt}%") | room.room_name.like(f"%{txt}%"))
		.orderby(room.room_name)
		.limit(page_len)
		.offset(start)
	)

	campus = filters.get("campus")
	if campus:
		query = query.where((IfNull(room.campus, "") == "") | (room.campus == campus))

	return query.run()
