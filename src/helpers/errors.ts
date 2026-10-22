import i18next from "i18next";
import { ApiError } from "../api/client";

/**
 * Words an error for the page in the current language, so a change of language reaches an error already on screen, FR-20.
 *
 * @param error - The error a query failed with.
 * @returns The message of an `ApiError` from its kind and status, or the error's own message for any other error.
 */
export function errorText(error: Error): string {
  if (!(error instanceof ApiError)) {
    return error.message;
  }

  return i18next.t(`api.client.${error.kind}`, { status: error.status });
}
