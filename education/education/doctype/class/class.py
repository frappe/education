# Copyright (c) 2015, Frappe Technologies and contributors
# For license information, please see license.txt


import frappe
from frappe.model.document import Document


class Class(Document):
	def get_course_list(self):
		class_course_list = self.courses
		course_list = [
			frappe.get_doc("Course", class_course.course)
			for class_course in class_course_list
		]
		return course_list
