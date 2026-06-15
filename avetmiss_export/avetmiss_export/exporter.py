# Copyright (c) 2026, AVETMISS prototype and contributors
# For license information, please see license.txt
"""Extraction layer: read the Frappe Education data model and produce the AVETMISS
NAT file set via the pure writers in `natfiles`. Implements the derivations the
coverage ledger marks `derived` (name-for-encryption, gender->code, state->code,
date formatting) and assembles cross-file referential sets.

Frappe-dependent (runs in a bench). Pure formatting stays in natfiles/.
"""

import frappe

from .natfiles import (
	nat00010, nat00020, nat00030, nat00060, nat00080,
	nat00085, nat00090, nat00100, nat00120, nat00130,
)

# Gender DocType label -> AVETMISS Sex/Gender code (DED). Unknown -> '@'.
GENDER_CODE = {
	"Male": "M", "Female": "F",
	"Other": "X", "Non-Conforming": "X", "Genderqueer": "X", "Transgender": "X",
	"Prefer not to say": "@", "": "@",
}
# AU state string -> AVETMISS state identifier (DED). Unknown -> '99'.
STATE_CODE = {
	"NSW": "01", "VIC": "02", "QLD": "03", "SA": "04", "WA": "05",
	"TAS": "06", "NT": "07", "ACT": "08",
	"NEW SOUTH WALES": "01", "VICTORIA": "02", "QUEENSLAND": "03",
	"SOUTH AUSTRALIA": "04", "WESTERN AUSTRALIA": "05", "TASMANIA": "06",
	"NORTHERN TERRITORY": "07", "AUSTRALIAN CAPITAL TERRITORY": "08",
}


def gender_code(label):
	return GENDER_CODE.get((label or "").strip(), "@")


def state_code(label):
	return STATE_CODE.get((label or "").strip().upper(), "99")


def ddmmyyyy(value):
	"""Any Frappe date value -> DDMMYYYY string, or '' if blank."""
	if not value:
		return ""
	dt = frappe.utils.getdate(value)
	return dt.strftime("%d%m%Y")


def name_for_encryption(first, last):
	"""DED: Client family name and first given name form the field, each
	truncated to 40, joined 'Family, First'."""
	return "%s, %s" % ((last or "")[:40], (first or "")[:40])


def _settings():
	s = frappe.get_single("AVETMISS Settings")
	if not s.rto_identifier:
		frappe.throw("AVETMISS Settings.rto_identifier is not set")
	return s


def _client_id(student_name, cache):
	if student_name not in cache:
		cache[student_name] = frappe.db.get_value("Student", student_name, "avetmiss_client_identifier") or ""
	return cache[student_name]


