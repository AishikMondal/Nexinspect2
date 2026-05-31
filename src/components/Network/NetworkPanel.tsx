import React, { useState, useMemo } from "react";
import type { NetworkRequest } from "../../types/network";
import { RequestRow } from "./RequestRow";
import { RequestDetail } from "./RequestDetail";
import { formatBytes, formatDuration } from "../../services/networkCapture";
import type { AIState } from "../../types/ai";

interface NetworkPanelProps {
  requests: NetworkRequest[];
  onClear: () => void;
  aiState: AIState;
}

type ViewMode = "requests" | "waterfall";

// Slow API threshold: > 1000ms
const SLOW_THRESHOLD_MS = 1000;

export const NetworkPanel: React.FC<NetworkPanelProps> = ({ requests, onClear, aiState }) => {
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("requests");

  const selectedRequest = useMemo(
    () => requests.find((r) => r.id === selectedRequestId) || null,
    [requests, selectedRequestId]
  );

  // Duplicate detection: same base URL (ignore query params) appearing more than once for API requests only
  const duplicateUrls = useMemo(() => {
    const counts = new Map<string, number>();
    requests.forEach((r) => {
      const isApi = r.type === "xhr" || r.type === "fetch" || r.type.toLowerCase() === "xhr" || r.type.toLowerCase() === "fetch";
      if (isApi) {
        const key = r.url.split("?")[0];
        counts.set(key, (counts.get(key) || 0) + 1);
      }
    });
    const dupes = new Set<string>();
    counts.forEach((count, url) => { if (count > 1) dupes.add(url); });
    return dupes;
  }, [requests]);

  // Slow API requests: XHR/fetch > 1000ms
  const slowApiUrls = useMemo(() => {
    const slow = new Set<string>();
    requests.forEach((r) => {
      const isApi = r.type === "xhr" || r.type === "fetch" || r.type.toLowerCase() === "xhr" || r.type.toLowerCase() === "fetch";
      if (isApi && r.duration > SLOW_THRESHOLD_MS) {
        slow.add(r.id);
      }
    });
    return slow;
  }, [requests]);

  // Show only duplicate or slow API requests
  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      const isApi = req.type === "xhr" || req.type === "fetch" || req.type.toLowerCase() === "xhr" || req.type.toLowerCase() === "fetch";
      if (!isApi) return false;
      const baseUrl = req.url.split("?")[0];
      const isDuplicate = duplicateUrls.has(baseUrl);
      const isSlowApi = slowApiUrls.has(req.id);
      return isDuplicate || isSlowApi;
    });
  }, [requests, duplicateUrls, slowApiUrls]);

  const stats = useMemo(() => {
    const totalSize = requests.reduce((a, r) => a + r.size, 0);
    const slowCount = slowApiUrls.size;
    const dupCount = duplicateUrls.size;
    return { total: requests.length, size: formatBytes(totalSize), slowCount, dupCount };
  }, [requests, slowApiUrls, duplicateUrls]);

  // Waterfall
  const maxDuration = useMemo(
    () => Math.max(...requests.map((r) => r.duration), 1),
    [requests]
  );

  const typeColor: Record<string, string> = {
    document: "var(--accent-purple)",
    script: "var(--accent-cyan)",
    stylesheet: "var(--accent-pink)",
    xhr: "var(--accent-yellow)",
    fetch: "var(--accent-yellow)",
    image: "#7dde92",
    other: "var(--text-secondary)",
    font: "#f97316",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 48px)", width: "100%", fontFamily: "var(--font-sans)", background: "var(--bg-primary)" }}>

      {/* Slim Toolbar */}
      <div style={{ padding: "8px 12px", background: "var(--bg-secondary)", borderBottom: "1px solid var(--border-color)", display: "flex", alignItems: "center", gap: "8px" }}>
        {/* View Mode */}
        <div style={{ display: "flex", gap: "4px" }}>
          {(["requests", "waterfall"] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              style={{
                padding: "4px 10px", fontSize: "9px", border: "1px solid",
                borderColor: viewMode === mode ? "var(--accent-purple)" : "var(--border-color)",
                background: viewMode === mode ? "rgba(108,99,255,0.15)" : "transparent",
                color: viewMode === mode ? "var(--accent-purple)" : "var(--text-secondary)",
                borderRadius: "4px", cursor: "pointer", textTransform: "uppercase", fontWeight: viewMode === mode ? 700 : 400,
              }}
            >
              {mode === "waterfall" ? "≋ Waterfall" : "⊟ Requests"}
            </button>
          ))}
        </div>

        {/* Stats pills */}
        <div style={{ display: "flex", gap: "6px", marginLeft: "auto", alignItems: "center" }}>
          {stats.dupCount > 0 && (
            <span style={{ fontSize: "9px", padding: "2px 7px", borderRadius: "10px", background: "rgba(255,193,7,0.12)", color: "var(--accent-yellow)", border: "1px solid rgba(255,193,7,0.3)", fontWeight: 700 }}>
              {stats.dupCount} duplicate{stats.dupCount > 1 ? "s" : ""}
            </span>
          )}
          {stats.slowCount > 0 && (
            <span style={{ fontSize: "9px", padding: "2px 7px", borderRadius: "10px", background: "rgba(255,0,127,0.1)", color: "var(--accent-pink)", border: "1px solid rgba(255,0,127,0.3)", fontWeight: 700 }}>
              {stats.slowCount} slow API
            </span>
          )}
          <span style={{ fontSize: "9px", color: "var(--text-secondary)" }}>{stats.total} total · {stats.size}</span>
        </div>

        <button
          onClick={onClear}
          style={{ padding: "4px 10px", fontSize: "10px", background: "rgba(255,0,127,0.08)", border: "1px solid var(--accent-pink)", borderRadius: "4px", color: "var(--accent-pink)", cursor: "pointer" }}
        >
          Clear
        </button>
      </div>

      {/* ────── WATERFALL VIEW ────── */}
      {viewMode === "waterfall" && (
        <div style={{ flex: 1, overflowY: "auto" }}>
          <div style={{ padding: "6px 12px", display: "grid", gridTemplateColumns: "200px 50px 1fr 70px", fontSize: "9px", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", borderBottom: "1px solid var(--border-color)", background: "var(--bg-secondary)" }}>
            <span>Name</span><span>Type</span><span style={{ paddingLeft: "8px" }}>Waterfall</span><span style={{ textAlign: "right" }}>Time</span>
          </div>
          {requests.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)", fontSize: "11px" }}>
              No requests yet — navigate to a page to capture traffic.
            </div>
          ) : requests.map((req) => {
            const barWidth = Math.max(2, (req.duration / maxDuration) * 100);
            const color = typeColor[req.type] || "var(--text-secondary)";
            const isError = req.status >= 400;
            const isSlow = slowApiUrls.has(req.id);
            return (
              <div
                key={req.id}
                onClick={() => { setSelectedRequestId(req.id); setViewMode("requests"); }}
                style={{ display: "grid", gridTemplateColumns: "200px 50px 1fr 70px", padding: "5px 12px", borderBottom: "1px solid rgba(255,255,255,0.03)", alignItems: "center", cursor: "pointer", background: isError ? "rgba(255,0,127,0.04)" : isSlow ? "rgba(255,193,7,0.03)" : "transparent" }}
              >
                <span style={{ fontSize: "10px", color: isError ? "var(--accent-pink)" : isSlow ? "var(--accent-yellow)" : "var(--text-primary)", fontFamily: "var(--font-mono)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={req.url}>
                  {req.url.split("/").pop()?.split("?")[0] || req.url.substring(0, 30)}
                </span>
                <span style={{ fontSize: "9px", color, textTransform: "uppercase" }}>{req.type.substring(0, 4)}</span>
                <div style={{ paddingLeft: "8px" }}>
                  <div style={{ height: "10px", background: `${color}20`, borderRadius: "2px", position: "relative", overflow: "hidden" }}>
                    <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${barWidth}%`, background: color, borderRadius: "2px", transition: "width 0.4s ease" }} />
                  </div>
                </div>
                <span style={{ fontSize: "10px", color: isSlow ? "var(--accent-pink)" : req.duration > 500 ? "var(--accent-yellow)" : "var(--text-secondary)", textAlign: "right", fontFamily: "var(--font-mono)" }}>
                  {formatDuration(req.duration)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* ────── REQUESTS VIEW ────── */}
      {viewMode === "requests" && (
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          {/* List */}
          <div style={{ flex: selectedRequest ? 0.4 : 1, display: "flex", flexDirection: "column", minWidth: "300px", borderRight: selectedRequest ? "1px solid var(--border-color)" : "none" }}>

            {/* Section: Duplicate Requests */}
            {filteredRequests.filter((r) => duplicateUrls.has(r.url.split("?")[0])).length > 0 && (
              <div>
                <div style={{ padding: "6px 12px", fontSize: "9px", fontWeight: 700, textTransform: "uppercase", color: "var(--accent-yellow)", background: "rgba(255,193,7,0.05)", borderBottom: "1px solid rgba(255,193,7,0.15)", letterSpacing: "0.08em" }}>
                  🔁 Duplicate Requests
                </div>
                <div style={{ overflowY: "auto", maxHeight: "35vh" }}>
                  {filteredRequests
                    .filter((r) => duplicateUrls.has(r.url.split("?")[0]))
                    .map((req) => (
                      <RequestRow
                        key={req.id}
                        request={req}
                        isSelected={req.id === selectedRequestId}
                        onSelect={() => setSelectedRequestId(req.id)}
                      />
                    ))}
                </div>
              </div>
            )}

            {/* Section: Slow API Requests */}
            {filteredRequests.filter((r) => slowApiUrls.has(r.id)).length > 0 && (
              <div>
                <div style={{ padding: "6px 12px", fontSize: "9px", fontWeight: 700, textTransform: "uppercase", color: "var(--accent-pink)", background: "rgba(255,0,127,0.05)", borderTop: "1px solid rgba(255,0,127,0.1)", borderBottom: "1px solid rgba(255,0,127,0.15)", letterSpacing: "0.08em" }}>
                  🐢 Slow API Requests <span style={{ fontWeight: 400, color: "var(--text-secondary)", marginLeft: "4px" }}>({">"}{SLOW_THRESHOLD_MS}ms)</span>
                </div>
                <div style={{ overflowY: "auto", maxHeight: "35vh" }}>
                  {filteredRequests
                    .filter((r) => slowApiUrls.has(r.id))
                    .map((req) => (
                      <RequestRow
                        key={req.id}
                        request={req}
                        isSelected={req.id === selectedRequestId}
                        onSelect={() => setSelectedRequestId(req.id)}
                      />
                    ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {filteredRequests.length === 0 && (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "10px", color: "var(--text-secondary)", padding: "40px 20px", textAlign: "center" }}>
                <div style={{ fontSize: "32px" }}>✅</div>
                <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--accent-cyan)" }}>No Issues Detected</div>
                <div style={{ fontSize: "11px", lineHeight: 1.6 }}>
                  No duplicate or slow API requests found.<br />
                  Switch to <strong>≋ Waterfall</strong> to inspect all traffic.
                </div>
              </div>
            )}

            {/* Status bar */}
            <div style={{ marginTop: "auto", padding: "4px 12px", background: "var(--bg-secondary)", borderTop: "1px solid var(--border-color)", fontSize: "10px", color: "var(--text-secondary)", display: "flex", justifyContent: "space-between" }}>
              <span>{stats.total} total requests</span>
              <span>{stats.size}</span>
            </div>
          </div>

          {/* Detail Drawer */}
          {selectedRequest && (
            <div style={{ flex: 0.6, height: "100%", minWidth: "300px" }}>
              <RequestDetail request={selectedRequest} onClose={() => setSelectedRequestId(null)} aiState={aiState} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
