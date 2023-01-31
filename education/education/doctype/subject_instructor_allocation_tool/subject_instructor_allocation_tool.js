// Copyright (c) 2023, Frappe Technologies Pvt. Ltd. and contributors
// For license information, please see license.txt

frappe.ui.form.on('Subject Instructor Allocation Tool', {
	refresh: function(frm) {
		frm.disable_save();
		frm.page.set_primary_action(__('Assign Subjects'), () => {
			frm.call('assign_subjects')
				.then(r => {
					frm.set_value("subjects", []);
					frm.set_value("instructor", []);
				});
		});
	}
});
