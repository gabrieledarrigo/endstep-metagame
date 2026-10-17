import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach } from "vitest";
import { stubWidth } from "./stubWidth";

globalThis.ResizeObserver = class {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
};

Object.defineProperty(globalThis, "navigator", {
  value: {
    language: "en-GB",
    languages: ["en-GB"],
  },
  writable: true,
});

beforeEach(() => {
  stubWidth(1280);
});

afterEach(() => {
  cleanup();
});
