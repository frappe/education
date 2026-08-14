# Copyright (c) 2015, Frappe Technologies and contributors
# For license information, please see license.txt


import frappe
from frappe import _
from frappe.desk.reportview import get_match_cond
from frappe.model.document import Document


class Program(Document):
	def get_course_list(self):
		program_course_list = self.courses
		course_list = [
			frappe.get_doc("Course", program_course.course)
			for program_course in program_course_list
		]
		return course_list


@frappe.whitelist()
@frappe.validate_and_sanitize_search_inputs
def get_program_courses(doctype, txt, searchfield, start, page_len, filters):
	if not filters.get("program"):
		frappe.msgprint(_("Please select a Program first."))
		return []

	doctype = "Program Course"
	return frappe.db.sql(
		"""select course, course_name from `tabProgram Course`
        where  parent = %(program)s and course like %(txt)s {match_cond}
        order by
            if(locate(%(_txt)s, course), locate(%(_txt)s, course), 99999),
            idx desc,
            `tabProgram Course`.course asc
        limit {start}, {page_len}""".format(
			match_cond=get_match_cond(doctype), start=start, page_len=page_len
		),
		{
			"txt": "%{0}%".format(txt),
			"_txt": txt.replace("%", ""),
			"program": filters["program"],
		},
	)
