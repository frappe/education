# Copyright (c) 2026, AVETMISS prototype and contributors
# For license information, please see license.txt
"""AVS-rules pre-flight validation engine.

Loads the AVS rules CSV for traceability/coverage, parses the NAT files, and runs
the mechanically-checkable edits: structure, mandatory, valid-value (DED code
sets), uniqueness, cross-file referential integrity, intra-record consistency,
and collection-period date bounds. Findings carry the real AVS rule number.

Rules needing external reference data (postcode/locality tables, USI checksum,
TGA program list, nominal-hours-sum thresholds, submitter-type or age-conditional
edits) are NOT enforced and are reported in the coverage summary — no silent gaps.
"""

import csv
import datetime
import os

from . import codesets as cs
from .layouts import EXPECTED_WIDTH, LAYOUTS, parse

RULES_CSV = os.environ.get(
	"AVETMISS_RULES_CSV", "/home/brandon/education/reference/VET-8.0.csv"
)
IN_SCOPE_FILES = set(LAYOUTS.keys())  # the 10 national files we generate


class Finding:
	def __init__(self, file, rule, ew, field, rec, message):
		self.file, self.rule, self.ew = file, rule, ew
		self.field, self.rec, self.message = field, rec, message

	def __repr__(self):
		return "%s %s[%s] rec%s %s: %s" % (
			self.file, self.rule, self.ew, self.rec, self.field, self.message)


# --- AVS rules CSV: load + index for rule-number lookup & coverage ---------
def load_rules():
	with open(RULES_CSV, encoding="utf-8-sig") as fh:
		return list(csv.DictReader(fh))


def rule_index(rules):
	idx = {}
	for r in rules:
		idx.setdefault(r["Data File"], []).append(r)
	return idx


def find_rule_row(idx, file, field_substr, keyword):
	"""First rule row on `file` whose Field contains field_substr and Business
	Rule contains keyword (case-insensitive). None if not found."""
	for r in idx.get(file, []):
		if field_substr.lower() in r["Field"].lower() and keyword.lower() in r["Business Rule"].lower():
			return r
	return None


def find_rule(idx, file, field_substr, keyword):
	"""(rule_no, E/W) for find_rule_row, or ('?', 'E')."""
	r = find_rule_row(idx, file, field_substr, keyword)
	return (r["E/W No."], r["E/W"]) if r else ("?", "E")


def parse_ddmmyyyy(v):
	s = str(v).strip()
	if len(s) != 8 or not s.isdigit():
		return None
	try:
		return datetime.date(int(s[4:8]), int(s[2:4]), int(s[0:2]))
	except ValueError:
		return None


