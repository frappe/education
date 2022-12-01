import frappe

def execute():
    if not frappe.db.exists("Assessment Group", "All Assessment Groups"):
        frappe.get_doc({
            "doctype": "Assessment Group",
            "assessment_group_name": "All Assessment Groups",
            "is_group": 1
        }).insert(ignore_mandatory=True)

    if frappe.db.exists("Assessment Group", "All Assessment Groups 2"):
        frappe.delete_doc("Assessment Group", "All Assessment Groups 2")