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
            disabled: 1,
          },
        }
      })
    }
  },
})

frappe.ui.form.on('Course', {
  courses_add: function (frm) {
    frm.fields_dict['courses'].grid.get_field('course').get_query = function (
      doc
    ) {
      var courses_list = []
      $.each(doc.courses, function (idx, val) {
        if (val.course) courses_list.push(val.course)
      })
      return { filters: [['Course', 'name', 'not in', courses_list]] }
    }
  },
})
