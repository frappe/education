import frappe


def has_app_permission():
	"""Check if the user has permission to access the app."""
	if frappe.session.user == "Administrator":
		return True

	# Frappe v16 resolves the module's sidebar for each user. Let users who can
	# read an Education entry reach the app; the sidebar still checks each link.
	if frappe.session.user == "Guest":
		return False

	return any(
		frappe.has_permission(doctype, "read")
		for doctype in ("Student", "Faculty", "Course Enrollment", "Assessment Result")
	)
