# Copyright (c) 2026, AVETMISS prototype and contributors
# For license information, please see license.txt
"""Golden-file test: NAT00020 (training organisation delivery location)."""

import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from golden import roundtrip  # noqa: E402

from avetmiss_export.natfiles import nat00020  # noqa: E402


def parse(ln):
	return {
		"rto_identifier": ln[0:10].rstrip(),
		"location_identifier": ln[10:20].rstrip(),
		"location_name": ln[20:120].rstrip(),
		"postcode": ln[120:124].rstrip(),
		"state_identifier": ln[124:126].rstrip(),
		"suburb": ln[126:176].rstrip(),
		"country_identifier": ln[176:180].rstrip(),
	}


def test_nat00020_byte_identical():
	return roundtrip("nat00020.txt", nat00020.generate, parse)


if __name__ == "__main__":
	try:
		nr, nb = test_nat00020_byte_identical()
		print("PASS nat00020 (%d records, %d bytes)" % (nr, nb))
	except AssertionError as e:
		print("FAIL nat00020\n%s" % e)
		sys.exit(1)
