import React from "react";
import "./ui.css";

export interface TextProps {
  as?: "p" | "span" | "h1" | "h2" | "h3" | "h4" | "label" | "small";
  variant?: "body" | "heading" | "subheading" | "caption" | "mono";
  color?: "default" | "muted" | "accent" | "success" | "danger" | "warning";
  weight?: "normal" | "medium" | "semibold" | "bold";
  align?: "left" | "center" | "right";
  children: React.ReactNode;
  className?: string;
}

export const Text: React.FC<TextProps> = ({
  as: Component = "p",
  variant = "body",
  color = "default",
  weight,
  align,
  children,
  className = "",
}) => {
  const classes = [
    "ui-text",
    `ui-text--${variant}`,
    `ui-text--${color}`,
    weight && `ui-text--${weight}`,
    align && `ui-text--${align}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return <Component className={classes}>{children}</Component>;
};

