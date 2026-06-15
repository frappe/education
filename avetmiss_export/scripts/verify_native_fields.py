import frappe

# Stock fields the ledger marks `native` (or maps from a stock field). Verify each exists
# against live get_meta, not from memory. A wrong `native` fails silently at generation.
CLAIMS = {
	"Student": ["first_name", "last_name", "date_of_birth", "gender", "salutation",
				"pincode", "city", "state", "student_mobile_number", "student_email_id"],
	"Program": ["program_name"],
	"Course": ["course_name"],
	"Course Enrollment": ["student", "course", "program_enrollment", "program", "enrollment_date"],
	"Program Enrollment": ["student", "program"],
}


def closest(name, pool):
	n = name.lower()
	return [f for f in pool if n in f.lower() or f.lower() in n]


misses = 0
print("=" * 72)
for dt, claimed in CLAIMS.items():
	print("\n### %s" % dt)
	if not frappe.db.exists("DocType", dt):
		near = frappe.get_all("DocType",
			filters={"name": ["like", "%%%s%%" % dt.split()[0]]}, pluck="name")
		print("  !! DOCTYPE NOT FOUND -- similar names: %s" % near)
		misses += 1
		continue
	fields = sorted(f.fieldname for f in frappe.get_meta(dt).fields if f.fieldname)
	for c in claimed:
		if c in fields:
			print("  OK   %s" % c)
		else:
			misses += 1
			print("  MISS %s   -> closest: %s" % (c, closest(c, fields) or "none"))
	if dt == "Student":
		addr = [f for f in fields if any(t in f for t in
				("address", "street", "city", "pin", "post", "suburb", "state"))]
		print("  -- address-ish fields: %s" % addr)
	print("  -- ALL (%d): %s" % (len(fields), fields))
print("\n" + "=" * 72)
print("RESULT: %d claim(s) failed to resolve." % misses)
print("Any MISS = that ledger row is NOT native. Reclassify before writer code.")
