import { reactive, ref } from "vue";
import type { ZodType } from "zod";
import { ApiError } from "@/api/client";

/**
 * Form rules that every form in the app follows (plan 5.1):
 *  - check the input first and show the message next to the field,
 *  - never send twice while a request is running,
 *  - keep what the person typed when something goes wrong,
 *  - show the server's field errors in the same place as our own.
 */
export function useForm<T extends Record<string, unknown>>(
  initial: T,
  options: {
    /** A schema, or a function that picks one (for forms that create or edit). */
    schema?: ZodType<unknown> | (() => ZodType<unknown>);
    /** Turns what is typed (text boxes give text) into what the server expects, before checking. */
    toPayload?: (values: T) => unknown;
    submit: (values: T) => Promise<void>;
  },
) {
  const values = reactive({ ...initial }) as T;
  const errors = ref<Record<string, string>>({});
  const formError = ref<string | null>(null);
  /** The stable error code from the server, so a page can react to a special case. */
  const errorCode = ref<string | null>(null);
  const submitting = ref(false);

  async function submit() {
    if (submitting.value) return;
    errors.value = {};
    formError.value = null;
    errorCode.value = null;

    if (options.schema) {
      const schema = typeof options.schema === "function" ? options.schema() : options.schema;
      const result = schema.safeParse(options.toPayload ? options.toPayload(values as T) : values);
      if (!result.success) {
        for (const issue of result.error.issues) errors.value[String(issue.path[0] ?? "_")] ??= issue.message;
        return;
      }
    }

    submitting.value = true;
    try {
      await options.submit(values as T);
    } catch (err) {
      if (!(err instanceof ApiError)) {
        formError.value = "Something went wrong. Please try again.";
        return;
      }
      errorCode.value = err.code;
      const { _: general, ...fields } = err.fields ?? {};
      errors.value = fields;
      // Show the general message when there is no field to attach it to.
      if (general || Object.keys(fields).length === 0) formError.value = general ?? err.message;
    } finally {
      submitting.value = false;
    }
  }

  return { values, errors, formError, errorCode, submitting, submit };
}
