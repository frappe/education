import { saveFile } from "@/features/download";

/** A list with the columns the import reads, and two example students to replace. */
export const SAMPLE_STUDENT_CSV = [
  "name,email,phone",
  "Nguyen Van An,an.nguyen@example.com,0901234567",
  "Tran Thi Binh,binh.tran@example.com,",
].join("\r\n");

export const SAMPLE_FILE_NAME = "students-sample.csv";

/**
 * Saves the sample list as a file. It starts with a byte order mark, so that Excel shows letters such as
 * "ễ" and "ạ" right when the file is opened.
 */
export function downloadSampleStudents(): void {
  saveFile(new Blob(["﻿", SAMPLE_STUDENT_CSV, "\r\n"], { type: "text/csv;charset=utf-8" }), SAMPLE_FILE_NAME);
}
