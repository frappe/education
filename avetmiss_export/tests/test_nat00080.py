# Copyright (c) 2026, AVETMISS prototype and contributors
# For license information, please see license.txt
"""Golden-file test: NAT00080 (client)."""

import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from golden import roundtrip  # noqa: E402

from avetmiss_export.natfiles import nat00080  # noqa: E402


def parse(ln):
	return {
		"client_identifier": ln[0:10].rstrip(),
		"name_for_encryption": ln[10:70].rstrip(),
		"highest_school_level": ln[70:72].rstrip(),
		"gender": ln[72:73].rstrip(),
		"date_of_birth": ln[73:81].rstrip(),
		"postcode": ln[81:85].rstrip(),
		"indigenous_status": ln[85:86].rstrip(),
		"language_id": ln[86:90].rstrip(),
		"labour_force_status": ln[90:92].rstrip(),
		"country_id": ln[92:96].rstrip(),
		"disability_flag": ln[96:97].rstrip(),
		"prior_ed_flag": ln[97:98].rstrip(),
		"at_school_flag": ln[98:99].rstrip(),
		"suburb": ln[99:149].rstrip(),
		"usi": ln[149:159].rstrip(),
		"state_identifier": ln[159:161].rstrip(),
		"addr_building": ln[161:211].rstrip(),
		"addr_flat": ln[211:241].rstrip(),
		"addr_street_no": ln[241:256].rstrip(),
		"addr_street_name": ln[256:326].rstrip(),
		"survey_contact_status": ln[326:327].rstrip(),
		# SA1 (327:338) / SA2 (338:347) are const-blank in the writer
	}


def test_nat00080_byte_identical():
	return roundtrip("nat00080.txt", nat00080.generate, parse)


if __name__ == "__main__":
	try:
		nr, nb = test_nat00080_byte_identical()
		print("PASS nat00080 (%d records, %d bytes)" % (nr, nb))
	except AssertionError as e:
		print("FAIL nat00080\n%s" % e)
		sys.exit(1)
