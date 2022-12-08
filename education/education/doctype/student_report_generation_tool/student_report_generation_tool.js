// Copyright (c) 2018, Frappe Technologies Pvt. Ltd. and contributors
// For license information, please see license.txt

frappe.ui.form.on('Student Report Generation Tool', {
	onload: function(frm) {
		frm.set_query("academic_term",function(){
			return{
				"filters":{
					"academic_year": frm.doc.academic_year
				}
			};
		});
		frm.set_query("assessment_group", function() {
			return{
				filters: {
					"is_group": 1
				}
			};
		});
	},

	refresh: function(frm) {
		frm.disable_save();
		frm.page.clear_indicator();
		frm.page.set_primary_action(__('Print Report Card'), () => {
			let doc = frm.doc;
			if (!doc.student || !doc.assessment_group || !doc.program || !doc.academic_year) {
				frappe.throw(__("Please fill in all the mandatory fields."))
			}
 			let url = "/api/method/education.education.doctype.student_report_generation_tool.student_report_generation_tool.preview_report_card";
			open_url_post(url, {"doc": frm.doc}, true);
		});
	},

	student: function(frm) {
		if (frm.doc.student) {
			frappe.call({
				method:"education.education.api.get_current_enrollment",
				args: {
					"student": frm.doc.student,
					"academic_year": frm.doc.academic_year
				},
				callback: function(r) {
					if(r){
						$.each(r.message, function(i, d) {
							if (frm.fields_dict.hasOwnProperty(i)) {
								frm.set_value(i, d);
							}
						});
					}
				}
			});
		}
	}
});
