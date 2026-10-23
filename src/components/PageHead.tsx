import { PageTitle } from "./PageTitle";
import "./PageHead.css";

type PageHeadProps = {
  title: string;
  line: string;
};

export function PageHead({ title, line }: PageHeadProps) {
  return (
    <div className="page-head">
      <PageTitle title={title} />
      <p className="page-head__line">{line}</p>
    </div>
  );
}
