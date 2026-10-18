frappe.views.calendar['Subject Schedule'] = {
  field_map: {
    start: 'from_time',
    end: 'to_time',
    id: 'name',
    title: 'title',
    allDay: 'allDay',
  },
  gantt: false,
  order_by: 'schedule_date',
  filters: [
    {
      fieldtype: 'Link',
      fieldname: 'student_batch',
      options: 'Student Batch Name',
      label: __('Student Batch'),
    },
    {
      fieldtype: 'Link',
      fieldname: 'subject',
      options: 'Subject',
      label: __('Subject'),
    },
    {
      fieldtype: 'Link',
      fieldname: 'faculty',
      options: 'Faculty',
      label: __('Faculty'),
    },
    {
      fieldtype: 'Link',
      fieldname: 'room',
      options: 'Room',
      label: __('Room'),
    },
  ],
  get_events_method: 'education.education.api.get_subject_schedule_events',
}
