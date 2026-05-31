import React from "react";
import type { AccessibilityViolation } from "../../services/accessibilityEngine";
import { getWcagCompliance } from "../../services/accessibilityEngine";
import { Badge } from "../shared/Badge";

interface ColorContrastProps {
  issues: AccessibilityViolation[];
}

export const ColorContrast: React.FC<ColorContrastProps> = ({ issues }) => {
  const contrastIssues = issues.filter((i) => i.id === "contrast-low");

  return (
    <div
      style={{
        background: "var(--card-bg)",
        border: "1px solid var(--border-color)",
        borderRadius: "8px",
        padding: "16px",
        fontFamily: "var(--font-sans)",
      }}
    >
      <h4 style={{ margin: "0 0 12px 0", fontSize: "11px", textTransform: "uppercase", color: "var(--accent-purple)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>Color Contrast Compliance</span>
        {contrastIssues.length > 0 && (
          <Badge variant="pink" style={{ fontSize: "9px" }}>
            {contrastIssues.length} low contrast items
          </Badge>
        )}
      </h4>

      {contrastIssues.length === 0 ? (
        <div style={{ fontSize: "11px", color: "var(--text-secondary)", fontStyle: "italic", textAlign: "center", padding: "12px 0" }}>
          All audited text elements meet the minimum WCAG contrast standards.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxHeight: "300px", overflowY: "auto" }}>
          {contrastIssues.map((issue, idx) => {
            const ratio = issue.contrastRatio || 1;
            const apca = issue.apcaScore || 0;
            const wcag = getWcagCompliance(ratio, false);

            // Scrape actual style strings from message
            const textColorMatch = issue.message.match(/Text color:\s*(rgb\([^)]+\)|rgba\([^)]+\)|#[0-9a-fA-F]{3,6})/i);
            const bgColorMatch = issue.message.match(/BG:\s*(rgb\([^)]+\)|rgba\([^)]+\)|#[0-9a-fA-F]{3,6})/i);
            const textColor = textColorMatch ? textColorMatch[1] : "var(--text-primary)";
            const bgColor = bgColorMatch ? bgColorMatch[1] : "rgba(255,255,255,0.02)";

            return (
              <div
                key={idx}
                style={{
                  padding: "10px",
                  borderRadius: "6px",
                  background: "rgba(255, 255, 255, 0.01)",
                  border: "1px solid var(--border-color)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
                    {issue.element.toUpperCase()} Element
                  </span>
                  <div style={{ display: "flex", gap: "4px" }}>
                    <Badge variant="pink">{ratio}:1 Ratio</Badge>
                    <Badge variant="yellow">APCA Lc {apca}</Badge>
                  </div>
                </div>

                {/* Preview block */}
                <div
                  style={{
                    padding: "12px",
                    borderRadius: "4px",
                    background: bgColor,
                    color: textColor,
                    fontSize: "11px",
                    fontWeight: 500,
                    textAlign: "center",
                    border: "1px solid rgba(255,255,255,0.05)",
                  }}
                >
                  Text element color contrast preview
                </div>

                <div style={{ fontSize: "10px", color: "var(--text-secondary)", lineHeight: "1.4" }}>
                  WCAG Status: <strong style={{ color: "var(--accent-pink)" }}>{wcag.statusText}</strong>
                  <div style={{ fontSize: "9px", marginTop: "2px", opacity: 0.8 }}>
                    HTML target: <code style={{ fontFamily: "var(--font-mono)", color: "var(--accent-yellow)" }}>{issue.target}</code>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
