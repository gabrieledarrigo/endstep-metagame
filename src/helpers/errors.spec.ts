import i18next from "i18next";
import { describe, expect, it } from "vitest";
import { ApiError } from "../api/client";
import { errorText } from "./errors";

describe("errorText", () => {
  it.each([
    [new ApiError("", "network"), "The server could not be reached."],
    [
      new ApiError("", "malformed"),
      "The server returned a malformed response.",
    ],
    [new ApiError("", "upstream", 502), "Endstep did not respond."],
    [new ApiError("", "http", 404), "The request failed with status 404."],
  ])("words an API error from its kind and status", (error, text) => {
    expect(errorText(error)).toBe(text);
  });

  it("words an API error in the current language, whatever language it was thrown in", async () => {
    const error = new ApiError("The server could not be reached.", "network");
    await i18next.changeLanguage("it");

    expect(errorText(error)).toBe(i18next.t("api.client.network"));
    expect(errorText(error)).not.toBe("The server could not be reached.");
  });

  it("keeps the message of any other error", () => {
    expect(errorText(new Error("Something broke"))).toBe("Something broke");
  });
});
