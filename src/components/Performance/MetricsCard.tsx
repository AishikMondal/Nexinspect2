import React from "react";
import type { MetricValue } from "../../types/performance";

interface MetricsCardProps {
  title: string;
  metric?: MetricValue;
  info?: string;
}

export const MetricsCard: React.FC<MetricsCardProps> = ({ title, metric, info }) => {
  const getRatingColor = (rating: string) => {
    if (rating === "good") return "var(--accent-cyan)";
    if (rating === "needs-improvement") return "var(--accent-yellow)";
    return "var(--accent-pink)";
  };

  const getRatingBg = (rating: string) => {
    if (rating === "good") return "rgba(0, 212, 255, 0.05)";
    if (rating === "needs-improvement") return "rgba(255, 179, 0, 0.05)";
    return "rgba(255, 0, 127, 0.05)";
  };

  if (!metric) {
    return (
      <div
        style={{
          background: "var(--card-bg)",
          border: "1px solid var(--border-color)",
          borderRadius: "8px",
          padding: "12px",
          display: "flex",
          flexDirection: "column",
          gap: "4px",
          opacity: 0.5,
        }}
      >
        <span style={{ fontSize: "10px", textTransform: "uppercase", color: "var(--text-secondary)" }}>{title}</span>
        <span style={{ fontSize: "18px", fontWeight: 800, color: "var(--text-secondary)" }}>N/A</span>
      </div>
    );
  }

  const color = getRatingColor(metric.rating);
  const bg = getRatingBg(metric.rating);

  return (
    <div
      style={{
        background: "var(--card-bg)",
        border: `1px solid ${color}`,
        boxShadow: `0 0 4px ${color}1a`,
        borderRadius: "8px",
        padding: "12px",
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        position: "relative",
        overflow: "hidden",
        transition: "all var(--transition-fast)",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "3px",
          height: "100%",
          backgroundColor: color,
        }}
      />
      <span style={{ fontSize: "10px", textTransform: "uppercase", color: "var(--text-secondary)" }}>{title}</span>
      <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
        <span style={{ fontSize: "20px", fontWeight: 800, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
          {metric.value}
        </span>
        <span style={{ fontSize: "10px", color: "var(--text-secondary)" }}>{metric.unit}</span>
      </div>
      {info && <span style={{ fontSize: "9px", color: "var(--text-secondary)" }}>{info}</span>}
      <span
        style={{
          position: "absolute",
          top: "8px",
          right: "8px",
          fontSize: "8px",
          textTransform: "uppercase",
          padding: "2px 6px",
          borderRadius: "3px",
          background: bg,
          color: color,
          border: `1px solid ${color}33`,
          fontWeight: 600,
        }}
      >
        {metric.rating}
      </span>
    </div>
  );
};
