import frappe

print("installed apps:", frappe.get_installed_apps())

print("\n-- new doctypes --")
for dt in ["AVETMISS Settings", "Training Delivery Location",
		   "Student Disability", "Student Prior Achievement"]:
	print("  %-28s exists=%s" % (dt, bool(frappe.db.exists("DocType", dt))))

print("\n-- custom fields landed (via live get_meta) --")
EXPECT = {"Student": 23, "Program": 2, "Course": 4,
		  "Course Enrollment": 15, "Program Enrollment": 2}
total = 0
for dt, exp in EXPECT.items():
	meta = frappe.get_meta(dt)
	cfs = [f.fieldname for f in meta.fields if f.fieldname.startswith("avetmiss_")
		   or f.fieldname in ("disabilities", "prior_achievements")]
	total += len(cfs)
	flag = "OK" if len(cfs) == exp else "DIFF"
	print("  %-20s %2d (expected %2d) %s" % (dt, len(cfs), exp, flag))
print("  TOTAL custom fields: %d" % total)

print("\n-- spot-check lengths + child links --")
for dt, fn in [("Student", "avetmiss_client_identifier"), ("Student", "avetmiss_usi"),
			   ("Course", "avetmiss_subject_identifier"),
			   ("Course Enrollment", "avetmiss_outcome_national")]:
	f = frappe.get_meta(dt).get_field(fn)
	print("  %s.%s  type=%s length=%s" % (dt, fn, f.fieldtype, f.length))
for fn in ("disabilities", "prior_achievements"):
	f = frappe.get_meta("Student").get_field(fn)
	print("  Student.%s -> %s (%s)" % (fn, f.options, f.fieldtype))
ce = frappe.get_meta("Course Enrollment").get_field("avetmiss_delivery_location")
print("  Course Enrollment.avetmiss_delivery_location -> %s (%s)" % (ce.options, ce.fieldtype))
