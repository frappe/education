frappe.ui.form.on('Course', {
  setup: function (frm) {
    frm.set_query('default_grading_scale', function () {
      return {
        filters: {
          docstatus: 1,
        },
      }
    })

    frm.set_query('grade_template', function () {
      return {
        filters: {
          company: frm.doc.company,
        },
      }
    })

    frm.set_query('fee_term', function () {
      return {
        filters: {
          docstatus: 1,
        },
      }
    })

    frm.set_query('grade_template', 'subjects', function () {
      return {
        filters: {
          company: frm.doc.company,
        },
      }
    })

    frm.set_query('default_grading_scale', function () {
      return {
        filters: {
          company: frm.doc.company,
        },
      }
    })
  },

})



frappe.ui.form.on('Course Subject', {
  subjects_add: function (frm) {
    frm.fields_dict['subjects'].grid.get_field('subject').get_query = function (
      doc
    ) {
      var subjects_list = []
      $.each(doc.subjects, function (idx, val) {
        if (val.subject) subjects_list.push(val.subject)
      })
      return { filters: [['Subject', 'name', 'not in', subjects_list]] }
    }
  },
})
