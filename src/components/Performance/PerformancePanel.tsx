import React, { useState, useMemo } from "react";
import type { PerformanceData } from "../../types/performance";
import { MemoryChart } from "./MemoryChart";
import { Timeline } from "./Timeline";
import { formatBytes } from "../../services/networkCapture";
import { createGeminiNanoSession, prompts } from "../../services/geminiNano";
import type { AIState } from "../../types/ai";
import { buildPerformanceInsights } from "../../services/insightEngine";
import type { NetworkRequest } from "../../types/network";

interface PerformancePanelProps {
  data: PerformanceData;
  aiState: AIState;
  requests?: NetworkRequest[];
}

const ratingColor = (r?: string) => r === "good" ? "var(--accent-cyan)" : r === "needs-improvement" ? "var(--accent-yellow)" : "var(--accent-pink)";
const ratingLabel = (r?: string) => r === "good" ? "Good" : r === "needs-improvement" ? "Needs Work" : "Poor";
const ratingBg   = (r?: string) => r === "good" ? "rgba(0,212,255,0.08)" : r === "needs-improvement" ? "rgba(255,193,7,0.08)" : "rgba(255,0,127,0.08)";

export const PerformancePanel: React.FC<PerformancePanelProps> = ({ data, aiState, requests = [] }) => {
  const [expandedMetric, setExpandedMetric] = useState<string | null>(null);
  const [aiReport, setAiReport] = useState<string>("");
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string>("");
  const [copiedFix, setCopiedFix] = useState<string | null>(null);

  const insights = useMemo(() => buildPerformanceInsights(data, requests), [data, requests]);

  const analyzeWithAI = async () => {
    if (!aiState.isAvailable) { setAiError("Gemini Nano is not available on this device."); return; }
    setAiLoading(true); setAiError(""); setAiReport("");
    try {
      const session = await createGeminiNanoSession("You are DevTools Pro AI Advisor. Analyze Core Web Vitals and generate a root-cause diagnostic.");
      const fcp = data.vitals.FCP ? `${data.vitals.FCP.value}ms` : "N/A";
      const lcp = data.vitals.LCP ? `${data.vitals.LCP.value}ms` : "N/A";
      const cls = data.vitals.CLS ? `${data.vitals.CLS.value}` : "N/A";
      const ttfb = data.vitals.TTFB ? `${data.vitals.TTFB.value}ms` : "N/A";
      const inp = data.vitals.INP ? `${data.vitals.INP.value}ms` : "N/A";
      const result = await session.prompt(prompts.performanceDiagnosis(fcp, lcp, cls, ttfb, inp, data.longTasks.length));
      setAiReport(result);
      session.destroy();
    } catch (err: any) {
      setAiError(err.message || "Failed to generate AI insights.");
    } finally { setAiLoading(false); }
  };

  const copyFix = (fix: string, key: string) => {
    navigator.clipboard.writeText(fix).then(() => { setCopiedFix(key); setTimeout(() => setCopiedFix(null), 2000); });
  };

  const overallRating = (() => {
    const values = Object.values(data.vitals).filter(Boolean);
    const poor = values.filter((v) => v?.rating === "poor").length;
    const needs = values.filter((v) => v?.rating === "needs-improvement").length;
    if (poor >= 2) return "poor";
    if (poor >= 1 || needs >= 2) return "needs-improvement";
    return "good";
  })();

  return (
    <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "14px", height: "calc(100vh - 48px)", overflowY: "auto", background: "var(--bg-primary)", color: "var(--text-primary)", fontFamily: "var(--font-sans)" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ margin: 0, fontSize: "14px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--accent-purple)" }}>
          ⚡ Performance Diagnostics
        </h2>
        <div style={{ fontSize: "10px", padding: "3px 8px", borderRadius: "6px", background: ratingBg(overallRating), color: ratingColor(overallRating), fontWeight: 700, border: `1px solid ${ratingColor(overallRating)}40` }}>
          Overall: {ratingLabel(overallRating)}
        </div>
      </div>

      {/* UX Risk Banner */}
      {overallRating !== "good" && (
        <div style={{ background: overallRating === "poor" ? "rgba(255,0,127,0.06)" : "rgba(255,193,7,0.06)", border: `1px solid ${overallRating === "poor" ? "rgba(255,0,127,0.3)" : "rgba(255,193,7,0.3)"}`, borderRadius: "10px", padding: "12px 14px" }}>
          <div style={{ fontSize: "9px", fontWeight: 800, textTransform: "uppercase", color: overallRating === "poor" ? "var(--accent-pink)" : "var(--accent-yellow)", letterSpacing: "0.08em", marginBottom: "6px" }}>
            👤 User Experience Risk
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
            {data.vitals.LCP?.rating !== "good" && <div style={{ fontSize: "11px", color: "var(--text-primary)" }}>• <strong style={{ color: ratingColor(data.vitals.LCP?.rating) }}>Delayed interactivity</strong> — users see blank screen longer than acceptable</div>}
            {data.vitals.CLS?.rating !== "good" && <div style={{ fontSize: "11px", color: "var(--text-primary)" }}>• <strong style={{ color: ratingColor(data.vitals.CLS?.rating) }}>Visual instability risk</strong> — layout shifts cause accidental clicks</div>}
            {data.vitals.INP?.rating !== "good" && <div style={{ fontSize: "11px", color: "var(--text-primary)" }}>• <strong style={{ color: ratingColor(data.vitals.INP?.rating) }}>Large JS execution cost</strong> — interactions feel unresponsive</div>}
            {data.longTasks.length > 0 && <div style={{ fontSize: "11px", color: "var(--text-primary)" }}>• <strong>Main thread blocked</strong> by {data.longTasks.length} long task(s) totaling {data.longTasks.reduce((a, t) => a + t.duration, 0)}ms</div>}
          </div>
        </div>
      )}

      {/* Core Web Vitals with WHY */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--accent-purple)", letterSpacing: "0.08em" }}>Core Web Vitals</div>

        {insights.length === 0 && (
          <div style={{ background: "var(--card-bg)", border: "1px solid var(--border-color)", borderRadius: "10px", padding: "20px", textAlign: "center", fontSize: "11px", color: "var(--text-secondary)", fontStyle: "italic" }}>
            Navigate to a page to collect performance metrics
          </div>
        )}

        {insights.map((insight) => {
          const isOpen = expandedMetric === insight.metric;
          const color = ratingColor(insight.rating);
          return (
            <div key={insight.metric} style={{ border: `1px solid ${color}30`, borderRadius: "10px", overflow: "hidden", background: "var(--card-bg)" }}>
              {/* Metric Row */}
              <div
                onClick={() => setExpandedMetric(isOpen ? null : insight.metric)}
                style={{ padding: "10px 14px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", borderLeft: `4px solid ${color}` }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-primary)" }}>{insight.metric}</span>
                  <span style={{ fontSize: "9px", color: "var(--text-secondary)" }}>
                    {insight.metric === "LCP" ? "Largest Contentful Paint" : insight.metric === "FCP" ? "First Contentful Paint" : insight.metric === "CLS" ? "Cumulative Layout Shift" : insight.metric === "TTFB" ? "Time to First Byte" : "Interaction to Next Paint"}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: "18px", fontWeight: 800, color, fontFamily: "var(--font-mono)" }}>{insight.value}</span>
                  <span style={{ fontSize: "9px", padding: "2px 6px", borderRadius: "4px", background: ratingBg(insight.rating), color, border: `1px solid ${color}40`, fontWeight: 700 }}>{ratingLabel(insight.rating)}</span>
                  <span style={{ fontSize: "10px", color: "var(--text-secondary)" }}>{isOpen ? "▲" : "▼"}</span>
                </div>
              </div>

              {/* Expanded WHY + Root Cause */}
              {isOpen && (
                <div style={{ padding: "14px", borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", flexDirection: "column", gap: "10px" }}>
                  {/* WHY */}
                  <div style={{ background: "rgba(0,212,255,0.05)", border: "1px solid rgba(0,212,255,0.2)", borderRadius: "8px", padding: "10px 12px" }}>
                    <div style={{ fontSize: "9px", fontWeight: 800, textTransform: "uppercase", color: "var(--accent-cyan)", marginBottom: "6px", letterSpacing: "0.08em" }}>💡 Why This Matters</div>
                    <p style={{ margin: 0, fontSize: "11px", color: "var(--text-primary)", lineHeight: "1.6" }}>{insight.why}</p>
                  </div>

                  {/* Root Causes */}
                  <div style={{ background: `${color}08`, border: `1px solid ${color}30`, borderRadius: "8px", padding: "10px 12px" }}>
                    <div style={{ fontSize: "9px", fontWeight: 800, textTransform: "uppercase", color, marginBottom: "8px", letterSpacing: "0.08em" }}>🔍 Root Cause Analysis</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      {insight.rootCauses.map((cause, i) => (
                        <div key={i} style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
                          <span style={{ color, fontSize: "12px", lineHeight: 1.3, marginTop: "1px" }}>→</span>
                          <span style={{ fontSize: "11px", color: "var(--text-primary)", lineHeight: "1.5" }}>{cause}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* UX Impact */}
                  <div style={{ background: insight.uxImpact.level === "high" ? "rgba(255,0,127,0.05)" : insight.uxImpact.level === "medium" ? "rgba(255,193,7,0.05)" : "rgba(0,212,255,0.05)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "8px", padding: "8px 12px", display: "flex", gap: "10px", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontSize: "9px", fontWeight: 800, textTransform: "uppercase", color: insight.uxImpact.level === "high" ? "var(--accent-pink)" : insight.uxImpact.level === "medium" ? "var(--accent-yellow)" : "var(--accent-cyan)", marginBottom: "4px", letterSpacing: "0.08em" }}>
                        👤 UX Impact · {insight.uxImpact.level.toUpperCase()}
                      </div>
                      <p style={{ margin: 0, fontSize: "11px", color: "var(--text-primary)", lineHeight: "1.5" }}>{insight.uxImpact.description}</p>
                    </div>
                  </div>

                  {/* Fix Code */}
                  {insight.fix && (
                    <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-color)", borderRadius: "8px", overflow: "hidden" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", background: "rgba(255,255,255,0.03)", borderBottom: "1px solid var(--border-color)" }}>
                        <span style={{ fontSize: "9px", fontWeight: 700, textTransform: "uppercase", color: "var(--accent-purple)", letterSpacing: "0.08em" }}>🔧 Suggested Fix</span>
                        <button onClick={() => copyFix(insight.fix!, insight.metric)} style={{ fontSize: "9px", padding: "2px 8px", background: copiedFix === insight.metric ? "rgba(0,212,255,0.2)" : "transparent", border: `1px solid ${copiedFix === insight.metric ? "var(--accent-cyan)" : "var(--border-color)"}`, borderRadius: "4px", color: copiedFix === insight.metric ? "var(--accent-cyan)" : "var(--text-secondary)", cursor: "pointer" }}>
                          {copiedFix === insight.metric ? "✓ Copied!" : "Copy"}
                        </button>
                      </div>
                      <pre style={{ margin: 0, padding: "10px", fontSize: "10px", color: "var(--accent-cyan)", fontFamily: "var(--font-mono)", overflowX: "auto", lineHeight: "1.6", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{insight.fix}</pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* AI Diagnosis */}
      <div style={{ background: "rgba(108,99,255,0.03)", border: "1px solid var(--border-color)", borderRadius: "10px", padding: "14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: aiReport || aiLoading || aiError ? "12px" : 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "14px" }}>✨</span>
            <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--accent-cyan)" }}>AI Root Cause Diagnosis</span>
          </div>
          <button onClick={analyzeWithAI} disabled={aiLoading || !aiState.isAvailable} style={{ padding: "5px 10px", fontSize: "10px", background: aiState.isAvailable ? "rgba(0,212,255,0.1)" : "rgba(255,255,255,0.05)", border: `1px solid ${aiState.isAvailable ? "var(--accent-cyan)" : "var(--border-color)"}`, borderRadius: "6px", color: aiState.isAvailable ? "var(--accent-cyan)" : "var(--text-secondary)", cursor: aiState.isAvailable ? "pointer" : "not-allowed" }}>
            {aiLoading ? "Analyzing…" : "Run AI Diagnosis"}
          </button>
        </div>
        {aiLoading && <div style={{ padding: "12px", textAlign: "center", border: "1px dashed var(--accent-cyan)", borderRadius: "6px", color: "var(--accent-cyan)", fontSize: "11px" }} className="animate-cyan-pulse">Analyzing Web Vitals & generating root-cause report…</div>}
        {aiError && <div style={{ fontSize: "11px", color: "var(--accent-pink)", padding: "8px", background: "rgba(255,0,127,0.08)", borderRadius: "6px" }}>{aiError}</div>}
        {aiReport && !aiLoading && <div style={{ fontSize: "11px", color: "var(--text-primary)", background: "rgba(255,255,255,0.02)", padding: "10px", borderRadius: "6px", border: "1px solid var(--border-color)", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{aiReport}</div>}
      </div>

      {/* Memory & Timeline */}
      <MemoryChart history={data.memoryHistory} />
      <Timeline longTasks={data.longTasks} layoutShifts={data.layoutShifts} />

      {/* Render Blocking */}
      {data.renderBlocking.length > 0 && (
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--border-color)", borderRadius: "10px", padding: "14px" }}>
          <h4 style={{ margin: "0 0 10px 0", fontSize: "11px", textTransform: "uppercase", color: "var(--accent-pink)", letterSpacing: "0.08em" }}>
            🚫 Render-Blocking Resources
          </h4>
          <div style={{ fontSize: "10px", color: "var(--text-secondary)", marginBottom: "10px", lineHeight: 1.5 }}>
            These resources delay <strong style={{ color: "var(--text-primary)" }}>First Paint</strong> — the browser must download and parse them before rendering anything visible.
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {data.renderBlocking.map((res, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", background: "rgba(255,0,127,0.04)", borderRadius: "6px", border: "1px solid rgba(255,0,127,0.15)" }}>
                <div style={{ flex: 1, overflow: "hidden" }}>
                  <div style={{ fontSize: "10px", color: "var(--text-primary)", fontFamily: "var(--font-mono)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={res.url}>{res.url.split("/").pop() || res.url}</div>
                  <div style={{ fontSize: "9px", color: "var(--text-secondary)", marginTop: "2px" }}>{res.type === "script" ? "💡 Add defer or async attribute" : "💡 Add media query or load non-critical CSS lazily"}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginLeft: "8px" }}>
                  <span style={{ fontSize: "10px", color: res.type === "stylesheet" ? "var(--accent-purple)" : "var(--accent-cyan)", border: `1px solid currentColor`, borderRadius: "4px", padding: "1px 5px" }}>{res.type}</span>
                  <span style={{ fontSize: "10px", fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>{formatBytes(res.size)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
