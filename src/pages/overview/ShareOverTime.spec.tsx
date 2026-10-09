import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation, useNavigationType } from "react-router";
import { describe, expect, it } from "vitest";
import series from "../../../test/fixtures/share-series.json";
import type { ShareSeries } from "../../api/types";
import { ShareOverTime } from "./ShareOverTime";

function Address() {
  const { search } = useLocation();

  return (
    <p>
      Address: {search} by {useNavigationType()}
    </p>
  );
}

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <ShareOverTime series={series.series as ShareSeries[]} />
      <Address />
    </MemoryRouter>,
  );
}

function pressed(name: string) {
  return screen.getByRole("button", { name }).getAttribute("aria-pressed");
}

describe("ShareOverTime", () => {
  it("shows every series when the address hides none", () => {
    renderAt("/?window=30d");

    expect(pressed("Affinity")).toBe("true");
    expect(pressed("Mono Red Madness")).toBe("true");
  });

  it("reads the hidden series from the address", () => {
    renderAt("/?window=30d&hide=affinity-e93f5f74");

    expect(pressed("Affinity")).toBe("false");
    expect(pressed("Mono Red Madness")).toBe("true");
  });

  it("writes each toggle into the address, replacing the history entry", () => {
    renderAt("/?window=30d&hide=affinity-e93f5f74");

    fireEvent.click(screen.getByRole("button", { name: "Mono Red Madness" }));

    expect(
      screen.getByText(
        "Address: ?window=30d&hide=affinity-e93f5f74&hide=mono-red-madness-60596e8a by REPLACE",
      ),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Affinity" }));

    expect(
      screen.getByText(
        "Address: ?window=30d&hide=mono-red-madness-60596e8a by REPLACE",
      ),
    ).toBeTruthy();
    expect(pressed("Affinity")).toBe("true");
  });
});
