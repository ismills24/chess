import React from "react";
import "./ui.css";

export const Divider: React.FC<{ className?: string }> = ({ className = "" }) => {
  return <hr className={`ui-divider ${className}`} />;
};

