import type { ComponentProps } from "react";
import { Link, type LinkProps } from "react-router";
import "./Button.css";

type ButtonProps = ComponentProps<"button"> & {
  variant?: "primary" | "secondary" | "ghost";
};

export function Button({
  variant = "primary",
  className,
  children,
  ...rest
}: ButtonProps) {
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

type ButtonLinkProps = LinkProps & {
  variant?: "primary" | "secondary" | "ghost";
};

export function ButtonLink({
  variant = "primary",
  className,
  ...rest
}: ButtonLinkProps) {
  return (
    <Link
      {...rest}
      className={["button", "button--" + variant, "button--link", className]
        .filter(Boolean)
        .join(" ")}
    />
  );
}
