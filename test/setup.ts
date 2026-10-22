import { cleanup } from "@testing-library/react";
import i18next from "i18next";
import { LANGUAGE_KEY } from "../src/locales/i18n";
import { afterEach, beforeEach } from "vitest";
import { stubWidth } from "./stubWidth";

globalThis.ResizeObserver = class {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
};

HTMLDialogElement.prototype.showModal = function (
  this: HTMLDialogElement,
): void {
  this.open = true;
};

HTMLDialogElement.prototype.close = function (this: HTMLDialogElement): void {
  if (!this.open) {
    return;
  }

  this.open = false;
  this.dispatchEvent(new Event("close"));
};

HTMLElement.prototype.showPopover = function (): void {};

HTMLElement.prototype.hidePopover = function (): void {};

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

afterEach(async () => {
  cleanup();
  localStorage.removeItem(LANGUAGE_KEY);
  await i18next.changeLanguage("en");
});
