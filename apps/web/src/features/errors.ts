import { ApiError } from "@/api/client";

/** The words to show for an error from the server or the network. */
export const messageOf = (err: unknown): string =>
  err instanceof Error ? err.message : "Something went wrong. Please try again.";

export const statusOf = (err: unknown): number | undefined =>
  err instanceof ApiError ? err.status : undefined;
