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

function addThemeColours(): void {
  document.head.insertAdjacentHTML(
    "beforeend",
    '<meta name="theme-color" media="(prefers-color-scheme: light)" content="#f9f9f7">' +
      '<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#353537">',
  );
}

function themeColours(): (string | null)[] {
  return [...document.head.querySelectorAll('meta[name="theme-color"]')].map(
    (meta) => meta.getAttribute("content"),
  );
}

afterEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  document.head
    .querySelectorAll('meta[name="theme-color"]')
    .forEach((meta) => meta.remove());
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
    expect(icon()).toBe("sun");
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
    expect(icon()).toBe("moon");
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("sets the theme colour of the chosen theme, and sets it back", () => {
    stubColourScheme(false);
    addThemeColours();
    render(<ThemeToggle />);

    fireEvent.click(toggle());

    expect(themeColours()).toEqual(["#353537", "#353537"]);

    fireEvent.click(toggle());

    expect(themeColours()).toEqual(["#f9f9f7", "#f9f9f7"]);
  });

  it("follows a change to the device setting with the theme colour while the reader has not chosen", () => {
    const setDevice = stubColourScheme(false);
    addThemeColours();
    render(<ThemeToggle />);

    expect(themeColours()).toEqual(["#f9f9f7", "#f9f9f7"]);

    act(() => setDevice(true));

    expect(themeColours()).toEqual(["#353537", "#353537"]);
  });

  it("sets the theme colour of the reader's choice over the device setting", () => {
    stubColourScheme(true);
    document.documentElement.dataset.theme = "light";
    addThemeColours();
    render(<ThemeToggle />);

    expect(themeColours()).toEqual(["#f9f9f7", "#f9f9f7"]);
  });

  it("keeps the theme colour of the reader's choice when the device setting changes", () => {
    const setDevice = stubColourScheme(false);
    addThemeColours();
    render(<ThemeToggle />);

    fireEvent.click(toggle());
    act(() => setDevice(true));
    act(() => setDevice(false));

    expect(themeColours()).toEqual(["#353537", "#353537"]);
  });

  it("still switches the theme when the page has no theme colour", () => {
    stubColourScheme(false);
    render(<ThemeToggle />);

    fireEvent.click(toggle());

    expect(toggle().getAttribute("aria-pressed")).toBe("true");
    expect(themeColours()).toEqual([]);
  });

  it("takes an extra class from the header", () => {
    stubColourScheme(false);
    render(<ThemeToggle className="site-header__toggle" />);

    expect(toggle().className).toBe("theme-toggle site-header__toggle");
  });
});
