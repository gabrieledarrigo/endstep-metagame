import { describe, expect, it } from "vitest";
import {
  cacheControl,
  errorResponse,
  hasNoBody,
  methodResponse,
} from "./_shared.js";

function request(method: string) {
  return new Request("http://localhost/api/anything", { method });
}

describe("hasNoBody", () => {
  it.each([
    [204, true],
    [205, true],
    [304, true],
    [200, false],
    [404, false],
  ])("for status %i returns %s", (status, expected) => {
    expect(hasNoBody(status)).toBe(expected);
  });
});

describe("errorResponse", () => {
  it("answers JSON with the CORS headers and no caching", async () => {
    const response = errorResponse(400, "Bad request");

    expect(response.status).toBe(400);
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("content-type")).toBe("application/json");
    expect(await response.json()).toEqual({ error: "Bad request" });
  });

  it("adds the extra headers", () => {
    const response = errorResponse(405, "Method not allowed", {
      Allow: "GET",
    });

    expect(response.headers.get("allow")).toBe("GET");
  });
});

describe("methodResponse", () => {
  it.each(["GET", "HEAD"])("lets %s through", (method) => {
    expect(methodResponse(request(method))).toBeNull();
  });

  it("answers the CORS preflight with 204", () => {
    const response = methodResponse(request("OPTIONS"));

    expect(response?.status).toBe(204);
    expect(response?.body).toBeNull();
    expect(response?.headers.get("access-control-allow-origin")).toBe("*");
    expect(response?.headers.get("access-control-allow-methods")).toBe(
      "GET, HEAD, OPTIONS",
    );
    expect(response?.headers.get("access-control-allow-headers")).toBe("*");
    expect(response?.headers.get("access-control-max-age")).toBe("86400");
    expect(response?.headers.get("cache-control")).toBe("no-store");
  });

  it.each(["POST", "PUT", "DELETE"])("refuses %s with 405", (method) => {
    const response = methodResponse(request(method));

    expect(response?.status).toBe(405);
    expect(response?.headers.get("allow")).toBe("GET, HEAD, OPTIONS");
    expect(response?.headers.get("cache-control")).toBe("no-store");
  });
});

describe("cacheControl", () => {
  it.each([
    [200, "public, s-maxage=300, stale-while-revalidate=600"],
    [307, "public, s-maxage=300, stale-while-revalidate=600"],
    [204, "no-store"],
    [304, "no-store"],
    [404, "no-store"],
    [500, "no-store"],
  ])("for status %i returns %s", (status, expected) => {
    expect(cacheControl(status, 60)).toBe(expected);
  });

  it("holds a 429 for the given number of seconds", () => {
    expect(cacheControl(429, 10)).toBe("public, s-maxage=10");
    expect(cacheControl(429, 60)).toBe("public, s-maxage=60");
  });
});
