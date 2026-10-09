import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SiteFooter } from "./SiteFooter";

describe("SiteFooter", () => {
  it("attributes the data to Endstep and links to its source", () => {
    render(<SiteFooter />);

    expect(
      screen.getByRole("link", { name: "endstep.cc" }).getAttribute("href"),
    ).toBe("https://endstep.cc/metagame");
    expect(screen.getByRole("contentinfo").textContent).toContain(
      "This is not an official Endstep product.",
    );
  });
});
