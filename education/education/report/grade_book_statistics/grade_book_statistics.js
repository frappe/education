// Copyright (c) 2026, Frappe Technologies Pvt. Ltd. and contributors
// For license information, please see license.txt

frappe.query_reports['Grade Book Statistics'] = {
  filters: [
    {
      fieldname: 'grade_book',
      label: __('Grade Book'),
      fieldtype: 'Link',
      options: 'Grade Book',
      reqd: 1,
      get_query: function () {
        return {
          filters: {
            status: 'Computed',
          },
        }
      },
    },
  ],
}
