# Copyright (c) 2026, AVETMISS prototype and contributors
# For license information, please see license.txt
"""NAT00060 — Subject file (national, width 123).

  1-12    Subject identifier                          A
  13-112  Subject name                                A
  113-118 Subject field of education identifier        A
  119     VET flag                                    A
  120-123 Nominal hours                               N
"""

from .fixed_width import a, file_bytes, n, pack

WIDTH = 123


def record(subj):
	return pack(
		[
			a(subj["subject_identifier"], 12),        # 1-12
			a(subj["subject_name"], 100),             # 13-112
			a(subj.get("field_of_education_id"), 6),  # 113-118
			a(subj.get("vet_flag"), 1),               # 119
			n(subj.get("nominal_hours"), 4),          # 120-123
		],
		WIDTH,
	)


def generate(subjects):
	return file_bytes([record(x) for x in subjects])
