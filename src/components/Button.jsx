export function Button({ variant = "primary", className, children, ...rest }) {
  return (
    <button
      type="button"
      {...rest}
      className={["button", "button--" + variant, className]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </button>
  );
}
