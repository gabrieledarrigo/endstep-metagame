import { Panel } from "../../components/Panel";
import "./HowItWorks.css";

const ITEMS = [
  {
    subject: "How we count.",
    text: "For each deck, we take its win rate against each of the top 24 decks. We weight each one by how often you expect to meet that deck. A mirror match counts as 50%. So does a matchup with fewer than 20 matches, and it widens the bar.",
  },
  {
    subject: "The bars.",
    text: "Each bar shows where the true rate most likely is. Blue is clearly above 50%, red is clearly below, grey is too close to call.",
  },
  {
    subject: "Our pick.",
    text: "The deck with the best rate. When other decks are too close to tell apart, we name them too, up to three.",
  },
  {
    subject: "Decks outside the top 24.",
    text: "About a quarter of the decks played are outside the top 24. We have no matchup data for them, so we leave them out. That is why these rates are a little lower than each deck’s overall win rate.",
  },
];

export function HowItWorks() {
  return (
    <Panel className="how-it-works">
      <h2 className="how-it-works__title">How the numbers are made</h2>
      {ITEMS.map((item) => (
        <p key={item.subject} className="how-it-works__item">
          <b className="how-it-works__subject">{item.subject}</b> {item.text}
        </p>
      ))}
    </Panel>
  );
}
