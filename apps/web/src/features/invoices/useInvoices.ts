import { VN_BANKS, isAccountNumber, isBin, type BankInfo } from "@lms/shared";
import type {
  CourseInfo,
  InvoiceDiscount,
  InvoiceInfo,
  InvoiceListResult,
  MyInvoiceDetail,
  MyInvoiceItem,
  PaymentDetails,
  UnbilledLesson,
  UnbilledStudent,
  UpdateInvoiceBody,
} from "@lms/shared";
import { computed, onMounted, reactive, ref, watch } from "vue";
import { api } from "@/api/client";
import { messageOf, statusOf } from "@/features/errors";
import { useQueryRef } from "@/features/navigation/back";
import { useToast } from "@/features/toast/useToast";
import { currentPeriod, shiftPeriod } from "./period";
import { linesPayload, lineIsValid, newRow, rowsOf, sameAsSaved, totalOf, type LineRow } from "./lines";

const emptyPayment = (): PaymentDetails => ({
  payeeName: "",
  payeePhone: "",
  bankName: "",
  bankBin: "",
  bankAccount: "",
  bankHolder: "",
  paymentNote: "",
});

/** The receipts of one month, and the teacher's payment details. Logic only. */
export function useInvoiceList(text: {
  created: string;
  createdOne: string;
  nothing: string;
  paymentSaved: string;
}) {
  const toast = useToast();
  // The month stays in the address, so coming back from a receipt shows the same month.
  const period = useQueryRef("month", currentPeriod(), (v) => /^\d{4}-(0[1-9]|1[0-2])$/.test(v));
  const data = ref<InvoiceListResult | null>(null);
  const loading = ref(true);
  const busy = ref(false);
  const error = ref<string | null>(null);
  const payment = ref<PaymentDetails>(emptyPayment());
  const form = reactive<PaymentDetails>(emptyPayment());
  const savingPayment = ref(false);
  const paymentError = ref<string | null>(null);

  async function load() {
    loading.value = true;
    error.value = null;
    try {
      data.value = await api<InvoiceListResult>(`/invoices?period=${period.value}`);
    } catch (err) {
      error.value = messageOf(err);
    } finally {
      loading.value = false;
    }
  }
  onMounted(async () => {
    await load();
    try {
      payment.value = (await api<{ payment: PaymentDetails }>("/payment-details")).payment;
    } catch {
      /* the page still works without it */
    }
  });
  watch(period, load);

  const move = (months: number) => (period.value = shiftPeriod(period.value, months));
  const goToNow = () => (period.value = currentPeriod());
  const isNow = computed(() => period.value === currentPeriod());

  async function generate() {
    if (busy.value) return;
    busy.value = true;
    error.value = null;
    try {
      const res = await api<{ created: number }>("/invoices/generate", {
        method: "POST",
        body: { period: period.value },
      });
      toast.success(
        res.created === 0
          ? text.nothing
          : res.created === 1
            ? text.createdOne
            : text.created.replace("{n}", String(res.created)),
      );
      await load();
    } catch (err) {
      error.value = messageOf(err);
    } finally {
      busy.value = false;
    }
  }

  const sums = computed(() => {
    const rows = data.value?.invoices ?? [];
    const sent = rows.filter((r) => r.status === "sent" || r.status === "paid");
    const paid = rows.filter((r) => r.status === "paid");
    const add = (list: { total: number }[]) => list.reduce((s, r) => s + r.total, 0);
    return { billed: add(sent), paid: add(paid), waiting: add(sent) - add(paid) };
  });
  const paymentEmpty = computed(() => Object.values(payment.value).every((v) => v === ""));

  /** The bank as chosen from the list: its number, "other" (the teacher types the name and number) or empty. */
  const bankChoice = ref("");
  const banks: readonly BankInfo[] = VN_BANKS;
  const choiceOf = (p: PaymentDetails) =>
    banks.some((b) => b.bin === p.bankBin) ? p.bankBin : p.bankBin || p.bankName ? "other" : "";
  function chooseBank(choice: string) {
    bankChoice.value = choice;
    const bank = banks.find((b) => b.bin === choice);
    if (bank) {
      form.bankBin = bank.bin;
      form.bankName = bank.name;
    } else if (choice === "") {
      form.bankBin = "";
      form.bankName = "";
    } else if (banks.some((b) => b.bin === form.bankBin)) {
      form.bankBin = ""; // "other": the teacher types the number
    }
  }
  /** A payment QR code can be made when the bank number and the account number are right. */
  const qrReady = computed(() => isBin(form.bankBin) && isAccountNumber(form.bankAccount.replace(/\s/g, "")));

  function openPayment() {
    Object.assign(form, payment.value);
    bankChoice.value = choiceOf(payment.value);
    paymentError.value = null;
  }
  async function savePayment(): Promise<boolean> {
    if (savingPayment.value) return false;
    savingPayment.value = true;
    paymentError.value = null;
    try {
      payment.value = (
        await api<{ payment: PaymentDetails }>("/payment-details", {
          method: "PUT",
          // Spaces inside the account number (people write "0011 0012 3456") are not part of it.
          body: { ...form, bankAccount: form.bankAccount.replace(/\s/g, "") },
        })
      ).payment;
      toast.success(text.paymentSaved);
      return true;
    } catch (err) {
      paymentError.value = messageOf(err);
      return false;
    } finally {
      savingPayment.value = false;
    }
  }
  return {
    period,
    data,
    loading,
    busy,
    error,
    sums,
    isNow,
    move,
    goToNow,
    generate,
    form,
    banks,
    bankChoice,
    chooseBank,
    qrReady,
    paymentEmpty,
    openPayment,
    savePayment,
    savingPayment,
    paymentError,
  };
}

