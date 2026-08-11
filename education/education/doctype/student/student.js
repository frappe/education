// Copyright (c) 2016, Frappe Technologies Pvt. Ltd. and contributors
// For license information, please see license.txt

frappe.ui.form.on('Student', {
  setup: function (frm) {
    frm.set_query('guardian', 'guardians', function (doc, cdt, cdn) {
      let guardian_list = (doc.guardians || [])
        .filter((d) => d.name !== cdn && d.guardian)
        .map((d) => d.guardian)

      if (guardian_list.length) {
        return {
          filters: [['Guardian', 'name', 'not in', guardian_list]],
        }
      }
      return {}
    })
  },
  refresh: function (frm) {
    frm.set_query('user', function (doc) {
      return {
        filters: {
          ignore_user_type: 1,
        },
      }
    })

    if (!frm.is_new()) {
      frm.add_custom_button(__('Accounting Ledger'), function () {
        frappe.set_route('query-report', 'General Ledger', {
          party_type: 'Customer',
          party: frm.doc.customer,
        })
      })
    }

    frappe.db
      .get_single_value('Education Settings', 'user_creation_skip')
      .then((r) => {
        if (cint(r) !== 1) {
          frm.set_df_property('student_email_id', 'reqd', 1)
        }
      })
  },
})
