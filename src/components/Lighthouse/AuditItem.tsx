import React, { useState } from "react";
import type { AuditResultItem } from "../../services/performanceAudit";
import { Badge } from "../shared/Badge";

interface AuditItemProps {
  item: AuditResultItem;
}

export const AuditItem: React.FC<AuditItemProps> = ({ item }) => {
  const [expanded, setExpanded] = useState(false);

  const getScoreVariant = (score: number) => {
    if (score === 1) return "cyan";
    if (score === 0.5) return "yellow";
    return "pink";
  };

  const getScoreIcon = (score: number) => {
    if (score === 1) {
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-cyan)" strokeWidth="3">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      );
    }
    if (score === 0.5) {
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-yellow)" strokeWidth="3">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      );
    }
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-pink)" strokeWidth="3">
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
      </svg>
    );
  };

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.01)",
        border: "1px solid var(--border-color)",
        borderRadius: "6px",
        padding: "10px 12px",
        fontFamily: "var(--font-sans)",
        display: "flex",
        flexDirection: "column",
        gap: "6px",
        transition: "all var(--transition-fast)",
      }}
    >
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          cursor: "pointer",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", maxWidth: "80%" }}>
          {getScoreIcon(item.score)}
          <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-primary)" }}>{item.title}</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Badge variant={getScoreVariant(item.score)} style={{ fontSize: "9px" }}>
            {item.displayValue}
          </Badge>
          <span style={{ fontSize: "10px", color: "var(--text-secondary)", transition: "transform var(--transition-fast)", transform: expanded ? "rotate(185deg)" : "none" }}>
            {"▼"}
          </span>
        </div>
      </div>

      {expanded && (
        <div
          style={{
            paddingTop: "8px",
            borderTop: "1px solid rgba(255,255,255,0.03)",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          <p style={{ margin: 0, fontSize: "10px", color: "var(--text-secondary)", lineHeight: "1.4" }}>
            {item.description}
          </p>

          <div
            style={{
              padding: "8px",
              background: "rgba(255,255,255,0.01)",
              borderRadius: "4px",
              border: "1px solid rgba(255,255,255,0.05)",
            }}
          >
            <div style={{ fontSize: "9px", fontWeight: 700, textTransform: "uppercase", color: "var(--accent-purple)", marginBottom: "4px" }}>
              Suggested Remediation
            </div>
            <div style={{ fontSize: "10px", color: "var(--text-primary)", lineHeight: "1.4" }}>
              {item.recommendation}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
