// Copyright (c) 2017, Frappe Technologies Pvt. Ltd. and contributors
// For license information, please see license.txt

frappe.provide("erpnext.accounts.dimensions");

frappe.ui.form.on('Fee Structure', {

	company: function(frm) {
		erpnext.accounts.dimensions.update_dimension(frm, frm.doctype);
	},

	onload: function(frm) {
		frm.set_query('academic_term', function() {
			return {
				'filters': {
					'academic_year': frm.doc.academic_year
				}
			};
		});

		frm.set_query('receivable_account', function(doc) {
			return {
				filters: {
					'account_type': 'Receivable',
					'is_group': 0,
					'company': doc.company
				}
			};
		});
		frm.set_query('income_account', function(doc) {
			return {
				filters: {
					'account_type': 'Income Account',
					'is_group': 0,
					'company': doc.company
				}
			};
		});

		erpnext.accounts.dimensions.setup_dimension_filters(frm, frm.doctype);
	},

	refresh: function(frm) {
		if (frm.doc.docstatus === 1) {
			frm.add_custom_button(__('Create Fee Schedule'), function() {
				frm.doc.academic_term
					? frm.events.make_term_wise_fee_schedule(frm)
					: frm.events.open_fee_schedule_modal(frm);
			});
		}
	},

	make_term_wise_fee_schedule: function(frm) {
		frappe.model.open_mapped_doc({
			method: 'education.education.doctype.fee_structure.fee_structure.make_term_wise_fee_schedule',
			frm: frm
		});
	},


	make_fee_schedule: function(frm) {
		let {distribution} = frm.dialog.get_values();
		let total_amount_from_dialog = distribution.reduce((accumulated_value,current_value) => accumulated_value + current_value.amount,0)
		if(!(frm.doc.total_amount === total_amount_from_dialog)) {
			frappe.throw(__("Total amount in the table should be equal to the total amount from fee structure"))
			return;
		}
		frappe.call({
			method: 'education.education.doctype.fee_structure.fee_structure.make_fee_schedule',
			args: {
				"source_name":frm.doc.name,
				"dialog_values": frm.dialog.get_values(),
				"per_component_amount":frm. per_component_amount
			},
			freeze: true,
			callback: function(r) {
				if (r.message) {
					frappe.msgprint(__("{0} Fee Schedule(s) Create", [r.message]));
					frm.dialog.hide();
				}
			}
		})
	},
	get_amount_distribution_based_on_fee_plan:function(frm) {
		let dialog = frm.dialog
		let fee_plan = dialog.get_value('fee_plan');

		// remove existing data in table when fee plan is changed
		dialog.fields_dict.distribution.df.data = [];
		dialog.refresh();

		frappe.call({
			method: 'education.education.doctype.fee_structure.fee_structure.get_amount_distribution_based_on_fee_plan',
			args: {
				"fee_plan": fee_plan,
				"total_amount": frm.doc.total_amount,
				"components": frm.doc.components,
				"academic_year": frm.doc.academic_year,
			},
			callback: function(r) {
				if (!r.message) return;

				let dialog_grid = dialog.fields_dict.distribution.grid;
				let distribution = r.message.distribution;
				frm.per_component_amount = r.message.per_component_amount

				fee_plan === "Term-Wise"
					? dialog_grid.docfields[0].hidden = false
					: dialog_grid.docfields[0].hidden = true;

				distribution.forEach((month,idx) => {
					dialog_grid.reset_grid();
					dialog.fields_dict['distribution'].grid.add_new_row();
					dialog.get_value("distribution")[idx] = {
						term: month.term,
						due_date: month.due_date,
						amount: month.amount
					};
				})
				dialog.refresh();

			}
		});
	},

	open_fee_schedule_modal: function(frm) {

		let distribution_table_fields = [
				{
				"fieldname": "term",
				"fieldtype": "Link",
				"in_list_view": 1,
				"label": "Term",
				"read_only": 1,
				'hidden':1,
			   },
			   {
				"fieldname": "due_date",
				"fieldtype": "Date",
				"in_list_view": 1,
				"label": "Due Date"
			   },
			   {
				"fieldname": "amount",
				"fieldtype": "Float",
				"in_list_view": 1,
				"label": "Amount"
			   }
		]

		let dialog_fields = [
			{
				label:"Select Fee Plan",
				fieldname:"fee_plan",
				fieldtype:"Select",
				reqd: 1,
				options:["Monthly","Quarterly","Semi-Annually","Annually","Term-Wise"],
				change: () => frm.events.get_amount_distribution_based_on_fee_plan(frm)
			},
			{
				fieldname: "distribution",
				label: "Distribution",
				fieldtype: "Table",
				in_place_edit: false,
				data: [],
				cannot_add_rows: true,
				reqd: 1,
				fields: distribution_table_fields,
				// not selectable and do not show edit icon
			},
			{
				label:"Select Student Groups",
				fieldname:"student_groups",
				fieldtype:"Table",
				in_place_edit: false,
				reqd: 1,
				data: [],
				fields: [
					{
						"fieldname": "student_group",
						"fieldtype": "Link",
						"in_list_view": 1,
						"label": "Student Group",
						"options": "Student Group",
						get_query: () => {
							return {
								filters: {
									program: frm.doc.program,
									academic_year: frm.doc.academic_year,
									academic_term: frm.doc.academic_term,
									student_category: frm.doc.student_category
								}
							}
						}
					},
				],
			}
		]

		frm.per_component_amount = [];

		frm.dialog = new frappe.ui.Dialog({
			title: "Create Fee Schedule",
			fields: dialog_fields,
			primary_action: function() {
				// validate whether total amount from dialog is equal to total amount from fee structure
				frm.events.make_fee_schedule(frm);
			},
			primary_action_label: __("Create"),
		})
		frm.dialog.show();
	}
});

frappe.ui.form.on('Fee Component', {
	amount: function(frm,cdt,cdn) {
		let d = locals[cdt][cdn];
		d.total = d.amount;
		refresh_field('components');
		if (d.discount) {
			d.total = d.amount - (d.amount * (d.discount / 100) );
			refresh_field('components');
		}

	},
	discount: function(frm,cdt,cdn) {
		let d = locals[cdt][cdn];
		if (d.discount < 100) {
			d.total = d.amount - (d.amount * (d.discount / 100) );
		}
		refresh_field('components');
	},

});
