# Copyright (c) 2026, AVETMISS prototype and contributors
# For license information, please see license.txt
"""Golden-file test: NAT00130 (program completed)."""

import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from golden import roundtrip  # noqa: E402

from avetmiss_export.natfiles import nat00130  # noqa: E402


def parse(ln):
	return {
		"rto_identifier": ln[0:10].rstrip(),
		"program_identifier": ln[10:20].rstrip(),
		"client_identifier": ln[20:30].rstrip(),
		"date_completed": ln[30:38].rstrip(),
		"issued_flag": ln[38:39].rstrip(),
		# parchment issue date (39:47) / number (47:72) are const-blank in the writer
	}


def test_nat00130_byte_identical():
	return roundtrip("nat00130.txt", nat00130.generate, parse)


if __name__ == "__main__":
	try:
		nr, nb = test_nat00130_byte_identical()
		print("PASS nat00130 (%d records, %d bytes)" % (nr, nb))
	except AssertionError as e:
		print("FAIL nat00130\n%s" % e)
		sys.exit(1)
