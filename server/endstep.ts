import { type CallLog, outcomeOf } from "./log.js";

export const UPSTREAM = "https://endstep.cc/api/metagame/v1";
export const TIMEOUT_MS = 8000;
export const SEGMENT = /^[A-Za-z0-9_-]+$/;
export const WINDOWS = ["1d", "7d", "14d", "30d", "season"];

class UpstreamError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`Endstep answered ${status}`);
    this.name = "UpstreamError";
    this.status = status;
  }
}

class NetworkError extends Error {
  constructor(cause: TypeError) {
    super("Endstep could not be reached", { cause });
    this.name = "NetworkError";
  }
}

/**
 * Fetches one Endstep endpoint and parses its JSON body.
 *
 * @param path - The endpoint path after the API version, such as `Pauper/decks`.
 * @param params - The query parameters, in the order they are sent.
 * @param options - `timeoutMs`, the call's timeout, 8 seconds by default. `signal`, which aborts the call, or stops it before it starts. `calls`, which records the call's outcome for the log line, NFR-12.
 * @returns A Promise resolving to the parsed body.
 * @throws An `UpstreamError` with the status when Endstep answers anything other than a success.
 * @throws An error that `isNetworkError` reads as a network failure, when `fetch` fails before Endstep answers.
 * @throws A `TimeoutError` when the call runs past its timeout.
 * @throws The read or parse error when the body breaks off or is not JSON.
 * @throws The signal's reason when the signal is aborted.
 */
export async function upstream<Body>(
  path: string,
  params: Record<string, string>,
  {
    timeoutMs = TIMEOUT_MS,
    signal,
    calls,
  }: { timeoutMs?: number; signal?: AbortSignal; calls?: CallLog } = {},
): Promise<Body> {
  if (signal?.aborted) {
    calls?.record("endstep", "aborted");
  }

  signal?.throwIfAborted();

  const timeout = AbortSignal.timeout(timeoutMs);
  const response = await fetch(
    `${UPSTREAM}/${path}?${new URLSearchParams(params)}`,
    {
      headers: {
        accept: "application/json",
      },
      signal: signal ? AbortSignal.any([timeout, signal]) : timeout,
    },
  ).catch((error: unknown) => {
    calls?.record("endstep", outcomeOf(error, false));

    if (error instanceof TypeError) {
      throw new NetworkError(error);
    }

    throw error;
  });

  if (!response.ok) {
    calls?.record("endstep", response.status);
    await response.body?.cancel();
    throw new UpstreamError(response.status);
  }

  try {
    const body = (await response.json()) as Body;
    calls?.record("endstep", "succeeded");
    return body;
  } catch (error) {
    calls?.record("endstep", outcomeOf(error, true));
    throw error;
  }
}

/**
 * Checks whether an error is Endstep's rate limit.
 *
 * @param error - The error a build failed with.
 * @returns `true` for an upstream 429.
 */
export function isRateLimit(error: unknown): boolean {
  return error instanceof UpstreamError && error.status === 429;
}

/**
 * Checks whether an error is a network failure: `fetch` failed before Endstep sent an answer.
 *
 * @param error - The error a call failed with.
 * @returns `true` only for the error `upstream` throws when `fetch` itself fails. A timeout, an abort, an error status, and a body that breaks off or is not JSON give `false`.
 */
export function isNetworkError(error: unknown): boolean {
  return error instanceof NetworkError;
}

/**
 * Builds the address of a deck detail on our own proxy, exactly as the deck page requests it, so every caller shares the deck page's edge cache entry.
 *
 * @param origin - The site's origin, such as `https://pauper-endstep-metagame.vercel.app`.
 * @param slug - The deck's slug.
 * @param timeWindow - One of the five windows.
 * @returns The proxy's address of the deck detail, with the window and the `rated` population, in the order the deck page sends them.
 */
export function deckDetailUrl(
  origin: string,
  slug: string,
  timeWindow: string,
): string {
  const query = new URLSearchParams({
    window: timeWindow,
    population: "rated",
  });

  return `${origin}/api/metagame/Pauper/decks/${encodeURIComponent(slug)}?${query}`;
}
