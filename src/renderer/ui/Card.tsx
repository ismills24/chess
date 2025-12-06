import React from "react";
import "./ui.css";

export interface CardProps {
  variant?: "default" | "elevated" | "outlined" | "glass";
  padding?: "none" | "sm" | "md" | "lg";
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  interactive?: boolean;
}

export const Card: React.FC<CardProps> = ({
  variant = "default",
  padding = "md",
  children,
  className = "",
  onClick,
  interactive = false,
}) => {
  const classes = [
    "ui-card",
    `ui-card--${variant}`,
    `ui-card--padding-${padding}`,
    (interactive || onClick) && "ui-card--interactive",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes} onClick={onClick}>
      {children}
    </div>
  );
};

