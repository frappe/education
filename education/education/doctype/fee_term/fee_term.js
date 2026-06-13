// Copyright (c) 2026, Frappe Technologies Pvt. Ltd. and contributors
// For license information, please see license.txt

frappe.ui.form.on('Fee Term', {
  refresh(frm) {
    set_receivable_account_query(frm)
    frm.trigger('term_type')
  },

  company(frm) {
    set_receivable_account_query(frm)
  },

  term_type(frm) {
    set_payment_terms_columns(frm)
    set_intro(frm)
  },
})

function set_payment_terms_columns(frm) {
  const grid = frm.fields_dict['payment_terms'].grid
  const is_days = frm.doc.term_type === 'Fixed Fees of Days'
  const is_dates = frm.doc.term_type === 'Fixed Fees of Dates'

  grid.update_docfield_property('due_days', 'reqd', is_days ? 1 : 0)
  grid.update_docfield_property('due_date', 'reqd', is_dates ? 1 : 0)
  grid.set_column_disp('due_days', is_days)
  grid.set_column_disp('due_date', is_dates)
  grid.set_column_disp_in_list_view('due_days', is_days)
  grid.set_column_disp_in_list_view('due_date', is_dates)
  grid.refresh()
}

function set_intro(frm) {
  if (frm.doc.term_type === 'Session Based Fees') {
    frm.set_intro('Billing will be generated based on attendance')
  } else if (frm.doc.term_type === 'Faculty Session Based Fees') {
    frm.set_intro(
      'Billing will be generated based on attendance and faculty assigned to the session'
    )
  } else {
    frm.set_intro('')
  }
}

function set_receivable_account_query(frm) {
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
