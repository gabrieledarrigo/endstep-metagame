import { QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { createQueryClient } from "../src/api/queryClient";

/**
 * Renders a tree inside a fresh query client with the application's policy, so specs never share a cache.
 *
 * @param ui - The tree to render.
 * @returns What Testing Library's `render` returns.
 */
export function renderWithQueries(ui: ReactElement) {
  return render(
    <QueryClientProvider client={createQueryClient()}>
      {ui}
    </QueryClientProvider>,
  );
}
