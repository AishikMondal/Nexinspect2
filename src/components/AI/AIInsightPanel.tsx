import React, { useState, useMemo } from "react";
import type { AIState } from "../../types/ai";
import { AIChat } from "./AIChat";
import { Badge } from "../shared/Badge";
import type { NetworkRequest } from "../../types/network";
import { createGeminiNanoSession } from "../../services/geminiNano";

interface AIInsightPanelProps {
  aiState: AIState;
  requests: NetworkRequest[];
  domData: any;
}

export const AIInsightPanel: React.FC<AIInsightPanelProps> = ({ aiState, requests, domData }) => {
  const [insightSummary, setInsightSummary] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const pageContextString = useMemo(() => {
    if (!domData) return "No active page metrics loaded.";
    const totalRequests = requests.length;
    const slowRequests = requests.filter(r => r.isSlow).length;
    const a11yGaps = domData.accessibilityIssues?.length || 0;
    const secGaps = domData.securityIssues?.length || 0;
    const title = domData.domMetrics?.title || "Unknown";

    return `Page title: ${title}. Total HTTP requests: ${totalRequests} (${slowRequests} slow requests). Accessibility violations: ${a11yGaps}. Insecure credentials detected: ${secGaps}. DOM Node count: ${domData.domMetrics?.totalDOMNodes || 100}.`;
  }, [requests, domData]);

  const generatePageSummary = async () => {
    if (!aiState.isAvailable) return;
    setLoading(true);
    setError("");
    setInsightSummary("");

    try {
      const session = await createGeminiNanoSession(
        "You are Nexinspect on-device AI Advisor. Generate a punchy page status summary."
      );
      const prompt = `Give a 100-word summary of the current page status. Point out critical issues and suggest priority fixes. Metrics: ${pageContextString}`;
      const response = await session.prompt(prompt);
      setInsightSummary(response);
      session.destroy();
    } catch (err: any) {
      setError(err.message || "Failed to prompt local AI session.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        height: "calc(100vh - 48px)",
        overflowY: "auto",
        background: "var(--bg-primary)",
        color: "var(--text-primary)",
        fontFamily: "var(--font-sans)",
      }}
    >
      {/* Title */}
      <h2 style={{ margin: 0, fontSize: "14px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--accent-purple)" }}>
        Gemini Nano AI Center
      </h2>

      {/* Degradation card if unavailable */}
      {!aiState.isAvailable ? (
        <div
          style={{
            padding: "16px",
            background: "rgba(255, 0, 127, 0.05)",
            border: "1px solid var(--accent-pink)",
            borderRadius: "8px",
            fontSize: "11px",
            lineHeight: "1.5",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--accent-pink)", fontWeight: 700, marginBottom: "8px", textTransform: "uppercase" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>On-Device AI Unavailable</span>
          </div>
          <p style={{ margin: "0 0 8px 0", color: "var(--text-secondary)" }}>
            Gemini Nano runs completely on your hardware without making external network calls. To enable it:
          </p>
          <ul style={{ margin: 0, paddingLeft: "16px", color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: "4px" }}>
            <li>Ensure you are running Google Chrome version 127 or later.</li>
            <li>Enable the <strong>LanguageModel API</strong> flag in <code>chrome://flags/#optimization-guide-on-device-model</code>.</li>
            <li>Set optimization model download to "Enabled BypassPerfRequirement".</li>
          </ul>
        </div>
      ) : (
        <>
          {/* Active summary generator */}
          <div
            style={{
              background: "var(--card-bg)",
              border: "1px solid var(--border-color)",
              borderRadius: "8px",
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--accent-cyan)" }}>
                Holographic AI Page Diagnostics
              </span>
              <button
                onClick={generatePageSummary}
                disabled={loading}
                style={{
                  padding: "4px 8px",
                  fontSize: "10px",
                  background: "rgba(0, 212, 255, 0.1)",
                  border: "1px solid var(--accent-cyan)",
                  borderRadius: "4px",
                  color: "var(--accent-cyan)",
                  cursor: "pointer",
                }}
              >
                {loading ? "Thinking..." : "Generate Status"}
              </button>
            </div>

            {loading && (
              <div style={{ padding: "12px", border: "1px dashed var(--accent-cyan)", borderRadius: "4px" }} className="animate-cyan-pulse">
                <div style={{ fontSize: "10px", color: "var(--accent-cyan)", textAlign: "center" }}>
                  Synthesizing page models...
                </div>
              </div>
            )}

            {error && <div style={{ fontSize: "11px", color: "var(--accent-pink)" }}>{error}</div>}

            {insightSummary && (
              <div style={{ fontSize: "11px", color: "var(--text-primary)", whiteSpace: "pre-wrap", lineHeight: "1.5" }}>
                {insightSummary}
              </div>
            )}
          </div>

          <AIChat aiState={aiState} pageContext={pageContextString} />
        </>
      )}
    </div>
  );
};
