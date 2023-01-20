// Copyright (c) 2023, Frappe Technologies Pvt. Ltd. and contributors
// For license information, please see license.txt

frappe.ui.form.on('Class Assessment Group Result', {
	setup: function(frm) {
		frm.add_fetch("student", "student_group", "student_name");
		frm.call('get_current_academic_info')
		.then(r => {
			if (r.message) {
				let academic_info = r.message;
				frm.set_value({
					'academic_year': academic_info.term
				})
			}
		})
	},
	onload: function(frm) {
		frm.set_query('assessment_group', function(doc, cdt, cdn) {
			return{
				filters: {
					'is_group': 1
				}
			};
		});
	},

	"calculate_marks": function(frm) {
		frm.set_value("students",[]);
		frappe.call({
			method: "calculate_marks",
			doc:frm.doc,
			callback: function(r) {
				if(r.message) {
					let [students, subjects] = r.message
					frm.set_value("students", students);
					frm.set_value("subjects", subjects);
				}
			}
		});
	},
});
