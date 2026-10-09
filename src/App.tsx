import { BrowserRouter, Route, Routes } from "react-router";
import { Layout } from "./Layout";
import { DeckPage } from "./pages/deck/DeckPage";
import { MatchupsPage } from "./pages/matchups/MatchupsPage";
import { NotFoundPage } from "./pages/not-found/NotFoundPage";
import { OverviewPage } from "./pages/overview/OverviewPage";

export function App() {
  return (
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
  );
}
