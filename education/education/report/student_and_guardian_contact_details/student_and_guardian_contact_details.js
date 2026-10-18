// Copyright (c) 2016, Frappe Technologies Pvt. Ltd. and contributors
// For license information, please see license.txt

frappe.query_reports['Student and Guardian Contact Details'] = {
  filters: [
    {
      fieldname: 'student_batch',
      label: __('Student Batch'),
      fieldtype: 'Link',
      options: 'Student Batch Name',
      reqd: 1,
    },
  ],
}
