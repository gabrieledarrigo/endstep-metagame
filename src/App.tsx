import { BrowserRouter, Route, Routes } from "react-router";
import { Layout } from "./Layout";
import { OverviewPage } from "./pages/overview/OverviewPage";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<OverviewPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
