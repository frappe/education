// Copyright (c) 2016, Frappe Technologies Pvt. Ltd. and contributors
// For license information, please see license.txt
/* eslint-disable */

frappe.query_reports['Final Assessment Grades'] = {
  filters: [
    {
      fieldname: 'academic_year',
      label: __('Academic Year'),
      fieldtype: 'Link',
      options: 'Academic Year',
      reqd: 1,
    },
    {
      fieldname: 'student_batch',
      label: __('Student Batch'),
      fieldtype: 'Link',
      options: 'Student Batch Name',
      reqd: 1,
      get_query: function () {
        return {
          filters: {
            disabled: 0,
          },
        }
      },
    },
    {
      fieldname: 'assessment_group',
      label: __('Assessment Group'),
      fieldtype: 'Link',
      options: 'Assessment Group',
      reqd: 1,
    },
  ],
}
