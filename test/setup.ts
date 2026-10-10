import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

globalThis.ResizeObserver = class {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
};

afterEach(() => {
  cleanup();
});
