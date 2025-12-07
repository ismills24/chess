import React from "react";
import "./ui.css";

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "ghost" | "subtle" | "solid";
  size?: "sm" | "md" | "lg";
  active?: boolean;
  children: React.ReactNode;
}

export const IconButton: React.FC<IconButtonProps> = ({
  variant = "ghost",
  size = "md",
  active = false,
  children,
  className = "",
  disabled,
  ...props
}) => {
  const classes = [
    "ui-icon-button",
    `ui-icon-button--${variant}`,
    `ui-icon-button--${size}`,
    active && "ui-icon-button--active",
    disabled && "ui-icon-button--disabled",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button className={classes} disabled={disabled} {...props}>
      {children}
    </button>
  );
};

