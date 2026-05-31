import React from "react";

interface BadgeProps {
  variant?: "purple" | "cyan" | "pink" | "green" | "yellow";
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = "purple",
  children,
  className = "",
  style,
}) => {
  return (
    <span className={`cyber-badge ${variant} ${className}`} style={style}>
      {children}
    </span>
  );
};
