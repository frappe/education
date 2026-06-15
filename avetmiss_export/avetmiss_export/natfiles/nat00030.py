# Copyright (c) 2026, AVETMISS prototype and contributors
# For license information, please see license.txt
"""NAT00030 — Program file (national, width 130).

  1-10    Program identifier                          A
  11-110  Program name                                A
  111-114 Nominal hours                               N
  115-130 non-TGA supplement block                    blank for recognised programs
"""

from .fixed_width import a, blank, file_bytes, n, pack

WIDTH = 130


def record(prog):
	return pack(
		[
			a(prog["program_identifier"], 10),   # 1-10
			a(prog["program_name"], 100),        # 11-110
			n(prog.get("nominal_hours"), 4),     # 111-114
			blank(16),                           # 115-130
		],
		WIDTH,
	)


def generate(programs):
	return file_bytes([record(x) for x in programs])
