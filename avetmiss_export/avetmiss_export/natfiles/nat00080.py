# Copyright (c) 2026, AVETMISS prototype and contributors
# For license information, please see license.txt
"""NAT00080 — Client file (national, width 347; fixture carries the STA width
with SA1/SA2 blank).

  1-10    Client identifier                           A
  11-70   Name for encryption                         A
  71-72   Highest school level completed identifier   A
  73      Gender                                      A
  74-81   Date of birth (DDMMYYYY)                    A
  82-85   Postcode                                    A
  86      Indigenous status identifier                A
  87-90   Language identifier                         A
  91-92   Labour force status identifier              A
  93-96   Country identifier                          A
  97      Disability flag                             A
  98      Prior educational achievement flag          A
  99      At school flag                              A
  100-149 Address - suburb, locality or town          A
  150-159 Unique student identifier                   A
  160-161 State identifier                            A
  162-211 Address building/property name              A
  212-241 Address flat/unit details                   A
  242-256 Address street number                       A
  257-326 Address street name                         A
  327     Survey contact status                       A
  328-338 Statistical area level 1 identifier         const-blank (STA-only; absent for RTOs)
  339-347 Statistical area level 2 identifier         const-blank (STA-only; absent for RTOs)
"""

from .fixed_width import a, blank, file_bytes, pack

WIDTH = 347


def record(c):
	return pack(
		[
			a(c.get("client_identifier"), 10),      # 1-10
			a(c.get("name_for_encryption"), 60),    # 11-70
			a(c.get("highest_school_level"), 2),    # 71-72
			a(c.get("gender"), 1),                  # 73
			a(c.get("date_of_birth"), 8),           # 74-81 (DDMMYYYY)
			a(c.get("postcode"), 4),                # 82-85
			a(c.get("indigenous_status"), 1),       # 86
			a(c.get("language_id"), 4),             # 87-90
			a(c.get("labour_force_status"), 2),     # 91-92
			a(c.get("country_id"), 4),              # 93-96
			a(c.get("disability_flag"), 1),         # 97
			a(c.get("prior_ed_flag"), 1),           # 98
			a(c.get("at_school_flag"), 1),          # 99
			a(c.get("suburb"), 50),                 # 100-149
			a(c.get("usi"), 10),                    # 150-159
			a(c.get("state_identifier"), 2),        # 160-161
			a(c.get("addr_building"), 50),          # 162-211
			a(c.get("addr_flat"), 30),              # 212-241
			a(c.get("addr_street_no"), 15),         # 242-256
			a(c.get("addr_street_name"), 70),       # 257-326
			a(c.get("survey_contact_status"), 1),   # 327
			blank(11),                              # 328-338 SA1, const-blank for RTOs
			blank(9),                               # 339-347 SA2, const-blank for RTOs
		],
		WIDTH,
	)


def generate(clients):
	return file_bytes([record(x) for x in clients])
