# Copyright (c) 2023, Frappe Technologies Pvt. Ltd. and contributors
# For license information, please see license.txt


import frappe
from frappe.model.document import Document
from frappe import _


from education.education.report.course_wise_assessment_report.course_wise_assessment_report import get_formatted_result

class ClassAssessmentGroupResult(Document):
	@frappe.whitelist()
	def calculate_marks(self):
		students = []
		if not self.assessment_group:
			frappe.throw(_("Mandatory field - Assessment Group"))
		elif not self.program:
			frappe.throw(_("Mandatory field - Class"))
		elif not self.academic_year:
			frappe.throw(_("Mandatory field - Academic Year"))
		else:
			args = frappe._dict()
			args["program"] = self.program
			args["academic_year"] = self.academic_year
			args["assessment_group"] = self.assessment_group
			values = get_formatted_result(args, get_course=True, include_student_group=True)
			student_details = values.get("student_details")
			assessment_result = values.get("assessment_result")
			course_dict = values.get("course_dict")

			student_list = []
			subject_list = []
			subject_dict = {}
			for student in student_details.keys():
				student_info = {}
				student_info["student_name"] = student_details[student]["name"]
				student_info["student_group"] = student_details[student]["student_group"]
				student_info["student"] = student
				total_marks = 0
				attainable_marks = 0
				for course in course_dict:
					if course not in subject_dict:
						subject_dict[course] = {
							"total": 0,
							"students_no": 0
						}
					if self.assessment_group in assessment_result[student][course]:
						student_subject_score = assessment_result[student][course][self.assessment_group][
							"Final Grade"
						]["score"]
						total_marks += student_subject_score
						subject_dict[course]["total"] += student_subject_score
						subject_dict[course]["students_no"] += 1
						attainable_marks += assessment_result[student][course][self.assessment_group][
							"Final Grade"
						]["maximum_score"]
				student_info["total_marks"] = total_marks
				student_info["attainable_marks"] = attainable_marks
				student_list.append(student_info)
			student_list = calculate_student_positions(student_list)

			for subject, marks_data in subject_dict.items():
				subject_info = {"subject": subject, "class_average":(marks_data["total"]/marks_data["students_no"])} 
				subject_list.append(subject_info)

		if len(student_list) > 0:
			return student_list, subject_list
		else:
			frappe.throw(_("No students Found"))

	@frappe.whitelist()
	def get_current_academic_info(self):
		settings = frappe.get_doc('Education Settings', ['current_academic_term', 'current_academic_year'])
		return {"academic_year": settings.current_academic_year, "academic_term": settings.current_academic_term}
		

def calculate_student_positions(student_list):
	# Sort the list of students by their total marks in descending order
	sorted_students = sorted(student_list, key=lambda d: d['total_marks'], reverse=True)

	# Create a dictionary to store the positions for each student group
	positions = {}

	# Iterate over the sorted list of students
	for i, student in enumerate(sorted_students):
		# If the student group is not already in the positions dictionary, add it
		# with the current position (i + 1) as the value
		if student["student_group"] not in positions:
			positions[student["student_group"]] = 1
		else:
			positions[student["student_group"]] += 1

		# Assign the student group position and overall position to the student
		student["student_group_position"] = positions[student["student_group"]]
		student["overall_position"] = sorted_students.index(student) + 1

		# If the student has the same score as the previous student,
		# use the same position for both
		if i > 0 and student["total_marks"] == sorted_students[i - 1]["total_marks"]:
			student["overall_position"] = sorted_students[i - 1]["overall_position"]
			if student["student_group"] == sorted_students[i - 1]["student_group"]:
				student["student_group_position"] = sorted_students[i - 1]["total_marks"]
	
	return sorted_students