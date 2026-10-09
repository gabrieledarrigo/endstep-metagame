import { QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { BrowserRouter, Route, Routes } from "react-router";
import { createQueryClient } from "./api/queryClient";
import { Layout } from "./Layout";
import { DeckPage } from "./pages/deck/DeckPage";
import { MatchupsPage } from "./pages/matchups/MatchupsPage";
import { NotFoundPage } from "./pages/not-found/NotFoundPage";
import { OverviewPage } from "./pages/overview/OverviewPage";

export function App() {
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<OverviewPage />} />
            <Route path="decks/:slug" element={<DeckPage />} />
            <Route path="matchups" element={<MatchupsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
