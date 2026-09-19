import { vietQrPayload } from "@lms/shared";
import qrcode from "qrcode-generator";
import { formatDay, formatVnd, formatWhen } from "@/features/format";
import { periodLabel } from "./period";
import { hasPaymentInfo, type SheetData } from "./sheet";

/** The words on the picture. They come from the message catalog, so nothing is written here. */
export interface PngLabels {
  receipt: string;
  receiptVi: string;
  number: string;
  draftNumber: string;
  from: string;
  to: string;
  month: string;
  sentOn: string;
  due: string;
  description: string;
  howMany: string;
  price: string;
  amount: string;
  total: string;
  perLesson: string;
  lessonOne: string;
  /** "{n} lessons" */
  lessonMany: string;
  /** "Lessons on: {days}" */
  lessonDays: string;
  paidOn: string;
  stampPaid: string;
  note: string;
  howToPay: string;
  payTo: string;
  phone: string;
  bank: string;
  account: string;
  holder: string;
  scan: string;
  notTax: string;
}

const WIDTH = 900;
const PAD = 48;
const SCALE = 2; // the picture is made twice as big as it looks, so it stays sharp on a phone
const FONT = `"Inter Variable", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
const INK = "#111827";
const MUTED = "#6b7280";
const LINE = "#e5e7eb";
const BOX = "#f3f4f6";
const GREEN = "#15803d";

/** True when the receipt has to be paid and has what a payment QR needs. */
export function qrTextOf(data: SheetData): string | null {
  if (data.status !== "sent" || !data.number) return null;
  return vietQrPayload({
    bin: data.payee.bankBin,
    account: data.payee.bankAccount,
    amount: data.total,
    message: data.number,
  });
}

/** The dark squares of a QR code, or null when there is nothing to show. */
export function qrModules(text: string): boolean[][] {
  const qr = qrcode(0, "M");
  qr.addData(text);
  qr.make();
  const n = qr.getModuleCount();
  return Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => qr.isDark(r, c)));
}

type Ctx = CanvasRenderingContext2D;

interface Style {
  size: number;
  weight?: number;
  color?: string;
}
const font = (s: Style) => `${s.weight ?? 400} ${s.size}px ${FONT}`;

/** Breaks a text into lines that fit `width`. A word that is too long is cut. */
function wrap(ctx: Ctx, text: string, width: number): string[] {
  const out: string[] = [];
  for (const paragraph of text.split(/\r?\n/)) {
    let line = "";
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const tryLine = line ? `${line} ${word}` : word;
      if (ctx.measureText(tryLine).width <= width) {
        line = tryLine;
        continue;
      }
      if (line) out.push(line);
      line = word;
      while (ctx.measureText(line).width > width && line.length > 1) {
        let cut = line.length - 1;
        while (cut > 1 && ctx.measureText(line.slice(0, cut)).width > width) cut--;
        out.push(line.slice(0, cut));
        line = line.slice(cut);
      }
    }
    out.push(line);
  }
  return out;
}

/**
 * Draws the receipt from top to bottom and returns how tall it is. With `paint` false nothing is drawn: it only measures,
 * so the picture can be made exactly as tall as it needs to be.
 */
function layout(ctx: Ctx, data: SheetData, t: PngLabels, qr: boolean[][] | null, paint: boolean): number {
  let y = PAD;
  const right = WIDTH - PAD;
  // When false, words are measured but not drawn (used to find how tall a block is before its background is drawn).
  let drawing = true;

  const text = (s: string, x: number, style: Style, align: CanvasTextAlign = "left") => {
    if (!paint || !drawing) return;
    ctx.font = font(style);
    ctx.fillStyle = style.color ?? INK;
    ctx.textAlign = align;
    ctx.textBaseline = "alphabetic";
    ctx.fillText(s, x, y);
  };
  /** A paragraph in a column; moves `y` down and returns nothing. */
  const paragraph = (s: string, x: number, width: number, style: Style, lineHeight: number) => {
    ctx.font = font(style);
    for (const line of wrap(ctx, s, width)) {
      y += lineHeight;
      text(line, x, style);
    }
  };
  const rule = (yy: number) => {
    if (!paint) return;
    ctx.fillStyle = LINE;
    ctx.fillRect(PAD, yy, WIDTH - 2 * PAD, 1.5);
  };

  // --- heading
  y += 34;
  text(t.receipt, PAD, { size: 36, weight: 700 });
  text(data.number ?? t.draftNumber, right, { size: 24, weight: 700 }, "right");
  y += 28;
  text(t.receiptVi, PAD, { size: 18, color: MUTED });
  if (data.status === "paid") text(t.stampPaid, right, { size: 18, weight: 700, color: GREEN }, "right");
  y += 26;
  rule(y);
  y += 12;

  // --- who, when
  const facts: [string, string][] = [
    [t.from, data.teacherName],
    [t.to, data.studentName],
    [t.month, periodLabel(data.period)],
    ...(data.sentAt ? ([[t.sentOn, formatWhen(data.sentAt)]] as [string, string][]) : []),
    ...(data.dueDate ? ([[t.due, formatDay(data.dueDate)]] as [string, string][]) : []),
  ];
  const colW = (WIDTH - 2 * PAD) / 2;
  for (let i = 0; i < facts.length; i += 2) {
    const rowTop = y;
    let rowBottom = y;
    for (const [j, [label, value]] of facts.slice(i, i + 2).entries()) {
      y = rowTop + 26;
      const x = PAD + j * colW;
      text(label, x, { size: 15, color: MUTED });
      ctx.font = font({ size: 19, weight: 600 });
      for (const line of wrap(ctx, value, colW - 24)) {
        y += 26;
        text(line, x, { size: 19, weight: 600 });
      }
      rowBottom = Math.max(rowBottom, y);
    }
    y = rowBottom + 8;
  }
  y += 10;

  // --- the table
  const cols = { what: PAD, howMany: 560, price: 720, amount: right };
  y += 24;
  text(t.description, cols.what, { size: 15, weight: 600, color: MUTED });
  text(t.howMany, cols.howMany, { size: 15, weight: 600, color: MUTED }, "right");
  text(t.price, cols.price, { size: 15, weight: 600, color: MUTED }, "right");
  text(t.amount, cols.amount, { size: 15, weight: 600, color: MUTED }, "right");
  y += 12;
  rule(y);
  for (const l of data.lines) {
    const top = y;
    y += 8;
    paragraph(l.description, cols.what, 380, { size: 19, weight: 600 }, 26);
    if (l.dates.length > 0) {
      const days = l.dates.map((d) => formatDay(d).slice(0, 5)).join(", ");
      paragraph(t.lessonDays.replace("{days}", days), cols.what, 380, { size: 15, color: MUTED }, 21);
    }
    const bottom = y;
    y = top + 8 + 26;
    const many = l.quantity === 1 ? t.lessonOne : t.lessonMany.replace("{n}", String(l.quantity));
    text(l.perLesson ? many : String(l.quantity), cols.howMany, { size: 18 }, "right");
    text(formatVnd(l.unitPrice), cols.price, { size: 18 }, "right");
    if (l.perLesson) {
      y += 20;
      text(t.perLesson, cols.price, { size: 13, color: MUTED }, "right");
      y -= 20;
    }
    text(formatVnd(l.amount), cols.amount, { size: 18 }, "right");
    y = Math.max(bottom, y + (l.perLesson ? 22 : 0)) + 14;
    rule(y);
  }

  // --- total
  y += 40;
  const totalText = formatVnd(data.total);
  ctx.font = font({ size: 30, weight: 700 });
  const totalWidth = ctx.measureText(totalText).width;
  text(t.total, cols.amount - totalWidth - 20, { size: 20, weight: 600, color: MUTED }, "right");
  text(totalText, cols.amount, { size: 30, weight: 700 }, "right");
  y += 16;

  if (data.status === "paid" && data.paidAt) {
    y += 26;
    text(t.paidOn.replace("{date}", formatWhen(data.paidAt)), PAD, { size: 17, color: GREEN });
  }

  // --- note
  if (data.note) {
    y += 34;
    text(t.note, PAD, { size: 15, color: MUTED });
    paragraph(data.note, PAD, WIDTH - 2 * PAD, { size: 18 }, 25);
  }

  // --- how to pay: details on the left, the QR on the right
  const p = data.payee;
  // A receipt that is paid has nothing more to pay, so the payment box is left out.
  if (data.status !== "paid" && (hasPaymentInfo(p) || qr)) {
    y += 30;
    const boxTop = y;
    const qrSize = qr ? 236 : 0;
    const textW = WIDTH - 2 * PAD - 2 * 24 - (qr ? qrSize + 24 : 0);
    const rows = (
      [
        [t.payTo, p.payeeName, false],
        [t.bank, p.bankName, false],
        [t.account, p.bankAccount, true],
        [t.holder, p.bankHolder, false],
        [t.phone, p.payeePhone, false],
      ] as [string, string, boolean][]
    ).filter((r) => r[1] !== "");
    /** The words of the block, from `top` down. Returns where they end. */
    const words = (top: number): number => {
      y = top + 24 + 22;
      text(t.howToPay, PAD + 24, { size: 20, weight: 700 });
      for (const [label, value, big] of rows) {
        y += 30;
        text(label, PAD + 24, { size: 14, color: MUTED });
        y += 4;
        ctx.font = font({ size: big ? 24 : 18, weight: 600 });
        for (const line of wrap(ctx, value, textW)) {
          y += big ? 28 : 24;
          text(line, PAD + 24, { size: big ? 24 : 18, weight: 600 });
        }
      }
      if (p.paymentNote) {
        y += 12;
        paragraph(p.paymentNote, PAD + 24, textW, { size: 16, color: MUTED }, 22);
      }
      return y;
    };
    drawing = false;
    const textBottom = words(boxTop);
    drawing = true;
    const qrBottom = qr ? boxTop + 24 + qrSize + 40 : 0;
    const boxBottom = Math.max(textBottom, qrBottom) + 24;
    if (paint) {
      ctx.fillStyle = BOX;
      ctx.beginPath();
      ctx.roundRect(PAD, boxTop, WIDTH - 2 * PAD, boxBottom - boxTop, 14);
      ctx.fill();
    }
    words(boxTop);
    if (qr && paint) {
      const qx = right - 24 - qrSize;
      const qy = boxTop + 24;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(qx, qy, qrSize, qrSize);
      const cell = Math.floor(qrSize / (qr.length + 6));
      const drawn = cell * qr.length;
      const ox = qx + Math.floor((qrSize - drawn) / 2);
      const oy = qy + Math.floor((qrSize - drawn) / 2);
      ctx.fillStyle = "#000000";
      for (let r = 0; r < qr.length; r++)
        for (let c = 0; c < qr.length; c++)
          if (qr[r]![c]) ctx.fillRect(ox + c * cell, oy + r * cell, cell, cell);
      ctx.textAlign = "center";
      ctx.font = font({ size: 14 });
      ctx.fillStyle = MUTED;
      ctx.fillText(t.scan, qx + qrSize / 2, qy + qrSize + 24);
    }
    y = boxBottom;
  }

  // --- footer
  y += 34;
  rule(y);
  y += 30;
  text(t.notTax, PAD, { size: 14, color: MUTED });
  return y + PAD - 8;
}

/** Loads the letters the picture needs, so that the text is drawn in the app's font (also Vietnamese letters). */
async function loadFonts(texts: string[]): Promise<void> {
  const sample = texts.join(" ");
  await Promise.all(
    [400, 600, 700].map((w) => document.fonts.load(`${w} 18px "Inter Variable"`, sample).catch(() => [])),
  );
}

/** Draws the receipt as a PNG picture. The payment QR is part of it when the receipt is sent and has the bank details. */
export async function receiptToPng(data: SheetData, t: PngLabels): Promise<Blob> {
  await loadFonts([
    ...Object.values(t),
    data.teacherName,
    data.studentName,
    data.note,
    ...Object.values(data.payee),
    ...data.lines.map((l) => l.description),
  ]);
  const qrText = qrTextOf(data);
  const qr = qrText ? qrModules(qrText) : null;
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH * SCALE;
  canvas.height = 4000 * SCALE;
  let ctx = canvas.getContext("2d")!;
  ctx.scale(SCALE, SCALE);
  const height = Math.ceil(layout(ctx, data, t, qr, false));
  canvas.height = height * SCALE; // (this clears the canvas and its settings)
  ctx = canvas.getContext("2d")!;
  ctx.scale(SCALE, SCALE);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, WIDTH, height);
  layout(ctx, data, t, qr, true);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not make the picture."))), "image/png"),
  );
}

/** Makes the picture and saves it as a file on the computer (or phone) of the person. */
export async function downloadReceiptPng(data: SheetData, t: PngLabels, filename: string): Promise<void> {
  const blob = await receiptToPng(data, t);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
