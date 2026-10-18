// Copyright (c) 2026, Frappe Technologies Pvt. Ltd. and contributors
// For license information, please see license.txt

frappe.ui.form.on('Campus', {
  onload(frm) {
    frm.set_query('cost_center', () => ({
      filters: {
        company: frm.doc.company,
        is_group: 0,
      },
    }))
  },

  company(frm) {
    if (frm.doc.cost_center) {
      frm.set_value('cost_center', '')
    }
  },
})
