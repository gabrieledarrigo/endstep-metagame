import { act, fireEvent, render, screen } from "@testing-library/react";
import { Link, MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it } from "vitest";
import { useCanonicalLink } from "./useCanonicalLink";

function Page({ path }: { path?: string | null }) {
  useCanonicalLink(path);

  return (
    <>
      <Link to="/staples?window=7d">Staples</Link>
      <Link to="/staples?window=30d">Another window</Link>
    </>
  );
}

function renderAt(path: string, page?: string | null): void {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="*" element={<Page path={page} />} />
      </Routes>
    </MemoryRouter>,
  );
}

function canonical(): string[] {
  return [
    ...document.head.querySelectorAll<HTMLLinkElement>('link[rel="canonical"]'),
  ].map((link) => link.href);
}

function ogUrl(): (string | null)[] {
  return [...document.head.querySelectorAll('meta[property="og:url"]')].map(
    (meta) => meta.getAttribute("content"),
  );
}

function addStatic(address: string): void {
  document.head.insertAdjacentHTML(
    "beforeend",
    `<link rel="canonical" href="${address}" /><meta property="og:url" content="${address}" />`,
  );
}

describe("useCanonicalLink", () => {
  it("adds both tags with the full address of the path, with no query, when the HTML has none", () => {
    renderAt("/matchups?window=30d&deck=affinity-e93f5f74");

    expect(canonical()).toEqual([
      "https://pauper-endstep-metagame.vercel.app/matchups",
    ]);
    expect(ogUrl()).toEqual([
      "https://pauper-endstep-metagame.vercel.app/matchups",
    ]);
  });

  it("moves the tags the HTML set to the new path on a route change, without adding more", async () => {
    addStatic("https://pauper-endstep-metagame.vercel.app/");
    renderAt("/?window=7d");

    await act(async () => {
      fireEvent.click(screen.getByRole("link", { name: "Staples" }));
    });

    expect(canonical()).toEqual([
      "https://pauper-endstep-metagame.vercel.app/staples",
    ]);
    expect(ogUrl()).toEqual([
      "https://pauper-endstep-metagame.vercel.app/staples",
    ]);
  });

  it("writes nothing when only the query changes", async () => {
    renderAt("/staples?window=7d");
    document.head
      .querySelector('link[rel="canonical"]')
      ?.setAttribute("href", "https://example.com/untouched");

    await act(async () => {
      fireEvent.click(screen.getByRole("link", { name: "Another window" }));
    });

    expect(canonical()).toEqual(["https://example.com/untouched"]);
  });

  it("leaves out a trailing slash", () => {
    renderAt("/staples/?window=7d");

    expect(canonical()).toEqual([
      "https://pauper-endstep-metagame.vercel.app/staples",
    ]);
  });

  it("names the page's own path when it differs from the address", () => {
    renderAt("/decks/old-alias?window=30d", "/decks/monster-tron-1bc68613");

    expect(canonical()).toEqual([
      "https://pauper-endstep-metagame.vercel.app/decks/monster-tron-1bc68613",
    ]);
    expect(ogUrl()).toEqual([
      "https://pauper-endstep-metagame.vercel.app/decks/monster-tron-1bc68613",
    ]);
  });

  it("removes both tags on a page that does not exist, even the ones the HTML set", () => {
    addStatic("https://pauper-endstep-metagame.vercel.app/staples");
    renderAt("/staples.html", null);

    expect(canonical()).toEqual([]);
    expect(ogUrl()).toEqual([]);
  });
});
