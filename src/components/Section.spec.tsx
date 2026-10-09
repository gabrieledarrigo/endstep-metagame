import { useQuery } from "@tanstack/react-query";
import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithQueries } from "../../test/renderWithQueries";
import { Section } from "./Section";

function Probe({ load }: { load: () => Promise<string> }) {
  const query = useQuery({ queryKey: ["probe"], queryFn: load });

  return (
    <>
      <Section query={query} skeleton={<p>Loading</p>} title="It failed">
        {(data) => <p>Data: {data}</p>}
      </Section>
      <button type="button" onClick={() => query.refetch()}>
        Refresh
      </button>
      <p>Status: {query.status}</p>
    </>
  );
}

describe("Section", () => {
  it("shows the skeleton until the data arrives", async () => {
    renderWithQueries(<Probe load={() => Promise.resolve("decks")} />);

    expect(screen.getByText("Loading")).toBeTruthy();
    expect(await screen.findByText("Data: decks")).toBeTruthy();
  });

  it("shows the error with a retry when there is nothing to show, and the skeleton while the retry runs", async () => {
    const retried = Promise.withResolvers<string>();
    const load = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error("The request failed with status 404."))
      .mockReturnValueOnce(retried.promise);
    renderWithQueries(<Probe load={load} />);

    expect(
      await screen.findByRole("heading", { name: "It failed" }),
    ).toBeTruthy();
    expect(
      screen.getByText("The request failed with status 404."),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByText("Loading")).toBeTruthy();

    retried.resolve("decks");

    expect(await screen.findByText("Data: decks")).toBeTruthy();
  });

  it("keeps the data on screen when a refresh fails", async () => {
    const load = vi
      .fn<() => Promise<string>>()
      .mockResolvedValueOnce("decks")
      .mockRejectedValueOnce(new Error("Endstep did not respond."));
    renderWithQueries(<Probe load={load} />);
    await screen.findByText("Data: decks");

    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
    await screen.findByText("Status: error");

    expect(screen.getByText("Data: decks")).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "It failed" })).toBeNull();
  });
});
