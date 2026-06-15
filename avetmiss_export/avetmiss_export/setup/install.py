# Copyright (c) 2026, AVETMISS prototype and contributors
# For license information, please see license.txt
"""Custom fields that extend core Education doctypes for AVETMISS 8.0 export.

Created with create_custom_fields (idempotent) on app install and on migrate.
We never edit the core Education doctype JSON — every field the coverage ledger
marks `custom` on a stock doctype lands here. Each insert_after anchor was
verified against live get_meta. Spec positions/lengths come from
/reference (collection spec 8.0); see COVERAGE_LEDGER.md.
"""

from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

CUSTOM_FIELDS = {
	# --- Client (NAT00080 / NAT00085 / NAT00090 / NAT00100) ---
	"Student": [
		{"fieldname": "avetmiss_section", "fieldtype": "Section Break", "label": "AVETMISS", "insert_after": "student_name"},
		{"fieldname": "avetmiss_client_identifier", "fieldtype": "Data", "label": "AVETMISS Client Identifier", "length": 10, "insert_after": "avetmiss_section"},
		{"fieldname": "avetmiss_highest_school_level", "fieldtype": "Data", "label": "Highest School Level Completed Identifier", "length": 2, "insert_after": "avetmiss_client_identifier"},
		{"fieldname": "avetmiss_indigenous_status", "fieldtype": "Data", "label": "Indigenous Status Identifier", "length": 1, "insert_after": "avetmiss_highest_school_level"},
		{"fieldname": "avetmiss_language_id", "fieldtype": "Data", "label": "Language Identifier", "length": 4, "insert_after": "avetmiss_indigenous_status"},
		{"fieldname": "avetmiss_labour_force_status", "fieldtype": "Data", "label": "Labour Force Status Identifier", "length": 2, "insert_after": "avetmiss_language_id"},
		{"fieldname": "avetmiss_country_of_birth_id", "fieldtype": "Data", "label": "Country of Birth Identifier", "length": 4, "insert_after": "avetmiss_labour_force_status"},
		{"fieldname": "avetmiss_disability_flag", "fieldtype": "Data", "label": "Disability Flag", "length": 1, "insert_after": "avetmiss_country_of_birth_id"},
		{"fieldname": "avetmiss_prior_ed_flag", "fieldtype": "Data", "label": "Prior Educational Achievement Flag", "length": 1, "insert_after": "avetmiss_disability_flag"},
		{"fieldname": "avetmiss_at_school_flag", "fieldtype": "Data", "label": "At School Flag", "length": 1, "insert_after": "avetmiss_prior_ed_flag"},
		{"fieldname": "avetmiss_usi", "fieldtype": "Data", "label": "Unique Student Identifier", "length": 10, "insert_after": "avetmiss_at_school_flag"},
		{"fieldname": "avetmiss_survey_contact_status", "fieldtype": "Data", "label": "Survey Contact Status", "length": 1, "insert_after": "avetmiss_usi"},
		{"fieldname": "avetmiss_addr_col", "fieldtype": "Column Break", "insert_after": "avetmiss_survey_contact_status"},
		{"fieldname": "avetmiss_addr_building", "fieldtype": "Data", "label": "Address Building/Property Name", "length": 50, "insert_after": "avetmiss_addr_col"},
		{"fieldname": "avetmiss_addr_flat", "fieldtype": "Data", "label": "Address Flat/Unit Details", "length": 30, "insert_after": "avetmiss_addr_building"},
		{"fieldname": "avetmiss_addr_street_no", "fieldtype": "Data", "label": "Address Street Number", "length": 15, "insert_after": "avetmiss_addr_flat"},
		{"fieldname": "avetmiss_addr_street_name", "fieldtype": "Data", "label": "Address Street Name", "length": 70, "insert_after": "avetmiss_addr_street_no"},
		{"fieldname": "avetmiss_addr_postal_box", "fieldtype": "Data", "label": "Address Postal Delivery Box", "length": 22, "insert_after": "avetmiss_addr_street_name"},
		{"fieldname": "avetmiss_phone_home", "fieldtype": "Data", "label": "Telephone Number (Home)", "length": 20, "insert_after": "avetmiss_addr_postal_box"},
		{"fieldname": "avetmiss_phone_work", "fieldtype": "Data", "label": "Telephone Number (Work)", "length": 20, "insert_after": "avetmiss_phone_home"},
		{"fieldname": "avetmiss_children_section", "fieldtype": "Section Break", "label": "AVETMISS — Disability & Prior Education", "insert_after": "avetmiss_phone_work"},
		{"fieldname": "disabilities", "fieldtype": "Table", "label": "Disabilities", "options": "Student Disability", "insert_after": "avetmiss_children_section"},
		{"fieldname": "prior_achievements", "fieldtype": "Table", "label": "Prior Educational Achievements", "options": "Student Prior Achievement", "insert_after": "disabilities"},
	],
	# --- Program (NAT00030) ---
	"Program": [
		{"fieldname": "avetmiss_program_identifier", "fieldtype": "Data", "label": "AVETMISS Program Identifier", "length": 10, "insert_after": "program_abbreviation"},
		{"fieldname": "avetmiss_nominal_hours", "fieldtype": "Int", "label": "AVETMISS Nominal Hours", "insert_after": "avetmiss_program_identifier"},
	],
	# --- Subject (NAT00060) ---
	"Course": [
		{"fieldname": "avetmiss_subject_identifier", "fieldtype": "Data", "label": "AVETMISS Subject Identifier", "length": 12, "insert_after": "course_name"},
		{"fieldname": "avetmiss_field_of_education_id", "fieldtype": "Data", "label": "Subject Field of Education Identifier", "length": 6, "insert_after": "avetmiss_subject_identifier"},
		{"fieldname": "avetmiss_vet_flag", "fieldtype": "Data", "label": "VET Flag", "length": 1, "insert_after": "avetmiss_field_of_education_id"},
		{"fieldname": "avetmiss_nominal_hours", "fieldtype": "Int", "label": "AVETMISS Nominal Hours", "insert_after": "avetmiss_vet_flag"},
	],
	# --- Training activity (NAT00120) — the controller's payload ---
	"Course Enrollment": [
		{"fieldname": "avetmiss_section", "fieldtype": "Section Break", "label": "AVETMISS Training Activity", "insert_after": "enrollment_date"},
		{"fieldname": "avetmiss_delivery_location", "fieldtype": "Link", "label": "Delivery Location", "options": "Training Delivery Location", "insert_after": "avetmiss_section"},
		{"fieldname": "avetmiss_activity_start_date", "fieldtype": "Date", "label": "Activity Start Date", "insert_after": "avetmiss_delivery_location"},
		{"fieldname": "avetmiss_activity_end_date", "fieldtype": "Date", "label": "Activity End Date", "insert_after": "avetmiss_activity_start_date"},
		{"fieldname": "avetmiss_delivery_mode", "fieldtype": "Data", "label": "Delivery Mode Identifier", "length": 3, "insert_after": "avetmiss_activity_end_date"},
		{"fieldname": "avetmiss_outcome_national", "fieldtype": "Data", "label": "Outcome Identifier — National", "length": 2, "insert_after": "avetmiss_delivery_mode"},
		{"fieldname": "avetmiss_funding_source_national", "fieldtype": "Data", "label": "Funding Source — National", "length": 2, "insert_after": "avetmiss_outcome_national"},
		{"fieldname": "avetmiss_commencing_program", "fieldtype": "Data", "label": "Commencing Program Identifier", "length": 1, "insert_after": "avetmiss_funding_source_national"},
		{"fieldname": "avetmiss_col_break", "fieldtype": "Column Break", "insert_after": "avetmiss_commencing_program"},
		{"fieldname": "avetmiss_training_contract_id", "fieldtype": "Data", "label": "Training Contract Identifier", "length": 10, "insert_after": "avetmiss_col_break"},
		{"fieldname": "avetmiss_apprentice_client_id", "fieldtype": "Data", "label": "Client Identifier — Apprenticeships", "length": 10, "insert_after": "avetmiss_training_contract_id"},
		{"fieldname": "avetmiss_study_reason", "fieldtype": "Data", "label": "Study Reason Identifier", "length": 2, "insert_after": "avetmiss_apprentice_client_id"},
		{"fieldname": "avetmiss_vet_in_schools", "fieldtype": "Data", "label": "VET in Schools Flag", "length": 1, "insert_after": "avetmiss_study_reason"},
		{"fieldname": "avetmiss_specific_funding_id", "fieldtype": "Data", "label": "Specific Funding Identifier", "length": 10, "insert_after": "avetmiss_vet_in_schools"},
		{"fieldname": "avetmiss_school_type", "fieldtype": "Data", "label": "School Type Identifier", "length": 2, "insert_after": "avetmiss_specific_funding_id"},
	],
	# --- Program completed (NAT00130) ---
	"Program Enrollment": [
		{"fieldname": "avetmiss_completion_date", "fieldtype": "Date", "label": "Date Program Completed", "insert_after": "enrollment_date"},
		{"fieldname": "avetmiss_issued_flag", "fieldtype": "Data", "label": "Issued Flag", "length": 1, "insert_after": "avetmiss_completion_date"},
	],
}


def ensure_custom_fields():
	"""Create/update all AVETMISS custom fields. Idempotent."""
	create_custom_fields(CUSTOM_FIELDS, update=True)


def after_install():
	ensure_custom_fields()
