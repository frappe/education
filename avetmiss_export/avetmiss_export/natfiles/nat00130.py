# Copyright (c) 2026, AVETMISS prototype and contributors
# For license information, please see license.txt
"""NAT00130 — Program completed file (national, width 72; fixture carries the STA
width with the parchment block blank).

  1-10    Training organisation identifier            A
  11-20   Program identifier                          A
  21-30   Client identifier                           A
  31-38   Date program completed (DDMMYYYY)           A
  39      Issued flag                                 A
  40-47   Parchment issue date                        const-blank (STA-only; absent for RTOs)
  48-72   Parchment number                            const-blank (STA-only; absent for RTOs)
"""

from .fixed_width import a, blank, file_bytes, pack

WIDTH = 72


def record(p):
	return pack(
		[
			a(p.get("rto_identifier"), 10),       # 1-10
			a(p.get("program_identifier"), 10),   # 11-20
			a(p.get("client_identifier"), 10),    # 21-30
			a(p.get("date_completed"), 8),        # 31-38 (DDMMYYYY, type A)
			a(p.get("issued_flag"), 1),           # 39
			blank(8),                             # 40-47 parchment issue date, const-blank
			blank(25),                            # 48-72 parchment number, const-blank
		],
		WIDTH,
	)


def generate(programs_completed):
	return file_bytes([record(x) for x in programs_completed])
