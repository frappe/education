import type { InvoiceInfo, InvoiceLine, InvoiceStatus, MyInvoiceDetail, PaymentDetails } from "@lms/shared";

/** Everything the printed receipt shows. Both a draft on screen and a sent receipt can be turned into this. */
export interface SheetData {
  number: string | null;
  status: InvoiceStatus;
  teacherName: string;
  studentName: string;
  period: string;
  lines: (Pick<InvoiceLine, "description" | "quantity" | "unitPrice" | "amount" | "dates"> & {
    /** A line made from lessons: the quantity is a number of lessons and the price is for one lesson. */
    perLesson: boolean;
    /** A discount: the amount is below 0 and there is no quantity or price to show. */
    discount: boolean;
  })[];
  total: number;
  note: string;
  dueDate: string | null;
  sentAt: string | null;
  paidAt: string | null;
  payee: PaymentDetails;
}

/** True when there is something to tell the student about how to pay. */
export const hasPaymentInfo = (p: PaymentDetails): boolean => Object.values(p).some((v) => v.trim() !== "");

/** A receipt from the server, ready to show. A line with a course is made from lessons. */
export const sheetOf = (inv: InvoiceInfo | MyInvoiceDetail): SheetData => ({
  ...inv,
  lines: inv.lines.map((l) => ({ ...l, perLesson: l.courseId !== null, discount: l.discount !== null })),
});
