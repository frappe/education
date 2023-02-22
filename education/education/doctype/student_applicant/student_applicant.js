// Copyright (c) 2016, Frappe Technologies Pvt. Ltd. and contributors
// For license information, please see license.txt

frappe.ui.form.on("Student Applicant", {

	refresh: function(frm) {
		frm.set_query('academic_term', function(doc, cdt, cdn) {
			return{
				filters: {
					'academic_year': frm.doc.academic_year
				}
			};
		});

		if (!frm.is_new() && frm.doc.application_status==="Applied") {
			frm.add_custom_button(__("Approve"), function() {
				frm.set_value("application_status", "Approved");
				frm.save_or_update();

			}, 'Actions');

			frm.add_custom_button(__("Reject"), function() {
				frm.set_value("application_status", "Rejected");
				frm.save_or_update();
			}, 'Actions');
		}

		if (!frm.is_new() && frm.doc.application_status === "Approved") {
			frm.add_custom_button(__("Enroll"), function() {
				frm.events.enroll(frm)
			}).addClass("btn-primary");

			frm.add_custom_button(__("Reject"), function() {
				frm.set_value("application_status", "Rejected");
				frm.save_or_update();
			}, 'Actions');
		}

		frappe.realtime.on("enroll_student_progress", function(data) {
			if(data.progress) {
				frappe.hide_msgprint(true);
				frappe.show_progress(__("Enrolling student"), data.progress[0],data.progress[1]);
			}
		});

		frappe.db.get_value("Education Settings", {name: "Education Settings"}, "user_creation_skip", (r) => {
			if (cint(r.user_creation_skip) !== 1) {
				frm.set_df_property("student_email_id", "reqd", 1);
			}
		});
	},

	enroll: function(frm) {
		frappe.model.open_mapped_doc({
			method: "education.education.api.enroll_student",
			frm: frm
		})
	}
});