# --- Coded fields: error if blank OR not a valid value --------------------
# (file, layout_field, csv_field_substr, validator(value)->bool)
CODED = [
	("NAT00060", "vet_flag", "VET Flag", lambda v: v in cs.VET_FLAG),
	("NAT00080", "gender", "Gender", lambda v: v in cs.GENDER),
	("NAT00080", "highest_school_level", "Highest School", lambda v: v in cs.HIGHEST_SCHOOL),
	("NAT00080", "indigenous_status", "Indigenous", lambda v: v in cs.INDIGENOUS),
	("NAT00080", "labour_force_status", "Labour Force", lambda v: v in cs.LABOUR_FORCE),
	("NAT00080", "language_id", "Language", cs.valid_language),
	("NAT00080", "country_id", "Country", cs.valid_country),
	("NAT00080", "disability_flag", "Disability Flag", lambda v: v in cs.DISABILITY_FLAG),
	("NAT00080", "prior_ed_flag", "Prior Educational Achievement Flag", lambda v: v in cs.PRIOR_ED_FLAG),
	("NAT00080", "at_school_flag", "At School Flag", lambda v: v in cs.AT_SCHOOL_FLAG),
	("NAT00080", "postcode", "Postcode", cs.valid_postcode),
	("NAT00080", "state_identifier", "State Identifier", lambda v: v in cs.STATE),
	("NAT00080", "date_of_birth", "Date of Birth", lambda v: parse_ddmmyyyy(v) is not None),
	("NAT00090", "disability_type", "Disability Type", lambda v: v in cs.DISABILITY_TYPE),
	("NAT00100", "achievement_id", "Prior Educational Achievement", lambda v: v in cs.PRIOR_ACHIEVEMENT),
	("NAT00120", "delivery_mode", "Delivery Mode", cs.valid_delivery_mode),
	("NAT00120", "funding_source_national", "Funding Source", lambda v: v in cs.FUNDING_NATIONAL),
	("NAT00120", "commencing_program", "Commencing Program", lambda v: v in cs.COMMENCING_PROGRAM),
	("NAT00120", "study_reason", "Study Reason", lambda v: v in cs.STUDY_REASON),
	("NAT00120", "vet_in_schools", "VET in schools", lambda v: v in cs.VET_IN_SCHOOLS),
	("NAT00120", "activity_start_date", "Activity Start Date", lambda v: parse_ddmmyyyy(v) is not None),
	("NAT00120", "activity_end_date", "Activity End Date", lambda v: parse_ddmmyyyy(v) is not None),
	("NAT00130", "issued_flag", "Issued Flag", lambda v: v in cs.ISSUED_FLAG),
]

# Coded fields whose mandatory-ness is TGA-conditional (blank is permitted when the
# unit/program is on Training.gov.au, which we can't look up). Validate value only
# when non-blank; the mandatory aspect is logged as unenforced (needs TGA).
OPTIONAL_CODED = {("NAT00060", "vet_flag")}

# Mandatory (non-blank) identifier/name fields -> rule via "blank" keyword.
MANDATORY = [
	("NAT00010", "rto_identifier", "Training Organisation Identifier"),
	("NAT00010", "rto_name", "Training Organisation Name"),
	("NAT00020", "location_identifier", "Delivery Location Identifier"),
	("NAT00020", "location_name", "Delivery Location Name"),
	("NAT00030", "program_identifier", "Program Identifier"),
	("NAT00030", "program_name", "Program Name"),
	("NAT00060", "subject_identifier", "Subject Identifier"),
	("NAT00060", "subject_name", "Subject Name"),
	("NAT00080", "client_identifier", "Client identifier"),
	("NAT00090", "client_identifier", "Client identifier"),
	("NAT00100", "client_identifier", "Client identifier"),
	("NAT00120", "client_identifier", "Client identifier"),
	("NAT00130", "client_identifier", "Client identifier"),
	("NAT00130", "program_identifier", "Program Identifier"),
	("NAT00130", "date_completed", "Date program completed"),
]

# Uniqueness: (file, key-fields, rule field substr)
UNIQUE = [
	("NAT00010", ("rto_identifier",), "Training Organisation Identifier"),
	("NAT00020", ("location_identifier",), "Delivery Location Identifier"),
	("NAT00030", ("program_identifier",), "Program Identifier"),
	("NAT00060", ("subject_identifier",), "Subject Identifier"),
	("NAT00080", ("client_identifier",), "Client identifier"),
	("NAT00090", ("client_identifier", "disability_type"), "Disability Type"),
	("NAT00100", ("client_identifier", "achievement_id"), "Prior Educational Achievement"),
]

# Pairs we mechanically cover, for honest coverage accounting.
COVERED = set()


def _cover(file, rule):
	if rule != "?":
		COVERED.add((file, rule))


