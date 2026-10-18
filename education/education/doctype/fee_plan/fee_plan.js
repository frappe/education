// Copyright (c) 2026, Frappe Technologies Pvt. Ltd. and contributors
// For license information, please see license.txt

const fee_types_to_check = [
  'Fixed Fees of Days',
  'Fixed Fees of Dates',
  'Duration Based Fees',
]

frappe.ui.form.on('Fee Plan', {
  onload(frm) {
    frm.get_field('fee_plan_details').grid.cannot_add_rows = true
  },

  refresh(frm) {
    frm.set_query('fee_term', function () {
      return {
        filters: {
          docstatus: 1,
        },
      }
    })

    // if (
    //   !frm.doc.__islocal &&
    //   frm.doc.__onload &&
    //   frm.doc.__onload.dashboard_info
    // ) {
    //   var info = frm.doc.__onload.dashboard_info
    //   frm.dashboard.add_indicator(
    //     __('Total Collected: {0}', [
    //       format_currency(info.total_paid, info.currency),
    //     ]),
    //     'blue',
    //   )
    //   frm.dashboard.add_indicator(
    //     __('Total Outstanding: {0}', [
    //       format_currency(info.total_unpaid, info.currency),
    //     ]),
    //     info.total_unpaid ? 'orange' : 'green',
    //   )
    // }
  },
})
