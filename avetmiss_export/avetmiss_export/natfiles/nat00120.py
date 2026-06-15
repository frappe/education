# Copyright (c) 2026, AVETMISS prototype and contributors
# For license information, please see license.txt
"""NAT00120 — Training activity file (national, width 111). THE CONTROLLER:
one record per training-activity (Course Enrollment). Fields after position 111
are state-only and omitted for direct-to-NCVER reporting.

  1-10    Training organisation identifier            A
  11-20   Training org delivery location identifier    A
  21-30   Client identifier                           A
  31-42   Subject identifier                          A
  43-52   Program identifier                          A
  53-60   Activity start date (DDMMYYYY)              D
  61-68   Activity end date (DDMMYYYY)                D
  69-71   Delivery mode identifier                    A
  72-73   Outcome identifier - national               A
  74-75   Funding source - national                   A
  76      Commencing program identifier               A
  77-86   Training contract identifier                A
  87-96   Client identifier - apprenticeships         A
  97-98   Study reason identifier                     A
  99      VET in schools flag                         A
  100-109 Specific funding identifier                 A
  110-111 School type identifier                      A
"""

from .fixed_width import a, d, file_bytes, pack

WIDTH = 111


def record(act):
	return pack(
		[
			a(act.get("rto_identifier"), 10),            # 1-10
			a(act.get("delivery_location"), 10),         # 11-20
			a(act.get("client_identifier"), 10),         # 21-30
			a(act.get("subject_identifier"), 12),        # 31-42
			a(act.get("program_identifier"), 10),        # 43-52
			d(act.get("activity_start_date"), 8),        # 53-60
			d(act.get("activity_end_date"), 8),          # 61-68
			a(act.get("delivery_mode"), 3),              # 69-71
			a(act.get("outcome_national"), 2),           # 72-73
			a(act.get("funding_source_national"), 2),    # 74-75
			a(act.get("commencing_program"), 1),         # 76
			a(act.get("training_contract_id"), 10),      # 77-86
			a(act.get("apprentice_client_id"), 10),      # 87-96
			a(act.get("study_reason"), 2),               # 97-98
			a(act.get("vet_in_schools"), 1),             # 99
			a(act.get("specific_funding_id"), 10),       # 100-109
			a(act.get("school_type"), 2),                # 110-111
		],
		WIDTH,
	)


def generate(activities):
	return file_bytes([record(x) for x in activities])
