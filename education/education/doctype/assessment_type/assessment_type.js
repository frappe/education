// Copyright (c) 2026, Frappe Technologies Pvt. Ltd. and contributors
// For license information, please see license.txt

frappe.ui.form.on('Assessment Type', {
  refresh(frm) {
    if (frm.doc.is_group) {
      frm.dashboard.hide()
    }
  },
})
