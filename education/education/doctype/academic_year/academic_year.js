frappe.ui.form.on('Academic Year', {
	refresh: function(frm) {
		// Add indicator based on status field
		if (frm.doc.status === 'Active') {
			frm.page.set_indicator(__("Active"), "green");
		} else {
			frm.page.set_indicator(__("Inactive"), "grey");
		}

		// 🔒 Show warning if lock_status is "Locked"
		if (frm.doc.lock_status === 'Locked') {
			frm.dashboard.add_comment(
				__('🔒 This Academic Year is locked and cannot be modified. Change Lock Status to "Unlocked" to edit.'),
				'red',
				true
			);
			
			// Disable all fields except lock_status
			if (!frm.is_new()) {
				frm.fields.forEach(function(field) {
					if (field.df.fieldname !== 'lock_status') {
						frm.set_df_property(field.df.fieldname, 'read_only', 1);
					}
				});
			}
		} else {
			// 🔓 When unlocked, make all fields editable
			if (!frm.is_new()) {
				frm.fields.forEach(function(field) {
					// Reset read_only to default state (0 unless specified in DocType)
					const original_read_only = frappe.meta.get_docfield(frm.doctype, field.df.fieldname, frm.doc.name)?.read_only || 0;
					frm.set_df_property(field.df.fieldname, 'read_only', original_read_only);
				});
			}
		}

		// Add custom button to manually trigger rollover operations
		if (frm.doc.status === 'Active' && !frm.is_new()) {
			frm.add_custom_button(__('Execute Roll-over Operations'), function() {
				frappe.confirm(
					__('This will execute student promotion and fee structure rollover. Continue?'),
					function() {
						frappe.call({
							method: 'rollover_students_and_fees',
							doc: frm.doc,
							callback: function(r) {
								frappe.msgprint(__('Roll-over operations have been initiated'));
								frm.reload_doc();
							}
						});
					}
				);
			});
		}
	},

	lock_status: function(frm) {
		// Refresh form when lock status changes to update field permissions
		if (!frm.is_new()) {
			// Clear dashboard comments
			frm.dashboard.clear_comment();
			
			if (frm.doc.lock_status === 'Locked') {
				// Lock all fields except lock_status
				frm.fields.forEach(function(field) {
					if (field.df.fieldname !== 'lock_status') {
						frm.set_df_property(field.df.fieldname, 'read_only', 1);
					}
				});
				
				// Show locked message
				frm.dashboard.add_comment(
					__('🔒 This Academic Year is locked and cannot be modified. Change Lock Status to "Unlocked" to edit.'),
					'red',
					true
				);
				
				frappe.msgprint({
					title: __('Year Locked'),
					message: __('This academic year is now locked. No fields can be edited except Lock Status.'),
					indicator: 'orange'
				});
			} else {
				// Unlock all fields - restore to original state
				frm.fields.forEach(function(field) {
					const original_read_only = frappe.meta.get_docfield(frm.doctype, field.df.fieldname, frm.doc.name)?.read_only || 0;
					frm.set_df_property(field.df.fieldname, 'read_only', original_read_only);
				});
				
				frappe.msgprint({
					title: __('Year Unlocked'),
					message: __('This academic year is now unlocked and can be edited.'),
					indicator: 'green'
				});
			}
		}
	},

	status: function(frm) {
		// Show confirmation when activating a year
		if (frm.doc.status === 'Active' && !frm.is_new()) {
			frappe.confirm(
				__('Activating this Academic Year will:') + '<br><br>' +
				'<ul>' +
				'<li>' + __('Deactivate all other Academic Years') + '</li>' +
				'<li>' + __('Lock the previous Academic Year') + '</li>' +
				'<li>' + __('Execute selected roll-over operations') + '</li>' +
				'</ul><br>' +
				__('Do you want to continue?'),
				function() {
					// User confirmed - save will proceed
					frm.save();
				},
				function() {
					// User cancelled - revert status
					frm.set_value('status', 'In-active');
				}
			);
		} else if (frm.doc.status === 'In-active' && !frm.is_new()) {
			// Deactivating - show warning
			frappe.msgprint({
				title: __('Deactivating Academic Year'),
				message: __('Make sure another academic year is activated before deactivating this one.'),
				indicator: 'orange'
			});
		}
	},

	promote_students: function(frm) {
		if (frm.doc.promote_students) {
			frappe.msgprint({
				title: __('Student Promotion'),
				message: __('Students will be promoted when this Academic Year is activated'),
				indicator: 'blue'
			});
		}
	},

	reset_fee_structure: function(frm) {
		if (frm.doc.reset_fee_structure) {
			frappe.msgprint({
				title: __('Fee Structure Reset'),
				message: __('Fee structures will be reset when this Academic Year is activated'),
				indicator: 'blue'
			});
		}
	},

	reset_section: function(frm) {
		if (frm.doc.reset_section) {
			frappe.msgprint({
				title: __('Section Allocation Reset'),
				message: __('Section allocations will be reset when this Academic Year is activated'),
				indicator: 'blue'
			});
		}
	},

	reset_house: function(frm) {
		if (frm.doc.reset_house) {
			frappe.msgprint({
				title: __('House Allocation Reset'),
				message: __('House allocations will be reset when this Academic Year is activated'),
				indicator: 'blue'
			});
		}
	}
});
