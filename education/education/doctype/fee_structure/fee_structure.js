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
				frm.events.make_fee_schedule(frm);
			});
		}
	},

	make_fee_schedule: function(frm) {
		frappe.model.open_mapped_doc({
			method: 'education.education.doctype.fee_structure.fee_structure.make_fee_schedule',
			frm: frm
		});
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