def validate(files, collection_year=2019):
	"""files: {file_key: text}. Returns {'findings':[...], 'errors':n, 'warnings':n,
	'coverage':{...}}. Only files present are checked."""
	rules = load_rules()
	idx = rule_index(rules)
	COVERED.clear()
	findings = []
	period_end = datetime.date(collection_year, 12, 31)
	period_start = datetime.date(collection_year, 1, 1)
	validation_date = datetime.date(collection_year + 1, 12, 31)

	parsed = {f: parse(f, t) for f, t in files.items() if f in LAYOUTS}

	def add(file, rule, ew, field, ri, msg):
		findings.append(Finding(file, rule, ew, field, ri, msg))

	# 1. Structure: record width.
	for f, recs in parsed.items():
		w = EXPECTED_WIDTH[f]
		for i, r in enumerate(recs):
			if r["_len"] != w:
				add(f, "STRUCT", "E", "(record)", i, "length %d != expected %d" % (r["_len"], w))

	# 2. Mandatory.
	for f, field, csvf in MANDATORY:
		if f not in parsed:
			continue
		no, ew = find_rule(idx, f, csvf, "blank")
		_cover(f, no)
		for i, r in enumerate(parsed[f]):
			if cs.is_blank(r.get(field)):
				add(f, no, ew, field, i, "must not be blank")

	# 3. Coded valid-value. Whether blank is allowed is read from the rule text:
	#    "If blank or not a valid value" = mandatory; "If not blank ..." = optional.
	for f, field, csvf, ok in CODED:
		if f not in parsed:
			continue
		row = find_rule_row(idx, f, csvf, "valid")
		if row:
			no, ew = row["E/W No."], row["E/W"]
			blank_ok = row["Business Rule"].lower().lstrip().startswith("if not blank")
		else:
			no, ew, blank_ok = "?", "E", False
		if (f, field) in OPTIONAL_CODED:
			blank_ok = True  # TGA-conditional; mandatory aspect unenforced
		_cover(f, no)
		for i, r in enumerate(parsed[f]):
			v = r.get(field)
			if cs.is_blank(v):
				if not blank_ok:
					add(f, no, ew, field, i, "must not be blank")
			elif not ok(v):
				add(f, no, ew, field, i, "not a valid value: %r" % v)

	# 4. Uniqueness.
	for f, keys, csvf in UNIQUE:
		if f not in parsed:
			continue
		no, ew = find_rule(idx, f, csvf, "one")
		if no == "?":
			no, ew = find_rule(idx, f, csvf, "duplicate")
		_cover(f, no)
		seen = {}
		for i, r in enumerate(parsed[f]):
			k = tuple(r.get(x) for x in keys)
			if k in seen:
				add(f, no, ew, "+".join(keys), i, "duplicate key %r (first at rec %d)" % (k, seen[k]))
			else:
				seen[k] = i

	# 5. Referential integrity + flag/child-file consistency.
	_referential(parsed, idx, add)

	# 6. NAT00120 intra-record consistency.
	_activity_consistency(parsed, idx, add)

	# 7. Collection-period date bounds.
	_date_bounds(parsed, idx, add, period_start, period_end, validation_date)

	errors = sum(1 for x in findings if x.ew == "E")
	warnings = sum(1 for x in findings if x.ew == "W")
	coverage = _coverage(rules)
	return {"findings": findings, "errors": errors, "warnings": warnings, "coverage": coverage}


def _client_set(parsed, f):
	return {r["client_identifier"] for r in parsed.get(f, [])}


