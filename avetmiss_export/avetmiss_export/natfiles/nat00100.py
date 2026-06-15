# Copyright (c) 2026, AVETMISS prototype and contributors
# For license information, please see license.txt
"""NAT00100 — Prior educational achievement file (national, width 13).

  1-10  Client identifier                          A
  11-13 Prior educational achievement identifier   A

Emitted only for clients with prior-ed flag = Y (one record per achievement).
"""

from .fixed_width import a, file_bytes, pack

WIDTH = 13


def record(row):
	return pack(
		[
			a(row.get("client_identifier"), 10),   # 1-10
			a(row.get("achievement_id"), 3),       # 11-13
		],
		WIDTH,
	)


def generate(rows):
	return file_bytes([record(x) for x in rows])
