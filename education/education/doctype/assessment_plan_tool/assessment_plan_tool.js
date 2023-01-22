// Copyright (c) 2023, Frappe Technologies Pvt. Ltd. and contributors
// For license information, please see license.txt

frappe.ui.form.on('Assessment Plan Tool', {
	onload: function(frm) {
		frm.set_query('assessment_group', function(doc, cdt, cdn) {
			return{
				filters: {
					'is_group': 0
				}
			};
		});
		frm.set_query('student_groups', function(doc, cdt, cdn) {
			return{
				filters: {
					'program': doc.student_class
				}
			};
		});
		frm.set_query('subjects', function(doc, cdt, cdn) {
			return{
				filters: {
					'program': doc.student_class
				}
			};
		});
		frm.set_query('grading_scale', function(){
			return {
				filters: {
					docstatus: 1
				}
			};
		});
	},

	"refresh": function(frm) {
		frm.disable_save();
		frm.page.set_primary_action(__('Generate Plans'), () => {
			frm.call('generate_plans')
				.then(r => {
					frm.set_value("subjects", []);
					frm.set_value("student_groups", []);
					if (!r.message) {
						frappe.throw(__('There were errors generating Assessment Plans'));
					}
					const [total, plan_errors] = r.message;
					if (plan_errors) {
						const errors_html = plan_errors.map(c => `
							<tr>
							<td>${c}</td>
							<td></td>
							</tr>
						`).join('');

						const html = `
							<table class="table table-bordered">
								<caption>${total} ${__('Total Plans were created')}</caption>
								<h5>Plan Errors</h5>
								<thead><tr><th>${__("Subject")}</th><th>${__("")}</th></tr></thead>
								<tbody>
									
									${errors_html}
								</tbody>
							</table>
						`;

						frappe.msgprint(html);
					}
				});
		});
		frm.fields_dict.generate_plans.$input.addClass(' btn btn-primary btn-lg');
		frappe.realtime.on("assessment_plan_tool", function(data) {
			frappe.hide_msgprint(true);
			frappe.show_progress(__("Generating Assessment Plans"), data.progress[0], data.progress[1]);
		});
	},

	"generate_plans": function(frm) {
		frappe.call({
			method: "generate_plans",
			doc:frm.doc,
			callback: function(r) {
				frm.set_value("subjects", []);
				frm.set_value("student_groups", []);
				frappe.hide_msgprint(true);
				if (!r.message) {
					frappe.throw(__('There were errors generating Assessment Plans'));
				}
				const [total, plan_errors] = r.message;
				if (plan_errors) {
					const errors_html = plan_errors.map(c => `
						<tr>
						<td>${c}</td>
						<td></td>
						</tr>
					`).join('');

					const html = `
						<table class="table table-bordered">
							<caption>${total} ${__('Total Plans were created')}</caption>
							<h5>Plan Errors</h5>
							<thead><tr><th>${__("Subject")}</th><th>${__("")}</th></tr></thead>
							<tbody>
								
								${errors_html}
							</tbody>
						</table>
					`;

					frappe.msgprint(html);
				}
			}
		});
	}
});
