// Copyright (c) 2016, Frappe and contributors
// For license information, please see license.txt

frappe.ui.form.on("Class Enrollment Tool", {
	setup: function(frm) {
		frm.add_fetch("student", "student_name", "student_name");
		frm.add_fetch("student_applicant", "title", "student_name");
		if(frm.doc.__onload && frm.doc.__onload.academic_term_reqd) {
			frm.toggle_reqd("academic_term", true);
		}
		frm.call('get_current_academic_info')
		.then(r => {
			if (r.message) {
				let academic_info = r.message;
				frm.set_value({
					'academic_term': academic_info.year,
					'academic_year': academic_info.term
				})
			}
		})
	},

	"refresh": function(frm) {
		frm.disable_save();
		frm.fields_dict.enroll_students.$input.addClass(' btn btn-primary');
		frappe.realtime.on("class_enrollment_tool", function(data) {
			frappe.hide_msgprint(true);
			frappe.show_progress(__("Enrolling students"), data.progress[0], data.progress[1]);
		});
	},

	get_students_from: function(frm) {
		if (frm.doc.get_students_from == "Student Applicant") {
			frm.dashboard.add_comment(__('Only the Student Applicant with the status "Approved" will be selected in the table below.'));
		}
	},

	"get_students": function(frm) {
		frm.set_value("students",[]);
		frappe.call({
			method: "get_students",
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
