import { OverviewPage } from "./pages/overview/OverviewPage";

export function App() {
  return (
    <div className="page">
      <header>
        <div className="page__eyebrow">Endstep</div>
        <h1>Pauper metagame</h1>
      </header>

      <OverviewPage />

      <footer>
        Data from <a href="https://endstep.cc/metagame">endstep.cc</a>. This is
        not an official Endstep product.
      </footer>
    </div>
  );
}
