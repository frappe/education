import frappe


def execute():
	status_map = {
		"Successful": "Invoice Created",
		"In Process": "In Process",
		"Failed": "Fee Creation Failed",
	}
	fee_schedules = frappe.get_all(
		"Fee Schedule", filters={"docstatus": 1}, fields=["name", "fee_creation_status"]
	)
	for fee_schedule in fee_schedules:
		frappe.db.set_value(
			"Fee Schedule",
			fee_schedule.name,
			"status",
			status_map.get(fee_schedule.fee_creation_status, "Invoice Pending"),
			update_modified=False,
		)
