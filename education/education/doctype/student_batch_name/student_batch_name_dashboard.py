def get_data():
	return {
		"fieldname": "student_batch",
		"transactions": [
			{"label": "Enrollment", "items": ["Course Enrollment"]},
			{"label": "Academics", "items": ["Subject Schedule", "Student Attendance"]},
			{
				"label": "Assessment",
				"items": ["Assessment Plan", "Assessment Result", "Grade Book"],
			},
			{"label": "Fees", "items": ["Fee Schedule"]},
		],
	}
