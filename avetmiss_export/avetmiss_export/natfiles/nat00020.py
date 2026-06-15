# Copyright (c) 2026, AVETMISS prototype and contributors
# For license information, please see license.txt
"""NAT00020 — Training organisation delivery location file (national, width 180).

  1-10    Training organisation identifier            A
  11-20   Delivery location identifier                A
  21-120  Delivery location name                      A
  121-124 Postcode                                    A
  125-126 State identifier                            A
  127-176 Address - suburb, locality or town          A
  177-180 Country identifier                          A
"""

from .fixed_width import a, file_bytes, pack

WIDTH = 180


def record(loc):
	return pack(
		[
			a(loc["rto_identifier"], 10),        # 1-10
			a(loc["location_identifier"], 10),   # 11-20
			a(loc["location_name"], 100),        # 21-120
			a(loc["postcode"], 4),               # 121-124
			a(loc["state_identifier"], 2),       # 125-126
			a(loc["suburb"], 50),                # 127-176
			a(loc["country_identifier"], 4),     # 177-180
		],
		WIDTH,
	)


def generate(locations):
	return file_bytes([record(x) for x in locations])
