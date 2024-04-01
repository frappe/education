// Copyright (c) 2017, Frappe Technologies Pvt. Ltd. and contributors
// For license information, please see license.txt

frappe.provide("erpnext.accounts.dimensions");
frappe.ui.form.on("Fee Schedule", {
	company: function (frm) {
		erpnext.accounts.dimensions.update_dimension(frm, frm.doctype);
	},


	onload: function (frm) {
		frm.set_query("receivable_account", function (doc) {
			return {
				filters: {
					account_type: "Receivable",
					is_group: 0,
					company: doc.company,
				},
			};
		});

		frm.set_query("income_account", function (doc) {
			return {
				filters: {
					account_type: "Income Account",
					is_group: 0,
					company: doc.company,
				},
			};
		});

		frm.set_query("fee_structure", () => {
			return {
				filters: {
					docstatus: 1,
				},
			};
		})

		frm.set_query("academic_term", function (doc) {
			return {
				filters: {
					academic_year: doc.academic_year,
				},
			};
		});

		frm.set_query("student_group", "student_groups", function () {
			return {
				filters: {
					program: frm.doc.program,
					academic_term: frm.doc.academic_term,
					academic_year: frm.doc.academic_year,
					disabled: 0,
				},
			};
		});

		frappe.realtime.on("fee_schedule_progress", function (data) {
			if (data.reload && data.reload === 1) {
				frm.reload_doc();
			}
			if (data.progress) {
				let progress_bar = $(cur_frm.dashboard.progress_area.body).find(
					".progress-bar"
				);
				if (progress_bar) {
					$(progress_bar)
						.removeClass("progress-bar-danger")
						.addClass("progress-bar-success progress-bar-striped");
					$(progress_bar).css("width", data.progress + "%");
				}
			}
		});

		erpnext.accounts.dimensions.setup_dimension_filters(frm, frm.doctype);
	},

	refresh: function (frm) {
		if (
			!frm.doc.__islocal &&
			frm.doc.__onload &&
			frm.doc.__onload.dashboard_info &&
			(frm.doc.status === "Order Created" || frm.doc.status === "Invoice Created")
		) {
			var info = frm.doc.__onload.dashboard_info;
			frm.dashboard.add_indicator(
				__("Total Collected: {0}", [
					format_currency(info.total_paid, info.currency),
				]),
				"blue"
			);
			frm.dashboard.add_indicator(
				__("Total Outstanding: {0}", [
					format_currency(info.total_unpaid, info.currency),
				]),
				info.total_unpaid ? "orange" : "green"
			);
		}
		if (frm.doc.status === "In Process") {
			frm.dashboard.add_progress("Fee Creation Status", "0");
		}
		if (
			(frm.doc.docstatus === 1) ||
			frm.doc.status === "Failed"
		) {
			let button_label = "Create Sales Invoice";

			frappe.db.get_value("Education Settings", {}, "create_so", (r) => {
				// convert r.create_so to number
				if (+r.create_so) {
					button_label = "Create Sales Order";
					// set indicator in the frm
				}
				if (frm.doc.status === "Order Pending" || frm.doc.status === "Invoice Pending") {
					frm.add_custom_button(__(button_label), function () {
						frappe.call({
							method: "create_fees",
							doc: frm.doc,
							callback: function () {
								frm.refresh();
							},
						});
					});
				}
			});
		}
	},

	fee_structure: function (frm) {
		if (frm.doc.fee_structure) {
			frappe.call({
				method:
					"education.education.doctype.fee_schedule.fee_schedule.get_fee_structure",
				args: {
					target_doc: frm.doc.name,
					source_name: frm.doc.fee_structure,
				},
				callback: function (r) {
					var doc = frappe.model.sync(r.message);
					frappe.set_route("Form", doc[0].doctype, doc[0].name);
				},
			});
		}
	},
});

frappe.ui.form.on("Fee Schedule Student Group", {
	student_group: function (frm, cdt, cdn) {
		var row = locals[cdt][cdn];
		if (row.student_group && frm.doc.academic_year) {
			frappe.call({
				method:
					"education.education.doctype.fee_schedule.fee_schedule.get_total_students",
				args: {
					student_group: row.student_group,
					academic_year: frm.doc.academic_year,
					academic_term: frm.doc.academic_term,
					student_category: frm.doc.student_category,
				},
				callback: function (r) {
					if (r.message) {
						frappe.model.set_value(cdt, cdn, "total_students", r.message);
					}
				},
			});
		}
	},
});
