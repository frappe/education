// Copyright (c) 2026, Frappe Technologies Pvt. Ltd. and contributors
// For license information, please see license.txt

frappe.ui.form.on('Fee Term', {
  refresh(frm) {
    set_receiable_account_query(frm)

    if (frm.doc.term_type === 'Session Based') {
      frm.set_intro('Billing will be generated based on attendance')
    }
    if (frm.doc.term_type === 'Faculty Session Based') {
      frm.set_intro(
        'Billing will be generated based on attendance and faculty assigned to the session'
      )
    }
  },
  company(frm) {
    set_receiable_account_query(frm)
  },

  validate(frm) {
    if (frm.doc.term_type === 'Fixed Fees of Dates') {
      frm.clear_table('fixed_days_payment_terms')
    }
    if (frm.doc.term_type === 'Fixed Fees of Days') {
      frm.clear_table('fixed_dates_payment_terms')
    }
  },
})

function set_receiable_account_query(frm) {
  frm.set_query('receivable_account', function () {
    return {
      filters: {
        company: frm.doc.company,
        account_type: 'Receivable',
        is_group: 0,
      },
    }
  })
}

frappe.ui.form.on('Fee Component', {
  amount(frm, cdt, cdn) {
    let row = locals[cdt][cdn]
    if (row.discount > 0) {
      let discount_amount = (flt(row.amount) * flt(row.discount)) / 100
      let total = flt(row.amount) - discount_amount
      frappe.model.set_value(cdt, cdn, 'total', total)
    } else {
      frappe.model.set_value(cdt, cdn, 'total', row.amount)
    }
  },
  fee_components_add(frm) {
    calculate_total_amount(frm)
  },
  fee_components_remove(frm) {
    calculate_total_amount(frm)
  },
  discount(frm, cdt, cdn) {
    let row = locals[cdt][cdn]
    if (row.amount > 0) {
      let discount_amount = (flt(row.amount) * flt(row.discount)) / 100
      let total = flt(row.amount) - discount_amount
      frappe.model.set_value(cdt, cdn, 'total', total)
    }
  },

  total(frm, cdt, cdn) {
    calculate_total_amount(frm)
  },
})

function calculate_total_amount(frm) {
  let total_amount = 0
  frm.doc.fee_components.forEach((component) => {
    total_amount += flt(component.total)
  })
  frm.set_value('total_amount', total_amount)
}
