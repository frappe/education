# Copyright (c) 2026, AVETMISS prototype and contributors
# For license information, please see license.txt
"""Golden-file test: NAT00100 (prior educational achievement)."""

import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from golden import roundtrip  # noqa: E402

from avetmiss_export.natfiles import nat00100  # noqa: E402


def parse(ln):
	return {"client_identifier": ln[0:10].rstrip(), "achievement_id": ln[10:13].rstrip()}


def test_nat00100_byte_identical():
	return roundtrip("nat00100.txt", nat00100.generate, parse)


if __name__ == "__main__":
	try:
		nr, nb = test_nat00100_byte_identical()
		print("PASS nat00100 (%d records, %d bytes)" % (nr, nb))
	except AssertionError as e:
		print("FAIL nat00100\n%s" % e)
		sys.exit(1)
