# Copyright (c) 2026, AVETMISS prototype and contributors
# For license information, please see license.txt
"""Golden-file test: NAT00060 (subject)."""

import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from golden import roundtrip  # noqa: E402

from avetmiss_export.natfiles import nat00060  # noqa: E402


def parse(ln):
	return {
		"subject_identifier": ln[0:12].rstrip(),
		"subject_name": ln[12:112].rstrip(),
		"field_of_education_id": ln[112:118].rstrip(),
		"vet_flag": ln[118:119].rstrip(),
		"nominal_hours": ln[119:123].strip(),
	}


def test_nat00060_byte_identical():
	return roundtrip("nat00060.txt", nat00060.generate, parse)


if __name__ == "__main__":
	try:
		nr, nb = test_nat00060_byte_identical()
		print("PASS nat00060 (%d records, %d bytes)" % (nr, nb))
	except AssertionError as e:
		print("FAIL nat00060\n%s" % e)
		sys.exit(1)
