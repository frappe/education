// Copyright (c) 2026, Frappe Technologies Pvt. Ltd. and contributors
// For license information, please see license.txt

frappe.ui.form.on('Library Member', {
  refresh(frm) {
    handle_membership_type(frm)
  },

  membership_type(frm) {
    handle_membership_type(frm)
  },
})

function handle_membership_type(frm) {
  const type = frm.doc.membership_type

  if (type === 'External') {
    // Show external name
    frm.set_df_property('external_member_name', 'hidden', 0)
    frm.set_df_property('external_member_name', 'reqd', 1)

    // Hide dynamic link fields
    frm.set_df_property('reference_doctype', 'hidden', 1)
    frm.set_df_property('reference_name', 'hidden', 1)

    // Clear link values (avoid unnecessary triggers)
    if (frm.doc.reference_doctype) {
      frm.set_value('reference_doctype', null)
    }
    if (frm.doc.reference_name) {
      frm.set_value('reference_name', null)
    }
  } else {
    // Hide external name
    frm.set_df_property('external_member_name', 'hidden', 1)
    frm.set_df_property('external_member_name', 'reqd', 0)

    // Show dynamic link fields
    frm.set_df_property('reference_doctype', 'hidden', 1)
    frm.set_df_property('reference_name', 'hidden', 0)

    // Auto-set doctype
    if (type === 'Student') {
      frm.set_value('reference_doctype', 'Student')
    } else if (type === 'Staff') {
      frm.set_value('reference_doctype', 'Employee')
    }
  }

  // Ensure UI updates properly
  frm.refresh_fields()
}
