import type { InvoiceLine, InvoiceStatus, PaymentDetails } from "@lms/shared";

/** Everything the printed receipt shows. Both a draft on screen and a sent receipt can be turned into this. */
export interface SheetData {
  number: string | null;
  status: InvoiceStatus;
  teacherName: string;
  studentName: string;
  period: string;
  lines: Pick<InvoiceLine, "description" | "quantity" | "unitPrice" | "amount" | "dates">[];
  total: number;
  note: string;
  dueDate: string | null;
  sentAt: string | null;
  paidAt: string | null;
  payee: PaymentDetails;
}

/** True when there is something to tell the student about how to pay. */
export const hasPaymentInfo = (p: PaymentDetails): boolean => Object.values(p).some((v) => v.trim() !== "");
