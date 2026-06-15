# Copyright (c) 2026, AVETMISS prototype and contributors
# For license information, please see license.txt
"""Golden-file test: NAT00030 (program)."""

import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from golden import roundtrip  # noqa: E402

from avetmiss_export.natfiles import nat00030  # noqa: E402


def parse(ln):
	return {
		"program_identifier": ln[0:10].rstrip(),
		"program_name": ln[10:110].rstrip(),
		"nominal_hours": ln[110:114].strip(),
	}


def test_nat00030_byte_identical():
	return roundtrip("nat00030.txt", nat00030.generate, parse)


if __name__ == "__main__":
	try:
		nr, nb = test_nat00030_byte_identical()
		print("PASS nat00030 (%d records, %d bytes)" % (nr, nb))
	except AssertionError as e:
		print("FAIL nat00030\n%s" % e)
		sys.exit(1)
