const MAX_RETRIES = 2;
const RETRY_BASE_MS = 400;

function failure(status) {
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

function wait(ms, signal) {
  return new Promise((resolve, reject) => {
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

export async function getJson(path, params, signal) {
  const url = `/api/metagame/${path}?${new URLSearchParams(params)}`;

  for (let attempt = 0; ; attempt += 1) {
    let response;

    try {
      response = await fetch(url, { signal });
    } catch (error) {
      if (error.name === "AbortError") {
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
        if (error.name === "AbortError") {
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
