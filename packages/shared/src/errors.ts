/**
 * Stable error codes shared by the API and the web app.
 * The API returns `{ error: { code, message, fields?, requestId } }`.
 * The message text comes from the message catalog (plain English).
 */
export const ERROR_CODES = {
  // Generic
  VALIDATION_FAILED: { status: 400, message: "Some information is not correct. Please check and try again." },
  UNAUTHENTICATED: { status: 401, message: "Please sign in to continue." },
  FORBIDDEN: { status: 403, message: "You do not have permission to do this." },
  NOT_FOUND: { status: 404, message: "We could not find what you are looking for." },
  CONFLICT: { status: 409, message: "This was changed by someone else. Please refresh and try again." },
  ORIGIN_NOT_ALLOWED: { status: 403, message: "This request is not allowed." },
  RATE_LIMITED: { status: 429, message: "Too many tries. Please wait a moment and try again." },
  INTERNAL: { status: 500, message: "Something went wrong on our side. Please try again." },

  // Sign in
  INVALID_CREDENTIALS: { status: 401, message: "The email or password is not correct." },
  ACCOUNT_LOCKED: { status: 429, message: "Too many wrong tries. Please wait 15 minutes and try again." },
  LINK_EXPIRED: { status: 410, message: "This link is no longer valid. Please ask for a new one." },
  EMAIL_NOT_VERIFIED: { status: 403, message: "Please check your email and confirm your address first." },
  CAPTCHA_FAILED: { status: 400, message: "We could not check that you are a person. Please try again." },
  ACCOUNT_PAUSED: { status: 403, message: "This account is paused. Please contact support." },
  INVITE_LIMIT: { status: 429, message: "You have sent many invites today. Please try again tomorrow." },

  // Work (assignments)
  DEADLINE_PASSED: { status: 409, message: "The due date has passed, so you cannot turn in this work." },
  INVALID_LINK: { status: 400, message: "Please enter a link that starts with https://" },

  // Files
  FILE_TYPE_NOT_ALLOWED: { status: 415, message: "This type of file is not allowed." },
  FILE_TOO_LARGE: { status: 413, message: "This file is too large." },
  STORAGE_FULL: { status: 409, message: "Your storage is full. Please delete some files first." },

  // Invoices
  INVOICE_LOCKED: { status: 409, message: "This invoice was already sent, so it cannot be changed." },
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;

export interface ApiErrorBody {
  error: {
    code: ErrorCode;
    message: string;
    /** Field name to message, for form errors. */
    fields?: Record<string, string>;
    requestId: string;
  };
}
