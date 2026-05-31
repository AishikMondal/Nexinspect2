import React, { useState } from "react";

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: "top" | "bottom" | "left" | "right";
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = "top",
}) => {
  const [active, setActive] = useState(false);

  const getPositionClass = () => {
    switch (position) {
      case "bottom":
        return "top-full left-1/2 -translate-x-1/2 mt-2";
      case "left":
        return "right-full top-1/2 -translate-y-1/2 mr-2";
      case "right":
        return "left-full top-1/2 -translate-y-1/2 ml-2";
      case "top":
      default:
        return "bottom-full left-1/2 -translate-x-1/2 mb-2";
    }
  };

  return (
    <div
      style={{ position: "relative", display: "inline-block" }}
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
    >
      {children}
      {active && (
        <div
          className="animate-fade-in"
          style={{
            position: "absolute",
            zIndex: 100,
            width: "max-content",
            maxWidth: "200px",
            padding: "6px 10px",
            fontSize: "10px",
            color: "var(--text-primary)",
            background: "rgba(12, 12, 20, 0.95)",
            backdropFilter: "blur(4px)",
            border: "1px solid var(--accent-purple)",
            borderRadius: "4px",
            pointerEvents: "none",
            boxShadow: "0 0 8px var(--accent-purple-glow)",
            ...getStylesForPosition(),
          }}
        >
          {content}
        </div>
      )}
    </div>
  );

  function getStylesForPosition() {
    switch (position) {
      case "bottom":
        return { top: "100%", left: "50%", transform: "translateX(-50%)", marginTop: "6px" };
      case "left":
        return { top: "50%", right: "100%", transform: "translateY(-50%)", marginRight: "6px" };
      case "right":
        return { top: "50%", left: "100%", transform: "translateY(-50%)", marginLeft: "6px" };
      case "top":
      default:
        return { bottom: "100%", left: "50%", transform: "translateX(-50%)", marginBottom: "6px" };
    }
  }
};
