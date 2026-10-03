// Copyright (c) 2026, Frappe Technologies Pvt. Ltd. and contributors
// For license information, please see license.txt

frappe.ui.form.on('Area of Specialization', {
  refresh(frm) {
    frm.set_query('area_of_study', () => {
      return {
        filters: {
          company: frm.doc.company,
        },
      }
    })
  },

  company: function (frm) {
    frm.set_value('area_of_study', null)
  },
})
