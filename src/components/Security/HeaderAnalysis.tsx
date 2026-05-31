import React from "react";
import type { InsecureHeaderReport } from "../../types/security";
import { Badge } from "../shared/Badge";

interface HeaderAnalysisProps {
  report: InsecureHeaderReport;
}

export const HeaderAnalysis: React.FC<HeaderAnalysisProps> = ({ report }) => {
  const getStatusColor = (status: string) => {
    if (status === "secure") return "var(--accent-cyan)";
    if (status === "warning") return "var(--accent-yellow)";
    return "var(--accent-pink)";
  };

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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <h4 style={{ margin: 0, fontSize: "11px", textTransform: "uppercase", color: "var(--accent-purple)" }}>
          HTTP Security Headers Analysis
        </h4>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
            Score: <strong style={{ color: "var(--text-primary)" }}>{report.score}/100</strong>
          </span>
          <Badge variant={report.score >= 80 ? "cyan" : report.score >= 60 ? "yellow" : "pink"} style={{ fontSize: "12px", padding: "2px 6px" }}>
            Grade {report.grade}
          </Badge>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {report.headers.map((h, idx) => {
          const color = getStatusColor(h.status);
          return (
            <div
              key={idx}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "4px",
                padding: "8px",
                borderRadius: "4px",
                background: "rgba(255, 255, 255, 0.01)",
                borderLeft: `3px solid ${color}`,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-primary)" }}>{h.name}</span>
                <span
                  style={{
                    fontSize: "8px",
                    textTransform: "uppercase",
                    padding: "1px 4px",
                    borderRadius: "3px",
                    background: `${color}1a`,
                    color,
                    border: `1px solid ${color}33`,
                    fontWeight: 600,
                  }}
                >
                  {h.status}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: "10px", color: "var(--text-secondary)", lineHeight: "1.4" }}>
                {h.description}
              </p>
              {h.present && (
                <div style={{ fontSize: "9px", fontFamily: "var(--font-mono)", color: "var(--accent-cyan)", background: "rgba(255,255,255,0.02)", padding: "4px 6px", borderRadius: "3px", overflowX: "auto", marginTop: "4px" }}>
                  {h.value}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
