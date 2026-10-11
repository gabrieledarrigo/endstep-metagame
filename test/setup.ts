import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

globalThis.ResizeObserver = class {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
};

Object.defineProperty(globalThis, "navigator", {
  value: {
    language: "en-GB",
    languages: ["en-Gb"],
  },
  writable: true,
});

afterEach(() => {
  cleanup();
});
