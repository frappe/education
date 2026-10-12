import frappe


def execute():
	"""Class Room is retired. Copy each one into Room, the room list that schedules use.

	A Room with the same name, company and campus is taken to be the same physical room:
	it gains the Class Room's facilities and fills blank fields, without overwriting what
	it has. A blank company or campus only matches a blank one.
	"""
	if not frappe.db.table_exists("Class Room"):
		return

	facilities = {}
	if frappe.db.table_exists("Class Room Facility"):
		for row in frappe.db.sql(
			"select parent, facility, quantity from `tabClass Room Facility` order by parent, idx",
			as_dict=True,
		):
			facilities.setdefault(row.parent, []).append({"facility": row.facility, "quantity": row.quantity})

	for class_room in frappe.db.sql(
		"select name, class_name, abbreviation, number_of_seats, company, campus from `tabClass Room`",
		as_dict=True,
	):
		filters = {
			"room_name": class_room.class_name,
			"company": class_room.company or ("is", "not set"),
			"campus": class_room.campus or ("is", "not set"),
		}
		existing = frappe.db.get_value("Room", filters)

		room = frappe.get_doc("Room", existing) if existing else frappe.new_doc("Room")
		values = {
			"room_name": class_room.class_name,
			"room_number": class_room.abbreviation,
			"room_type": "Classroom",
			"seating_capacity": class_room.number_of_seats,
			"company": class_room.company,
			"campus": class_room.campus,
		}
		for fieldname, value in values.items():
			if value and not room.get(fieldname):
				room.set(fieldname, value)

		present = {row.facility for row in room.facilities}
		for row in facilities.get(class_room.name, []):
			if row["facility"] not in present:
				room.append("facilities", row)

		# Copy records as they are, even if their campus has since been disabled.
		room.flags.ignore_validate = True
		room.flags.ignore_links = True
		if existing:
			room.save(ignore_permissions=True)
		else:
			room.insert(ignore_permissions=True, ignore_mandatory=True)
