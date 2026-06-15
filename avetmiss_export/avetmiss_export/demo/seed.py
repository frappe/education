# Copyright (c) 2026, AVETMISS prototype and contributors
# For license information, please see license.txt
"""Seed a synthetic AVETMISS cohort that exercises the awkward combinations:
multiple outcomes, a completion, a withdrawal, a client with a disability AND a
prior-education record, an apprentice (training contract), and a credit transfer
(outcome 60 / delivery mode NNN). All coded values are valid so the pre-flight
validator reports the generated NAT set clean.

Synthetic only — proves schema + export. RTO id is a placeholder, so AVS will
report error 4704 (RTO-id mismatch) which is expected per the definition of done.
"""

import frappe

RTO_ID = "90052"
RTO_NAME = "Prototype Training Co"
YEAR = "2019"
START = "2019-02-04"
END = "2019-06-28"
END_CONTINUING = "2019-12-31"

LOCATION = {"location_identifier": "LOC001", "location_name": "Adelaide Campus",
			"postcode": "5000", "state_identifier": "04", "suburb": "Adelaide",
			"country_identifier": "1101"}

PROGRAMS = [
	{"id": "BSB30120", "name": "Certificate III in Business", "hours": 0},
	{"id": "BSB40520", "name": "Certificate IV in Leadership and Management", "hours": 0},
]
COURSES = [
	{"id": "BSBWHS311", "name": "Assist with maintaining workplace safety"},
	{"id": "BSBCRT311", "name": "Apply critical thinking skills in a team environment"},
	{"id": "BSBPEF301", "name": "Organise personal work priorities"},
]

# client_id, first, last, dob, gender, program, disability(Y/N), prior_ed(Y/N),
# disabilities[], prior[], activities[(course, outcome, mode, commencing, appr)]
COHORT = [
	{"cid": "AVCLI00001", "first": "Aanya", "last": "Sharma", "dob": "1995-03-12",
	 "gender": "Female", "program": "BSB30120", "dis": "Y", "ped": "Y",
	 "disabilities": ["11", "12"], "prior": ["511"],
	 "acts": [("BSBWHS311", "20", "YNY", "8", None), ("BSBCRT311", "30", "YNY", "8", None)]},
	{"cid": "AVCLI00002", "first": "Ben", "last": "Nguyen", "dob": "1990-07-01",
	 "gender": "Male", "program": "BSB30120", "dis": "N", "ped": "N",
	 "disabilities": [], "prior": [], "complete": True,
	 "acts": [("BSBWHS311", "20", "YNY", "8", None), ("BSBCRT311", "20", "YNY", "8", None),
			  ("BSBPEF301", "20", "YNY", "8", None)]},
	{"cid": "AVCLI00003", "first": "Chloe", "last": "Brown", "dob": "2001-11-23",
	 "gender": "Female", "program": "BSB30120", "dis": "N", "ped": "N",
	 "disabilities": [], "prior": [],
	 "acts": [("BSBWHS311", "40", "YNY", "8", None)]},
	{"cid": "AVCLI00004", "first": "Dev", "last": "Patel", "dob": "1999-05-09",
	 "gender": "Male", "program": "BSB40520", "dis": "N", "ped": "N",
	 "disabilities": [], "prior": [], "apprentice": True,
	 "acts": [("BSBPEF301", "20", "YNY", "8", "APPR000001")]},
	{"cid": "AVCLI00005", "first": "Ella", "last": "Wilson", "dob": "1988-02-17",
	 "gender": "Female", "program": "BSB40520", "dis": "N", "ped": "N",
	 "disabilities": [], "prior": [],
	 "acts": [("BSBCRT311", "60", "NNN", "8", None)]},   # credit transfer -> NNN
	{"cid": "AVCLI00006", "first": "Finn", "last": "Taylor", "dob": "2003-09-30",
	 "gender": "Male", "program": "BSB30120", "dis": "N", "ped": "N",
	 "disabilities": [], "prior": [], "continuing": True,
	 "acts": [("BSBPEF301", "85", "YNY", "3", None)]},   # continuing
]


def _reset():
	for dt in ("Course Enrollment", "Program Enrollment", "Student", "Course",
			   "Program", "Training Delivery Location"):
		frappe.db.delete(dt)


def _ensure_gender():
	for g in ("Male", "Female"):
		if not frappe.db.exists("Gender", g):
			frappe.get_doc({"doctype": "Gender", "gender": g}).insert(ignore_permissions=True)


