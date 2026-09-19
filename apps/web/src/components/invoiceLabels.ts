import type { InvoiceStatus } from "@lms/shared";
import { messages } from "@/messages";

const t = messages.invoices;

/** The words and colors for the state of a receipt. One place, used by every screen. */
export const invoiceStatusText: Record<InvoiceStatus, string> = {
  draft: t.statusDraft,
  sent: t.statusSent,
  paid: t.statusPaid,
  void: t.statusVoid,
};
export const invoiceStatusTone = {
  draft: "warning",
  sent: "info",
  paid: "success",
  void: "neutral",
} as const;
