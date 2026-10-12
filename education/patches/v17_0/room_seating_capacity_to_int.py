import re

import frappe


def execute():
	"""Room Seating Capacity becomes an Int. Keep the number from each text value so the column converts."""
	if not frappe.db.has_column("Room", "seating_capacity"):
		return

	for name, capacity in frappe.get_all("Room", fields=["name", "seating_capacity"], as_list=True):
		match = re.search(r"\d+", str(capacity or ""))
		cleaned = match.group() if match else "0"
		if str(capacity) != cleaned:
			frappe.db.set_value("Room", name, "seating_capacity", cleaned, update_modified=False)
