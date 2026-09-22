// Copyright (c) 2026, Frappe Technologies Pvt. Ltd. and contributors
// For license information, please see license.txt

frappe.ui.form.on('Subject', {
  refresh: function (frm) {
    frm.trigger('set_filters')
  },
  company: function (frm) {
    frm.trigger('set_filters')
  },

  set_filters(frm) {
    if (frm.doc.company) {
      frm.set_query('department', function () {
        return {
          filters: {
            company: frm.doc.company,
            disabled: 0,
          },
        }
      })
    }
  },
})
