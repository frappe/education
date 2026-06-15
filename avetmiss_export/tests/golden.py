# Copyright (c) 2026, AVETMISS prototype and contributors
# For license information, please see license.txt
"""Helpers for golden-file (byte-diff) tests against the NCVER sample NAT files.

Fixtures are the authority: one character off is a failure (fixed-width).
"""

import os

FIXTURES = os.environ.get("AVETMISS_FIXTURES", "/home/brandon/education/tests/fixtures")


def read_fixture(name):
	with open(os.path.join(FIXTURES, name), "rb") as fh:
		return fh.read()


def fixture_lines(name):
	"""Fixture split into records (CRLF-stripped), trailing empty dropped."""
	text = read_fixture(name).decode("ascii")
	return [ln for ln in text.split("\r\n")][:-1] if text.endswith("\r\n") else text.split("\r\n")


def first_diff(got, exp):
	"""Human-readable first byte difference between two bytes objects."""
	if got == exp:
		return "identical"
	for i in range(min(len(got), len(exp))):
		if got[i] != exp[i]:
			lo = max(0, i - 8)
			return (
				"first diff at byte %d (record col ~%d):\n"
				"  got: ...%r...\n  exp: ...%r..."
				% (i, i + 1, got[lo : i + 12], exp[lo : i + 12])
			)
	return "one is a prefix of the other: got len=%d exp len=%d" % (len(got), len(exp))


def assert_byte_identical(got_text, fixture_name):
	exp = read_fixture(fixture_name)
	got = got_text.encode("ascii")
	assert got == exp, first_diff(got, exp)
	return len(got)


def roundtrip(fixture_name, generate_fn, parse_fn):
	"""Parse every fixture record into field values, regenerate, byte-compare.

	Returns (n_records, n_bytes). Proves the writer reproduces the NCVER bytes
	for the sample's own data.
	"""
	lines = fixture_lines(fixture_name)
	records = [parse_fn(ln) for ln in lines]
	nbytes = assert_byte_identical(generate_fn(records), fixture_name)
	return len(records), nbytes
