type FailureKind = "network" | "malformed" | "rateLimit" | "upstream" | "http";

/**
 * A failed API request, with a message the page can show.
 */
export class ApiError extends Error {
  readonly kind: FailureKind;
  readonly status?: number;

  constructor(message: string, kind: FailureKind, status?: number) {
    super(message);
    this.name = "ApiError";
    this.kind = kind;
    this.status = status;
  }
}

function failure(status: number): { kind: FailureKind; message: string } {
  if (status === 429) {
    return {
      kind: "rateLimit",
      message:
        "Endstep's rate limit was reached. The data is cached for five minutes, so a retry usually works.",
    };
  }
  if (status === 502 || status === 504) {
    return { kind: "upstream", message: "Endstep did not respond." };
  }
  return { kind: "http", message: `The request failed with status ${status}.` };
}

/**
 * Decides whether a failed request is worth repeating, §4.8.
 *
 * @param error - The error a request failed with.
 * @returns `true` for a network error, a 429 or a 5xx.
 */
export function isRetryable(error: Error) {
  return (
    error instanceof ApiError &&
    (error.kind === "network" ||
      error.status === 429 ||
      (error.status ?? 0) >= 500)
  );
}

/**
 * Fetches a metagame endpoint through the proxy and parses its JSON body, in one request. The query client decides whether to retry it, §4.8.
 *
 * @param path - The endpoint path after `/api/metagame/`, such as `Pauper/decks`.
 * @param params - The query parameters.
 * @param signal - Aborts the request.
 * @returns A Promise resolving to the parsed body.
 * @throws The `AbortError` when the signal aborts.
 * @throws An `ApiError` when the request fails, of kind `network`, `malformed`, `rateLimit`, `upstream` or `http`. The last three carry the status.
 */
export async function getJson<Body>(
  path: string,
  params: Record<string, string>,
  signal: AbortSignal,
): Promise<Body> {
  const url = `/api/metagame/${path}?${new URLSearchParams(params)}`;
  let response;

  try {
    response = await fetch(url, { signal });
  } catch (error) {
    if (signal.aborted) {
      throw error;
    }
    throw new ApiError("The server could not be reached.", "network");
  }

  if (!response.ok) {
    const { kind, message } = failure(response.status);
    throw new ApiError(message, kind, response.status);
  }

  try {
    return await response.json();
  } catch (error) {
    if (signal.aborted) {
      throw error;
    }
    throw new ApiError(
      "The server returned a malformed response.",
      "malformed",
    );
  }
}
