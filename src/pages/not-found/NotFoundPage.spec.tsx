import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { NotFoundPage } from "./NotFoundPage";

describe("NotFoundPage", () => {
  it("says the page was not found", () => {
    render(
      <MemoryRouter initialEntries={["/no-such-page"]}>
        <NotFoundPage />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "Not found" }),
    ).toBeTruthy();
    expect(document.title).toBe("Not found · Pauper Endstep metagame");
  });

  it("removes the canonical link and og:url that the HTML set", () => {
    document.head.insertAdjacentHTML(
      "beforeend",
      '<link rel="canonical" href="https://pauper-endstep-metagame.vercel.app/staples" /><meta property="og:url" content="https://pauper-endstep-metagame.vercel.app/staples" />',
    );

    render(
      <MemoryRouter initialEntries={["/staples.html"]}>
        <NotFoundPage />
      </MemoryRouter>,
    );

    expect(document.head.querySelector('link[rel="canonical"]')).toBeNull();
    expect(document.head.querySelector('meta[property="og:url"]')).toBeNull();
  });
});
