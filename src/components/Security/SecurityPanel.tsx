import React, { useState } from "react";
import type { SecurityReport } from "../../types/security";
import { CertificateInfo } from "./CertificateInfo";
import { HeaderAnalysis } from "./HeaderAnalysis";
import { VulnerabilityList } from "./VulnerabilityList";
import { createGeminiNanoSession, prompts } from "../../services/geminiNano";
import type { AIState } from "../../types/ai";

interface SecurityPanelProps {
  report: SecurityReport;
  aiState: AIState;
  domData?: any;
}

const severityColor: Record<string, string> = {
  critical: "var(--accent-pink)",
  high: "var(--accent-pink)",
  medium: "var(--accent-yellow)",
  low: "var(--accent-purple)",
  info: "var(--text-secondary)",
};

const severityIcon: Record<string, string> = {
  critical: "🔴",
  high: "🟠",
  medium: "🟡",
  low: "🔵",
  info: "⚪",
};

const fixForSecurityIssue: Record<string, string> = {
  "exposed-key": `// Never expose secrets in client-side code.
// Use environment variables server-side:
const API_KEY = process.env.API_KEY; // ✅ server only

// For frontend, use a backend proxy:
// Client → Your server → Third-party API`,
  "storage-risk": `// Avoid storing sensitive data in localStorage.
// Use httpOnly cookies set by your server instead:

// server (Express):
res.cookie('session', token, {
  httpOnly: true,    // ← not accessible from JS
  secure: true,      // ← HTTPS only
  sameSite: 'Strict' // ← CSRF protection
});`,
  "unsafe-dom": `// Never use innerHTML with untrusted data:
// ❌ element.innerHTML = userInput;

// ✅ Use textContent for plain text:
element.textContent = userInput;

// ✅ Or use DOMPurify for rich content:
import DOMPurify from 'dompurify';
element.innerHTML = DOMPurify.sanitize(userInput);`,
  "tracker": `// Control third-party scripts with Content Security Policy:
// Add to HTTP response headers:
Content-Security-Policy: script-src 'self' https://www.google-analytics.com;

// Or delay loading trackers until user consents:
if (userConsented) loadAnalytics();`,
};