/** One receipt: the form for a draft, and every step after it. Logic only. */
export function useInvoice(
  id: string,
  text: {
    saved: string;
    sent: string;
    paid: string;
    unpaid: string;
    voided: string;
    lessonsSaved: string;
    deleted: string;
    /** "Discount" and "Discount {value}%": the words of a discount line on the receipt. */
    discount: string;
    discountPercent: string;
  },
  onDeleted: () => void,
) {
  const toast = useToast();
  const invoice = ref<InvoiceInfo | null>(null);
  const loading = ref(true);
  const notFound = ref(false);
  const busy = ref(false);
  const error = ref<string | null>(null);
  const rows = ref<LineRow[]>([]);
  const courses = ref<{ id: string; name: string; price: number }[]>([]);
  const note = ref("");
  const dueDate = ref("");

  function take(inv: InvoiceInfo) {
    invoice.value = inv;
    rows.value = rowsOf(inv.lines);
    note.value = inv.note;
    dueDate.value = inv.dueDate ?? "";
  }
  onMounted(async () => {
    try {
      take((await api<{ invoice: InvoiceInfo }>(`/invoices/${id}`)).invoice);
      try {
        const list = (await api<{ courses: CourseInfo[] }>("/courses")).courses;
        courses.value = list.map((c) => ({ id: c.id, name: c.name, price: c.pricePerLesson }));
      } catch {
        /* the lines that are already there still work */
      }
    } catch (err) {
      if (statusOf(err) === 404) notFound.value = true;
      else error.value = messageOf(err);
    } finally {
      loading.value = false;
    }
  });

  async function run(path: string, method: "PUT" | "POST", body: unknown, done: string) {
    if (busy.value) return;
    busy.value = true;
    error.value = null;
    try {
      take((await api<{ invoice: InvoiceInfo }>(`/invoices/${id}${path}`, { method, body })).invoice);
      toast.success(done);
    } catch (err) {
      error.value = messageOf(err);
    } finally {
      busy.value = false;
    }
  }

  const total = computed(() => totalOf(rows.value));
  const linesValid = computed(() => rows.value.every(lineIsValid));
  const dirty = computed(() => {
    const inv = invoice.value;
    if (!inv || inv.status !== "draft") return false;
    return (
      !sameAsSaved(rows.value, inv.lines) ||
      note.value.trim() !== inv.note ||
      (dueDate.value || null) !== inv.dueDate
    );
  });
  const version = () => invoice.value!.version;

  /** New rows go above the discount, which is always the last line. */
  const addRow = () => {
    const at = rows.value.findIndex((r) => r.kind === "discount");
    rows.value.splice(at === -1 ? rows.value.length : at, 0, newRow());
  };
  const hasDiscount = computed(() => rows.value.some((r) => r.kind === "discount"));
  const addDiscount = () => {
    if (!hasDiscount.value) rows.value.push(newRow({ kind: "discount" }));
  };
  const OTHER = "other";
  /** The choice in "What is it for": a course, "other", or nothing yet. */
  const choiceOf = (r: LineRow) => (r.kind === "course" ? r.courseId : r.kind === "other" ? OTHER : "");
  function choose(r: LineRow, value: string) {
    if (r.courseLocked) return;
    if (value === "")
      Object.assign(r, { kind: "", courseId: "", description: "", unitPrice: "", quantity: "1" });
    else if (value === OTHER)
      Object.assign(r, { kind: "other", courseId: "", description: "", unitPrice: "", quantity: "1" });
    else {
      const course = courses.value.find((c) => c.id === value);
      Object.assign(r, {
        kind: "course",
        courseId: value,
        description: course?.name ?? r.description,
        unitPrice: String(course?.price ?? ""),
        quantity: "1",
      });
    }
  }
  const discountText = (d: InvoiceDiscount) =>
    d.type === "percent" ? text.discountPercent.replace("{value}", String(d.value)) : text.discount;
  const removeRow = (key: number) => (rows.value = rows.value.filter((r) => r.key !== key));

  const save = () =>
    run(
      "",
      "PUT",
      {
        lines: linesPayload(rows.value, discountText),
        note: note.value.trim(),
        dueDate: dueDate.value || null,
        version: version(),
      } satisfies UpdateInvoiceBody,
      text.saved,
    );
  const setLessons = (lessonIds: string[]) =>
    run("/lessons", "PUT", { lessonIds, version: version() }, text.lessonsSaved);
  const send = () => run("/send", "POST", { version: version() }, text.sent);
  const markPaid = () => run("/paid", "POST", { version: version() }, text.paid);
  const markUnpaid = () => run("/unpaid", "POST", { version: version() }, text.unpaid);
  const cancel = (reason: string) => run("/void", "POST", { reason, version: version() }, text.voided);
  async function remove() {
    if (busy.value) return;
    busy.value = true;
    error.value = null;
    try {
      await api(`/invoices/${id}`, { method: "DELETE", body: { version: version() } });
      toast.success(text.deleted);
      onDeleted();
    } catch (err) {
      error.value = messageOf(err);
      busy.value = false;
    }
  }

  return {
    invoice,
    loading,
    notFound,
    busy,
    error,
    rows,
    courses,
    note,
    dueDate,
    total,
    hasDiscount,
    addDiscount,
    choiceOf,
    choose,
    OTHER,
    linesValid,
    dirty,
    addRow,
    removeRow,
    save,
    setLessons,
    send,
    markPaid,
    markUnpaid,
    cancel,
    remove,
  };
}

