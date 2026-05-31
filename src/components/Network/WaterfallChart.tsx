import React from "react";
import type { RequestTimings } from "../../types/network";
import { formatDuration } from "../../services/networkCapture";

interface WaterfallChartProps {
  timings: RequestTimings;
  duration: number;
}

export const WaterfallChart: React.FC<WaterfallChartProps> = ({ timings, duration }) => {
  const { blocked, dns, connect, ssl, send, ttfb, receive } = timings;
  const total = Math.max(1, blocked + dns + connect + ssl + send + ttfb + receive);

  const stages = [
    { label: "Blocked/Queueing", value: blocked, color: "#4B5563" }, // gray
    { label: "DNS Lookup", value: dns, color: "#10B981" }, // emerald
    { label: "TCP Connect", value: connect, color: "#F59E0B" }, // amber
    { label: "SSL Handshake", value: ssl, color: "#EC4899" }, // pink
    { label: "Send Request", value: send, color: "#6366F1" }, // indigo
    { label: "Waiting (TTFB)", value: ttfb, color: "#3B82F6" }, // blue
    { label: "Content Download", value: receive, color: "#06B6D4" }, // cyan
  ].filter(s => s.value > 0 || s.label === "Waiting (TTFB)");

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
      <h4
        style={{
          margin: "0 0 12px 0",
          fontSize: "12px",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          color: "var(--text-primary)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span>Timing Breakdown</span>
        <span style={{ color: "var(--accent-purple)", fontFamily: "var(--font-mono)" }}>
          {formatDuration(duration)}
        </span>
      </h4>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {stages.map((stage, idx) => {
          const pct = Math.max(0.5, (stage.value / total) * 100);
          return (
            <div key={idx} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "11px",
                  color: "var(--text-secondary)",
                }}
              >
                <span>{stage.label}</span>
                <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>
                  {formatDuration(stage.value)}
                </span>
              </div>
              <div
                style={{
                  height: "8px",
                  background: "rgba(255, 255, 255, 0.03)",
                  borderRadius: "4px",
                  overflow: "hidden",
                  width: "100%",
                }}
              >
                <div
                  style={{
                    width: `${pct}%`,
                    height: "100%",
                    backgroundColor: stage.color,
                    borderRadius: "4px",
                    boxShadow: `0 0 6px ${stage.color}`,
                    transition: "width var(--transition-medium)",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          marginTop: "16px",
          paddingTop: "12px",
          borderTop: "1px solid var(--border-color)",
          display: "flex",
          flexWrap: "wrap",
          gap: "8px 12px",
          fontSize: "10px",
          color: "var(--text-secondary)",
        }}
      >
        {stages.map((stage, idx) => (
          <div key={idx} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "2px",
                backgroundColor: stage.color,
                display: "inline-block",
              }}
            />
            <span>{stage.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