def _referential(parsed, idx, add):
	clients80 = _client_set(parsed, "NAT00080")
	# disability flag <-> NAT00090
	dis_clients = _client_set(parsed, "NAT00090")
	if "NAT00080" in parsed:
		no_y, ew_y = find_rule(idx, "NAT00080", "Disability Flag", "no corresponding")
		no_n, ew_n = find_rule(idx, "NAT00080", "Disability Flag", "not Y but there is a corresponding")
		_cover("NAT00080", no_y)
		_cover("NAT00080", no_n)
		for i, r in enumerate(parsed["NAT00080"]):
			cid = r["client_identifier"]
			if r["disability_flag"] == "Y" and cid not in dis_clients:
				add("NAT00080", no_y, ew_y, "disability_flag", i, "flag Y but no NAT00090 record for %s" % cid)
			if r["disability_flag"] != "Y" and cid in dis_clients:
				add("NAT00080", no_n, ew_n, "disability_flag", i, "flag not Y but NAT00090 record exists for %s" % cid)
		# prior-ed flag <-> NAT00100
		pe_clients = _client_set(parsed, "NAT00100")
		no_py, ew_py = find_rule(idx, "NAT00080", "Prior Educational Achievement Flag", "no corresponding")
		no_pn, ew_pn = find_rule(idx, "NAT00080", "Prior Educational Achievement Flag", "not Y but there is a corresponding")
		_cover("NAT00080", no_py)
		_cover("NAT00080", no_pn)
		for i, r in enumerate(parsed["NAT00080"]):
			cid = r["client_identifier"]
			if r["prior_ed_flag"] == "Y" and cid not in pe_clients:
				add("NAT00080", no_py, ew_py, "prior_ed_flag", i, "flag Y but no NAT00100 record for %s" % cid)
			if r["prior_ed_flag"] != "Y" and cid in pe_clients:
				add("NAT00080", no_pn, ew_pn, "prior_ed_flag", i, "flag not Y but NAT00100 record exists for %s" % cid)
	# child files -> client must exist in NAT00080
	for f in ("NAT00090", "NAT00100", "NAT00085", "NAT00120", "NAT00130"):
		if f not in parsed or "NAT00080" not in parsed:
			continue
		kw = "Client (NAT00080)" if f == "NAT00120" else "Client"
		no, ew = find_rule(idx, f, "Client", "NAT00080") if f == "NAT00120" else ("4649" if f == "NAT00085" else "REF", "E")
		_cover(f, no)
		for i, r in enumerate(parsed[f]):
			if r["client_identifier"] not in clients80:
				add(f, no, ew, "client_identifier", i, "client %s not in NAT00080" % r["client_identifier"])
	# NAT00120 -> subject in NAT00060, program in NAT00030, location in NAT00020
	subjects = {r["subject_identifier"] for r in parsed.get("NAT00060", [])}
	programs = {r["program_identifier"] for r in parsed.get("NAT00030", [])}
	locations = {r["location_identifier"] for r in parsed.get("NAT00020", [])}
	if "NAT00120" in parsed:
		for i, r in enumerate(parsed["NAT00120"]):
			if parsed.get("NAT00060") and r["subject_identifier"] not in subjects:
				add("NAT00120", "REF", "E", "subject_identifier", i, "subject %s not in NAT00060" % r["subject_identifier"])
			if parsed.get("NAT00030") and r["program_identifier"] and r["program_identifier"] not in programs:
				add("NAT00120", "REF", "E", "program_identifier", i, "program %s not in NAT00030" % r["program_identifier"])
			if parsed.get("NAT00020") and r["delivery_location"] not in locations:
				add("NAT00120", "REF", "E", "delivery_location", i, "location %s not in NAT00020" % r["delivery_location"])
	# NAT00130 -> program in NAT00030
	if "NAT00130" in parsed and parsed.get("NAT00030"):
		for i, r in enumerate(parsed["NAT00130"]):
			if r["program_identifier"] not in programs:
				add("NAT00130", "REF", "E", "program_identifier", i, "program %s not in NAT00030" % r["program_identifier"])
	# every NAT00080 client must have activity (NAT00120) or completion (NAT00130)  [AVS 4503]
	if "NAT00080" in parsed and ("NAT00120" in parsed or "NAT00130" in parsed):
		act = _client_set(parsed, "NAT00120") | _client_set(parsed, "NAT00130")
		no, ew = find_rule(idx, "NAT00080", "Client identifier", "at least one associated")
		_cover("NAT00080", no)
		for i, r in enumerate(parsed["NAT00080"]):
			if r["client_identifier"] not in act:
				add("NAT00080", no, ew, "client_identifier", i,
					"client %s has no NAT00120 activity or NAT00130 completion" % r["client_identifier"])


