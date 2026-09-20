import { vietQrPayload } from "@lms/shared";
import qrcode from "qrcode-generator";
import type { SheetData } from "./sheet";

/** The text inside the payment QR of a receipt, or null when the bank details or the total cannot make one. */
function qrTextFor(data: SheetData, message: string): string | null {
  return vietQrPayload({
    bin: data.payee.bankBin,
    account: data.payee.bankAccount,
    amount: data.total,
    message,
  });
}

/** The text inside the payment QR. It is only made for a receipt that was sent and is waiting to be paid. */
export function qrTextOf(data: SheetData): string | null {
  if (data.status !== "sent" || !data.number) return null;
  return qrTextFor(data, data.number);
}

/** The text of the QR on a draft, to look at before sending. The number of the receipt is not known yet, so it has no transfer message. */
export function draftQrText(data: SheetData): string | null {
  return data.status === "draft" ? qrTextFor(data, "") : null;
}

/** True when the receipt will get a payment QR once it is sent (used to tell the teacher, on a draft). */
export function willHaveQr(data: SheetData): boolean {
  return data.status === "draft" && qrTextFor(data, "DRAFT") !== null;
}

/** The dark squares of a QR code. */
export function qrModules(text: string): boolean[][] {
  const qr = qrcode(0, "M");
  qr.addData(text);
  qr.make();
  const n = qr.getModuleCount();
  return Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => qr.isDark(r, c)));
}

/** The dark squares as one SVG path (each square is 1 unit wide), so a screen can draw the code as a sharp picture. */
export function qrPath(modules: boolean[][]): string {
  const parts: string[] = [];
  modules.forEach((row, r) =>
    row.forEach((dark, c) => {
      if (dark) parts.push(`M${c} ${r}h1v1h-1z`);
    }),
  );
  return parts.join("");
}
