# Copyright (c) 2015, Frappe Technologies and Contributors
# See license.txt

import unittest

import frappe

from education.education.doctype.topic.test_topic import (
    make_topic, make_topic_and_linked_content)

# test_records = frappe.get_test_records('Subject')


class TestSubject(unittest.TestCase):
	def setUp(self):
		make_topic_and_linked_content(
			"_Test Topic 1", [{"type": "Article", "name": "_Test Article 1"}]
		)
		make_topic_and_linked_content(
			"_Test Topic 2", [{"type": "Article", "name": "_Test Article 2"}]
		)
		make_subject_and_linked_topic("_Test Subject 1", ["_Test Topic 1", "_Test Topic 2"])

	def test_get_topics(self):
		subject = frappe.get_doc("Subject", "_Test Subject 1")
		topics = subject.get_topics()
		self.assertEqual(topics[0].name, "_Test Topic 1")
		self.assertEqual(topics[1].name, "_Test Topic 2")
		frappe.db.rollback()


def make_subject(name):
	try:
		subject = frappe.get_doc("Subject", name)
	except frappe.DoesNotExistError:
		subject = frappe.get_doc(
			{"doctype": "Subject", "subject_name": name, "subject_code": name}
		).insert()
	return subject.name


def make_subject_and_linked_topic(subject_name, topic_name_list):
	try:
		subject = frappe.get_doc("Subject", subject_name)
	except frappe.DoesNotExistError:
		make_subject(subject_name)
		subject = frappe.get_doc("Subject", subject_name)
	topic_list = [make_topic(topic_name) for topic_name in topic_name_list]
	for topic in topic_list:
		subject.append("topics", {"topic": topic})
	subject.save()
	return subject
