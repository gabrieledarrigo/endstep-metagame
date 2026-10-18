import "./SiteMark.css";

export function SiteMark() {
  return (
    <svg
      className="site-mark"
      width="20"
      height="20"
      viewBox="0 0 64 64"
      aria-hidden="true"
    >
      <rect className="site-mark__tile" width="64" height="64" rx="14" />
      <rect
        className="site-mark__bar"
        x="14"
        y="14.5"
        width="36"
        height="9"
        rx="3"
      />
      <rect
        className="site-mark__bar site-mark__bar--2"
        x="14"
        y="27.5"
        width="26"
        height="9"
        rx="3"
      />
      <rect
        className="site-mark__bar site-mark__bar--3"
        x="14"
        y="40.5"
        width="16"
        height="9"
        rx="3"
      />
    </svg>
  );
}
