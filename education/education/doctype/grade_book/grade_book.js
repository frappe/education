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
    toggle_subject_override_fields(frm)
    toggle_component_tables(frm)

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

  student: function (frm) {
    set_grade_book_queries(frm)
  },

  course: function (frm) {
    if (frm.doc.student_batch) {
      frm.set_value('student_batch', '')
    }
    set_grade_book_queries(frm)
  },

  student_batch: function (frm) {
    set_grade_book_queries(frm)
  },

  academic_year: function (frm) {
    if (frm.doc.academic_term) {
      frm.set_value('academic_term', '')
    }
    set_grade_book_queries(frm)
  },
})

frappe.ui.form.on('Grade Book Subject', {
  is_overridden: function (frm, cdt, cdn) {
    const row = locals[cdt][cdn]
    if (!row.is_overridden) {
      frappe.model.set_value(cdt, cdn, 'percentage', row.computed_percentage)
      frappe.model.set_value(cdt, cdn, 'grade', row.computed_grade)
      frappe.model.set_value(cdt, cdn, 'override_comment', '')
    }
    toggle_subject_override_fields(frm)
  },

  percentage: function (frm, cdt, cdn) {
    const row = locals[cdt][cdn]
    if (!row.is_overridden || !frm.doc.grading_scale) {
      return
    }
    frappe.call({
      method: 'education.education.api.get_grade_details',
      args: {
        grading_scale: frm.doc.grading_scale,
        percentage: row.percentage,
      },
      callback: function (r) {
        if (!r.message) {
          return
        }
        frappe.model.set_value(cdt, cdn, 'grade', r.message.grade_code)
      },
    })
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
  frm.set_query('student', function () {
    if (!frm.doc.course && !frm.doc.student_batch) {
      return {}
    }
    return {
      query:
        'education.education.doctype.grade_book.grade_book.get_enrolled_students',
      filters: {
        course: frm.doc.course,
        student_batch: frm.doc.student_batch,
      },
    }
  })

  frm.set_query('course', function () {
    if (!frm.doc.student) {
      const filters = {}
      if (frm.doc.company) {
        filters.company = frm.doc.company
      }
      return { filters }
    }
    return {
      query:
        'education.education.doctype.grade_book.grade_book.get_enrolled_courses',
      filters: {
        student: frm.doc.student,
        student_batch: frm.doc.student_batch,
        company: frm.doc.company,
      },
    }
  })

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

function toggle_subject_override_fields(frm) {
  const grid = frm.fields_dict.subjects && frm.fields_dict.subjects.grid
  if (!grid) {
    return
  }
  const allow_override = frm.doc.status === 'Computed'
  grid.toggle_enable('is_overridden', allow_override)
  ;(frm.doc.subjects || []).forEach((row) => {
    const grid_row = grid.grid_rows_by_docname[row.name]
    if (!grid_row) {
      return
    }
    grid_row.toggle_editable('percentage', allow_override && row.is_overridden)
    grid_row.toggle_editable(
      'override_comment',
      allow_override && row.is_overridden
    )
  })
}

function toggle_component_tables(frm) {
  const has_assignment = (frm.doc.assignment_components || []).length > 0
  const has_attendance = (frm.doc.attendance_components || []).length > 0
  frm.toggle_display('section_assignment_components', has_assignment)
  frm.toggle_display('assignment_components', has_assignment)
  frm.toggle_display('section_attendance_components', has_attendance)
  frm.toggle_display('attendance_components', has_attendance)
}
