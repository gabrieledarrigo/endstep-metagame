import { fireEvent, render, screen } from "@testing-library/react";
import type { MouseEvent } from "react";
import { MemoryRouter, useLocation } from "react-router";
import { describe, expect, it } from "vitest";
import { ChartLink } from "./ChartLink";

function Address() {
  const { pathname, search } = useLocation();

  return <p>Address: {pathname + search}</p>;
}

function renderLink(
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void,
): HTMLElement {
  render(
    <MemoryRouter initialEntries={["/?window=7d"]}>
      <svg>
        <ChartLink to="/decks/affinity-e93f5f74" onClick={onClick}>
          <text>Affinity</text>
        </ChartLink>
      </svg>
      <Address />
    </MemoryRouter>,
  );

  return screen.getByRole("link", { name: "Affinity" });
}

describe("ChartLink", () => {
  it("links to the page in the current window, out of the tab order", () => {
    const link = renderLink();

    expect(link.getAttribute("href")).toBe(
      "/decks/affinity-e93f5f74?window=7d",
    );
    expect(link.getAttribute("tabindex")).toBe("-1");
  });

  it("opens the page through the router on a plain click", () => {
    const link = renderLink();

    fireEvent.click(link);

    expect(
      screen.getByText("Address: /decks/affinity-e93f5f74?window=7d"),
    ).toBeTruthy();
  });

  it("leaves a modified click to the browser", () => {
    const link = renderLink();

    expect(fireEvent.click(link, { ctrlKey: true })).toBe(true);
    expect(screen.getByText("Address: /?window=7d")).toBeTruthy();
  });

  it("stays put when its click handler prevents the default", () => {
    const link = renderLink((event) => event.preventDefault());

    fireEvent.click(link);

    expect(screen.getByText("Address: /?window=7d")).toBeTruthy();
  });
});
