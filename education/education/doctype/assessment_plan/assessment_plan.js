// Copyright (c) 2016, Frappe Technologies Pvt. Ltd. and contributors
// For license information, please see license.txt

frappe.ui.form.on('Assessment Plan', {
  onload: function (frm) {
    frm.set_query('assessment_group', function (doc, cdt, cdn) {
      return {
        filters: {
          is_group: 0,
        },
      }
    })
    frm.set_query('grading_scale', function () {
      return {
        filters: {
          docstatus: 1,
          company: frm.doc.company,
        },
      }
    })
    frm.set_query('subject', function () {
      return {
        filters: {
          course: frm.doc.course,
        },
      }
    })
    set_academic_queries(frm)
    set_default_academic_year(frm)
  },

  refresh: function (frm) {
    if (frm.doc.docstatus == 1) {
      frm.add_custom_button(
        __('Assessment Result Tool'),
        function () {
          frappe.route_options = {
            assessment_plan: frm.doc.name,
            student_batch: frm.doc.student_batch,
          }
          frappe.set_route('Form', 'Assessment Result Tool')
        },
        __('Tools')
      )
    }

    set_academic_queries(frm)
    set_default_academic_year(frm)
  },

  company: function (frm) {
    set_academic_queries(frm)
  },

  academic_year: function (frm) {
    if (frm.doc.academic_term) {
      frm.set_value('academic_term', '')
    }
    set_academic_queries(frm)
  },

  course: function (frm) {
    if (frm.doc.subject) {
      frm.set_value('subject', '')
    }
    if (frm.doc.course && !frm.doc.grading_scale) {
      frappe.db.get_value(
        'Course',
        frm.doc.course,
        'default_grading_scale',
        (r) => {
          if (r && r.default_grading_scale) {
            frm.set_value('grading_scale', r.default_grading_scale)
          }
        }
      )
    }
  },
})

function set_default_academic_year(frm) {
  if (!frm.is_new() || frm.doc.academic_year) {
    return
  }
  const year = frappe.defaults.get_user_default('academic_year')
  if (year) {
    frm.set_value('academic_year', year)
  }
}

function set_academic_queries(frm) {
  frm.set_query('academic_year', function () {
    const filters = {}
    if (frm.doc.company) {
      filters.company = frm.doc.company
    }
    return { filters }
  })

  frm.set_query('academic_term', function () {
    const filters = {}
    if (frm.doc.academic_year) {
      filters.academic_year = frm.doc.academic_year
    }
    if (frm.doc.company) {
      filters.company = frm.doc.company
    }
    return { filters }
  })
}
