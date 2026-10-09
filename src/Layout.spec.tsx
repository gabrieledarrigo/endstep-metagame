import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { describe, expect, it } from "vitest";
import { Layout } from "./Layout";

function Address() {
  const { pathname, search } = useLocation();

  return <p>Address: {pathname + search}</p>;
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
  it("frames the page with the site header and the attribution", () => {
    renderAt("/matchups?window=7d");

    expect(screen.getByRole("navigation", { name: "Pages" })).toBeTruthy();
    expect(screen.getByText("Address: /matchups?window=7d")).toBeTruthy();
    expect(screen.getByRole("contentinfo")).toBeTruthy();
  });

  it("writes the default window into an address that has none", async () => {
    renderAt("/decks/affinity-e93f5f74");

    expect(
      await screen.findByText("Address: /decks/affinity-e93f5f74?window=30d"),
    ).toBeTruthy();
  });

  it("replaces an unknown window with the default", async () => {
    renderAt("/?window=90d");

    expect(await screen.findByText("Address: /?window=30d")).toBeTruthy();
  });
});
