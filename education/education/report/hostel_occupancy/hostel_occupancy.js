// Copyright (c) 2026, Frappe Technologies Pvt. Ltd. and contributors
// For license information, please see license.txt

frappe.query_reports['Hostel Occupancy'] = {
  filters: [
    {
      fieldname: 'company',
      label: __('Company'),
      fieldtype: 'Link',
      options: 'Company',
      default: frappe.defaults.get_user_default('Company'),
    },
    {
      fieldname: 'campus',
      label: __('Campus'),
      fieldtype: 'Link',
      options: 'Campus',
      get_query: () => {
        const company = frappe.query_report.get_filter_value('company')
        return { filters: company ? { company } : {} }
      },
    },
    {
      fieldname: 'hostel',
      label: __('Hostel'),
      fieldtype: 'Link',
      options: 'Hostel',
    },
  ],
}
