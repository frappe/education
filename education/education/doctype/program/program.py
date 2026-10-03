# Copyright (c) 2015, Frappe Technologies and contributors
# For license information, please see license.txt


import frappe
from frappe import _
from frappe.desk.reportview import get_match_cond
from frappe.model.document import Document


class Program(Document):
	def validate(self):
		self.validate_unit_load()
		self.validate_department_company()

	def validate_unit_load(self):
		if (
			self.minimum_unit_load
			and self.maximum_unit_load
			and self.minimum_unit_load > self.maximum_unit_load
		):
			frappe.throw(_("Minimum Unit Load cannot exceed Maximum Unit Load."))

	def validate_department_company(self):
		if not self.department or not self.company:
			return

		department_company = frappe.db.get_value("Department", self.department, "company")
		if department_company != self.company:
			frappe.throw(
				_("Department {0} does not belong to Company {1}.").format(
					frappe.bold(self.department), frappe.bold(self.company)
				)
			)


@frappe.whitelist()
@frappe.validate_and_sanitize_search_inputs
def get_program_courses(
	doctype: str, txt: str, searchfield: str, start: int, page_len: int, filters: dict | None
):
	filters = filters or {}
	if not filters.get("program"):
		frappe.msgprint(_("Please select a Program first."))
		return []

	doctype = "Course"
	query = (
		"""select name, course_name from `tabCourse`
        where program = %(program)s and name like %(txt)s """
		+ get_match_cond(doctype)
		+ """
        order by
            if(locate(%(_txt)s, name), locate(%(_txt)s, name), 99999),
            course_name asc,
            name asc
        limit %(start)s, %(page_len)s"""
	)
	return frappe.db.sql(
		query,
		{
			"txt": "%{0}%".format(txt),
			"_txt": txt.replace("%", ""),
			"program": filters["program"],
			"start": start,
			"page_len": page_len,
		},
	)
