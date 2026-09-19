import {
  createInvoiceBody,
  generateInvoicesBody,
  invoiceVersionBody,
  setInvoiceLessonsBody,
  paymentDetailsBody,
  period,
  updateInvoiceBody,
  voidInvoiceBody,
} from "@lms/shared";
import { Hono } from "hono";
import { z } from "zod";
import { makeCtx } from "../auth/service";
import type { AppBindings } from "../env";
import {
  createOne,
  generate,
  invoiceDelete,
  invoiceGet,
  invoiceList,
  invoicePaid,
  invoiceSetLessons,
  invoiceSummary,
  invoiceSend,
  invoiceUnpaid,
  invoiceUpdate,
  invoiceVoid,
  paymentGet,
  paymentSet,
  unbilledList,
  unbilledLessons,
} from "../invoices/service";
import { actorOf, requireTeacher } from "../middleware/auth";
import { parseBody } from "./helpers";

/** Teacher only. The tenant always comes from the session, never from the request. */
export const invoices = new Hono<AppBindings>();

invoices.get("/invoices", requireTeacher, async (c) => {
  const q = z.object({ period }).parse(c.req.query()); // a bad month becomes a normal VALIDATION_FAILED error
  return c.json(await invoiceList(await makeCtx(c), actorOf(c), q.period));
});

// These two come before "/invoices/:id" so that the names "unbilled" and "lessons" are not taken for an id.
invoices.get("/invoices/summary", requireTeacher, async (c) => {
  return c.json({ summary: await invoiceSummary(await makeCtx(c), actorOf(c)) });
});

invoices.get("/invoices/unbilled", requireTeacher, async (c) => {
  return c.json({ students: await unbilledList(await makeCtx(c), actorOf(c)) });
});

invoices.get("/invoices/lessons", requireTeacher, async (c) => {
  const q = z
    .object({ studentId: z.string().min(1).max(40), invoiceId: z.string().min(1).max(40).optional() })
    .parse(c.req.query());
  return c.json({
    lessons: await unbilledLessons(await makeCtx(c), actorOf(c), q.studentId, q.invoiceId ?? null),
  });
});

invoices.post("/invoices/generate", requireTeacher, async (c) => {
  const body = await parseBody(c, generateInvoicesBody);
  return c.json(await generate(await makeCtx(c), actorOf(c), body.period), 201);
});

invoices.post("/invoices", requireTeacher, async (c) => {
  const body = await parseBody(c, createInvoiceBody);
  return c.json({ invoice: await createOne(await makeCtx(c), actorOf(c), body) }, 201);
});

invoices.get("/invoices/:id", requireTeacher, async (c) => {
  return c.json({ invoice: await invoiceGet(await makeCtx(c), actorOf(c), c.req.param("id")) });
});

invoices.put("/invoices/:id", requireTeacher, async (c) => {
  const body = await parseBody(c, updateInvoiceBody);
  return c.json({ invoice: await invoiceUpdate(await makeCtx(c), actorOf(c), c.req.param("id"), body) });
});

invoices.delete("/invoices/:id", requireTeacher, async (c) => {
  const body = await parseBody(c, invoiceVersionBody);
  await invoiceDelete(await makeCtx(c), actorOf(c), c.req.param("id"), body.version);
  return c.json({ ok: true });
});

invoices.put("/invoices/:id/lessons", requireTeacher, async (c) => {
  const body = await parseBody(c, setInvoiceLessonsBody);
  return c.json({ invoice: await invoiceSetLessons(await makeCtx(c), actorOf(c), c.req.param("id"), body) });
});

invoices.post("/invoices/:id/send", requireTeacher, async (c) => {
  const body = await parseBody(c, invoiceVersionBody);
  return c.json({
    invoice: await invoiceSend(await makeCtx(c), actorOf(c), c.req.param("id"), body.version),
  });
});

invoices.post("/invoices/:id/paid", requireTeacher, async (c) => {
  const body = await parseBody(c, invoiceVersionBody);
  return c.json({
    invoice: await invoicePaid(await makeCtx(c), actorOf(c), c.req.param("id"), body.version),
  });
});

invoices.post("/invoices/:id/unpaid", requireTeacher, async (c) => {
  const body = await parseBody(c, invoiceVersionBody);
  return c.json({
    invoice: await invoiceUnpaid(await makeCtx(c), actorOf(c), c.req.param("id"), body.version),
  });
});

invoices.post("/invoices/:id/void", requireTeacher, async (c) => {
  const body = await parseBody(c, voidInvoiceBody);
  return c.json({ invoice: await invoiceVoid(await makeCtx(c), actorOf(c), c.req.param("id"), body) });
});

invoices.get("/payment-details", requireTeacher, async (c) => {
  return c.json({ payment: await paymentGet(await makeCtx(c), actorOf(c)) });
});

invoices.put("/payment-details", requireTeacher, async (c) => {
  const body = await parseBody(c, paymentDetailsBody);
  return c.json({ payment: await paymentSet(await makeCtx(c), actorOf(c), body) });
});
