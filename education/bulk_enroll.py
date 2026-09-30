import frappe
from frappe import _

BATCH_SIZE = 200

@frappe.whitelist()
def bulk_approve_enroll(names):
    import json
    if isinstance(names, str):
        names = json.loads(names)

    all_applicants = frappe.get_all(
        'Student Applicant',
        filters=[['name', 'in', names]],
        fields=['name', 'application_status', 'first_name', 'last_name',
                'program', 'academic_year', 'academic_term', 'date_of_birth',
                'gender', 'student_email_id', 'student_mobile_number',
                'student_category']
    )

    applicant_map = {a.name: a for a in all_applicants}

    already_enrolled = [n for n in names if applicant_map.get(n)
        and applicant_map[n].application_status in ('Admitted', 'Approved')]

    to_process = [n for n in names if applicant_map.get(n)
        and applicant_map[n].application_status not in ('Admitted', 'Approved')]

    if not to_process:
        return {
            'queued': False,
            'message': _('All selected students are already enrolled.'),
            'already_enrolled_count': len(already_enrolled),
            'to_process_count': 0
        }

    success = []
    failed = []

    default_academic_year = frappe.db.get_single_value(
        'Education Settings', 'current_academic_year'
    ) or frappe.db.get_value('Academic Year', {}, 'name',
                              order_by='year_start_date desc')

    default_academic_term = frappe.db.get_single_value(
        'Education Settings', 'current_academic_term'
    ) or frappe.db.get_value('Academic Term', {}, 'name',
                              order_by='term_start_date desc')

    existing_students = frappe.get_all('Student',
        filters=[['student_applicant', 'in', to_process]],
        fields=['name', 'student_applicant'])

    existing_student_map = {s.student_applicant: s.name
                            for s in existing_students}

    term_cache = {}

    def get_term_for_year(year):
        if year not in term_cache:
            term_cache[year] = frappe.db.get_value(
                'Academic Term', {'academic_year': year}, 'name',
                order_by='term_start_date asc') or default_academic_term
        return term_cache[year]

    for i in range(0, len(to_process), BATCH_SIZE):
        batch = to_process[i:i + BATCH_SIZE]

        for name in batch:
            try:
                doc_data = applicant_map[name]
                yr = doc_data.academic_year or default_academic_year
                term = doc_data.academic_term or get_term_for_year(yr)

                # STEP 1: Approve
                doc = frappe.get_doc('Student Applicant', name)
                doc.application_status = 'Approved'
                doc.academic_year = yr
                doc.academic_term = term
                doc.save(ignore_permissions=True, ignore_version=True)

                # STEP 2: Create Student record
                if name in existing_student_map:
                    student_name = existing_student_map[name]
                else:
                    s = frappe.new_doc('Student')
                    s.first_name = doc_data.first_name
                    s.last_name = doc_data.last_name or ''
                    s.student_applicant = name
                    if doc_data.date_of_birth:
                        s.date_of_birth = doc_data.date_of_birth
                    if doc_data.gender:
                        s.gender = doc_data.gender
                    if doc_data.student_email_id:
                        s.student_email_id = doc_data.student_email_id
                    if doc_data.student_mobile_number:
                        s.student_mobile_number = doc_data.student_mobile_number
                    if doc_data.student_category:
                        s.student_category = doc_data.student_category
                    s.insert(ignore_permissions=True)
                    student_name = s.name
                    existing_student_map[name] = student_name

                # STEP 3: Program Enrollment
                if doc_data.program:
                    if not frappe.db.get_value('Program Enrollment',
                            {'student': student_name, 'program': doc_data.program},
                            'name'):
                        e = frappe.new_doc('Program Enrollment')
                        e.student = student_name
                        e.program = doc_data.program
                        e.academic_year = yr
                        e.academic_term = term
                        e.enrollment_date = frappe.utils.today()
                        if doc_data.student_category:
                            e.student_category = doc_data.student_category
                        e.insert(ignore_permissions=True)

                # STEP 4: Reload then mark as Admitted
                doc.reload()
                doc.application_status = 'Admitted'
                doc.save(ignore_permissions=True, ignore_version=True)

                success.append(name)

            except Exception as ex:
                frappe.db.rollback()
                frappe.log_error(title='Bulk Enroll Failed', message=str(ex))
                failed.append({'name': name, 'error': str(ex)})

        frappe.db.commit()

    return {
        'queued': True, 'success': success, 'failed': failed,
        'already_enrolled_count': len(already_enrolled),
        'to_process_count': len(to_process),
        'total_selected': len(names),
        'success_count': len(success),
        'failed_count': len(failed)
    }
