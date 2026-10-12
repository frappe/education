# Copyright (c) 2026, Frappe Technologies Pvt. Ltd. and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.utils import flt


def execute(filters=None):
	filters = frappe._dict(filters or {})
	data = get_data(filters)
	return get_columns(), data, None, get_chart(data), get_summary(data)


def get_data(filters):
	conditions = {"status": ("!=", "Disabled")}
	for fieldname in ("company", "campus", "hostel"):
		if filters.get(fieldname):
			conditions[fieldname] = filters.get(fieldname)

	beds = frappe.get_all(
		"Hostel Bed",
		filters=conditions,
		fields=["hostel", "hostel_room", "campus", "status"],
		order_by="hostel_room",
	)
	floors = dict(
		frappe.get_all(
			"Hostel Room",
			filters={"name": ("in", list({bed.hostel_room for bed in beds}))},
			fields=["name", "floor"],
			as_list=True,
		)
	)
	levels = dict(frappe.get_all("Floor", fields=["name", "level"], as_list=True))

	rooms = {}
	for bed in beds:
		row = rooms.setdefault(
			bed.hostel_room,
			frappe._dict(
				hostel=bed.hostel,
				campus=bed.campus,
				hostel_room=bed.hostel_room,
				floor=floors.get(bed.hostel_room),
				beds=0,
				occupied=0,
				reserved=0,
				vacant=0,
				under_maintenance=0,
			),
		)
		row.beds += 1
		row[bed.status.lower().replace(" ", "_")] += 1

	for row in rooms.values():
		row.occupancy = flt(row.occupied * 100.0 / row.beds, 2) if row.beds else 0

	# Rooms of each hostel from the lowest floor up; rooms without a floor come last.
	return sorted(
		rooms.values(),
		key=lambda row: (row.hostel, levels.get(row.floor, float("inf")), row.hostel_room),
	)


def get_columns():
	return [
		{"label": _("Hostel"), "fieldname": "hostel", "fieldtype": "Link", "options": "Hostel", "width": 160},
		{"label": _("Campus"), "fieldname": "campus", "fieldtype": "Link", "options": "Campus", "width": 120},
		{
			"label": _("Hostel Room"),
			"fieldname": "hostel_room",
			"fieldtype": "Link",
			"options": "Hostel Room",
			"width": 160,
		},
		{"label": _("Floor"), "fieldname": "floor", "fieldtype": "Link", "options": "Floor", "width": 110},
		{"label": _("Beds"), "fieldname": "beds", "fieldtype": "Int", "width": 80},
		{"label": _("Occupied"), "fieldname": "occupied", "fieldtype": "Int", "width": 90},
		{"label": _("Reserved"), "fieldname": "reserved", "fieldtype": "Int", "width": 90},
		{"label": _("Vacant"), "fieldname": "vacant", "fieldtype": "Int", "width": 80},
		{
			"label": _("Under Maintenance"),
			"fieldname": "under_maintenance",
			"fieldtype": "Int",
			"width": 140,
		},
		{"label": _("Occupancy %"), "fieldname": "occupancy", "fieldtype": "Percent", "width": 110},
	]


def get_chart(data):
	if not data:
		return None

	hostels = {}
	for row in data:
		totals = hostels.setdefault(
			row.hostel, {"occupied": 0, "reserved": 0, "vacant": 0, "under_maintenance": 0}
		)
		for key in totals:
			totals[key] += row[key]

	return {
		"data": {
			"labels": list(hostels),
			"datasets": [
				{"name": _("Occupied"), "values": [t["occupied"] for t in hostels.values()]},
				{"name": _("Reserved"), "values": [t["reserved"] for t in hostels.values()]},
				{"name": _("Vacant"), "values": [t["vacant"] for t in hostels.values()]},
				{
					"name": _("Under Maintenance"),
					"values": [t["under_maintenance"] for t in hostels.values()],
				},
			],
		},
		"type": "bar",
		"barOptions": {"stacked": 1},
	}


def get_summary(data):
	beds = sum(row.beds for row in data)
	occupied = sum(row.occupied for row in data)
	occupancy = flt(occupied * 100.0 / beds, 2) if beds else 0
	return [
		{"label": _("Beds"), "value": beds, "datatype": "Int", "indicator": "Blue"},
		{"label": _("Occupied"), "value": occupied, "datatype": "Int", "indicator": "Blue"},
		{
			"label": _("Reserved"),
			"value": sum(row.reserved for row in data),
			"datatype": "Int",
			"indicator": "Yellow",
		},
		{
			"label": _("Vacant"),
			"value": sum(row.vacant for row in data),
			"datatype": "Int",
			"indicator": "Green",
		},
		{
			"label": _("Under Maintenance"),
			"value": sum(row.under_maintenance for row in data),
			"datatype": "Int",
			"indicator": "Orange",
		},
		{"label": _("Occupancy"), "value": occupancy, "datatype": "Percent", "indicator": "Blue"},
	]
