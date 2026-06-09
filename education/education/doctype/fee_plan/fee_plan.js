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

  fee_term(frm) {
    if (frm.doc.fee_term) {
      frm.clear_table('fee_plan_details')

      frappe.call({
        method:
          'education.education.doctype.fee_plan.fee_plan.get_fee_plan_details',
        args: {
          fee_plan: frm.doc.fee_term,
        },
        callback: function (r) {
          if (r.message) {
            console.log(r.message)
            frm.clear_table('fee_plan_details')
            r.message.forEach(function (item) {
              let child = frm.add_child('fee_plan_details')
              child.date = item.date
              child.amount = item.amount
              //   child.percent_of_total = item.percent_of_total
              //   child.term_type = item.term_type
              //   child.fee_term_detail = item.name
            })
            frm.refresh_field('fee_plan_details')
          } else {
            frappe.throw('No details found for the selected Fee Term.')
          }
        },
        freeze: true,
        freeze_message: __('Fetching Fee Term Details...'),
      })
    }
  },
})
