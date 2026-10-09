import { render, screen } from "@testing-library/react";
import {
  MemoryRouter,
  Route,
  Routes,
  useLocation,
  useNavigationType,
} from "react-router";
import { describe, expect, it } from "vitest";
import { Layout } from "./Layout";

function Address() {
  const { pathname, search, hash } = useLocation();
  const navigationType = useNavigationType();

  return (
    <>
      <p>Address: {pathname + search + hash}</p>
      <p>Navigation: {navigationType}</p>
    </>
  );
}

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="*" element={<Address />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("Layout", () => {
  it("frames the page with the site header, the main content and the attribution", () => {
    renderAt("/matchups?window=7d");

    expect(screen.getByRole("navigation", { name: "Pages" })).toBeTruthy();
    expect(screen.getByRole("main").textContent).toContain(
      "Address: /matchups?window=7d",
    );
    expect(screen.getByRole("contentinfo")).toBeTruthy();
  });

  it("writes the default window into an address that has none, replacing the history entry", async () => {
    renderAt("/decks/affinity-e93f5f74");

    expect(
      await screen.findByText("Address: /decks/affinity-e93f5f74?window=30d"),
    ).toBeTruthy();
    expect(screen.getByText("Navigation: REPLACE")).toBeTruthy();
  });

  it("replaces an unknown window and keeps the rest of the address", async () => {
    renderAt("/?window=90d&deck=affinity#grid");

    expect(
      await screen.findByText("Address: /?window=30d&deck=affinity#grid"),
    ).toBeTruthy();
  });
});