def _activity_consistency(parsed, idx, add):
	if "NAT00120" not in parsed:
		return
	no_blank, ew_blank = find_rule(idx, "NAT00120", "Outcome", "blank")
	no_val, ew_val = find_rule(idx, "NAT00120", "Outcome", "valid value")
	no_nnn, ew_nnn = find_rule(idx, "NAT00120", "Outcome", "NNN")
	no_dm, ew_dm = find_rule(idx, "NAT00120", "Delivery Mode", "51")
	no_se, ew_se = find_rule(idx, "NAT00120", "Activity Start Date", "Activity End Date")
	for n in (no_blank, no_val, no_nnn, no_dm, no_se):
		_cover("NAT00120", n)
	NO_DM = {"51", "52", "60"}
	for i, r in enumerate(parsed["NAT00120"]):
		oc, dm = r["outcome_national"], r["delivery_mode"]
		if cs.is_blank(oc):
			add("NAT00120", no_blank, ew_blank, "outcome_national", i, "outcome must not be blank")
		elif oc not in cs.OUTCOME_NATIONAL:
			add("NAT00120", no_val, ew_val, "outcome_national", i, "outcome not a valid value: %r" % oc)
		if dm == "NNN" and not cs.is_blank(oc) and oc not in NO_DM:
			add("NAT00120", no_nnn, ew_nnn, "outcome_national", i, "delivery mode NNN requires outcome 51/52/60, got %r" % oc)
		if oc in NO_DM and dm != "NNN":
			add("NAT00120", no_dm, ew_dm, "delivery_mode", i, "outcome %s requires delivery mode NNN, got %r" % (oc, dm))
		sd, ed = parse_ddmmyyyy(r["activity_start_date"]), parse_ddmmyyyy(r["activity_end_date"])
		if sd and ed and sd > ed:
			add("NAT00120", no_se, ew_se, "activity_start_date", i, "start %s after end %s" % (sd, ed))


def _date_bounds(parsed, idx, add, period_start, period_end, validation_date):
	# DOB age 10-99 at end of collection year; activity dates within sane bounds.
	if "NAT00080" in parsed:
		no_lo, ew_lo = find_rule(idx, "NAT00080", "Date of Birth", "Age < 10")
		no_hi, ew_hi = find_rule(idx, "NAT00080", "Date of Birth", "greater than 99")
		_cover("NAT00080", no_lo)
		_cover("NAT00080", no_hi)
		for i, r in enumerate(parsed["NAT00080"]):
			dob = parse_ddmmyyyy(r["date_of_birth"])
			if not dob:
				continue
			age = period_end.year - dob.year
			if age < 10:
				add("NAT00080", no_lo, ew_lo, "date_of_birth", i, "age %d < 10" % age)
			if age > 99:
				add("NAT00080", no_hi, ew_hi, "date_of_birth", i, "age %d > 99" % age)
	if "NAT00120" in parsed:
		lo = datetime.date(period_start.year - 5, period_start.month, period_start.day)
		no_s, ew_s = find_rule(idx, "NAT00120", "Activity Start Date", "Collection Period Start Date - 5")
		_cover("NAT00120", no_s)
		for i, r in enumerate(parsed["NAT00120"]):
			sd = parse_ddmmyyyy(r["activity_start_date"])
			if sd and sd < lo:
				add("NAT00120", no_s, ew_s, "activity_start_date", i, "start %s before %s" % (sd, lo))


def _coverage(rules):
	inscope = {(r["Data File"], r["E/W No."]) for r in rules if r["Data File"] in IN_SCOPE_FILES}
	enforced = {(f, n) for (f, n) in COVERED if (f, n) in inscope}
	# REF/STRUCT pseudo-rules aren't AVS numbers; count them separately.
	return {
		"in_scope_rules": len(inscope),
		"enforced_rules": len(enforced),
		"enforced_pct": round(100.0 * len(enforced) / max(1, len(inscope)), 1),
		"unenforced": sorted(inscope - enforced),
	}
