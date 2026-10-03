// Copyright (c) 2015, Frappe Technologies and contributors
// For license information, please see license.txt

frappe.ui.form.on('Program', {
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
