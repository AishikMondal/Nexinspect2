import React from "react";
import type { MemorySample } from "../../types/performance";
import { formatBytes } from "../../services/networkCapture";
import { Sparkline } from "../shared/Sparkline";

interface MemoryChartProps {
  history: MemorySample[];
}

export const MemoryChart: React.FC<MemoryChartProps> = ({ history }) => {
  const current = history[history.length - 1];

  const values = history.map((h) => h.usedJSHeapSize);

  return (
    <div
      style={{
        background: "var(--card-bg)",
        border: "1px solid var(--border-color)",
        borderRadius: "8px",
        padding: "16px",
        fontFamily: "var(--font-sans)",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
      }}
    >
      <h4
        style={{
          margin: 0,
          fontSize: "11px",
          textTransform: "uppercase",
          color: "var(--accent-purple)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span>JS Memory Heap</span>
        {current && (
          <span style={{ color: "var(--accent-cyan)", fontFamily: "var(--font-mono)", fontSize: "11px" }}>
            {formatBytes(current.usedJSHeapSize)}
          </span>
        )}
      </h4>

      {history.length < 2 ? (
        <div style={{ fontSize: "11px", color: "var(--text-secondary)", fontStyle: "italic", textAlign: "center", padding: "16px 0" }}>
          Collecting memory timeline logs...
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {/* Sparkline chart container */}
          <div
            style={{
              height: "60px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderBottom: "1px solid var(--border-color)",
              paddingBottom: "8px",
            }}
          >
            <Sparkline data={values} width={250} height={50} color="var(--accent-cyan)" strokeWidth={2} />
          </div>

          {current && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "10px", color: "var(--text-secondary)" }}>
              <div>
                Total Heap: <span style={{ color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>{formatBytes(current.totalJSHeapSize)}</span>
              </div>
              <div style={{ textAlign: "right" }}>
                Limit: <span style={{ color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>{formatBytes(current.jsHeapSizeLimit)}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
