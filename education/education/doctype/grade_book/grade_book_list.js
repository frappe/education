frappe.listview_settings['Grade Book'] = {
  onload: function (listview) {
    listview.page.add_inner_button(__('Initialize from Batch'), function () {
      const dialog = new frappe.ui.Dialog({
        title: __('Create Grade Books'),
        fields: [
          {
            fieldname: 'student_batch',
            label: __('Student Batch'),
            fieldtype: 'Link',
            options: 'Student Batch Name',
            reqd: 1,
          },
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
            args: values,
            freeze: true,
            callback: function (r) {
              if (!r.exc) {
                dialog.hide()
                listview.refresh()
              }
            },
          })
        },
      })
      dialog.show()
    })
  },
}
