// Copyright (c) 2023, Frappe Technologies Pvt. Ltd. and contributors
// For license information, please see license.txt

frappe.ui.form.on('Student Group Assessment Remarks', {
	setup: function(frm) {
		frm.add_fetch("student", "student_group", "student_name");
		frm.set_query("assessment_group", function() {
			return{
				filters: {
					"is_group": 1
				}
			};
		})
	},

	"get_students": function(frm) {
		frm.set_value("students",[]);
		frappe.call({
			method: "get_students",
			doc:frm.doc,
			callback: function(r) {
				if(r.message) {
					let students = r.message
					frm.set_value("students", students);
				}
			}
		});
	},
});