def generate_all(collection_year=2019, output_dir=None):
	"""Build the full national NAT set from the live data. Returns {file: text}.
	Only clients with training activity (NAT00120) or a completion (NAT00130) are
	included, and only the programs/subjects/locations they reference."""
	settings = _settings()
	rto = settings.rto_identifier

	# --- Training activity (NAT00120) drives everything ---
	enrolments = frappe.get_all(
		"Course Enrollment",
		fields=["name", "student", "course", "program_enrollment", "program",
				"avetmiss_delivery_location", "avetmiss_activity_start_date",
				"avetmiss_activity_end_date", "avetmiss_delivery_mode",
				"avetmiss_outcome_national", "avetmiss_funding_source_national",
				"avetmiss_commencing_program", "avetmiss_training_contract_id",
				"avetmiss_apprentice_client_id", "avetmiss_study_reason",
				"avetmiss_vet_in_schools", "avetmiss_specific_funding_id",
				"avetmiss_school_type"],
	)

	cid_cache = {}
	activities = []
	used_students, used_courses, used_programs, used_locations = set(), set(), set(), set()
	for e in enrolments:
		course = frappe.db.get_value("Course", e.course, "avetmiss_subject_identifier") or ""
		program_id = ""
		if e.program_enrollment:
			prog = frappe.db.get_value("Program Enrollment", e.program_enrollment, "program")
			program_id = frappe.db.get_value("Program", prog, "avetmiss_program_identifier") or "" if prog else ""
		loc = ""
		if e.avetmiss_delivery_location:
			loc = frappe.db.get_value("Training Delivery Location", e.avetmiss_delivery_location, "location_identifier") or ""
		activities.append({
			"rto_identifier": rto,
			"delivery_location": loc,
			"client_identifier": _client_id(e.student, cid_cache),
			"subject_identifier": course,
			"program_identifier": program_id,
			"activity_start_date": ddmmyyyy(e.avetmiss_activity_start_date),
			"activity_end_date": ddmmyyyy(e.avetmiss_activity_end_date),
			"delivery_mode": e.avetmiss_delivery_mode or "",
			"outcome_national": e.avetmiss_outcome_national or "",
			"funding_source_national": e.avetmiss_funding_source_national or "",
			"commencing_program": e.avetmiss_commencing_program or "",
			"training_contract_id": e.avetmiss_training_contract_id or "",
			"apprentice_client_id": e.avetmiss_apprentice_client_id or "",
			"study_reason": e.avetmiss_study_reason or "",
			"vet_in_schools": e.avetmiss_vet_in_schools or "",
			"specific_funding_id": e.avetmiss_specific_funding_id or "",
			"school_type": e.avetmiss_school_type or "",
		})
		used_students.add(e.student)
		used_courses.add(e.course)
		if loc:
			used_locations.add(e.avetmiss_delivery_location)
		if e.program_enrollment:
			used_programs.add(e.program_enrollment)

	# --- Program completed (NAT00130) ---
	completions = []
	for pe in frappe.get_all(
		"Program Enrollment",
		filters={"avetmiss_completion_date": ["is", "set"]},
		fields=["name", "student", "program", "avetmiss_completion_date", "avetmiss_issued_flag"],
	):
		completions.append({
			"rto_identifier": rto,
			"program_identifier": frappe.db.get_value("Program", pe.program, "avetmiss_program_identifier") or "",
			"client_identifier": _client_id(pe.student, cid_cache),
			"date_completed": ddmmyyyy(pe.avetmiss_completion_date),
			"issued_flag": pe.avetmiss_issued_flag or "",
		})
		used_students.add(pe.student)
		used_programs.add(pe.name)

	# --- Clients (NAT00080/85/90/100) for students with activity/completion ---
	clients80, clients85, disabilities, prior_ach = [], [], [], []
	for sn in sorted(used_students):
		s = frappe.get_doc("Student", sn)
		cid = s.avetmiss_client_identifier or ""
		clients80.append({
			"client_identifier": cid,
			"name_for_encryption": name_for_encryption(s.first_name, s.last_name),
			"highest_school_level": s.avetmiss_highest_school_level or "",
			"gender": gender_code(s.gender),
			"date_of_birth": ddmmyyyy(s.date_of_birth),
			"postcode": s.pincode or "",
			"indigenous_status": s.avetmiss_indigenous_status or "",
			"language_id": s.avetmiss_language_id or "",
			"labour_force_status": s.avetmiss_labour_force_status or "",
			"country_id": s.avetmiss_country_of_birth_id or "",
			"disability_flag": s.avetmiss_disability_flag or "",
			"prior_ed_flag": s.avetmiss_prior_ed_flag or "",
			"at_school_flag": s.avetmiss_at_school_flag or "",
			"suburb": s.city or "",
			"usi": s.avetmiss_usi or "",
			"state_identifier": state_code(s.state),
			"addr_building": s.avetmiss_addr_building or "",
			"addr_flat": s.avetmiss_addr_flat or "",
			"addr_street_no": s.avetmiss_addr_street_no or "",
			"addr_street_name": s.avetmiss_addr_street_name or "",
			"survey_contact_status": s.avetmiss_survey_contact_status or "",
		})
		clients85.append({
			"client_identifier": cid,
			"title": "",
			"first_name": s.first_name or "",
			"family_name": s.last_name or "",
			"addr_building": s.avetmiss_addr_building or "",
			"addr_flat": s.avetmiss_addr_flat or "",
			"addr_street_no": s.avetmiss_addr_street_no or "",
			"addr_street_name": s.avetmiss_addr_street_name or "",
			"addr_postal_box": s.avetmiss_addr_postal_box or "",
			"suburb": s.city or "",
			"postcode": s.pincode or "",
			"state_identifier": state_code(s.state),
			"phone_home": s.avetmiss_phone_home or "",
			"phone_work": s.avetmiss_phone_work or "",
			"phone_mobile": s.student_mobile_number or "",
			"email": s.student_email_id or "",
			"email_alt": "",
		})
		if (s.avetmiss_disability_flag or "") == "Y":
			for d in s.get("disabilities") or []:
				disabilities.append({"client_identifier": cid, "disability_type": d.disability_type})
		if (s.avetmiss_prior_ed_flag or "") == "Y":
			for p in s.get("prior_achievements") or []:
				prior_ach.append({"client_identifier": cid, "achievement_id": p.achievement_id})

	# --- Programs (NAT00030) & Subjects (NAT00060): only those referenced ---
	prog_ids = set()
	for pe in used_programs:
		prog = frappe.db.get_value("Program Enrollment", pe, "program")
		if prog:
			prog_ids.add(prog)
	programs = []
	for p in sorted(prog_ids):
		d = frappe.get_doc("Program", p)
		programs.append({
			"program_identifier": d.avetmiss_program_identifier or "",
			"program_name": d.program_name or "",
			"nominal_hours": d.avetmiss_nominal_hours or "",
		})
	subjects = []
	for c in sorted(used_courses):
		d = frappe.get_doc("Course", c)
		subjects.append({
			"subject_identifier": d.avetmiss_subject_identifier or "",
			"subject_name": d.course_name or "",
			"field_of_education_id": d.avetmiss_field_of_education_id or "",
			"vet_flag": d.avetmiss_vet_flag or "",
			"nominal_hours": d.avetmiss_nominal_hours or "",
		})

	# --- Delivery locations (NAT00020): only referenced ---
	locations = []
	for loc in sorted(used_locations):
		d = frappe.get_doc("Training Delivery Location", loc)
		locations.append({
			"rto_identifier": rto,
			"location_identifier": d.location_identifier or "",
			"location_name": d.location_name or "",
			"postcode": d.postcode or "",
			"state_identifier": d.state_identifier or "",
			"suburb": d.suburb or "",
			"country_identifier": d.country_identifier or "",
		})

	files = {
		"NAT00010": nat00010.generate([{"rto_identifier": rto, "rto_name": settings.rto_name}]),
		"NAT00020": nat00020.generate(locations),
		"NAT00030": nat00030.generate(programs),
		"NAT00060": nat00060.generate(subjects),
		"NAT00080": nat00080.generate(clients80),
		"NAT00085": nat00085.generate(clients85),
		"NAT00090": nat00090.generate(disabilities),
		"NAT00100": nat00100.generate(prior_ach),
		"NAT00120": nat00120.generate(activities),
		"NAT00130": nat00130.generate(completions),
	}
	if output_dir:
		import os
		os.makedirs(output_dir, exist_ok=True)
		for name, text in files.items():
			with open(os.path.join(output_dir, name + ".txt"), "wb") as fh:
				fh.write(text.encode("ascii"))
	return files
