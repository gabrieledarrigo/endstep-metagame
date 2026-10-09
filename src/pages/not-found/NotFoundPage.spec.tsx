import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NotFoundPage } from "./NotFoundPage";

describe("NotFoundPage", () => {
  it("says the page was not found", () => {
    render(<NotFoundPage />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Not found" }),
    ).toBeTruthy();
    expect(document.title).toBe("Not found · Pauper Endstep metagame");
  });
});
