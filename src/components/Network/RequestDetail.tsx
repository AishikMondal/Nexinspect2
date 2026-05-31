import React, { useState } from "react";
import type { NetworkRequest } from "../../types/network";
import { formatBytes, formatDuration } from "../../services/networkCapture";
import { CodeBlock } from "../shared/CodeBlock";
import { Badge } from "../shared/Badge";
import { WaterfallChart } from "./WaterfallChart";
import { createGeminiNanoSession, prompts } from "../../services/geminiNano";
import type { AIState } from "../../types/ai";

interface RequestDetailProps {
  request: NetworkRequest;
  onClose: () => void;
  aiState: AIState;
}

type DetailTab = "headers" | "payload" | "response" | "timing" | "ai";

export const RequestDetail: React.FC<RequestDetailProps> = ({ request, onClose, aiState }) => {
  const [activeTab, setActiveTab] = useState<DetailTab>("headers");
  const [aiReport, setAiReport] = useState<string>("");
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string>("");

  const analyzeWithAI = async () => {
    if (!aiState.isAvailable) {
      setAiError("Gemini Nano AI is not available on this device.");
      return;
    }

    setAiLoading(true);
    setAiError("");
    setAiReport("");

    try {
      const session = await createGeminiNanoSession(
        "You are Nexinspect AI Advisor. Analyze this network request and explain what could be causing the delay and how to fix it."
      );
      const url = request.url;
      const method = request.method;
      const type = request.type;
      const size = formatBytes(request.size);
      const duration = formatDuration(request.duration);
      const ttfb = formatDuration(request.timings.ttfb);
      const download = formatDuration(request.timings.receive);

      const promptText = prompts.slowRequest(url, method, type, size, duration, ttfb, download);
      const result = await session.prompt(promptText);
      setAiReport(result);
      session.destroy();
    } catch (err: any) {
      setAiError(err.message || "Failed to generate AI insights.");
    } finally {
      setAiLoading(false);
    }
  };

  const getCleanHeaders = (headers: Record<string, string>) => {
    return Object.entries(headers).map(([k, v]) => ({ key: k, value: v }));
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "var(--bg-primary)",
        borderLeft: "1px solid var(--border-color)",
        position: "relative",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid var(--border-color)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "var(--bg-secondary)",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", maxWidth: "80%" }}>
          <span
            style={{
              fontSize: "12px",
              fontWeight: 700,
              color: "var(--text-primary)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {request.url.split("/").pop()?.split("?")[0] || request.url}
          </span>
          <span style={{ fontSize: "10px", color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
            {request.method} | {request.status} {request.statusText}
          </span>
        </div>
        <button
          onClick={onClose}
          style={{
            background: "transparent",
            border: "none",
            color: "var(--text-secondary)",
            cursor: "pointer",
            fontSize: "16px",
            padding: "4px",
          }}
        >
          &times;
        </button>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid var(--border-color)",
          background: "var(--bg-secondary)",
          padding: "0 8px",
          gap: "4px",
        }}
      >
        {(["headers", "payload", "response", "timing", "ai"] as DetailTab[]).map((tab) => {
          const isActive = activeTab === tab;
          const isAi = tab === "ai";
          return (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                if (isAi && !aiReport && !aiLoading) {
                  analyzeWithAI();
                }
              }}
              style={{
                padding: "8px 12px",
                fontSize: "11px",
                border: "none",
                background: "transparent",
                color: isActive
                  ? isAi
                    ? "var(--accent-cyan)"
                    : "var(--accent-purple)"
                  : "var(--text-secondary)",
                cursor: "pointer",
                borderBottom: isActive
                  ? `2px solid ${isAi ? "var(--accent-cyan)" : "var(--accent-purple)"}`
                  : "2px solid transparent",
                fontWeight: isActive ? 600 : 400,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              {isAi && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 2a10 10 0 0 1 7.54 16.59c-.24.25-.46.59-.46.99v1.42a1 1 0 0 1-1 1h-12a1 1 0 0 1-1-1v-1.42c0-.4-.22-.74-.46-.99A10 10 0 0 1 12 2z" />
                </svg>
              )}
              {tab}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
        {activeTab === "headers" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* General */}
            <div>
              <h4 style={{ margin: "0 0 8px 0", fontSize: "11px", textTransform: "uppercase", color: "var(--accent-purple)" }}>
                General
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontFamily: "var(--font-mono)", fontSize: "11px" }}>
                <div>
                  <span style={{ color: "var(--text-secondary)" }}>Request URL:</span>{" "}
                  <span style={{ color: "var(--text-primary)", wordBreak: "break-all" }}>{request.url}</span>
                </div>
                <div>
                  <span style={{ color: "var(--text-secondary)" }}>Request Method:</span>{" "}
                  <span style={{ color: "var(--text-primary)" }}>{request.method}</span>
                </div>
                <div>
                  <span style={{ color: "var(--text-secondary)" }}>Status Code:</span>{" "}
                  <span style={{ color: request.status >= 400 ? "var(--accent-pink)" : "var(--accent-cyan)" }}>
                    {request.status} {request.statusText}
                  </span>
                </div>
              </div>
            </div>

            {/* Response Headers */}
            <div>
              <h4 style={{ margin: "0 0 8px 0", fontSize: "11px", textTransform: "uppercase", color: "var(--accent-purple)" }}>
                Response Headers
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px", fontFamily: "var(--font-mono)", fontSize: "10px" }}>
                {getCleanHeaders(request.responseHeaders).map((h) => (
                  <div key={h.key} style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.02)", padding: "4px 0" }}>
                    <span style={{ color: "var(--accent-cyan)", width: "150px", shrink: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
                      {h.key}:
                    </span>
                    <span style={{ color: "var(--text-primary)", wordBreak: "break-all", flex: 1 }}>{h.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Request Headers */}
            <div>
              <h4 style={{ margin: "0 0 8px 0", fontSize: "11px", textTransform: "uppercase", color: "var(--accent-purple)" }}>
                Request Headers
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px", fontFamily: "var(--font-mono)", fontSize: "10px" }}>
                {getCleanHeaders(request.requestHeaders).map((h) => (
                  <div key={h.key} style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.02)", padding: "4px 0" }}>
                    <span style={{ color: "var(--accent-purple)", width: "150px", shrink: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
                      {h.key}:
                    </span>
                    <span style={{ color: "var(--text-primary)", wordBreak: "break-all", flex: 1 }}>{h.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "payload" && (
          <div>
            <h4 style={{ margin: "0 0 8px 0", fontSize: "11px", textTransform: "uppercase", color: "var(--accent-purple)" }}>
              Request Payload
            </h4>
            {request.requestBody ? (
              <CodeBlock code={request.requestBody} />
            ) : (
              <div style={{ fontSize: "11px", color: "var(--text-secondary)", fontStyle: "italic" }}>
                No request body payload available.
              </div>
            )}
          </div>
        )}

        {activeTab === "response" && (
          <div>
            <h4
              style={{
                margin: "0 0 8px 0",
                fontSize: "11px",
                textTransform: "uppercase",
                color: "var(--accent-purple)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>Response Body</span>
              {request.responseBodyTruncated && (
                <Badge variant="pink" style={{ fontSize: "9px" }}>
                  Truncated for Performance
                </Badge>
              )}
            </h4>
            {request.responseBody ? (
              <CodeBlock code={request.responseBody} />
            ) : request.cached ? (
              <div style={{ fontSize: "11px", color: "var(--text-secondary)", fontStyle: "italic" }}>
                Served from cache. Response body not intercepted.
              </div>
            ) : (
              <div style={{ fontSize: "11px", color: "var(--text-secondary)", fontStyle: "italic" }}>
                No response body captured. Only text-based assets are logged.
              </div>
            )}
          </div>
        )}

        {activeTab === "timing" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <WaterfallChart timings={request.timings} duration={request.duration} />
          </div>
        )}

        {activeTab === "ai" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h4 style={{ margin: 0, fontSize: "11px", textTransform: "uppercase", color: "var(--accent-cyan)", display: "flex", alignItems: "center", gap: "6px" }}>
                Gemini Nano AI Advisor
              </h4>
              <button
                onClick={analyzeWithAI}
                disabled={aiLoading || !aiState.isAvailable}
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
                Re-Analyze
              </button>
            </div>

            {aiLoading && (
              <div
                style={{
                  padding: "24px",
                  textAlign: "center",
                  border: "1px dashed var(--accent-cyan)",
                  borderRadius: "8px",
                  background: "rgba(0, 212, 255, 0.02)",
                }}
                className="animate-cyan-pulse"
              >
                <div style={{ color: "var(--accent-cyan)", fontWeight: 600, fontSize: "12px", marginBottom: "4px" }}>
                  Holographic AI Processing...
                </div>
                <div style={{ color: "var(--text-secondary)", fontSize: "10px" }}>
                  Interrogating local Gemini Nano session
                </div>
              </div>
            )}

            {aiError && (
              <div style={{ color: "var(--accent-pink)", fontSize: "11px", padding: "8px", background: "rgba(255,0,127,0.1)", borderRadius: "4px", border: "1px solid var(--accent-pink)" }}>
                {aiError}
              </div>
            )}

            {aiReport && !aiLoading && (
              <div
                style={{
                  padding: "12px",
                  background: "rgba(255, 255, 255, 0.02)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "8px",
                  fontSize: "11px",
                  color: "var(--text-primary)",
                  lineHeight: "1.5",
                  whiteSpace: "pre-wrap",
                }}
              >
                {aiReport}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
