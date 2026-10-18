import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SiteFooter } from "./SiteFooter";

describe("SiteFooter", () => {
  it.each([
    ["endstep.cc", "https://endstep.cc/metagame"],
    ["Scryfall", "https://scryfall.com"],
    [
      "Fan Content Policy",
      "https://company.wizards.com/en/legal/fancontentpolicy",
    ],
    ["Gabriele D'Arrigo", "https://github.com/gabrieledarrigo"],
    ["Source code", "https://github.com/gabrieledarrigo/endstep-metagame"],
  ])("links %s to %s, in the same tab", (name, href) => {
    render(<SiteFooter />);

    const link = screen.getByRole("link", { name });

    expect(link.getAttribute("href")).toBe(href);
    expect(link.getAttribute("target")).toBeNull();
  });

  it("credits the data and the card images, and says the site is independent of Endstep", () => {
    render(<SiteFooter />);

    expect(screen.getByRole("contentinfo").textContent).toContain(
      "Data from endstep.cc. This site is not affiliated with Endstep. Card images from Scryfall.",
    );
  });

  it("carries the Fan Content notice in the policy's own words", () => {
    render(<SiteFooter />);

    expect(screen.getByRole("contentinfo").textContent).toContain(
      "Pauper Endstep metagame is unofficial Fan Content permitted under the Fan Content Policy. Not approved/endorsed by Wizards. Portions of the materials used are property of Wizards of the Coast. ©Wizards of the Coast LLC.",
    );
  });

  it("names the site after its hidden mark, and its author", () => {
    render(<SiteFooter />);

    const name = screen.getByText("Pauper Endstep metagame");
    const mark = name.querySelector('svg[aria-hidden="true"]');

    expect(mark).toBeTruthy();
    expect(name.firstChild).toBe(mark);
    expect(screen.getByRole("contentinfo").textContent).toContain(
      "Made by Gabriele D'Arrigo · Source code",
    );
  });
});
