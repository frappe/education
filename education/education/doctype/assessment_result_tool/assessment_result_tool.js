// Copyright (c) 2016, Frappe Technologies Pvt. Ltd. and contributors
// For license information, please see license.txt

frappe.ui.form.on('Assessment Result Tool', {
  setup: function (frm) {
    frm.add_fetch('assessment_plan', 'student_batch', 'student_batch')
  },

  refresh: function (frm) {
    if (frappe.route_options) {
      frm.set_value('student_batch', frappe.route_options.student_batch)
      frm.set_value('assessment_plan', frappe.route_options.assessment_plan)
      frappe.route_options = null
    } else {
      frm.trigger('assessment_plan')
    }
    frm.disable_save()
    frm.page.clear_indicator()
  },

  assessment_plan: function (frm) {
    frm.doc.show_submit = false
    if (frm.doc.assessment_plan) {
      if (!frm.doc.student_batch) return
      frappe.call({
        method: 'education.education.api.get_assessment_students',
        args: {
          assessment_plan: frm.doc.assessment_plan,
          student_batch: frm.doc.student_batch,
        },
        callback: function (r) {
          if (r.message) {
            frm.doc.students = r.message
            frm.events.render_table(frm)
            for (let value of r.message) {
              if (!value.docstatus) {
                frm.doc.show_submit = true
                break
              }
            }
            frm.events.submit_result(frm)
          }
        },
      })
    }
  },

  render_table: function (frm) {
    $(frm.fields_dict.result_html.wrapper).empty()
    frappe.call({
      method: 'education.education.api.get_maximum_score',
      args: {
        assessment_plan: frm.doc.assessment_plan,
      },
      callback: function (r) {
        frm.events.get_marks(frm, r.message)
      },
    })
  },

  get_marks: function (frm, max_score) {
    var result_table = $(
      frappe.render_template('assessment_result_tool', {
        frm: frm,
        students: frm.doc.students,
        max_score: max_score,
      })
    )
    result_table.appendTo(frm.fields_dict.result_html.wrapper)

    $('.result-comment').on('keydown', function (e) {
      changeFocusToNextCell(e, 2)
    })

    $('.student-result-data').on('keydown', function (e) {
      changeFocusToNextCell(e, 3)
    })

    function changeFocusToNextCell(e, cellIndex) {
      if (e.keyCode === 13 && !e.shiftKey) {
        let nextRow = e.target.parentElement.parentElement.nextElementSibling
        if (nextRow) {
          nextRow.cells[cellIndex].lastElementChild.focus()
        }
      }
      if (e.keyCode === 13 && e.shiftKey) {
        let prevRow =
          e.target.parentElement.parentElement.previousElementSibling
        if (prevRow) {
          prevRow.cells[cellIndex].lastElementChild.focus()
        }
      }
    }

    result_table.on('change', 'input', function (e) {
      let $input = $(e.target)
      let student = $input.data().student
      let score_input = result_table.find(
        `input[data-student=${student}].student-result-data`
      )
      let score = parseFloat(score_input.val())

      if (Number.isNaN(score)) return

      if (score < 0) {
        score = 0
        score_input.val(score)
      } else if (score > max_score) {
        score = max_score
        score_input.val(score)
      }

      let student_scores = { student: student, score: score }
      result_table
        .find(`[data-student=${student}].result-comment`)
        .each(function (el, input) {
          student_scores['comment'] = $(input).val()
        })

      frappe.call({
        method: 'education.education.api.mark_assessment_result',
        args: {
          assessment_plan: frm.doc.assessment_plan,
          scores: student_scores,
        },
        callback: function (r) {
          let assessment_result = r.message
          if (!assessment_result) return

          if (!frm.doc.show_submit) {
            frm.doc.show_submit = true
            frm.events.submit_result(frm)
          }
          result_table
            .find(
              `span[data-student=${assessment_result.student}].student-result-grade`
            )
            .html(assessment_result.grade)
          let link_span = result_table.find(
            `span[data-student=${assessment_result.student}].total-result-link`
          )
          $(link_span).css('display', 'block')
          $(link_span)
            .find('a')
            .attr('href', '/app/assessment-result/' + assessment_result.name)
        },
      })
    })
  },

  submit_result: function (frm) {
    if (frm.doc.show_submit) {
      frm.page.set_primary_action(__('Submit'), function () {
        frappe.call({
          method: 'education.education.api.submit_assessment_results',
          args: {
            assessment_plan: frm.doc.assessment_plan,
            student_batch: frm.doc.student_batch,
          },
          callback: function (r) {
            if (r.message) {
              frappe.msgprint(__('{0} Result submittted', [r.message]))
            } else {
              frappe.msgprint(__('No Result to submit'))
            }
            frm.events.assessment_plan(frm)
          },
        })
      })
    } else {
      frm.page.clear_primary_action()
    }
  },
})
