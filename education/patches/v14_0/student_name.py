import frappe


def execute():
	students = frappe.get_all(
		"Student", fields=["name", "first_name", "middle_name", "last_name"]
	)
	for student in students:
		student_name = " ".join(
			filter(None, [student.first_name, student.middle_name, student.last_name])
		)
		frappe.db.set_value("Student", student.name, "student_name", student_name)
