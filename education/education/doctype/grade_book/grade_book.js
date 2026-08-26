// Copyright (c) 2026, Frappe Technologies Pvt. Ltd. and contributors
// For license information, please see license.txt

frappe.ui.form.on('Grade Book', {
  onload: function (frm) {
    set_grade_book_queries(frm)
    set_default_academic_year(frm)
  },

  refresh: function (frm) {
    set_grade_book_queries(frm)
    set_default_academic_year(frm)

    if (!frm.is_new()) {
      frm.add_custom_button(__('Generate Final Grade'), () => {
        frm.call('generate_final_grade').then(() => frm.reload_doc())
      })
    }

    if (!frm.is_new() && frm.doc.status === 'Computed') {
      frm.add_custom_button(__('Reset to Draft'), () => {
        frappe.confirm(
          __(
            'This will clear computed grades. You can generate them again afterwards.'
          ),
          () => {
            frm.call('reset_to_draft').then(() => frm.reload_doc())
          }
        )
      })
    }
  },

  company: function (frm) {
    set_grade_book_queries(frm)
  },

  course: function (frm) {
    if (frm.doc.student_batch) {
      frm.set_value('student_batch', '')
    }
    set_grade_book_queries(frm)
  },

  academic_year: function (frm) {
    if (frm.doc.academic_term) {
      frm.set_value('academic_term', '')
    }
    set_grade_book_queries(frm)
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

function set_grade_book_queries(frm) {
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

  frm.set_query('student_batch', function () {
    const filters = {}
    if (frm.doc.course) {
      filters.course = frm.doc.course
    }
    if (frm.doc.company) {
      filters.company = frm.doc.company
    }
    return { filters }
  })

  frm.set_query('grading_scale', function () {
    const filters = { docstatus: 1 }
    if (frm.doc.company) {
      filters.company = frm.doc.company
    }
    return { filters }
  })
}
