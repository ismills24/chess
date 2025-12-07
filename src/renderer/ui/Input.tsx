import React from "react";
import "./ui.css";

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: string;
  error?: string;
  hint?: string;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "ghost";
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  hint,
  size = "md",
  variant = "default",
  className = "",
  id,
  ...props
}) => {
  const inputId = id || `input-${Math.random().toString(36).slice(2)}`;
  
  const inputClasses = [
    "ui-input",
    `ui-input--${size}`,
    `ui-input--${variant}`,
    error && "ui-input--error",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="ui-input-wrapper">
      {label && (
        <label htmlFor={inputId} className="ui-input__label">
          {label}
        </label>
      )}
      <input id={inputId} className={inputClasses} {...props} />
      {error && <span className="ui-input__error">{error}</span>}
      {hint && !error && <span className="ui-input__hint">{hint}</span>}
    </div>
  );
};

