import "./PageTitle.css";

export function PageTitle({ title }: { title: string }) {
  return (
    <h1 className="page-title" tabIndex={-1}>
      <span className="page-title__eyebrow">{title}</span> Endstep Pauper
      metagame
    </h1>
  );
}
