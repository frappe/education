# Copyright (c) 2026, AVETMISS prototype and contributors
# For license information, please see license.txt
"""NAT00090 — Disability file (national, width 12).

  1-10  Client identifier            A
  11-12 Disability type identifier   A

Emitted only for clients with disability flag = Y (one record per disability type).
"""

from .fixed_width import a, file_bytes, pack

WIDTH = 12


def record(row):
	return pack(
		[
			a(row.get("client_identifier"), 10),   # 1-10
			a(row.get("disability_type"), 2),      # 11-12
		],
		WIDTH,
	)


def generate(rows):
	return file_bytes([record(x) for x in rows])
