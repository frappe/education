// Copyright (c) 2016, Frappe Technologies Pvt. Ltd. and contributors
// For license information, please see license.txt

frappe.ui.form.on('Student Batch Name', {
  refresh: function (frm) {
    if (!frm.is_new()) {
      frm.add_custom_button(__('Students'), function () {
        frappe.set_route('List', 'Course Enrollment', {
          student_batch: frm.doc.name,
          docstatus: 1,
        })
      })

      frm.add_custom_button(
        __('Create Grade Books'),
        function () {
          const dialog = new frappe.ui.Dialog({
            title: __('Create Grade Books'),
            fields: [
              {
                fieldname: 'academic_year',
                label: __('Academic Year'),
                fieldtype: 'Link',
                options: 'Academic Year',
                reqd: 1,
                default: frappe.defaults.get_user_default('academic_year'),
              },
              {
                fieldname: 'academic_term',
                label: __('Academic Term'),
                fieldtype: 'Link',
                options: 'Academic Term',
                get_query: function () {
                  return {
                    filters: {
                      academic_year: dialog.get_value('academic_year'),
                    },
                  }
                },
              },
            ],
            primary_action_label: __('Create'),
            primary_action: function (values) {
              frappe.call({
                method:
                  'education.education.doctype.grade_book.grade_book.create_grade_books',
                args: {
                  student_batch: frm.doc.name,
                  academic_year: values.academic_year,
                  academic_term: values.academic_term,
                },
                freeze: true,
                callback: function (r) {
                  if (!r.exc) {
                    dialog.hide()
                    frappe.set_route('List', 'Grade Book', {
                      student_batch: frm.doc.name,
                    })
                  }
                },
              })
            },
          })
          dialog.show()
        },
        __('Tools')
      )
    }
  },
})
