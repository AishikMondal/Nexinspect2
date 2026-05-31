import React from "react";
import type { LongTaskEntry, LayoutShiftEntry } from "../../types/performance";

interface TimelineProps {
  longTasks: LongTaskEntry[];
  layoutShifts: LayoutShiftEntry[];
}

export const Timeline: React.FC<TimelineProps> = ({ longTasks, layoutShifts }) => {
  const allEvents = [
    ...longTasks.map((t) => ({
      id: t.id,
      time: t.startTime,
      duration: t.duration,
      label: `Long JS Task: ${t.attribution || "Script"}`,
      type: "longtask" as const,
      color: "var(--accent-pink)",
    })),
    ...layoutShifts.map((s) => ({
      id: s.id,
      time: s.startTime,
      duration: 0,
      label: `Layout Shift (Score: ${s.score.toFixed(3)})`,
      type: "shift" as const,
      color: "var(--accent-yellow)",
    })),
  ].sort((a, b) => a.time - b.time);

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
      <h4 style={{ margin: "0 0 12px 0", fontSize: "11px", textTransform: "uppercase", color: "var(--accent-purple)" }}>
        Timeline Event Logs
      </h4>

      {allEvents.length === 0 ? (
        <div style={{ fontSize: "11px", color: "var(--text-secondary)", fontStyle: "italic", textAlign: "center", padding: "16px 0" }}>
          No blocking tasks or layout shifts detected.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "200px", overflowY: "auto" }}>
          {allEvents.map((evt) => (
            <div
              key={evt.id}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "10px",
                padding: "8px",
                borderRadius: "4px",
                background: "rgba(255, 255, 255, 0.02)",
                borderLeft: `3px solid ${evt.color}`,
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-primary)" }}>{evt.label}</div>
                <div style={{ fontSize: "9px", color: "var(--text-secondary)", marginTop: "2px" }}>
                  Triggered at {(evt.time / 1000).toFixed(2)}s
                  {evt.duration > 0 && ` | Blocked for ${evt.duration}ms`}
                </div>
              </div>
              <span
                style={{
                  fontSize: "8px",
                  padding: "1px 4px",
                  borderRadius: "3px",
                  background: `${evt.color}1a`,
                  color: evt.color,
                  border: `1px solid ${evt.color}33`,
                  fontWeight: 600,
                  textTransform: "uppercase",
                }}
              >
                {evt.type}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
