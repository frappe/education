# Copyright (c) 2026, AVETMISS prototype and contributors
# For license information, please see license.txt
"""Golden-file test: NAT00085 (client contact details)."""

import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from golden import roundtrip  # noqa: E402

from avetmiss_export.natfiles import nat00085  # noqa: E402


def parse(ln):
	return {
		"client_identifier": ln[0:10].rstrip(),
		"title": ln[10:14].rstrip(),
		"first_name": ln[14:54].rstrip(),
		"family_name": ln[54:94].rstrip(),
		"addr_building": ln[94:144].rstrip(),
		"addr_flat": ln[144:174].rstrip(),
		"addr_street_no": ln[174:189].rstrip(),
		"addr_street_name": ln[189:259].rstrip(),
		"addr_postal_box": ln[259:281].rstrip(),
		"suburb": ln[281:331].rstrip(),
		"postcode": ln[331:335].rstrip(),
		"state_identifier": ln[335:337].rstrip(),
		"phone_home": ln[337:357].rstrip(),
		"phone_work": ln[357:377].rstrip(),
		"phone_mobile": ln[377:397].rstrip(),
		"email": ln[397:477].rstrip(),
		"email_alt": ln[477:557].rstrip(),
	}


def test_nat00085_byte_identical():
	return roundtrip("nat00085.txt", nat00085.generate, parse)


if __name__ == "__main__":
	try:
		nr, nb = test_nat00085_byte_identical()
		print("PASS nat00085 (%d records, %d bytes)" % (nr, nb))
	except AssertionError as e:
		print("FAIL nat00085\n%s" % e)
		sys.exit(1)
