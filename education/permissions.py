import frappe
from education.education.utils import get_user_id_from_instructor
# check if user is the class instructor assigned to the relevant student group
def instructor_has_permission(doc, user=None, permission_type=None):
    roles = frappe.get_roles(user)
    student_group = frappe.get_doc("Student Group", doc.student_group)
    if ("Education Manager" in roles) or ("Administrator" in roles) or ("System Manager" in roles):
        return True
    if "Class Instructor" in roles:
        user_ids = []
        for instructor in student_group.instructors:
            id = get_user_id_from_instructor(instructor.instructor)
            if id:
                user_ids.append(id)
        if user in user_ids:
            return True

    return False
