# Copyright (c) 2023, Frappe Technologies Pvt. Ltd. and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document

class StudentGroupAssessmentRemarks(Document):
	@frappe.whitelist()
	def get_students(self):
		student_list = []
		student_group = frappe.get_doc("Student Group", self.student_group)
		for student in student_group.students:
			student_list.append({"student": student.student, "student_name": student.student_name})
		return student_list
