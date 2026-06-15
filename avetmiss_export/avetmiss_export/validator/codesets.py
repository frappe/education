# Copyright (c) 2026, AVETMISS prototype and contributors
# For license information, please see license.txt
"""Valid-value code sets, traced to the Data Element Definitions (Edition 2.x)
in /reference. Line references are to that document. Not from memory — every set
below was confirmed against the definitions doc / AVS rules.

Where AVETMISS permits a "not specified" sentinel (@, @@, @@@@) it is included.
Range-based fields (postcode, language ASCL, country SACC) are validated by
predicate, not by an enumerated set.
"""

# Single-field enumerated value sets ---------------------------------------
GENDER = {"M", "F", "X", "@"}                                  # DED Sex/Gender
HIGHEST_SCHOOL = {"02", "08", "09", "10", "11", "12", "@@"}    # Highest school level completed
INDIGENOUS = {"1", "2", "3", "4", "@"}                         # Indigenous status
LABOUR_FORCE = {"01", "02", "03", "04", "05", "06", "07", "08", "@@"}
DISABILITY_FLAG = {"Y", "N", "@"}
PRIOR_ED_FLAG = {"Y", "N", "@"}
AT_SCHOOL_FLAG = {"Y", "N", "@"}
STATE = {"01", "02", "03", "04", "05", "06", "07", "08", "09", "99"}
SURVEY_CONTACT = {"A", "M", "O"}
DISABILITY_TYPE = {"11", "12", "13", "14", "15", "16", "17", "18", "19", "99"}
PRIOR_ACHIEVEMENT = {"008", "410", "420", "511", "514", "521", "524", "990"}
OUTCOME_NATIONAL = {"20", "30", "40", "41", "51", "52", "60", "61", "70", "81", "82", "85"}
FUNDING_NATIONAL = {"11", "13", "15", "20", "30", "31", "32", "80"}
COMMENCING_PROGRAM = {"3", "4", "8"}
STUDY_REASON = {"01", "02", "03", "04", "05", "06", "07", "08", "11", "12", "13"}
VET_IN_SCHOOLS = {"Y", "N"}
VET_FLAG = {"Y", "N"}
ISSUED_FLAG = {"Y", "N"}

# USI exemption codes (used in place of a real 10-char USI). Checksum format of a
# real USI is NOT verified here (needs the USI algorithm) — logged as unenforced.
USI_EXEMPTIONS = {"INDIV", "INTOFF", "SHORT", "NOUSI", "INDIG"}

# Sentinels that mean "not collected / overseas" for range fields.
NOT_SPECIFIED = {"@@@@", "@@@", "@@", "@"}
OVERSEAS_POSTCODE = "OSPC"


def is_blank(v):
	return v is None or str(v).strip() == ""


def is_4digit_range(v, lo=1, hi=9999):
	"""SACC country / ASCL language / postcode style: 4 digits in [lo,hi]."""
	s = str(v)
	return len(s) == 4 and s.isdigit() and lo <= int(s) <= hi


def valid_postcode(v):
	# 0001-9999, or @@@@ (not stated), or OSPC (overseas)
	return v == OVERSEAS_POSTCODE or v == "@@@@" or is_4digit_range(v, 1, 9999)


def valid_country(v):
	# 4-digit SACC, or @@@@
	return v == "@@@@" or is_4digit_range(v, 0, 9999)


def valid_language(v):
	# 4-digit ASCL, or @@@@
	return v == "@@@@" or is_4digit_range(v, 0, 9999)


def valid_delivery_mode(v):
	# 3-char composite, each char Y or N (e.g. YNY, NNN)
	return len(str(v)) == 3 and all(c in ("Y", "N") for c in str(v))


def valid_usi(v):
	s = str(v).strip()
	if s in USI_EXEMPTIONS:
		return True
	# A real USI is 10 chars alphanumeric (checksum not verified here).
	return len(s) == 10 and s.isalnum()
