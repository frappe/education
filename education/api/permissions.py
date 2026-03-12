import frappe


def has_app_permission():
	"""Check if the user has permission to access the app."""
	if frappe.session.user == "Administrator":
		return True

	roles = frappe.get_roles()
	education_roles = ["Education Manager"]
	if any(role in roles for role in education_roles):
		return True

	return False
