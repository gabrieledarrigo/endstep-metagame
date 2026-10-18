import { fireEvent, render, screen, within } from "@testing-library/react";
import { type Mock, describe, expect, it, vi } from "vitest";
import matrix from "../../../test/fixtures/matchups.json";
import type { MatrixDeck } from "../../api/types";
import { Metagame, MetagameSkeleton } from "./Metagame";

const DECKS = matrix.decks as MatrixDeck[];

type Options = {
  changes?: Record<string, number>;
  foldable?: boolean;
  open?: boolean;
};

type Rendered = {
  onToggle: Mock;
  onStep: Mock;
  onReset: Mock;
  container: HTMLElement;
};

function renderPanel({
  changes = {},
  foldable = false,
  open = false,
}: Options): Rendered {
  const handlers = { onToggle: vi.fn(), onStep: vi.fn(), onReset: vi.fn() };

  const { container } = render(
    <Metagame
      decks={DECKS}
      changes={changes}
      foldable={foldable}
      open={open}
      {...handlers}
    />,
  );

  return { ...handlers, container };
}

function rows(): string[] {
  return within(screen.getByRole("list"))
    .getAllByRole("listitem")
    .map((item) => item.textContent ?? "");
}

describe("Metagame", () => {
  it("lists every deck in share order with its share, the note and the decks left out", () => {
    renderPanel({});

    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "The metagame you expect",
      }),
    ).toBeTruthy();
    expect(
      screen.getByText(
        "How often you expect to meet each deck. Each step is one point.",
      ),
    ).toBeTruthy();
    expect(rows()).toEqual([
      "Affinity−9.4%+",
      "Mono Red Madness−6.8%+",
      "Monster Tron−4.7%+",
      "Naya Gates−1.2%+",
    ]);
    expect(
      screen.getByText(
        "The top 4 hold 22.1% of registrations. The other 77.9% are left out of the sum.",
      ),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Reset" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Change" })).toBeNull();
  });

  it("shows a changed share, and the window's share after the deck's name", () => {
    const { container } = renderPanel({
      changes: { "naya-gates-af060ab8": 3, "affinity-e93f5f74": -2 },
    });

    expect(rows()).toEqual([
      "Affinity was 9.4%−7.4%+",
      "Mono Red Madness−6.8%+",
      "Monster Tron−4.7%+",
      "Naya Gates was 1.2%−4.2%+",
    ]);
    expect(container.querySelectorAll(".metagame__row--changed")).toHaveLength(
      2,
    );
  });

  it("passes a press on a stepper up with the deck and the step", () => {
    const { onStep } = renderPanel({});

    fireEvent.click(screen.getByRole("button", { name: "More Monster Tron" }));
    fireEvent.click(screen.getByRole("button", { name: "Less Affinity" }));

    expect(onStep.mock.calls).toEqual([
      ["monster-tron-1bc68613", 1],
      ["affinity-e93f5f74", -1],
    ]);
  });

  it("stops Less at zero and on the last deck above zero", () => {
    renderPanel({
      changes: {
        "mono-red-madness-60596e8a": -7,
        "monster-tron-1bc68613": -5,
        "naya-gates-af060ab8": -2,
      },
    });
    const disabled = screen
      .getAllByRole("button")
      .filter((button) => button.getAttribute("aria-disabled") === "true")
      .map((button) => button.getAttribute("aria-label"));

    expect(disabled).toEqual([
      "Less Affinity",
      "Less Mono Red Madness",
      "Less Monster Tron",
      "Less Naya Gates",
    ]);
  });

  it("offers Reset once anything has changed, and moves focus to the title on a press", () => {
    const { onReset } = renderPanel({
      changes: { "affinity-e93f5f74": 1 },
    });

    fireEvent.click(screen.getByRole("button", { name: "Reset" }));

    expect(onReset).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(
      screen.getByRole("heading", { name: "The metagame you expect" }),
    );
  });

  it("folds into its heading with Change, which controls the list", () => {
    const { onToggle } = renderPanel({ foldable: true });
    const toggle = screen.getByRole("button", { name: "Change" });

    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("list")).toBeNull();
    expect(
      document.getElementById(toggle.getAttribute("aria-controls") ?? "")
        ?.hidden,
    ).toBe(true);

    fireEvent.click(toggle);

    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("opens with Close", () => {
    renderPanel({ foldable: true, open: true });

    expect(
      screen
        .getByRole("button", { name: "Close" })
        .getAttribute("aria-expanded"),
    ).toBe("true");
    expect(screen.getByRole("list")).toBeTruthy();
  });
});

describe("MetagameSkeleton", () => {
  it("keeps the title and marks the panel busy", () => {
    const { container } = render(<MetagameSkeleton foldable={false} />);

    expect(
      screen.getByRole("heading", { name: "The metagame you expect" }),
    ).toBeTruthy();
    expect(
      container.querySelector(".metagame")?.getAttribute("aria-busy"),
    ).toBe("true");
    expect(container.querySelector(".skeleton")).toBeTruthy();
  });

  it("shows the folded heading, with a placeholder for its toggle, where the panel folds", () => {
    const { container } = render(<MetagameSkeleton foldable />);

    expect(container.querySelectorAll(".skeleton")).toHaveLength(1);
    expect(
      container.querySelector(".metagame__summary .skeleton"),
    ).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });
});
