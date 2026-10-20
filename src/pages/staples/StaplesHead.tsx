import { PageTitle } from "../../components/PageTitle";
import "./StaplesHead.css";

export function StaplesHead() {
  return (
    <div className="staples-head">
      <PageTitle title="Staples" />
      <p className="staples-head__intro">
        The cards the top 24 decks play most.
      </p>
    </div>
  );
}
