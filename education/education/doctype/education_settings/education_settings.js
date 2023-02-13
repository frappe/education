// Copyright (c) 2017, Frappe Technologies Pvt. Ltd. and contributors
// For license information, please see license.txt

frappe.ui.form.on('Education Settings', {
	onload: function(frm) {
		frm.set_query("current_academic_term", (doc) => {
			return {
				filters: {
					"academic_year": doc.current_academic_year
				}
			}
		});
	}
});
