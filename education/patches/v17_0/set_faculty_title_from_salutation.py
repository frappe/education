import frappe


def execute():
	"""Faculty titles were fixed Select options such as "Dr.". Point them at Salutation records."""
	titles = frappe.get_all(
		"Faculty", filters={"title": ("is", "set")}, pluck="title", distinct=True, order_by="title"
	)
	for title in titles:
		salutation = get_salutation(title)
		if salutation != title:
			frappe.db.set_value("Faculty", {"title": title}, "title", salutation, update_modified=False)


def get_salutation(title):
	"""Return the Salutation for a title, matching "Dr." to "Dr" and creating it if missing."""
	title = title.strip()
	for candidate in (title, title.rstrip(".")):
		existing = frappe.db.get_value("Salutation", candidate)
		if existing:
			return existing

	salutation = frappe.new_doc("Salutation")
	salutation.salutation = title.rstrip(".")
	return salutation.insert(ignore_permissions=True).name
