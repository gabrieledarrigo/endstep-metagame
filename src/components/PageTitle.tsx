import { SITE_NAME } from "../config";
import { Skeleton } from "./Skeleton";
import "./PageTitle.css";

type PageTitleProps = {
  title: string;
  loading?: boolean;
  hero?: boolean;
};

export function PageTitle({ title, loading, hero }: PageTitleProps) {
  return (
    <>
      <title>{`${title} · ${SITE_NAME}`}</title>
      <h1
        className={hero ? "page-title page-title--hero" : "page-title"}
        tabIndex={-1}
      >
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
