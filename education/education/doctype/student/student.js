// Copyright (c) 2016, Frappe Technologies Pvt. Ltd. and contributors
// For license information, please see license.txt

frappe.ui.form.on('Student', {
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
          frm.set_df_property('email_address', 'reqd', 1)
        }
      })
  },
})

frappe.ui.form.on('Student Guardian', {
  guardians_add: function (frm) {
    frm.fields_dict['guardians'].grid.get_field('guardian').get_query =
      function (doc) {
        let guardian_list = []
        if (!doc.__islocal) guardian_list.push(doc.guardian)
        $.each(doc.guardians, function (idx, val) {
          if (val.guardian) guardian_list.push(val.guardian)
        })
        return { filters: [['Guardian', 'name', 'not in', guardian_list]] }
      }
  },
})

frappe.ui.form.on('Technical Skill', {
  technical_skills_add: function (frm) {
    frm.fields_dict['technical_skills'].grid.get_field('skill').get_query =
      function (doc) {
        var skills_list = []
        $.each(doc.technical_skills, function (idx, val) {
          if (val.skill) skills_list.push(val.skill)
        })
        return { filters: [['Skill', 'name', 'not in', skills_list]] }
      }
  },
})

frappe.ui.form.on('Self Assessed Skill', {
  self_assessed_skills_add: function (frm) {
    frm.fields_dict['technical_skills'].grid.get_field('skill').get_query =
      function (doc) {
        var skills_list = []
        $.each(doc.self_assessed_skills, function (idx, val) {
          if (val.skill) skills_list.push(val.skill)
        })
        return { filters: [['Skill', 'name', 'not in', skills_list]] }
      }
  },
})
