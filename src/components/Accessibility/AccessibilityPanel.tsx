import React from "react";
import type { AccessibilityViolation } from "../../services/accessibilityEngine";
import { IssueTree } from "./IssueTree";
import { ColorContrast } from "./ColorContrast";
import type { AIState } from "../../types/ai";

interface AccessibilityPanelProps {
  violations: AccessibilityViolation[];
  structureIssues: any[];
  aiState: AIState;
}

export const AccessibilityPanel: React.FC<AccessibilityPanelProps> = ({
  violations,
  structureIssues,
  aiState,
}) => {
  const critical = violations.filter((v) => v.impact === "critical").length;
  const serious  = violations.filter((v) => v.impact === "serious").length;
  const moderate = violations.filter((v) => v.impact === "moderate").length;
  const minor    = violations.filter((v) => v.impact === "minor").length;
  const contrastCount = violations.filter((v) => v.id === "contrast-low").length;

  const wcagScore = Math.max(0, 100 - (critical * 20 + serious * 10 + moderate * 5 + minor * 2));
  const scoreColor = wcagScore >= 80 ? "var(--accent-cyan)" : wcagScore >= 50 ? "var(--accent-yellow)" : "var(--accent-pink)";

  return (
    <div style={{
      padding: "16px",
      display: "flex",
      flexDirection: "column",
      gap: "14px",
      height: "calc(100vh - 48px)",
      overflowY: "auto",
      background: "var(--bg-primary)",
      color: "var(--text-primary)",
      fontFamily: "var(--font-sans)",
    }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ margin: 0, fontSize: "14px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--accent-purple)" }}>
          ♿ Accessibility Inspector
        </h2>
        <div style={{ fontSize: "10px", color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
          WCAG 2.1 · AA
        </div>
      </div>

      {/* Score + Breakdown */}
      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "14px", background: "var(--card-bg)", border: "1px solid var(--border-color)", borderRadius: "12px", padding: "16px" }}>
        {/* Circular Score */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "4px" }}>
          <svg width="72" height="72" viewBox="0 0 72 72">
            <circle cx="36" cy="36" r="30" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
            <circle
              cx="36" cy="36" r="30" fill="none" stroke={scoreColor} strokeWidth="8"
              strokeDasharray={`${(wcagScore / 100) * 188.5} 188.5`}
              strokeLinecap="round" strokeDashoffset="47.1"
              style={{ transition: "stroke-dasharray 0.8s ease", transformOrigin: "center", transform: "rotate(-90deg)" }}
            />
            <text x="36" y="40" textAnchor="middle" fill={scoreColor} fontSize="18" fontWeight="800" fontFamily="monospace">
              {wcagScore}
            </text>
          </svg>
          <span style={{ fontSize: "9px", textTransform: "uppercase", color: "var(--text-secondary)", letterSpacing: "0.08em" }}>
            WCAG Score
          </span>
        </div>

        {/* Breakdown bars */}
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: "6px" }}>
          {[
            { label: "Critical", count: critical, color: "var(--accent-pink)" },
            { label: "Serious",  count: serious,  color: "var(--accent-yellow)" },
            { label: "Moderate", count: moderate, color: "var(--accent-purple)" },
            { label: "Minor",    count: minor,    color: "var(--text-secondary)" },
          ].map(({ label, count, color }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ width: "68px", fontSize: "10px", color, fontWeight: 600 }}>{label}</div>
              <div style={{ flex: 1, height: "6px", background: "rgba(255,255,255,0.05)", borderRadius: "3px", overflow: "hidden" }}>
                <div style={{ width: `${Math.min(100, (count / Math.max(violations.length, 1)) * 100)}%`, height: "100%", background: color, borderRadius: "3px", transition: "width 0.6s ease" }} />
              </div>
              <div style={{ width: "20px", fontSize: "11px", fontWeight: 700, color, textAlign: "right" }}>{count}</div>
            </div>
          ))}
        </div>
      </div>

      {/* UX Impact Banner */}
      {violations.length > 0 && (
        <div style={{
          background: critical > 0 ? "rgba(255,0,127,0.06)" : "rgba(255,193,7,0.06)",
          border: `1px solid ${critical > 0 ? "rgba(255,0,127,0.3)" : "rgba(255,193,7,0.3)"}`,
          borderRadius: "10px",
          padding: "12px 14px",
        }}>
          <div style={{ fontSize: "9px", fontWeight: 800, textTransform: "uppercase", color: critical > 0 ? "var(--accent-pink)" : "var(--accent-yellow)", letterSpacing: "0.08em", marginBottom: "6px" }}>
            👤 User Experience Impact
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {critical > 0 && (
              <div style={{ fontSize: "11px", color: "var(--text-primary)" }}>
                • <strong style={{ color: "var(--accent-pink)" }}>High:</strong> {critical} issue(s) blocking assistive technology users completely
              </div>
            )}
            {serious > 0 && (
              <div style={{ fontSize: "11px", color: "var(--text-primary)" }}>
                • <strong style={{ color: "var(--accent-yellow)" }}>Medium:</strong> {serious} issue(s) significantly degrading screen reader experience
              </div>
            )}
            {contrastCount > 0 && (
              <div style={{ fontSize: "11px", color: "var(--text-primary)" }}>
                • <strong style={{ color: "var(--accent-purple)" }}>Visual:</strong> {contrastCount} contrast failure(s) affecting users with low vision and color blindness
              </div>
            )}
            {structureIssues.length > 0 && (
              <div style={{ fontSize: "11px", color: "var(--text-primary)" }}>
                • <strong>Structure:</strong> {structureIssues.length} heading gap(s) disrupting keyboard navigation
              </div>
            )}
          </div>
        </div>
      )}

      {/* Issues Tree */}
      <IssueTree violations={violations} aiState={aiState} />

      {/* Color Contrast */}
      <ColorContrast issues={violations} />

      {/* Structure Issues */}
      {structureIssues.length > 0 && (
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--border-color)", borderRadius: "10px", overflow: "hidden" }}>
          <div style={{ padding: "10px 14px", background: "rgba(108,99,255,0.06)", borderLeft: "4px solid var(--accent-purple)" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--accent-purple)" }}>📐 Semantic Structure Gaps</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {structureIssues.map((issue, idx) => (
              <div key={idx} style={{ padding: "10px 14px", borderTop: idx > 0 ? "1px solid rgba(255,255,255,0.04)" : "none", display: "flex", flexDirection: "column", gap: "6px" }}>
                <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-primary)" }}>{issue.message}</div>
                <div style={{ fontSize: "9px", color: "var(--text-secondary)", fontFamily: "var(--font-mono)", wordBreak: "break-all" }}>
                  Element: <code style={{ color: "var(--accent-purple)" }}>{issue.target?.substring(0, 100)}</code>
                </div>
                <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-color)", borderRadius: "6px", overflow: "hidden" }}>
                  <div style={{ padding: "5px 10px", background: "rgba(255,255,255,0.02)", borderBottom: "1px solid var(--border-color)", fontSize: "9px", fontWeight: 700, textTransform: "uppercase", color: "var(--accent-purple)" }}>🔧 Fix</div>
                  <pre style={{ margin: 0, padding: "8px 10px", fontSize: "10px", color: "var(--accent-cyan)", fontFamily: "var(--font-mono)", whiteSpace: "pre-wrap" }}>
{`<!-- Use sequential heading levels, never skip -->
<h1>Page Title</h1>
<h2>Section</h2>
<h3>Subsection</h3>`}
                  </pre>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
