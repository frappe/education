# Copyright (c) 2015, Frappe Technologies and Contributors
# See license.txt

import unittest

import frappe

from education.education.doctype.course.test_course import (
    make_course, make_course_and_linked_topic)
from education.education.doctype.topic.test_topic import \
    make_topic_and_linked_content

test_data = {
	"class_name": "_Test Class",
	"description": "_Test Class",
	"course": [
		{
			"course_name": "_Test Course 1",
			"topic": [
				{
					"topic_name": "_Test Topic 1-1",
					"content": [
						{"type": "Article", "name": "_Test Article 1-1"},
						{"type": "Article", "name": "_Test Article 1-2"},
					],
				},
				{
					"topic_name": "_Test Topic 1-2",
					"content": [
						{"type": "Article", "name": "_Test Article 1-3"},
						{"type": "Article", "name": "_Test Article 1-4"},
					],
				},
			],
		}
	],
}


class TestClass(unittest.TestCase):
	def setUp(self):
		make_class_and_linked_courses(
			"_Test Class 1", ["_Test Course 1", "_Test Course 2"]
		)

	def test_get_course_list(self):
		class = frappe.get_doc("Class", "_Test Class 1")
		course = class.get_course_list()
		self.assertEqual(course[0].name, "_Test Course 1")
		self.assertEqual(course[1].name, "_Test Course 2")
		frappe.db.rollback()

	def tearDown(self):
		for dt in ["Class", "Course", "Topic", "Article"]:
			for entry in frappe.get_all(dt):
				frappe.delete_doc(dt, entry.class)


def make_class(name):
	class = frappe.get_doc(
		{
			"doctype": "Class",
			"class_name": name,
			"class_code": name,
			"description": "_test description",
			"is_published": True,
			"is_featured": True,
		}
	).insert()
	return class.name


def make_class_and_linked_courses(class_name, course_name_list):
	try:
		class = frappe.get_doc("Class", class_name)
	except frappe.DoesNotExistError:
		make_class(class_name)
		class = frappe.get_doc("Class", class_name)
	course_list = [make_course(course_name) for course_name in course_name_list]
	for course in course_list:
		class.append("courses", {"course": course, "required": 1})
	class.save()
	return class


def setup_class():
	topic_list = [course["topic"] for course in test_data["course"]]
	for topic in topic_list[0]:
		make_topic_and_linked_content(topic["topic_name"], topic["content"])

	all_courses_list = [
		{
			"course": course["course_name"],
			"topic": [topic["topic_name"] for topic in course["topic"]],
		}
		for course in test_data["course"]
	]  # returns [{'course': 'Applied Math', 'topic': ['Trignometry', 'Geometry']}]
	for course in all_courses_list:
		make_course_and_linked_topic(course["course"], course["topic"])

	course_list = [course["course_name"] for course in test_data["course"]]
	class = make_class_and_linked_courses(test_data["class_name"], course_list)
	return class
