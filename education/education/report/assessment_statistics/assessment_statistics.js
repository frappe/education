// Copyright (c) 2026, Frappe Technologies Pvt. Ltd. and contributors
// For license information, please see license.txt

frappe.query_reports['Assessment Statistics'] = {
  filters: [
    {
      fieldname: 'assessment_plan',
      label: __('Assessment Plan'),
      fieldtype: 'Link',
      options: 'Assessment Plan',
      reqd: 1,
      get_query: function () {
        return {
          filters: {
            docstatus: 1,
          },
        }
      },
    },
  ],
}
