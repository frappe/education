// Copyright (c) 2026, Frappe Technologies Pvt. Ltd. and contributors
// For license information, please see license.txt

frappe.ui.form.on('Subject Registration', {
  refresh: function (frm) {
    frm.trigger('setup_queries')
    frm.trigger('setup_grids')
    frm.trigger('setup_actions')
  },

  course_enrollment: function (frm) {
    frm.trigger('setup_queries')
  },

  setup_queries: function (frm) {
    frm.set_query('course_enrollment', function () {
      return {
        filters: {
          docstatus: 1,
        },
      }
    })

    frm.set_query('subject', 'elective_subjects', function () {
      return {
        filters: {
          name: ['in', frm._allowed_electives || ['']],
        },
      }
    })

    if (!frm.doc.course) return

    frm.call('get_allowed_electives').then((r) => {
      frm._allowed_electives = r.message || []
    })
  },

  setup_grids: function (frm) {
    const is_draft = frm.doc.docstatus === 0

    const compulsory = frm.fields_dict.compulsory_subjects
    if (compulsory && compulsory.grid) {
      compulsory.grid.cannot_add_rows = true
      compulsory.grid.cannot_delete_rows = true
    }

    const elective = frm.fields_dict.elective_subjects
    if (elective && elective.grid) {
      elective.grid.cannot_add_rows = !is_draft
      elective.grid.cannot_delete_rows = !is_draft
    }

    frm.set_df_property('elective_subjects', 'read_only', is_draft ? 0 : 1)
  },

  setup_actions: function (frm) {
    if (frm.is_new()) return

    if (frm.doc.docstatus === 0) {
      frm
        .add_custom_button(__('Get Subjects'), function () {
          frm.call('get_subjects').then(() => frm.reload_doc())
        })
        .addClass('btn-primary')
    }
  },
})