/** The receipts of a student, and one of them. Logic only. */
export function useMyInvoices() {
  const invoices = ref<MyInvoiceItem[]>([]);
  const loading = ref(true);
  const error = ref<string | null>(null);
  onMounted(async () => {
    try {
      invoices.value = (await api<{ invoices: MyInvoiceItem[] }>("/my/invoices")).invoices;
    } catch (err) {
      error.value = messageOf(err);
    } finally {
      loading.value = false;
    }
  });
  const unpaid = computed(() => invoices.value.filter((i) => i.status === "sent"));
  return { invoices, unpaid, loading, error };
}

export function useMyInvoice(id: string) {
  const invoice = ref<MyInvoiceDetail | null>(null);
  const loading = ref(true);
  const notFound = ref(false);
  onMounted(async () => {
    try {
      invoice.value = (await api<{ invoice: MyInvoiceDetail }>(`/my/invoices/${id}`)).invoice;
    } catch (err) {
      if (statusOf(err) === 404) notFound.value = true;
    } finally {
      loading.value = false;
    }
  });
  return { invoice, loading, notFound };
}

/**
 * The lessons of one student that can go on a receipt, and which of them are ticked. Used to make a new receipt
 * (all ticked to start with) and to change the lessons of a draft (the ones on it are ticked). Logic only.
 */
export function useLessonPicker() {
  const lessons = ref<UnbilledLesson[]>([]);
  const chosen = ref<string[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function load(studentId: string, invoiceId: string | null, tickAll: boolean) {
    loading.value = true;
    error.value = null;
    lessons.value = [];
    chosen.value = [];
    try {
      const q = `studentId=${encodeURIComponent(studentId)}${invoiceId ? `&invoiceId=${encodeURIComponent(invoiceId)}` : ""}`;
      lessons.value = (await api<{ lessons: UnbilledLesson[] }>(`/invoices/lessons?${q}`)).lessons;
      chosen.value = lessons.value.filter((l) => tickAll || l.inThisReceipt).map((l) => l.lessonId);
    } catch (err) {
      error.value = messageOf(err);
    } finally {
      loading.value = false;
    }
  }
  const total = computed(() =>
    lessons.value.filter((l) => chosen.value.includes(l.lessonId)).reduce((sum, l) => sum + l.price, 0),
  );
  const tickAll = () => (chosen.value = lessons.value.map((l) => l.lessonId));
  const untick = () => (chosen.value = []);
  return { lessons, chosen, loading, error, total, load, tickAll, untick };
}

/** Making a new receipt: pick a student, then their lessons. Logic only. */
export function useNewInvoice(onCreated: (id: string) => void) {
  const students = ref<UnbilledStudent[]>([]);
  const studentId = ref("");
  const loading = ref(true);
  const busy = ref(false);
  const error = ref<string | null>(null);
  const picker = useLessonPicker();

  onMounted(async () => {
    try {
      students.value = (await api<{ students: UnbilledStudent[] }>("/invoices/unbilled")).students;
    } catch (err) {
      error.value = messageOf(err);
    } finally {
      loading.value = false;
    }
  });
  watch(studentId, (id) => {
    if (id) void picker.load(id, null, true);
    else picker.lessons.value = [];
  });

  async function create() {
    if (busy.value || picker.chosen.value.length === 0) return;
    busy.value = true;
    error.value = null;
    try {
      const res = await api<{ invoice: InvoiceInfo }>("/invoices", {
        method: "POST",
        body: { studentId: studentId.value, lessonIds: picker.chosen.value },
      });
      onCreated(res.invoice.id);
    } catch (err) {
      error.value = messageOf(err);
      busy.value = false;
    }
  }
  return { students, studentId, loading, busy, error, picker, create };
}
