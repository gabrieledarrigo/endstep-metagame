const MAX_RETRIES = 2;
const RETRY_BASE_MS = 400;

type FailureKind = "rateLimit" | "upstream" | "http" | "network" | "malformed";

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

function wait(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }

    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    };

    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);

    signal.addEventListener("abort", onAbort, { once: true });
  });
}

/**
 * Checks whether an error comes from an aborted request.
 *
 * It reads the name, not the class, because the error can be a `DOMException` from another realm, as it is under jsdom in the specs.
 *
 * @param error - The value a promise rejected with, or that a `catch` block caught.
 * @returns `true` for the `AbortError` that `fetch` and the retry wait raise when their signal aborts.
 */
export function isAbortError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    error.name === "AbortError"
  );
}

/**
 * Fetches a metagame endpoint through the proxy and parses its JSON body.
 *
 * A network failure, a 429 and any 5xx response are retried up to twice, after 400ms and then 800ms.
 *
 * @param path - The endpoint path after `/api/metagame/`, such as `Pauper/decks`.
 * @param params - The query parameters.
 * @param signal - Aborts the request and any wait between attempts.
 * @returns A Promise resolving to the parsed body.
 * @throws An `AbortError` when the signal aborts.
 * @throws An `Error` with a user-facing `message` and a `kind` when the request fails: `network`, `malformed`, `rateLimit`, `upstream` or `http`. The last three also carry the `status`.
 */
export async function getJson<Body>(
  path: string,
  params: Record<string, string>,
  signal: AbortSignal,
): Promise<Body> {
  const url = `/api/metagame/${path}?${new URLSearchParams(params)}`;

  for (let attempt = 0; ; attempt += 1) {
    let response;

    try {
      response = await fetch(url, { signal });
    } catch (error) {
      if (isAbortError(error)) {
        throw error;
      }
      if (attempt === MAX_RETRIES) {
        throw Object.assign(new Error("The server could not be reached."), {
          kind: "network",
        });
      }
      await wait(RETRY_BASE_MS * 2 ** attempt, signal);
      continue;
    }

    if (response.ok) {
      try {
        return await response.json();
      } catch (error) {
        if (isAbortError(error)) {
          throw error;
        }
        throw Object.assign(
          new Error("The server returned a malformed response."),
          {
            kind: "malformed",
          },
        );
      }
    }

    const detail = failure(response.status);
    const retryable = response.status === 429 || response.status >= 500;

    if (!retryable || attempt === MAX_RETRIES) {
      throw Object.assign(new Error(detail.message), detail, {
        status: response.status,
      });
    }

    await wait(RETRY_BASE_MS * 2 ** attempt, signal);
  }
}
