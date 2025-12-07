import React from "react";
import "./ui.css";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "size"> {
  options: SelectOption[];
  label?: string;
  placeholder?: string;
  error?: string;
  size?: "sm" | "md" | "lg";
}

export const Select: React.FC<SelectProps> = ({
  options,
  label,
  placeholder,
  error,
  size = "md",
  className = "",
  id,
  value,
  ...props
}) => {
  const selectId = id || `select-${Math.random().toString(36).slice(2)}`;
  
  const selectClasses = [
    "ui-select",
    `ui-select--${size}`,
    error && "ui-select--error",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="ui-select-wrapper">
      {label && (
        <label htmlFor={selectId} className="ui-select__label">
          {label}
        </label>
      )}
      <div className="ui-select__container">
        <select id={selectId} className={selectClasses} value={value} {...props}>
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
        </select>
        <span className="ui-select__chevron">▾</span>
      </div>
      {error && <span className="ui-select__error">{error}</span>}
    </div>
  );
};

