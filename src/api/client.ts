import i18next from "i18next";
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
      message: i18next.t("api.client.rateLimit"),
    };
  }
  if (status === 502 || status === 504) {
    return { kind: "upstream", message: i18next.t("api.client.upstream") };
  }
  return {
    kind: "http",
    message: i18next.t("api.client.http", { status }),
  };
}

/**
 * Decides whether a failed request is worth repeating, §4.8.
 *
 * @param error - The error a request failed with.
 * @returns `true` for a network error, a 429 or a 5xx.
 */
export function isRetryable(error: Error): boolean {
  return (
    error instanceof ApiError &&
    (error.kind === "network" ||
      error.status === 429 ||
      (error.status ?? 0) >= 500)
  );
}

/**
 * Fetches one of the site's API endpoints and parses its JSON body, in one request. The query client decides whether to retry it, §4.8.
 *
 * @param path - The endpoint path, such as `/api/metagame/Pauper/decks` or `/api/matchups`.
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
  const url = `${path}?${new URLSearchParams(params)}`;
  let response;

  try {
    response = await fetch(url, { signal });
  } catch (error) {
    if (signal.aborted) {
      throw error;
    }
    throw new ApiError(i18next.t("api.client.network"), "network");
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
    throw new ApiError(i18next.t("api.client.malformed"), "malformed");
  }
}
