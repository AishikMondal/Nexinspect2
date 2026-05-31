import React, { useState, useMemo } from "react";
import type { AuditReport, AuditResultItem } from "../../services/performanceAudit";
import { runPerformanceAudit } from "../../services/performanceAudit";
import { AuditScore } from "./AuditScore";
import { AuditItem } from "./AuditItem";
import type { NetworkRequest } from "../../types/network";
import { createGeminiNanoSession, prompts } from "../../services/geminiNano";
import type { AIState } from "../../types/ai";

interface LighthousePanelProps {
  requests: NetworkRequest[];
  domData: any; // data returned from content script RUN_DOM_ANALYSIS
  aiState: AIState;
}

export const LighthousePanel: React.FC<LighthousePanelProps> = ({ requests, domData, aiState }) => {
  const [report, setReport] = useState<AuditReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "passed" | "failed">("all");
  const [categoryFilter, setCategoryFilter] = useState<"all" | "performance" | "accessibility" | "best-practices" | "seo">("all");

  const [aiReport, setAiReport] = useState<string>("");
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string>("");

  const triggerAudit = () => {
    setLoading(true);
    setReport(null);
    setAiReport("");

    setTimeout(() => {
      if (!domData) {
        setLoading(false);
        return;
      }
      
      const res = runPerformanceAudit(
        {
          fcp: domData.fcp,
          lcp: domData.lcp,
          cls: domData.cls,
          ttfb: domData.ttfb,
          inp: domData.inp,
        },
        domData.accessibilityIssues || [],
        domData.securityIssues || [],
        domData.structureIssues || [],
        domData.domMetrics || {
          totalDOMNodes: 100,
          inlineScripts: 0,
          externalScripts: 0,
          stylesheets: 0,
          title: "",
          metaDescription: "",
          hasH1: false,
        },
        requests
      );
      setReport(res);
      setLoading(false);
    }, 1200);
  };

  const analyzeWithAI = async () => {
    if (!report || !aiState.isAvailable) return;

    setAiLoading(true);
    setAiError("");
    setAiReport("");

    try {
      const session = await createGeminiNanoSession(
        "You are DevTools Pro AI Advisor. Analyze these Lighthouse scores and generate a summary."
      );
      const promptText = prompts.pageHealthSummary(
        report.performanceScore,
        report.accessibilityScore,
        report.bestPracticesScore,
        report.seoScore
      );
      const result = await session.prompt(promptText);
      setAiReport(result);
      session.destroy();
    } catch (err: any) {
      setAiError(err.message || "Failed to generate AI health summary.");
    } finally {
      setAiLoading(false);
    }
  };

  const filteredItems = useMemo(() => {
    if (!report) return [];
    return report.items.filter((item) => {
      // Category filter
      if (categoryFilter !== "all" && item.category !== categoryFilter) return false;

      // Status filter
      if (filter === "passed") return item.score === 1;
      if (filter === "failed") return item.score < 1;
      return true;
    });
  }, [report, filter, categoryFilter]);

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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ margin: 0, fontSize: "14px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--accent-purple)" }}>
          Lighthouse Audits
        </h2>
        <button
          onClick={triggerAudit}
          disabled={loading || !domData}
          style={{
            padding: "6px 12px",
            fontSize: "11px",
            background: "linear-gradient(90deg, #6c63ff, #00d4ff)",
            border: "none",
            borderRadius: "4px",
            color: "#fff",
            cursor: "pointer",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            boxShadow: "0 0 8px rgba(0, 212, 255, 0.4)",
          }}
        >
          {loading ? "Scanning..." : "Run Audit"}
        </button>
      </div>

      {loading && (
        <div style={{ padding: "40px 24px", textAlign: "center", border: "1px dashed var(--accent-cyan)", borderRadius: "8px", background: "rgba(0, 212, 255, 0.02)" }} className="animate-cyan-pulse">
          <h3 style={{ margin: "0 0 8px 0", fontSize: "14px", color: "var(--accent-cyan)", textTransform: "uppercase" }}>
            Holographic Scanner Active
          </h3>
          <p style={{ margin: 0, fontSize: "11px", color: "var(--text-secondary)" }}>
            Analyzing DOM architecture, script boundaries, and CWV signals...
          </p>
        </div>
      )}

      {!report && !loading && (
        <div style={{ padding: "32px", textAlign: "center", color: "var(--text-secondary)", border: "1px dashed var(--border-color)", borderRadius: "8px" }}>
          Click "Run Audit" to start the custom performance audit scoring engine.
        </div>
      )}

      {report && !loading && (
        <>
          {/* Circular Rings Container */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px", background: "rgba(255, 255, 255, 0.02)", border: "1px solid var(--border-color)", borderRadius: "8px", padding: "16px" }}>
            <AuditScore score={report.performanceScore} label="Perf" />
            <AuditScore score={report.accessibilityScore} label="A11y" />
            <AuditScore score={report.bestPracticesScore} label="Best" />
            <AuditScore score={report.seoScore} label="SEO" />
          </div>

          {/* AI Page Health Advisor */}
          <div style={{ background: "rgba(0, 212, 255, 0.02)", border: "1px solid var(--accent-cyan)", borderRadius: "8px", padding: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--accent-cyan)" }}>
                AI Page Health Advisor
              </span>
              <button
                onClick={analyzeWithAI}
                disabled={aiLoading || !aiState.isAvailable}
                style={{
                  padding: "2px 8px",
                  fontSize: "9px",
                  background: "rgba(0, 212, 255, 0.1)",
                  border: "1px solid var(--accent-cyan)",
                  borderRadius: "3px",
                  color: "var(--accent-cyan)",
                  cursor: "pointer",
                }}
              >
                Summarize Health
              </button>
            </div>

            {aiLoading && <div style={{ fontSize: "10px", color: "var(--accent-cyan)" }}>Generating health overview...</div>}
            {aiError && <div style={{ fontSize: "10px", color: "var(--accent-pink)" }}>{aiError}</div>}
            {aiReport && <div style={{ fontSize: "10px", color: "var(--text-primary)", whiteSpace: "pre-wrap", background: "rgba(255,255,255,0.01)", padding: "8px", borderRadius: "4px" }}>{aiReport}</div>}
          </div>

          {/* Toolbar Filters */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ display: "flex", gap: "4px" }}>
              {(["all", "passed", "failed"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  style={{
                    padding: "3px 8px",
                    fontSize: "10px",
                    border: "1px solid",
                    borderColor: filter === f ? "var(--accent-purple)" : "var(--border-color)",
                    background: filter === f ? "rgba(108, 99, 255, 0.1)" : "transparent",
                    color: filter === f ? "var(--accent-purple)" : "var(--text-secondary)",
                    borderRadius: "3px",
                    cursor: "pointer",
                    textTransform: "uppercase",
                  }}
                >
                  {f}
                </button>
              ))}
            </div>

            <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
              {(["all", "performance", "accessibility", "best-practices", "seo"] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  style={{
                    padding: "2px 6px",
                    fontSize: "9px",
                    border: "1px solid",
                    borderColor: categoryFilter === cat ? "var(--accent-purple)" : "var(--border-color)",
                    background: categoryFilter === cat ? "rgba(108, 99, 255, 0.1)" : "transparent",
                    color: categoryFilter === cat ? "var(--accent-purple)" : "var(--text-secondary)",
                    borderRadius: "3px",
                    cursor: "pointer",
                    textTransform: "uppercase",
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Audits List */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {filteredItems.length === 0 ? (
              <div style={{ fontSize: "11px", color: "var(--text-secondary)", fontStyle: "italic", textAlign: "center", padding: "12px 0" }}>
                No audits match the chosen filter.
              </div>
            ) : (
              filteredItems.map((item) => <AuditItem key={item.id} item={item} />)
            )}
          </div>
        </>
      )}
    </div>
  );
};
