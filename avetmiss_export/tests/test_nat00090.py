# Copyright (c) 2026, AVETMISS prototype and contributors
# For license information, please see license.txt
"""Golden-file test: NAT00090 (disability)."""

import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from golden import roundtrip  # noqa: E402

from avetmiss_export.natfiles import nat00090  # noqa: E402


def parse(ln):
	return {"client_identifier": ln[0:10].rstrip(), "disability_type": ln[10:12].rstrip()}


def test_nat00090_byte_identical():
	return roundtrip("nat00090.txt", nat00090.generate, parse)


if __name__ == "__main__":
	try:
		nr, nb = test_nat00090_byte_identical()
		print("PASS nat00090 (%d records, %d bytes)" % (nr, nb))
	except AssertionError as e:
		print("FAIL nat00090\n%s" % e)
		sys.exit(1)
