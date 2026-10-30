import frappe


def execute():
	"""Fold the Instructor role into Faculty, which keeps desk access."""
	if frappe.db.exists("Role", "Instructor"):
		if frappe.db.exists("Role", "Faculty"):
			remove_rows_already_held_by_faculty()
			frappe.rename_doc("Role", "Instructor", "Faculty", merge=True, force=True, show_alert=False)
		else:
			frappe.rename_doc("Role", "Instructor", "Faculty", force=True, show_alert=False)

	if not frappe.db.exists("Role", "Faculty"):
		return

	frappe.db.set_value("Role", "Faculty", "desk_access", 1)

	# A user's type follows the desk access of their roles, so faculty created as website users
	# would only become system users on their next save.
	has_role = frappe.qb.DocType("Has Role")
	users = (
		frappe.qb.from_(has_role)
		.select(has_role.parent)
		.where(has_role.parenttype == "User")
		.where(has_role.role == "Faculty")
		.run(pluck=True)
	)
	for user in users:
		if (
			user not in ("Administrator", "Guest")
			and frappe.db.get_value("User", user, "user_type") == "Website User"
		):
			frappe.db.set_value("User", user, "user_type", "System User")


def remove_rows_already_held_by_faculty():
	"""Drop Instructor rows that would duplicate a Faculty row once the roles merge."""
	for doctype, keys in (
		("Has Role", ("parenttype", "parent")),
		("Custom DocPerm", ("parent", "permlevel")),
	):
		rows = frappe.get_all(doctype, filters={"role": "Instructor"}, fields=["name", *keys])
		for row in rows:
			filters = {key: row[key] for key in keys}
			if frappe.db.exists(doctype, {**filters, "role": "Faculty"}):
				frappe.db.delete(doctype, {"name": row.name})
