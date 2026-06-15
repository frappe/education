# Copyright (c) 2026, AVETMISS prototype and contributors
# For license information, please see license.txt
"""NAT00085 — Client contact details file (national, width 557).

  1-10    Client identifier            A      282-331 Address - suburb/locality A
  11-14   Client title                 A      332-335 Postcode                  A
  15-54   Client first given name      A      336-337 State identifier          A
  55-94   Client family name           A      338-357 Telephone number [home]   A
  95-144  Address building/property    A      358-377 Telephone number [work]   A
  145-174 Address flat/unit details    A      378-397 Telephone number [mobile] A
  175-189 Address street number        A      398-477 Email address             A
  190-259 Address street name          A      478-557 Email address [alt]       A
  260-281 Address postal delivery box  A
"""

from .fixed_width import a, file_bytes, pack

WIDTH = 557


def record(c):
	return pack(
		[
			a(c.get("client_identifier"), 10),    # 1-10
			a(c.get("title"), 4),                 # 11-14
			a(c.get("first_name"), 40),           # 15-54
			a(c.get("family_name"), 40),          # 55-94
			a(c.get("addr_building"), 50),        # 95-144
			a(c.get("addr_flat"), 30),            # 145-174
			a(c.get("addr_street_no"), 15),       # 175-189
			a(c.get("addr_street_name"), 70),     # 190-259
			a(c.get("addr_postal_box"), 22),      # 260-281
			a(c.get("suburb"), 50),               # 282-331
			a(c.get("postcode"), 4),              # 332-335
			a(c.get("state_identifier"), 2),      # 336-337
			a(c.get("phone_home"), 20),           # 338-357
			a(c.get("phone_work"), 20),           # 358-377
			a(c.get("phone_mobile"), 20),         # 378-397
			a(c.get("email"), 80),                # 398-477
			a(c.get("email_alt"), 80),            # 478-557
		],
		WIDTH,
	)


def generate(clients):
	return file_bytes([record(x) for x in clients])
