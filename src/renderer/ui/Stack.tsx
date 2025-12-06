import React from "react";
import "./ui.css";

export interface StackProps {
  direction?: "row" | "column";
  gap?: "none" | "xs" | "sm" | "md" | "lg" | "xl";
  align?: "start" | "center" | "end" | "stretch";
  justify?: "start" | "center" | "end" | "between" | "around";
  wrap?: boolean;
  children: React.ReactNode;
  className?: string;
}

export const Stack: React.FC<StackProps> = ({
  direction = "row",
  gap = "md",
  align = "start",
  justify = "start",
  wrap = false,
  children,
  className = "",
}) => {
  const classes = [
    "ui-stack",
    `ui-stack--${direction}`,
    `ui-stack--gap-${gap}`,
    `ui-stack--align-${align}`,
    `ui-stack--justify-${justify}`,
    wrap && "ui-stack--wrap",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return <div className={classes}>{children}</div>;
};
