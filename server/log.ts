import pino from "pino";
import { errorResponse } from "./http.js";

export type Service = "endstep" | "scryfall";

export type Reason = number | "timeout" | "network" | "body";

export type Outcome = "succeeded" | "aborted" | Reason;

export type FunctionName =
  "metagame" | "matchups" | "staples" | "sample-cards" | "deck-page";

type Calls = {
  total: number;
  succeeded: number;
  failed: number;
  aborted: number;
};

export type LogContext = {
  calls: CallLog;
  fellBack: () => void;
};

type LogRequest = {
  name: FunctionName;
  page: string | null;
  window: string | null;
  subject: string | null;
};

const SERVICE_NAMES: Readonly<Record<Service, string>> = {
  endstep: "Endstep",
  scryfall: "Scryfall",
};

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  base: undefined,
});

/**
 * Keeps the outcome of each call that one response makes to Endstep and to Scryfall, NFR-12.
 */
export class CallLog {
  private readonly outcomes: Record<Service, Outcome[]> = {
    endstep: [],
    scryfall: [],
  };

  /**
   * Records the outcome of one call.
   *
   * @param service - The service called.
   * @param outcome - `succeeded`, `aborted` when we stopped the call ourselves, or the reason it failed: the service's status, `timeout`, `network` or `body`.
   */
  record(service: Service, outcome: Outcome): void {
    this.outcomes[service].push(outcome);
  }

  /**
   * Counts the calls to one service.
   *
   * @param service - The service.
   * @returns The calls started, and how many succeeded, failed or were aborted. The last three add up to the first.
   */
  calls(service: Service): Calls {
    const outcomes = this.outcomes[service];
    const succeeded = outcomes.filter((outcome) => outcome === "succeeded");
    const aborted = outcomes.filter((outcome) => outcome === "aborted");

    return {
      total: outcomes.length,
      succeeded: succeeded.length,
      failed: outcomes.length - succeeded.length - aborted.length,
      aborted: aborted.length,
    };
  }

  /**
   * Counts the reasons of the failed calls to one service.
   *
   * @param service - The service.
   * @returns The count of each reason, in the order each first appeared, such as `{ timeout: 2, 503: 1 }`.
   */
  failures(service: Service): Record<string, number> {
    const failures: Record<string, number> = {};

    for (const outcome of this.outcomes[service]) {
      if (outcome !== "succeeded" && outcome !== "aborted") {
        failures[outcome] = (failures[outcome] ?? 0) + 1;
      }
    }

    return failures;
  }
}

/**
 * Reads why a call failed from the error it threw, NFR-12.
 *
 * @param error - The error that `fetch`, a timeout signal, an abort or the body threw.
 * @param reading - `true` when the error came while reading the body, after the service answered.
 * @returns `timeout` for a timeout signal, `aborted` for an abort we made, `body` for any other error while reading, and `network` for any other error before the answer.
 */
export function outcomeOf(error: unknown, reading: boolean): Outcome {
  const name = error instanceof Error ? error.name : "";

  if (name === "TimeoutError") {
    return "timeout";
  }

  if (name === "AbortError") {
    return "aborted";
  }

  return reading ? "body" : "network";
}

function pageOf(referer: string | null): string | null {
  if (referer === null) {
    return null;
  }

  try {
    return new URL(referer).pathname;
  } catch {
    return null;
  }
}

function failedService(calls: CallLog): Service | null {
  return calls.calls("endstep").failed > 0 ? "endstep" : null;
}

function callsText(calls: CallLog, service: Service): string {
  const { total, failed, aborted } = calls.calls(service);
  const reasons = Object.entries(calls.failures(service))
    .map(([reason, count]) => `${count} ${reason}`)
    .join(", ");
  const abortedText = aborted > 0 ? `, ${aborted} aborted` : "";

  return `${failed} of ${total} ${SERVICE_NAMES[service]} calls failed (${reasons})${abortedText}`;
}

function heading(request: LogRequest): string {
  return [request.name, request.subject, request.window]
    .filter((part) => part !== null)
    .join(" ");
}

function fields(
  request: LogRequest,
  status: number,
  upstream: Service | null,
  calls: CallLog,
  startedAt: number,
): Record<string, unknown> {
  return {
    page: request.page,
    function: request.name,
    window: request.window,
    status,
    upstream,
    calls: upstream === null ? null : calls.calls(upstream),
    failures: upstream === null ? null : calls.failures(upstream),
    durationMs: Date.now() - startedAt,
  };
}

/**
 * Wraps a function's handler so that it logs every response that fails, NFR-12.
 *
 * The handler gets a `CallLog` to record its calls in, and a `fellBack` to call when it serves a page with the site card after a failed call. The wrapper logs one `error` line for a response with a status of 429 or of 500 and above, and one `warn` line after a fallback. A success logs nothing. A handler that throws gets a 500 and an `error` line with the error's message.
 *
 * @param name - The function's name in the log line.
 * @param handle - The handler.
 * @param describe - Reads from the request the page that asked, and what the function served besides the window, such as the proxy's endpoint path. Without it, the page comes from the `Referer` header and there is no subject.
 * @returns The wrapped handler.
 */
export function logged(
  name: FunctionName,
  handle: (req: Request, run: LogContext) => Promise<Response>,
  describe: (url: URL, req: Request) => Partial<LogRequest> = () => ({}),
): (req: Request) => Promise<Response> {
  return async (req) => {
    const startedAt = Date.now();
    const url = new URL(req.url);
    const request: LogRequest = {
      name,
      page: pageOf(req.headers.get("referer")),
      window: url.searchParams.get("window"),
      subject: null,
      ...describe(url, req),
    };
    const calls = new CallLog();
    let fellBack = false;
    let response: Response;

    try {
      response = await handle(req, {
        calls,
        fellBack: () => {
          fellBack = true;
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      logger.error(
        { ...fields(request, 500, null, calls, startedAt), error: message },
        `${heading(request)}: 500, the function failed (${message})`,
      );

      return errorResponse(500, "The function failed");
    }

    if (response.status === 429 || response.status >= 500) {
      const upstream = failedService(calls);
      const cause = upstream === null ? "" : `, ${callsText(calls, upstream)}`;

      logger.error(
        fields(request, response.status, upstream, calls, startedAt),
        `${heading(request)}: ${response.status}${cause}`,
      );
    } else if (fellBack) {
      const upstream = failedService(calls);
      const cause = upstream === null ? "" : `, ${callsText(calls, upstream)}`;

      logger.warn(
        fields(request, response.status, upstream, calls, startedAt),
        `${heading(request)}: fell back to the site card${cause}`,
      );
    }

    return response;
  };
}
