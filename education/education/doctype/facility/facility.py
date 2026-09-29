# Copyright (c) 2026, Frappe Technologies Pvt. Ltd. and contributors
# For license information, please see license.txt

from typing import Any

import frappe
from frappe.model.document import Document
from frappe.query_builder.functions import IfNull

from education.education.doctype.campus.campus import validate_campus


class Facility(Document):
	def validate(self):
		validate_campus(self, required=True)


@frappe.whitelist()
@frappe.validate_and_sanitize_search_inputs
def facility_query(
	doctype: str,
	txt: str,
	searchfield: str,
	start: int,
	page_len: int,
	filters: dict[str, Any],
):
	"""Facilities on the selected campus, plus facilities shared across campuses."""
	frappe.has_permission("Facility", "read", throw=True)
	filters = filters or {}
	facility = frappe.qb.DocType("Facility")
	query = (
		frappe.qb.from_(facility)
		.select(facility.name)
		.where(facility.name.like(f"%{txt}%"))
		.orderby(facility.name)
		.limit(page_len)
		.offset(start)
	)

	exclude = filters.get("exclude") or []
	if isinstance(exclude, str):
		exclude = [name for name in exclude.split(",") if name]
	if exclude:
		query = query.where(facility.name.notin(exclude))

	company = filters.get("company")
	if company:
		query = query.where((IfNull(facility.company, "") == "") | (facility.company == company))

	campus = filters.get("campus")
	if campus:
		query = query.where((IfNull(facility.campus, "") == "") | (facility.campus == campus))

	return query.run()
