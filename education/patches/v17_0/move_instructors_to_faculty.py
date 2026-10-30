import frappe

from education.patches.v17_0.set_faculty_title_from_salutation import get_salutation

# Instructor names often carry a title, which Faculty keeps in its own field.
HONORIFICS = {"dr", "mr", "mrs", "ms", "miss", "mx", "prof"}


def execute():
	"""Copy Instructors into Faculty before the Instructor doctype is removed.

	Instructors who have left are copied as inactive faculty.
	"""
	frappe.db.delete("Singles", {"doctype": "Education Settings", "field": "instructor_created_by"})
	frappe.db.delete("Property Setter", {"doc_type": "Instructor"})

	if not frappe.db.table_exists("Instructor"):
		return

	instructor = frappe.qb.DocType("Instructor")
	rows = (
		frappe.qb.from_(instructor)
		.select(
			instructor.name,
			instructor.instructor_name,
			instructor.employee,
			instructor.department,
			instructor.gender,
			instructor.image,
			instructor.status,
		)
		.run(as_dict=True)
	)

	for row in rows:
		if row.employee and frappe.db.exists("Faculty", {"employee": row.employee}):
			continue

		names = (row.instructor_name or row.name).split()
		faculty = frappe.new_doc("Faculty")
		if len(names) > 1 and names[0].rstrip(".").lower() in HONORIFICS:
			faculty.title = get_salutation(names.pop(0))
		faculty.first_name = names[0]
		faculty.middle_name = " ".join(names[1:-1]) or None
		faculty.last_name = names[-1] if len(names) > 1 else None
		faculty.employee = row.employee
		faculty.main_department = row.department
		faculty.gender = row.gender
		faculty.image = row.image
		faculty.status = "Inactive" if row.status == "Left" else "Active"

		if row.employee:
			employee = frappe.db.get_value(
				"Employee", row.employee, ["company", "user_id", "salutation"], as_dict=True
			)
			if employee:
				faculty.company = employee.company
				faculty.title = faculty.title or employee.salutation
				# Only an existing user, so that copying does not create users or send welcome emails.
				faculty.user_id = employee.user_id
				faculty.email_address = employee.user_id

		# Instructors had no email or allowed departments and may have no title, so these are filled in
		# on first edit.
		faculty.flags.ignore_links = True
		faculty.flags.ignore_mandatory = True
		faculty.insert(ignore_permissions=True)
