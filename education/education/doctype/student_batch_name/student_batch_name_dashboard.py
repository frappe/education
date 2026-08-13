def get_data():
	return {
		"fieldname": "student_batch",
		"non_standard_fieldnames": {
			"Program Enrollment": "student_batch_name",
		},
		"transactions": [
			{"label": "Enrollment", "items": ["Course Enrollment", "Program Enrollment"]},
			{"label": "Academics", "items": ["Course Schedule", "Student Attendance"]},
			{"label": "Assessment", "items": ["Assessment Plan", "Assessment Result"]},
			{"label": "Fees", "items": ["Fee Schedule"]},
		],
	}
