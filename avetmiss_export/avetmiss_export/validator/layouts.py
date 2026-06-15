# Copyright (c) 2026, AVETMISS prototype and contributors
# For license information, please see license.txt
"""Field layouts (name, 0-indexed start, length) for parsing NAT records back
into fields for validation. Positions per the spec 8.0 field tables — the same
tables the writers use.
"""

LAYOUTS = {
	"NAT00010": [("rto_identifier", 0, 10), ("rto_name", 10, 100)],
	"NAT00020": [
		("rto_identifier", 0, 10), ("location_identifier", 10, 10),
		("location_name", 20, 100), ("postcode", 120, 4),
		("state_identifier", 124, 2), ("suburb", 126, 50), ("country_identifier", 176, 4),
	],
	"NAT00030": [("program_identifier", 0, 10), ("program_name", 10, 100), ("nominal_hours", 110, 4)],
	"NAT00060": [
		("subject_identifier", 0, 12), ("subject_name", 12, 100),
		("field_of_education_id", 112, 6), ("vet_flag", 118, 1), ("nominal_hours", 119, 4),
	],
	"NAT00080": [
		("client_identifier", 0, 10), ("name_for_encryption", 10, 60),
		("highest_school_level", 70, 2), ("gender", 72, 1), ("date_of_birth", 73, 8),
		("postcode", 81, 4), ("indigenous_status", 85, 1), ("language_id", 86, 4),
		("labour_force_status", 90, 2), ("country_id", 92, 4), ("disability_flag", 96, 1),
		("prior_ed_flag", 97, 1), ("at_school_flag", 98, 1), ("suburb", 99, 50),
		("usi", 149, 10), ("state_identifier", 159, 2), ("addr_building", 161, 50),
		("addr_flat", 211, 30), ("addr_street_no", 241, 15), ("addr_street_name", 256, 70),
		("survey_contact_status", 326, 1), ("sa1", 327, 11), ("sa2", 338, 9),
	],
	"NAT00085": [
		("client_identifier", 0, 10), ("title", 10, 4), ("first_name", 14, 40),
		("family_name", 54, 40), ("suburb", 281, 50), ("postcode", 331, 4),
		("state_identifier", 335, 2), ("email", 397, 80),
	],
	"NAT00090": [("client_identifier", 0, 10), ("disability_type", 10, 2)],
	"NAT00100": [("client_identifier", 0, 10), ("achievement_id", 10, 3)],
	"NAT00120": [
		("rto_identifier", 0, 10), ("delivery_location", 10, 10), ("client_identifier", 20, 10),
		("subject_identifier", 30, 12), ("program_identifier", 42, 10),
		("activity_start_date", 52, 8), ("activity_end_date", 60, 8),
		("delivery_mode", 68, 3), ("outcome_national", 71, 2), ("funding_source_national", 73, 2),
		("commencing_program", 75, 1), ("training_contract_id", 76, 10),
		("apprentice_client_id", 86, 10), ("study_reason", 96, 2), ("vet_in_schools", 98, 1),
		("specific_funding_id", 99, 10), ("school_type", 109, 2),
	],
	"NAT00130": [
		("rto_identifier", 0, 10), ("program_identifier", 10, 10), ("client_identifier", 20, 10),
		("date_completed", 30, 8), ("issued_flag", 38, 1),
	],
}

EXPECTED_WIDTH = {
	"NAT00010": 448, "NAT00020": 180, "NAT00030": 130, "NAT00060": 123,
	"NAT00080": 347, "NAT00085": 557, "NAT00090": 12, "NAT00100": 13,
	"NAT00120": 111, "NAT00130": 72,
}


def parse(file_key, text):
	"""Parse NAT file text into a list of {field: value} dicts (values rstripped;
	blank -> '')."""
	records = []
	lines = text.split("\r\n")
	if lines and lines[-1] == "":
		lines = lines[:-1]
	layout = LAYOUTS[file_key]
	for raw in lines:
		rec = {"_raw": raw, "_len": len(raw)}
		for name, start, length in layout:
			rec[name] = raw[start:start + length].rstrip()
		records.append(rec)
	return records
