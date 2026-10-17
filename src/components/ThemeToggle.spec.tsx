import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { stubColourScheme } from "../../test/stubColourScheme";
import { ThemeToggle } from "./ThemeToggle";

function toggle(): HTMLElement {
  return screen.getByRole("button", { name: "Dark theme" });
}

function icon(): string | undefined {
  const drawn = toggle().querySelector(".theme-toggle__icon");

  return ["sun", "moon"].find((name) =>
    drawn?.classList.contains(`theme-toggle__icon--${name}`),
  );
}

afterEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("ThemeToggle", () => {
  it("follows a light device until the reader chooses, with a sun", () => {
    stubColourScheme(false);
    render(<ThemeToggle />);

    expect(toggle().getAttribute("aria-pressed")).toBe("false");
    expect(icon()).toBe("sun");
  });

  it("follows a dark device until the reader chooses, with a moon", () => {
    stubColourScheme(true);
    render(<ThemeToggle />);

    expect(toggle().getAttribute("aria-pressed")).toBe("true");
    expect(icon()).toBe("moon");
  });

  it("follows a change to the device setting while the reader has not chosen", () => {
    const setDevice = stubColourScheme(false);
    render(<ThemeToggle />);

    act(() => setDevice(true));

    expect(toggle().getAttribute("aria-pressed")).toBe("true");
    expect(icon()).toBe("moon");
  });

  it("keeps the reader's choice over the device setting, and over a change to it", () => {
    const setDevice = stubColourScheme(true);
    document.documentElement.dataset.theme = "light";
    render(<ThemeToggle />);

    expect(toggle().getAttribute("aria-pressed")).toBe("false");

    act(() => setDevice(false));
    act(() => setDevice(true));

    expect(toggle().getAttribute("aria-pressed")).toBe("false");
    expect(icon()).toBe("sun");
  });

  it("switches the theme on the page and stores the choice", () => {
    stubColourScheme(false);
    render(<ThemeToggle />);

    fireEvent.click(toggle());

    expect(toggle().getAttribute("aria-pressed")).toBe("true");
    expect(icon()).toBe("moon");
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(localStorage.getItem("theme")).toBe("dark");

    fireEvent.click(toggle());

    expect(toggle().getAttribute("aria-pressed")).toBe("false");
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(localStorage.getItem("theme")).toBe("light");
  });

  it("still switches the theme when the browser refuses to store it", () => {
    stubColourScheme(false);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Storage is disabled", "SecurityError");
    });
    render(<ThemeToggle />);

    fireEvent.click(toggle());

    expect(toggle().getAttribute("aria-pressed")).toBe("true");
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("takes an extra class from the header", () => {
    stubColourScheme(false);
    render(<ThemeToggle className="site-header__toggle" />);

    expect(toggle().className).toBe("theme-toggle site-header__toggle");
  });
});
