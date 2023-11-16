# Copyright (c) 2013, Frappe Technologies Pvt. Ltd. and contributors
# For license information, please see license.txt


import frappe
from frappe import _


def execute(filters=None):
	columns, data = [], []

	academic_year = filters.get("academic_year")
	program = filters.get("program")
	student_batch_name = filters.get("student_batch_name")

	columns = get_columns()

	program_enrollments = frappe.get_list(
		"Program Enrollment",
		fields=["student", "student_name"],
		filters={
			"academic_year": academic_year,
			"program": program,
			"student_batch_name": student_batch_name,
		},
	)

	student_list = [d.student for d in program_enrollments]
	if not student_list:
		return columns, []

	group_roll_no_map = get_student_roll_no(academic_year, program, student_batch_name)
	student_map = get_student_details(student_list)
	guardian_map = get_guardian_map(student_list)

	for d in program_enrollments:
		student_details = student_map.get(d.student, {})

		row = frappe._dict(
			{
				"group_roll_no": group_roll_no_map.get(d.student, ""),
				"student_id": d.student,
				"student_name": d.student_name,
				"student_mobile_no": student_details.get("student_mobile_number", ""),
				"student_email_id": student_details.get("student_email_id", ""),
				"student_address": student_details.get("address", ""),
			}
		)

		student_guardians = guardian_map.get(d.student, [])
		# only 2 guardians per student
		for i, g in enumerate(student_guardians[:2]):
			row[f"guardian{i+1}_name"] = g.guardian_name
			row[f"relation_with_guardian{i+1}"] = g.relation
			row[f"guardian{i+1}_mobile_no"] = g.mobile_number
			row[f"guardian{i+1}_email_id"] = g.email_address

		data.append(row)

	return columns, data


def get_columns():
	columns = [
		{
			"label": _("Group Roll No"),
			"fieldname": "group_roll_no",
			"fieldtype": "Data",
			"width": 60,
		},
		{
			"label": _("Student ID"),
			"fieldname": "student_id",
			"fieldtype": "Link",
			"options": "Student",
			"width": 90,
		},
		{
			"label": _("Student Name"),
			"fieldname": "student_name",
			"fieldtype": "Data",
			"width": 150,
		},
		{
			"label": _("Student Mobile No."),
			"fieldname": "student_mobile_no",
			"fieldtype": "Data",
			"width": 110,
		},
		{
			"label": _("Student Email ID"),
			"fieldname": "student_email_id",
			"fieldtype": "Data",
			"width": 125,
		},
		{
			"label": _("Student Address"),
			"fieldname": "student_address",
			"fieldtype": "Data",
			"width": 175,
		},
		{
			"label": _("Guardian1 Name"),
			"fieldname": "guardian1_name",
			"fieldtype": "Data",
			"width": 150,
		},
		{
			"label": _("Relation with Guardian1"),
			"fieldname": "relation_with_guardian1",
			"fieldtype": "Data",
			"width": 80,
		},
		{
			"label": _("Guardian1 Mobile No"),
			"fieldname": "guardian1_mobile_no",
			"fieldtype": "Data",
			"width": 125,
		},
		{
			"label": _("Guardian1 Email ID"),
			"fieldname": "guardian1_email_id",
			"fieldtype": "Data",
			"width": 125,
		},
		{
			"label": _("Guardian2 Name"),
			"fieldname": "guardian2_name",
			"fieldtype": "Data",
			"width": 150,
		},
		{
			"label": _("Relation with Guardian2"),
			"fieldname": "relation_with_guardian2",
			"fieldtype": "Data",
			"width": 80,
		},
		{
			"label": _("Guardian2 Mobile No"),
			"fieldname": "guardian2_mobile_no",
			"fieldtype": "Data",
			"width": 125,
		},
		{
			"label": _("Guardian2 Email ID"),
			"fieldname": "guardian2_email_id",
			"fieldtype": "Data",
			"width": 125,
		},
	]
	return columns


def get_student_details(student_list):
	student_map = frappe._dict()
	student_details = frappe.db.sql(
		"""
		select name, student_mobile_number, student_email_id, address_line_1, address_line_2, city, state from `tabStudent` where name in (%s)"""
		% ", ".join(["%s"] * len(student_list)),
		tuple(student_list),
		as_dict=1,
	)
	for s in student_details:
		student = frappe._dict()
		student["student_mobile_number"] = s.student_mobile_number
		student["student_email_id"] = s.student_email_id
		student["address"] = ", ".join(
			[d for d in [s.address_line_1, s.address_line_2, s.city, s.state] if d]
		)
		student_map[s.name] = student
	return student_map


def get_guardian_map(student_list):
	guardian_map = frappe._dict()
	guardian_details = frappe.db.sql(
		"""
		select  parent, guardian, guardian_name, relation  from `tabStudent Guardian` where parent in (%s)"""
		% ", ".join(["%s"] * len(student_list)),
		tuple(student_list),
		as_dict=1,
	)

	guardian_list = list(set([g.guardian for g in guardian_details])) or [""]

	guardian_mobile_no = dict(
		frappe.db.sql(
			"""select name, mobile_number from `tabGuardian`
			where name in (%s)"""
			% ", ".join(["%s"] * len(guardian_list)),
			tuple(guardian_list),
		)
	)

	guardian_email_id = dict(
		frappe.db.sql(
			"""select name, email_address from `tabGuardian`
			where name in (%s)"""
			% ", ".join(["%s"] * len(guardian_list)),
			tuple(guardian_list),
		)
	)

	for guardian in guardian_details:
		guardian["mobile_number"] = guardian_mobile_no.get(guardian.guardian)
		guardian["email_address"] = guardian_email_id.get(guardian.guardian)
		guardian_map.setdefault(guardian.parent, []).append(guardian)

	return guardian_map


def get_student_roll_no(academic_year, program, batch):
	student_group = frappe.get_all(
		"Student Group",
		filters={
			"academic_year": academic_year,
			"program": program,
			"batch": batch,
			"disabled": 0,
		},
	)
	if student_group:
		roll_no_dict = dict(
			frappe.db.sql(
				"""select student, group_roll_number from `tabStudent Group Student` where parent=%s""",
				(student_group[0].name),
			)
		)
		return roll_no_dict
	return {}
