import React from "react";
import type { AIState } from "../../types/ai";
import { Badge } from "../shared/Badge";

interface HeaderProps {
  tabUrl: string;
  aiState: AIState;
  debuggerAttached: boolean;
  onAttachToggle: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  tabUrl,
  aiState,
  debuggerAttached,
  onAttachToggle,
}) => {
  // Extract hostname for compact display
  const getDisplayUrl = () => {
    if (!tabUrl) return "No active tab";
    try {
      const url = new URL(tabUrl);
      return url.hostname + (url.pathname !== "/" ? url.pathname.substring(0, 15) + "..." : "");
    } catch (e) {
      return tabUrl.substring(0, 25) + "...";
    }
  };

  return (
    <div
      style={{
        height: "48px",
        background: "var(--bg-secondary)",
        borderBottom: "1px solid var(--border-color)",
        padding: "0 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        zIndex: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <h1
          style={{
            fontSize: "13px",
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            background: "linear-gradient(90deg, #6c63ff, #00d4ff)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Nexinspect
        </h1>
        <Badge
          variant={aiState.isAvailable ? "cyan" : "pink"}
          className={aiState.isAvailable ? "animate-text-glow" : ""}
          style={{ fontSize: "8px", padding: "1px 4px" }}
        >
          {aiState.isAvailable ? "Gemini Nano" : "No AI"}
        </Badge>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "10px", maxWidth: "60%" }}>
        <span
          title={tabUrl}
          style={{
            fontSize: "11px",
            color: "var(--text-secondary)",
            fontFamily: "var(--font-mono)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {getDisplayUrl()}
        </span>

        <button
          onClick={onAttachToggle}
          title={debuggerAttached ? "Disconnect network debugger" : "Connect network debugger"}
          style={{
            padding: "4px 8px",
            fontSize: "10px",
            borderRadius: "4px",
            cursor: "pointer",
            fontFamily: "var(--font-sans)",
            fontWeight: 600,
            transition: "all var(--transition-fast)",
            background: debuggerAttached ? "rgba(255, 0, 127, 0.1)" : "rgba(108, 99, 255, 0.1)",
            border: `1px solid ${debuggerAttached ? "var(--accent-pink)" : "var(--accent-purple)"}`,
            color: debuggerAttached ? "var(--accent-pink)" : "var(--accent-purple)",
            boxShadow: debuggerAttached ? "0 0 6px var(--accent-pink-glow)" : "none",
          }}
        >
          {debuggerAttached ? "Disconnect" : "Inspect"}
        </button>
      </div>
    </div>
  );
};
