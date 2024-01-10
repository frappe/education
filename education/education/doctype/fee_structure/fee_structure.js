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
				frm.events.open_fee_schedule_modal(frm);
				// frm.events.make_fee_schedule(frm);
			});
		}
	},

	make_fee_schedule: function(frm) {
		frappe.model.open_mapped_doc({
			method: 'education.education.doctype.fee_structure.fee_structure.make_fee_schedule',
			frm: frm
		});
	},

	open_fee_schedule_modal: async function(frm) {

		let academic_year_start_date
		let academic_year_end_date

		let table_fields = [
			{
				"fieldname": "month",
				"fieldtype": "Data",
				"in_list_view": 1,
				"label": "Month",
				"read_only": 1
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

		await frappe.db.get_value(
			'Academic Year',
			frm.doc.academic_year,
			['year_start_date','year_end_date'],
			(r) => {
				academic_year_start_date = r.year_start_date
				academic_year_end_date = r.year_end_date
			}
		)

		let dialog = new frappe.ui.Dialog({
			title: "Create Fee Schedule",
			fields:[
				{
					label:"Select Fee Plan",
					fieldname:"fee_plan",
					fieldtype:"Select",
					options:["Monthly","Quarterly","Semi-Annually","Annually"],
					change: () => {
						dialog.fields_dict.distribution.df.data = [];
						dialog.refresh();
						let fee_plan = dialog.get_value('fee_plan');
						frappe.call({
							method: 'education.education.doctype.fee_structure.fee_structure.get_distribution_based_on_fee_plan',
							args: {
								"fee_plan": fee_plan,
								"total_amount": frm.doc.total_amount,
							},
							callback: function(r) {
								// remove data from table
								if (r.message) {
									let distributions = r.message;
									distributions.forEach((month,idx) => {
										console.log("here")
										dialog.fields_dict['distribution'].grid.add_new_row();
										dialog.get_value("distribution")[idx] = {
											month: month.month,
											due_date: month.due_date,
											amount: month.amount
										};
									})
									dialog.refresh()
								}
							}
						});
					}
				},
				{
					fieldname: "distribution",
					label: "Distribution",
					fieldtype: "Table",
					in_place_edit: false,
					data: [],
					cannot_add_rows: true,
					fields: table_fields,
					cannot_delete_rows: true,
					// not selectable and not editable

				}
			],
			primary_action: function() {
				console.log("clicked")
			},
			primary_action_label: __("Create"),
		})
		console.log("here")
		dialog.show();
	}
});

frappe.ui.form.on('Fee Component', {
	price: function(frm,cdt,cdn) {
		let d = locals[cdt][cdn];
		if (!d.discount) return;
		d.amount = d.price - (d.price * (d.discount / 100) );
		refresh_field('components');
	},
	discount: function(frm,cdt,cdn) {
		let d = locals[cdt][cdn];
		if (d.discount < 100) {
			d.amount = d.price - (d.price * (d.discount / 100) );
		}
		refresh_field('components');
	},




	// total: function(frm,cdt,cdn) {
	// 	let total_amount = 0;
	// 	for (let i=0;i<frm.doc.components.length;i++) {
	// 		total_amount += frm.doc.components[i].total;
	// 	}
	// 	frm.set_value('total_amount', total_amount);
	// }
});