export const SecurityPanel: React.FC<SecurityPanelProps> = ({ report, aiState, domData }) => {
  const [aiReport, setAiReport] = useState<string>("");
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string>("");
  const [expandedIssue, setExpandedIssue] = useState<string | null>(null);
  const [copiedFix, setCopiedFix] = useState<string | null>(null);

  const securityIssues: any[] = domData?.securityIssues || [];
  const criticalIssues = securityIssues.filter((i) => i.severity === "critical" || i.severity === "high");
  const trackers = securityIssues.filter((i) => i.type === "tracker");
  const dataIssues = securityIssues.filter((i) => i.type !== "tracker");

  const analyzeWithAI = async () => {
    if (!aiState.isAvailable) { setAiError("Gemini Nano is not available on this device."); return; }
    setAiLoading(true); setAiError(""); setAiReport("");
    try {
      const session = await createGeminiNanoSession("You are DevTools Pro AI Advisor. Analyze security findings and explain exposure risks with mitigations.");
      const result = await session.prompt(prompts.securityRisks(report.headerReport.grade, report.headerReport.score, report.headerReport.headers.filter((h) => h.status !== "secure").map((h) => h.name), report.cookies.filter((c) => c.status !== "secure").length, criticalIssues.length));
      setAiReport(result);
      session.destroy();
    } catch (err: any) {
      setAiError(err.message || "Failed to generate AI insights.");
    } finally { setAiLoading(false); }
  };

  const copyFix = (code: string, key: string) => {
    navigator.clipboard.writeText(code).then(() => { setCopiedFix(key); setTimeout(() => setCopiedFix(null), 2000); });
  };

  const gradeColor = (g: string) => g === "A" || g === "A+" ? "var(--accent-cyan)" : ["B", "B+"].includes(g) ? "var(--accent-yellow)" : "var(--accent-pink)";

  return (
    <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "14px", height: "calc(100vh - 48px)", overflowY: "auto", background: "var(--bg-primary)", color: "var(--text-primary)", fontFamily: "var(--font-sans)" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ margin: 0, fontSize: "14px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--accent-purple)" }}>
          🔒 Security Operations Center
        </h2>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <div style={{ fontSize: "22px", fontWeight: 800, color: gradeColor(report.headerReport.grade), fontFamily: "var(--font-mono)" }}>{report.headerReport.grade}</div>
          <div style={{ fontSize: "9px", color: "var(--text-secondary)" }}>Header Grade</div>
        </div>
      </div>

      {/* Critical Alert Banner */}
      {criticalIssues.length > 0 && (
        <div style={{ background: "rgba(255,0,127,0.08)", border: "2px solid rgba(255,0,127,0.5)", borderRadius: "10px", padding: "12px 14px" }}>
          <div style={{ fontSize: "9px", fontWeight: 800, textTransform: "uppercase", color: "var(--accent-pink)", marginBottom: "8px", letterSpacing: "0.08em" }}>
            🚨 Critical Security Issues Detected
          </div>
          {criticalIssues.map((issue, i) => (
            <div key={i} style={{ fontSize: "11px", color: "var(--text-primary)", padding: "3px 0", borderBottom: i < criticalIssues.length - 1 ? "1px solid rgba(255,0,127,0.1)" : "none" }}>
              {severityIcon[issue.severity]} <strong style={{ color: "var(--accent-pink)" }}>{issue.subtype}:</strong> {issue.value}
            </div>
          ))}
        </div>
      )}

      {/* Security Issues: Exposed Keys, Storage, DOM */}
      {dataIssues.length > 0 && (
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--border-color)", borderRadius: "10px", overflow: "hidden" }}>
          <div style={{ padding: "10px 14px", background: "rgba(255,0,127,0.06)", borderLeft: "4px solid var(--accent-pink)", display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--accent-pink)" }}>⚠ Active Security Issues</span>
            <span style={{ background: "var(--accent-pink)", color: "#fff", borderRadius: "12px", padding: "1px 8px", fontSize: "10px", fontWeight: 700 }}>{dataIssues.length}</span>
          </div>
          {dataIssues.map((issue, i) => {
            const key = `issue-${i}`;
            const isOpen = expandedIssue === key;
            const fix = fixForSecurityIssue[issue.type] || "";
            const color = severityColor[issue.severity] || "var(--text-secondary)";
            return (
              <div key={i} style={{ borderTop: "1px solid rgba(255,255,255,0.04)", background: isOpen ? "rgba(255,255,255,0.02)" : "transparent" }}>
                <div onClick={() => setExpandedIssue(isOpen ? null : key)} style={{ padding: "10px 14px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "3px" }}>
                      <span style={{ fontSize: "9px", padding: "1px 6px", borderRadius: "4px", background: `${color}15`, color, border: `1px solid ${color}40`, fontWeight: 700, textTransform: "uppercase" }}>{issue.severity}</span>
                      <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-primary)" }}>{issue.subtype}</span>
                    </div>
                    <div style={{ fontSize: "10px", color: "var(--text-secondary)", fontFamily: "var(--font-mono)", wordBreak: "break-all" }}>{issue.value}</div>
                    <div style={{ fontSize: "9px", color: "var(--text-secondary)", marginTop: "2px" }}>Location: {issue.location}</div>
                  </div>
                  <span style={{ fontSize: "10px", color: "var(--text-secondary)", marginTop: "2px" }}>{isOpen ? "▲" : "▼"}</span>
                </div>

                {isOpen && fix && (
                  <div style={{ padding: "0 14px 12px" }}>
                    <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-color)", borderRadius: "8px", overflow: "hidden" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", background: "rgba(255,255,255,0.03)", borderBottom: "1px solid var(--border-color)" }}>
                        <span style={{ fontSize: "9px", fontWeight: 700, textTransform: "uppercase", color: "var(--accent-purple)" }}>🔧 Remediation</span>
                        <button onClick={() => copyFix(fix, key)} style={{ fontSize: "9px", padding: "2px 8px", background: copiedFix === key ? "rgba(0,212,255,0.2)" : "transparent", border: `1px solid ${copiedFix === key ? "var(--accent-cyan)" : "var(--border-color)"}`, borderRadius: "4px", color: copiedFix === key ? "var(--accent-cyan)" : "var(--text-secondary)", cursor: "pointer" }}>
                          {copiedFix === key ? "✓ Copied!" : "Copy"}
                        </button>
                      </div>
                      <pre style={{ margin: 0, padding: "10px", fontSize: "10px", color: "var(--accent-cyan)", fontFamily: "var(--font-mono)", overflowX: "auto", lineHeight: "1.6", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{fix}</pre>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Trackers */}
      {trackers.length > 0 && (
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--border-color)", borderRadius: "10px", padding: "12px 14px" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--accent-yellow)", marginBottom: "10px" }}>🕵️ Third-Party Trackers Detected</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {trackers.map((t, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 8px", background: "rgba(255,193,7,0.04)", borderRadius: "6px", border: "1px solid rgba(255,193,7,0.2)" }}>
                <div>
                  <div style={{ fontSize: "11px", color: "var(--text-primary)", fontWeight: 600 }}>{t.subtype}</div>
                  <div style={{ fontSize: "9px", color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>{t.value.substring(0, 60)}{t.value.length > 60 ? "…" : ""}</div>
                </div>
                <span style={{ fontSize: "9px", padding: "2px 6px", borderRadius: "4px", background: "rgba(255,193,7,0.1)", color: "var(--accent-yellow)", border: "1px solid rgba(255,193,7,0.3)", fontWeight: 700 }}>TRACKER</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Advisor */}
      <div style={{ background: "rgba(108,99,255,0.03)", border: "1px solid var(--border-color)", borderRadius: "10px", padding: "14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: aiReport || aiLoading || aiError ? "12px" : 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "14px" }}>✨</span>
            <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--accent-cyan)" }}>AI Threat Exposure Analysis</span>
          </div>
          <button onClick={analyzeWithAI} disabled={aiLoading || !aiState.isAvailable} style={{ padding: "5px 10px", fontSize: "10px", background: aiState.isAvailable ? "rgba(0,212,255,0.1)" : "rgba(255,255,255,0.05)", border: `1px solid ${aiState.isAvailable ? "var(--accent-cyan)" : "var(--border-color)"}`, borderRadius: "6px", color: aiState.isAvailable ? "var(--accent-cyan)" : "var(--text-secondary)", cursor: aiState.isAvailable ? "pointer" : "not-allowed" }}>
            {aiLoading ? "Scanning…" : "Run Threat Scan"}
          </button>
        </div>
        {aiLoading && <div style={{ padding: "12px", textAlign: "center", border: "1px dashed var(--accent-cyan)", borderRadius: "6px", color: "var(--accent-cyan)", fontSize: "11px" }} className="animate-cyan-pulse">Scanning headers, cookies & exposure vectors…</div>}
        {aiError && <div style={{ fontSize: "11px", color: "var(--accent-pink)", padding: "8px", background: "rgba(255,0,127,0.08)", borderRadius: "6px" }}>{aiError}</div>}
        {aiReport && !aiLoading && <div style={{ fontSize: "11px", color: "var(--text-primary)", background: "rgba(255,255,255,0.02)", padding: "10px", borderRadius: "6px", border: "1px solid var(--border-color)", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{aiReport}</div>}
      </div>

      <CertificateInfo cert={report.certificate} />
      <HeaderAnalysis report={report.headerReport} />
      <VulnerabilityList cookies={report.cookies} mixedContent={report.mixedContent} exposedKeys={report.exposedKeys} />
    </div>
  );
};
