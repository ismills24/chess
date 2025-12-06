import React from "react";
import "./ui.css";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "success";
  size?: "sm" | "md" | "lg";
  active?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = "secondary",
  size = "md",
  active = false,
  icon,
  iconRight,
  children,
  className = "",
  disabled,
  ...props
}) => {
  const classes = [
    "ui-button",
    `ui-button--${variant}`,
    `ui-button--${size}`,
    active && "ui-button--active",
    disabled && "ui-button--disabled",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button className={classes} disabled={disabled} {...props}>
      {icon && <span className="ui-button__icon">{icon}</span>}
      {children && <span className="ui-button__text">{children}</span>}
      {iconRight && <span className="ui-button__icon">{iconRight}</span>}
    </button>
  );
};

