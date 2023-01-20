# Copyright (c) 2023, Frappe Technologies Pvt. Ltd. and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document

class CurrentCBT(Document):
	def get_question(self):
		current_question = self.questions[self.current_question - 1]
		selected_option = None
		for result in self.result:
			if result.question == current_question.question_link:
				selected_option = result.selected_option 
		return frappe.get_doc("Question", current_question.question_link), selected_option