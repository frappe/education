# Copyright (c) 2026, AVETMISS prototype and contributors
# For license information, please see license.txt
"""Golden-file test for the NAT00010 writer: output must be byte-identical to
the NCVER sample. Parses the fixture's own field values, regenerates, compares.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(__file__))  # allow `import golden` when run directly

from golden import assert_byte_identical, read_fixture  # noqa: E402

from avetmiss_export.natfiles import nat00010  # noqa: E402


def parse_org(fixture_name="nat00010.txt"):
	line = read_fixture(fixture_name).decode("ascii").split("\r\n")[0]
	return {"rto_identifier": line[0:10].rstrip(), "rto_name": line[10:110].rstrip()}


def test_nat00010_byte_identical():
	org = parse_org()
	out = nat00010.generate([org])
	n = assert_byte_identical(out, "nat00010.txt")
	return org, n


if __name__ == "__main__":
	try:
		org, n = test_nat00010_byte_identical()
		print("PASS test_nat00010_byte_identical (%d bytes)" % n)
		print("  RTO id=%r name=%r" % (org["rto_identifier"], org["rto_name"]))
	except AssertionError as e:
		print("FAIL test_nat00010_byte_identical\n%s" % e)
		sys.exit(1)
