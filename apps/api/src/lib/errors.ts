import { ERROR_CODES, type ApiErrorBody, type ErrorCode } from "@lms/shared";

/** Throw this from any route. The global handler turns it into a JSON error. */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly fields?: Record<string, string>;

  constructor(code: ErrorCode, options?: { fields?: Record<string, string>; message?: string }) {
    super(options?.message ?? ERROR_CODES[code].message);
    this.name = "AppError";
    this.code = code;
    this.fields = options?.fields;
  }

  get status(): number {
    return ERROR_CODES[this.code].status;
  }
}

export function errorBody(err: AppError, requestId: string): ApiErrorBody {
  return {
    error: {
      code: err.code,
      message: err.message,
      ...(err.fields ? { fields: err.fields } : {}),
      requestId,
    },
  };
}
