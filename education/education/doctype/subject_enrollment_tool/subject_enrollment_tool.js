// Copyright (c) 2023, Frappe Technologies Pvt. Ltd. and contributors
// For license information, please see license.txt


frappe.ui.form.on('Subject Enrollment Tool', {
	setup: function(frm) {
		frm.add_fetch("student", "title", "student_name");
	},

	"refresh": function(frm) {
		frm.disable_save();
		frm.fields_dict.enroll_students.$input.addClass(' btn btn-primary');
		frappe.realtime.on("subject_enrollment_tool", function(data) {
			frappe.hide_msgprint(true);
			frappe.show_progress(__("Enrolling students"), data.progress[0], data.progress[1]);
		});
	},

	"get_enrollments": function(frm) {
		frm.set_value("students",[]);
		frappe.call({
			method: "get_enrollments",
			doc:frm.doc,
			callback: function(r) {
				if(r.message) {
					frm.set_value("students", r.message);
				}
			}
		});
	},

	"enroll_students": function(frm) {
		frappe.call({
			method: "enroll_students",
			doc:frm.doc,
			callback: function(r) {
				frm.set_value("students", []);
				frappe.hide_msgprint(true);
			}
		});
	}
});
