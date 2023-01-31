# Copyright (c) 2023, Frappe Technologies Pvt. Ltd. and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe import _

class SubjectInstructorAllocationTool(Document):
	@frappe.whitelist()
	def assign_subjects(self):
		instructor = self.instructor
		total_subjects = len(self.subjects)
		for i, subj in enumerate(self.subjects):
			frappe.publish_realtime(
				"subject_enrollment_tool", dict(progress=[i + 1, total_subjects]), user=frappe.session.user
			)
			subject = frappe.get_doc("Subject", subj.subject)
			print(subject.subject_instructors)
			if instructor not in subject.subject_instructors:
				subject.append("subject_instructors", {"instructor": instructor, "instructor_name": instructor})
				subject.save()

		frappe.msgprint(_("{0} has been added to {1} subjects").format(instructor, total_subjects))


