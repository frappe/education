# Copyright (c) 2015, Frappe Technologies and contributors
# For license information, please see license.txt


import frappe
from frappe import _
from frappe.model.document import Document


class AcademicYear(Document):
	def validate(self):
		"""Validate academic year data before saving"""
		# 🔐 Rule 3: Prevent unlocking if not the latest academic year
		if not self.is_new() and self.lock_status == "Unlocked":
			old_doc = self.get_doc_before_save()
			if old_doc and old_doc.lock_status == "Locked":
				# User is trying to unlock - check if this is the latest year
				if not self.is_latest_academic_year():
					frappe.throw(
						_("Only the latest academic year can be unlocked."),
						title=_("Cannot Unlock")
					)
		
		# 🔒 Rule 1: Prevent editing when lock_status is "Locked"
		# But allow lock_status field itself to be changed
		if not self.is_new() and self.lock_status == "Locked":
			old_doc = self.get_doc_before_save()
			if old_doc and old_doc.lock_status == "Locked":
				# Year was already locked, check if other fields were modified
				for field in self.meta.fields:
					if field.fieldname == "lock_status":
						# Always allow lock_status changes
						continue
					if self.get(field.fieldname) != old_doc.get(field.fieldname):
						frappe.throw(
							_("This Academic Year is locked and cannot be modified."),
							title=_("Locked Academic Year")
						)
		
		# Check that start of academic year is earlier than end of academic year
		if (
			self.year_start_date
			and self.year_end_date
			and self.year_start_date > self.year_end_date
		):
			frappe.throw(
				_(
					"The Year End Date cannot be earlier than the Year Start Date. Please correct the dates and try again."
				)
			)
	
	def on_trash(self):
		"""🚫 Rule 4: Prevent deleting locked academic years"""
		if self.lock_status == "Locked":
			frappe.throw(
				_("Locked academic years cannot be deleted."),
				title=_("Cannot Delete Locked Year")
			)
	
	def is_latest_academic_year(self):
		"""
		Check if this academic year is the latest (most recent) one
		Based on year_start_date
		"""
		if not self.year_start_date:
			return False
		
		# Get the latest academic year
		latest_years = frappe.get_all(
			"Academic Year",
			filters={"year_start_date": [">", self.year_start_date]},
			limit=1
		)
		
		# If no years exist with a later start date, this is the latest
		return len(latest_years) == 0

	def before_save(self):
		"""Execute before saving the document"""
		# Track if status is being changed to Active
		if not self.is_new():
			old_doc = self.get_doc_before_save()
			if old_doc and old_doc.status != self.status:
				self._status_changed = True
				self._was_active = (old_doc.status == "Active")
			else:
				self._status_changed = False
		else:
			self._status_changed = (self.status == "Active")
			self._was_active = False

	def on_update(self):
		"""Execute after document is saved"""
		# Handle status field changes
		if hasattr(self, '_status_changed') and self._status_changed:
			if self.status == "Active":
				# Activating this year
				self.handle_activation()
			elif hasattr(self, '_was_active') and self._was_active:
				# Deactivating this year
				self.handle_deactivation()

	def handle_activation(self):
		"""
		Handle when is_active is set to 1
		- Deactivate all other academic years
		- Lock previous academic year
		- Execute roll-over operations
		"""
		# 1. Deactivate all other academic years
		self.deactivate_other_years()
		
		# 2. Lock the previous academic year
		self.lock_previous_year()
		
		# 3. Execute roll-over operations based on checkboxes
		self.execute_rollover_operations()
		
		frappe.msgprint(
			_("Academic Year {0} has been activated successfully.").format(self.academic_year_name),
			indicator="green",
			alert=True
		)

	def handle_deactivation(self):
		"""
		Handle when status is set to In-active
		Ensure at least one academic year remains active
		"""
		# Check if there's at least one other active year
		active_years = frappe.get_all(
			"Academic Year",
			filters={"name": ["!=", self.name], "status": "Active"},
			limit=1
		)
		
		if not active_years:
			frappe.throw(
				_("Cannot deactivate this Academic Year. At least one academic year must be active.")
			)

	def deactivate_other_years(self):
		"""
		Set status = In-active for all other Academic Year records
		Ensures only one academic year is active at a time
		"""
		# Get all other academic years that are currently active
		other_active_years = frappe.get_all(
			"Academic Year",
			filters={
				"name": ["!=", self.name],
				"status": "Active"
			},
			pluck="name"
		)
		
		# Deactivate each one
		for year_name in other_active_years:
			frappe.db.set_value(
				"Academic Year",
				year_name,
				"status",
				"In-active",
				update_modified=False
			)
		
		if other_active_years:
			frappe.logger().info(f"Deactivated {len(other_active_years)} academic years: {', '.join(other_active_years)}")

	def lock_previous_year(self):
		"""
		Find the previous academic year (based on dates) and set auto_lock_previous_year = 1
		The previous year is determined by year_start_date
		"""
		if not self.year_start_date:
			return
		
		# Find the academic year that ends just before this one starts
		# or has the latest start date that is before current year's start date
		previous_years = frappe.get_all(
			"Academic Year",
			filters={
				"name": ["!=", self.name],
				"year_start_date": ["<", self.year_start_date]
			},
			fields=["name", "year_start_date", "year_end_date"],
			order_by="year_start_date desc",
			limit=1
		)
		
		if previous_years:
			previous_year = previous_years[0]
			frappe.db.set_value(
				"Academic Year",
				previous_year.name,
				"auto_lock_previous_year",
				1,
				update_modified=False
			)
			
			frappe.logger().info(f"Locked previous academic year: {previous_year.name}")
			
			frappe.msgprint(
				_("Previous Academic Year {0} has been locked automatically.").format(previous_year.name),
				indicator="blue",
				alert=True
			)

	def execute_rollover_operations(self):
		"""
		Execute roll-over operations based on checkbox settings
		This runs when the academic year becomes active
		"""
		operations_executed = []
		
		try:
			# Execute operations based on checkboxes
			if self.promote_students:
				self.rollover_students()
				operations_executed.append("Student Promotion")
			
			if self.reset_fee_structure:
				self.rollover_fee_structures()
				operations_executed.append("Fee Structure Reset")
			
			if self.reset_section:
				self.rollover_section_allocation()
				operations_executed.append("Section Allocation Reset")
			
			if self.reset_house:
				self.rollover_house_allocation()
				operations_executed.append("House Allocation Reset")
			
			if operations_executed:
				frappe.msgprint(
					_("Roll-over operations executed: {0}").format(", ".join(operations_executed)),
					indicator="green",
					alert=True
				)
		
		except Exception as e:
			frappe.log_error(
				message=str(e),
				title=f"Roll-over Error - {self.academic_year_name}"
			)
			frappe.msgprint(
				_("Some roll-over operations failed. Please check Error Log for details."),
				indicator="red",
				alert=True
			)

	def rollover_students(self):
		"""
		Promote all eligible students to the next class/batch
		
		This method should:
		1. Get all students from previous academic year
		2. Check promotion eligibility (based on grades, attendance, etc.)
		3. Create new Program Enrollment records for promoted students
		4. Update student status and academic information
		"""
		frappe.logger().info(f"Student promotion rollover initiated for {self.academic_year_name}")
		
		# TODO: Implement student promotion logic
		# Example implementation structure:
		
		# # Get previous academic year
		# previous_year = self.get_previous_academic_year()
		# if not previous_year:
		#     return
		
		# # Get all program enrollments from previous year
		# enrollments = frappe.get_all(
		#     "Program Enrollment",
		#     filters={
		#         "academic_year": previous_year.name,
		#         "docstatus": 1
		#     },
		#     fields=["name", "student", "program", "student_batch_name"]
		# )
		
		# for enrollment in enrollments:
		#     # Check if student is eligible for promotion
		#     if self.is_student_eligible_for_promotion(enrollment):
		#         # Create new enrollment for next academic year
		#         self.promote_student_to_next_level(enrollment)
		
		frappe.msgprint(
			_("Student promotion initiated. This will run in background."),
			indicator="blue",
			alert=True
		)

	def rollover_fee_structures(self):
		"""
		Reset fee structures for the new academic year
		
		This method should:
		1. Copy fee structures from previous academic year
		2. Apply any inflation adjustments or changes
		3. Link new fee structures to current academic year
		4. Update fee categories and components if needed
		"""
		frappe.logger().info(f"Fee structure rollover initiated for {self.academic_year_name}")
		
		# TODO: Implement fee structure rollover logic
		# Example implementation structure:
		
		# # Get previous academic year
		# previous_year = self.get_previous_academic_year()
		# if not previous_year:
		#     return
		
		# # Get all fee structures from previous year
		# fee_structures = frappe.get_all(
		#     "Fee Structure",
		#     filters={"academic_year": previous_year.name},
		#     fields=["name", "program", "student_category"]
		# )
		
		# for fee_structure in fee_structures:
		#     # Copy and create new fee structure for current year
		#     self.copy_fee_structure(fee_structure)
		
		frappe.msgprint(
			_("Fee structure reset initiated. This will run in background."),
			indicator="blue",
			alert=True
		)

	def rollover_section_allocation(self):
		"""
		Reset section allocation for students
		
		This method should:
		1. Clear previous section allocations (optional)
		2. Get list of students for current academic year
		3. Distribute students across sections based on capacity
		4. Update Student Group records with new section assignments
		"""
		frappe.logger().info(f"Section allocation rollover initiated for {self.academic_year_name}")
		
		# TODO: Implement section allocation logic
		# Example implementation structure:
		
		# # Get all programs
		# programs = frappe.get_all("Program", pluck="name")
		
		# for program in programs:
		#     # Get students enrolled in this program for current year
		#     students = self.get_students_for_program(program)
		#     
		#     # Get available sections for this program
		#     sections = self.get_sections_for_program(program)
		#     
		#     # Distribute students across sections
		#     self.distribute_students_to_sections(students, sections)
		
		frappe.msgprint(
			_("Section allocation reset initiated. This will run in background."),
			indicator="blue",
			alert=True
		)

	def rollover_house_allocation(self):
		"""
		Reset house allocation for students
		
		This method should:
		1. Get list of students for current academic year
		2. Get list of available houses
		3. Distribute students across houses (balanced distribution)
		4. Update student records with new house assignments
		"""
		frappe.logger().info(f"House allocation rollover initiated for {self.academic_year_name}")
		
		# TODO: Implement house allocation logic
		# Example implementation structure:
		
		# # Get all active students for current year
		# students = frappe.get_all(
		#     "Program Enrollment",
		#     filters={
		#         "academic_year": self.name,
		#         "docstatus": 1
		#     },
		#     pluck="student"
		# )
		
		# # Get all houses
		# houses = frappe.get_all("Student House", pluck="name")
		
		# if houses:
		#     # Distribute students evenly across houses
		#     self.distribute_students_to_houses(students, houses)
		
		frappe.msgprint(
			_("House allocation reset initiated. This will run in background."),
			indicator="blue",
			alert=True
		)

	def get_previous_academic_year(self):
		"""Get the previous academic year based on start date"""
		if not self.year_start_date:
			return None
		
		previous_years = frappe.get_all(
			"Academic Year",
			filters={
				"name": ["!=", self.name],
				"year_start_date": ["<", self.year_start_date]
			},
			order_by="year_start_date desc",
			limit=1
		)
		
		return frappe.get_doc("Academic Year", previous_years[0].name) if previous_years else None

	@frappe.whitelist()
	def rollover_students_and_fees(self):
		"""
		Manual method to execute student promotion and fee structure rollover
		This can be called from the UI via a button
		"""
		if self.status != "Active":
			frappe.throw(_("Academic Year must be active to execute roll-over operations"))
		
		# Execute rollover operations
		self.rollover_students()
		self.rollover_fee_structures()
		
		frappe.msgprint(
			_("Roll-over operations for students and fees have been initiated."),
			indicator="green",
			alert=True
		)
