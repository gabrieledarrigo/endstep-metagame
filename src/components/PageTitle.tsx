import { SITE_NAME } from "../config";
import { Skeleton } from "./Skeleton";
import "./PageTitle.css";

type PageTitleProps = {
  title: string;
  loading?: boolean;
};

export function PageTitle({ title, loading }: PageTitleProps) {
  return (
    <>
      <title>{`${title} · ${SITE_NAME}`}</title>
      <h1 className="page-title" tabIndex={-1}>
        {loading ? (
          <>
            <span className="visually-hidden">{title}</span>
            <Skeleton width={180} height="1.6em" />
          </>
        ) : (
          title
        )}
      </h1>
    </>
  );
}
