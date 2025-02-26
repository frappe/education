# education/education/setup.py
from frappe import _

def get_data():
    return {
        "fieldname": "school",
        "transactions": [
            {"label": _("Student"), "items": ["Student", "Student Group"]},
            {"label": _("Fee"), "items": ["Fees", "Fee Structure"]},
        ],
    }

data = get_data()
