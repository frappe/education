# Copyright (c) 2026, AVETMISS prototype and contributors
# For license information, please see license.txt
"""NAT00010 — Training organisation file (national, record width 448).

Layout (spec 8.0):
  1-10    Training organisation identifier   A
  11-110  Training organisation name         A
  111-268 non-TGA supplement block           blank for registered RTOs
  269-328 Contact name                       blank (NCVER)
  329-348 Telephone number                   blank (NCVER)
  349-368 Facsimile number                   blank (NCVER)
  369-448 Email address                      blank (NCVER)
"""

from .fixed_width import a, blank, file_bytes, pack

WIDTH = 448


def record(org):
	return pack(
		[
			a(org["rto_identifier"], 10),  # 1-10
			a(org["rto_name"], 100),       # 11-110
			blank(338),                    # 111-448 supplement + contact, blank for NCVER
		],
		WIDTH,
	)


def generate(orgs):
	"""orgs: iterable of {rto_identifier, rto_name} -> NAT00010 file text."""
	return file_bytes([record(o) for o in orgs])
