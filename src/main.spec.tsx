import { fireEvent, render, screen, within } from "@testing-library/react";
import { type Mock, afterEach, describe, expect, it, vi } from "vitest";
import decks from "../test/fixtures/decks.json";
import series from "../test/fixtures/share-series.json";
import { stubColourScheme } from "../test/stubColourScheme";
import page from "../index.html?raw";
import { ThemeToggle } from "./components/ThemeToggle";

type StubApi = {
  fetchMock: Mock<typeof fetch>;
  hold: (...windows: string[]) => void;
  release: (window: string) => void;
};

function stubApi(): StubApi {
  let failNextDecks = true;
  const held = new Set<string | null>();
  const waiting: { window: string | null; resolve: () => void }[] = [];

  const fetchMock = vi.fn<typeof fetch>((input) => {
    const url = new URL(String(input), "http://localhost");
    const body = url.pathname === "/api/metagame/Pauper/decks" ? decks : series;

    if (url.pathname.endsWith("/decks") && failNextDecks) {
      failNextDecks = false;
      return Promise.resolve(
        Response.json({ error: "Not found" }, { status: 404 }),
      );
    }
    if (!held.has(url.searchParams.get("window"))) {
      return Promise.resolve(Response.json(body));
    }
    return new Promise<Response>((resolve) => {
      waiting.push({
        window: url.searchParams.get("window"),
        resolve: () => resolve(Response.json(body)),
      });
    });
  });

  vi.stubGlobal("fetch", fetchMock);

  return {
    fetchMock,
    hold: (...windows: string[]): void =>
      windows.forEach((window) => held.add(window)),
    release: (window: string): void => {
      held.delete(window);
      waiting
        .filter((request) => request.window === window)
        .forEach((request) => request.resolve());
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("the overview page", () => {
  it("loads through the proxy, recovers on retry, keeps the page while another window loads, shows a window it has seen at once, and ignores a late response for a window the reader left", async () => {
    const api = stubApi();
    document.body.innerHTML = '<div id="root"></div>';

    await import("./main");

    await screen.findByRole("heading", {
      name: "The deck grid could not be loaded",
    });
    await screen.findByRole("button", { name: "Affinity", pressed: false });

    fireEvent.click(screen.getAllByRole("button", { name: "Retry" })[0]);

    expect(await screen.findByText("Monster Tron")).toBeTruthy();
    expect(
      screen.queryByRole("heading", {
        name: "The deck grid could not be loaded",
      }),
    ).toBeNull();

    const decksRequests = (window: string): number =>
      api.fetchMock.mock.calls.filter(([input]) => {
        const url = new URL(String(input), "http://localhost");
        return (
          url.pathname === "/api/metagame/Pauper/decks" &&
          url.searchParams.get("window") === window
        );
      }).length;

    api.hold("7d");
    fireEvent.click(screen.getByRole("button", { name: "7d" }));

    expect(screen.getByText("Monster Tron")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toBe(
      "Loading the 7d window.",
    );

    fireEvent.click(screen.getByRole("button", { name: "30d" }));

    expect(screen.getByText("Monster Tron")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toBe("");
    expect(decksRequests("30d")).toBe(2);

    api.release("7d");
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(
      screen.getByRole("button", { name: "30d", pressed: true }),
    ).toBeTruthy();
    expect(screen.getByText("Monster Tron")).toBeTruthy();

    const requested = api.fetchMock.mock.calls.map(([input]) => String(input));
    expect(requested.every((url) => url.startsWith("/api/metagame/"))).toBe(
      true,
    );
    const urls = requested.map((url) => new URL(url, "http://localhost"));
    expect(urls[0].searchParams.get("window")).toBe("30d");
    expect(urls[0].searchParams.get("pageSize")).toBe("24");
  });
});

describe("the page before it first paints", () => {
  const prePaint = /<script>([\s\S]*?)<\/script>/.exec(page);

  const head = new DOMParser().parseFromString(page, "text/html").head;

  function runPrePaint(): void {
    new Function(prePaint?.[1] ?? "")();
  }

  function addThemeColours(): Element[] {
    const metas = [...head.querySelectorAll('meta[name="theme-color"]')].map(
      (meta) => meta.cloneNode() as Element,
    );
    document.head.append(...metas);

    return metas;
  }

  afterEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    document.head
      .querySelectorAll('meta[name="theme-color"]')
      .forEach((meta) => meta.remove());
    vi.restoreAllMocks();
  });

  it("runs from the head, before the app's script", () => {
    expect(prePaint?.index).toBeLessThan(page.indexOf("</head>"));
    expect(prePaint?.index).toBeLessThan(page.indexOf('type="module"'));
  });

  it("comes after both theme colours in the head, so it can set them", () => {
    const script = head.querySelector("script:not([src])");
    const metas = [...head.querySelectorAll('meta[name="theme-color"]')];

    expect(script).not.toBeNull();
    expect(metas).toHaveLength(2);
    metas.forEach((meta) => {
      expect(
        meta.compareDocumentPosition(script!) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });
  });

  it("applies a stored dark choice", () => {
    localStorage.setItem("theme", "dark");

    runPrePaint();

    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("sets the theme colour of a stored dark choice before the app mounts", () => {
    const metas = addThemeColours();
    localStorage.setItem("theme", "dark");

    runPrePaint();

    expect(metas.map((meta) => meta.getAttribute("media"))).toEqual([
      "(prefers-color-scheme: light)",
      "(prefers-color-scheme: dark)",
    ]);
    expect(metas.map((meta) => meta.getAttribute("content"))).toEqual([
      "#353537",
      "#353537",
    ]);
  });

  it("applies a stored light choice, whatever the device's setting", () => {
    localStorage.setItem("theme", "light");

    runPrePaint();

    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("sets the theme colour of a stored light choice, whatever the device's setting", () => {
    const metas = addThemeColours();
    localStorage.setItem("theme", "light");

    runPrePaint();

    expect(metas.map((meta) => meta.getAttribute("content"))).toEqual([
      "#f9f9f7",
      "#f9f9f7",
    ]);
  });

  it("leaves the theme to the device with no choice stored, or a value it does not know", () => {
    runPrePaint();

    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);

    localStorage.setItem("theme", "sepia");
    runPrePaint();

    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
  });

  it("leaves the theme to the device when the browser refuses to read storage", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("Storage is disabled", "SecurityError");
    });

    runPrePaint();

    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
  });

  it("applies the choice the toggle stored, on the next visit", () => {
    stubColourScheme(false);
    const { container } = render(<ThemeToggle />);
    fireEvent.click(
      within(container).getByRole("button", { name: "Dark theme" }),
    );
    document.documentElement.removeAttribute("data-theme");

    runPrePaint();

    expect(document.documentElement.dataset.theme).toBe("dark");
  });
});