def _ensure_academic_year():
	if not frappe.db.exists("Academic Year", YEAR):
		frappe.get_doc({"doctype": "Academic Year", "academic_year_name": YEAR,
						"year_start_date": "2019-01-01", "year_end_date": "2019-12-31"}).insert(ignore_permissions=True)


def seed():
	# avoid Student->User side effects
	es = frappe.get_single("Education Settings")
	es.user_creation_skip = 1
	es.save(ignore_permissions=True)

	_reset()
	_ensure_gender()
	_ensure_academic_year()

	s = frappe.get_single("AVETMISS Settings")
	s.rto_identifier = RTO_ID
	s.rto_name = RTO_NAME
	s.save(ignore_permissions=True)

	frappe.get_doc(dict(doctype="Training Delivery Location", **LOCATION)).insert(ignore_permissions=True)

	for p in PROGRAMS:
		frappe.get_doc({"doctype": "Program", "program_name": p["name"],
						"avetmiss_program_identifier": p["id"], "avetmiss_nominal_hours": p["hours"]}).insert(ignore_permissions=True)
	prog_by_id = {p["id"]: frappe.db.get_value("Program", {"avetmiss_program_identifier": p["id"]}, "name") for p in PROGRAMS}

	for c in COURSES:
		frappe.get_doc({"doctype": "Course", "course_name": c["name"],
						"avetmiss_subject_identifier": c["id"]}).insert(ignore_permissions=True)
	course_by_id = {c["id"]: frappe.db.get_value("Course", {"avetmiss_subject_identifier": c["id"]}, "name") for c in COURSES}

	created = {"students": 0, "program_enrollments": 0, "course_enrollments": 0}
	for c in COHORT:
		st = frappe.get_doc({
			"doctype": "Student", "first_name": c["first"], "last_name": c["last"],
			"date_of_birth": c["dob"], "gender": c["gender"],
			"student_email_id": "%s@example.com" % c["cid"].lower(),
			"student_mobile_number": "0400000000",
			"pincode": "5000", "city": "Adelaide", "state": "SA",
			"avetmiss_client_identifier": c["cid"],
			"avetmiss_highest_school_level": "12",
			"avetmiss_indigenous_status": "2",
			"avetmiss_language_id": "1201",
			"avetmiss_labour_force_status": "01",
			"avetmiss_country_of_birth_id": "1101",
			"avetmiss_disability_flag": c["dis"],
			"avetmiss_prior_ed_flag": c["ped"],
			"avetmiss_at_school_flag": "N",
			"avetmiss_usi": "INDIV",
			"avetmiss_addr_street_no": "1",
			"avetmiss_addr_street_name": "Prototype Street",
			"avetmiss_survey_contact_status": "A",
			"disabilities": [{"disability_type": d} for d in c["disabilities"]],
			"prior_achievements": [{"achievement_id": a} for a in c["prior"]],
		})
		st.insert(ignore_permissions=True)
		created["students"] += 1

		pe = frappe.get_doc({
			"doctype": "Program Enrollment", "student": st.name,
			"program": prog_by_id[c["program"]], "academic_year": YEAR,
			"enrollment_date": START,
		})
		if c.get("complete"):
			pe.avetmiss_completion_date = END
			pe.avetmiss_issued_flag = "Y"
		pe.insert(ignore_permissions=True)
		created["program_enrollments"] += 1

		for (course_id, outcome, mode, commencing, appr) in c["acts"]:
			ce = frappe.get_doc({
				"doctype": "Course Enrollment", "student": st.name,
				"course": course_by_id[course_id], "program_enrollment": pe.name,
				"enrollment_date": START,
				"avetmiss_delivery_location": LOCATION["location_identifier"],
				"avetmiss_activity_start_date": START,
				"avetmiss_activity_end_date": END_CONTINUING if outcome == "85" else END,
				"avetmiss_delivery_mode": mode,
				"avetmiss_outcome_national": outcome,
				"avetmiss_funding_source_national": "20",
				"avetmiss_commencing_program": commencing,
				"avetmiss_study_reason": "11",
				"avetmiss_vet_in_schools": "N",
			})
			if appr:
				ce.avetmiss_training_contract_id = "TC0000001"
				ce.avetmiss_apprentice_client_id = appr
			ce.insert(ignore_permissions=True)
			created["course_enrollments"] += 1

	frappe.db.commit()
	return created
