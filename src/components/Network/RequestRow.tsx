import React from "react";
import type { NetworkRequest } from "../../types/network";
import { formatBytes, formatDuration } from "../../services/networkCapture";
import { Badge } from "../shared/Badge";

interface RequestRowProps {
  request: NetworkRequest;
  isSelected: boolean;
  onSelect: () => void;
}

export const RequestRow: React.FC<RequestRowProps> = ({ request, isSelected, onSelect }) => {
  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return "var(--accent-cyan)";
    if (status >= 300 && status < 400) return "var(--accent-yellow)";
    return "var(--accent-pink)";
  };

  const getMethodColor = (method: string) => {
    switch (method.toUpperCase()) {
      case "GET":
        return "var(--accent-cyan)";
      case "POST":
        return "var(--accent-purple)";
      case "PUT":
        return "var(--accent-yellow)";
      case "DELETE":
        return "var(--accent-pink)";
      default:
        return "var(--text-secondary)";
    }
  };

  const filename = request.url.split("/").pop()?.split("?")[0] || request.url;
  const displayFilename = filename || "/";

  return (
    <div
      onClick={onSelect}
      style={{
        display: "grid",
        gridTemplateColumns: "60px 45px 1fr 60px 65px",
        alignItems: "center",
        padding: "8px 12px",
        fontSize: "11px",
        fontFamily: "var(--font-mono)",
        borderBottom: "1px solid var(--border-color)",
        background: isSelected
          ? "rgba(108, 99, 255, 0.1)"
          : request.isSlow
          ? "rgba(255, 0, 127, 0.03)"
          : "transparent",
        color: request.status >= 400 ? "var(--accent-pink)" : "var(--text-primary)",
        cursor: "pointer",
        transition: "all var(--transition-fast)",
      }}
      className={isSelected ? "border-glow-left" : ""}
    >
      {/* Status */}
      <span style={{ color: getStatusColor(request.status), fontWeight: 600 }}>
        {request.status || "Pending"}
      </span>

      {/* Method */}
      <span style={{ color: getMethodColor(request.method), fontWeight: 600 }}>
        {request.method}
      </span>

      {/* Path / Name */}
      <span
        title={request.url}
        style={{
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          paddingRight: "8px",
          color: isSelected ? "var(--accent-purple)" : "var(--text-primary)",
        }}
      >
        {displayFilename}
        {request.isDuplicate && (
          <span
            style={{
              fontSize: "8px",
              marginLeft: "4px",
              color: "var(--accent-yellow)",
              opacity: 0.8,
            }}
          >
            [DUP]
          </span>
        )}
      </span>

      {/* Size */}
      <span style={{ color: "var(--text-secondary)" }}>
        {request.cached ? "cache" : formatBytes(request.size)}
      </span>

      {/* Time */}
      <span
        style={{
          color: request.isSlow ? "var(--accent-pink)" : "var(--text-secondary)",
          textAlign: "right",
        }}
      >
        {formatDuration(request.duration)}
      </span>
    </div>
  );
};
